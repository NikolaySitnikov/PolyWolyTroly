/**
 * Polymarket Trading Cache Tests
 *
 * TDD: RED phase - Write tests first for trading data cache.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { WalletTradingData } from "../types/polymarket.js";

const mockSetex = vi.fn();
const mockGet = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();
const mockQuit = vi.fn();

function MockRedis() {
  return {
    setex: mockSetex,
    get: mockGet,
    del: mockDel,
    keys: mockKeys,
    quit: mockQuit,
  };
}

vi.mock("ioredis", () => ({
  default: MockRedis,
}));

vi.mock("../config/index.js", () => ({
  config: {
    redis: {
      url: "redis://localhost:6379",
    },
  },
}));

// Mock polymarketApi
const mockGetWalletTradingData = vi.fn();
vi.mock("./polymarketApi.js", () => ({
  polymarketApi: {
    getWalletTradingData: mockGetWalletTradingData,
  },
}));

const mockTradingData: WalletTradingData = {
  address: "0x1234567890123456789012345678901234567890",
  metrics: {
    pnl: 1000,
    pnl7d: 200,
    pnl30d: 500,
    winRate: 65.5,
    portfolioValue: 10000,
    activePositions: 5,
    totalTrades: 100,
    lastActivityAt: "2024-01-15T10:00:00Z",
    isLive: true,
  },
  positions: [],
  activity: [],
  profile: null,
  fetchedAt: "2024-01-15T10:05:00Z",
};

describe("polymarketTradingCache", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockSetex.mockReset();
    mockGet.mockReset();
    mockDel.mockReset();
    mockKeys.mockReset();
    mockQuit.mockReset();
    mockGetWalletTradingData.mockReset();
  });

  describe("getTradingData", () => {
    it("should return cached data when available", async () => {
      mockGet.mockResolvedValue(JSON.stringify(mockTradingData));

      const { tradingCache } = await import("./polymarketTradingCache.js");
      const result = await tradingCache.getTradingData(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toEqual(mockTradingData);
      expect(mockGet).toHaveBeenCalledWith(
        "pm:trading:0x1234567890123456789012345678901234567890"
      );
    });

    it("should return null when cache miss", async () => {
      mockGet.mockResolvedValue(null);

      const { tradingCache } = await import("./polymarketTradingCache.js");
      const result = await tradingCache.getTradingData(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBeNull();
    });

    it("should lowercase address in cache key", async () => {
      mockGet.mockResolvedValue(null);

      const { tradingCache } = await import("./polymarketTradingCache.js");
      await tradingCache.getTradingData(
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
      );

      expect(mockGet).toHaveBeenCalledWith(
        "pm:trading:0xabcdef1234567890abcdef1234567890abcdef12"
      );
    });

    it("should return null on cache read error", async () => {
      mockGet.mockRejectedValue(new Error("Redis connection error"));

      const { tradingCache } = await import("./polymarketTradingCache.js");
      const result = await tradingCache.getTradingData(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBeNull();
    });
  });

  describe("setTradingData", () => {
    it("should cache trading data with TTL", async () => {
      mockSetex.mockResolvedValue("OK");

      const { tradingCache } = await import("./polymarketTradingCache.js");
      await tradingCache.setTradingData(
        "0x1234567890123456789012345678901234567890",
        mockTradingData
      );

      expect(mockSetex).toHaveBeenCalledWith(
        "pm:trading:0x1234567890123456789012345678901234567890",
        5 * 60, // 5 minutes TTL
        JSON.stringify(mockTradingData)
      );
    });

    it("should lowercase address in cache key", async () => {
      mockSetex.mockResolvedValue("OK");

      const { tradingCache } = await import("./polymarketTradingCache.js");
      await tradingCache.setTradingData(
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        mockTradingData
      );

      expect(mockSetex).toHaveBeenCalledWith(
        "pm:trading:0xabcdef1234567890abcdef1234567890abcdef12",
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe("getOrFetchTradingData", () => {
    it("should return cached data without fetching when available", async () => {
      mockGet.mockResolvedValue(JSON.stringify(mockTradingData));

      const { tradingCache } = await import("./polymarketTradingCache.js");
      const result = await tradingCache.getOrFetchTradingData(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toEqual(mockTradingData);
      expect(mockGetWalletTradingData).not.toHaveBeenCalled();
    });

    it("should fetch and cache when cache miss", async () => {
      mockGet.mockResolvedValue(null);
      mockGetWalletTradingData.mockResolvedValue(mockTradingData);
      mockSetex.mockResolvedValue("OK");

      const { tradingCache } = await import("./polymarketTradingCache.js");
      const result = await tradingCache.getOrFetchTradingData(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toEqual(mockTradingData);
      expect(mockGetWalletTradingData).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890"
      );
      expect(mockSetex).toHaveBeenCalled();
    });

    it("should bypass cache when forceRefresh is true", async () => {
      mockGet.mockResolvedValue(JSON.stringify(mockTradingData));
      mockGetWalletTradingData.mockResolvedValue({
        ...mockTradingData,
        metrics: { ...mockTradingData.metrics, pnl: 2000 },
      });
      mockSetex.mockResolvedValue("OK");

      const { tradingCache } = await import("./polymarketTradingCache.js");
      const result = await tradingCache.getOrFetchTradingData(
        "0x1234567890123456789012345678901234567890",
        true // forceRefresh
      );

      expect(result.metrics.pnl).toBe(2000);
      expect(mockGetWalletTradingData).toHaveBeenCalled();
    });
  });

  describe("invalidateTradingData", () => {
    it("should delete cached trading data for address", async () => {
      mockDel.mockResolvedValue(1);

      const { tradingCache } = await import("./polymarketTradingCache.js");
      await tradingCache.invalidateTradingData(
        "0x1234567890123456789012345678901234567890"
      );

      expect(mockDel).toHaveBeenCalledWith(
        "pm:trading:0x1234567890123456789012345678901234567890"
      );
    });

    it("should lowercase address", async () => {
      mockDel.mockResolvedValue(1);

      const { tradingCache } = await import("./polymarketTradingCache.js");
      await tradingCache.invalidateTradingData(
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
      );

      expect(mockDel).toHaveBeenCalledWith(
        "pm:trading:0xabcdef1234567890abcdef1234567890abcdef12"
      );
    });
  });

  describe("invalidateMultiple", () => {
    it("should delete multiple addresses at once", async () => {
      mockDel.mockResolvedValue(2);

      const { tradingCache } = await import("./polymarketTradingCache.js");
      await tradingCache.invalidateMultiple([
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
      ]);

      expect(mockDel).toHaveBeenCalledWith(
        "pm:trading:0x1111111111111111111111111111111111111111",
        "pm:trading:0x2222222222222222222222222222222222222222"
      );
    });

    it("should not call redis when empty array", async () => {
      const { tradingCache } = await import("./polymarketTradingCache.js");
      await tradingCache.invalidateMultiple([]);

      expect(mockDel).not.toHaveBeenCalled();
    });
  });

  describe("getCacheStats", () => {
    it("should return cache key counts", async () => {
      mockKeys.mockResolvedValueOnce(["pm:trading:0x1", "pm:trading:0x2"]);
      mockKeys.mockResolvedValueOnce(["pm:profile:0x1"]);

      const { tradingCache } = await import("./polymarketTradingCache.js");
      const stats = await tradingCache.getCacheStats();

      expect(stats.tradingDataKeys).toBe(2);
      expect(stats.profileKeys).toBe(1);
    });

    it("should return zeros on error", async () => {
      mockKeys.mockRejectedValue(new Error("Redis error"));

      const { tradingCache } = await import("./polymarketTradingCache.js");
      const stats = await tradingCache.getCacheStats();

      expect(stats.tradingDataKeys).toBe(0);
      expect(stats.profileKeys).toBe(0);
    });
  });

  describe("close", () => {
    it("should close redis connection", async () => {
      mockQuit.mockResolvedValue("OK");

      const { tradingCache } = await import("./polymarketTradingCache.js");
      await tradingCache.close();

      expect(mockQuit).toHaveBeenCalled();
    });
  });
});
