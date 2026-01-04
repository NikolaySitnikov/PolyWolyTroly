/**
 * Trending Markets Service Tests
 *
 * TDD: RED phase - Tests for the trending markets Gamma API integration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("trendingMarkets service", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  describe("getTrendingMarkets", () => {
    it("should fetch markets from Gamma API sorted by 24hr volume", async () => {
      // Note: Gamma API returns outcomes and outcomePrices as JSON-encoded strings
      const mockMarkets = [
        {
          id: "market-1",
          question: "Will BTC reach $100k?",
          slug: "btc-100k",
          outcomes: '["Yes", "No"]',
          outcomePrices: '["0.65", "0.35"]',
          volume24hr: 500000,
          liquidityNum: 100000,
          endDate: "2025-12-31T00:00:00Z",
          category: "Crypto",
          active: true,
          closed: false,
          events: [{ id: "event-1", slug: "btc-100k-event", title: "BTC 100k" }],
        },
        {
          id: "market-2",
          question: "Will ETH flip BTC?",
          slug: "eth-flip-btc",
          outcomes: '["Yes", "No"]',
          outcomePrices: '["0.25", "0.75"]',
          volume24hr: 300000,
          liquidityNum: 80000,
          endDate: "2025-06-30T00:00:00Z",
          category: "Crypto",
          active: true,
          closed: false,
          events: [{ id: "event-2", slug: "eth-flip-btc-event", title: "ETH Flip" }],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMarkets,
      });

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      const result = await trendingMarketsService.getTrendingMarkets();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("market-1");
      expect(result[0].question).toBe("Will BTC reach $100k?");
      expect(result[0].yesPrice).toBe(0.65);
      expect(result[0].noPrice).toBe(0.35);
      expect(result[0].volume24hr).toBe(500000);
      expect(result[0].eventSlug).toBe("btc-100k-event");
    });

    it("should call Gamma API with correct parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      await trendingMarketsService.getTrendingMarkets(10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://gamma-api.polymarket.com/markets")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=10")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("order=volume24hr")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("ascending=false")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("closed=false")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("active=true")
      );
    });

    it("should use default limit of 8 markets", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      await trendingMarketsService.getTrendingMarkets();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=8")
      );
    });

    it("should transform Gamma API response to TrendingMarket format", async () => {
      const mockMarket = {
        id: "test-market",
        question: "Test question?",
        slug: "test-slug",
        outcomes: '["Yes", "No"]',
        outcomePrices: '["0.72", "0.28"]',
        volume24hr: 123456,
        liquidityNum: 50000,
        endDate: "2025-03-15T12:00:00Z",
        category: "Politics",
        active: true,
        closed: false,
        events: [{ id: "event-test", slug: "test-event-slug", title: "Test Event" }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockMarket],
      });

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      const result = await trendingMarketsService.getTrendingMarkets();

      expect(result[0]).toEqual({
        id: "test-market",
        question: "Test question?",
        slug: "test-slug",
        eventSlug: "test-event-slug",
        yesPrice: 0.72,
        noPrice: 0.28,
        volume24hr: 123456,
        liquidity: 50000,
        endDate: "2025-03-15T12:00:00Z",
        category: "Politics",
        active: true,
      });
    });

    it("should return empty array when API returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      const result = await trendingMarketsService.getTrendingMarkets();

      expect(result).toEqual([]);
    });

    it("should return empty array when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      const result = await trendingMarketsService.getTrendingMarkets();

      expect(result).toEqual([]);
    });

    it("should filter out closed markets", async () => {
      const mockMarkets = [
        {
          id: "open-market",
          question: "Open market?",
          slug: "open",
          outcomes: '["Yes", "No"]',
          outcomePrices: '["0.5", "0.5"]',
          volume24hr: 100000,
          liquidityNum: 10000,
          endDate: "2025-12-31T00:00:00Z",
          category: "Test",
          active: true,
          closed: false,
          events: [{ id: "e1", slug: "open-event", title: "Open" }],
        },
        {
          id: "closed-market",
          question: "Closed market?",
          slug: "closed",
          outcomes: '["Yes", "No"]',
          outcomePrices: '["1", "0"]',
          volume24hr: 200000,
          liquidityNum: 0,
          endDate: "2024-12-31T00:00:00Z",
          category: "Test",
          active: false,
          closed: true,
          events: [{ id: "e2", slug: "closed-event", title: "Closed" }],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMarkets,
      });

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      const result = await trendingMarketsService.getTrendingMarkets();

      // API should filter, but we also filter client-side as backup
      expect(result.every((m) => m.active)).toBe(true);
    });

    it("should handle markets with missing outcome prices gracefully", async () => {
      const mockMarket = {
        id: "market-no-prices",
        question: "Market without prices?",
        slug: "no-prices",
        outcomes: '["Yes", "No"]',
        outcomePrices: '[]', // Empty prices (JSON-encoded empty array)
        volume24hr: 1000,
        liquidityNum: 500,
        endDate: "2025-12-31T00:00:00Z",
        category: "Test",
        active: true,
        closed: false,
        events: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockMarket],
      });

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      const result = await trendingMarketsService.getTrendingMarkets();

      expect(result[0].yesPrice).toBe(0);
      expect(result[0].noPrice).toBe(0);
    });

    it("should fallback to market slug when events array is empty", async () => {
      const mockMarket = {
        id: "market-no-event",
        question: "Market without event?",
        slug: "market-slug-fallback",
        outcomes: '["Yes", "No"]',
        outcomePrices: '["0.5", "0.5"]',
        volume24hr: 1000,
        liquidityNum: 500,
        endDate: "2025-12-31T00:00:00Z",
        category: "Test",
        active: true,
        closed: false,
        events: [], // Empty events array
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockMarket],
      });

      const { trendingMarketsService } = await import("./trendingMarkets.js");
      const result = await trendingMarketsService.getTrendingMarkets();

      // Should fallback to market slug when no events
      expect(result[0].eventSlug).toBe("market-slug-fallback");
    });
  });
});
