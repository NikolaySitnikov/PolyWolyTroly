import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { Log } from "viem";

// Mock walletTracker
const mockProcessDeposit = vi.fn();
vi.mock("./walletTracker.js", () => ({
  walletTracker: {
    processDeposit: mockProcessDeposit,
  },
}));

// Mock notifications
const mockSendTelegramAlert = vi.fn();
vi.mock("./notifications.js", () => ({
  notifications: {
    sendTelegramAlert: mockSendTelegramAlert,
  },
}));

// Mock cache
const mockSetLastBlock = vi.fn();
const mockClose = vi.fn();
const mockAcquireTransactionLock = vi.fn();
const mockIsTransactionProcessed = vi.fn();
const mockMarkTransactionProcessed = vi.fn();
vi.mock("./cache.js", () => ({
  cache: {
    setLastBlock: mockSetLastBlock,
    close: mockClose,
    acquireTransactionLock: mockAcquireTransactionLock,
    isTransactionProcessed: mockIsTransactionProcessed,
    markTransactionProcessed: mockMarkTransactionProcessed,
  },
}));

// Mock config
vi.mock("../config/index.js", () => ({
  config: {
    alchemy: {
      wssUrl: "wss://polygon-mainnet.g.alchemy.com/v2/test",
      httpUrl: "https://polygon-mainnet.g.alchemy.com/v2/test",
    },
    app: {
      minDepositAmount: 10000,
    },
  },
}));

// Mock viem clients
const mockWatchContractEvent = vi.fn();
const mockGetBlockNumber = vi.fn();

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: vi.fn().mockImplementation(({ transport }) => {
      // Detect if it's websocket or http based on transport
      if (transport?.type === "webSocket") {
        return {
          watchContractEvent: mockWatchContractEvent,
        };
      }
      return {
        getBlockNumber: mockGetBlockNumber,
      };
    }),
    webSocket: vi.fn().mockReturnValue({ type: "webSocket" }),
    http: vi.fn().mockReturnValue({ type: "http" }),
  };
});

// Mock pino logger
vi.mock("pino", () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("blockchain service", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockProcessDeposit.mockReset();
    mockSendTelegramAlert.mockReset();
    mockSetLastBlock.mockReset();
    mockClose.mockReset();
    mockWatchContractEvent.mockReset();
    mockGetBlockNumber.mockReset();
    mockAcquireTransactionLock.mockReset();
    mockIsTransactionProcessed.mockReset();
    mockMarkTransactionProcessed.mockReset();
    // Default: allow processing (lock acquired, not already processed)
    mockAcquireTransactionLock.mockResolvedValue(true);
    mockIsTransactionProcessed.mockResolvedValue(false);
    mockMarkTransactionProcessed.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("processTransferEvent", () => {
    // Helper to create a mock log
    const createMockLog = (overrides: Partial<Log> = {}): Log => ({
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event signature
        "0x000000000000000000000000abc1234567890abcdef1234567890abcdef12345", // from address
        "0x0000000000000000000000004bfb41d5b3570defd03c39a9a4d8de6bd8b8982e", // to (Polymarket Exchange)
      ],
      data: "0x00000000000000000000000000000000000000000000000000000002540be400", // 10000 USDC (10000 * 10^6)
      blockHash: "0xblockhash",
      blockNumber: BigInt(50000000),
      transactionHash: "0xtxhash123",
      transactionIndex: 0,
      logIndex: 0,
      removed: false,
      ...overrides,
    });

    it("should process a valid transfer event above minimum amount", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: true, depositId: 1 });
      mockSendTelegramAlert.mockResolvedValue(true);
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).toHaveBeenCalledWith(
        "0xabc1234567890abcdef1234567890abcdef12345",
        10000,
        "0xtxhash123",
        BigInt(50000000)
      );
    });

    it("should send notification for new wallet with large deposit", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: true, depositId: 42 });
      mockSendTelegramAlert.mockResolvedValue(true);
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      await blockchain.processTransferEvent(log);

      expect(mockSendTelegramAlert).toHaveBeenCalledWith({
        walletAddress: "0xabc1234567890abcdef1234567890abcdef12345",
        amount: 10000,
        txHash: "0xtxhash123",
        blockNumber: BigInt(50000000),
        isNewWallet: true,
        depositId: 42,
      });
    });

    it("should send notification for existing wallet with isNewWallet=false", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: false, depositId: 99 });
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      await blockchain.processTransferEvent(log);

      // We send notifications for all deposits, with correct isNewWallet flag
      expect(mockSendTelegramAlert).toHaveBeenCalledWith({
        walletAddress: "0xabc1234567890abcdef1234567890abcdef12345",
        amount: 10000,
        txHash: "0xtxhash123",
        blockNumber: BigInt(50000000),
        isNewWallet: false,
        depositId: 99,
      });
    });

    it("should skip events below minimum deposit amount", async () => {
      const { blockchain } = await import("./blockchain.js");

      // 1000 USDC = 1000 * 10^6 = 1000000000 = 0x3B9ACA00
      const log = createMockLog({
        data: "0x000000000000000000000000000000000000000000000000000000003b9aca00",
      });
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).not.toHaveBeenCalled();
    });

    it("should skip events with missing from address", async () => {
      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog({
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          undefined as any,
          "0x0000000000000000000000004bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
        ],
      });
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).not.toHaveBeenCalled();
    });

    it("should skip events with missing to address", async () => {
      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog({
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000abc1234567890abcdef1234567890abcdef12345",
          undefined as any,
        ],
      });
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).not.toHaveBeenCalled();
    });

    it("should skip events with missing transaction hash", async () => {
      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog({
        transactionHash: null as any,
      });
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).not.toHaveBeenCalled();
    });

    it("should skip events with missing block number", async () => {
      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog({
        blockNumber: null as any,
      });
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).not.toHaveBeenCalled();
    });

    it("should update last processed block after successful processing", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: false, depositId: 1 });
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog({
        blockNumber: BigInt(12345678),
      });
      await blockchain.processTransferEvent(log);

      expect(mockSetLastBlock).toHaveBeenCalledWith(BigInt(12345678));
    });

    it("should NOT send notification when depositId is null (duplicate)", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: true, depositId: null });
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      await blockchain.processTransferEvent(log);

      expect(mockSendTelegramAlert).not.toHaveBeenCalled();
    });

    it("should handle very large deposit amounts correctly", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: true, depositId: 1 });
      mockSendTelegramAlert.mockResolvedValue(true);
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      // 1,000,000 USDC = 1000000 * 10^6 = 1000000000000 = 0xE8D4A51000
      const log = createMockLog({
        data: "0x000000000000000000000000000000000000000000000000000000e8d4a51000",
      });
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).toHaveBeenCalledWith(
        expect.any(String),
        1000000,
        expect.any(String),
        expect.any(BigInt)
      );
    });

    it("should process exactly minimum amount deposits", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: false, depositId: 1 });
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      // Exactly 10000 USDC = 10000 * 10^6 = 10000000000 = 0x2540BE400
      const log = createMockLog({
        data: "0x00000000000000000000000000000000000000000000000000000002540be400",
      });
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockProcessDeposit.mockRejectedValue(new Error("Database error"));

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      // Should not throw
      await expect(blockchain.processTransferEvent(log)).resolves.not.toThrow();
    });

    it("should skip processing if transaction already processed (deduplication)", async () => {
      mockIsTransactionProcessed.mockResolvedValue(true);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).not.toHaveBeenCalled();
      expect(mockSendTelegramAlert).not.toHaveBeenCalled();
    });

    it("should skip processing if cannot acquire lock (another process handling)", async () => {
      mockAcquireTransactionLock.mockResolvedValue(false);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).not.toHaveBeenCalled();
      expect(mockSendTelegramAlert).not.toHaveBeenCalled();
    });

    it("should mark transaction as processed after successful notification", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: true, depositId: 1 });
      mockSendTelegramAlert.mockResolvedValue(true);
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      await blockchain.processTransferEvent(log);

      expect(mockMarkTransactionProcessed).toHaveBeenCalledWith("0xtxhash123");
    });

    it("should check transaction processed status before acquiring lock", async () => {
      mockIsTransactionProcessed.mockResolvedValue(false);
      mockAcquireTransactionLock.mockResolvedValue(true);
      mockProcessDeposit.mockResolvedValue({ isNew: false, depositId: 1 });
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      const log = createMockLog();
      await blockchain.processTransferEvent(log);

      // Verify order: first check if processed, then acquire lock
      expect(mockIsTransactionProcessed).toHaveBeenCalledBefore(mockAcquireTransactionLock);
    });

    it("should correctly decode address from topic", async () => {
      mockProcessDeposit.mockResolvedValue({ isNew: false, depositId: 1 });
      mockSetLastBlock.mockResolvedValue(undefined);

      const { blockchain } = await import("./blockchain.js");

      // Test with uppercase hex address in topic
      const log = createMockLog({
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000DEADBEEF1234567890ABCDEF1234567890ABCDEF",
          "0x0000000000000000000000004bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
        ],
      });
      await blockchain.processTransferEvent(log);

      expect(mockProcessDeposit).toHaveBeenCalledWith(
        "0xDEADBEEF1234567890ABCDEF1234567890ABCDEF",
        expect.any(Number),
        expect.any(String),
        expect.any(BigInt)
      );
    });
  });

  describe("getCurrentBlock", () => {
    it("should return current block number from HTTP client", async () => {
      mockGetBlockNumber.mockResolvedValue(BigInt(55000000));

      const { blockchain } = await import("./blockchain.js");
      const blockNumber = await blockchain.getCurrentBlock();

      expect(blockNumber).toBe(BigInt(55000000));
      expect(mockGetBlockNumber).toHaveBeenCalled();
    });
  });

  describe("startListening", () => {
    it("should set up event watcher for USDC transfers to Polymarket", async () => {
      mockWatchContractEvent.mockReturnValue(() => {});

      const { blockchain } = await import("./blockchain.js");
      await blockchain.startListening();

      expect(mockWatchContractEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
          eventName: "Transfer",
          args: {
            to: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
          },
        })
      );
    });

    it("should not start multiple listeners", async () => {
      mockWatchContractEvent.mockReturnValue(() => {});

      const { blockchain } = await import("./blockchain.js");
      await blockchain.startListening();
      await blockchain.startListening(); // Second call should be ignored

      expect(mockWatchContractEvent).toHaveBeenCalledTimes(1);
    });

    it("should call processTransferEvent for each log received", async () => {
      let capturedOnLogs: ((logs: Log[]) => Promise<void>) | undefined;

      mockWatchContractEvent.mockImplementation((options) => {
        capturedOnLogs = options.onLogs;
        return () => {};
      });

      const { blockchain } = await import("./blockchain.js");
      await blockchain.startListening();

      // Verify the callback was captured
      expect(capturedOnLogs).toBeDefined();

      // Now simulate receiving logs
      mockProcessDeposit.mockResolvedValue({ isNew: false, depositId: 1 });
      mockSetLastBlock.mockResolvedValue(undefined);

      const mockLogs: Log[] = [
        {
          address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x000000000000000000000000abc1234567890abcdef1234567890abcdef12345",
            "0x0000000000000000000000004bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
          ],
          data: "0x00000000000000000000000000000000000000000000000000000002540be400",
          blockHash: "0xblockhash",
          blockNumber: BigInt(50000000),
          transactionHash: "0xtxhash123",
          transactionIndex: 0,
          logIndex: 0,
          removed: false,
        },
      ];

      await capturedOnLogs!(mockLogs);

      expect(mockProcessDeposit).toHaveBeenCalled();
    });
  });
});
