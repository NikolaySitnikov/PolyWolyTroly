import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";

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

describe("setupDatabase", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();

    // Reset mocks
    mockQuery.mockReset();
    mockEnd.mockReset();

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("schema structure", () => {
    it("should create wallets table with correct columns", async () => {
      mockQuery.mockResolvedValue({});
      mockEnd.mockResolvedValue({});

      const { setupDatabase } = await import("./setupDatabase.js");
      await setupDatabase();

      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0] as string;

      // Verify wallets table structure
      expect(queryCall).toContain("CREATE TABLE IF NOT EXISTS wallets");
      expect(queryCall).toContain("address VARCHAR(42) PRIMARY KEY");
      expect(queryCall).toContain("first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");
      expect(queryCall).toContain("first_deposit_amount DECIMAL(20, 6)");
      expect(queryCall).toContain("first_deposit_tx VARCHAR(66)");
      expect(queryCall).toContain("total_deposited DECIMAL(20, 6) DEFAULT 0");
      expect(queryCall).toContain("deposit_count INTEGER DEFAULT 0");
      expect(queryCall).toContain("is_notified BOOLEAN DEFAULT FALSE");
      expect(queryCall).toContain("created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");
      expect(queryCall).toContain("updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");
    });

    it("should create deposits table with correct columns", async () => {
      mockQuery.mockResolvedValue({});
      mockEnd.mockResolvedValue({});

      const { setupDatabase } = await import("./setupDatabase.js");
      await setupDatabase();

      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0] as string;

      // Verify deposits table structure
      expect(queryCall).toContain("CREATE TABLE IF NOT EXISTS deposits");
      expect(queryCall).toContain("id SERIAL PRIMARY KEY");
      expect(queryCall).toContain("tx_hash VARCHAR(66) UNIQUE NOT NULL");
      expect(queryCall).toContain("wallet_address VARCHAR(42) NOT NULL REFERENCES wallets(address)");
      expect(queryCall).toContain("amount DECIMAL(20, 6) NOT NULL");
      expect(queryCall).toContain("block_number BIGINT NOT NULL");
      expect(queryCall).toContain("block_timestamp TIMESTAMP WITH TIME ZONE");
    });

    it("should create notifications table with correct columns", async () => {
      mockQuery.mockResolvedValue({});
      mockEnd.mockResolvedValue({});

      const { setupDatabase } = await import("./setupDatabase.js");
      await setupDatabase();

      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0] as string;

      // Verify notifications table structure
      expect(queryCall).toContain("CREATE TABLE IF NOT EXISTS notifications");
      expect(queryCall).toContain("wallet_address VARCHAR(42) NOT NULL");
      expect(queryCall).toContain("deposit_id INTEGER REFERENCES deposits(id)");
      expect(queryCall).toContain("notification_type VARCHAR(50) NOT NULL");
      expect(queryCall).toContain("message TEXT");
      expect(queryCall).toContain("sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");
      expect(queryCall).toContain("success BOOLEAN DEFAULT TRUE");
      expect(queryCall).toContain("error_message TEXT");
    });

    it("should create performance indexes", async () => {
      mockQuery.mockResolvedValue({});
      mockEnd.mockResolvedValue({});

      const { setupDatabase } = await import("./setupDatabase.js");
      await setupDatabase();

      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0][0] as string;

      // Verify indexes
      expect(queryCall).toContain("CREATE INDEX IF NOT EXISTS idx_wallets_first_seen ON wallets(first_seen_at)");
      expect(queryCall).toContain("CREATE INDEX IF NOT EXISTS idx_deposits_wallet ON deposits(wallet_address)");
      expect(queryCall).toContain("CREATE INDEX IF NOT EXISTS idx_deposits_block ON deposits(block_number)");
    });
  });

  describe("database connection", () => {
    it("should close the pool connection after setup", async () => {
      mockQuery.mockResolvedValue({});
      mockEnd.mockResolvedValue({});

      const { setupDatabase } = await import("./setupDatabase.js");
      await setupDatabase();

      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe("success handling", () => {
    it("should log success message when schema is created", async () => {
      mockQuery.mockResolvedValue({});
      mockEnd.mockResolvedValue({});

      const { setupDatabase } = await import("./setupDatabase.js");
      await setupDatabase();

      expect(consoleLogSpy).toHaveBeenCalledWith("✅ Database schema created successfully!");
    });
  });

  describe("error handling", () => {
    it("should log error when schema creation fails", async () => {
      const testError = new Error("Connection refused");
      mockQuery.mockRejectedValue(testError);
      mockEnd.mockResolvedValue({});

      const { setupDatabase } = await import("./setupDatabase.js");
      await setupDatabase();

      expect(consoleErrorSpy).toHaveBeenCalledWith("❌ Error creating schema:", testError);
    });

    it("should still close pool connection when error occurs", async () => {
      mockQuery.mockRejectedValue(new Error("Connection refused"));
      mockEnd.mockResolvedValue({});

      const { setupDatabase } = await import("./setupDatabase.js");
      await setupDatabase();

      expect(mockEnd).toHaveBeenCalled();
    });
  });
});
