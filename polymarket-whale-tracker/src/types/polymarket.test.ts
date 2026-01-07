/**
 * Polymarket Types Tests
 *
 * TDD: RED phase - Write tests first for type definitions.
 * These tests verify the shape and correctness of our type interfaces.
 */

import { describe, it, expect } from "vitest";
import type {
  PolymarketPosition,
  PolymarketActivity,
  PolymarketTrade,
  PolymarketValue,
  PolymarketUserProfile,
  TradingMetrics,
  WalletTradingData,
  PnlTimeWindow,
} from "./polymarket.js";

describe("Polymarket Types", () => {
  describe("PolymarketPosition", () => {
    it("should have required position fields", () => {
      const position: PolymarketPosition = {
        conditionId: "0x123",
        asset: "Yes",
        outcomeIndex: 0,
        outcome: "Yes",
        title: "Will BTC hit $100k?",
        slug: "btc-100k",
        eventSlug: "crypto-prices",
        size: 1000,
        avgPrice: 0.45,
        currentPrice: 0.55,
        initialValue: 450,
        currentValue: 550,
        pnl: 100,
        pnlPercent: 22.22,
        isActive: true,
      };

      expect(position.conditionId).toBe("0x123");
      expect(position.outcome).toBe("Yes");
      expect(position.size).toBe(1000);
      expect(position.pnl).toBe(100);
      expect(position.isActive).toBe(true);
    });

    it("should allow optional fields", () => {
      const position: PolymarketPosition = {
        conditionId: "0x123",
        asset: "Yes",
        outcomeIndex: 0,
        outcome: "Yes",
        title: "Test",
        slug: "test",
        eventSlug: "test-event",
        size: 100,
        avgPrice: 0.5,
        currentPrice: 0.6,
        initialValue: 50,
        currentValue: 60,
        pnl: 10,
        pnlPercent: 20,
        isActive: true,
        endDate: "2024-12-31T00:00:00Z",
        category: "crypto",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };

      expect(position.endDate).toBe("2024-12-31T00:00:00Z");
      expect(position.category).toBe("crypto");
    });
  });

  describe("PolymarketActivity", () => {
    it("should have required activity fields", () => {
      const activity: PolymarketActivity = {
        proxyWallet: "0xabc123",
        timestamp: 1704067200,
        type: "TRADE",
      };

      expect(activity.proxyWallet).toBe("0xabc123");
      expect(activity.timestamp).toBe(1704067200);
      expect(activity.type).toBe("TRADE");
    });

    it("should allow trade-specific optional fields", () => {
      const activity: PolymarketActivity = {
        proxyWallet: "0xabc123",
        timestamp: 1704067200,
        type: "TRADE",
        conditionId: "0x456",
        title: "Will Trump win?",
        slug: "trump-2024",
        side: "BUY",
        outcome: "Yes",
        size: 500,
        usdcSize: 250,
        price: 0.5,
        transactionHash: "0xtxhash",
        fee: 1.25,
      };

      expect(activity.side).toBe("BUY");
      expect(activity.usdcSize).toBe(250);
      expect(activity.transactionHash).toBe("0xtxhash");
    });
  });

  describe("PolymarketTrade", () => {
    it("should have all required trade fields", () => {
      const trade: PolymarketTrade = {
        transactionHash: "0xtxhash",
        timestamp: 1704067200,
        conditionId: "0x789",
        title: "Market title",
        slug: "market-slug",
        side: "SELL",
        outcome: "No",
        size: 200,
        usdcSize: 150,
        price: 0.75,
        fee: 0.5,
        isMaker: false,
      };

      expect(trade.transactionHash).toBe("0xtxhash");
      expect(trade.side).toBe("SELL");
      expect(trade.outcome).toBe("No");
      expect(trade.isMaker).toBe(false);
    });
  });

  describe("PolymarketValue", () => {
    it("should have all portfolio value fields", () => {
      const value: PolymarketValue = {
        portfolioValue: 10000,
        positionsValue: 8000,
        cashBalance: 2000,
        realizedPnl: 500,
        unrealizedPnl: 300,
        totalPnl: 800,
        activePositions: 5,
        timestamp: 1704067200,
      };

      expect(value.portfolioValue).toBe(10000);
      expect(value.totalPnl).toBe(800);
      expect(value.activePositions).toBe(5);
    });
  });

  describe("PolymarketUserProfile", () => {
    it("should have required profile fields", () => {
      const profile: PolymarketUserProfile = {
        address: "0xuser123",
        verified: false,
      };

      expect(profile.address).toBe("0xuser123");
      expect(profile.verified).toBe(false);
    });

    it("should allow optional profile fields", () => {
      const profile: PolymarketUserProfile = {
        address: "0xuser123",
        name: "CryptoWhale",
        pseudonym: "whale_hunter",
        avatarUrl: "https://example.com/avatar.png",
        verified: true,
        twitterHandle: "cryptowhale",
        bio: "Trading prediction markets",
        createdAt: "2023-01-01T00:00:00Z",
        followers: 1000,
        following: 50,
        totalVolume: 500000,
        totalProfit: 25000,
      };

      expect(profile.name).toBe("CryptoWhale");
      expect(profile.twitterHandle).toBe("cryptowhale");
      expect(profile.followers).toBe(1000);
    });
  });

  describe("TradingMetrics", () => {
    it("should have all aggregated metrics fields", () => {
      const metrics: TradingMetrics = {
        pnl: 5000,
        pnl7d: 1000,
        pnl30d: 3000,
        winRate: 65.5,
        portfolioValue: 50000,
        activePositions: 8,
        totalTrades: 150,
        lastActivityAt: "2024-01-15T10:30:00Z",
        isLive: true,
      };

      expect(metrics.pnl).toBe(5000);
      expect(metrics.winRate).toBe(65.5);
      expect(metrics.isLive).toBe(true);
      expect(metrics.lastActivityAt).toBe("2024-01-15T10:30:00Z");
    });

    it("should allow null lastActivityAt for inactive wallets", () => {
      const metrics: TradingMetrics = {
        pnl: 0,
        pnl7d: 0,
        pnl30d: 0,
        winRate: 0,
        portfolioValue: 0,
        activePositions: 0,
        totalTrades: 0,
        lastActivityAt: null,
        isLive: false,
      };

      expect(metrics.lastActivityAt).toBeNull();
      expect(metrics.isLive).toBe(false);
    });
  });

  describe("WalletTradingData", () => {
    it("should combine all trading data for a wallet", () => {
      const tradingData: WalletTradingData = {
        address: "0xwallet123",
        metrics: {
          pnl: 1000,
          pnl7d: 200,
          pnl30d: 500,
          winRate: 70,
          portfolioValue: 10000,
          activePositions: 3,
          totalTrades: 50,
          lastActivityAt: "2024-01-15T12:00:00Z",
          isLive: true,
        },
        positions: [],
        activity: [],
        profile: null,
        fetchedAt: "2024-01-15T12:05:00Z",
      };

      expect(tradingData.address).toBe("0xwallet123");
      expect(tradingData.metrics.pnl).toBe(1000);
      expect(tradingData.positions).toHaveLength(0);
      expect(tradingData.profile).toBeNull();
    });

    it("should include profile when available", () => {
      const tradingData: WalletTradingData = {
        address: "0xwallet123",
        metrics: {
          pnl: 0,
          pnl7d: 0,
          pnl30d: 0,
          winRate: 0,
          portfolioValue: 0,
          activePositions: 0,
          totalTrades: 0,
          lastActivityAt: null,
          isLive: false,
        },
        positions: [],
        activity: [],
        profile: {
          address: "0xwallet123",
          name: "TestUser",
          verified: true,
        },
        fetchedAt: "2024-01-15T12:05:00Z",
      };

      expect(tradingData.profile).not.toBeNull();
      expect(tradingData.profile?.name).toBe("TestUser");
    });
  });

  describe("PnlTimeWindow", () => {
    it("should only allow valid time window values", () => {
      const window7d: PnlTimeWindow = "7d";
      const window30d: PnlTimeWindow = "30d";
      const windowAll: PnlTimeWindow = "all";

      expect(window7d).toBe("7d");
      expect(window30d).toBe("30d");
      expect(windowAll).toBe("all");
    });
  });
});
