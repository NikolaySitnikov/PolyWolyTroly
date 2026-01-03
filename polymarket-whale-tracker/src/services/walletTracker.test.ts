import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock functions
const mockWalletExists = vi.fn();
const mockCreateWallet = vi.fn();
const mockRecordDeposit = vi.fn();
const mockIsWalletSeen = vi.fn();
const mockMarkWalletSeen = vi.fn();
const mockHasHistoricalActivity = vi.fn();

// Mock the database module
vi.mock("./database.js", () => ({
  db: {
    walletExists: mockWalletExists,
    createWallet: mockCreateWallet,
    recordDeposit: mockRecordDeposit,
  },
}));

// Mock the cache module
vi.mock("./cache.js", () => ({
  cache: {
    isWalletSeen: mockIsWalletSeen,
    markWalletSeen: mockMarkWalletSeen,
  },
}));

// Mock the polymarketApi module
vi.mock("./polymarketApi.js", () => ({
  polymarketApi: {
    hasHistoricalActivity: mockHasHistoricalActivity,
  },
}));

describe("walletTracker service", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockWalletExists.mockReset();
    mockCreateWallet.mockReset();
    mockRecordDeposit.mockReset();
    mockIsWalletSeen.mockReset();
    mockMarkWalletSeen.mockReset();
    mockHasHistoricalActivity.mockReset();
  });

  describe("isNewWallet", () => {
    it("should return false if wallet is in cache", async () => {
      mockIsWalletSeen.mockResolvedValue(true);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.isNewWallet("0x1234");

      expect(result).toBe(false);
      expect(mockIsWalletSeen).toHaveBeenCalledWith("0x1234");
      expect(mockWalletExists).not.toHaveBeenCalled();
      expect(mockHasHistoricalActivity).not.toHaveBeenCalled();
    });

    it("should return false and update cache if wallet exists in database but not cache", async () => {
      mockIsWalletSeen.mockResolvedValue(false);
      mockWalletExists.mockResolvedValue(true);
      mockMarkWalletSeen.mockResolvedValue(undefined);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.isNewWallet("0x5678");

      expect(result).toBe(false);
      expect(mockIsWalletSeen).toHaveBeenCalledWith("0x5678");
      expect(mockWalletExists).toHaveBeenCalledWith("0x5678");
      expect(mockMarkWalletSeen).toHaveBeenCalledWith("0x5678");
      expect(mockHasHistoricalActivity).not.toHaveBeenCalled();
    });

    it("should return false if wallet has historical activity on Polymarket API", async () => {
      mockIsWalletSeen.mockResolvedValue(false);
      mockWalletExists.mockResolvedValue(false);
      mockHasHistoricalActivity.mockResolvedValue(true);
      mockMarkWalletSeen.mockResolvedValue(undefined);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.isNewWallet("0xhistory");

      expect(result).toBe(false);
      expect(mockHasHistoricalActivity).toHaveBeenCalledWith("0xhistory");
      expect(mockMarkWalletSeen).toHaveBeenCalledWith("0xhistory");
    });

    it("should return true only if wallet is not in cache, database, or Polymarket history", async () => {
      mockIsWalletSeen.mockResolvedValue(false);
      mockWalletExists.mockResolvedValue(false);
      mockHasHistoricalActivity.mockResolvedValue(false);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.isNewWallet("0xnew");

      expect(result).toBe(true);
      expect(mockIsWalletSeen).toHaveBeenCalledWith("0xnew");
      expect(mockWalletExists).toHaveBeenCalledWith("0xnew");
      expect(mockHasHistoricalActivity).toHaveBeenCalledWith("0xnew");
      expect(mockMarkWalletSeen).not.toHaveBeenCalled();
    });

    it("should use cache as fast path without database or API lookup when wallet is cached", async () => {
      mockIsWalletSeen.mockResolvedValue(true);

      const { walletTracker } = await import("./walletTracker.js");
      await walletTracker.isNewWallet("0xfast");

      expect(mockIsWalletSeen).toHaveBeenCalledTimes(1);
      expect(mockWalletExists).not.toHaveBeenCalled();
      expect(mockHasHistoricalActivity).not.toHaveBeenCalled();
    });

    it("should skip Polymarket API if wallet found in database", async () => {
      mockIsWalletSeen.mockResolvedValue(false);
      mockWalletExists.mockResolvedValue(true);
      mockMarkWalletSeen.mockResolvedValue(undefined);

      const { walletTracker } = await import("./walletTracker.js");
      await walletTracker.isNewWallet("0xdbwallet");

      expect(mockHasHistoricalActivity).not.toHaveBeenCalled();
    });
  });

  describe("recordNewWallet", () => {
    it("should create wallet in database and mark as seen in cache", async () => {
      mockCreateWallet.mockResolvedValue(undefined);
      mockMarkWalletSeen.mockResolvedValue(undefined);

      const { walletTracker } = await import("./walletTracker.js");
      await walletTracker.recordNewWallet("0xnew", 50000, "0xtxhash");

      expect(mockCreateWallet).toHaveBeenCalledWith("0xnew", 50000, "0xtxhash");
      expect(mockMarkWalletSeen).toHaveBeenCalledWith("0xnew");
    });

    it("should call database before cache", async () => {
      const callOrder: string[] = [];
      mockCreateWallet.mockImplementation(async () => {
        callOrder.push("database");
      });
      mockMarkWalletSeen.mockImplementation(async () => {
        callOrder.push("cache");
      });

      const { walletTracker } = await import("./walletTracker.js");
      await walletTracker.recordNewWallet("0xorder", 100, "0xtx");

      expect(callOrder).toEqual(["database", "cache"]);
    });
  });

  describe("processDeposit", () => {
    const testAddress = "0xprocess";
    const testAmount = 75000;
    const testTxHash = "0xprocesstx";
    const testBlockNumber = BigInt(12345678);

    it("should record new wallet and deposit when wallet is new (not in cache, db, or Polymarket)", async () => {
      mockIsWalletSeen.mockResolvedValue(false);
      mockWalletExists.mockResolvedValue(false);
      mockHasHistoricalActivity.mockResolvedValue(false);
      mockCreateWallet.mockResolvedValue(undefined);
      mockMarkWalletSeen.mockResolvedValue(undefined);
      mockRecordDeposit.mockResolvedValue(42);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.processDeposit(
        testAddress,
        testAmount,
        testTxHash,
        testBlockNumber
      );

      expect(result).toEqual({ isNew: true, depositId: 42 });
      expect(mockCreateWallet).toHaveBeenCalledWith(testAddress, testAmount, testTxHash);
      expect(mockRecordDeposit).toHaveBeenCalledWith(
        testTxHash,
        testAddress,
        testAmount,
        testBlockNumber
      );
    });

    it("should not record as new when wallet has Polymarket history but still create wallet in DB", async () => {
      mockIsWalletSeen.mockResolvedValue(false);
      mockWalletExists.mockResolvedValue(false); // Not in our DB yet
      mockHasHistoricalActivity.mockResolvedValue(true); // But has Polymarket history
      mockMarkWalletSeen.mockResolvedValue(undefined);
      mockCreateWallet.mockResolvedValue(undefined);
      mockRecordDeposit.mockResolvedValue(55);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.processDeposit(
        testAddress,
        testAmount,
        testTxHash,
        testBlockNumber
      );

      expect(result).toEqual({ isNew: false, depositId: 55 });
      // Wallet should be created in DB even though it's not "new" to Polymarket
      expect(mockCreateWallet).toHaveBeenCalledWith(testAddress, testAmount, testTxHash);
    });

    it("should only record deposit when wallet exists in cache and database", async () => {
      mockIsWalletSeen.mockResolvedValue(true);
      mockWalletExists.mockResolvedValue(true); // Already in DB
      mockRecordDeposit.mockResolvedValue(99);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.processDeposit(
        testAddress,
        testAmount,
        testTxHash,
        testBlockNumber
      );

      expect(result).toEqual({ isNew: false, depositId: 99 });
      expect(mockCreateWallet).not.toHaveBeenCalled();
      expect(mockRecordDeposit).toHaveBeenCalledWith(
        testTxHash,
        testAddress,
        testAmount,
        testBlockNumber
      );
    });

    it("should only record deposit when wallet exists in database", async () => {
      mockIsWalletSeen.mockResolvedValue(false);
      mockWalletExists.mockResolvedValue(true);
      mockMarkWalletSeen.mockResolvedValue(undefined);
      mockRecordDeposit.mockResolvedValue(77);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.processDeposit(
        testAddress,
        testAmount,
        testTxHash,
        testBlockNumber
      );

      expect(result).toEqual({ isNew: false, depositId: 77 });
      expect(mockCreateWallet).not.toHaveBeenCalled();
      expect(mockRecordDeposit).toHaveBeenCalled();
    });

    it("should return null depositId when deposit is duplicate", async () => {
      mockIsWalletSeen.mockResolvedValue(true);
      mockRecordDeposit.mockResolvedValue(null);

      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.processDeposit(
        testAddress,
        testAmount,
        testTxHash,
        testBlockNumber
      );

      expect(result).toEqual({ isNew: false, depositId: null });
    });

    it("should handle large deposit amounts", async () => {
      mockIsWalletSeen.mockResolvedValue(false);
      mockWalletExists.mockResolvedValue(false);
      mockHasHistoricalActivity.mockResolvedValue(false);
      mockCreateWallet.mockResolvedValue(undefined);
      mockMarkWalletSeen.mockResolvedValue(undefined);
      mockRecordDeposit.mockResolvedValue(1);

      const largeAmount = 10000000; // 10 million
      const { walletTracker } = await import("./walletTracker.js");
      const result = await walletTracker.processDeposit(
        testAddress,
        largeAmount,
        testTxHash,
        testBlockNumber
      );

      expect(result.isNew).toBe(true);
      expect(mockCreateWallet).toHaveBeenCalledWith(testAddress, largeAmount, testTxHash);
    });

    it("should handle very large block numbers", async () => {
      mockIsWalletSeen.mockResolvedValue(true);
      mockRecordDeposit.mockResolvedValue(1);

      const largeBlockNumber = BigInt("999999999999999");
      const { walletTracker } = await import("./walletTracker.js");
      await walletTracker.processDeposit(
        testAddress,
        testAmount,
        testTxHash,
        largeBlockNumber
      );

      expect(mockRecordDeposit).toHaveBeenCalledWith(
        testTxHash,
        testAddress,
        testAmount,
        largeBlockNumber
      );
    });
  });
});
