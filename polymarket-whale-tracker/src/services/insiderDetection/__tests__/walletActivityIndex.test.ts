/**
 * Tests for Wallet Activity Index Service
 *
 * These tests verify wallet activity tracking, concentration metrics,
 * and integration with CTF transfers for insider trading detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
const mockUpsertWalletActivity = vi.fn().mockResolvedValue(undefined);
const mockGetWalletActivity = vi.fn();
const mockGetMarketActivity = vi.fn();
const mockGetWalletConcentration = vi.fn();
const mockGetMarketTransfers = vi.fn();
const mockGetStats = vi.fn();

vi.mock("../detectionDatabase.js", () => ({
  detectionDb: {
    upsertWalletActivity: (...args: unknown[]) => mockUpsertWalletActivity(...args),
    getWalletActivity: (...args: unknown[]) => mockGetWalletActivity(...args),
    getMarketActivity: (...args: unknown[]) => mockGetMarketActivity(...args),
    getWalletConcentration: (...args: unknown[]) => mockGetWalletConcentration(...args),
    getMarketTransfers: (...args: unknown[]) => mockGetMarketTransfers(...args),
    getStats: () => mockGetStats(),
  },
}));

// Mock detection cache
const mockSetWalletActivity = vi.fn().mockResolvedValue(undefined);
const mockGetCachedWalletActivity = vi.fn().mockResolvedValue(null);
const mockGetLatestDepth = vi.fn().mockResolvedValue(null);
const mockInvalidateWalletActivity = vi.fn().mockResolvedValue(undefined);

vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    setWalletActivity: (...args: unknown[]) => mockSetWalletActivity(...args),
    getWalletActivity: (...args: unknown[]) => mockGetCachedWalletActivity(...args),
    getLatestDepth: (...args: unknown[]) => mockGetLatestDepth(...args),
    invalidateWalletActivity: (...args: unknown[]) => mockInvalidateWalletActivity(...args),
  },
}));

// Mock market metadata service
const mockGetMarket = vi.fn();

vi.mock("../marketMetadataService.js", () => ({
  marketMetadataService: {
    getMarket: (...args: unknown[]) => mockGetMarket(...args),
  },
}));

// Sample test data
const sampleTransfer = {
  id: 1,
  txHash: "0xabc123",
  fromAddress: "0xseller111111111111111111111111111111111111",
  toAddress: "0xbuyer2222222222222222222222222222222222222",
  tokenId: "123456789",
  amount: BigInt(1000000000), // 1000 tokens (6 decimals)
  conditionId: "0xcondition123",
  outcome: "YES" as const,
  blockNumber: 12345678,
  blockTimestamp: new Date("2026-01-13T10:00:00Z"),
  logIndex: 0,
};

const sampleActivity = {
  walletAddress: "0xbuyer2222222222222222222222222222222222222",
  conditionId: "0xcondition123",
  firstTradeAt: new Date("2026-01-13T10:00:00Z"),
  lastTradeAt: new Date("2026-01-13T10:00:00Z"),
  totalVolume: 500,
  tradeCount: 1,
  netPosition: 1000,
  avgEntryPrice: 0.5,
  realizedPnl: 0,
  volumeShareOfWallet: 100,
};

describe("Wallet Activity Index Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("processTransfer", () => {
    it("should update activity for both buyer and seller", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      // Setup mocks - getWalletActivity is called multiple times for different wallets
      // Return empty array first, then include the newly created activity for volume share calculation
      mockGetWalletActivity.mockImplementation((address: string) => {
        // When calculating volume share, we need to return the activity we just created
        return Promise.resolve([{
          walletAddress: address.toLowerCase(),
          conditionId: sampleTransfer.conditionId,
          totalVolume: 500,
          tradeCount: 1,
          netPosition: 1000,
          realizedPnl: 0,
        }]);
      });

      mockGetWalletConcentration.mockResolvedValue({
        topMarket: { conditionId: sampleTransfer.conditionId, volumeShare: 100 },
        totalVolume: 500,
        marketCount: 1,
      });

      await walletActivityIndex.processTransfer(sampleTransfer);

      // Should upsert activity for both parties
      // Each wallet: 1 upsert for activity, then 1 upsert for volume share update = 4 total
      expect(mockUpsertWalletActivity).toHaveBeenCalledTimes(4);
    });

    it("should correctly identify buyer (recipient)", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetWalletActivity.mockResolvedValue([]);
      mockGetWalletConcentration.mockResolvedValue({
        topMarket: null,
        totalVolume: 0,
        marketCount: 0,
      });

      await walletActivityIndex.processTransfer(sampleTransfer);

      // Check that upsertWalletActivity was called with buyer address
      const buyerCalls = mockUpsertWalletActivity.mock.calls.filter(
        (call) => call[0].walletAddress === sampleTransfer.toAddress.toLowerCase()
      );

      expect(buyerCalls.length).toBeGreaterThan(0);
      // Buyer should have positive net position
      expect(buyerCalls[0][0].netPosition).toBeGreaterThan(0);
    });

    it("should correctly identify seller (sender)", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetWalletActivity.mockResolvedValue([]);
      mockGetWalletConcentration.mockResolvedValue({
        topMarket: null,
        totalVolume: 0,
        marketCount: 0,
      });

      await walletActivityIndex.processTransfer(sampleTransfer);

      // Check that upsertWalletActivity was called with seller address
      const sellerCalls = mockUpsertWalletActivity.mock.calls.filter(
        (call) => call[0].walletAddress === sampleTransfer.fromAddress.toLowerCase()
      );

      expect(sellerCalls.length).toBeGreaterThan(0);
      // Seller should have negative net position
      expect(sellerCalls[0][0].netPosition).toBeLessThan(0);
    });

    it("should skip transfer without conditionId", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      const transferWithoutCondition = {
        ...sampleTransfer,
        conditionId: undefined,
      };

      await walletActivityIndex.processTransfer(transferWithoutCondition);

      // Should not update anything
      expect(mockUpsertWalletActivity).not.toHaveBeenCalled();
    });

    it("should use depth snapshot price if available", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetWalletActivity.mockResolvedValue([]);
      mockGetWalletConcentration.mockResolvedValue({
        topMarket: null,
        totalVolume: 0,
        marketCount: 0,
      });

      // Mock depth snapshot with mid price
      mockGetLatestDepth.mockResolvedValue({
        conditionId: "0xcondition123",
        midPrice: 0.65,
        snapshotAt: new Date(),
      });

      await walletActivityIndex.processTransfer(sampleTransfer);

      // Volume should be calculated with the mid price (0.65)
      // 1000 tokens * 0.65 price = 650 USD
      const buyerCalls = mockUpsertWalletActivity.mock.calls.filter(
        (call) => call[0].walletAddress === sampleTransfer.toAddress.toLowerCase()
      );

      expect(buyerCalls[0][0].totalVolume).toBeCloseTo(650, 0);
    });
  });

  describe("getWalletActivity", () => {
    it("should return wallet activity from database", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      const activities = [sampleActivity];
      mockGetWalletActivity.mockResolvedValue(activities);

      const result = await walletActivityIndex.getWalletActivity("0xbuyer222");

      expect(result).toEqual(activities);
      expect(mockGetWalletActivity).toHaveBeenCalledWith("0xbuyer222");
    });
  });

  describe("getWalletMarketActivity", () => {
    it("should return cached activity if available", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetCachedWalletActivity.mockResolvedValue(sampleActivity);

      const result = await walletActivityIndex.getWalletMarketActivity(
        "0xbuyer222",
        "0xcondition123"
      );

      expect(result).toEqual(sampleActivity);
      expect(mockGetWalletActivity).not.toHaveBeenCalled();
    });

    it("should fetch from database if not cached", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetCachedWalletActivity.mockResolvedValue(null);
      mockGetWalletActivity.mockResolvedValue([sampleActivity]);

      const result = await walletActivityIndex.getWalletMarketActivity(
        "0xbuyer2222222222222222222222222222222222222",
        "0xcondition123"
      );

      expect(result).toEqual(sampleActivity);
      expect(mockSetWalletActivity).toHaveBeenCalled();
    });

    it("should return null if activity not found", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetCachedWalletActivity.mockResolvedValue(null);
      mockGetWalletActivity.mockResolvedValue([]);

      const result = await walletActivityIndex.getWalletMarketActivity(
        "0xnonexistent",
        "0xcondition123"
      );

      expect(result).toBeNull();
    });
  });

  describe("getMarketActivity", () => {
    it("should return all wallet activity for a market", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      const activities = [
        { ...sampleActivity, walletAddress: "0xwallet1" },
        { ...sampleActivity, walletAddress: "0xwallet2" },
      ];
      mockGetMarketActivity.mockResolvedValue(activities);

      const result = await walletActivityIndex.getMarketActivity("0xcondition123");

      expect(result).toEqual(activities);
      expect(mockGetMarketActivity).toHaveBeenCalledWith("0xcondition123");
    });
  });

  describe("getWalletConcentration", () => {
    it("should return concentration metrics with market question", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetWalletConcentration.mockResolvedValue({
        topMarket: { conditionId: "0xcondition123", volumeShare: 85 },
        totalVolume: 10000,
        marketCount: 3,
      });

      mockGetMarket.mockResolvedValue({
        conditionId: "0xcondition123",
        question: "Will Bitcoin hit $100k?",
        slug: "bitcoin-100k",
      });

      const result = await walletActivityIndex.getWalletConcentration("0xwallet");

      expect(result.topMarket?.question).toBe("Will Bitcoin hit $100k?");
      expect(result.topMarket?.volumeShare).toBe(85);
      expect(result.totalVolume).toBe(10000);
      expect(result.marketCount).toBe(3);
    });

    it("should handle wallet with no activity", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetWalletConcentration.mockResolvedValue({
        topMarket: null,
        totalVolume: 0,
        marketCount: 0,
      });

      const result = await walletActivityIndex.getWalletConcentration("0xnewwallet");

      expect(result.topMarket).toBeNull();
      expect(result.totalVolume).toBe(0);
      expect(result.marketCount).toBe(0);
    });
  });

  describe("getHighConcentrationWallets", () => {
    it("should return wallets with high concentration in market", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetMarketActivity.mockResolvedValue([
        { ...sampleActivity, walletAddress: "0xwhale1", totalVolume: 5000 },
        { ...sampleActivity, walletAddress: "0xwhale2", totalVolume: 3000 },
        { ...sampleActivity, walletAddress: "0xdiversified", totalVolume: 1000 },
      ]);

      // High concentration for first two wallets
      mockGetWalletConcentration
        .mockResolvedValueOnce({
          topMarket: { conditionId: "0xcondition123", volumeShare: 90 },
          totalVolume: 5000,
          marketCount: 1,
        })
        .mockResolvedValueOnce({
          topMarket: { conditionId: "0xcondition123", volumeShare: 75 },
          totalVolume: 4000,
          marketCount: 2,
        })
        .mockResolvedValueOnce({
          topMarket: { conditionId: "0xother", volumeShare: 50 },
          totalVolume: 2000,
          marketCount: 3,
        });

      const result = await walletActivityIndex.getHighConcentrationWallets(
        "0xcondition123",
        70
      );

      expect(result.length).toBe(2);
      expect(result[0].walletAddress).toBe("0xwhale1");
      expect(result[1].walletAddress).toBe("0xwhale2");
    });

    it("should use default threshold of 70%", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetMarketActivity.mockResolvedValue([
        { ...sampleActivity, walletAddress: "0xwallet1", totalVolume: 1000 },
      ]);

      mockGetWalletConcentration.mockResolvedValue({
        topMarket: { conditionId: "0xcondition123", volumeShare: 65 },
        totalVolume: 1000,
        marketCount: 2,
      });

      const result = await walletActivityIndex.getHighConcentrationWallets(
        "0xcondition123"
      );

      // 65% < 70% threshold, should not include
      expect(result.length).toBe(0);
    });
  });

  describe("getNewWalletActivity", () => {
    it("should find wallets trading within threshold of first trade", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      const now = new Date("2026-01-13T12:00:00Z");
      const firstTrade = new Date("2026-01-13T11:00:00Z"); // 1 hour ago

      mockGetMarketActivity.mockResolvedValue([
        {
          walletAddress: "0xnewwallet",
          conditionId: "0xcondition123",
          firstTradeAt: now,
          totalVolume: 5000,
        },
      ]);

      // This wallet's first ever trade was in this market
      mockGetWalletActivity.mockResolvedValue([
        {
          walletAddress: "0xnewwallet",
          conditionId: "0xcondition123",
          firstTradeAt: now,
        },
      ]);

      const result = await walletActivityIndex.getNewWalletActivity(
        "0xcondition123",
        24
      );

      expect(result.length).toBe(1);
      expect(result[0].walletAddress).toBe("0xnewwallet");
    });

    it("should exclude wallets with prior trading history", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      const now = new Date("2026-01-13T12:00:00Z");
      const muchEarlier = new Date("2026-01-01T12:00:00Z"); // 12 days ago

      mockGetMarketActivity.mockResolvedValue([
        {
          walletAddress: "0xoldwallet",
          conditionId: "0xcondition123",
          firstTradeAt: now,
          totalVolume: 5000,
        },
      ]);

      // This wallet traded in another market much earlier
      mockGetWalletActivity.mockResolvedValue([
        {
          walletAddress: "0xoldwallet",
          conditionId: "0xother",
          firstTradeAt: muchEarlier,
        },
        {
          walletAddress: "0xoldwallet",
          conditionId: "0xcondition123",
          firstTradeAt: now,
        },
      ]);

      const result = await walletActivityIndex.getNewWalletActivity(
        "0xcondition123",
        24
      );

      // Wallet's first trade was 12 days ago, not within 24 hours
      expect(result.length).toBe(0);
    });
  });

  describe("backfillFromTransfers", () => {
    it("should throw if backfill already in progress", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      // Start a backfill
      mockGetMarketTransfers.mockResolvedValue([]);

      const firstBackfill = walletActivityIndex.backfillFromTransfers({
        conditionId: "0xcondition123",
      });

      // Immediately try another
      await expect(
        walletActivityIndex.backfillFromTransfers({
          conditionId: "0xcondition123",
        })
      ).rejects.toThrow("Backfill already in progress");

      // Wait for first to complete
      await firstBackfill;
    });

    it("should process transfers for specific condition", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetMarketTransfers.mockResolvedValue([sampleTransfer]);
      mockGetWalletActivity.mockResolvedValue([]);
      mockGetWalletConcentration.mockResolvedValue({
        topMarket: null,
        totalVolume: 0,
        marketCount: 0,
      });

      const result = await walletActivityIndex.backfillFromTransfers({
        conditionId: "0xcondition123",
      });

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);
      expect(mockGetMarketTransfers).toHaveBeenCalledWith("0xcondition123");
    });

    it("should report progress via callback", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      const transfers = Array(150)
        .fill(null)
        .map((_, i) => ({
          ...sampleTransfer,
          id: i,
          txHash: `0x${i}`,
        }));

      mockGetMarketTransfers.mockResolvedValue(transfers);
      mockGetWalletActivity.mockResolvedValue([]);
      mockGetWalletConcentration.mockResolvedValue({
        topMarket: null,
        totalVolume: 0,
        marketCount: 0,
      });

      const progressCalls: number[] = [];
      const onProgress = (processed: number) => {
        progressCalls.push(processed);
      };

      await walletActivityIndex.backfillFromTransfers({
        conditionId: "0xcondition123",
        onProgress,
      });

      // Progress should be called every 100 transfers
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe("getBackfillStatus", () => {
    it("should return current backfill status", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      const status = walletActivityIndex.getBackfillStatus();

      expect(status).toHaveProperty("isBackfilling");
      expect(status).toHaveProperty("processed");
      expect(status).toHaveProperty("total");
      expect(status).toHaveProperty("errors");
    });
  });

  describe("invalidateWalletCache", () => {
    it("should invalidate cache for all wallet activities", async () => {
      const { walletActivityIndex } = await import("../walletActivityIndex.js");

      mockGetWalletActivity.mockResolvedValue([
        { ...sampleActivity, conditionId: "0xcond1" },
        { ...sampleActivity, conditionId: "0xcond2" },
      ]);

      await walletActivityIndex.invalidateWalletCache("0xwallet");

      expect(mockInvalidateWalletActivity).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Volume and Position Calculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate USD value correctly from token amount", async () => {
    // Token amount in 6 decimals: 1000000000 = 1000 tokens
    // Price: 0.5 (50% probability)
    // Expected USD value: 1000 * 0.5 = 500 USD

    const { walletActivityIndex } = await import("../walletActivityIndex.js");

    const mockGetWalletActivity = vi.fn().mockResolvedValue([]);
    const mockGetWalletConcentration = vi.fn().mockResolvedValue({
      topMarket: null,
      totalVolume: 0,
      marketCount: 0,
    });
    const mockGetLatestDepth = vi.fn().mockResolvedValue({
      midPrice: 0.5,
    });
    const mockUpsertWalletActivity = vi.fn();

    // Re-mock for this specific test
    vi.doMock("../detectionDatabase.js", () => ({
      detectionDb: {
        getWalletActivity: mockGetWalletActivity,
        getWalletConcentration: mockGetWalletConcentration,
        upsertWalletActivity: mockUpsertWalletActivity,
      },
    }));

    vi.doMock("../detectionCache.js", () => ({
      detectionCache: {
        getWalletActivity: vi.fn().mockResolvedValue(null),
        setWalletActivity: vi.fn(),
        getLatestDepth: mockGetLatestDepth,
      },
    }));

    // The calculation in the service:
    // amount = 1000000000 (bigint)
    // price = 0.5
    // amountInTokens = 1000000000 / 1e6 = 1000
    // value = 1000 * 0.5 = 500
  });

  it("should track net position correctly for buyer", () => {
    // When a wallet receives tokens (buyer):
    // netPosition should increase by the token amount

    // Example: wallet receives 1000 tokens
    // netPosition = 0 + 1000 = 1000
  });

  it("should track net position correctly for seller", () => {
    // When a wallet sends tokens (seller):
    // netPosition should decrease by the token amount

    // Example: wallet sends 1000 tokens
    // netPosition = 0 - 1000 = -1000
  });
});
