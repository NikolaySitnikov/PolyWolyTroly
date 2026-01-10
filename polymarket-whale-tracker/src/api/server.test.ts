/**
 * API Server Tests
 *
 * TDD: RED phase - Tests for the Express REST API.
 * Tests all endpoints before implementation.
 *
 * Step 5 (Fixed): Now mocks database for proper testing.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

// Mock the database module before importing the server
vi.mock("../services/database.js", () => ({
  db: {
    getStats: vi.fn(),
    getAllWallets: vi.fn(),
    getWallet: vi.fn(),
    getRecentDeposits: vi.fn(),
  },
}));

// Mock the trending markets service
vi.mock("../services/trendingMarkets.js", () => ({
  trendingMarketsService: {
    getTrendingMarkets: vi.fn(),
  },
}));

// Mock the trading cache service
vi.mock("../services/polymarketTradingCache.js", () => ({
  tradingCache: {
    getTradingData: vi.fn(),
    getOrFetchTradingData: vi.fn(),
  },
}));

// Import after mocking
import { createApp } from "./server.js";
import { db } from "../services/database.js";
import { trendingMarketsService } from "../services/trendingMarkets.js";
import { tradingCache } from "../services/polymarketTradingCache.js";
import type { WalletTradingData } from "../types/polymarket.js";

describe("API Server", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/health");
      expect(response.status).toBe(200);
    });

    it("should return status ok", async () => {
      const response = await request(app).get("/api/health");
      expect(response.body).toHaveProperty("status", "ok");
    });

    it("should return current timestamp", async () => {
      const response = await request(app).get("/api/health");
      expect(response.body).toHaveProperty("timestamp");
      expect(typeof response.body.timestamp).toBe("string");
    });
  });

  describe("GET /api/stats", () => {
    const mockStats = {
      whaleCount: 42,
      totalVolume: 15750000,
      alertsToday: 12,
      newWhalesToday: 5,
    };

    beforeEach(() => {
      vi.mocked(db.getStats).mockResolvedValue(mockStats);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.status).toBe(200);
    });

    it("should return whale count", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.body).toHaveProperty("whaleCount");
      expect(typeof response.body.whaleCount).toBe("number");
    });

    it("should return total volume", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.body).toHaveProperty("totalVolume");
      expect(typeof response.body.totalVolume).toBe("number");
    });

    it("should return alerts today count", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.body).toHaveProperty("alertsToday");
      expect(typeof response.body.alertsToday).toBe("number");
    });

    it("should return new whales this week count", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.body).toHaveProperty("newWhalesToday");
      expect(typeof response.body.newWhalesToday).toBe("number");
    });

    it("should call db.getStats", async () => {
      await request(app).get("/api/stats");
      expect(db.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/wallets", () => {
    const mockWalletsResult = {
      wallets: [
        { address: "0x1234", total_deposited: 50000, deposit_count: 5 },
        { address: "0xabcd", total_deposited: 30000, deposit_count: 3 },
      ],
      total: 10,
      page: 1,
      limit: 20,
    };

    beforeEach(() => {
      vi.mocked(db.getAllWallets).mockResolvedValue(mockWalletsResult);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/wallets");
      expect(response.status).toBe(200);
    });

    it("should return an array of wallets", async () => {
      const response = await request(app).get("/api/wallets");
      expect(Array.isArray(response.body.wallets)).toBe(true);
    });

    it("should return pagination info", async () => {
      const response = await request(app).get("/api/wallets");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
    });

    it("should respect limit parameter", async () => {
      vi.mocked(db.getAllWallets).mockResolvedValue({ ...mockWalletsResult, limit: 5 });
      const response = await request(app).get("/api/wallets?limit=5");
      expect(response.body.limit).toBe(5);
      expect(db.getAllWallets).toHaveBeenCalledWith(1, 5, 'total_deposited', 'desc');
    });

    it("should respect page parameter", async () => {
      vi.mocked(db.getAllWallets).mockResolvedValue({ ...mockWalletsResult, page: 2 });
      const response = await request(app).get("/api/wallets?page=2");
      expect(response.body.page).toBe(2);
      expect(db.getAllWallets).toHaveBeenCalledWith(2, 20, 'total_deposited', 'desc');
    });

    it("should pass sort parameters to database", async () => {
      await request(app).get("/api/wallets?sortBy=deposit_count&sortDir=asc");
      expect(db.getAllWallets).toHaveBeenCalledWith(1, 20, 'deposit_count', 'asc');
    });

    it("should default to total_deposited desc sorting", async () => {
      await request(app).get("/api/wallets");
      expect(db.getAllWallets).toHaveBeenCalledWith(1, 20, 'total_deposited', 'desc');
    });

    it("should validate sortBy parameter", async () => {
      await request(app).get("/api/wallets?sortBy=invalid_field");
      expect(db.getAllWallets).toHaveBeenCalledWith(1, 20, 'total_deposited', 'desc');
    });

    it("should validate sortDir parameter", async () => {
      await request(app).get("/api/wallets?sortDir=invalid");
      expect(db.getAllWallets).toHaveBeenCalledWith(1, 20, 'total_deposited', 'desc');
    });

    it("should support first_seen_at sorting", async () => {
      await request(app).get("/api/wallets?sortBy=first_seen_at&sortDir=desc");
      expect(db.getAllWallets).toHaveBeenCalledWith(1, 20, 'first_seen_at', 'desc');
    });

    describe("trading metrics enrichment", () => {
      const mockWalletWithAddress1 = {
        address: "0x1234567890123456789012345678901234567890",
        total_deposited: 50000,
        deposit_count: 5,
        first_seen_at: new Date().toISOString(),
      };

      const mockWalletWithAddress2 = {
        address: "0xabcdef1234567890abcdef1234567890abcdef12",
        total_deposited: 30000,
        deposit_count: 3,
        first_seen_at: new Date().toISOString(),
      };

      const mockTradingData1: WalletTradingData = {
        address: "0x1234567890123456789012345678901234567890",
        metrics: {
          pnl: 5000,
          pnl7d: 1000,
          pnl30d: 3000,
          winRate: 65.5,
          portfolioValue: 50000,
          activePositions: 8,
          totalTrades: 150,
          lastActivityAt: "2024-01-15T10:30:00Z",
          isLive: true,
        },
        positions: [],
        activity: [],
        profile: null,
        fetchedAt: "2024-01-15T10:35:00Z",
      };

      const mockTradingData2: WalletTradingData = {
        address: "0xabcdef1234567890abcdef1234567890abcdef12",
        metrics: {
          pnl: -2000,
          pnl7d: -500,
          pnl30d: -1500,
          winRate: 40.0,
          portfolioValue: 25000,
          activePositions: 3,
          totalTrades: 80,
          lastActivityAt: "2024-01-10T15:00:00Z",
          isLive: false,
        },
        positions: [],
        activity: [],
        profile: null,
        fetchedAt: "2024-01-15T10:35:00Z",
      };

      beforeEach(() => {
        vi.mocked(db.getAllWallets).mockResolvedValue({
          wallets: [mockWalletWithAddress1, mockWalletWithAddress2],
          total: 2,
          page: 1,
          limit: 20,
        });
      });

      it("should include trading metrics for each wallet", async () => {
        vi.mocked(tradingCache.getOrFetchTradingData)
          .mockResolvedValueOnce(mockTradingData1)
          .mockResolvedValueOnce(mockTradingData2);

        const response = await request(app).get("/api/wallets");

        expect(response.status).toBe(200);
        expect(response.body.wallets[0]).toHaveProperty("pnl", 5000);
        expect(response.body.wallets[0]).toHaveProperty("winRate", 65.5);
        expect(response.body.wallets[0]).toHaveProperty("isLive", true);
        expect(response.body.wallets[1]).toHaveProperty("pnl", -2000);
        expect(response.body.wallets[1]).toHaveProperty("winRate", 40.0);
        expect(response.body.wallets[1]).toHaveProperty("isLive", false);
      });

      it("should fetch trading data for all returned wallets", async () => {
        vi.mocked(tradingCache.getOrFetchTradingData)
          .mockResolvedValueOnce(mockTradingData1)
          .mockResolvedValueOnce(mockTradingData2);

        await request(app).get("/api/wallets");

        expect(tradingCache.getOrFetchTradingData).toHaveBeenCalledTimes(2);
        expect(tradingCache.getOrFetchTradingData).toHaveBeenCalledWith(
          "0x1234567890123456789012345678901234567890",
          false
        );
        expect(tradingCache.getOrFetchTradingData).toHaveBeenCalledWith(
          "0xabcdef1234567890abcdef1234567890abcdef12",
          false
        );
      });

      it("should include all trading metric fields", async () => {
        vi.mocked(tradingCache.getOrFetchTradingData).mockResolvedValue(mockTradingData1);

        const response = await request(app).get("/api/wallets");

        const wallet = response.body.wallets[0];
        expect(wallet).toHaveProperty("pnl");
        expect(wallet).toHaveProperty("pnl7d");
        expect(wallet).toHaveProperty("pnl30d");
        expect(wallet).toHaveProperty("winRate");
        expect(wallet).toHaveProperty("portfolioValue");
        expect(wallet).toHaveProperty("totalTrades");
        expect(wallet).toHaveProperty("lastActivityAt");
        expect(wallet).toHaveProperty("isLive");
      });

      it("should handle trading data fetch failures gracefully", async () => {
        vi.mocked(tradingCache.getOrFetchTradingData)
          .mockResolvedValueOnce(mockTradingData1)
          .mockRejectedValueOnce(new Error("API timeout"));

        const response = await request(app).get("/api/wallets");

        // First wallet should have trading data
        expect(response.body.wallets[0]).toHaveProperty("pnl", 5000);
        // Second wallet should have null trading metrics (graceful fallback)
        expect(response.body.wallets[1].pnl).toBeNull();
        expect(response.body.wallets[1].winRate).toBeNull();
        expect(response.body.wallets[1].isLive).toBeNull();
      });

      it("should return 200 even if all trading data fetches fail", async () => {
        vi.mocked(tradingCache.getOrFetchTradingData).mockRejectedValue(
          new Error("API timeout")
        );

        const response = await request(app).get("/api/wallets");

        expect(response.status).toBe(200);
        // Wallets should still be returned with null trading metrics
        expect(response.body.wallets).toHaveLength(2);
        expect(response.body.wallets[0].pnl).toBeNull();
      });

      it("should fetch trading data in parallel for performance", async () => {
        const startTime = Date.now();
        const delay = 50; // 50ms per call

        vi.mocked(tradingCache.getOrFetchTradingData).mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return mockTradingData1;
        });

        await request(app).get("/api/wallets");

        const elapsed = Date.now() - startTime;
        // If sequential: 2 * 50ms = 100ms minimum
        // If parallel: ~50ms (both start at same time)
        // Allow some buffer for test overhead
        expect(elapsed).toBeLessThan(delay * 1.8);
      });
    });
  });

  describe("GET /api/wallets/:address", () => {
    const mockWallet = {
      address: "0x1234567890123456789012345678901234567890",
      total_deposited: 50000,
      deposit_count: 5,
      first_seen_at: new Date(),
    };

    it("should return 200 OK for valid address when wallet exists", async () => {
      vi.mocked(db.getWallet).mockResolvedValue(mockWallet);
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890"
      );
      expect(response.status).toBe(200);
    });

    it("should return 404 when wallet not found", async () => {
      vi.mocked(db.getWallet).mockResolvedValue(null);
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890"
      );
      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid address format", async () => {
      const response = await request(app).get("/api/wallets/invalid-address");
      expect(response.status).toBe(400);
    });

    it("should return wallet data with required fields when found", async () => {
      vi.mocked(db.getWallet).mockResolvedValue(mockWallet);
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890"
      );
      expect(response.body).toHaveProperty("address");
      expect(response.body).toHaveProperty("total_deposited");
      expect(response.body).toHaveProperty("deposit_count");
    });
  });

  describe("GET /api/deposits", () => {
    const mockDepositsResult = {
      deposits: [
        { id: 1, wallet_address: "0x1234", amount: 50000, created_at: new Date() },
        { id: 2, wallet_address: "0xabcd", amount: 25000, created_at: new Date(Date.now() - 1000) },
      ],
      total: 100,
      page: 1,
      limit: 20,
    };

    beforeEach(() => {
      vi.mocked(db.getRecentDeposits).mockResolvedValue(mockDepositsResult);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/deposits");
      expect(response.status).toBe(200);
    });

    it("should return an array of deposits", async () => {
      const response = await request(app).get("/api/deposits");
      expect(Array.isArray(response.body.deposits)).toBe(true);
    });

    it("should return pagination info", async () => {
      const response = await request(app).get("/api/deposits");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
    });

    it("should support filtering by wallet address", async () => {
      const response = await request(app).get(
        "/api/deposits?wallet=0x1234567890123456789012345678901234567890"
      );
      expect(response.status).toBe(200);
      expect(db.getRecentDeposits).toHaveBeenCalledWith(
        1,
        20,
        "0x1234567890123456789012345678901234567890",
        undefined,
        "created_at",
        "desc"
      );
    });

    it("should return deposits sorted by timestamp descending", async () => {
      const response = await request(app).get("/api/deposits");
      const deposits = response.body.deposits;
      if (deposits.length >= 2) {
        const timestamps = deposits.map((d: any) => new Date(d.created_at).getTime());
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
        }
      }
    });
  });

  describe("CORS", () => {
    it("should include CORS headers", async () => {
      const response = await request(app)
        .get("/api/health")
        .set("Origin", "http://localhost:5173");
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("GET /api/markets/trending", () => {
    const mockTrendingMarkets = [
      {
        id: "market-1",
        question: "Will BTC reach $100k?",
        slug: "btc-100k",
        eventSlug: "btc-100k-event",
        yesPrice: 0.65,
        noPrice: 0.35,
        volume24hr: 500000,
        liquidity: 100000,
        endDate: "2025-12-31T00:00:00Z",
        category: "Crypto",
        active: true,
        clobTokenId: "123456",
        sportsMarketType: null,
        seriesSlug: null,
      },
      {
        id: "market-2",
        question: "Will ETH flip BTC?",
        slug: "eth-flip-btc",
        eventSlug: "eth-flip-btc-event",
        yesPrice: 0.25,
        noPrice: 0.75,
        volume24hr: 300000,
        liquidity: 80000,
        endDate: "2025-06-30T00:00:00Z",
        category: "Crypto",
        active: true,
        clobTokenId: "789012",
        sportsMarketType: null,
        seriesSlug: null,
      },
    ];

    beforeEach(() => {
      vi.mocked(trendingMarketsService.getTrendingMarkets).mockResolvedValue(mockTrendingMarkets);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/markets/trending");
      expect(response.status).toBe(200);
    });

    it("should return an array of markets", async () => {
      const response = await request(app).get("/api/markets/trending");
      expect(Array.isArray(response.body.markets)).toBe(true);
    });

    it("should return markets with required fields", async () => {
      const response = await request(app).get("/api/markets/trending");
      const market = response.body.markets[0];
      expect(market).toHaveProperty("id");
      expect(market).toHaveProperty("question");
      expect(market).toHaveProperty("slug");
      expect(market).toHaveProperty("yesPrice");
      expect(market).toHaveProperty("noPrice");
      expect(market).toHaveProperty("volume24hr");
      expect(market).toHaveProperty("category");
    });

    it("should include updatedAt timestamp", async () => {
      const response = await request(app).get("/api/markets/trending");
      expect(response.body).toHaveProperty("updatedAt");
      expect(typeof response.body.updatedAt).toBe("string");
    });

    it("should respect limit parameter", async () => {
      await request(app).get("/api/markets/trending?limit=5");
      expect(trendingMarketsService.getTrendingMarkets).toHaveBeenCalledWith(5);
    });

    it("should use default limit of 8", async () => {
      await request(app).get("/api/markets/trending");
      expect(trendingMarketsService.getTrendingMarkets).toHaveBeenCalledWith(8);
    });

    it("should return empty array when service returns empty", async () => {
      vi.mocked(trendingMarketsService.getTrendingMarkets).mockResolvedValue([]);
      const response = await request(app).get("/api/markets/trending");
      expect(response.body.markets).toEqual([]);
    });

    it("should return 500 when service throws", async () => {
      vi.mocked(trendingMarketsService.getTrendingMarkets).mockRejectedValue(
        new Error("API error")
      );
      const response = await request(app).get("/api/markets/trending");
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/wallets/:address/trading", () => {
    const mockTradingData: WalletTradingData = {
      address: "0x1234567890123456789012345678901234567890",
      metrics: {
        pnl: 5000,
        pnl7d: 1000,
        pnl30d: 3000,
        winRate: 65.5,
        portfolioValue: 50000,
        activePositions: 8,
        totalTrades: 150,
        lastActivityAt: "2024-01-15T10:30:00Z",
        isLive: true,
      },
      positions: [],
      activity: [],
      profile: null,
      fetchedAt: "2024-01-15T10:35:00Z",
    };

    beforeEach(() => {
      vi.mocked(tradingCache.getOrFetchTradingData).mockResolvedValue(mockTradingData);
    });

    it("should return 200 OK for valid address", async () => {
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890/trading"
      );
      expect(response.status).toBe(200);
    });

    it("should return trading data with metrics", async () => {
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890/trading"
      );
      expect(response.body).toHaveProperty("metrics");
      expect(response.body.metrics).toHaveProperty("pnl");
      expect(response.body.metrics).toHaveProperty("winRate");
      expect(response.body.metrics).toHaveProperty("isLive");
    });

    it("should return 400 for invalid address format", async () => {
      const response = await request(app).get("/api/wallets/invalid-address/trading");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid wallet address format");
    });

    it("should call tradingCache with address", async () => {
      await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890/trading"
      );
      expect(tradingCache.getOrFetchTradingData).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890",
        false
      );
    });

    it("should support force refresh query param", async () => {
      await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890/trading?refresh=true"
      );
      expect(tradingCache.getOrFetchTradingData).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890",
        true
      );
    });

    it("should return 500 when cache throws error", async () => {
      vi.mocked(tradingCache.getOrFetchTradingData).mockRejectedValue(
        new Error("Cache error")
      );
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890/trading"
      );
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });

    it("should return address in response", async () => {
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890/trading"
      );
      expect(response.body).toHaveProperty("address");
      expect(response.body.address).toBe("0x1234567890123456789012345678901234567890");
    });

    it("should return fetchedAt timestamp", async () => {
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890/trading"
      );
      expect(response.body).toHaveProperty("fetchedAt");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/api/unknown-route");
      expect(response.status).toBe(404);
    });

    it("should return JSON error for 404", async () => {
      const response = await request(app).get("/api/unknown-route");
      expect(response.body).toHaveProperty("error");
    });

    it("should return 500 when database throws error", async () => {
      vi.mocked(db.getStats).mockRejectedValue(new Error("Database connection failed"));
      const response = await request(app).get("/api/stats");
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });
});
