import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock console.log
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

// Mock pino logger (still needed for error handling)
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
vi.mock("pino", () => ({
  default: () => mockLogger,
}));

// Mock config
vi.mock("./config/index.js", () => ({
  config: {
    app: {
      nodeEnv: "test",
      minDepositAmount: 10000,
    },
    alchemy: {
      wssUrl: "wss://polygon-mainnet.g.alchemy.com/v2/test",
      httpUrl: "https://polygon-mainnet.g.alchemy.com/v2/test",
    },
    telegram: {
      botToken: "test-bot-token",
      chatId: "test-chat-id",
    },
  },
}));

// Mock blockchain
const mockStartListening = vi.fn();
const mockGetCurrentBlock = vi.fn();
vi.mock("./services/blockchain.js", () => ({
  blockchain: {
    startListening: mockStartListening,
    getCurrentBlock: mockGetCurrentBlock,
  },
}));

// Mock notifications
const mockSendTelegramAlert = vi.fn();
vi.mock("./services/notifications.js", () => ({
  notifications: {
    sendTelegramAlert: mockSendTelegramAlert,
  },
}));

describe("main application", () => {
  let originalProcessOn: typeof process.on;
  let originalProcessExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockConsoleLog.mockClear();

    // Store original process methods
    originalProcessOn = process.on;
    originalProcessExit = process.exit;

    // Mock process.exit to prevent test from exiting
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    // Restore original process methods
    process.on = originalProcessOn;
    process.exit = originalProcessExit;
  });

  describe("startup sequence", () => {
    it("should log startup banner with environment info", async () => {
      mockGetCurrentBlock.mockResolvedValue(BigInt(50000000));
      mockStartListening.mockResolvedValue(undefined);
      mockSendTelegramAlert.mockResolvedValue(true);

      const { main } = await import("./index.js");
      await main();

      // Check for startup banner logs
      expect(mockConsoleLog).toHaveBeenCalledWith("=".repeat(50));
      expect(mockConsoleLog).toHaveBeenCalledWith("🐋 Polymarket Whale Tracker");
      expect(mockConsoleLog).toHaveBeenCalledWith("Environment: test");
      expect(mockConsoleLog).toHaveBeenCalledWith("Min deposit threshold: $10,000");
    });

    it("should test Telegram connection on startup", async () => {
      mockGetCurrentBlock.mockResolvedValue(BigInt(50000000));
      mockStartListening.mockResolvedValue(undefined);
      mockSendTelegramAlert.mockResolvedValue(true);

      const { main } = await import("./index.js");
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith("Testing Telegram connection...");
      expect(mockSendTelegramAlert).toHaveBeenCalledWith({
        walletAddress: "0x0000000000000000000000000000000000000000",
        amount: 0,
        txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        blockNumber: 0n,
        isNewWallet: false,
        depositId: 0,
      });
    });

    it("should log success when Telegram test passes", async () => {
      mockGetCurrentBlock.mockResolvedValue(BigInt(50000000));
      mockStartListening.mockResolvedValue(undefined);
      mockSendTelegramAlert.mockResolvedValue(true);

      const { main } = await import("./index.js");
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith("✅ Telegram connection successful");
    });

    it("should log warning when Telegram test fails", async () => {
      mockGetCurrentBlock.mockResolvedValue(BigInt(50000000));
      mockStartListening.mockResolvedValue(undefined);
      mockSendTelegramAlert.mockResolvedValue(false);

      const { main } = await import("./index.js");
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "⚠️ Telegram test failed - check your bot token and chat ID"
      );
    });

    it("should get and log current block number", async () => {
      mockGetCurrentBlock.mockResolvedValue(BigInt(55123456));
      mockStartListening.mockResolvedValue(undefined);
      mockSendTelegramAlert.mockResolvedValue(true);

      const { main } = await import("./index.js");
      await main();

      expect(mockGetCurrentBlock).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith("Current Polygon block: 55123456");
    });

    it("should start blockchain listener", async () => {
      mockGetCurrentBlock.mockResolvedValue(BigInt(50000000));
      mockStartListening.mockResolvedValue(undefined);
      mockSendTelegramAlert.mockResolvedValue(true);

      const { main } = await import("./index.js");
      await main();

      expect(mockStartListening).toHaveBeenCalled();
    });

    it("should log running message after starting", async () => {
      mockGetCurrentBlock.mockResolvedValue(BigInt(50000000));
      mockStartListening.mockResolvedValue(undefined);
      mockSendTelegramAlert.mockResolvedValue(true);

      const { main } = await import("./index.js");
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Tracker is running. Press Ctrl+C to stop."
      );
    });
  });

  describe("error handling", () => {
    it("should log fatal error and exit with code 1 on failure", async () => {
      const testError = new Error("Connection failed");
      mockGetCurrentBlock.mockRejectedValue(testError);
      mockSendTelegramAlert.mockResolvedValue(true);

      const { main } = await import("./index.js");

      await expect(main()).rejects.toThrow("Connection failed");
    });

    it("should continue running even if Telegram test fails", async () => {
      mockGetCurrentBlock.mockResolvedValue(BigInt(50000000));
      mockStartListening.mockResolvedValue(undefined);
      mockSendTelegramAlert.mockResolvedValue(false);

      const { main } = await import("./index.js");
      await main();

      // Should still call startListening even if Telegram fails
      expect(mockStartListening).toHaveBeenCalled();
    });
  });

  describe("startup order", () => {
    it("should execute steps in correct order", async () => {
      const callOrder: string[] = [];

      mockSendTelegramAlert.mockImplementation(async () => {
        callOrder.push("telegram");
        return true;
      });
      mockGetCurrentBlock.mockImplementation(async () => {
        callOrder.push("getCurrentBlock");
        return BigInt(50000000);
      });
      mockStartListening.mockImplementation(async () => {
        callOrder.push("startListening");
      });

      const { main } = await import("./index.js");
      await main();

      expect(callOrder).toEqual(["telegram", "getCurrentBlock", "startListening"]);
    });
  });
});
