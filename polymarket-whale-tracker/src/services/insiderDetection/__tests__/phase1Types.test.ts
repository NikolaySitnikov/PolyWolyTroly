/**
 * Unit tests for Phase 1.1 types and helpers
 * Tests the detection rule types, confidence score helpers, and type definitions
 */

import { describe, it, expect } from "vitest";
import {
  normalizeLinear,
  normalizeLog,
  normalizeInverse,
  calculateWeightedScore,
  confidenceToSeverity,
} from "../rules/types.js";
import type {
  DetectionRuleName,
  RuleResult,
  RuleEvaluationContext,
  PriceHistory,
  WalletCluster,
  ClusterSummary,
  DetectionRuleConfig,
  PendingMtmEvaluation,
  FreshConcentratedDepthThresholds,
  PreMoveAdvantageThresholds,
  CoordinatedClusterThresholds,
} from "../types.js";

describe("Phase 1.1 Types", () => {
  describe("normalizeLinear", () => {
    it("should return 0 for values at or below min", () => {
      expect(normalizeLinear(0, 10, 100)).toBe(0);
      expect(normalizeLinear(5, 10, 100)).toBe(0);
      expect(normalizeLinear(10, 10, 100)).toBe(0);
    });

    it("should return 1 for values at or above max", () => {
      expect(normalizeLinear(100, 10, 100)).toBe(1);
      expect(normalizeLinear(150, 10, 100)).toBe(1);
    });

    it("should return proportional value for mid-range values", () => {
      expect(normalizeLinear(55, 10, 100)).toBeCloseTo(0.5);
      expect(normalizeLinear(32.5, 10, 100)).toBeCloseTo(0.25);
      expect(normalizeLinear(77.5, 10, 100)).toBeCloseTo(0.75);
    });
  });

  describe("normalizeLog", () => {
    it("should return 0 for values at or below 0", () => {
      expect(normalizeLog(0, 1, 100)).toBe(0);
      expect(normalizeLog(-5, 1, 100)).toBe(0);
    });

    it("should return 0 for min <= 0", () => {
      expect(normalizeLog(50, 0, 100)).toBe(0);
      expect(normalizeLog(50, -1, 100)).toBe(0);
    });

    it("should return 1 for max value", () => {
      expect(normalizeLog(100, 1, 100)).toBeCloseTo(1);
    });

    it("should handle log scaling for mid-range values", () => {
      // 10 is geometrically between 1 and 100 (sqrt(1*100) = 10)
      expect(normalizeLog(10, 1, 100)).toBeCloseTo(0.5);
    });
  });

  describe("normalizeInverse", () => {
    it("should return 1 for values at or below min", () => {
      expect(normalizeInverse(0, 10, 100)).toBe(1);
      expect(normalizeInverse(10, 10, 100)).toBe(1);
    });

    it("should return 0 for values at or above max", () => {
      expect(normalizeInverse(100, 10, 100)).toBe(0);
      expect(normalizeInverse(150, 10, 100)).toBe(0);
    });

    it("should return inverse proportional value", () => {
      expect(normalizeInverse(55, 10, 100)).toBeCloseTo(0.5);
    });
  });

  describe("calculateWeightedScore", () => {
    it("should return 0 for empty array", () => {
      expect(calculateWeightedScore([])).toBe(0);
    });

    it("should return 0 when total weight is 0", () => {
      expect(
        calculateWeightedScore([
          { value: 0.5, weight: 0 },
          { value: 0.8, weight: 0 },
        ])
      ).toBe(0);
    });

    it("should calculate weighted average correctly", () => {
      const scores = [
        { value: 0.8, weight: 0.3 },
        { value: 0.6, weight: 0.5 },
        { value: 0.4, weight: 0.2 },
      ];
      // (0.8*0.3 + 0.6*0.5 + 0.4*0.2) / (0.3+0.5+0.2) = 0.62
      expect(calculateWeightedScore(scores)).toBeCloseTo(0.62);
    });

    it("should clamp result between 0 and 1", () => {
      const highScores = [
        { value: 1.5, weight: 1 }, // Artificially high
      ];
      expect(calculateWeightedScore(highScores)).toBe(1);

      const lowScores = [
        { value: -0.5, weight: 1 }, // Artificially low
      ];
      expect(calculateWeightedScore(lowScores)).toBe(0);
    });
  });

  describe("confidenceToSeverity", () => {
    it("should return CRITICAL for confidence >= 0.85", () => {
      expect(confidenceToSeverity(0.85)).toBe("CRITICAL");
      expect(confidenceToSeverity(0.90)).toBe("CRITICAL");
      expect(confidenceToSeverity(1.0)).toBe("CRITICAL");
    });

    it("should return HIGH for confidence >= 0.70 and < 0.85", () => {
      expect(confidenceToSeverity(0.70)).toBe("HIGH");
      expect(confidenceToSeverity(0.75)).toBe("HIGH");
      expect(confidenceToSeverity(0.84)).toBe("HIGH");
    });

    it("should return MEDIUM for confidence >= 0.50 and < 0.70", () => {
      expect(confidenceToSeverity(0.50)).toBe("MEDIUM");
      expect(confidenceToSeverity(0.60)).toBe("MEDIUM");
      expect(confidenceToSeverity(0.69)).toBe("MEDIUM");
    });

    it("should return LOW for confidence < 0.50", () => {
      expect(confidenceToSeverity(0.49)).toBe("LOW");
      expect(confidenceToSeverity(0.30)).toBe("LOW");
      expect(confidenceToSeverity(0.0)).toBe("LOW");
    });
  });

  describe("Type definitions", () => {
    it("should define valid DetectionRuleName types", () => {
      const rules: DetectionRuleName[] = [
        "FreshConcentratedDepthImpact",
        "PreMoveAdvantage",
        "CoordinatedCluster",
      ];
      expect(rules).toHaveLength(3);
    });

    it("should define valid PriceHistory type", () => {
      const price: PriceHistory = {
        conditionId: "0x123",
        tokenId: "token123",
        price: 0.65,
        source: "clob",
        recordedAt: new Date(),
      };
      expect(price.conditionId).toBe("0x123");
      expect(price.source).toBe("clob");
    });

    it("should define valid WalletCluster type", () => {
      const cluster: WalletCluster = {
        clusterId: "cluster-uuid-123",
        walletAddress: "0xabc",
        relationshipType: "shared_funder",
        relatedWallet: "0xdef",
        evidence: { funder: "0x111" },
        strength: 0.85,
        discoveredAt: new Date(),
      };
      expect(cluster.relationshipType).toBe("shared_funder");
      expect(cluster.strength).toBe(0.85);
    });

    it("should define valid ClusterSummary type", () => {
      const summary: ClusterSummary = {
        clusterId: "cluster-123",
        wallets: ["0x1", "0x2", "0x3"],
        relationshipTypes: ["shared_funder", "timing_correlation"],
        size: 3,
        totalVolume: 50000,
        discoveredAt: new Date(),
      };
      expect(summary.size).toBe(3);
      expect(summary.relationshipTypes).toContain("shared_funder");
    });

    it("should define valid DetectionRuleConfig type", () => {
      const config: DetectionRuleConfig = {
        ruleName: "FreshConcentratedDepthImpact",
        enabled: true,
        thresholds: {
          max_wallet_age_days: 14,
          min_concentration_pct: 85,
        },
        description: "Test rule",
        updatedAt: new Date(),
      };
      expect(config.enabled).toBe(true);
      expect(config.thresholds.max_wallet_age_days).toBe(14);
    });

    it("should define valid PendingMtmEvaluation type", () => {
      const evaluation: PendingMtmEvaluation = {
        walletAddress: "0x123",
        conditionId: "0xabc",
        tradeTimestamp: new Date(),
        entryPrice: 0.35,
        tradeSizeUsd: 5000,
        evaluateAt: new Date(Date.now() + 3600000),
        evaluated: false,
      };
      expect(evaluation.evaluated).toBe(false);
      expect(evaluation.entryPrice).toBe(0.35);
    });

    it("should define valid threshold types for each rule", () => {
      const rule1: FreshConcentratedDepthThresholds = {
        max_wallet_age_days: 14,
        min_concentration_pct: 85,
        min_trade_size_usd: 3000,
        min_depth_ratio: 3.0,
      };

      const rule2: PreMoveAdvantageThresholds = {
        min_trade_size_usd: 3000,
        min_mtm_gain_pct: 8,
        lookback_hours: 1,
        vol_multiplier: 1.5,
      };

      const rule3: CoordinatedClusterThresholds = {
        min_cluster_size: 3,
        min_total_notional_usd: 50000,
        max_median_age_days: 45,
        time_window_hours: 6,
      };

      expect(rule1.max_wallet_age_days).toBe(14);
      expect(rule2.lookback_hours).toBe(1);
      expect(rule3.min_cluster_size).toBe(3);
    });

    it("should define valid RuleResult type", () => {
      const result: RuleResult = {
        ruleName: "FreshConcentratedDepthImpact",
        triggered: true,
        confidence: 0.78,
        severity: "HIGH",
        triggerValues: {
          walletAgeDays: 5,
          concentration: 92,
        },
        thresholdValues: {
          maxWalletAgeDays: 14,
          minConcentrationPct: 85,
        },
        title: "Fresh wallet with high concentration",
        description: "New wallet trading aggressively",
        relatedWallets: ["0x123"],
      };

      expect(result.triggered).toBe(true);
      expect(result.confidence).toBe(0.78);
      expect(result.severity).toBe("HIGH");
    });

    it("should define valid RuleEvaluationContext type", () => {
      const context: RuleEvaluationContext = {
        walletAddress: "0xtest",
        conditionId: "0xmarket",
        tradeSize: 5000,
        entryPrice: 0.45,
        txHash: "0xtx",
        timestamp: new Date(),
      };

      expect(context.walletAddress).toBe("0xtest");
      expect(context.tradeSize).toBe(5000);
    });
  });
});
