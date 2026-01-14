/**
 * Unit tests for Rule #3: Coordinated Cluster Detection
 *
 * Tests cover:
 * - Basic rule triggering conditions
 * - Threshold boundary conditions
 * - Confidence score calculations
 * - Same-side detection
 * - Edge cases and error handling
 * - Alert deduplication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CoordinatedClusterRule,
  coordinatedClusterRule,
} from "../rules/coordinatedCluster.js";
import { clusterService } from "../clusterService.js";
import { walletActivityIndex } from "../walletActivityIndex.js";
import { marketMetadataService } from "../marketMetadataService.js";
import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";
import type {
  RuleEvaluationContext,
  WalletActivity,
  ClusterSummary,
  WalletCluster,
} from "../types.js";

// Mock all dependencies
vi.mock("../clusterService.js", () => ({
  clusterService: {
    getWalletCluster: vi.fn(),
    getClusterActivity: vi.fn(),
  },
}));

vi.mock("../walletActivityIndex.js", () => ({
  walletActivityIndex: {
    getWalletActivity: vi.fn(),
    getWalletConcentration: vi.fn(),
  },
}));

vi.mock("../marketMetadataService.js", () => ({
  marketMetadataService: {
    getMarket: vi.fn(),
  },
}));

vi.mock("../detectionDatabase.js", () => ({
  detectionDb: {
    getRuleConfig: vi.fn(),
    updateRuleConfig: vi.fn(),
    getAlerts: vi.fn(),
    createAlert: vi.fn(),
    getMarketActivity: vi.fn(),
    getClusterSummary: vi.fn(),
    getWalletCluster: vi.fn(),
  },
}));

vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    getRuleConfig: vi.fn(),
    setRuleConfig: vi.fn(),
    invalidateRuleConfig: vi.fn(),
  },
}));

describe("CoordinatedClusterRule", () => {
  let rule: CoordinatedClusterRule;

  // Test fixtures
  const testConditionId = "0xabc123";
  const testClusterId = "cluster_test123";
  const testWallet1 = "0x1111111111111111111111111111111111111111";
  const testWallet2 = "0x2222222222222222222222222222222222222222";
  const testWallet3 = "0x3333333333333333333333333333333333333333";
  const testWallet4 = "0x4444444444444444444444444444444444444444";

  // Helper to create wallet activity mock
  const createMockActivity = (
    wallet: string,
    conditionId: string,
    netPosition: number,
    volume: number,
    ageDays: number
  ): WalletActivity => ({
    walletAddress: wallet,
    conditionId,
    firstTradeAt: new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000),
    lastTradeAt: new Date(),
    totalVolume: volume,
    tradeCount: 5,
    netPosition,
    realizedPnl: 0,
  });

  // Mock data
  const mockClusterSummary: ClusterSummary = {
    clusterId: testClusterId,
    wallets: [testWallet1, testWallet2, testWallet3],
    relationshipTypes: ["shared_funder"],
    size: 3,
    discoveredAt: new Date(),
  };

  const mockClusterRelationships: WalletCluster[] = [
    {
      clusterId: testClusterId,
      walletAddress: testWallet1,
      relationshipType: "shared_funder",
      relatedWallet: testWallet2,
      strength: 0.8,
      discoveredAt: new Date(),
    },
    {
      clusterId: testClusterId,
      walletAddress: testWallet1,
      relationshipType: "shared_funder",
      relatedWallet: testWallet3,
      strength: 0.7,
      discoveredAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh rule instance for each test
    rule = new CoordinatedClusterRule();

    // Default mock implementations
    vi.mocked(detectionCache.getRuleConfig).mockResolvedValue(null);
    vi.mocked(detectionDb.getRuleConfig).mockResolvedValue(null);
    vi.mocked(detectionDb.getAlerts).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    vi.mocked(detectionDb.createAlert).mockResolvedValue(1);
    vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(mockClusterSummary);
    vi.mocked(detectionDb.getWalletCluster).mockResolvedValue(mockClusterRelationships);

    // Mock market activity - 3 wallets all trading YES with $20k+ each
    vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
      createMockActivity(testWallet1, testConditionId, 1000, 25000, 10),
      createMockActivity(testWallet2, testConditionId, 800, 20000, 15),
      createMockActivity(testWallet3, testConditionId, 500, 15000, 12),
    ]);

    // Mock cluster service - return cluster for each wallet
    vi.mocked(clusterService.getWalletCluster).mockResolvedValue(mockClusterSummary);

    // Mock wallet activity for individual wallet queries
    vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
      const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : 12;
      const netPosition = wallet === testWallet1 ? 1000 : wallet === testWallet2 ? 800 : 500;
      const volume = wallet === testWallet1 ? 25000 : wallet === testWallet2 ? 20000 : 15000;
      return [createMockActivity(wallet, testConditionId, netPosition, volume, ageDays)];
    });

    vi.mocked(marketMetadataService.getMarket).mockResolvedValue({
      conditionId: testConditionId,
      question: "Test Market Question for Cluster Detection",
      slug: "test-market",
      volume24h: 100000,
      volumeTotal: 500000,
      liquidity: 50000,
      firstSeenAt: new Date(),
      lastUpdatedAt: new Date(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // BASIC FUNCTIONALITY TESTS
  // ==========================================

  describe("Basic Functionality", () => {
    it("should have correct name and description", () => {
      expect(rule.name).toBe("CoordinatedCluster");
      expect(rule.description).toContain("coordinated");
    });

    it("should export a singleton instance", () => {
      expect(coordinatedClusterRule).toBeInstanceOf(CoordinatedClusterRule);
    });

    it("should have default thresholds", async () => {
      const thresholds = await rule.getThresholds();

      expect(thresholds.min_cluster_size).toBe(3);
      expect(thresholds.min_total_notional_usd).toBe(50000);
      expect(thresholds.max_median_age_days).toBe(45);
      expect(thresholds.time_window_hours).toBe(6);
    });
  });

  // ==========================================
  // TRIGGERING CONDITION TESTS
  // ==========================================

  describe("Rule Triggering", () => {
    it("should trigger when all conditions are met", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.ruleName).toBe("CoordinatedCluster");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.severity).toBeDefined();
    });

    it("should NOT trigger when cluster size is below threshold", async () => {
      // Only 2 wallets in cluster (below min of 3)
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 30000, 10),
        createMockActivity(testWallet2, testConditionId, 800, 30000, 15),
      ]);

      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue({
        ...mockClusterSummary,
        wallets: [testWallet1, testWallet2],
        size: 2,
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should NOT trigger when total notional is below threshold", async () => {
      // Total notional is $30k (below $50k threshold)
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 10000, 10),
        createMockActivity(testWallet2, testConditionId, 800, 10000, 15),
        createMockActivity(testWallet3, testConditionId, 500, 10000, 12),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : 12;
        return [createMockActivity(wallet, testConditionId, 500, 10000, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should NOT trigger when wallets are NOT all trading same side", async () => {
      // Mixed sides: 2 YES, 1 NO
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 25000, 10),  // YES
        createMockActivity(testWallet2, testConditionId, 800, 20000, 15),   // YES
        createMockActivity(testWallet3, testConditionId, -500, 15000, 12), // NO
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : 12;
        const netPosition = wallet === testWallet3 ? -500 : 800;
        return [createMockActivity(wallet, testConditionId, netPosition, 20000, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should NOT trigger when median age exceeds threshold", async () => {
      // All wallets are old (60+ days)
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 25000, 60),
        createMockActivity(testWallet2, testConditionId, 800, 20000, 70),
        createMockActivity(testWallet3, testConditionId, 500, 15000, 65),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 60 : wallet === testWallet2 ? 70 : 65;
        return [createMockActivity(wallet, testConditionId, 800, 20000, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should trigger when all wallets trading NO (same side)", async () => {
      // All trading NO side
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, -1000, 25000, 10),
        createMockActivity(testWallet2, testConditionId, -800, 20000, 15),
        createMockActivity(testWallet3, testConditionId, -500, 15000, 12),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : 12;
        return [createMockActivity(wallet, testConditionId, -800, 20000, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.triggerValues).toHaveProperty("allSameSide", true);
    });
  });

  // ==========================================
  // THRESHOLD BOUNDARY TESTS
  // ==========================================

  describe("Threshold Boundaries", () => {
    it("should trigger at exactly cluster size threshold (3)", async () => {
      // Exactly 3 wallets
      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });

    it("should trigger at exactly notional threshold ($50,000)", async () => {
      // Total exactly $50k
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 20000, 10),
        createMockActivity(testWallet2, testConditionId, 800, 15000, 15),
        createMockActivity(testWallet3, testConditionId, 500, 15000, 12),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : 12;
        const volume = wallet === testWallet1 ? 20000 : wallet === testWallet2 ? 15000 : 15000;
        return [createMockActivity(wallet, testConditionId, 500, volume, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });

    it("should NOT trigger just below notional threshold ($49,999)", async () => {
      // Total just under $50k
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 16666, 10),
        createMockActivity(testWallet2, testConditionId, 800, 16666, 15),
        createMockActivity(testWallet3, testConditionId, 500, 16666, 12),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : 12;
        return [createMockActivity(wallet, testConditionId, 500, 16666, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should trigger at exactly median age threshold (45 days)", async () => {
      // Median age exactly 45 days
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 25000, 40),
        createMockActivity(testWallet2, testConditionId, 800, 20000, 45),
        createMockActivity(testWallet3, testConditionId, 500, 15000, 50),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 40 : wallet === testWallet2 ? 45 : 50;
        return [createMockActivity(wallet, testConditionId, 800, 20000, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });
  });

  // ==========================================
  // CONFIDENCE SCORE TESTS
  // ==========================================

  describe("Confidence Score Calculation", () => {
    it("should return higher confidence for larger clusters", async () => {
      // 4 wallets cluster
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 20000, 10),
        createMockActivity(testWallet2, testConditionId, 800, 15000, 15),
        createMockActivity(testWallet3, testConditionId, 500, 10000, 12),
        createMockActivity(testWallet4, testConditionId, 600, 15000, 14),
      ]);

      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue({
        ...mockClusterSummary,
        wallets: [testWallet1, testWallet2, testWallet3, testWallet4],
        size: 4,
      });

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : wallet === testWallet3 ? 12 : 14;
        return [createMockActivity(wallet, testConditionId, 600, 15000, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result4Wallets = await rule.evaluate(context);

      // Reset to 3 wallets
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 20000, 10),
        createMockActivity(testWallet2, testConditionId, 800, 20000, 15),
        createMockActivity(testWallet3, testConditionId, 500, 20000, 12),
      ]);

      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(mockClusterSummary);

      const result3Wallets = await rule.evaluate(context);

      expect(result4Wallets.confidence).toBeGreaterThan(result3Wallets.confidence);
    });

    it("should return higher confidence for larger total notional", async () => {
      // $100k total
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 40000, 10),
        createMockActivity(testWallet2, testConditionId, 800, 35000, 15),
        createMockActivity(testWallet3, testConditionId, 500, 30000, 12),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : 12;
        const volume = wallet === testWallet1 ? 40000 : wallet === testWallet2 ? 35000 : 30000;
        return [createMockActivity(wallet, testConditionId, 800, volume, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result100k = await rule.evaluate(context);

      // $60k total
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 25000, 10),
        createMockActivity(testWallet2, testConditionId, 800, 20000, 15),
        createMockActivity(testWallet3, testConditionId, 500, 15000, 12),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 10 : wallet === testWallet2 ? 15 : 12;
        const volume = wallet === testWallet1 ? 25000 : wallet === testWallet2 ? 20000 : 15000;
        return [createMockActivity(wallet, testConditionId, 800, volume, ageDays)];
      });

      const result60k = await rule.evaluate(context);

      expect(result100k.confidence).toBeGreaterThan(result60k.confidence);
    });

    it("should return higher confidence for younger wallet clusters", async () => {
      // Young wallets (5 days median)
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 25000, 3),
        createMockActivity(testWallet2, testConditionId, 800, 20000, 5),
        createMockActivity(testWallet3, testConditionId, 500, 15000, 7),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 3 : wallet === testWallet2 ? 5 : 7;
        return [createMockActivity(wallet, testConditionId, 800, 20000, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const resultYoung = await rule.evaluate(context);

      // Older wallets (40 days median)
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 25000, 35),
        createMockActivity(testWallet2, testConditionId, 800, 20000, 40),
        createMockActivity(testWallet3, testConditionId, 500, 15000, 42),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 35 : wallet === testWallet2 ? 40 : 42;
        return [createMockActivity(wallet, testConditionId, 800, 20000, ageDays)];
      });

      const resultOld = await rule.evaluate(context);

      expect(resultYoung.confidence).toBeGreaterThan(resultOld.confidence);
    });

    it("should return higher confidence for stronger relationships", async () => {
      // Strong relationships (0.9)
      vi.mocked(detectionDb.getWalletCluster).mockResolvedValue([
        { ...mockClusterRelationships[0], strength: 0.95 },
        { ...mockClusterRelationships[1], strength: 0.9 },
      ]);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const resultStrong = await rule.evaluate(context);

      // Weaker relationships (0.4)
      vi.mocked(detectionDb.getWalletCluster).mockResolvedValue([
        { ...mockClusterRelationships[0], strength: 0.4 },
        { ...mockClusterRelationships[1], strength: 0.35 },
      ]);

      const resultWeak = await rule.evaluate(context);

      expect(resultStrong.confidence).toBeGreaterThan(resultWeak.confidence);
    });
  });

  // ==========================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================

  describe("Edge Cases and Error Handling", () => {
    it("should return not triggered when condition ID is missing", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: undefined,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("error");
    });

    it("should return not triggered when no clusters found in market", async () => {
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([]);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("reason", "No clusters found in market");
    });

    it("should return not triggered when no wallet belongs to a cluster", async () => {
      vi.mocked(clusterService.getWalletCluster).mockResolvedValue(null);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should handle wallets with unknown ages gracefully", async () => {
      // Wallet with no firstTradeAt
      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        return [{
          walletAddress: wallet,
          conditionId: testConditionId,
          firstTradeAt: undefined, // Unknown age
          lastTradeAt: new Date(),
          totalVolume: 20000,
          tradeCount: 5,
          netPosition: 800,
          realizedPnl: 0,
        }];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      // Should still be able to evaluate (uses moderate confidence for unknown ages)
      expect(result.triggered).toBe(true);
      expect(result.triggerValues).toHaveProperty("medianAgeDays", null);
    });
  });

  // ==========================================
  // ALERT DEDUPLICATION TESTS
  // ==========================================

  describe("Alert Deduplication", () => {
    it("should NOT trigger if recent alert already exists", async () => {
      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: [
          {
            id: 1,
            alertType: "cluster",
            severity: "HIGH",
            walletAddress: testWallet1,
            conditionId: testConditionId,
            detectionRule: "CoordinatedCluster",
            title: "Previous cluster alert",
            status: "new",
            detectedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should trigger if no recent alerts exist for this rule", async () => {
      // Alert exists but for a different rule
      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: [
          {
            id: 1,
            alertType: "pattern",
            severity: "MEDIUM",
            walletAddress: testWallet1,
            conditionId: testConditionId,
            detectionRule: "FreshConcentratedDepthImpact", // Different rule
            title: "Different rule alert",
            status: "new",
            detectedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });
  });

  // ==========================================
  // RULE CONFIGURATION TESTS
  // ==========================================

  describe("Rule Configuration", () => {
    it("should NOT trigger when rule is disabled", async () => {
      vi.mocked(detectionDb.getRuleConfig).mockResolvedValue({
        ruleName: "CoordinatedCluster",
        enabled: false,
        thresholds: {
          min_cluster_size: 3,
          min_total_notional_usd: 50000,
          max_median_age_days: 45,
          time_window_hours: 6,
        },
        updatedAt: new Date(),
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("disabled", true);
    });

    it("should use custom thresholds from config", async () => {
      // Set more permissive thresholds
      vi.mocked(detectionDb.getRuleConfig).mockResolvedValue({
        ruleName: "CoordinatedCluster",
        enabled: true,
        thresholds: {
          min_cluster_size: 2, // More permissive
          min_total_notional_usd: 20000, // More permissive
          max_median_age_days: 90, // More permissive
          time_window_hours: 24, // More permissive
        },
        updatedAt: new Date(),
      });

      // 2-wallet cluster with $25k total
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 15000, 60),
        createMockActivity(testWallet2, testConditionId, 800, 10000, 70),
      ]);

      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue({
        ...mockClusterSummary,
        wallets: [testWallet1, testWallet2],
        size: 2,
      });

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        const ageDays = wallet === testWallet1 ? 60 : 70;
        const volume = wallet === testWallet1 ? 15000 : 10000;
        return [createMockActivity(wallet, testConditionId, 800, volume, ageDays)];
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });
  });

  // ==========================================
  // RESULT STRUCTURE TESTS
  // ==========================================

  describe("Result Structure", () => {
    it("should include all trigger values in result", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.triggerValues).toHaveProperty("clusterId");
      expect(result.triggerValues).toHaveProperty("clusterSize");
      expect(result.triggerValues).toHaveProperty("totalNotionalUsd");
      expect(result.triggerValues).toHaveProperty("medianAgeDays");
      expect(result.triggerValues).toHaveProperty("allSameSide");
      expect(result.triggerValues).toHaveProperty("walletAddresses");
    });

    it("should include all threshold values in result", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.thresholdValues).toHaveProperty("minClusterSize");
      expect(result.thresholdValues).toHaveProperty("minTotalNotionalUsd");
      expect(result.thresholdValues).toHaveProperty("maxMedianAgeDays");
      expect(result.thresholdValues).toHaveProperty("timeWindowHours");
    });

    it("should include title and description when triggered", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.title).toBeDefined();
      expect(result.title).toContain("Coordinated cluster");
      expect(result.description).toBeDefined();
      expect(result.description).toContain("related wallets");
    });

    it("should include related wallets when triggered", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet1,
        conditionId: testConditionId,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.relatedWallets).toBeDefined();
      expect(result.relatedWallets!.length).toBeGreaterThanOrEqual(3);
      expect(result.relatedWallets).toContain(testWallet1);
      expect(result.relatedWallets).toContain(testWallet2);
      expect(result.relatedWallets).toContain(testWallet3);
    });
  });

  // ==========================================
  // EVALUATE CLUSTER METHOD TESTS
  // ==========================================

  describe("evaluateCluster Method", () => {
    it("should evaluate a specific cluster directly", async () => {
      const result = await rule.evaluateCluster(testClusterId, testConditionId);

      expect(result.triggered).toBe(true);
      expect(result.triggerValues).toHaveProperty("clusterId", testClusterId);
    });

    it("should return not triggered for non-existent cluster", async () => {
      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(null);

      const result = await rule.evaluateCluster("nonexistent_cluster", testConditionId);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("error", "Cluster not found");
    });

    it("should return not triggered when cluster has insufficient activity", async () => {
      // Cluster exists but only 1 wallet has activity in this market
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([
        createMockActivity(testWallet1, testConditionId, 1000, 25000, 10),
      ]);

      vi.mocked(walletActivityIndex.getWalletActivity).mockImplementation(async (wallet) => {
        if (wallet === testWallet1) {
          return [createMockActivity(wallet, testConditionId, 800, 25000, 10)];
        }
        return []; // Other wallets have no activity in this market
      });

      const result = await rule.evaluateCluster(testClusterId, testConditionId);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("reason", "Insufficient cluster activity in market");
    });
  });
});
