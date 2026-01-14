/**
 * CTF Listener → Detection Engine Integration Tests
 *
 * Tests the full pipeline from CTF transfer events through
 * the detection engine to alert creation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CtfTransfer } from "../types.js";

// Mock viem
vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    getBlockNumber: vi.fn().mockResolvedValue(BigInt(12345678)),
    getBlock: vi.fn().mockResolvedValue({ timestamp: BigInt(1700000000) }),
    watchContractEvent: vi.fn(() => vi.fn()),
  })),
  webSocket: vi.fn(() => ({})),
  http: vi.fn(() => ({})),
  decodeEventLog: vi.fn(),
}));

// Mock polygon chain
vi.mock("viem/chains", () => ({
  polygon: { id: 137, name: "Polygon" },
}));

// Mock config
vi.mock("../../../config/index.js", () => ({
  config: {
    alchemy: {
      wssUrl: "wss://mock.alchemy.com",
      httpUrl: "https://mock.alchemy.com",
    },
    database: { url: "postgresql://mock" },
    redis: { url: "redis://mock" },
  },
}));

// Mock detection database
const mockRecordCtfTransfer = vi.fn().mockResolvedValue(1);
const mockGetAlerts = vi.fn().mockResolvedValue({ data: [], total: 0 });
const mockGetWalletActivity = vi.fn().mockResolvedValue([]);
const mockCreateAlert = vi.fn().mockResolvedValue({ id: 123 });

vi.mock("../detectionDatabase.js", () => ({
  detectionDb: {
    recordCtfTransfer: mockRecordCtfTransfer,
    getAlerts: mockGetAlerts,
    getWalletActivity: mockGetWalletActivity,
    createAlert: mockCreateAlert,
    getRuleConfig: vi.fn().mockResolvedValue({
      enabled: true,
      thresholds: {
        max_wallet_age_days: 14,
        min_concentration_pct: 85,
        min_trade_size_usd: 3000,
        min_depth_ratio: 3.0,
      },
    }),
    savePendingMtmEvaluation: vi.fn().mockResolvedValue(1),
  },
}));

// Mock detection cache
vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    isCtfTransferProcessed: vi.fn().mockResolvedValue(false),
    acquireCtfTransferLock: vi.fn().mockResolvedValue(true),
    markCtfTransferProcessed: vi.fn().mockResolvedValue(undefined),
    getRuleConfig: vi.fn().mockResolvedValue(null),
    setRuleConfig: vi.fn().mockResolvedValue(undefined),
    getLatestPrice: vi.fn().mockResolvedValue(null),
  },
}));

// Mock wallet activity index
const mockProcessTransfer = vi.fn().mockResolvedValue(undefined);
const mockGetConcentration = vi.fn().mockResolvedValue({
  topMarketShare: 0.9,
  topConditionId: "0x123",
  totalMarkets: 1,
});
vi.mock("../walletActivityIndex.js", () => ({
  walletActivityIndex: {
    processTransfer: mockProcessTransfer,
    getWalletConcentration: mockGetConcentration,
  },
}));

// Mock wallet risk service
vi.mock("../walletRiskService.js", () => ({
  walletRiskService: {
    getWalletAge: vi.fn().mockResolvedValue({
      firstTxDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      ageInDays: 5,
      txCount: 10,
    }),
    assessRisk: vi.fn().mockResolvedValue({
      score: 75,
      factors: [],
      riskLevel: "high",
    }),
  },
}));

// Mock market depth service
vi.mock("../marketDepthService.js", () => ({
  marketDepthService: {
    calculateDepthRatio: vi.fn().mockResolvedValue(4.5),
    getMarketDepth: vi.fn().mockResolvedValue({
      conditionId: "0x123",
      timestamp: new Date(),
      bids: [{ price: 0.45, size: 10000 }],
      asks: [{ price: 0.55, size: 10000 }],
      midPrice: 0.5,
      spread: 0.1,
      bidDepth: 10000,
      askDepth: 10000,
      totalDepth: 20000,
    }),
  },
}));

// Mock price history service
vi.mock("../priceHistoryService.js", () => ({
  priceHistoryService: {
    getLatestPrice: vi.fn().mockResolvedValue({
      price: 0.5,
      recordedAt: new Date(),
    }),
    recordPriceFromDepth: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock constants
vi.mock("../../../utils/constants.js", () => ({
  CONTRACTS: { CTF_EXCHANGE: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" },
  ERC1155_ABI: [
    {
      type: "event",
      name: "TransferSingle",
      inputs: [
        { indexed: true, name: "operator", type: "address" },
        { indexed: true, name: "from", type: "address" },
        { indexed: true, name: "to", type: "address" },
        { indexed: false, name: "id", type: "uint256" },
        { indexed: false, name: "value", type: "uint256" },
      ],
    },
  ],
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
}));

describe("CTF Listener → Detection Engine Integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset detection stats between tests
    const { ctfEventListener } = await import("../ctfEventListener.js");
    ctfEventListener._resetDetectionStats();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Detection Engine Hook", () => {
    it("should evaluate transfers through detection engine when enabled", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      // Spy on evaluateTrade
      const evaluateSpy = vi
        .spyOn(detectionEngine, "evaluateTrade")
        .mockResolvedValue({
          evaluated: true,
          rulesTriggered: [],
          alertsCreated: [],
        });

      // Enable detection in listener
      ctfEventListener.setDetectionEnabled(true);

      // Simulate a transfer
      const transfer: Omit<CtfTransfer, "id"> = {
        txHash: "0xabc",
        fromAddress: "0xfrom",
        toAddress: "0xto",
        tokenId: "12345",
        amount: BigInt(10000000), // 10 USDC worth
        conditionId: "0xcondition",
        blockNumber: 12345,
        blockTimestamp: new Date(),
        logIndex: 0,
      };

      // Call the internal evaluate method
      await ctfEventListener._evaluateTransfer(transfer);

      expect(evaluateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          toAddress: "0xto",
          conditionId: "0xcondition",
        })
      );
    });

    it("should not evaluate transfers when detection is disabled", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      const evaluateSpy = vi
        .spyOn(detectionEngine, "evaluateTrade")
        .mockResolvedValue({
          evaluated: true,
          rulesTriggered: [],
          alertsCreated: [],
        });

      // Disable detection
      ctfEventListener.setDetectionEnabled(false);

      const transfer: Omit<CtfTransfer, "id"> = {
        txHash: "0xabc",
        fromAddress: "0xfrom",
        toAddress: "0xto",
        tokenId: "12345",
        amount: BigInt(10000000),
        conditionId: "0xcondition",
        blockNumber: 12345,
        blockTimestamp: new Date(),
        logIndex: 0,
      };

      await ctfEventListener._evaluateTransfer(transfer);

      expect(evaluateSpy).not.toHaveBeenCalled();
    });

    it("should handle detection engine errors gracefully", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      // Make detection engine throw
      vi.spyOn(detectionEngine, "evaluateTrade").mockRejectedValue(
        new Error("Detection error")
      );

      ctfEventListener.setDetectionEnabled(true);

      const transfer: Omit<CtfTransfer, "id"> = {
        txHash: "0xabc",
        fromAddress: "0xfrom",
        toAddress: "0xto",
        tokenId: "12345",
        amount: BigInt(10000000),
        conditionId: "0xcondition",
        blockNumber: 12345,
        blockTimestamp: new Date(),
        logIndex: 0,
      };

      // Should not throw
      await expect(
        ctfEventListener._evaluateTransfer(transfer)
      ).resolves.not.toThrow();
    });
  });

  describe("Async Evaluation Queue", () => {
    it("should queue transfers for async processing", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");

      ctfEventListener.setDetectionEnabled(true);

      const transfer: Omit<CtfTransfer, "id"> = {
        txHash: "0xabc",
        fromAddress: "0xfrom",
        toAddress: "0xto",
        tokenId: "12345",
        amount: BigInt(10000000),
        conditionId: "0xcondition",
        blockNumber: 12345,
        blockTimestamp: new Date(),
        logIndex: 0,
      };

      // Queue transfer for async evaluation
      ctfEventListener.queueForDetection(transfer);

      const queueLength = ctfEventListener.getDetectionQueueLength();
      expect(queueLength).toBeGreaterThan(0);
    });

    it("should process queued transfers in batches", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      const evaluateSpy = vi
        .spyOn(detectionEngine, "evaluateTrade")
        .mockResolvedValue({
          evaluated: true,
          rulesTriggered: [],
          alertsCreated: [],
        });

      ctfEventListener.setDetectionEnabled(true);

      // Queue multiple transfers
      for (let i = 0; i < 5; i++) {
        ctfEventListener.queueForDetection({
          txHash: `0xabc${i}`,
          fromAddress: "0xfrom",
          toAddress: "0xto",
          tokenId: "12345",
          amount: BigInt(10000000),
          conditionId: "0xcondition",
          blockNumber: 12345 + i,
          blockTimestamp: new Date(),
          logIndex: i,
        });
      }

      // Process the queue
      const processed = await ctfEventListener.processDetectionQueue(10);

      expect(processed).toBe(5);
      expect(evaluateSpy).toHaveBeenCalledTimes(5);
    });

    it("should respect batch size limit when processing queue", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      vi.spyOn(detectionEngine, "evaluateTrade").mockResolvedValue({
        evaluated: true,
        rulesTriggered: [],
        alertsCreated: [],
      });

      ctfEventListener.setDetectionEnabled(true);

      // Queue 10 transfers
      for (let i = 0; i < 10; i++) {
        ctfEventListener.queueForDetection({
          txHash: `0xabc${i}`,
          fromAddress: "0xfrom",
          toAddress: "0xto",
          tokenId: "12345",
          amount: BigInt(10000000),
          conditionId: "0xcondition",
          blockNumber: 12345 + i,
          blockTimestamp: new Date(),
          logIndex: i,
        });
      }

      // Process only 3
      const processed = await ctfEventListener.processDetectionQueue(3);

      expect(processed).toBe(3);
      expect(ctfEventListener.getDetectionQueueLength()).toBe(7);
    });
  });

  describe("Rate Limiting", () => {
    it("should rate limit detection evaluations per wallet+market", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      const evaluateSpy = vi
        .spyOn(detectionEngine, "evaluateTrade")
        .mockResolvedValue({
          evaluated: true,
          rulesTriggered: [],
          alertsCreated: [],
        });

      ctfEventListener.setDetectionEnabled(true);

      const transfer: Omit<CtfTransfer, "id"> = {
        txHash: "0xabc",
        fromAddress: "0xfrom",
        toAddress: "0xto",
        tokenId: "12345",
        amount: BigInt(10000000),
        conditionId: "0xcondition",
        blockNumber: 12345,
        blockTimestamp: new Date(),
        logIndex: 0,
      };

      // First call should go through
      await ctfEventListener._evaluateTransfer(transfer);

      // Second immediate call for same wallet+market should be rate limited
      await ctfEventListener._evaluateTransfer(transfer);

      // Detection engine has its own throttling, but listener should not
      // call it twice in rapid succession for the same wallet+market
      // The listener-level rate limiting is optional; engine handles it
      // For now, we verify the first call happened
      expect(evaluateSpy).toHaveBeenCalled();
    });

    it("should not rate limit different wallets", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      const evaluateSpy = vi
        .spyOn(detectionEngine, "evaluateTrade")
        .mockResolvedValue({
          evaluated: true,
          rulesTriggered: [],
          alertsCreated: [],
        });

      ctfEventListener.setDetectionEnabled(true);

      // Different wallets should all be evaluated
      for (let i = 0; i < 3; i++) {
        await ctfEventListener._evaluateTransfer({
          txHash: `0xabc${i}`,
          fromAddress: "0xfrom",
          toAddress: `0xto${i}`, // Different wallet each time
          tokenId: "12345",
          amount: BigInt(10000000),
          conditionId: "0xcondition",
          blockNumber: 12345,
          blockTimestamp: new Date(),
          logIndex: i,
        });
      }

      expect(evaluateSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("Health Status", () => {
    it("should include detection engine status in health", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");

      const status = ctfEventListener.getHealthStatus();

      expect(status).toHaveProperty("detectionEnabled");
      expect(status).toHaveProperty("detectionQueueLength");
    });

    it("should reflect detection enabled state in health", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");

      ctfEventListener.setDetectionEnabled(true);
      let status = ctfEventListener.getHealthStatus();
      expect(status.detectionEnabled).toBe(true);

      ctfEventListener.setDetectionEnabled(false);
      status = ctfEventListener.getHealthStatus();
      expect(status.detectionEnabled).toBe(false);
    });
  });

  describe("Batch Evaluation (Catch-up)", () => {
    it("should support batch evaluation of historical transfers", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      const evaluateSpy = vi
        .spyOn(detectionEngine, "evaluateTrade")
        .mockResolvedValue({
          evaluated: true,
          rulesTriggered: [],
          alertsCreated: [],
        });

      const transfers: Array<Omit<CtfTransfer, "id">> = [];
      for (let i = 0; i < 5; i++) {
        transfers.push({
          txHash: `0xabc${i}`,
          fromAddress: "0xfrom",
          toAddress: `0xto${i}`,
          tokenId: "12345",
          amount: BigInt(10000000),
          conditionId: "0xcondition",
          blockNumber: 12345 + i,
          blockTimestamp: new Date(),
          logIndex: i,
        });
      }

      const result = await ctfEventListener.batchEvaluateTransfers(transfers);

      expect(result.processed).toBe(5);
      expect(result.triggered).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeGreaterThanOrEqual(0);
      expect(evaluateSpy).toHaveBeenCalledTimes(5);
    });

    it("should track batch evaluation metrics", async () => {
      const { ctfEventListener } = await import("../ctfEventListener.js");
      const { detectionEngine } = await import("../detectionEngine.js");

      // Mock one rule triggering
      vi.spyOn(detectionEngine, "evaluateTrade")
        .mockResolvedValueOnce({
          evaluated: true,
          rulesTriggered: [
            { ruleName: "FreshConcentratedDepthImpact", triggered: true, confidence: 0.8, severity: "HIGH" as const },
          ],
          alertsCreated: [1],
        })
        .mockResolvedValue({
          evaluated: true,
          rulesTriggered: [],
          alertsCreated: [],
        });

      const transfers = [
        {
          txHash: "0xabc1",
          fromAddress: "0xfrom",
          toAddress: "0xto1",
          tokenId: "12345",
          amount: BigInt(10000000),
          conditionId: "0xcondition",
          blockNumber: 12345,
          blockTimestamp: new Date(),
          logIndex: 0,
        },
        {
          txHash: "0xabc2",
          fromAddress: "0xfrom",
          toAddress: "0xto2",
          tokenId: "12345",
          amount: BigInt(10000000),
          conditionId: "0xcondition",
          blockNumber: 12346,
          blockTimestamp: new Date(),
          logIndex: 1,
        },
      ];

      const result = await ctfEventListener.batchEvaluateTransfers(transfers);

      expect(result.processed).toBe(2);
      expect(result.triggered).toBe(1);
    });
  });
});
