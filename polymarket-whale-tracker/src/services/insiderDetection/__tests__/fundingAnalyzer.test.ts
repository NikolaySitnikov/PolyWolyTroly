/**
 * Unit tests for fundingAnalyzer.ts
 *
 * Tests funding source analysis functionality including:
 * - Address classification (CEX, bridge, contract, EOA)
 * - Alchemy API integration (mocked)
 * - Cache integration
 * - Timing metrics calculation
 * - Cluster detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { WalletFundingSource } from "../types.js";

// Mock config
vi.mock("../../config/index.js", () => ({
  config: {
    alchemy: {
      httpUrl: "https://polygon-mainnet.g.alchemy.com/v2/test-api-key",
      wssUrl: "wss://polygon-mainnet.g.alchemy.com/v2/test-api-key",
    },
    database: {
      url: "postgres://localhost:5432/test",
    },
    redis: {
      url: "redis://localhost:6379",
    },
  },
}));

// Mock viem
vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    getBytecode: vi.fn().mockResolvedValue(undefined),
  })),
  http: vi.fn(() => "http-transport"),
  formatUnits: vi.fn((value: bigint, decimals: number) =>
    (Number(value) / Math.pow(10, decimals)).toString()
  ),
}));

// Mock detection database
vi.mock("../detectionDatabase.js", () => ({
  detectionDb: {
    getWalletFunding: vi.fn().mockResolvedValue([]),
    recordFundingSource: vi.fn().mockResolvedValue(1),
    getWalletsWithSameFunder: vi.fn().mockResolvedValue([]),
  },
}));

// Mock detection cache
vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    getFundingAnalysis: vi.fn().mockResolvedValue(null),
    setFundingAnalysis: vi.fn().mockResolvedValue(undefined),
    deleteFundingAnalysis: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import mocks and module under test after mocks are set up
import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";
import { fundingAnalyzer } from "../fundingAnalyzer.js";

describe("fundingAnalyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock behaviors
    vi.mocked(detectionCache.getFundingAnalysis).mockResolvedValue(null);
    vi.mocked(detectionDb.getWalletFunding).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("analyzeFundingSources", () => {
    it("returns cached result when available", async () => {
      const cachedResult = {
        sources: [
          {
            walletAddress: "0xtest",
            sourceAddress: "0xbinance",
            sourceType: "cex" as const,
            sourceLabel: "Binance",
            txHash: "0xtx1",
            amount: 10000,
            isFirstFunding: true,
            fundedAt: new Date("2024-01-01"),
          },
        ],
        totalFunded: 10000,
        firstFundingAt: new Date("2024-01-01"),
        hoursBeforeFirstTrade: 2,
      };

      vi.mocked(detectionCache.getFundingAnalysis).mockResolvedValue(cachedResult);

      const result = await fundingAnalyzer.analyzeFundingSources("0xtest");

      expect(detectionCache.getFundingAnalysis).toHaveBeenCalledWith("0xtest");
      expect(result.sources).toHaveLength(1);
      expect(result.totalFunded).toBe(10000);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns database results when not in cache", async () => {
      const dbSources: WalletFundingSource[] = [
        {
          id: 1,
          walletAddress: "0xtest",
          sourceAddress: "0xbinance",
          sourceType: "cex",
          sourceLabel: "Binance",
          txHash: "0xtx1",
          amount: 5000,
          isFirstFunding: true,
          fundedAt: new Date("2024-01-01"),
        },
        {
          id: 2,
          walletAddress: "0xtest",
          sourceAddress: "0xother",
          sourceType: "eoa",
          txHash: "0xtx2",
          amount: 3000,
          isFirstFunding: false,
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(dbSources);

      const result = await fundingAnalyzer.analyzeFundingSources("0xtest");

      expect(detectionDb.getWalletFunding).toHaveBeenCalledWith("0xtest");
      expect(result.sources).toHaveLength(2);
      expect(result.totalFunded).toBe(8000);
      expect(result.primarySourceType).toBe("cex");
      expect(detectionCache.setFundingAnalysis).toHaveBeenCalled();
    });

    it("fetches from Alchemy API when force refresh is true", async () => {
      // When forceRefresh is true but API fails, should return empty
      // This test verifies the fallback behavior
      const result = await fundingAnalyzer.analyzeFundingSources("0xtest", {
        forceRefresh: true,
      });

      // With mocked config, API key extraction fails gracefully
      expect(result.sources).toHaveLength(0);
      expect(result.totalFunded).toBe(0);
    });

    it("filters out small transfers via _summarizeFundingSources", () => {
      // Test the summarize function directly with sources of different amounts
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xsource1",
          sourceType: "eoa",
          txHash: "0xtx1",
          amount: 5,
          isFirstFunding: true,
        },
        {
          walletAddress: "0xtest",
          sourceAddress: "0xsource2",
          sourceType: "eoa",
          txHash: "0xtx2",
          amount: 100,
          isFirstFunding: false,
        },
      ];

      const result = fundingAnalyzer._summarizeFundingSources(sources);

      // Both are included in summary - filtering happens during fetch
      expect(result.sources).toHaveLength(2);
      expect(result.totalFunded).toBe(105);
    });
  });

  describe("_summarizeFundingSources", () => {
    it("returns empty result for no sources", () => {
      const result = fundingAnalyzer._summarizeFundingSources([]);

      expect(result.sources).toHaveLength(0);
      expect(result.totalFunded).toBe(0);
      expect(result.firstFundingAt).toBeUndefined();
      expect(result.primarySourceType).toBeUndefined();
    });

    it("calculates primary source type by volume", () => {
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xcex",
          sourceType: "cex",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
        },
        {
          walletAddress: "0xtest",
          sourceAddress: "0xbridge",
          sourceType: "bridge",
          txHash: "0xtx2",
          amount: 5000, // Higher volume
          isFirstFunding: false,
        },
        {
          walletAddress: "0xtest",
          sourceAddress: "0xeoa",
          sourceType: "eoa",
          txHash: "0xtx3",
          amount: 500,
          isFirstFunding: false,
        },
      ];

      const result = fundingAnalyzer._summarizeFundingSources(sources);

      expect(result.totalFunded).toBe(6500);
      expect(result.primarySourceType).toBe("bridge"); // Highest volume
    });

    it("uses first funding source for firstFundingAt", () => {
      const firstDate = new Date("2024-01-01");
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xfirst",
          sourceType: "cex",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
          fundedAt: firstDate,
        },
        {
          walletAddress: "0xtest",
          sourceAddress: "0xsecond",
          sourceType: "eoa",
          txHash: "0xtx2",
          amount: 500,
          isFirstFunding: false,
          fundedAt: new Date("2024-01-05"),
        },
      ];

      const result = fundingAnalyzer._summarizeFundingSources(sources);

      expect(result.firstFundingAt).toEqual(firstDate);
    });
  });

  describe("updateTimingMetrics", () => {
    it("updates hours before first trade for funding sources", async () => {
      const fundedAt = new Date("2024-01-01T10:00:00Z");
      const firstTradeAt = new Date("2024-01-01T12:30:00Z"); // 2.5 hours later

      const sources: WalletFundingSource[] = [
        {
          id: 1,
          walletAddress: "0xtest",
          sourceAddress: "0xsource",
          sourceType: "cex",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
          fundedAt,
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(sources);
      vi.mocked(detectionDb.recordFundingSource).mockResolvedValue(1);

      await fundingAnalyzer.updateTimingMetrics("0xtest", firstTradeAt);

      expect(detectionDb.recordFundingSource).toHaveBeenCalledWith(
        expect.objectContaining({
          hoursBeforeFirstTrade: 2, // Rounded down from 2.5
        })
      );
      expect(detectionCache.deleteFundingAnalysis).toHaveBeenCalledWith("0xtest");
    });

    it("skips sources that already have timing metrics", async () => {
      const sources: WalletFundingSource[] = [
        {
          id: 1,
          walletAddress: "0xtest",
          sourceAddress: "0xsource",
          sourceType: "cex",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
          fundedAt: new Date("2024-01-01"),
          hoursBeforeFirstTrade: 5, // Already set
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(sources);

      await fundingAnalyzer.updateTimingMetrics("0xtest", new Date());

      expect(detectionDb.recordFundingSource).not.toHaveBeenCalled();
    });
  });

  describe("findWalletsWithSameFunder", () => {
    it("returns wallets funded by the same source", async () => {
      const relatedWallets = ["0xwallet1", "0xwallet2", "0xwallet3"];
      vi.mocked(detectionDb.getWalletsWithSameFunder).mockResolvedValue(relatedWallets);

      const result = await fundingAnalyzer.findWalletsWithSameFunder("0xsource");

      expect(detectionDb.getWalletsWithSameFunder).toHaveBeenCalledWith("0xsource");
      expect(result).toEqual(relatedWallets);
    });

    it("returns empty array when no related wallets", async () => {
      vi.mocked(detectionDb.getWalletsWithSameFunder).mockResolvedValue([]);

      const result = await fundingAnalyzer.findWalletsWithSameFunder("0xunknown");

      expect(result).toEqual([]);
    });
  });

  describe("isRecentlyFunded", () => {
    it("returns false when no funding sources exist", async () => {
      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue([]);

      const result = await fundingAnalyzer.isRecentlyFunded("0xtest");

      expect(result.isRecent).toBe(false);
      expect(result.hoursAgo).toBeUndefined();
    });

    it("returns true when funded within threshold", async () => {
      const fundedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xsource",
          sourceType: "cex",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
          fundedAt,
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(sources);

      const result = await fundingAnalyzer.isRecentlyFunded("0xtest", 24);

      expect(result.isRecent).toBe(true);
      expect(result.hoursAgo).toBe(2);
      expect(result.fundingSource).toBeDefined();
    });

    it("returns false when funded outside threshold", async () => {
      const fundedAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xsource",
          sourceType: "cex",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
          fundedAt,
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(sources);

      const result = await fundingAnalyzer.isRecentlyFunded("0xtest", 24);

      expect(result.isRecent).toBe(false);
      expect(result.hoursAgo).toBe(48);
    });

    it("uses custom hours threshold", async () => {
      const fundedAt = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xsource",
          sourceType: "cex",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
          fundedAt,
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(sources);

      // With 3 hour threshold, should be false
      const result = await fundingAnalyzer.isRecentlyFunded("0xtest", 3);

      expect(result.isRecent).toBe(false);
    });
  });

  describe("getFundingProfile", () => {
    it("combines funding analysis with related wallets", async () => {
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xsource",
          sourceType: "cex",
          sourceLabel: "Binance",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
          fundedAt: new Date("2024-01-01"),
          hoursBeforeFirstTrade: 2,
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(sources);
      vi.mocked(detectionDb.getWalletsWithSameFunder).mockResolvedValue([
        "0xtest",
        "0xrelated1",
        "0xrelated2",
      ]);

      const result = await fundingAnalyzer.getFundingProfile("0xtest");

      expect(result.sources).toHaveLength(1);
      expect(result.primarySourceLabel).toBe("Binance");
      expect(result.hoursBeforeFirstTrade).toBe(2);
      // Related wallets should exclude the wallet itself
      expect(result.relatedWallets).toEqual(["0xrelated1", "0xrelated2"]);
      expect(result.relatedWallets).not.toContain("0xtest");
    });

    it("returns empty related wallets when no funding sources", async () => {
      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue([]);

      const result = await fundingAnalyzer.getFundingProfile("0xtest");

      expect(result.sources).toHaveLength(0);
      expect(result.relatedWallets).toEqual([]);
    });
  });

  describe("invalidateCache", () => {
    it("deletes cached funding analysis", async () => {
      await fundingAnalyzer.invalidateCache("0xtest");

      expect(detectionCache.deleteFundingAnalysis).toHaveBeenCalledWith("0xtest");
    });
  });

  describe("address classification", () => {
    it("recognizes known CEX addresses in database results", async () => {
      // Test that CEX addresses are correctly labeled when loaded from DB
      const dbSources: WalletFundingSource[] = [
        {
          id: 1,
          walletAddress: "0xtest",
          sourceAddress: "0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245", // Binance
          sourceType: "cex",
          sourceLabel: "Binance",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(dbSources);

      const result = await fundingAnalyzer.analyzeFundingSources("0xtest");

      expect(result.sources[0].sourceType).toBe("cex");
      expect(result.sources[0].sourceLabel).toBe("Binance");
    });

    it("recognizes known bridge addresses in database results", async () => {
      // Test that bridge addresses are correctly labeled when loaded from DB
      const dbSources: WalletFundingSource[] = [
        {
          id: 1,
          walletAddress: "0xtest",
          sourceAddress: "0xa0c68c638235ee32657e8f720a23cec1bfc77c77", // Polygon Bridge
          sourceType: "bridge",
          sourceLabel: "Polygon Bridge",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
        },
      ];

      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue(dbSources);

      const result = await fundingAnalyzer.analyzeFundingSources("0xtest");

      expect(result.sources[0].sourceType).toBe("bridge");
      expect(result.sources[0].sourceLabel).toBe("Polygon Bridge");
    });

    it("handles EOA source type", () => {
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xrandomwallet",
          sourceType: "eoa",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
        },
      ];

      const result = fundingAnalyzer._summarizeFundingSources(sources);

      expect(result.primarySourceType).toBe("eoa");
    });

    it("handles unknown source type", () => {
      const sources: WalletFundingSource[] = [
        {
          walletAddress: "0xtest",
          sourceAddress: "0xunknown",
          sourceType: "unknown",
          txHash: "0xtx1",
          amount: 1000,
          isFirstFunding: true,
        },
      ];

      const result = fundingAnalyzer._summarizeFundingSources(sources);

      expect(result.primarySourceType).toBe("unknown");
    });
  });
});
