/**
 * Historical Deposits Service Tests
 *
 * Tests for fetching historical USDC deposit data via RPC.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to create mocks that are available during module loading
const mocks = vi.hoisted(() => ({
  getBlockNumber: vi.fn(),
  getLogs: vi.fn(),
  getBlock: vi.fn(),
}));

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: () => ({
      getBlockNumber: mocks.getBlockNumber,
      getLogs: mocks.getLogs,
      getBlock: mocks.getBlock,
    }),
  };
});

// Mock config
vi.mock("../config/index.js", () => ({
  config: {
    alchemy: {
      httpUrl: "https://polygon-rpc.test",
    },
  },
}));

// Import after mocks are set up
import { historicalDeposits } from "./historicalDeposits.js";

describe("historicalDeposits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHistoricalDeposits", () => {
    const testAddress = "0x1234567890123456789012345678901234567890";

    it("should fetch historical USDC transfers to Polymarket for a wallet", async () => {
      mocks.getBlockNumber.mockResolvedValue(25010000n); // Just above POLYMARKET_START_BLOCK

      // Mock logs response - single call since range is small
      mocks.getLogs.mockResolvedValue([
        {
          transactionHash: "0xabc123",
          blockNumber: 25000000n,
          args: { value: 10000000000n }, // 10,000 USDC (6 decimals)
        },
        {
          transactionHash: "0xdef456",
          blockNumber: 25000100n,
          args: { value: 5000000000n }, // 5,000 USDC
        },
      ]);

      // Mock block responses for timestamps
      mocks.getBlock
        .mockResolvedValueOnce({ number: 25000000n, timestamp: 1700000000n })
        .mockResolvedValueOnce({ number: 25000100n, timestamp: 1700001000n });

      const result = await historicalDeposits.getHistoricalDeposits(testAddress);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        txHash: "0xabc123",
        amount: 10000,
        blockNumber: 25000000n,
        timestamp: 1700000000,
      });
      expect(result[1]).toEqual({
        txHash: "0xdef456",
        amount: 5000,
        blockNumber: 25000100n,
        timestamp: 1700001000,
      });
    });

    it("should return empty array when no deposits found", async () => {
      mocks.getBlockNumber.mockResolvedValue(25010000n);
      mocks.getLogs.mockResolvedValue([]);

      const result = await historicalDeposits.getHistoricalDeposits(testAddress);

      expect(result).toEqual([]);
    });

    it("should return empty array on RPC error", async () => {
      mocks.getBlockNumber.mockRejectedValue(new Error("RPC error"));

      const result = await historicalDeposits.getHistoricalDeposits(testAddress);

      expect(result).toEqual([]);
    });

    it("should handle USDC decimals correctly (6 decimals)", async () => {
      mocks.getBlockNumber.mockResolvedValue(25010000n);
      mocks.getLogs.mockResolvedValue([
        {
          transactionHash: "0xabc",
          blockNumber: 25000000n,
          args: { value: 1500000n }, // 1.5 USDC
        },
      ]);
      mocks.getBlock.mockResolvedValue({ number: 25000000n, timestamp: 1700000000n });

      const result = await historicalDeposits.getHistoricalDeposits(testAddress);

      expect(result[0].amount).toBe(1.5);
    });

    it("should sort results by block number ascending (oldest first)", async () => {
      mocks.getBlockNumber.mockResolvedValue(25010000n);
      mocks.getLogs.mockResolvedValue([
        {
          transactionHash: "0xthird",
          blockNumber: 25000200n,
          args: { value: 1000000000n },
        },
        {
          transactionHash: "0xfirst",
          blockNumber: 25000000n,
          args: { value: 1000000000n },
        },
        {
          transactionHash: "0xsecond",
          blockNumber: 25000100n,
          args: { value: 1000000000n },
        },
      ]);
      mocks.getBlock
        .mockResolvedValueOnce({ number: 25000200n, timestamp: 1700002000n })
        .mockResolvedValueOnce({ number: 25000000n, timestamp: 1700000000n })
        .mockResolvedValueOnce({ number: 25000100n, timestamp: 1700001000n });

      const result = await historicalDeposits.getHistoricalDeposits(testAddress);

      expect(result[0].txHash).toBe("0xfirst");
      expect(result[1].txHash).toBe("0xsecond");
      expect(result[2].txHash).toBe("0xthird");
    });

    it("should normalize wallet address to lowercase", async () => {
      mocks.getBlockNumber.mockResolvedValue(25010000n);
      mocks.getLogs.mockResolvedValue([]);

      await historicalDeposits.getHistoricalDeposits(
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
      );

      // getLogs should be called with lowercase address
      expect(mocks.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            from: "0xabcdef1234567890abcdef1234567890abcdef12",
          }),
        })
      );
    });
  });

  describe("calculateTotalDeposited", () => {
    it("should sum all deposit amounts", () => {
      const deposits = [
        { txHash: "0x1", amount: 10000, blockNumber: 1n, timestamp: 1 },
        { txHash: "0x2", amount: 5000, blockNumber: 2n, timestamp: 2 },
        { txHash: "0x3", amount: 2500, blockNumber: 3n, timestamp: 3 },
      ];

      const total = historicalDeposits.calculateTotalDeposited(deposits);

      expect(total).toBe(17500);
    });

    it("should return 0 for empty array", () => {
      const total = historicalDeposits.calculateTotalDeposited([]);

      expect(total).toBe(0);
    });
  });

  describe("getFirstDepositInfo", () => {
    it("should return info about the first deposit", () => {
      const deposits = [
        { txHash: "0xfirst", amount: 10000, blockNumber: 100n, timestamp: 1700000000 },
        { txHash: "0xsecond", amount: 5000, blockNumber: 200n, timestamp: 1700001000 },
      ];

      const firstDeposit = historicalDeposits.getFirstDepositInfo(deposits);

      expect(firstDeposit).toEqual({
        txHash: "0xfirst",
        amount: 10000,
        timestamp: 1700000000,
      });
    });

    it("should return null for empty array", () => {
      const firstDeposit = historicalDeposits.getFirstDepositInfo([]);

      expect(firstDeposit).toBeNull();
    });
  });
});
