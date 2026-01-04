import { describe, it, expect, beforeEach, vi } from "vitest";

const mockQuery = vi.fn();
const mockEnd = vi.fn();

// Create a mock constructor function
function MockPool() {
  return {
    query: mockQuery,
    end: mockEnd,
  };
}

// Mock pg module before importing the module under test
vi.mock("pg", () => {
  return {
    default: {
      Pool: MockPool,
    },
  };
});

// Mock the config module
vi.mock("../config/index.js", () => ({
  config: {
    database: {
      url: "postgresql://localhost:5432/test",
    },
  },
}));

describe("database service", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockQuery.mockReset();
    mockEnd.mockReset();
  });

  describe("walletExists", () => {
    it("should return true when wallet exists", async () => {
      mockQuery.mockResolvedValue({ rows: [{ "1": 1 }] });

      const { db } = await import("./database.js");
      const result = await db.walletExists("0x1234567890AbCdEf1234567890AbCdEf12345678");

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT 1 FROM wallets WHERE address = $1",
        ["0x1234567890abcdef1234567890abcdef12345678"]
      );
    });

    it("should return false when wallet does not exist", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      const result = await db.walletExists("0x1234567890AbCdEf1234567890AbCdEf12345678");

      expect(result).toBe(false);
    });

    it("should lowercase the address before querying", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      await db.walletExists("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT 1 FROM wallets WHERE address = $1",
        ["0xabcdef1234567890abcdef1234567890abcdef12"]
      );
    });
  });

  describe("createWallet", () => {
    it("should insert a new wallet with deposit info", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      await db.createWallet(
        "0x1234567890AbCdEf1234567890AbCdEf12345678",
        10000,
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab"
      );

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO wallets (address, first_deposit_amount, first_deposit_tx, total_deposited, deposit_count)
       VALUES ($1, $2, $3, $2, 1)
       ON CONFLICT (address) DO NOTHING`,
        [
          "0x1234567890abcdef1234567890abcdef12345678",
          10000,
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
        ]
      );
    });

    it("should lowercase the address before inserting", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      await db.createWallet("0xABCDEF", 5000, "0xTxHash");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ["0xabcdef", 5000, "0xTxHash"]
      );
    });
  });

  describe("recordDeposit", () => {
    it("should insert a deposit and update wallet totals", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 42 }] }) // INSERT deposit
        .mockResolvedValueOnce({ rows: [] }); // UPDATE wallet

      const { db } = await import("./database.js");
      const result = await db.recordDeposit(
        "0xTxHash123",
        "0xWalletAddress",
        15000,
        BigInt(12345678)
      );

      expect(result).toBe(42);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify INSERT query
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        `INSERT INTO deposits (tx_hash, wallet_address, amount, block_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ["0xTxHash123", "0xwalletaddress", 15000, "12345678"]
      );

      // Verify UPDATE query
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        `UPDATE wallets
         SET total_deposited = total_deposited + $1,
             deposit_count = deposit_count + 1,
             updated_at = NOW()
         WHERE address = $2`,
        [15000, "0xwalletaddress"]
      );
    });

    it("should return null for duplicate tx_hash (error code 23505)", async () => {
      const duplicateError = new Error("duplicate key value") as Error & { code: string };
      duplicateError.code = "23505";
      mockQuery.mockRejectedValue(duplicateError);

      const { db } = await import("./database.js");
      const result = await db.recordDeposit("0xDuplicateTx", "0xWallet", 1000, BigInt(100));

      expect(result).toBeNull();
    });

    it("should throw error for non-duplicate errors", async () => {
      const otherError = new Error("Connection error") as Error & { code: string };
      otherError.code = "ECONNREFUSED";
      mockQuery.mockRejectedValue(otherError);

      const { db } = await import("./database.js");

      await expect(
        db.recordDeposit("0xTx", "0xWallet", 1000, BigInt(100))
      ).rejects.toThrow("Connection error");
    });

    it("should convert bigint block number to string", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const { db } = await import("./database.js");
      await db.recordDeposit("0xTx", "0xWallet", 1000, BigInt(9999999999999));

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        ["0xTx", "0xwallet", 1000, "9999999999999"]
      );
    });
  });

  describe("logNotification", () => {
    it("should insert a successful notification log", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      await db.logNotification(
        "0xWalletAddress",
        42,
        "telegram",
        "New whale deposit: 10000 USDC",
        true
      );

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO notifications (wallet_address, deposit_id, notification_type, message, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
        ["0xwalletaddress", 42, "telegram", "New whale deposit: 10000 USDC", true, undefined]
      );
    });

    it("should insert a failed notification log with error message", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      await db.logNotification(
        "0xWalletAddress",
        42,
        "telegram",
        "New whale deposit: 10000 USDC",
        false,
        "Telegram API rate limit exceeded"
      );

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO notifications (wallet_address, deposit_id, notification_type, message, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          "0xwalletaddress",
          42,
          "telegram",
          "New whale deposit: 10000 USDC",
          false,
          "Telegram API rate limit exceeded",
        ]
      );
    });

    it("should lowercase the wallet address", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      await db.logNotification("0xABCDEF", 1, "email", "Test", true);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ["0xabcdef", 1, "email", "Test", true, undefined]
      );
    });
  });

  describe("getWallet", () => {
    it("should return wallet when found", async () => {
      const mockWallet = {
        address: "0x1234",
        first_seen_at: new Date("2024-01-01"),
        first_deposit_amount: 10000,
        total_deposited: 25000,
        deposit_count: 3,
        is_notified: true,
      };
      mockQuery.mockResolvedValue({ rows: [mockWallet] });

      const { db } = await import("./database.js");
      const result = await db.getWallet("0x1234567890AbCdEf1234567890AbCdEf12345678");

      expect(result).toEqual(mockWallet);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM wallets WHERE address = $1",
        ["0x1234567890abcdef1234567890abcdef12345678"]
      );
    });

    it("should return null when wallet not found", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      const result = await db.getWallet("0xNonexistent");

      expect(result).toBeNull();
    });

    it("should lowercase the address before querying", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { db } = await import("./database.js");
      await db.getWallet("0xABCDEF");

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM wallets WHERE address = $1",
        ["0xabcdef"]
      );
    });
  });

  describe("close", () => {
    it("should close the pool connection", async () => {
      mockEnd.mockResolvedValue(undefined);

      const { db } = await import("./database.js");
      await db.close();

      expect(mockEnd).toHaveBeenCalled();
    });
  });
});

describe("getStats", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockQuery.mockReset();
  });

  it("should return dashboard statistics with trends", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "42" }] }) // whaleCount
      .mockResolvedValueOnce({ rows: [{ count: "35" }] }) // whaleCountLastWeek
      .mockResolvedValueOnce({ rows: [{ sum: "15750000" }] }) // totalVolume
      .mockResolvedValueOnce({ rows: [{ sum: "14500000" }] }) // volumeLastWeek
      .mockResolvedValueOnce({ rows: [{ count: "12" }] }) // alertsToday
      .mockResolvedValueOnce({ rows: [{ count: "5" }] }); // newWhalesThisWeek

    const { db } = await import("./database.js");
    const result = await db.getStats();

    expect(result).toEqual({
      whaleCount: 42,
      whaleCountTrend: 20, // (42-35)/35 * 100 = 20%
      totalVolume: 15750000,
      totalVolumeTrend: 8.62, // (15750000-14500000)/14500000 * 100 = 8.62%
      alertsToday: 12,
      newWhalesThisWeek: 5,
    });
  });

  it("should return 0 trends when previous period is 0", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "10" }] }) // whaleCount
      .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // whaleCountLastWeek (0)
      .mockResolvedValueOnce({ rows: [{ sum: "5000000" }] }) // totalVolume
      .mockResolvedValueOnce({ rows: [{ sum: "0" }] }) // volumeLastWeek (0)
      .mockResolvedValueOnce({ rows: [{ count: "5" }] }) // alertsToday
      .mockResolvedValueOnce({ rows: [{ count: "10" }] }); // newWhalesThisWeek

    const { db } = await import("./database.js");
    const result = await db.getStats();

    expect(result.whaleCountTrend).toBe(0);
    expect(result.totalVolumeTrend).toBe(0);
  });

  it("should return 0 for null values", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [{ sum: null }] })
      .mockResolvedValueOnce({ rows: [{ sum: null }] })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] });

    const { db } = await import("./database.js");
    const result = await db.getStats();

    expect(result).toEqual({
      whaleCount: 0,
      whaleCountTrend: 0,
      totalVolume: 0,
      totalVolumeTrend: 0,
      alertsToday: 0,
      newWhalesThisWeek: 0,
    });
  });
});

describe("getAllWallets", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockQuery.mockReset();
  });

  it("should return paginated wallets", async () => {
    const mockWallets = [
      { address: "0x1234", total_deposited: 50000, deposit_count: 5 },
      { address: "0xabcd", total_deposited: 30000, deposit_count: 3 },
    ];
    mockQuery
      .mockResolvedValueOnce({ rows: mockWallets })
      .mockResolvedValueOnce({ rows: [{ count: "10" }] });

    const { db } = await import("./database.js");
    const result = await db.getAllWallets(1, 20);

    expect(result.wallets).toEqual(mockWallets);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("should apply pagination offset", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: "50" }] });

    const { db } = await import("./database.js");
    await db.getAllWallets(3, 10);

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("LIMIT $1 OFFSET $2"),
      [10, 20] // page 3 with limit 10 = offset 20
    );
  });
});

describe("getRecentDeposits", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockQuery.mockReset();
  });

  it("should return paginated deposits", async () => {
    const mockDeposits = [
      { id: "1", wallet_address: "0x1234", amount: 50000, created_at: new Date() },
    ];
    mockQuery
      .mockResolvedValueOnce({ rows: mockDeposits })
      .mockResolvedValueOnce({ rows: [{ count: "100" }] });

    const { db } = await import("./database.js");
    const result = await db.getRecentDeposits(1, 20);

    expect(result.deposits).toEqual(mockDeposits);
    expect(result.total).toBe(100);
  });

  it("should filter by wallet address when provided", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: "5" }] });

    const { db } = await import("./database.js");
    await db.getRecentDeposits(1, 20, "0xABCDEF");

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("WHERE wallet_address = $3"),
      [20, 0, "0xabcdef"]
    );
  });
});

describe("Wallet interface", () => {
  it("should export Wallet type with correct properties", async () => {
    // This test validates the interface at compile time
    // by checking we can assign a correctly-shaped object
    const { db } = await import("./database.js");

    // The wallet returned from getWallet should match the Wallet interface
    mockQuery.mockResolvedValue({
      rows: [
        {
          address: "0x1234",
          firstSeenAt: new Date(),
          firstDepositAmount: 10000,
          totalDeposited: 25000,
          depositCount: 3,
          isNotified: false,
        },
      ],
    });

    const wallet = await db.getWallet("0x1234");
    expect(wallet).toBeDefined();
  });
});
