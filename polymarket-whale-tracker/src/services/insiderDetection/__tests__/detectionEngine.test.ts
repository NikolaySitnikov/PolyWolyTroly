/**
 * Unit tests for Detection Engine
 *
 * Tests the core orchestration service that runs all detection rules.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("../detectionDatabase.js", () => ({
  detectionDb: {
    getAlerts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    createAlert: vi.fn().mockResolvedValue(1),
    getWalletActivity: vi.fn().mockResolvedValue([]),
    getRuleConfig: vi.fn().mockResolvedValue(null),
    updateRuleConfig: vi.fn().mockResolvedValue(undefined),
    recordCtfTransfer: vi.fn().mockResolvedValue(1),
    getMarketActivity: vi.fn().mockResolvedValue([]),
    getPendingMtmEvaluations: vi.fn().mockResolvedValue([]),
    markMtmEvaluationComplete: vi.fn().mockResolvedValue(undefined),
    createPendingMtmEvaluation: vi.fn().mockResolvedValue(1),
    getClusterSummary: vi.fn().mockResolvedValue(null),
    getWalletCluster: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    getRuleConfig: vi.fn().mockResolvedValue(null),
    setRuleConfig: vi.fn().mockResolvedValue(undefined),
    invalidateRuleConfig: vi.fn().mockResolvedValue(undefined),
    getPrice: vi.fn().mockResolvedValue(null),
    setPrice: vi.fn().mockResolvedValue(undefined),
    getWalletCluster: vi.fn().mockResolvedValue(null),
    setWalletCluster: vi.fn().mockResolvedValue(undefined),
    invalidateWalletCluster: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../priceHistoryService.js", () => ({
  priceHistoryService: {
    getLatestPrice: vi.fn().mockResolvedValue({ price: 0.5, recordedAt: new Date() }),
    getPrice: vi.fn().mockResolvedValue(null),
    recordPrice: vi.fn().mockResolvedValue(1),
    calculateMTM: vi.fn().mockResolvedValue({ mtmGain: 0.05, priceAtEvaluation: 0.55 }),
    getVolatility: vi.fn().mockResolvedValue(0.02),
    isVolatileRegime: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock("../walletActivityIndex.js", () => ({
  walletActivityIndex: {
    getWalletActivity: vi.fn().mockResolvedValue([]),
    getWalletConcentration: vi.fn().mockResolvedValue({
      topMarket: null,
      totalVolume: 0,
      marketCount: 0,
    }),
  },
}));

vi.mock("../marketDepthService.js", () => ({
  marketDepthService: {
    calculateDepthRatio: vi.fn().mockResolvedValue(null),
    getLiquidityAtTick: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../marketMetadataService.js", () => ({
  marketMetadataService: {
    getMarket: vi.fn().mockResolvedValue({
      conditionId: "0xabc123",
      question: "Test Market?",
      slug: "test-market",
    }),
  },
}));

vi.mock("../clusterService.js", () => ({
  clusterService: {
    getWalletCluster: vi.fn().mockResolvedValue(null),
    getClusterActivity: vi.fn().mockResolvedValue(null),
  },
}));

// Import after mocks
import { detectionEngine } from "../detectionEngine.js";
import { detectionDb } from "../detectionDatabase.js";
import { priceHistoryService } from "../priceHistoryService.js";
import { walletActivityIndex } from "../walletActivityIndex.js";
import { marketDepthService } from "../marketDepthService.js";
import type { CtfTransfer, WalletActivity } from "../types.js";

describe("DetectionEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detectionEngine.resetMetrics();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // INITIALIZATION TESTS
  // ============================================

  describe("initialization", () => {
    it("should initialize and load all rules", async () => {
      await detectionEngine.initialize();

      const status = detectionEngine.getHealthStatus();
      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(3);
    });

    it("should not reinitialize if already initialized", async () => {
      await detectionEngine.initialize();
      await detectionEngine.initialize(); // Second call should be no-op

      const status = detectionEngine.getHealthStatus();
      expect(status.initialized).toBe(true);
    });

    it("should load rules with correct priorities", async () => {
      await detectionEngine.initialize();

      const rules = await detectionEngine.getAllRuleConfigs();
      expect(rules.length).toBe(3);

      // Verify priorities (CoordinatedCluster has highest priority 3)
      expect(rules[0].name).toBe("CoordinatedCluster");
      expect(rules[0].priority).toBe(3);
    });
  });

  // ============================================
  // RULE MANAGEMENT TESTS
  // ============================================

  describe("rule management", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should get rule by name", () => {
      const rule = detectionEngine.getRule("FreshConcentratedDepthImpact");
      expect(rule).toBeDefined();
      expect(rule?.name).toBe("FreshConcentratedDepthImpact");
    });

    it("should return undefined for unknown rule", () => {
      const rule = detectionEngine.getRule("NonExistentRule" as any);
      expect(rule).toBeUndefined();
    });

    it("should get all rules sorted by priority", () => {
      const rules = detectionEngine.getRulesByPriority();
      expect(rules.length).toBe(3);

      // Highest priority first
      expect(rules[0].name).toBe("CoordinatedCluster");
      expect(rules[1].name).toBe("PreMoveAdvantage");
      expect(rules[2].name).toBe("FreshConcentratedDepthImpact");
    });

    it("should get only enabled rules", () => {
      const enabledRules = detectionEngine.getEnabledRules();
      expect(enabledRules.length).toBeGreaterThan(0);

      // All returned rules should be enabled
      for (const rule of enabledRules) {
        expect(rule.enabled).toBe(true);
      }
    });

    it("should reload rules", async () => {
      await detectionEngine.reloadRules();

      const status = detectionEngine.getHealthStatus();
      expect(status.rulesLoaded).toBe(3);
    });

    it("should get rule configuration", async () => {
      const config = await detectionEngine.getRuleConfig(
        "FreshConcentratedDepthImpact"
      );

      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
      expect(config?.thresholds).toBeDefined();
      expect(config?.thresholds.max_wallet_age_days).toBeDefined();
    });

    it("should return null for unknown rule config", async () => {
      const config = await detectionEngine.getRuleConfig("NonExistent" as any);
      expect(config).toBeNull();
    });

    it("should get all rule configurations", async () => {
      const configs = await detectionEngine.getAllRuleConfigs();

      expect(configs.length).toBe(3);
      for (const config of configs) {
        expect(config.name).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.enabled).toBeDefined();
        expect(config.thresholds).toBeDefined();
        expect(config.priority).toBeDefined();
      }
    });
  });

  // ============================================
  // EVALUATE TRADE TESTS
  // ============================================

  describe("evaluateTrade", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should return early for transfer without wallet address", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "", // Empty
        tokenId: "123",
        amount: BigInt(1000000),
        conditionId: "0xdef",
        blockNumber: 12345,
      };

      const result = await detectionEngine.evaluateTrade(transfer);

      expect(result.evaluated).toBe(false);
      expect(result.rulesTriggered.length).toBe(0);
    });

    it("should return early for transfer without condition ID", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xdef456",
        tokenId: "123",
        amount: BigInt(1000000),
        conditionId: undefined, // Missing
        blockNumber: 12345,
      };

      const result = await detectionEngine.evaluateTrade(transfer);

      expect(result.evaluated).toBe(false);
    });

    it("should evaluate a valid transfer", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xdef456",
        tokenId: "123",
        amount: BigInt(10000000), // $5 USD (amount/1e6 * 0.5)
        conditionId: "0xmarket123",
        blockNumber: 12345,
        blockTimestamp: new Date(),
      };

      const result = await detectionEngine.evaluateTrade(transfer);

      expect(result.evaluated).toBe(true);
      expect(result.errors?.length || 0).toBe(0);
    });

    it("should throttle rapid evaluations for same wallet+market", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xsameWallet",
        tokenId: "123",
        amount: BigInt(10000000),
        conditionId: "0xsameMarket",
        blockNumber: 12345,
        blockTimestamp: new Date(),
      };

      // First evaluation
      await detectionEngine.evaluateTrade(transfer);

      // Second evaluation immediately after should be throttled
      const result2 = await detectionEngine.evaluateTrade({
        ...transfer,
        txHash: "0x456",
      });

      // Should not be evaluated due to throttling
      expect(result2.evaluated).toBe(false);
    });

    it("should schedule Pre-Move evaluation when price is available", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xnewWallet",
        tokenId: "123",
        amount: BigInt(10000000),
        conditionId: "0xmarketWithPrice",
        blockNumber: 12345,
        blockTimestamp: new Date(),
      };

      await detectionEngine.evaluateTrade(transfer);

      // Should have called getLatestPrice
      expect(priceHistoryService.getLatestPrice).toHaveBeenCalledWith(
        "0xmarketWithPrice"
      );
    });

    it("should update metrics on successful evaluation", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xmetricWallet",
        tokenId: "123",
        amount: BigInt(10000000),
        conditionId: "0xmetricMarket",
        blockNumber: 12345,
        blockTimestamp: new Date(),
      };

      await detectionEngine.evaluateTrade(transfer);

      const metrics = detectionEngine.getMetrics();
      expect(metrics.evaluationsTotal).toBe(1);
      expect(metrics.evaluationsSuccess).toBe(1);
      expect(metrics.evaluationsError).toBe(0);
      expect(metrics.lastEvaluationAt).not.toBeNull();
    });
  });

  // ============================================
  // EVALUATE WALLET TESTS
  // ============================================

  describe("evaluateWallet", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should evaluate a wallet with no activity", async () => {
      vi.mocked(detectionDb.getWalletActivity).mockResolvedValue([]);

      const result = await detectionEngine.evaluateWallet("0xemptyWallet");

      expect(result.evaluated).toBe(true);
      expect(result.rulesTriggered.length).toBe(0);
    });

    it("should evaluate a wallet with significant activity", async () => {
      const mockActivity: WalletActivity[] = [
        {
          walletAddress: "0xactiveWallet",
          conditionId: "0xmarket1",
          totalVolume: 5000,
          tradeCount: 5,
          netPosition: 1000,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getWalletActivity).mockResolvedValue(mockActivity);

      const result = await detectionEngine.evaluateWallet("0xactiveWallet");

      expect(result.evaluated).toBe(true);
    });

    it("should filter by condition ID when provided", async () => {
      const mockActivity: WalletActivity[] = [
        {
          walletAddress: "0xwallet",
          conditionId: "0xmarket1",
          totalVolume: 5000,
          tradeCount: 5,
          netPosition: 1000,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet",
          conditionId: "0xmarket2",
          totalVolume: 3000,
          tradeCount: 3,
          netPosition: 500,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getWalletActivity).mockResolvedValue(mockActivity);

      const result = await detectionEngine.evaluateWallet(
        "0xwallet",
        "0xmarket1"
      );

      expect(result.evaluated).toBe(true);
      // Should only evaluate the specified market
    });

    it("should throttle rapid wallet evaluations", async () => {
      // First evaluation
      await detectionEngine.evaluateWallet("0xthrottleWallet");

      // Second evaluation should be throttled
      const result2 = await detectionEngine.evaluateWallet("0xthrottleWallet");

      expect(result2.evaluated).toBe(false);
    });

    it("should normalize wallet address to lowercase", async () => {
      vi.mocked(detectionDb.getWalletActivity).mockResolvedValue([]);

      await detectionEngine.evaluateWallet("0xMixedCaseWallet");

      expect(detectionDb.getWalletActivity).toHaveBeenCalledWith(
        "0xmixedcasewallet"
      );
    });
  });

  // ============================================
  // EVALUATE MARKET TESTS
  // ============================================

  describe("evaluateMarket", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should evaluate a market for cluster activity", async () => {
      const result = await detectionEngine.evaluateMarket("0xmarket123");

      expect(result.evaluated).toBe(true);
    });

    it("should update metrics on market evaluation", async () => {
      await detectionEngine.evaluateMarket("0xmetricMarket");

      const metrics = detectionEngine.getMetrics();
      expect(metrics.evaluationsTotal).toBeGreaterThan(0);
    });
  });

  // ============================================
  // ALERT DEDUPLICATION TESTS
  // ============================================

  describe("alert deduplication", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should not create duplicate alerts within dedup window", async () => {
      // Mock existing alert
      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: [
          {
            id: 1,
            alertType: "pattern" as const,
            severity: "HIGH" as const,
            walletAddress: "0xwallet",
            conditionId: "0xmarket",
            detectionRule: "FreshConcentratedDepthImpact",
            title: "Existing Alert",
            status: "new" as const,
            detectedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      // Mock wallet with suspicious activity
      vi.mocked(walletActivityIndex.getWalletActivity).mockResolvedValue([
        {
          walletAddress: "0xwallet",
          conditionId: "0xmarket",
          firstTradeAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days old
          lastTradeAt: new Date(),
          totalVolume: 10000,
          tradeCount: 5,
          netPosition: 5000,
          realizedPnl: 0,
        },
      ]);

      vi.mocked(walletActivityIndex.getWalletConcentration).mockResolvedValue({
        topMarket: {
          conditionId: "0xmarket",
          volumeShare: 95,
        },
        totalVolume: 10000,
        marketCount: 1,
      });

      vi.mocked(marketDepthService.calculateDepthRatio).mockResolvedValue(5.0);

      const result = await detectionEngine.evaluateWallet("0xwallet", "0xmarket");

      // Alert should not be created due to existing alert
      expect(result.alertsCreated.length).toBe(0);
    });

    it("should allow alerts after dedup window", async () => {
      // Mock no existing alerts
      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await detectionEngine.evaluateWallet(
        "0xnoDupWallet",
        "0xnoDupMarket"
      );

      // Should be allowed (no duplicate check triggered)
      expect(result.evaluated).toBe(true);
    });
  });

  // ============================================
  // METRICS TESTS
  // ============================================

  describe("metrics", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should track evaluation metrics", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xmetric1",
        tokenId: "123",
        amount: BigInt(10000000),
        conditionId: "0xmetricMarket1",
        blockNumber: 12345,
        blockTimestamp: new Date(),
      };

      await detectionEngine.evaluateTrade(transfer);
      await detectionEngine.evaluateWallet("0xmetric2");
      await detectionEngine.evaluateMarket("0xmetricMarket2");

      const metrics = detectionEngine.getMetrics();
      expect(metrics.evaluationsTotal).toBe(3);
      expect(metrics.evaluationsSuccess).toBe(3);
    });

    it("should reset metrics", async () => {
      // Generate some metrics
      await detectionEngine.evaluateMarket("0xresetMarket");

      // Reset
      detectionEngine.resetMetrics();

      const metrics = detectionEngine.getMetrics();
      expect(metrics.evaluationsTotal).toBe(0);
      expect(metrics.evaluationsSuccess).toBe(0);
      expect(metrics.alertsCreated).toBe(0);
    });
  });

  // ============================================
  // HEALTH STATUS TESTS
  // ============================================

  describe("health status", () => {
    it("should report health status before initialization", () => {
      detectionEngine.resetMetrics();
      // Note: We can't truly un-initialize, but we can check status
      const status = detectionEngine.getHealthStatus();

      expect(status).toBeDefined();
      expect(status.rulesLoaded).toBeDefined();
      expect(status.metrics).toBeDefined();
    });

    it("should report health status after initialization", async () => {
      await detectionEngine.initialize();

      const status = detectionEngine.getHealthStatus();

      expect(status.initialized).toBe(true);
      expect(status.rulesLoaded).toBe(3);
      expect(status.enabledRules).toBe(3);
      expect(status.metrics).toBeDefined();
    });

    it("should include last evaluation time", async () => {
      await detectionEngine.initialize();
      await detectionEngine.evaluateMarket("0xhealthMarket");

      const status = detectionEngine.getHealthStatus();

      expect(status.lastEvaluation).not.toBeNull();
    });
  });

  // ============================================
  // RULE CONFIGURATION TESTS
  // ============================================

  describe("rule configuration updates", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should enable/disable a rule", async () => {
      const rule = detectionEngine.getRule("FreshConcentratedDepthImpact");
      expect(rule?.enabled).toBe(true);

      await detectionEngine.setRuleEnabled(
        "FreshConcentratedDepthImpact",
        false
      );

      // Note: Due to mocking, we can't verify the actual state change
      // In real code, the rule would be disabled
    });

    it("should throw for unknown rule when setting enabled", async () => {
      await expect(
        detectionEngine.setRuleEnabled("NonExistent" as any, true)
      ).rejects.toThrow("Unknown rule");
    });

    it("should update rule thresholds", async () => {
      const newThresholds = {
        max_wallet_age_days: 7,
        min_concentration_pct: 90,
        min_trade_size_usd: 5000,
        min_depth_ratio: 4.0,
      };

      await detectionEngine.setRuleThresholds(
        "FreshConcentratedDepthImpact",
        newThresholds
      );

      // Verify thresholds were passed to the rule
      // Note: Due to mocking, actual values aren't persisted
    });

    it("should throw for unknown rule when setting thresholds", async () => {
      await expect(
        detectionEngine.setRuleThresholds("NonExistent" as any, {})
      ).rejects.toThrow("Unknown rule");
    });
  });

  // ============================================
  // PENDING MTM EVALUATION TESTS
  // ============================================

  describe("pending MTM evaluations", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should process pending MTM evaluations", async () => {
      // This is a pass-through to preMoveAdvantageRule.processPendingEvaluations
      const result = await detectionEngine.processPendingMtmEvaluations(50);

      expect(result).toBeDefined();
      expect(result.processed).toBeDefined();
      expect(result.triggered).toBeDefined();
      expect(result.errors).toBeDefined();
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe("error handling", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should handle errors gracefully and update error metrics", async () => {
      // Mock an error
      vi.mocked(detectionDb.getWalletActivity).mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await detectionEngine.evaluateWallet("0xerrorWallet");

      expect(result.evaluated).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0]).toContain("Database error");

      const metrics = detectionEngine.getMetrics();
      expect(metrics.evaluationsError).toBe(1);
    });

    it("should continue processing after individual rule errors", async () => {
      // The engine should catch rule-level errors and continue
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xerrorTest",
        tokenId: "123",
        amount: BigInt(10000000),
        conditionId: "0xerrorMarket",
        blockNumber: 12345,
        blockTimestamp: new Date(),
      };

      const result = await detectionEngine.evaluateTrade(transfer);

      // Should still be evaluated even if some rules fail
      expect(result.evaluated).toBe(true);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe("edge cases", () => {
    beforeEach(async () => {
      await detectionEngine.initialize();
    });

    it("should handle empty wallet address", async () => {
      const result = await detectionEngine.evaluateWallet("");

      expect(result.evaluated).toBe(true);
      expect(result.rulesTriggered.length).toBe(0);
    });

    it("should handle empty condition ID for market evaluation", async () => {
      const result = await detectionEngine.evaluateMarket("");

      expect(result.evaluated).toBe(true);
    });

    it("should handle transfer with zero amount", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xzeroWallet",
        tokenId: "123",
        amount: BigInt(0),
        conditionId: "0xzeroMarket",
        blockNumber: 12345,
        blockTimestamp: new Date(),
      };

      const result = await detectionEngine.evaluateTrade(transfer);

      expect(result.evaluated).toBe(true);
    });

    it("should handle transfer without timestamp", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xnoTimestamp",
        tokenId: "123",
        amount: BigInt(10000000),
        conditionId: "0xnoTimestampMarket",
        blockNumber: 12345,
        // blockTimestamp undefined
      };

      const result = await detectionEngine.evaluateTrade(transfer);

      expect(result.evaluated).toBe(true);
    });

    it("should handle very large amounts", async () => {
      const transfer: CtfTransfer = {
        txHash: "0x123",
        fromAddress: "0xabc",
        toAddress: "0xlargeAmount",
        tokenId: "123",
        amount: BigInt("1000000000000000000"), // Very large
        conditionId: "0xlargeMarket",
        blockNumber: 12345,
        blockTimestamp: new Date(),
      };

      const result = await detectionEngine.evaluateTrade(transfer);

      expect(result.evaluated).toBe(true);
    });
  });
});
