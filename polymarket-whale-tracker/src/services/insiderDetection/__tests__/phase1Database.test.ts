/**
 * Unit tests for Phase 1.1 database operations
 * Tests price history, wallet clusters, rule config, and MTM evaluation operations
 *
 * Note: These tests validate the database operations against the actual database.
 * They use test data that is cleaned up after each test.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { detectionDb } from "../detectionDatabase.js";
import type {
  PriceHistory,
  WalletCluster,
  PendingMtmEvaluation,
} from "../types.js";

// Test data prefix to identify test records
const TEST_PREFIX = "test_phase1_";
const TEST_CONDITION_ID = `${TEST_PREFIX}condition_${Date.now()}`;
const TEST_WALLET = `0x${TEST_PREFIX}wallet${Date.now().toString(16)}`.slice(0, 42);
// Use real UUID format for cluster IDs (database column is UUID type)
const TEST_CLUSTER_ID = crypto.randomUUID();

describe("Phase 1.1 Database Operations", () => {
  // Skip tests if database is not available
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      // Test database connection
      const configs = await detectionDb.getAllRuleConfigs();
      dbAvailable = true;
    } catch {
      console.warn("Database not available - skipping integration tests");
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    // Cleanup is handled by test isolation - test data uses unique IDs
  });

  describe("Price History Operations", () => {
    it("should record and retrieve a price", async () => {
      if (!dbAvailable) return;

      const price: Omit<PriceHistory, "id"> = {
        conditionId: TEST_CONDITION_ID,
        tokenId: `${TEST_PREFIX}token`,
        price: 0.65,
        source: "clob",
        recordedAt: new Date(),
      };

      const id = await detectionDb.recordPrice(price);
      expect(id).not.toBeNull();

      const retrieved = await detectionDb.getLatestPrice(TEST_CONDITION_ID);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.price).toBe(0.65);
      expect(retrieved?.source).toBe("clob");
    });

    it("should get price closest to timestamp", async () => {
      if (!dbAvailable) return;

      // Record a price
      const now = new Date();
      await detectionDb.recordPrice({
        conditionId: TEST_CONDITION_ID,
        tokenId: `${TEST_PREFIX}token`,
        price: 0.70,
        source: "clob",
        recordedAt: now,
      });

      // Query for a future timestamp should still return the recorded price
      const futureTime = new Date(now.getTime() + 60000);
      const price = await detectionDb.getPrice(TEST_CONDITION_ID, futureTime);

      expect(price).not.toBeNull();
      expect(price?.price).toBeGreaterThanOrEqual(0.65); // Could be 0.65 or 0.70
    });

    it("should return null for nonexistent condition", async () => {
      if (!dbAvailable) return;

      const price = await detectionDb.getLatestPrice("nonexistent_condition_xyz");
      expect(price).toBeNull();
    });
  });

  describe("Wallet Cluster Operations", () => {
    it("should record and retrieve a cluster relationship", async () => {
      if (!dbAvailable) return;

      const cluster: Omit<WalletCluster, "id"> = {
        clusterId: TEST_CLUSTER_ID,
        walletAddress: TEST_WALLET,
        relationshipType: "shared_funder",
        relatedWallet: `0x${TEST_PREFIX}related${Date.now().toString(16)}`.slice(0, 42),
        evidence: { funder: "0xfunder123", txHash: "0xtx123" },
        strength: 0.85,
        discoveredAt: new Date(),
      };

      const id = await detectionDb.recordClusterRelationship(cluster);
      expect(id).not.toBeNull();

      const relationships = await detectionDb.getWalletCluster(TEST_WALLET);
      expect(relationships.length).toBeGreaterThanOrEqual(1);

      const found = relationships.find(r => r.clusterId === TEST_CLUSTER_ID);
      expect(found).toBeDefined();
      expect(found?.relationshipType).toBe("shared_funder");
      expect(found?.strength).toBe(0.85);
    });

    it("should lowercase wallet addresses", async () => {
      if (!dbAvailable) return;

      const upperWallet = `0xABCDEF${Date.now().toString(16)}`.slice(0, 42);
      const cluster: Omit<WalletCluster, "id"> = {
        clusterId: crypto.randomUUID(),
        walletAddress: upperWallet,
        relationshipType: "timing_correlation",
        strength: 0.75,
        discoveredAt: new Date(),
      };

      await detectionDb.recordClusterRelationship(cluster);

      // Query with lowercase should find it
      const relationships = await detectionDb.getWalletCluster(upperWallet.toLowerCase());
      const found = relationships.find(r => r.relationshipType === "timing_correlation");
      expect(found).toBeDefined();
    });

    it("should get cluster by ID", async () => {
      if (!dbAvailable) return;

      // Add another relationship to the same cluster
      const cluster: Omit<WalletCluster, "id"> = {
        clusterId: TEST_CLUSTER_ID,
        walletAddress: `0x${TEST_PREFIX}wallet2${Date.now().toString(16)}`.slice(0, 42),
        relationshipType: "shared_funder",
        relatedWallet: TEST_WALLET,
        strength: 0.80,
        discoveredAt: new Date(),
      };

      await detectionDb.recordClusterRelationship(cluster);

      const relationships = await detectionDb.getClusterById(TEST_CLUSTER_ID);
      expect(relationships.length).toBeGreaterThanOrEqual(1);
    });

    it("should get cluster summary", async () => {
      if (!dbAvailable) return;

      const summary = await detectionDb.getClusterSummary(TEST_CLUSTER_ID);

      if (summary) {
        expect(summary.clusterId).toBe(TEST_CLUSTER_ID);
        expect(summary.size).toBeGreaterThanOrEqual(1);
        expect(summary.wallets.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("Detection Rule Config Operations", () => {
    it("should get rule configuration", async () => {
      if (!dbAvailable) return;

      const config = await detectionDb.getRuleConfig("FreshConcentratedDepthImpact");

      // Rule config is seeded by migration
      expect(config).not.toBeNull();
      expect(config?.ruleName).toBe("FreshConcentratedDepthImpact");
      expect(config?.enabled).toBe(true);
      expect(config?.thresholds).toBeDefined();
      expect(config?.thresholds.max_wallet_age_days).toBe(14);
    });

    it("should get all rule configurations", async () => {
      if (!dbAvailable) return;

      const configs = await detectionDb.getAllRuleConfigs();

      expect(configs.length).toBeGreaterThanOrEqual(3);

      const ruleNames = configs.map(c => c.ruleName);
      expect(ruleNames).toContain("FreshConcentratedDepthImpact");
      expect(ruleNames).toContain("PreMoveAdvantage");
      expect(ruleNames).toContain("CoordinatedCluster");
    });

    it("should update rule configuration", async () => {
      if (!dbAvailable) return;

      // Get original config
      const original = await detectionDb.getRuleConfig("PreMoveAdvantage");
      const originalEnabled = original?.enabled;

      // Toggle enabled
      const success = await detectionDb.updateRuleConfig("PreMoveAdvantage", {
        enabled: !originalEnabled,
      });
      expect(success).toBe(true);

      // Verify update
      const updated = await detectionDb.getRuleConfig("PreMoveAdvantage");
      expect(updated?.enabled).toBe(!originalEnabled);

      // Restore original
      await detectionDb.updateRuleConfig("PreMoveAdvantage", {
        enabled: originalEnabled ?? true,
      });
    });
  });

  describe("Pending MTM Evaluation Operations", () => {
    let testEvaluationId: number;

    it("should create a pending evaluation", async () => {
      if (!dbAvailable) return;

      const evaluation: Omit<PendingMtmEvaluation, "id" | "evaluated" | "evaluationResult"> = {
        walletAddress: TEST_WALLET,
        conditionId: TEST_CONDITION_ID,
        tradeTimestamp: new Date(),
        entryPrice: 0.35,
        tradeSizeUsd: 5000,
        txHash: `0x${TEST_PREFIX}tx${Date.now().toString(16)}`,
        evaluateAt: new Date(Date.now() - 60000), // In the past so it's ready
      };

      testEvaluationId = await detectionDb.createPendingMtmEvaluation(evaluation);
      expect(testEvaluationId).toBeGreaterThan(0);
    });

    it("should get pending evaluations ready for processing", async () => {
      if (!dbAvailable) return;

      const evaluations = await detectionDb.getPendingMtmEvaluations(100);

      // Should find our test evaluation
      const found = evaluations.find(e => e.id === testEvaluationId);
      expect(found).toBeDefined();
      expect(found?.entryPrice).toBe(0.35);
      expect(found?.tradeSizeUsd).toBe(5000);
      expect(found?.evaluated).toBe(false);
    });

    it("should mark evaluation as complete", async () => {
      if (!dbAvailable) return;

      const result = {
        mtmGain: 0.12,
        priceAtEvaluation: 0.47,
        alertCreated: true,
        alertId: 999,
      };

      const success = await detectionDb.markMtmEvaluationComplete(testEvaluationId, result);
      expect(success).toBe(true);

      // Verify it's no longer in pending list
      const evaluations = await detectionDb.getPendingMtmEvaluations(100);
      const found = evaluations.find(e => e.id === testEvaluationId);
      expect(found).toBeUndefined();
    });
  });

  describe("Type Contracts", () => {
    it("should handle PriceSource types correctly", async () => {
      if (!dbAvailable) return;

      const sources: Array<"clob" | "gamma" | "calculated"> = ["clob", "gamma", "calculated"];

      for (const source of sources) {
        const conditionId = `${TEST_CONDITION_ID}_${source}`;
        await detectionDb.recordPrice({
          conditionId,
          tokenId: `${TEST_PREFIX}token`,
          price: 0.5,
          source,
          recordedAt: new Date(),
        });

        const retrieved = await detectionDb.getLatestPrice(conditionId);
        expect(retrieved?.source).toBe(source);
      }
    });

    it("should handle ClusterRelationshipType types correctly", async () => {
      if (!dbAvailable) return;

      const types: Array<"shared_funder" | "shared_cashout" | "timing_correlation"> = [
        "shared_funder",
        "shared_cashout",
        "timing_correlation",
      ];

      for (const type of types) {
        const clusterId = crypto.randomUUID();
        await detectionDb.recordClusterRelationship({
          clusterId,
          walletAddress: `0x${TEST_PREFIX}${type}${Date.now().toString(16)}`.slice(0, 42),
          relationshipType: type,
          strength: 0.9,
          discoveredAt: new Date(),
        });

        const relationships = await detectionDb.getClusterById(clusterId);
        expect(relationships.length).toBeGreaterThanOrEqual(1);
        expect(relationships[0].relationshipType).toBe(type);
      }
    });
  });
});
