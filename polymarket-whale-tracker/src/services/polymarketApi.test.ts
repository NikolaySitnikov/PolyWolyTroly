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
});
