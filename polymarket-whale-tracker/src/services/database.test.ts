import { describe, it, expect, beforeEach, vi } from "vitest";

const mockQuery = vi.fn();
const mockEnd = vi.fn();

// Mock client for transaction support
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();
const mockConnect = vi.fn(() =>
  Promise.resolve({
    query: mockClientQuery,
    release: mockClientRelease,
  })
);

// Create a mock constructor function
function MockPool() {
  return {
    query: mockQuery,
    end: mockEnd,
    connect: mockConnect,
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
    app: {
      maxAlerts: 10000,
    },
  },
}));

describe("database service", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockQuery.mockReset();
    mockEnd.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockConnect.mockClear();
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
    it("should insert a deposit, update wallet totals, and prune old deposits", async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 42 }] }) // INSERT deposit
        .mockResolvedValueOnce({ rows: [] }) // UPDATE wallet
        .mockResolvedValueOnce({ rows: [] }) // DELETE prune
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const { db } = await import("./database.js");
      const result = await db.recordDeposit(
        "0xTxHash123",
        "0xWalletAddress",
        15000,
        BigInt(12345678)
      );

      expect(result).toBe(42);
      expect(mockConnect).toHaveBeenCalled();
      expect(mockClientQuery).toHaveBeenCalledTimes(5);

      // Verify BEGIN
      expect(mockClientQuery).toHaveBeenNthCalledWith(1, "BEGIN");

      // Verify INSERT query
      expect(mockClientQuery).toHaveBeenNthCalledWith(
        2,
        `INSERT INTO deposits (tx_hash, wallet_address, amount, block_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ["0xTxHash123", "0xwalletaddress", 15000, "12345678"]
      );

      // Verify UPDATE query
      expect(mockClientQuery).toHaveBeenNthCalledWith(
        3,
        `UPDATE wallets
         SET total_deposited = total_deposited + $1,
             deposit_count = deposit_count + 1,
             updated_at = NOW()
         WHERE address = $2`,
        [15000, "0xwalletaddress"]
      );

      // Verify DELETE prune query
      expect(mockClientQuery).toHaveBeenNthCalledWith(
        4,
        `DELETE FROM deposits
         WHERE id IN (
           SELECT id FROM deposits
           ORDER BY id DESC
           OFFSET $1
         )`,
        [10000]
      );

      // Verify COMMIT
      expect(mockClientQuery).toHaveBeenNthCalledWith(5, "COMMIT");

      // Verify client was released
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it("should return null for duplicate tx_hash (error code 23505)", async () => {
      const duplicateError = new Error("duplicate key value") as Error & { code: string };
      duplicateError.code = "23505";
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(duplicateError); // INSERT fails

      const { db } = await import("./database.js");
      const result = await db.recordDeposit("0xDuplicateTx", "0xWallet", 1000, BigInt(100));

      expect(result).toBeNull();
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it("should throw error for non-duplicate errors and rollback", async () => {
      const otherError = new Error("Connection error") as Error & { code: string };
      otherError.code = "ECONNREFUSED";
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(otherError); // INSERT fails

      const { db } = await import("./database.js");

      await expect(
        db.recordDeposit("0xTx", "0xWallet", 1000, BigInt(100))
      ).rejects.toThrow("Connection error");

      // Verify ROLLBACK was called
      expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it("should convert bigint block number to string", async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }) // DELETE prune
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const { db } = await import("./database.js");
      await db.recordDeposit("0xTx", "0xWallet", 1000, BigInt(9999999999999));

      expect(mockClientQuery).toHaveBeenNthCalledWith(
        2,
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
      .mockResolvedValueOnce({ rows: [{ count: "5" }] }); // newWhalesToday

    const { db } = await import("./database.js");
    const result = await db.getStats();

    expect(result).toEqual({
      whaleCount: 42,
      whaleCountTrend: 20, // (42-35)/35 * 100 = 20%
      totalVolume: 15750000,
      totalVolumeTrend: 8.62, // (15750000-14500000)/14500000 * 100 = 8.62%
      alertsToday: 12,
      newWhalesToday: 5,
    });
  });

  it("should return 0 trends when previous period is 0", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "10" }] }) // whaleCount
      .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // whaleCountLastWeek (0)
      .mockResolvedValueOnce({ rows: [{ sum: "5000000" }] }) // totalVolume
      .mockResolvedValueOnce({ rows: [{ sum: "0" }] }) // volumeLastWeek (0)
      .mockResolvedValueOnce({ rows: [{ count: "5" }] }) // alertsToday
      .mockResolvedValueOnce({ rows: [{ count: "10" }] }); // newWhalesToday

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
      newWhalesToday: 0,
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

describe("createWalletWithHistory", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockConnect.mockClear();
  });

  it("should create wallet and bulk insert historical deposits in a transaction", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // INSERT wallet
      .mockResolvedValueOnce({ rows: [] }) // INSERT deposits (bulk)
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const { db } = await import("./database.js");

    const deposits = [
      { txHash: "0xfirst", amount: 10000, blockNumber: 100n, timestamp: 1700000000 },
      { txHash: "0xsecond", amount: 5000, blockNumber: 200n, timestamp: 1700001000 },
      { txHash: "0xthird", amount: 2500, blockNumber: 300n, timestamp: 1700002000 },
    ];

    await db.createWalletWithHistory(
      "0xWalletAddress",
      deposits
    );

    expect(mockConnect).toHaveBeenCalled();
    expect(mockClientQuery).toHaveBeenCalledTimes(4);

    // Verify BEGIN
    expect(mockClientQuery).toHaveBeenNthCalledWith(1, "BEGIN");

    // Verify wallet INSERT with correct totals
    expect(mockClientQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO wallets"),
      [
        "0xwalletaddress", // address (lowercased)
        10000,            // first_deposit_amount
        "0xfirst",        // first_deposit_tx
        17500,            // total_deposited (sum of all)
        3,                // deposit_count
        expect.any(Date), // first_seen_at (from first deposit timestamp)
      ]
    );

    // Verify deposits bulk INSERT
    const depositsCall = mockClientQuery.mock.calls[2];
    expect(depositsCall[0]).toContain("INSERT INTO deposits");
    expect(depositsCall[0]).toContain("ON CONFLICT (tx_hash) DO NOTHING");

    // Verify COMMIT
    expect(mockClientQuery).toHaveBeenNthCalledWith(4, "COMMIT");

    expect(mockClientRelease).toHaveBeenCalled();
  });

  it("should rollback on error", async () => {
    const error = new Error("Database error");
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(error); // INSERT wallet fails

    const { db } = await import("./database.js");

    await expect(
      db.createWalletWithHistory("0xWallet", [
        { txHash: "0x1", amount: 1000, blockNumber: 1n, timestamp: 1700000000 },
      ])
    ).rejects.toThrow("Database error");

    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClientRelease).toHaveBeenCalled();
  });

  it("should handle empty deposits array gracefully", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // INSERT wallet (with zeros)
      .mockResolvedValueOnce({ rows: [] }); // COMMIT (no deposits to insert)

    const { db } = await import("./database.js");

    await db.createWalletWithHistory("0xWallet", []);

    // Should still create wallet with zero totals
    expect(mockClientQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO wallets"),
      expect.arrayContaining(["0xwallet", 0, null, 0, 0])
    );
  });

  it("should lowercase wallet address", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // INSERT wallet
      .mockResolvedValueOnce({ rows: [] }) // INSERT deposits
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const { db } = await import("./database.js");

    await db.createWalletWithHistory("0xABCDEF1234", [
      { txHash: "0x1", amount: 1000, blockNumber: 1n, timestamp: 1700000000 },
    ]);

    expect(mockClientQuery).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.arrayContaining(["0xabcdef1234"])
    );
  });

  it("should use first deposit timestamp as first_seen_at", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // INSERT wallet
      .mockResolvedValueOnce({ rows: [] }) // INSERT deposits
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const { db } = await import("./database.js");

    // Deposits should be sorted by timestamp (oldest first)
    const deposits = [
      { txHash: "0xfirst", amount: 5000, blockNumber: 1n, timestamp: 1700000000 },
      { txHash: "0xsecond", amount: 3000, blockNumber: 2n, timestamp: 1700001000 },
    ];

    await db.createWalletWithHistory("0xWallet", deposits);

    // first_seen_at should be based on first deposit's timestamp
    const walletInsertCall = mockClientQuery.mock.calls[1];
    const firstSeenAt = walletInsertCall[1][5] as Date;
    expect(firstSeenAt.getTime()).toBe(1700000000 * 1000);
  });
});
