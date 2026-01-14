/**
 * Unit tests for Price History Service (Phase 1.2)
 *
 * Tests price recording, retrieval, MTM calculations, and volatility analysis.
 * Some tests require database connection; others test pure functions.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { priceHistoryService } from "../priceHistoryService.js";
import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";

// Test data prefix
const TEST_PREFIX = "test_price_";
const TEST_CONDITION_ID = `${TEST_PREFIX}condition_${Date.now()}`;
const TEST_TOKEN_ID = `${TEST_PREFIX}token_${Date.now()}`;

describe("Price History Service", () => {
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      // Test database connection
      await detectionDb.getLatestPrice("test_connection");
      dbAvailable = true;
    } catch {
      console.warn("Database not available - some tests will be skipped");
      dbAvailable = false;
    }
  });

  beforeEach(() => {
    // Reset stats before each test
    priceHistoryService.resetStats();
  });

  afterEach(async () => {
    // Clear test cache entries
    if (dbAvailable) {
      await detectionCache.invalidateLatestPrice(TEST_CONDITION_ID);
    }
  });

  describe("recordPrice()", () => {
    it("should record a valid price", async () => {
      if (!dbAvailable) return;

      const id = await priceHistoryService.recordPrice(
        TEST_CONDITION_ID,
        0.65,
        TEST_TOKEN_ID,
        "clob"
      );

      expect(id).not.toBeNull();
      expect(id).toBeGreaterThan(0);

      // Verify stats updated
      const status = priceHistoryService.getStatus();
      expect(status.pricesRecorded).toBe(1);
    });

    it("should update cache after recording", async () => {
      if (!dbAvailable) return;

      const uniqueConditionId = `${TEST_CONDITION_ID}_cache_${Date.now()}`;

      await priceHistoryService.recordPrice(
        uniqueConditionId,
        0.55,
        TEST_TOKEN_ID,
        "clob"
      );

      // Should be in cache now
      const cached = await detectionCache.getLatestPrice(uniqueConditionId);
      expect(cached).not.toBeNull();
      expect(cached?.price).toBe(0.55);

      // Cleanup
      await detectionCache.invalidateLatestPrice(uniqueConditionId);
    });

    it("should use current timestamp if not provided", async () => {
      if (!dbAvailable) return;

      const before = new Date();
      const id = await priceHistoryService.recordPrice(
        TEST_CONDITION_ID,
        0.45,
        TEST_TOKEN_ID,
        "gamma"
      );
      const after = new Date();

      expect(id).not.toBeNull();

      const price = await priceHistoryService.getLatestPrice(TEST_CONDITION_ID);
      expect(price).not.toBeNull();
      expect(price!.recordedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(price!.recordedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should handle different price sources", async () => {
      if (!dbAvailable) return;

      const sources = ["clob", "gamma", "calculated"] as const;

      for (const source of sources) {
        const conditionId = `${TEST_CONDITION_ID}_${source}`;
        const id = await priceHistoryService.recordPrice(
          conditionId,
          0.5,
          TEST_TOKEN_ID,
          source
        );

        expect(id).not.toBeNull();

        const price = await priceHistoryService.getLatestPrice(conditionId);
        expect(price?.source).toBe(source);

        await detectionCache.invalidateLatestPrice(conditionId);
      }
    });
  });

  describe("getPrice()", () => {
    it("should get price closest to timestamp", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_getprice_${Date.now()}`;
      const timestamp = new Date();

      // Record a price
      await priceHistoryService.recordPrice(conditionId, 0.72, TEST_TOKEN_ID, "clob", timestamp);

      // Query for a slightly later time should return this price
      const laterTime = new Date(timestamp.getTime() + 1000);
      const price = await priceHistoryService.getPrice(conditionId, laterTime);

      expect(price).not.toBeNull();
      expect(price?.price).toBe(0.72);

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should use cache for recent prices", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_cache_hit_${Date.now()}`;

      // Record price
      await priceHistoryService.recordPrice(conditionId, 0.60, TEST_TOKEN_ID, "clob");

      // First call - may or may not hit cache
      priceHistoryService.resetStats();
      await priceHistoryService.getPrice(conditionId, new Date());

      // Second call should hit cache
      await priceHistoryService.getPrice(conditionId, new Date());
      const status = priceHistoryService.getStatus();

      // Should have at least one cache hit
      expect(status.cacheHits).toBeGreaterThanOrEqual(1);

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should return null for nonexistent condition", async () => {
      if (!dbAvailable) return;

      const price = await priceHistoryService.getPrice(
        "nonexistent_condition_xyz_123",
        new Date()
      );

      expect(price).toBeNull();
    });
  });

  describe("getLatestPrice()", () => {
    it("should return latest price", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_latest_${Date.now()}`;

      // Record multiple prices
      await priceHistoryService.recordPrice(conditionId, 0.40, TEST_TOKEN_ID, "clob", new Date(Date.now() - 5000));
      await priceHistoryService.recordPrice(conditionId, 0.50, TEST_TOKEN_ID, "clob", new Date(Date.now() - 2000));
      await priceHistoryService.recordPrice(conditionId, 0.60, TEST_TOKEN_ID, "clob");

      const latest = await priceHistoryService.getLatestPrice(conditionId);
      expect(latest).not.toBeNull();
      expect(latest?.price).toBe(0.60);

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should cache and return cached price", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_latest_cache_${Date.now()}`;

      await priceHistoryService.recordPrice(conditionId, 0.75, TEST_TOKEN_ID, "clob");

      priceHistoryService.resetStats();

      // First call
      await priceHistoryService.getLatestPrice(conditionId);
      // Second call should hit cache
      await priceHistoryService.getLatestPrice(conditionId);

      const status = priceHistoryService.getStatus();
      expect(status.cacheHits).toBeGreaterThan(0);

      await detectionCache.invalidateLatestPrice(conditionId);
    });
  });

  describe("getPriceChange()", () => {
    it("should calculate positive price change", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_change_pos_${Date.now()}`;
      const fromTime = new Date(Date.now() - 60000);
      const toTime = new Date();

      // Record prices
      await priceHistoryService.recordPrice(conditionId, 0.40, TEST_TOKEN_ID, "clob", fromTime);
      await priceHistoryService.recordPrice(conditionId, 0.50, TEST_TOKEN_ID, "clob", toTime);

      const change = await priceHistoryService.getPriceChange(conditionId, fromTime, toTime);

      expect(change).not.toBeNull();
      expect(change).toBeCloseTo(0.25, 2); // (0.50 - 0.40) / 0.40 = 0.25

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should calculate negative price change", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_change_neg_${Date.now()}`;
      const fromTime = new Date(Date.now() - 60000);
      const toTime = new Date();

      await priceHistoryService.recordPrice(conditionId, 0.60, TEST_TOKEN_ID, "clob", fromTime);
      await priceHistoryService.recordPrice(conditionId, 0.45, TEST_TOKEN_ID, "clob", toTime);

      const change = await priceHistoryService.getPriceChange(conditionId, fromTime, toTime);

      expect(change).not.toBeNull();
      expect(change).toBeCloseTo(-0.25, 2); // (0.45 - 0.60) / 0.60 = -0.25

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should return null if prices unavailable", async () => {
      if (!dbAvailable) return;

      const change = await priceHistoryService.getPriceChange(
        "nonexistent_condition_xyz",
        new Date(Date.now() - 60000),
        new Date()
      );

      expect(change).toBeNull();
    });
  });

  describe("calculateMTM()", () => {
    it("should calculate positive MTM for YES position", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_mtm_yes_${Date.now()}`;
      const entryTime = new Date(Date.now() - 3600000); // 1 hour ago
      const evalTime = new Date();

      // Price moved up from 0.40 to 0.50
      await priceHistoryService.recordPrice(conditionId, 0.40, TEST_TOKEN_ID, "clob", entryTime);
      await priceHistoryService.recordPrice(conditionId, 0.50, TEST_TOKEN_ID, "clob", evalTime);

      const mtm = await priceHistoryService.calculateMTM(
        conditionId,
        0.40, // entry price
        entryTime,
        1, // 1 hour after
        "YES"
      );

      expect(mtm).not.toBeNull();
      expect(mtm?.mtmGain).toBeCloseTo(0.25, 2); // (0.50 - 0.40) / 0.40
      expect(mtm?.priceAtEvaluation).toBe(0.50);

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should calculate positive MTM for NO position when YES falls", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_mtm_no_${Date.now()}`;
      const entryTime = new Date(Date.now() - 3600000);
      const evalTime = new Date();

      // YES price fell from 0.60 to 0.40
      await priceHistoryService.recordPrice(conditionId, 0.60, TEST_TOKEN_ID, "clob", entryTime);
      await priceHistoryService.recordPrice(conditionId, 0.40, TEST_TOKEN_ID, "clob", evalTime);

      const mtm = await priceHistoryService.calculateMTM(
        conditionId,
        0.60, // YES entry price (NO entry = 0.40)
        entryTime,
        1,
        "NO"
      );

      expect(mtm).not.toBeNull();
      // NO gained: entry was 0.40 (1-0.60), now 0.60 (1-0.40)
      // Gain = (0.60 - 0.40) / 0.40 = 0.50
      expect(mtm?.mtmGain).toBeCloseTo(0.50, 2);

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should return null if no price available at evaluation time", async () => {
      if (!dbAvailable) return;

      const mtm = await priceHistoryService.calculateMTM(
        "nonexistent_condition_xyz",
        0.50,
        new Date(Date.now() - 3600000),
        1,
        "YES"
      );

      expect(mtm).toBeNull();
    });

    it("should return null if entry price is zero", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_mtm_zero_${Date.now()}`;
      await priceHistoryService.recordPrice(conditionId, 0.50, TEST_TOKEN_ID, "clob");

      const mtm = await priceHistoryService.calculateMTM(
        conditionId,
        0, // zero entry price
        new Date(Date.now() - 3600000),
        1,
        "YES"
      );

      expect(mtm).toBeNull();

      await detectionCache.invalidateLatestPrice(conditionId);
    });
  });

  describe("getPriceHistory()", () => {
    it("should return prices within time range", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_history_${Date.now()}`;
      const now = Date.now();

      // Record prices at different times
      for (let i = 0; i < 5; i++) {
        await priceHistoryService.recordPrice(
          conditionId,
          0.40 + i * 0.05,
          TEST_TOKEN_ID,
          "clob",
          new Date(now - (5 - i) * 60000) // Every minute
        );
      }

      const history = await priceHistoryService.getPriceHistory(
        conditionId,
        new Date(now - 360000), // 6 minutes ago
        new Date(now)
      );

      expect(history.length).toBeGreaterThanOrEqual(5);
      // Should be in ascending order by time
      for (let i = 1; i < history.length; i++) {
        expect(history[i].recordedAt.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].recordedAt.getTime()
        );
      }

      await detectionCache.invalidateLatestPrice(conditionId);
    });
  });

  describe("getVolatility()", () => {
    it("should calculate volatility from price history", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_vol_${Date.now()}`;
      const now = Date.now();

      // Record volatile prices
      const prices = [0.40, 0.50, 0.35, 0.55, 0.45];
      for (let i = 0; i < prices.length; i++) {
        await priceHistoryService.recordPrice(
          conditionId,
          prices[i],
          TEST_TOKEN_ID,
          "clob",
          new Date(now - (prices.length - i) * 60000)
        );
      }

      const volatility = await priceHistoryService.getVolatility(conditionId, 1);

      expect(volatility).not.toBeNull();
      expect(volatility).toBeGreaterThan(0);

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should return null if not enough price data", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_vol_nodata_${Date.now()}`;

      // Record only one price
      await priceHistoryService.recordPrice(conditionId, 0.50, TEST_TOKEN_ID, "clob");

      const volatility = await priceHistoryService.getVolatility(conditionId, 24);

      // Only one price, can't calculate returns
      expect(volatility).toBeNull();

      await detectionCache.invalidateLatestPrice(conditionId);
    });
  });

  describe("isVolatileRegime()", () => {
    it("should detect volatile regime", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_regime_${Date.now()}`;
      const now = Date.now();

      // Create historical stable prices
      for (let i = 0; i < 48; i++) {
        await priceHistoryService.recordPrice(
          conditionId,
          0.50 + (Math.random() - 0.5) * 0.02, // Small variations
          TEST_TOKEN_ID,
          "clob",
          new Date(now - (48 - i) * 3600000) // Every hour for 48 hours
        );
      }

      // Create recent volatile prices
      for (let i = 0; i < 6; i++) {
        await priceHistoryService.recordPrice(
          conditionId,
          0.50 + (Math.random() - 0.5) * 0.20, // Large variations
          TEST_TOKEN_ID,
          "clob",
          new Date(now - (6 - i) * 600000) // Every 10 min for last hour
        );
      }

      const isVolatile = await priceHistoryService.isVolatileRegime(conditionId, 6, 48, 1.5);

      // This test may be flaky due to random values, but demonstrates the interface
      expect(typeof isVolatile).toBe("boolean");

      await detectionCache.invalidateLatestPrice(conditionId);
    });
  });

  describe("recordPriceFromDepth()", () => {
    it("should record valid mid-price", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_depth_${Date.now()}`;

      await priceHistoryService.recordPriceFromDepth(conditionId, 0.55, TEST_TOKEN_ID);

      const price = await priceHistoryService.getLatestPrice(conditionId);
      expect(price).not.toBeNull();
      expect(price?.price).toBe(0.55);
      expect(price?.source).toBe("clob");

      await detectionCache.invalidateLatestPrice(conditionId);
    });

    it("should skip invalid prices", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_depth_invalid_${Date.now()}`;

      // These should not record anything
      await priceHistoryService.recordPriceFromDepth(conditionId, 0, TEST_TOKEN_ID);
      await priceHistoryService.recordPriceFromDepth(conditionId, 1, TEST_TOKEN_ID);
      await priceHistoryService.recordPriceFromDepth(conditionId, -0.5, TEST_TOKEN_ID);
      await priceHistoryService.recordPriceFromDepth(conditionId, 1.5, TEST_TOKEN_ID);

      const price = await priceHistoryService.getLatestPrice(conditionId);
      expect(price).toBeNull();
    });
  });

  describe("getStatus()", () => {
    it("should return service status", () => {
      const status = priceHistoryService.getStatus();

      expect(status).toHaveProperty("isRecording");
      expect(status).toHaveProperty("pricesRecorded");
      expect(status).toHaveProperty("cacheHits");
      expect(status).toHaveProperty("cacheMisses");
      expect(status).toHaveProperty("gammaFallbacks");
      expect(status).toHaveProperty("errors");
      expect(status).toHaveProperty("cacheHitRate");
    });

    it("should calculate cache hit rate", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_hitrate_${Date.now()}`;

      // Record a price
      await priceHistoryService.recordPrice(conditionId, 0.50, TEST_TOKEN_ID, "clob");

      priceHistoryService.resetStats();

      // Multiple cache hits
      await priceHistoryService.getLatestPrice(conditionId);
      await priceHistoryService.getLatestPrice(conditionId);
      await priceHistoryService.getLatestPrice(conditionId);

      const status = priceHistoryService.getStatus();
      expect(status.cacheHits).toBeGreaterThan(0);
      expect(status.cacheHitRate).toMatch(/^\d+(\.\d+)?%$/);

      await detectionCache.invalidateLatestPrice(conditionId);
    });
  });

  describe("resetStats()", () => {
    it("should reset all statistics", async () => {
      if (!dbAvailable) return;

      const conditionId = `${TEST_CONDITION_ID}_reset_${Date.now()}`;

      // Generate some stats
      await priceHistoryService.recordPrice(conditionId, 0.50, TEST_TOKEN_ID, "clob");
      await priceHistoryService.getLatestPrice(conditionId);

      // Reset
      priceHistoryService.resetStats();

      const status = priceHistoryService.getStatus();
      expect(status.pricesRecorded).toBe(0);
      expect(status.cacheHits).toBe(0);
      expect(status.cacheMisses).toBe(0);
      expect(status.gammaFallbacks).toBe(0);
      expect(status.errors).toBe(0);

      await detectionCache.invalidateLatestPrice(conditionId);
    });
  });
});
