/**
 * Unit tests for Rule #1: Fresh-Concentrated-Depth Impact Detection
 *
 * Tests cover:
 * - Basic rule triggering conditions
 * - Threshold boundary conditions
 * - Confidence score calculations
 * - Edge cases and error handling
 * - Alert deduplication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  FreshConcentratedDepthRule,
  freshConcentratedDepthRule,
} from "../rules/freshConcentratedDepth.js";
import { walletActivityIndex } from "../walletActivityIndex.js";
import { marketDepthService } from "../marketDepthService.js";
import { marketMetadataService } from "../marketMetadataService.js";
import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";
import type { RuleEvaluationContext, WalletActivity } from "../types.js";

// Mock all dependencies
vi.mock("../walletActivityIndex.js", () => ({
  walletActivityIndex: {
    getWalletActivity: vi.fn(),
    getWalletConcentration: vi.fn(),
  },
}));

vi.mock("../marketDepthService.js", () => ({
  marketDepthService: {
    calculateDepthRatio: vi.fn(),
    getLiquidityAtTick: vi.fn(),
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
  },
}));

vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    getRuleConfig: vi.fn(),
    setRuleConfig: vi.fn(),
    invalidateRuleConfig: vi.fn(),
  },
}));

describe("FreshConcentratedDepthRule", () => {
  let rule: FreshConcentratedDepthRule;

  // Test fixtures
  const testWallet = "0x1234567890123456789012345678901234567890";
  const testConditionId = "0xabc123";
  const testTxHash = "0xtx123";

  // Mock data
  const mockWalletActivity: WalletActivity[] = [
    {
      walletAddress: testWallet,
      conditionId: testConditionId,
      firstTradeAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      lastTradeAt: new Date(),
      totalVolume: 10000,
      tradeCount: 5,
      netPosition: 1000,
      realizedPnl: 0,
      volumeShareOfWallet: 90,
    },
  ];

  const mockConcentration = {
    topMarket: {
      conditionId: testConditionId,
      volumeShare: 90,
    },
    totalVolume: 10000,
    marketCount: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh rule instance for each test
    rule = new FreshConcentratedDepthRule();

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
    vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue(
      mockWalletActivity
    );
    vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue(
      mockConcentration
    );
    vi.mocked(marketDepthService.calculateDepthRatio).mockResolvedValue(5.0);
    vi.mocked(marketDepthService.getLiquidityAtTick).mockResolvedValue({
      bid: 500,
      ask: 500,
      total: 1000,
    });
    vi.mocked(marketMetadataService.getMarket).mockResolvedValue({
      conditionId: testConditionId,
      question: "Test Market Question",
      slug: "test-market",
      volume24h: 50000,
      volumeTotal: 100000,
      liquidity: 10000,
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
      expect(rule.name).toBe("FreshConcentratedDepthImpact");
      expect(rule.description).toContain("new wallets");
    });

    it("should export a singleton instance", () => {
      expect(freshConcentratedDepthRule).toBeInstanceOf(
        FreshConcentratedDepthRule
      );
    });

    it("should have default thresholds", async () => {
      const thresholds = await rule.getThresholds();

      expect(thresholds.max_wallet_age_days).toBe(14);
      expect(thresholds.min_concentration_pct).toBe(85);
      expect(thresholds.min_trade_size_usd).toBe(3000);
      expect(thresholds.min_depth_ratio).toBe(3.0);
    });
  });

  // ==========================================
  // TRIGGERING CONDITION TESTS
  // ==========================================

  describe("Rule Triggering", () => {
    it("should trigger when all conditions are met", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
        txHash: testTxHash,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.ruleName).toBe("FreshConcentratedDepthImpact");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.severity).toBeDefined();
    });

    it("should NOT trigger when wallet is too old", async () => {
      // Wallet is 30 days old
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          ...mockWalletActivity[0],
          firstTradeAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ]);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("reason", "Wallet too old");
    });

    it("should NOT trigger when concentration is too low", async () => {
      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: {
          conditionId: testConditionId,
          volumeShare: 50, // Below 85% threshold
        },
        totalVolume: 10000,
        marketCount: 3,
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty(
        "reason",
        "Concentration too low"
      );
    });

    it("should NOT trigger when trade size is below threshold", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 1000, // Below $3000 threshold
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty(
        "reason",
        "Below minimum trade size"
      );
    });

    it("should NOT trigger when depth ratio is below threshold", async () => {
      vi.mocked(marketDepthService.calculateDepthRatio).mockResolvedValue(1.5); // Below 3.0

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty(
        "reason",
        "Depth ratio too low"
      );
    });

    it("should trigger when depth ratio is null (no liquidity data)", async () => {
      // When there's no liquidity data, we skip the depth check
      vi.mocked(marketDepthService.calculateDepthRatio).mockResolvedValue(null);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      // Should still trigger since other conditions are met
      expect(result.triggered).toBe(true);
    });
  });

  // ==========================================
  // THRESHOLD BOUNDARY TESTS
  // ==========================================

  describe("Threshold Boundaries", () => {
    it("should trigger at exactly age threshold", async () => {
      // Wallet exactly 14 days old (on the threshold)
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          ...mockWalletActivity[0],
          firstTradeAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      ]);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });

    it("should NOT trigger at age threshold + 1 day", async () => {
      // Wallet 15 days old (one day over threshold)
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          ...mockWalletActivity[0],
          firstTradeAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        },
      ]);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should trigger at exactly concentration threshold (85%)", async () => {
      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: {
          conditionId: testConditionId,
          volumeShare: 85,
        },
        totalVolume: 10000,
        marketCount: 2,
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });

    it("should NOT trigger at concentration just below threshold (84%)", async () => {
      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: {
          conditionId: testConditionId,
          volumeShare: 84,
        },
        totalVolume: 10000,
        marketCount: 2,
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should trigger at exactly trade size threshold ($3000)", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 3000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });

    it("should NOT trigger at trade size just below threshold ($2999)", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 2999,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });
  });

  // ==========================================
  // CONFIDENCE SCORE TESTS
  // ==========================================

  describe("Confidence Score Calculation", () => {
    it("should return higher confidence for newer wallets", async () => {
      // 1-day-old wallet
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          ...mockWalletActivity[0],
          firstTradeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ]);

      const context1: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result1 = await rule.evaluate(context1);

      // 13-day-old wallet
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          ...mockWalletActivity[0],
          firstTradeAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
        },
      ]);

      const result2 = await rule.evaluate(context1);

      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });

    it("should return higher confidence for higher concentration", async () => {
      // 100% concentration
      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: { conditionId: testConditionId, volumeShare: 100 },
        totalVolume: 10000,
        marketCount: 1,
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result1 = await rule.evaluate(context);

      // 85% concentration
      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: { conditionId: testConditionId, volumeShare: 85 },
        totalVolume: 10000,
        marketCount: 2,
      });

      const result2 = await rule.evaluate(context);

      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });

    it("should return higher confidence for higher depth ratio", async () => {
      // 10x depth ratio
      vi.mocked(marketDepthService.calculateDepthRatio).mockResolvedValue(10);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result1 = await rule.evaluate(context);

      // 3x depth ratio
      vi.mocked(marketDepthService.calculateDepthRatio).mockResolvedValue(3);

      const result2 = await rule.evaluate(context);

      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });

    it("should return higher confidence for larger trades", async () => {
      // $50,000 trade
      const context1: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 50000,
      };

      const result1 = await rule.evaluate(context1);

      // $5,000 trade
      const context2: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result2 = await rule.evaluate(context2);

      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });

    it("should return maximum age risk for unknown wallet age", async () => {
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          ...mockWalletActivity[0],
          firstTradeAt: undefined, // Unknown age
        },
      ]);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      // Unknown age should give high confidence
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should map confidence scores to correct severity levels", async () => {
      // Very high risk case: 1-day wallet, 100% concentration, 10x depth, $50k trade
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          ...mockWalletActivity[0],
          firstTradeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ]);
      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: { conditionId: testConditionId, volumeShare: 100 },
        totalVolume: 50000,
        marketCount: 1,
      });
      vi.mocked(marketDepthService.calculateDepthRatio).mockResolvedValue(10);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 50000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.severity).toMatch(/CRITICAL|HIGH/);
    });
  });

  // ==========================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================

  describe("Edge Cases and Error Handling", () => {
    it("should return not triggered when wallet address is missing", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: "",
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("error");
    });

    it("should return not triggered when condition ID is missing", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: undefined,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("error");
    });

    it("should return not triggered when trade size is missing", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: undefined,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("error");
    });

    it("should return not triggered when trade size is zero", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 0,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should return not triggered when trade size is negative", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: -1000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should handle wallet with no activity gracefully", async () => {
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([]);
      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: null,
        totalVolume: 0,
        marketCount: 0,
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      // Should not trigger due to 0% concentration
      expect(result.triggered).toBe(false);
    });

    it("should normalize wallet address to lowercase", async () => {
      const upperCaseWallet = testWallet.toUpperCase();

      const context: RuleEvaluationContext = {
        walletAddress: upperCaseWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      await rule.evaluate(context);

      expect(walletActivityIndex.getWalletActivity).toHaveBeenCalledWith(
        testWallet.toLowerCase()
      );
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
            alertType: "pattern",
            severity: "HIGH",
            walletAddress: testWallet,
            conditionId: testConditionId,
            detectionRule: "FreshConcentratedDepthImpact",
            title: "Previous alert",
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
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty(
        "reason",
        "Alert already exists"
      );
    });

    it("should trigger if no recent alerts exist for this rule", async () => {
      // Alert exists but for a different rule
      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: [
          {
            id: 1,
            alertType: "timing",
            severity: "MEDIUM",
            walletAddress: testWallet,
            conditionId: testConditionId,
            detectionRule: "PreMoveAdvantage", // Different rule
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
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
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
        ruleName: "FreshConcentratedDepthImpact",
        enabled: false,
        thresholds: {
          max_wallet_age_days: 14,
          min_concentration_pct: 85,
          min_trade_size_usd: 3000,
          min_depth_ratio: 3.0,
        },
        updatedAt: new Date(),
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect(result.triggerValues).toHaveProperty("disabled", true);
    });

    it("should use custom thresholds from config", async () => {
      // Set more permissive thresholds
      vi.mocked(detectionDb.getRuleConfig).mockResolvedValue({
        ruleName: "FreshConcentratedDepthImpact",
        enabled: true,
        thresholds: {
          max_wallet_age_days: 30, // More permissive
          min_concentration_pct: 50, // More permissive
          min_trade_size_usd: 1000, // More permissive
          min_depth_ratio: 1.0, // More permissive
        },
        updatedAt: new Date(),
      });

      // 25-day wallet with 60% concentration
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          ...mockWalletActivity[0],
          firstTradeAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        },
      ]);
      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: { conditionId: testConditionId, volumeShare: 60 },
        totalVolume: 5000,
        marketCount: 2,
      });
      vi.mocked(marketDepthService.calculateDepthRatio).mockResolvedValue(1.5);

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 2000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
    });

    it("should load config from cache if available", async () => {
      vi.mocked(detectionCache.getRuleConfig).mockResolvedValue({
        ruleName: "FreshConcentratedDepthImpact",
        enabled: true,
        thresholds: {
          max_wallet_age_days: 14,
          min_concentration_pct: 85,
          min_trade_size_usd: 3000,
          min_depth_ratio: 3.0,
        },
        updatedAt: new Date(),
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      await rule.evaluate(context);

      expect(detectionCache.getRuleConfig).toHaveBeenCalled();
      // Should not hit database since cache had the value
      expect(detectionDb.getRuleConfig).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // RESULT STRUCTURE TESTS
  // ==========================================

  describe("Result Structure", () => {
    it("should include all trigger values in result", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
        txHash: testTxHash,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.triggerValues).toHaveProperty("walletAgeDays");
      expect(result.triggerValues).toHaveProperty("concentration");
      expect(result.triggerValues).toHaveProperty("tradeSizeUsd");
      expect(result.triggerValues).toHaveProperty("depthRatio");
    });

    it("should include all threshold values in result", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      // Triggered result uses camelCase threshold names
      expect(result.thresholdValues).toHaveProperty("maxWalletAgeDays");
      expect(result.thresholdValues).toHaveProperty("minConcentrationPct");
      expect(result.thresholdValues).toHaveProperty("minTradeSizeUsd");
      expect(result.thresholdValues).toHaveProperty("minDepthRatio");
    });

    it("should include title and description when triggered", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.description).toContain("day-old wallet");
    });

    it("should include related tx hashes when provided", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeSize: 5000,
        txHash: testTxHash,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.relatedTxHashes).toContain(testTxHash);
    });
  });
});
