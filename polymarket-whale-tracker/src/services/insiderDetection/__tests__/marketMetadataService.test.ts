/**
 * Unit tests for Market Metadata Service
 *
 * Tests the Gamma API integration and market sync functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch before importing the module
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the dependencies
vi.mock("../detectionDatabase.js", () => ({
  detectionDb: {
    upsertMarket: vi.fn().mockResolvedValue(undefined),
    getMarket: vi.fn().mockResolvedValue(null),
    getActiveMarkets: vi.fn().mockResolvedValue([]),
    getMarketsNearResolution: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    getMarket: vi.fn().mockResolvedValue(null),
    setMarket: vi.fn().mockResolvedValue(undefined),
    invalidateMarket: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocking
import { marketMetadataService } from "../marketMetadataService.js";
import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";

// Sample Gamma API response (using actual Gamma API field names - camelCase)
const sampleGammaMarket = {
  conditionId: "0x1234567890abcdef",
  question: "Will Team A win?",
  slug: "team-a-win",
  description: "Prediction market for Team A winning the championship",
  category: "sports",
  marketType: "binary",
  clobTokenIds: '["token_yes_123", "token_no_456"]',
  outcomes: '["Yes", "No"]',
  outcomePrices: '["0.65", "0.35"]',
  endDateIso: "2026-02-01",
  endDate: "2026-02-01T00:00:00Z",
  closed: false,
  resolved: false,
  volumeNum: 100000,
  volume24hr: 5000,
  liquidityNum: 25000,
  active: true,
};

const resolvedGammaMarket = {
  ...sampleGammaMarket,
  closed: true,
  resolved: true,
  outcomePrices: '["1.0", "0.0"]',  // YES won
};

describe("marketMetadataService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    // Stop background sync if running
    marketMetadataService.stopBackgroundSync();
  });

  describe("syncActiveMarkets", () => {
    it("should fetch and sync active markets from Gamma API", async () => {
      // Mock API response with active markets
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([sampleGammaMarket]),
      });

      // Mock empty second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const synced = await marketMetadataService.syncActiveMarkets();

      expect(synced).toBe(1);
      expect(mockFetch).toHaveBeenCalled();
      expect(detectionDb.upsertMarket).toHaveBeenCalledTimes(1);

      // Check the upserted market data
      const upsertCall = vi.mocked(detectionDb.upsertMarket).mock.calls[0][0];
      expect(upsertCall.conditionId).toBe("0x1234567890abcdef");
      expect(upsertCall.question).toBe("Will Team A win?");
      expect(upsertCall.slug).toBe("team-a-win");
      expect(upsertCall.outcomeYesTokenId).toBe("token_yes_123");
      expect(upsertCall.outcomeNoTokenId).toBe("token_no_456");
    });

    it("should handle pagination for many markets", async () => {
      // Create 150 mock markets (requires 2 pages)
      const page1 = Array(100).fill(null).map((_, i) => ({
        ...sampleGammaMarket,
        condition_id: `condition_${i}`,
      }));
      const page2 = Array(50).fill(null).map((_, i) => ({
        ...sampleGammaMarket,
        condition_id: `condition_${100 + i}`,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      const synced = await marketMetadataService.syncActiveMarkets();

      expect(synced).toBe(150);
      expect(detectionDb.upsertMarket).toHaveBeenCalledTimes(150);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const synced = await marketMetadataService.syncActiveMarkets();

      expect(synced).toBe(0);
    });

    it("should track sync status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([sampleGammaMarket]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await marketMetadataService.syncActiveMarkets();

      const status = marketMetadataService.getStatus();
      expect(status.totalSynced).toBeGreaterThan(0);
      expect(status.lastSyncAt).not.toBeNull();
      // Duration can be 0ms in fast tests, so just check it's a number
      expect(typeof status.lastSyncDuration).toBe("number");
    });
  });

  describe("checkResolutions", () => {
    it("should detect newly resolved markets", async () => {
      // Mock unresolved market in our DB
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValueOnce([
        {
          conditionId: "0x1234567890abcdef",
          question: "Will Team A win?",
          slug: "team-a-win",
          volume24h: 5000,
          volumeTotal: 100000,
          liquidity: 25000,
          firstSeenAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      ]);

      // Mock resolved market from API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([resolvedGammaMarket]),
      });

      const resolutions = await marketMetadataService.checkResolutions();

      expect(resolutions).toBe(1);
      expect(detectionDb.upsertMarket).toHaveBeenCalled();
      expect(detectionCache.invalidateMarket).toHaveBeenCalledWith("0x1234567890abcdef");
    });

    it("should not update markets that haven't resolved", async () => {
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValueOnce([
        {
          conditionId: "0x1234567890abcdef",
          question: "Will Team A win?",
          slug: "team-a-win",
          volume24h: 5000,
          volumeTotal: 100000,
          liquidity: 25000,
          firstSeenAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      ]);

      // Return unresolved market
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([sampleGammaMarket]),
      });

      const resolutions = await marketMetadataService.checkResolutions();

      expect(resolutions).toBe(0);
      expect(detectionDb.upsertMarket).not.toHaveBeenCalled();
    });
  });

  describe("getMarket", () => {
    it("should return cached market if available", async () => {
      const cachedMarket = {
        conditionId: "0x1234567890abcdef",
        question: "Will Team A win?",
        slug: "team-a-win",
        volume24h: 5000,
        volumeTotal: 100000,
        liquidity: 25000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      vi.mocked(detectionCache.getMarket).mockResolvedValueOnce(cachedMarket);

      const market = await marketMetadataService.getMarket("0x1234567890abcdef");

      expect(market).toEqual(cachedMarket);
      expect(detectionDb.getMarket).not.toHaveBeenCalled();
    });

    it("should fetch from DB if not cached", async () => {
      const dbMarket = {
        conditionId: "0x1234567890abcdef",
        question: "Will Team A win?",
        slug: "team-a-win",
        volume24h: 5000,
        volumeTotal: 100000,
        liquidity: 25000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      vi.mocked(detectionCache.getMarket).mockResolvedValueOnce(null);
      vi.mocked(detectionDb.getMarket).mockResolvedValueOnce(dbMarket);

      const market = await marketMetadataService.getMarket("0x1234567890abcdef");

      expect(market).toEqual(dbMarket);
      expect(detectionCache.setMarket).toHaveBeenCalled();
    });

    it("should fetch from API if not in DB", async () => {
      vi.mocked(detectionCache.getMarket).mockResolvedValueOnce(null);
      vi.mocked(detectionDb.getMarket)
        .mockResolvedValueOnce(null) // First call - not in DB
        .mockResolvedValueOnce({     // Second call - after upsert
          conditionId: "0x1234567890abcdef",
          question: "Will Team A win?",
          slug: "team-a-win",
          volume24h: 5000,
          volumeTotal: 100000,
          liquidity: 25000,
          firstSeenAt: new Date(),
          lastUpdatedAt: new Date(),
        });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([sampleGammaMarket]),
      });

      const market = await marketMetadataService.getMarket("0x1234567890abcdef");

      expect(market).not.toBeNull();
      expect(mockFetch).toHaveBeenCalled();
      expect(detectionDb.upsertMarket).toHaveBeenCalled();
    });
  });

  describe("backgroundSync", () => {
    it("should start and stop background sync", () => {
      marketMetadataService.startBackgroundSync();

      let status = marketMetadataService.getStatus();
      expect(status.isRunning).toBe(true);

      marketMetadataService.stopBackgroundSync();

      status = marketMetadataService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it("should not start multiple background syncs", () => {
      marketMetadataService.startBackgroundSync();
      marketMetadataService.startBackgroundSync(); // Should be no-op

      const status = marketMetadataService.getStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe("warmCache", () => {
    it("should sync markets and check resolutions on warm", async () => {
      // Mock empty responses for sync
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([]);

      await marketMetadataService.warmCache();

      // Verify sync was attempted
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("triggerSync", () => {
    it("should return sync results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([sampleGammaMarket]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValueOnce([]);

      const result = await marketMetadataService.triggerSync();

      expect(result).toHaveProperty("marketsUpdated");
      expect(result).toHaveProperty("resolutionsFound");
      expect(result.marketsUpdated).toBe(1);
    });
  });

  describe("resolution outcome extraction", () => {
    it("should correctly extract YES outcome", async () => {
      const yesWinnerMarket = {
        ...sampleGammaMarket,
        resolved: true,
        closed: true,
        outcomePrices: '["1.0", "0.0"]',  // YES won (price = 1)
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([yesWinnerMarket]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await marketMetadataService.syncActiveMarkets();

      const upsertCall = vi.mocked(detectionDb.upsertMarket).mock.calls[0][0];
      expect(upsertCall.resolutionOutcome).toBe("YES");
    });

    it("should correctly extract NO outcome", async () => {
      const noWinnerMarket = {
        ...sampleGammaMarket,
        resolved: true,
        closed: true,
        outcomePrices: '["0.0", "1.0"]',  // NO won (second price = 1)
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([noWinnerMarket]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await marketMetadataService.syncActiveMarkets();

      const upsertCall = vi.mocked(detectionDb.upsertMarket).mock.calls[0][0];
      expect(upsertCall.resolutionOutcome).toBe("NO");
    });
  });
});
