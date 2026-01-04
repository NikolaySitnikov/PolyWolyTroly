import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSetex = vi.fn();
const mockExists = vi.fn();
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockQuit = vi.fn();

// Create a mock constructor function for Redis
function MockRedis() {
  return {
    setex: mockSetex,
    exists: mockExists,
    set: mockSet,
    get: mockGet,
    quit: mockQuit,
  };
}

// Mock ioredis module before importing the module under test
vi.mock("ioredis", () => {
  return {
    default: MockRedis,
  };
});

// Mock the config module
vi.mock("../config/index.js", () => ({
  config: {
    redis: {
      url: "redis://localhost:6379",
    },
  },
}));

describe("cache service", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockSetex.mockReset();
    mockExists.mockReset();
    mockSet.mockReset();
    mockGet.mockReset();
    mockQuit.mockReset();
  });

  describe("markWalletSeen", () => {
    it("should store wallet address with 30-day TTL", async () => {
      mockSetex.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      await cache.markWalletSeen("0x1234567890AbCdEf1234567890AbCdEf12345678");

      expect(mockSetex).toHaveBeenCalledWith(
        "wallet:0x1234567890abcdef1234567890abcdef12345678",
        30 * 24 * 60 * 60, // 30 days in seconds
        expect.any(String)
      );
    });

    it("should lowercase the address before storing", async () => {
      mockSetex.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      await cache.markWalletSeen("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");

      expect(mockSetex).toHaveBeenCalledWith(
        "wallet:0xabcdef1234567890abcdef1234567890abcdef12",
        expect.any(Number),
        expect.any(String)
      );
    });

    it("should store current timestamp as value", async () => {
      mockSetex.mockResolvedValue("OK");
      const beforeTime = Date.now();

      const { cache } = await import("./cache.js");
      await cache.markWalletSeen("0x1234");

      const afterTime = Date.now();
      const storedValue = Number(mockSetex.mock.calls[0][2]);

      expect(storedValue).toBeGreaterThanOrEqual(beforeTime);
      expect(storedValue).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("isWalletSeen", () => {
    it("should return true when wallet exists in cache", async () => {
      mockExists.mockResolvedValue(1);

      const { cache } = await import("./cache.js");
      const result = await cache.isWalletSeen("0x1234567890AbCdEf1234567890AbCdEf12345678");

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith(
        "wallet:0x1234567890abcdef1234567890abcdef12345678"
      );
    });

    it("should return false when wallet does not exist in cache", async () => {
      mockExists.mockResolvedValue(0);

      const { cache } = await import("./cache.js");
      const result = await cache.isWalletSeen("0x1234567890AbCdEf1234567890AbCdEf12345678");

      expect(result).toBe(false);
    });

    it("should lowercase the address before checking", async () => {
      mockExists.mockResolvedValue(0);

      const { cache } = await import("./cache.js");
      await cache.isWalletSeen("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");

      expect(mockExists).toHaveBeenCalledWith(
        "wallet:0xabcdef1234567890abcdef1234567890abcdef12"
      );
    });
  });

  describe("setLastBlock", () => {
    it("should store block number as string", async () => {
      mockSet.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      await cache.setLastBlock(BigInt(12345678));

      expect(mockSet).toHaveBeenCalledWith("last_processed_block", "12345678");
    });

    it("should handle large block numbers", async () => {
      mockSet.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      await cache.setLastBlock(BigInt("9999999999999999999"));

      expect(mockSet).toHaveBeenCalledWith("last_processed_block", "9999999999999999999");
    });
  });

  describe("getLastBlock", () => {
    it("should return block number as bigint when exists", async () => {
      mockGet.mockResolvedValue("12345678");

      const { cache } = await import("./cache.js");
      const result = await cache.getLastBlock();

      expect(result).toBe(BigInt(12345678));
      expect(mockGet).toHaveBeenCalledWith("last_processed_block");
    });

    it("should return null when block number does not exist", async () => {
      mockGet.mockResolvedValue(null);

      const { cache } = await import("./cache.js");
      const result = await cache.getLastBlock();

      expect(result).toBeNull();
    });

    it("should handle large block numbers", async () => {
      mockGet.mockResolvedValue("9999999999999999999");

      const { cache } = await import("./cache.js");
      const result = await cache.getLastBlock();

      expect(result).toBe(BigInt("9999999999999999999"));
    });
  });

  describe("close", () => {
    it("should close the redis connection", async () => {
      mockQuit.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      await cache.close();

      expect(mockQuit).toHaveBeenCalled();
    });
  });

  describe("acquireTransactionLock", () => {
    it("should acquire lock when transaction not locked", async () => {
      mockSet.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      const result = await cache.acquireTransactionLock("0xTxHash123");

      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        "tx_lock:0xtxhash123",
        expect.any(String),
        "EX",
        60,
        "NX"
      );
    });

    it("should return false when transaction already locked", async () => {
      mockSet.mockResolvedValue(null);

      const { cache } = await import("./cache.js");
      const result = await cache.acquireTransactionLock("0xTxHash123");

      expect(result).toBe(false);
    });

    it("should lowercase the tx hash before locking", async () => {
      mockSet.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      await cache.acquireTransactionLock("0xABCDEF");

      expect(mockSet).toHaveBeenCalledWith(
        "tx_lock:0xabcdef",
        expect.any(String),
        "EX",
        60,
        "NX"
      );
    });
  });

  describe("isTransactionProcessed", () => {
    it("should return true when transaction was processed", async () => {
      mockExists.mockResolvedValue(1);

      const { cache } = await import("./cache.js");
      const result = await cache.isTransactionProcessed("0xTxHash123");

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith("tx_processed:0xtxhash123");
    });

    it("should return false when transaction not processed", async () => {
      mockExists.mockResolvedValue(0);

      const { cache } = await import("./cache.js");
      const result = await cache.isTransactionProcessed("0xTxHash123");

      expect(result).toBe(false);
    });
  });

  describe("markTransactionProcessed", () => {
    it("should mark transaction as processed with 7-day TTL", async () => {
      mockSetex.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      await cache.markTransactionProcessed("0xTxHash123");

      expect(mockSetex).toHaveBeenCalledWith(
        "tx_processed:0xtxhash123",
        7 * 24 * 60 * 60,
        expect.any(String)
      );
    });

    it("should lowercase the tx hash before marking", async () => {
      mockSetex.mockResolvedValue("OK");

      const { cache } = await import("./cache.js");
      await cache.markTransactionProcessed("0xABCDEF");

      expect(mockSetex).toHaveBeenCalledWith(
        "tx_processed:0xabcdef",
        expect.any(Number),
        expect.any(String)
      );
    });
  });
});
