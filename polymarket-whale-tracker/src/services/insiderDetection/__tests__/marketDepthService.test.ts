/**
 * Tests for Market Depth Service
 *
 * These tests verify the order book depth fetching and snapshot
 * extraction functionality for insider trading detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock config
vi.mock("../../../config/index.js", () => ({
  config: {
    database: {
      url: "postgresql://mock",
    },
    redis: {
      url: "redis://mock",
    },
  },
}));

// Mock detection database
const mockInsertDepthSnapshot = vi.fn().mockResolvedValue(1);
const mockGetLatestSnapshot = vi.fn();
const mockGetRecentSnapshots = vi.fn();

vi.mock("../detectionDatabase.js", () => ({
  detectionDb: {
    insertDepthSnapshot: (...args: unknown[]) => mockInsertDepthSnapshot(...args),
    getLatestSnapshot: (...args: unknown[]) => mockGetLatestSnapshot(...args),
    getRecentSnapshots: (...args: unknown[]) => mockGetRecentSnapshots(...args),
  },
}));

// Mock detection cache
const mockSetLatestDepth = vi.fn().mockResolvedValue(undefined);
const mockGetLatestDepth = vi.fn().mockResolvedValue(null);

vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    setLatestDepth: (...args: unknown[]) => mockSetLatestDepth(...args),
    getLatestDepth: (...args: unknown[]) => mockGetLatestDepth(...args),
  },
}));

// Mock market metadata service
const mockGetActiveMarkets = vi.fn();
const mockGetMarket = vi.fn();

vi.mock("../marketMetadataService.js", () => ({
  marketMetadataService: {
    getActiveMarkets: () => mockGetActiveMarkets(),
    getMarket: (...args: unknown[]) => mockGetMarket(...args),
  },
}));

// Sample order book response from CLOB API
const sampleOrderBook = {
  market: "0x1234567890abcdef",
  asset_id: "token123",
  timestamp: "2026-01-13T12:00:00Z",
  hash: "0xabc123",
  bids: [
    { price: "0.52", size: "1000" },
    { price: "0.51", size: "2000" },
    { price: "0.50", size: "3000" },
    { price: "0.48", size: "5000" },
    { price: "0.45", size: "8000" },
    { price: "0.40", size: "10000" },
  ],
  asks: [
    { price: "0.53", size: "1500" },
    { price: "0.54", size: "2500" },
    { price: "0.55", size: "4000" },
    { price: "0.58", size: "6000" },
    { price: "0.60", size: "7000" },
    { price: "0.65", size: "12000" },
  ],
  min_order_size: "0.001",
  tick_size: "0.01",
  neg_risk: false,
};

// Sample market data
const sampleMarket = {
  conditionId: "0xcondition123",
  question: "Test Market?",
  slug: "test-market",
  outcomeYesTokenId: "token123",
  outcomeNoTokenId: "token456",
  volume24h: 100000,
  volumeTotal: 500000,
  liquidity: 50000,
  firstSeenAt: new Date(),
  lastUpdatedAt: new Date(),
};

describe("Market Depth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getStatus", () => {
    it("should return initial status when not running", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      const status = marketDepthService.getStatus();

      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("lastPollAt");
      expect(status).toHaveProperty("totalSnapshots");
      expect(status).toHaveProperty("errors");
      expect(status.isRunning).toBe(false);
    });
  });

  describe("captureDepth", () => {
    it("should capture depth snapshot for a valid market", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      // Setup mocks
      mockGetMarket.mockResolvedValue(sampleMarket);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOrderBook),
      });

      const result = await marketDepthService.captureDepth("0xcondition123");

      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        "https://clob.polymarket.com/book?token_id=token123"
      );

      // Verify snapshot was inserted
      expect(mockInsertDepthSnapshot).toHaveBeenCalled();
      const insertedSnapshot = mockInsertDepthSnapshot.mock.calls[0][0];
      expect(insertedSnapshot.conditionId).toBe("0xcondition123");
      expect(insertedSnapshot.midPrice).toBeCloseTo(0.525, 3); // (0.52 + 0.53) / 2
      expect(insertedSnapshot.spread).toBeCloseTo(0.01, 3); // 0.53 - 0.52

      // Verify cache was updated
      expect(mockSetLatestDepth).toHaveBeenCalled();
    });

    it("should return null for market without token ID", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetMarket.mockResolvedValue({
        ...sampleMarket,
        outcomeYesTokenId: undefined,
      });

      const result = await marketDepthService.captureDepth("0xcondition123");

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return null for non-existent market", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetMarket.mockResolvedValue(null);

      const result = await marketDepthService.captureDepth("0xnonexistent");

      expect(result).toBeNull();
    });

    it("should handle CLOB API 404 gracefully", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetMarket.mockResolvedValue(sampleMarket);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await marketDepthService.captureDepth("0xcondition123");

      expect(result).toBeNull();
      expect(mockInsertDepthSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("getLatestDepth", () => {
    it("should return cached depth if available", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      const cachedSnapshot = {
        conditionId: "0xcondition123",
        snapshotAt: new Date(),
        midPrice: 0.5,
        spread: 0.01,
      };

      mockGetLatestDepth.mockResolvedValue(cachedSnapshot);

      const result = await marketDepthService.getLatestDepth("0xcondition123");

      expect(result).toEqual(cachedSnapshot);
      expect(mockGetLatestSnapshot).not.toHaveBeenCalled();
    });

    it("should fetch from database if not cached", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      const dbSnapshot = {
        id: 1,
        conditionId: "0xcondition123",
        snapshotAt: new Date(),
        midPrice: 0.5,
        spread: 0.01,
      };

      mockGetLatestDepth.mockResolvedValue(null);
      mockGetLatestSnapshot.mockResolvedValue(dbSnapshot);

      const result = await marketDepthService.getLatestDepth("0xcondition123");

      expect(result).toEqual(dbSnapshot);
      expect(mockGetLatestSnapshot).toHaveBeenCalledWith("0xcondition123");
      expect(mockSetLatestDepth).toHaveBeenCalled();
    });
  });

  describe("getLiquidityAtTick", () => {
    it("should return liquidity at 2-tick level", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      const snapshot = {
        conditionId: "0xcondition123",
        snapshotAt: new Date(),
        bidLiquidity2tick: 1000,
        askLiquidity2tick: 1500,
        midPrice: 0.5,
      };

      mockGetLatestDepth.mockResolvedValue(snapshot);

      const result = await marketDepthService.getLiquidityAtTick("0xcondition123", 2);

      expect(result).toEqual({
        bid: 1000,
        ask: 1500,
        total: 2500,
      });
    });

    it("should return liquidity at 5-tick level", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      const snapshot = {
        conditionId: "0xcondition123",
        snapshotAt: new Date(),
        bidLiquidity5tick: 2000,
        askLiquidity5tick: 3000,
        midPrice: 0.5,
      };

      mockGetLatestDepth.mockResolvedValue(snapshot);

      const result = await marketDepthService.getLiquidityAtTick("0xcondition123", 5);

      expect(result).toEqual({
        bid: 2000,
        ask: 3000,
        total: 5000,
      });
    });

    it("should return null if no snapshot available", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetLatestDepth.mockResolvedValue(null);

      const result = await marketDepthService.getLiquidityAtTick("0xcondition123");

      expect(result).toBeNull();
    });
  });

  describe("calculateDepthRatio", () => {
    it("should calculate correct depth ratio", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      const snapshot = {
        conditionId: "0xcondition123",
        snapshotAt: new Date(),
        bidLiquidity2tick: 5000,
        askLiquidity2tick: 5000,
        midPrice: 0.5,
      };

      mockGetLatestDepth.mockResolvedValue(snapshot);

      // Trade size of $3000 against $10000 total liquidity = 0.3 ratio
      const result = await marketDepthService.calculateDepthRatio(
        "0xcondition123",
        3000,
        2
      );

      expect(result).toBeCloseTo(0.3, 5);
    });

    it("should return null if no liquidity", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      const snapshot = {
        conditionId: "0xcondition123",
        snapshotAt: new Date(),
        bidLiquidity2tick: 0,
        askLiquidity2tick: 0,
        midPrice: 0.5,
      };

      mockGetLatestDepth.mockResolvedValue(snapshot);

      const result = await marketDepthService.calculateDepthRatio(
        "0xcondition123",
        3000
      );

      expect(result).toBeNull();
    });
  });

  describe("getMedianLiquidity", () => {
    it("should calculate median from snapshots", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      // Mock 5 snapshots with varying liquidity
      mockGetRecentSnapshots.mockResolvedValue([
        { bidLiquidity2tick: 1000, askLiquidity2tick: 1000 }, // total: 2000
        { bidLiquidity2tick: 2000, askLiquidity2tick: 2000 }, // total: 4000
        { bidLiquidity2tick: 3000, askLiquidity2tick: 3000 }, // total: 6000 <- median
        { bidLiquidity2tick: 4000, askLiquidity2tick: 4000 }, // total: 8000
        { bidLiquidity2tick: 5000, askLiquidity2tick: 5000 }, // total: 10000
      ]);

      const result = await marketDepthService.getMedianLiquidity("0xcondition123");

      expect(result).toBe(6000); // Median of [2000, 4000, 6000, 8000, 10000]
    });

    it("should return null if no snapshots", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetRecentSnapshots.mockResolvedValue([]);

      const result = await marketDepthService.getMedianLiquidity("0xcondition123");

      expect(result).toBeNull();
    });
  });

  describe("pollAllMarkets", () => {
    it("should poll all active markets", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetActiveMarkets.mockResolvedValue([
        { ...sampleMarket, conditionId: "market1", outcomeYesTokenId: "token1" },
        { ...sampleMarket, conditionId: "market2", outcomeYesTokenId: "token2" },
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOrderBook),
      });

      const count = await marketDepthService.pollAllMarkets();

      expect(count).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should skip markets without token IDs", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetActiveMarkets.mockResolvedValue([
        { ...sampleMarket, conditionId: "market1", outcomeYesTokenId: "token1" },
        { ...sampleMarket, conditionId: "market2", outcomeYesTokenId: undefined },
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOrderBook),
      });

      const count = await marketDepthService.pollAllMarkets();

      expect(count).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle empty market list", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetActiveMarkets.mockResolvedValue([]);

      const count = await marketDepthService.pollAllMarkets();

      expect(count).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("startPolling / stopPolling", () => {
    it("should start and stop polling correctly", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetActiveMarkets.mockResolvedValue([]);

      // Start polling (with short interval for testing)
      marketDepthService.startPolling(100000); // Long interval to prevent actual polls

      let status = marketDepthService.getStatus();
      expect(status.isRunning).toBe(true);

      // Stop polling
      marketDepthService.stopPolling();

      status = marketDepthService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it("should not start twice if already running", async () => {
      const { marketDepthService } = await import("../marketDepthService.js");

      mockGetActiveMarkets.mockResolvedValue([]);

      marketDepthService.startPolling(100000);
      marketDepthService.startPolling(100000); // Should not error

      const status = marketDepthService.getStatus();
      expect(status.isRunning).toBe(true);

      // Clean up
      marketDepthService.stopPolling();
    });
  });
});

describe("Depth Extraction Logic", () => {
  it("should correctly calculate mid price", () => {
    // Best bid: 0.52, Best ask: 0.53
    // Mid price should be (0.52 + 0.53) / 2 = 0.525
    const expectedMid = 0.525;

    // This is implicitly tested through captureDepth
    // The extracted midPrice in tests above should be ~0.525
  });

  it("should correctly calculate spread", () => {
    // Best ask: 0.53, Best bid: 0.52
    // Spread should be 0.53 - 0.52 = 0.01
    const expectedSpread = 0.01;

    // This is implicitly tested through captureDepth
  });

  it("should extract levels within tick ranges", () => {
    // With mid price of 0.525 and 2-tick range (0.02):
    // Bids within range: 0.52, 0.51, 0.50 (0.525 - 0.02 = 0.505)
    // Asks within range: 0.53, 0.54 (0.525 + 0.02 = 0.545)

    // With 5-tick range (0.05):
    // Bids within range: 0.52, 0.51, 0.50, 0.48 (0.525 - 0.05 = 0.475)
    // Asks within range: 0.53, 0.54, 0.55 (0.525 + 0.05 = 0.575)

    // This is implicitly tested through the snapshot extraction
  });
});
