/**
 * Unit tests for Rule #2: Pre-Move Advantage Detection
 *
 * Tests cover:
 * - Basic rule triggering conditions
 * - Threshold boundary conditions
 * - MTM gain calculations
 * - Volatility regime adjustments
 * - Pending evaluation scheduling
 * - Pending evaluation processing
 * - Confidence score calculations
 * - Edge cases and error handling
 * - Alert deduplication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PreMoveAdvantageRule,
  preMoveAdvantageRule,
} from "../rules/preMoveAdvantage.js";
import { priceHistoryService } from "../priceHistoryService.js";
import { marketMetadataService } from "../marketMetadataService.js";
import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";
import type { RuleEvaluationContext, PendingMtmEvaluation } from "../types.js";

// Mock all dependencies
vi.mock("../priceHistoryService.js", () => ({
  priceHistoryService: {
    calculateMTM: vi.fn(),
    getVolatility: vi.fn(),
    isVolatileRegime: vi.fn(),
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
    createPendingMtmEvaluation: vi.fn(),
    getPendingMtmEvaluations: vi.fn(),
    markMtmEvaluationComplete: vi.fn(),
    cleanupOldMtmEvaluations: vi.fn(),
  },
}));

vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    getRuleConfig: vi.fn(),
    setRuleConfig: vi.fn(),
    invalidateRuleConfig: vi.fn(),
  },
}));

describe("PreMoveAdvantageRule", () => {
  let rule: PreMoveAdvantageRule;

  // Test fixtures
  const testWallet = "0x1234567890123456789012345678901234567890";
  const testConditionId = "0xabc123";
  const testTxHash = "0xtx123";
  const testTimestamp = new Date("2024-01-01T12:00:00Z");

  // Default thresholds
  const defaultThresholds = {
    min_trade_size_usd: 3000,
    min_mtm_gain_pct: 8,
    lookback_hours: 1,
    vol_multiplier: 1.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh rule instance for each test
    rule = new PreMoveAdvantageRule();

    // Default mock implementations
    vi.mocked(detectionCache.getRuleConfig).mockResolvedValue(null);
    vi.mocked(detectionDb.getRuleConfig).mockResolvedValue(null);
    vi.mocked(detectionDb.getAlerts).mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 1 });
    vi.mocked(detectionDb.createAlert).mockResolvedValue(1);
    vi.mocked(detectionDb.createPendingMtmEvaluation).mockResolvedValue(1);
    vi.mocked(detectionDb.getPendingMtmEvaluations).mockResolvedValue([]);
    vi.mocked(detectionDb.markMtmEvaluationComplete).mockResolvedValue(true);
    vi.mocked(detectionDb.cleanupOldMtmEvaluations).mockResolvedValue(0);

    vi.mocked(marketMetadataService.getMarket).mockResolvedValue({
      conditionId: testConditionId,
      question: "Will price go up?",
      outcomeYesTokenId: "yes-token",
      outcomeNoTokenId: "no-token",
      category: "test",
      isActive: true,
      volume: 1000000,
      firstSeenAt: new Date(),
      lastUpdatedAt: new Date(),
    });

    // Default: price went up by 10% (MTM gain of 0.10)
    vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
      mtmGain: 0.10,
      priceAtEvaluation: 0.60,
      evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
    });

    vi.mocked(priceHistoryService.getVolatility).mockResolvedValue(0.05);
    vi.mocked(priceHistoryService.isVolatileRegime).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // BASIC FUNCTIONALITY TESTS
  // ============================================

  describe("Basic Rule Properties", () => {
    it("should have correct name and description", () => {
      expect(rule.name).toBe("PreMoveAdvantage");
      expect(rule.description).toContain("lookback");
    });

    it("should have correct default thresholds", async () => {
      const thresholds = await rule.getThresholds();
      expect(thresholds.min_trade_size_usd).toBe(3000);
      expect(thresholds.min_mtm_gain_pct).toBe(8);
      expect(thresholds.lookback_hours).toBe(1);
      expect(thresholds.vol_multiplier).toBe(1.5);
    });

    it("should be enabled by default", () => {
      expect(rule.enabled).toBe(true);
    });
  });

  // ============================================
  // RULE TRIGGERING TESTS
  // ============================================

  describe("Rule Triggering", () => {
    it("should trigger when MTM gain exceeds threshold", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
        side: "YES",
      };

      // MTM gain of 10% > threshold of 8%
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.10,
        priceAtEvaluation: 0.55,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.ruleName).toBe("PreMoveAdvantage");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.triggerValues).toHaveProperty("mtmGainPct");
      expect((result.triggerValues as Record<string, unknown>).mtmGainPct).toBe(10);
    });

    it("should NOT trigger when MTM gain is below threshold", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      // MTM gain of 5% < threshold of 8%
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.05,
        priceAtEvaluation: 0.525,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect((result.triggerValues as Record<string, unknown>).reason).toContain("MTM gain below threshold");
    });

    it("should NOT trigger when trade size is below minimum", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 1000, // Below $3000 threshold
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect((result.triggerValues as Record<string, unknown>).reason).toContain("trade size");
    });

    it("should NOT trigger when price data is unavailable", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue(null);

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect((result.triggerValues as Record<string, unknown>).reason).toContain("Price data unavailable");
    });

    it("should NOT trigger when rule is disabled", async () => {
      vi.mocked(detectionDb.getRuleConfig).mockResolvedValue({
        ruleName: "PreMoveAdvantage",
        enabled: false,
        thresholds: defaultThresholds,
        description: "",
        updatedAt: new Date(),
      });

      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect((result.triggerValues as Record<string, unknown>).disabled).toBe(true);
    });
  });

  // ============================================
  // VOLATILITY REGIME TESTS
  // ============================================

  describe("Volatility Regime Adjustments", () => {
    it("should require higher MTM gain in volatile regime", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      // Volatile market requires 8% * 1.5 = 12% MTM gain
      vi.mocked(priceHistoryService.isVolatileRegime).mockResolvedValue(true);

      // MTM gain of 10% < 12% volatile threshold
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.10,
        priceAtEvaluation: 0.55,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect((result.triggerValues as Record<string, unknown>).isVolatileRegime).toBe(true);
    });

    it("should trigger in volatile regime when gain exceeds adjusted threshold", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      vi.mocked(priceHistoryService.isVolatileRegime).mockResolvedValue(true);

      // MTM gain of 15% > 12% volatile threshold
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.15,
        priceAtEvaluation: 0.575,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect((result.triggerValues as Record<string, unknown>).isVolatileRegime).toBe(true);
    });
  });

  // ============================================
  // PENDING EVALUATION TESTS
  // ============================================

  describe("Pending Evaluation Scheduling", () => {
    it("should schedule pending evaluation for qualifying trades", async () => {
      const result = await rule.schedulePendingEvaluation(
        testWallet,
        testConditionId,
        0.50,
        5000,
        testTimestamp,
        testTxHash
      );

      expect(result).toBe(1);
      expect(detectionDb.createPendingMtmEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAddress: testWallet.toLowerCase(),
          conditionId: testConditionId,
          entryPrice: 0.50,
          tradeSizeUsd: 5000,
          txHash: testTxHash,
        })
      );
    });

    it("should NOT schedule evaluation for small trades", async () => {
      const result = await rule.schedulePendingEvaluation(
        testWallet,
        testConditionId,
        0.50,
        1000, // Below threshold
        testTimestamp,
        testTxHash
      );

      expect(result).toBeNull();
      expect(detectionDb.createPendingMtmEvaluation).not.toHaveBeenCalled();
    });

    it("should NOT schedule evaluation when rule is disabled", async () => {
      vi.mocked(detectionDb.getRuleConfig).mockResolvedValue({
        ruleName: "PreMoveAdvantage",
        enabled: false,
        thresholds: defaultThresholds,
        description: "",
        updatedAt: new Date(),
      });

      const result = await rule.schedulePendingEvaluation(
        testWallet,
        testConditionId,
        0.50,
        5000,
        testTimestamp,
        testTxHash
      );

      expect(result).toBeNull();
    });

    it("should set correct evaluation time based on lookback hours", async () => {
      await rule.schedulePendingEvaluation(
        testWallet,
        testConditionId,
        0.50,
        5000,
        testTimestamp,
        testTxHash
      );

      const call = vi.mocked(detectionDb.createPendingMtmEvaluation).mock.calls[0][0];
      const evaluateAt = call.evaluateAt;
      const expectedEvaluateAt = new Date(testTimestamp.getTime() + 1 * 60 * 60 * 1000);

      expect(evaluateAt.getTime()).toBe(expectedEvaluateAt.getTime());
    });
  });

  describe("Pending Evaluation Processing", () => {
    it("should process pending evaluations and create alerts for triggered rules", async () => {
      const pendingEvaluation: PendingMtmEvaluation = {
        id: 1,
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeTimestamp: testTimestamp,
        entryPrice: 0.50,
        tradeSizeUsd: 5000,
        txHash: testTxHash,
        evaluateAt: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
        evaluated: false,
      };

      vi.mocked(detectionDb.getPendingMtmEvaluations).mockResolvedValue([pendingEvaluation]);

      // MTM gain of 10% triggers the rule
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.10,
        priceAtEvaluation: 0.55,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const result = await rule.processPendingEvaluations(100);

      expect(result.processed).toBe(1);
      expect(result.triggered).toBe(1);
      expect(result.errors).toBe(0);
      expect(detectionDb.createAlert).toHaveBeenCalled();
      expect(detectionDb.markMtmEvaluationComplete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          alertCreated: true,
          alertId: 1,
        })
      );
    });

    it("should process pending evaluations without creating alerts for non-triggered rules", async () => {
      const pendingEvaluation: PendingMtmEvaluation = {
        id: 1,
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeTimestamp: testTimestamp,
        entryPrice: 0.50,
        tradeSizeUsd: 5000,
        txHash: testTxHash,
        evaluateAt: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
        evaluated: false,
      };

      vi.mocked(detectionDb.getPendingMtmEvaluations).mockResolvedValue([pendingEvaluation]);

      // MTM gain of 5% does not trigger
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.05,
        priceAtEvaluation: 0.525,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const result = await rule.processPendingEvaluations(100);

      expect(result.processed).toBe(1);
      expect(result.triggered).toBe(0);
      expect(detectionDb.createAlert).not.toHaveBeenCalled();
      expect(detectionDb.markMtmEvaluationComplete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          alertCreated: false,
        })
      );
    });

    it("should handle multiple pending evaluations", async () => {
      const evaluations: PendingMtmEvaluation[] = [
        {
          id: 1,
          walletAddress: testWallet,
          conditionId: testConditionId,
          tradeTimestamp: testTimestamp,
          entryPrice: 0.50,
          tradeSizeUsd: 5000,
          txHash: "0xtx1",
          evaluateAt: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
          evaluated: false,
        },
        {
          id: 2,
          walletAddress: "0xanotherWallet",
          conditionId: testConditionId,
          tradeTimestamp: testTimestamp,
          entryPrice: 0.40,
          tradeSizeUsd: 10000,
          txHash: "0xtx2",
          evaluateAt: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
          evaluated: false,
        },
      ];

      vi.mocked(detectionDb.getPendingMtmEvaluations).mockResolvedValue(evaluations);

      const result = await rule.processPendingEvaluations(100);

      expect(result.processed).toBe(2);
    });

    it("should handle errors gracefully during processing", async () => {
      const pendingEvaluation: PendingMtmEvaluation = {
        id: 1,
        walletAddress: testWallet,
        conditionId: testConditionId,
        tradeTimestamp: testTimestamp,
        entryPrice: 0.50,
        tradeSizeUsd: 5000,
        txHash: testTxHash,
        evaluateAt: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
        evaluated: false,
      };

      vi.mocked(detectionDb.getPendingMtmEvaluations).mockResolvedValue([pendingEvaluation]);
      vi.mocked(priceHistoryService.calculateMTM).mockRejectedValue(new Error("Price service error"));

      const result = await rule.processPendingEvaluations(100);

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(1);
    });
  });

  // ============================================
  // CONFIDENCE SCORE TESTS
  // ============================================

  describe("Confidence Score Calculation", () => {
    it("should calculate higher confidence for larger MTM gains", async () => {
      const baseContext: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      // Lower gain
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.10,
        priceAtEvaluation: 0.55,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const lowResult = await rule.evaluate(baseContext);

      // Higher gain
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.30,
        priceAtEvaluation: 0.65,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const highResult = await rule.evaluate(baseContext);

      expect(highResult.triggered).toBe(true);
      expect(lowResult.triggered).toBe(true);
      expect(highResult.confidence).toBeGreaterThan(lowResult.confidence);
    });

    it("should calculate higher confidence for larger trade sizes", async () => {
      // Small trade
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.10,
        priceAtEvaluation: 0.55,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const smallContext: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 3500,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      const smallResult = await rule.evaluate(smallContext);

      // Large trade
      const largeContext: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 50000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      const largeResult = await rule.evaluate(largeContext);

      expect(largeResult.triggered).toBe(true);
      expect(smallResult.triggered).toBe(true);
      expect(largeResult.confidence).toBeGreaterThan(smallResult.confidence);
    });

    it("should map confidence to correct severity", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 100000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      // Very high MTM gain + large trade = high confidence
      vi.mocked(priceHistoryService.calculateMTM).mockResolvedValue({
        mtmGain: 0.40,
        priceAtEvaluation: 0.70,
        evaluationTime: new Date(testTimestamp.getTime() + 60 * 60 * 1000),
      });

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(true);
      expect(result.severity).toBeDefined();
      expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(result.severity);
    });
  });

  // ============================================
  // EDGE CASES AND VALIDATION
  // ============================================

  describe("Input Validation", () => {
    it("should return not triggered for missing wallet address", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: "",
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect((result.triggerValues as Record<string, unknown>).error).toBeDefined();
    });

    it("should return not triggered for missing condition ID", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: undefined,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should return not triggered for missing entry price", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: undefined,
        tradeSize: 5000,
        timestamp: testTimestamp,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should return not triggered for zero entry price", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0,
        tradeSize: 5000,
        timestamp: testTimestamp,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });

    it("should return not triggered for missing timestamp", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: undefined,
      };

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
    });
  });

  // ============================================
  // ALERT DEDUPLICATION TESTS
  // ============================================

  describe("Alert Deduplication", () => {
    it("should not trigger when alert already exists for same wallet/market", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
      };

      // Simulate existing alert
      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: [
          {
            id: 1,
            alertType: "timing",
            severity: "HIGH",
            confidenceScore: 0.75,
            walletAddress: testWallet,
            conditionId: testConditionId,
            detectionRule: "PreMoveAdvantage",
            triggerValues: {},
            thresholdValues: {},
            status: "new",
            detectedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 1,
      });

      const result = await rule.evaluate(context);

      expect(result.triggered).toBe(false);
      expect((result.triggerValues as Record<string, unknown>).reason).toContain("Alert already exists");
    });
  });

  // ============================================
  // CONFIGURATION TESTS
  // ============================================

  describe("Configuration", () => {
    it("should load configuration from cache", async () => {
      vi.mocked(detectionCache.getRuleConfig).mockResolvedValue({
        ruleName: "PreMoveAdvantage",
        enabled: true,
        thresholds: {
          min_trade_size_usd: 5000,
          min_mtm_gain_pct: 10,
          lookback_hours: 2,
          vol_multiplier: 2.0,
        },
        description: "",
        updatedAt: new Date(),
      });

      const thresholds = await rule.getThresholds();

      expect(thresholds.min_trade_size_usd).toBe(5000);
      expect(thresholds.min_mtm_gain_pct).toBe(10);
      expect(thresholds.lookback_hours).toBe(2);
      expect(thresholds.vol_multiplier).toBe(2.0);
    });

    it("should update thresholds", async () => {
      await rule.setThresholds({
        min_trade_size_usd: 10000,
        min_mtm_gain_pct: 15,
        lookback_hours: 3,
        vol_multiplier: 2.5,
      });

      expect(detectionDb.updateRuleConfig).toHaveBeenCalledWith(
        "PreMoveAdvantage",
        expect.objectContaining({
          thresholds: expect.objectContaining({
            min_trade_size_usd: 10000,
          }),
        })
      );
      expect(detectionCache.invalidateRuleConfig).toHaveBeenCalledWith("PreMoveAdvantage");
    });

    it("should enable/disable rule", async () => {
      await rule.setEnabled(false);

      expect(detectionDb.updateRuleConfig).toHaveBeenCalledWith(
        "PreMoveAdvantage",
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  // ============================================
  // YES/NO SIDE HANDLING
  // ============================================

  describe("YES/NO Side Handling", () => {
    it("should calculate MTM correctly for YES side", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
        side: "YES",
      };

      await rule.evaluate(context);

      expect(priceHistoryService.calculateMTM).toHaveBeenCalledWith(
        testConditionId,
        0.50,
        testTimestamp,
        1, // lookback_hours
        "YES"
      );
    });

    it("should calculate MTM correctly for NO side", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
        side: "NO",
      };

      await rule.evaluate(context);

      expect(priceHistoryService.calculateMTM).toHaveBeenCalledWith(
        testConditionId,
        0.50,
        testTimestamp,
        1,
        "NO"
      );
    });

    it("should default to YES side when not specified", async () => {
      const context: RuleEvaluationContext = {
        walletAddress: testWallet,
        conditionId: testConditionId,
        entryPrice: 0.50,
        tradeSize: 5000,
        timestamp: testTimestamp,
        txHash: testTxHash,
        // side not specified
      };

      await rule.evaluate(context);

      expect(priceHistoryService.calculateMTM).toHaveBeenCalledWith(
        testConditionId,
        0.50,
        testTimestamp,
        1,
        "YES"
      );
    });
  });

  // ============================================
  // CLEANUP TESTS
  // ============================================

  describe("Cleanup", () => {
    it("should clean up old evaluations", async () => {
      vi.mocked(detectionDb.cleanupOldMtmEvaluations).mockResolvedValue(5);

      const count = await rule.cleanupOldEvaluations(7);

      expect(count).toBe(5);
      expect(detectionDb.cleanupOldMtmEvaluations).toHaveBeenCalledWith(7);
    });
  });

  // ============================================
  // SINGLETON INSTANCE TESTS
  // ============================================

  describe("Singleton Instance", () => {
    it("should export singleton instance", () => {
      expect(preMoveAdvantageRule).toBeInstanceOf(PreMoveAdvantageRule);
      expect(preMoveAdvantageRule.name).toBe("PreMoveAdvantage");
    });
  });
});
