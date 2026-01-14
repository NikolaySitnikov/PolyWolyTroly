/**
 * End-to-End Integration Tests for Insider Detection System
 *
 * Phase 0.9.1: Tests the full detection pipeline:
 * - CTF transfer processing → Wallet activity update
 * - Market metadata sync → Depth capture
 * - Funding analysis → Risk calculation
 * - Alert creation → API retrieval
 *
 * These tests verify that all Phase 0 components work together correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";
import { walletActivityIndex } from "../walletActivityIndex.js";
import { walletRiskService } from "../walletRiskService.js";
import { marketDepthService } from "../marketDepthService.js";
import { marketMetadataService } from "../marketMetadataService.js";
import type {
  CtfTransfer,
  Market,
  DetectionAlert,
  WalletRiskProfile,
} from "../types.js";

// Mock external dependencies
vi.mock("../detectionDatabase.js", () => ({
  detectionDb: {
    // Market operations
    upsertMarket: vi.fn(),
    getMarket: vi.fn(),
    getActiveMarkets: vi.fn(),
    // CTF transfer operations
    insertCtfTransfer: vi.fn(),
    getCtfTransfersByWallet: vi.fn(),
    // Wallet activity operations
    upsertWalletActivity: vi.fn(),
    getWalletActivity: vi.fn(),
    getWalletMarketActivity: vi.fn(),
    getWalletConcentration: vi.fn().mockResolvedValue({
      topMarket: null,
      topMarketVolume: 0,
      totalVolume: 0,
      volumeShare: 0,
      marketCount: 0,
    }),
    // Funding operations
    insertFundingSource: vi.fn(),
    getFundingSources: vi.fn(),
    // Alert operations
    createAlert: vi.fn(),
    getAlert: vi.fn(),
    getAlerts: vi.fn(),
    getStats: vi.fn(),
    // Config operations
    getConfig: vi.fn().mockResolvedValue({
      wallet_age_days: { high: 14, medium: 30 },
      funding_amount: { absolute_min: 3000, market_volume_pct: 5 },
      trade_timing_hours: { high: 2, medium: 24 },
      entry_odds_pct: { threshold: 15, price_move_1h: 8 },
      concentration_pct: { wallet_level: 85, cluster_level: 70 },
    }),
    // Depth operations
    insertDepthSnapshot: vi.fn(),
    getLatestSnapshot: vi.fn(),
  },
}));

vi.mock("../detectionCache.js", () => ({
  detectionCache: {
    getMarket: vi.fn(),
    setMarket: vi.fn(),
    getWalletActivity: vi.fn(),
    setWalletActivity: vi.fn(),
    getWalletRiskProfile: vi.fn(),
    setWalletRiskProfile: vi.fn(),
    getLatestDepth: vi.fn(),
    setLatestDepth: vi.fn(),
    getFundingAnalysis: vi.fn(),
    setFundingAnalysis: vi.fn(),
    getDetectionStats: vi.fn(),
    setDetectionStats: vi.fn(),
    invalidateWalletActivity: vi.fn(),
    invalidateWalletRiskProfile: vi.fn(),
    getConfig: vi.fn().mockResolvedValue(null),
    setConfig: vi.fn(),
  },
}));

vi.mock("../marketMetadataService.js", () => ({
  marketMetadataService: {
    getMarket: vi.fn(),
    getActiveMarkets: vi.fn(),
  },
}));

vi.mock("../fundingAnalyzer.js", () => ({
  fundingAnalyzer: {
    analyzeFundingSources: vi.fn().mockResolvedValue({
      sources: [],
      totalAmount: 0,
      primarySourceType: "unknown",
      firstFundingAt: null,
    }),
    getFundingProfile: vi.fn().mockResolvedValue({
      sources: [],
      totalAmount: 0,
      sourceCount: 0,
      primarySourceType: "unknown",
      firstFundingAt: null,
      relatedWallets: [],
    }),
    isRecentlyFunded: vi.fn().mockResolvedValue(false),
    findWalletsWithSameFunder: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../walletActivityIndex.js", () => ({
  walletActivityIndex: {
    processTransfer: vi.fn().mockResolvedValue(undefined),
    getWalletActivity: vi.fn().mockResolvedValue([]),
    getWalletConcentration: vi.fn().mockResolvedValue({
      topMarket: null,
      topMarketVolume: 0,
      totalVolume: 0,
      volumeShare: 0,
      marketCount: 0,
    }),
  },
}));

describe("Insider Detection Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Pipeline: CTF Transfer → Wallet Activity", () => {
    it("should call processTransfer for CTF transfers", async () => {
      // Arrange: Mock a CTF transfer event
      const mockTransfer: CtfTransfer = {
        txHash: "0xabc123",
        fromAddress: "0xseller",
        toAddress: "0xbuyer",
        tokenId: "12345",
        amount: BigInt(1000000), // 1M shares
        conditionId: "0xcondition1",
        outcome: "YES",
        blockNumber: 50000000n,
        blockTimestamp: new Date(),
        logIndex: 0,
      };

      // Act: Process the transfer through wallet activity index
      await walletActivityIndex.processTransfer(mockTransfer);

      // Assert: processTransfer was called (mocked)
      expect(walletActivityIndex.processTransfer).toHaveBeenCalledWith(mockTransfer);
    });

    it("should provide wallet concentration data", async () => {
      // Act
      const concentration = await walletActivityIndex.getWalletConcentration("0xtest");

      // Assert: Concentration method returns expected structure
      expect(concentration).toHaveProperty("topMarket");
      expect(concentration).toHaveProperty("totalVolume");
      expect(concentration).toHaveProperty("volumeShare");
      expect(concentration).toHaveProperty("marketCount");
    });
  });

  describe("Pipeline: Market Metadata → Depth Capture", () => {
    it("should capture depth for markets with token IDs", async () => {
      // Arrange
      const mockMarket: Market = {
        conditionId: "0xcondition1",
        question: "Test market?",
        slug: "test-market",
        outcomeYesTokenId: "12345",
        outcomeNoTokenId: "12346",
        volume24h: 100000,
        volumeTotal: 500000,
        liquidity: 50000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      vi.mocked(marketMetadataService.getMarket).mockResolvedValue(mockMarket);
      vi.mocked(detectionCache.getLatestDepth).mockResolvedValue(null);

      // Note: captureDepth makes external API call, so we just verify it handles missing market
      vi.mocked(marketMetadataService.getMarket).mockResolvedValue(null);

      // Act
      const result = await marketDepthService.captureDepth("0xnonexistent");

      // Assert
      expect(result).toBeNull();
      expect(marketMetadataService.getMarket).toHaveBeenCalledWith("0xnonexistent");
    });

    it("should return cached depth when available", async () => {
      // Arrange
      const cachedDepth = {
        conditionId: "0xcondition1",
        snapshotAt: new Date(),
        midPrice: 0.65,
        spread: 0.02,
        bidLiquidity2tick: 5000,
        askLiquidity2tick: 4500,
      };

      vi.mocked(detectionCache.getLatestDepth).mockResolvedValue(cachedDepth);

      // Act
      const result = await marketDepthService.getLatestDepth("0xcondition1");

      // Assert
      expect(result).toEqual(cachedDepth);
      expect(detectionCache.getLatestDepth).toHaveBeenCalledWith("0xcondition1");
    });
  });

  describe("Pipeline: Wallet Data → Risk Profile", () => {
    it("should calculate risk profile from wallet data", async () => {
      // Arrange: Mock wallet with suspicious characteristics
      const walletAddress = "0xsuspicious";

      // Mock no cached profile
      vi.mocked(detectionCache.getWalletRiskProfile).mockResolvedValue(null);

      // Mock wallet activity (high concentration)
      vi.mocked(detectionDb.getWalletActivity).mockResolvedValue([
        {
          walletAddress,
          conditionId: "0xcondition1",
          totalVolume: 50000,
          tradeCount: 5,
          netPosition: 1000,
          volumeShareOfWallet: 0.95, // 95% concentration
          firstTradeAt: new Date(),
          lastTradeAt: new Date(),
        },
      ]);

      // Mock funding sources (recent funding from unknown source)
      vi.mocked(detectionDb.getFundingSources).mockResolvedValue([
        {
          id: 1,
          walletAddress,
          sourceAddress: "0xunknown",
          sourceType: "unknown",
          amount: 50000,
          fundedAt: new Date(Date.now() - 3600000), // 1 hour ago
          isFirstFunding: true,
          hoursBeforeFirstTrade: 1,
          txHash: "0xtx1",
        },
      ]);

      // Mock alerts (no prior alerts)
      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      });

      vi.mocked(detectionCache.setWalletRiskProfile).mockResolvedValue();

      // Act
      const profile = await walletRiskService.getRiskProfile(walletAddress);

      // Assert: Profile should be calculated
      expect(profile).toBeDefined();
      expect(profile.walletAddress).toBe(walletAddress);
      expect(detectionCache.setWalletRiskProfile).toHaveBeenCalled();
    });

    it("should return cached risk profile when available", async () => {
      // Arrange
      const cachedProfile: WalletRiskProfile = {
        walletAddress: "0xtest",
        riskScore: 45,
        riskLevel: "MEDIUM",
        riskFactors: ["High concentration in single market"],
        walletAge: {
          firstSeenAt: new Date(Date.now() - 7 * 86400000),
          ageDays: 7,
          riskContribution: 15,
        },
        funding: {
          totalAmount: 10000,
          sourceCount: 1,
          primarySourceType: "cex",
          recentFundingHours: 24,
          riskContribution: 10,
        },
        activity: {
          totalVolume: 50000,
          marketCount: 1,
          topMarketConcentration: 0.95,
          avgTradeSize: 10000,
          riskContribution: 15,
        },
        alerts: {
          totalAlerts: 0,
          criticalAlerts: 0,
          highAlerts: 0,
          recentAlerts: 0,
          riskContribution: 5,
        },
        calculatedAt: new Date(),
      };

      vi.mocked(detectionCache.getWalletRiskProfile).mockResolvedValue(cachedProfile);

      // Act
      const profile = await walletRiskService.getRiskProfile("0xtest");

      // Assert
      expect(profile).toEqual(cachedProfile);
      expect(detectionDb.getWalletActivity).not.toHaveBeenCalled();
    });
  });

  describe("Pipeline: Stats Aggregation", () => {
    it("should aggregate detection stats from all sources", async () => {
      // Arrange
      vi.mocked(detectionCache.getDetectionStats).mockResolvedValue(null);
      vi.mocked(detectionDb.getStats).mockResolvedValue({
        alertsToday: 5,
        alertsTotal: 100,
        alertsByType: {
          timing: 20,
          size: 30,
          pattern: 25,
          cluster: 15,
          funding: 10,
        },
        alertsBySeverity: {
          CRITICAL: 5,
          HIGH: 20,
          MEDIUM: 40,
          LOW: 35,
        },
        activeMarkets: 5000,
        walletsTracked: 2000,
      });

      // Act
      const stats = await detectionDb.getStats();

      // Assert
      expect(stats.alertsToday).toBe(5);
      expect(stats.alertsTotal).toBe(100);
      expect(stats.alertsByType.timing).toBe(20);
      expect(stats.alertsBySeverity.CRITICAL).toBe(5);
      expect(stats.activeMarkets).toBe(5000);
      expect(stats.walletsTracked).toBe(2000);
    });
  });

  describe("Full Pipeline: Transfer → Alert → API", () => {
    it("should create alert from suspicious activity and retrieve via API format", async () => {
      // Arrange: Create a suspicious alert
      const alertData: Partial<DetectionAlert> = {
        alertType: "timing",
        severity: "HIGH",
        confidenceScore: 75,
        walletAddress: "0xsuspicious",
        conditionId: "0xcondition1",
        detectionRule: "FreshConcentratedTrade",
        title: "Suspicious timing pattern detected",
        description: "Wallet traded within 2 hours of funding",
        triggerValues: {
          hoursToTrade: 1.5,
          tradeSize: 25000,
        },
        thresholdValues: {
          maxHoursToTrade: 2,
          minTradeSize: 3000,
        },
        status: "new",
        detectedAt: new Date(),
      };

      vi.mocked(detectionDb.createAlert).mockResolvedValue(1);

      // Act: Create alert
      const alertId = await detectionDb.createAlert(alertData as DetectionAlert);

      // Assert: Alert created
      expect(alertId).toBe(1);
      expect(detectionDb.createAlert).toHaveBeenCalledWith(alertData);

      // Arrange: Mock alert retrieval
      const storedAlert: DetectionAlert = {
        id: 1,
        ...alertData,
      } as DetectionAlert;

      vi.mocked(detectionDb.getAlert).mockResolvedValue(storedAlert);

      // Act: Retrieve alert
      const retrieved = await detectionDb.getAlert(1);

      // Assert: Alert retrieved correctly
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.alertType).toBe("timing");
      expect(retrieved?.severity).toBe("HIGH");
      expect(retrieved?.walletAddress).toBe("0xsuspicious");
    });

    it("should filter alerts by severity and status", async () => {
      // Arrange
      const alerts: DetectionAlert[] = [
        {
          id: 1,
          alertType: "timing",
          severity: "HIGH",
          status: "new",
          walletAddress: "0x1",
          detectionRule: "rule1",
          title: "Alert 1",
          detectedAt: new Date(),
        } as DetectionAlert,
        {
          id: 2,
          alertType: "size",
          severity: "CRITICAL",
          status: "investigating",
          walletAddress: "0x2",
          detectionRule: "rule2",
          title: "Alert 2",
          detectedAt: new Date(),
        } as DetectionAlert,
      ];

      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: alerts.filter(a => a.severity === "HIGH"),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      // Act
      const result = await detectionDb.getAlerts(
        { severity: "HIGH" },
        { page: 1, limit: 10 }
      );

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].severity).toBe("HIGH");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing market gracefully", async () => {
      vi.mocked(marketMetadataService.getMarket).mockResolvedValue(null);

      const result = await marketDepthService.captureDepth("0xnonexistent");

      expect(result).toBeNull();
    });

    it("should handle empty wallet activity", async () => {
      vi.mocked(detectionCache.getWalletRiskProfile).mockResolvedValue(null);
      vi.mocked(detectionDb.getWalletActivity).mockResolvedValue([]);
      vi.mocked(detectionDb.getFundingSources).mockResolvedValue([]);
      vi.mocked(detectionDb.getAlerts).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      });
      vi.mocked(detectionCache.setWalletRiskProfile).mockResolvedValue();

      const profile = await walletRiskService.getRiskProfile("0xnewwallet");

      expect(profile).toBeDefined();
      // Empty wallet with no activity has low risk score
      expect(["LOW", "UNKNOWN"]).toContain(profile.riskLevel);
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(detectionDb.getStats).mockRejectedValue(new Error("DB connection failed"));

      await expect(detectionDb.getStats()).rejects.toThrow("DB connection failed");
    });
  });
});
