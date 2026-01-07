import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("polymarketApi service", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  describe("hasHistoricalActivity", () => {
    it("should return true when wallet has activity history", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            proxyWallet: "0x1234567890123456789012345678901234567890",
            timestamp: 1767474989,
            type: "TRADE",
            size: 1000,
          },
        ],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.hasHistoricalActivity(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://data-api.polymarket.com/activity?user=0x1234567890123456789012345678901234567890&limit=1"
      );
    });

    it("should return false when wallet has no activity history", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.hasHistoricalActivity(
        "0xabcdef1234567890abcdef1234567890abcdef12"
      );

      expect(result).toBe(false);
    });

    it("should return false when API returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.hasHistoricalActivity(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBe(false);
    });

    it("should return false when fetch throws an error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.hasHistoricalActivity(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBe(false);
    });

    it("should lowercase the wallet address for API call", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      await polymarketApi.hasHistoricalActivity(
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://data-api.polymarket.com/activity?user=0xabcdef1234567890abcdef1234567890abcdef12&limit=1"
      );
    });

    it("should use limit=1 for efficiency", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      await polymarketApi.hasHistoricalActivity(
        "0x1234567890123456789012345678901234567890"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=1")
      );
    });
  });

  describe("getActivityCount", () => {
    it("should return count of activities", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { type: "TRADE" },
          { type: "TRADE" },
          { type: "SPLIT" },
        ],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getActivityCount(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBe(3);
    });

    it("should return 0 when no activities", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getActivityCount(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBe(0);
    });

    it("should return 0 on API error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getActivityCount(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBe(0);
    });
  });

  describe("getFirstActivityTimestamp", () => {
    it("should return earliest timestamp from activities", async () => {
      // API returns sorted results with sortDirection=ASC, so first item is earliest
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [{ timestamp: 1600000000 }],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getFirstActivityTimestamp(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBe(1600000000);
    });

    it("should return null when no activities", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getFirstActivityTimestamp(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBeNull();
    });

    it("should return null on API error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getFirstActivityTimestamp(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBeNull();
    });

    it("should query with sortBy=TIMESTAMP and sortDirection=ASC", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [{ timestamp: 1600000000 }],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      await polymarketApi.getFirstActivityTimestamp(
        "0x1234567890123456789012345678901234567890"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=TIMESTAMP")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sortDirection=ASC")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=1")
      );
    });
  });

  // ==========================================================================
  // NEW TRADING DATA METHODS - TDD RED PHASE
  // ==========================================================================

  describe("getPositions", () => {
    it("should fetch positions for a wallet", async () => {
      const mockPositions = [
        {
          conditionId: "0x123",
          outcome: "Yes",
          title: "Test Market",
          slug: "test-market",
          eventSlug: "test-event",
          size: 100,
          avgPrice: 0.5,
          currentPrice: 0.6,
          pnl: 10,
          isActive: true,
        },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPositions,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getPositions(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toHaveLength(1);
      expect(result[0].conditionId).toBe("0x123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("data-api.polymarket.com/positions")
      );
    });

    it("should return empty array on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getPositions(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toEqual([]);
    });

    it("should respect limit parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      await polymarketApi.getPositions(
        "0x1234567890123456789012345678901234567890",
        25
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=25")
      );
    });
  });

  describe("getActivity", () => {
    it("should fetch activity for a wallet", async () => {
      const mockActivity = [
        {
          proxyWallet: "0x123",
          timestamp: 1704067200,
          type: "TRADE",
          side: "BUY",
          usdcSize: 100,
        },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockActivity,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getActivity(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("TRADE");
    });

    it("should return empty array on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getActivity(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toEqual([]);
    });
  });

  describe("getTrades", () => {
    it("should fetch trades for a wallet", async () => {
      const mockTrades = [
        {
          transactionHash: "0xtx123",
          timestamp: 1704067200,
          conditionId: "0xcond",
          title: "Test",
          slug: "test",
          side: "SELL",
          outcome: "Yes",
          size: 50,
          usdcSize: 30,
          price: 0.6,
          fee: 0.1,
          isMaker: false,
        },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTrades,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getTrades(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toHaveLength(1);
      expect(result[0].side).toBe("SELL");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("data-api.polymarket.com/trades")
      );
    });

    it("should return empty array on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getTrades(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toEqual([]);
    });
  });

  describe("getValue", () => {
    it("should fetch portfolio value for a wallet", async () => {
      const mockValue = {
        portfolioValue: 10000,
        positionsValue: 8000,
        cashBalance: 2000,
        realizedPnl: 500,
        unrealizedPnl: 300,
        totalPnl: 800,
        activePositions: 5,
        timestamp: 1704067200,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValue,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getValue(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).not.toBeNull();
      expect(result?.portfolioValue).toBe(10000);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("data-api.polymarket.com/value")
      );
    });

    it("should return null on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getValue(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBeNull();
    });
  });

  describe("getProfile", () => {
    it("should fetch profile from Gamma API", async () => {
      const mockProfile = {
        address: "0x123",
        name: "CryptoWhale",
        verified: true,
        twitterHandle: "whale",
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getProfile(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).not.toBeNull();
      expect(result?.name).toBe("CryptoWhale");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("gamma-api.polymarket.com/public-profile")
      );
    });

    it("should return null when profile not found (404)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getProfile(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result).toBeNull();
    });
  });

  describe("calculateTradingMetrics", () => {
    it("should calculate metrics from positions, activity, and trades", async () => {
      const { polymarketApi } = await import("./polymarketApi.js");

      const positions = [
        { pnl: 100, currentValue: 500, isActive: true },
        { pnl: -50, currentValue: 200, isActive: true },
        { pnl: 0, currentValue: 0, isActive: false },
      ];
      const activity = [
        { timestamp: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
      ];
      const trades = [
        { conditionId: "0x1", outcome: "Yes", side: "BUY", usdcSize: 100, timestamp: Math.floor(Date.now() / 1000) - 86400 },
        { conditionId: "0x1", outcome: "Yes", side: "SELL", usdcSize: 150, timestamp: Math.floor(Date.now() / 1000) - 3600 },
      ];

      const metrics = polymarketApi.calculateTradingMetrics(
        positions as any,
        activity as any,
        trades as any,
        null
      );

      expect(metrics.pnl).toBe(50); // 100 + (-50)
      expect(metrics.activePositions).toBe(2);
      expect(metrics.totalTrades).toBe(2);
      expect(metrics.isLive).toBe(true); // Activity within 24h
    });

    it("should mark whale as not live when inactive for 24h+", async () => {
      const { polymarketApi } = await import("./polymarketApi.js");

      const positions: any[] = [];
      const activity = [
        { timestamp: Math.floor(Date.now() / 1000) - 100000 }, // >24h ago
      ];
      const trades: any[] = [];

      const metrics = polymarketApi.calculateTradingMetrics(
        positions,
        activity as any,
        trades,
        null
      );

      expect(metrics.isLive).toBe(false);
    });

    it("should calculate win rate from closed positions", async () => {
      const { polymarketApi } = await import("./polymarketApi.js");

      const positions: any[] = [];
      const activity: any[] = [];
      // 2 profitable positions, 1 losing = 66.7% win rate
      const trades = [
        { conditionId: "0x1", outcome: "Yes", side: "BUY", usdcSize: 100, timestamp: 1000 },
        { conditionId: "0x1", outcome: "Yes", side: "SELL", usdcSize: 150, timestamp: 2000 }, // Win
        { conditionId: "0x2", outcome: "No", side: "BUY", usdcSize: 100, timestamp: 1000 },
        { conditionId: "0x2", outcome: "No", side: "SELL", usdcSize: 120, timestamp: 2000 }, // Win
        { conditionId: "0x3", outcome: "Yes", side: "BUY", usdcSize: 100, timestamp: 1000 },
        { conditionId: "0x3", outcome: "Yes", side: "SELL", usdcSize: 80, timestamp: 2000 },  // Loss
      ];

      const metrics = polymarketApi.calculateTradingMetrics(
        positions,
        activity,
        trades as any,
        null
      );

      expect(metrics.winRate).toBeCloseTo(66.7, 0);
    });
  });

  describe("getWalletTradingData", () => {
    it("should fetch all trading data and return combined result", async () => {
      // Mock all API calls
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] }) // positions
        .mockResolvedValueOnce({ ok: true, json: async () => [] }) // activity
        .mockResolvedValueOnce({ ok: true, json: async () => [] }) // trades
        .mockResolvedValueOnce({ ok: true, json: async () => null }) // value
        .mockResolvedValueOnce({ ok: false, status: 404 }); // profile (not found)

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getWalletTradingData(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.address).toBe("0x1234567890123456789012345678901234567890");
      expect(result.metrics).toBeDefined();
      expect(result.positions).toEqual([]);
      expect(result.activity).toEqual([]);
      expect(result.profile).toBeNull();
      expect(result.fetchedAt).toBeDefined();
    });

    it("should lowercase wallet address", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getWalletTradingData(
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
      );

      expect(result.address).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
    });
  });
});
