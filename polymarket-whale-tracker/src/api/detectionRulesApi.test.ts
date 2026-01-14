/**
 * Detection Rules API Tests
 *
 * TDD: RED phase - Tests for Phase 1.9 Detection API endpoints
 * Tests all new endpoints for detection rules, clusters, and price history.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

// Mock all required modules
vi.mock("../services/database.js", () => ({
  db: {
    getStats: vi.fn(),
    getAllWallets: vi.fn(),
    getWallet: vi.fn(),
    getRecentDeposits: vi.fn(),
    getFilteredWallets: vi.fn(),
    getWhaleOfTheDay: vi.fn(),
  },
}));

vi.mock("../services/trendingMarkets.js", () => ({
  trendingMarketsService: {
    getTrendingMarkets: vi.fn(),
  },
}));

vi.mock("../services/polymarketTradingCache.js", () => ({
  tradingCache: {
    getTradingData: vi.fn(),
    getOrFetchTradingData: vi.fn(),
  },
}));

vi.mock("../services/polymarketApi.js", () => ({
  polymarketApi: {
    getActivity: vi.fn().mockResolvedValue([]),
    getClosedPositions: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../services/blockchain.js", () => ({
  blockchain: {
    getHealthStatus: vi.fn().mockReturnValue({
      isRunning: false,
      healthy: true,
      consecutiveErrors: 0,
    }),
    startListening: vi.fn(),
  },
}));

// Mock insider detection services
vi.mock("../services/insiderDetection/index.js", () => ({
  detectionDb: {
    getStats: vi.fn().mockResolvedValue({
      totalAlerts: 0,
      newAlertsToday: 0,
      walletsTracked: 0,
      marketsMonitored: 0,
    }),
    getAlerts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getAlert: vi.fn(),
    updateAlertStatus: vi.fn().mockResolvedValue(true),
    getRuleConfig: vi.fn(),
    getAllRuleConfigs: vi.fn(),
    updateRuleConfig: vi.fn(),
    getClusterSummary: vi.fn(),
    getAllClusters: vi.fn(),
    getWalletCluster: vi.fn(),
    getPriceHistory: vi.fn(),
  },
  ctfEventListener: {
    getHealthStatus: vi.fn().mockReturnValue({
      isRunning: false,
      healthy: true,
      transfersProcessed: 0,
      transfersSkippedDuplicate: 0,
      consecutiveErrors: 0,
    }),
    startListening: vi.fn(),
  },
  marketMetadataService: {
    getStatus: vi.fn().mockReturnValue({
      isRunning: false,
      totalSynced: 0,
    }),
    warmCache: vi.fn().mockResolvedValue(undefined),
    startBackgroundSync: vi.fn(),
    getActiveMarkets: vi.fn().mockResolvedValue([]),
    getMarket: vi.fn(),
    triggerSync: vi.fn().mockResolvedValue({ synced: 0 }),
    getMarketsNearResolution: vi.fn().mockResolvedValue([]),
  },
  marketDepthService: {
    getStatus: vi.fn().mockReturnValue({
      isRunning: false,
      totalSnapshots: 0,
      marketsPolled: 0,
    }),
    startPolling: vi.fn(),
    getLatestDepth: vi.fn(),
    getDepthHistory: vi.fn().mockResolvedValue([]),
    getLiquidityAtTick: vi.fn(),
    calculateDepthRatio: vi.fn(),
    pollAllMarkets: vi.fn().mockResolvedValue(0),
  },
  fundingAnalyzer: {
    getFundingProfile: vi.fn().mockResolvedValue({}),
    analyzeFundingSources: vi.fn().mockResolvedValue({}),
    isRecentlyFunded: vi.fn().mockResolvedValue({ isRecent: false }),
    findWalletsWithSameFunder: vi.fn().mockResolvedValue([]),
  },
  walletRiskService: {
    getRiskProfile: vi.fn().mockResolvedValue({}),
  },
  loadConfig: vi.fn().mockResolvedValue({}),
  updateConfig: vi.fn().mockResolvedValue(true),
  detectionEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAllRuleConfigs: vi.fn(),
    getRuleConfig: vi.fn(),
    setRuleEnabled: vi.fn(),
    setRuleThresholds: vi.fn(),
    evaluateTrade: vi.fn(),
    evaluateWallet: vi.fn(),
    evaluateMarket: vi.fn(),
    getHealthStatus: vi.fn().mockReturnValue({
      initialized: true,
      rulesLoaded: 3,
      enabledRules: 3,
    }),
    getMetrics: vi.fn().mockReturnValue({
      evaluationsTotal: 0,
      alertsCreated: 0,
    }),
  },
  clusterService: {
    getWalletCluster: vi.fn(),
    getAllClusters: vi.fn(),
    getClusterActivity: vi.fn(),
    getStatus: vi.fn().mockReturnValue({
      isRefreshing: false,
      clustersBuilt: 0,
    }),
    refreshClusters: vi.fn(),
  },
  priceHistoryService: {
    getPrice: vi.fn(),
    getLatestPrice: vi.fn(),
    getPriceChange: vi.fn(),
    getPriceHistory: vi.fn(),
  },
}));

import { createApp } from "./server.js";
import {
  detectionEngine,
  clusterService,
  priceHistoryService,
  detectionDb,
} from "../services/insiderDetection/index.js";

describe("Detection Rules API", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Phase 1.9.1: GET /api/detection/rules
  // ============================================
  describe("GET /api/detection/rules", () => {
    const mockRuleConfigs = [
      {
        name: "CoordinatedCluster",
        description: "Detects coordinated trading from related wallets",
        enabled: true,
        thresholds: {
          min_cluster_size: 3,
          min_total_notional_usd: 50000,
          max_median_age_days: 45,
          time_window_hours: 6,
        },
        priority: 3,
      },
      {
        name: "PreMoveAdvantage",
        description: "Detects trades that gain significant value within lookback window",
        enabled: true,
        thresholds: {
          min_trade_size_usd: 3000,
          min_mtm_gain_pct: 8,
          lookback_hours: 1,
          vol_multiplier: 1.5,
        },
        priority: 2,
      },
      {
        name: "FreshConcentratedDepthImpact",
        description: "Detects new wallets with high concentration making impactful trades",
        enabled: true,
        thresholds: {
          max_wallet_age_days: 14,
          min_concentration_pct: 85,
          min_trade_size_usd: 3000,
          min_depth_ratio: 3.0,
        },
        priority: 1,
      },
    ];

    beforeEach(() => {
      vi.mocked(detectionEngine.getAllRuleConfigs).mockResolvedValue(mockRuleConfigs);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/detection/rules");
      expect(response.status).toBe(200);
    });

    it("should return an array of rules", async () => {
      const response = await request(app).get("/api/detection/rules");
      expect(Array.isArray(response.body.rules)).toBe(true);
    });

    it("should return rules sorted by priority (highest first)", async () => {
      const response = await request(app).get("/api/detection/rules");
      expect(response.body.rules[0].name).toBe("CoordinatedCluster");
      expect(response.body.rules[1].name).toBe("PreMoveAdvantage");
      expect(response.body.rules[2].name).toBe("FreshConcentratedDepthImpact");
    });

    it("should return rule fields", async () => {
      const response = await request(app).get("/api/detection/rules");
      const rule = response.body.rules[0];
      expect(rule).toHaveProperty("name");
      expect(rule).toHaveProperty("description");
      expect(rule).toHaveProperty("enabled");
      expect(rule).toHaveProperty("thresholds");
      expect(rule).toHaveProperty("priority");
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/api/detection/rules");
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should return 500 on engine error", async () => {
      vi.mocked(detectionEngine.getAllRuleConfigs).mockRejectedValue(
        new Error("Engine error")
      );
      const response = await request(app).get("/api/detection/rules");
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });

  // ============================================
  // Phase 1.9.2: GET /api/detection/rules/:name
  // ============================================
  describe("GET /api/detection/rules/:name", () => {
    const mockRuleConfig = {
      enabled: true,
      thresholds: {
        max_wallet_age_days: 14,
        min_concentration_pct: 85,
        min_trade_size_usd: 3000,
        min_depth_ratio: 3.0,
      },
    };

    beforeEach(() => {
      vi.mocked(detectionEngine.getRuleConfig).mockResolvedValue(mockRuleConfig);
    });

    it("should return 200 OK for valid rule name", async () => {
      const response = await request(app).get(
        "/api/detection/rules/FreshConcentratedDepthImpact"
      );
      expect(response.status).toBe(200);
    });

    it("should return rule configuration", async () => {
      const response = await request(app).get(
        "/api/detection/rules/FreshConcentratedDepthImpact"
      );
      expect(response.body).toHaveProperty("name", "FreshConcentratedDepthImpact");
      expect(response.body).toHaveProperty("enabled", true);
      expect(response.body).toHaveProperty("thresholds");
    });

    it("should return 404 for unknown rule", async () => {
      vi.mocked(detectionEngine.getRuleConfig).mockResolvedValue(null);
      const response = await request(app).get("/api/detection/rules/UnknownRule");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });

    it("should return thresholds object", async () => {
      const response = await request(app).get(
        "/api/detection/rules/FreshConcentratedDepthImpact"
      );
      expect(response.body.thresholds).toEqual(mockRuleConfig.thresholds);
    });
  });

  // ============================================
  // Phase 1.9.3: PATCH /api/detection/rules/:name
  // ============================================
  describe("PATCH /api/detection/rules/:name", () => {
    beforeEach(() => {
      vi.mocked(detectionEngine.getRuleConfig).mockResolvedValue({
        enabled: true,
        thresholds: { min_trade_size_usd: 3000 },
      });
      vi.mocked(detectionEngine.setRuleEnabled).mockResolvedValue(undefined);
      vi.mocked(detectionEngine.setRuleThresholds).mockResolvedValue(undefined);
    });

    it("should return 200 OK when updating enabled status", async () => {
      const response = await request(app)
        .patch("/api/detection/rules/FreshConcentratedDepthImpact")
        .send({ enabled: false });
      expect(response.status).toBe(200);
    });

    it("should call setRuleEnabled when enabled is provided", async () => {
      await request(app)
        .patch("/api/detection/rules/FreshConcentratedDepthImpact")
        .send({ enabled: false });
      expect(detectionEngine.setRuleEnabled).toHaveBeenCalledWith(
        "FreshConcentratedDepthImpact",
        false
      );
    });

    it("should return 200 OK when updating thresholds", async () => {
      const response = await request(app)
        .patch("/api/detection/rules/FreshConcentratedDepthImpact")
        .send({ thresholds: { min_trade_size_usd: 5000 } });
      expect(response.status).toBe(200);
    });

    it("should call setRuleThresholds when thresholds provided", async () => {
      const thresholds = { min_trade_size_usd: 5000, min_depth_ratio: 4.0 };
      await request(app)
        .patch("/api/detection/rules/FreshConcentratedDepthImpact")
        .send({ thresholds });
      expect(detectionEngine.setRuleThresholds).toHaveBeenCalledWith(
        "FreshConcentratedDepthImpact",
        thresholds
      );
    });

    it("should return 404 for unknown rule", async () => {
      vi.mocked(detectionEngine.getRuleConfig).mockResolvedValue(null);
      const response = await request(app)
        .patch("/api/detection/rules/UnknownRule")
        .send({ enabled: false });
      expect(response.status).toBe(404);
    });

    it("should return 400 when no update fields provided", async () => {
      const response = await request(app)
        .patch("/api/detection/rules/FreshConcentratedDepthImpact")
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return updated rule config", async () => {
      vi.mocked(detectionEngine.getRuleConfig)
        .mockResolvedValueOnce({ enabled: true, thresholds: {} })
        .mockResolvedValueOnce({ enabled: false, thresholds: {} });

      const response = await request(app)
        .patch("/api/detection/rules/FreshConcentratedDepthImpact")
        .send({ enabled: false });

      expect(response.body).toHaveProperty("name");
      expect(response.body).toHaveProperty("enabled", false);
    });
  });

  // ============================================
  // Phase 1.9.4: POST /api/detection/rules/:name/evaluate
  // ============================================
  describe("POST /api/detection/rules/:name/evaluate", () => {
    beforeEach(() => {
      vi.mocked(detectionEngine.getRuleConfig).mockResolvedValue({
        enabled: true,
        thresholds: {},
      });
      vi.mocked(detectionEngine.evaluateWallet).mockResolvedValue({
        evaluated: true,
        rulesTriggered: [],
        alertsCreated: [],
        errors: [],
      });
      vi.mocked(detectionEngine.evaluateMarket).mockResolvedValue({
        evaluated: true,
        rulesTriggered: [],
        alertsCreated: [],
        errors: [],
      });
    });

    it("should return 200 OK for wallet evaluation", async () => {
      const response = await request(app)
        .post("/api/detection/rules/FreshConcentratedDepthImpact/evaluate")
        .send({ walletAddress: "0x1234567890123456789012345678901234567890" });
      expect(response.status).toBe(200);
    });

    it("should call evaluateWallet for wallet target", async () => {
      await request(app)
        .post("/api/detection/rules/FreshConcentratedDepthImpact/evaluate")
        .send({
          walletAddress: "0x1234567890123456789012345678901234567890",
          conditionId: "condition123",
        });
      expect(detectionEngine.evaluateWallet).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890",
        "condition123"
      );
    });

    it("should return 200 OK for market evaluation", async () => {
      const response = await request(app)
        .post("/api/detection/rules/CoordinatedCluster/evaluate")
        .send({ conditionId: "condition123" });
      expect(response.status).toBe(200);
    });

    it("should call evaluateMarket for CoordinatedCluster with only conditionId", async () => {
      await request(app)
        .post("/api/detection/rules/CoordinatedCluster/evaluate")
        .send({ conditionId: "condition123" });
      expect(detectionEngine.evaluateMarket).toHaveBeenCalledWith("condition123");
    });

    it("should return 404 for unknown rule", async () => {
      vi.mocked(detectionEngine.getRuleConfig).mockResolvedValue(null);
      const response = await request(app)
        .post("/api/detection/rules/UnknownRule/evaluate")
        .send({ walletAddress: "0x1234567890123456789012345678901234567890" });
      expect(response.status).toBe(404);
    });

    it("should return 400 when no target provided", async () => {
      const response = await request(app)
        .post("/api/detection/rules/FreshConcentratedDepthImpact/evaluate")
        .send({});
      expect(response.status).toBe(400);
    });

    it("should return evaluation result", async () => {
      const mockResult = {
        evaluated: true,
        rulesTriggered: [{ ruleName: "FreshConcentratedDepthImpact", triggered: true }],
        alertsCreated: [1],
        errors: [],
      };
      vi.mocked(detectionEngine.evaluateWallet).mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/detection/rules/FreshConcentratedDepthImpact/evaluate")
        .send({ walletAddress: "0x1234567890123456789012345678901234567890" });

      expect(response.body).toHaveProperty("evaluated", true);
      expect(response.body).toHaveProperty("rulesTriggered");
      expect(response.body).toHaveProperty("alertsCreated");
    });
  });

  // ============================================
  // Phase 1.9.5: GET /api/detection/clusters
  // ============================================
  describe("GET /api/detection/clusters", () => {
    const mockClusters = [
      {
        clusterId: "cluster_12345678",
        wallets: ["0xabc...", "0xdef..."],
        walletCount: 2,
        avgStrength: 0.75,
        dominantRelationship: "shared_funder",
      },
      {
        clusterId: "cluster_87654321",
        wallets: ["0x111...", "0x222...", "0x333..."],
        walletCount: 3,
        avgStrength: 0.85,
        dominantRelationship: "timing_correlation",
      },
    ];

    beforeEach(() => {
      vi.mocked(clusterService.getAllClusters).mockResolvedValue(mockClusters);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/detection/clusters");
      expect(response.status).toBe(200);
    });

    it("should return array of clusters", async () => {
      const response = await request(app).get("/api/detection/clusters");
      expect(Array.isArray(response.body.clusters)).toBe(true);
    });

    it("should return cluster fields", async () => {
      const response = await request(app).get("/api/detection/clusters");
      const cluster = response.body.clusters[0];
      expect(cluster).toHaveProperty("clusterId");
      expect(cluster).toHaveProperty("wallets");
      expect(cluster).toHaveProperty("walletCount");
    });

    it("should include total count", async () => {
      const response = await request(app).get("/api/detection/clusters");
      expect(response.body).toHaveProperty("total", 2);
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/api/detection/clusters");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  // ============================================
  // Phase 1.9.6: GET /api/detection/clusters/:clusterId
  // ============================================
  describe("GET /api/detection/clusters/:clusterId", () => {
    const mockCluster = {
      clusterId: "cluster_12345678",
      wallets: [
        "0xabc1234567890123456789012345678901234567",
        "0xdef1234567890123456789012345678901234567",
      ],
      walletCount: 2,
      avgStrength: 0.75,
      dominantRelationship: "shared_funder",
      relationships: [
        {
          wallet1: "0xabc...",
          wallet2: "0xdef...",
          type: "shared_funder",
          strength: 0.75,
        },
      ],
    };

    beforeEach(() => {
      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(mockCluster);
    });

    it("should return 200 OK for valid cluster ID", async () => {
      const response = await request(app).get(
        "/api/detection/clusters/cluster_12345678"
      );
      expect(response.status).toBe(200);
    });

    it("should return cluster details", async () => {
      const response = await request(app).get(
        "/api/detection/clusters/cluster_12345678"
      );
      expect(response.body).toHaveProperty("clusterId", "cluster_12345678");
      expect(response.body).toHaveProperty("wallets");
      expect(response.body).toHaveProperty("walletCount");
    });

    it("should return 404 for unknown cluster", async () => {
      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(null);
      const response = await request(app).get(
        "/api/detection/clusters/unknown_cluster"
      );
      expect(response.status).toBe(404);
    });

    it("should include relationships", async () => {
      const response = await request(app).get(
        "/api/detection/clusters/cluster_12345678"
      );
      expect(response.body).toHaveProperty("relationships");
    });
  });

  // ============================================
  // Phase 1.9.7: GET /api/detection/wallets/:address/cluster
  // ============================================
  describe("GET /api/detection/wallets/:address/cluster", () => {
    const mockClusterInfo = {
      clusterId: "cluster_12345678",
      wallets: [
        "0x1234567890123456789012345678901234567890",
        "0xdef1234567890123456789012345678901234567",
      ],
      walletCount: 2,
      avgStrength: 0.75,
      dominantRelationship: "shared_funder",
    };

    beforeEach(() => {
      vi.mocked(clusterService.getWalletCluster).mockResolvedValue(mockClusterInfo);
    });

    it("should return 200 OK for wallet with cluster", async () => {
      const response = await request(app).get(
        "/api/detection/wallets/0x1234567890123456789012345678901234567890/cluster"
      );
      expect(response.status).toBe(200);
    });

    it("should return cluster membership info", async () => {
      const response = await request(app).get(
        "/api/detection/wallets/0x1234567890123456789012345678901234567890/cluster"
      );
      expect(response.body).toHaveProperty("clusterId");
      expect(response.body).toHaveProperty("wallets");
    });

    it("should return 404 when wallet has no cluster", async () => {
      vi.mocked(clusterService.getWalletCluster).mockResolvedValue(null);
      const response = await request(app).get(
        "/api/detection/wallets/0x1234567890123456789012345678901234567890/cluster"
      );
      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid address", async () => {
      const response = await request(app).get(
        "/api/detection/wallets/invalid-address/cluster"
      );
      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // Phase 1.9.8: GET /api/detection/markets/:conditionId/price-history
  // ============================================
  describe("GET /api/detection/markets/:conditionId/price-history", () => {
    const mockPriceHistory = [
      { price: 0.55, recordedAt: new Date("2024-01-15T10:00:00Z"), source: "clob" },
      { price: 0.56, recordedAt: new Date("2024-01-15T10:30:00Z"), source: "clob" },
      { price: 0.58, recordedAt: new Date("2024-01-15T11:00:00Z"), source: "clob" },
    ];

    beforeEach(() => {
      vi.mocked(priceHistoryService.getPriceHistory).mockResolvedValue(mockPriceHistory);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get(
        "/api/detection/markets/condition123/price-history"
      );
      expect(response.status).toBe(200);
    });

    it("should return array of price points", async () => {
      const response = await request(app).get(
        "/api/detection/markets/condition123/price-history"
      );
      expect(Array.isArray(response.body.prices)).toBe(true);
    });

    it("should return price fields", async () => {
      const response = await request(app).get(
        "/api/detection/markets/condition123/price-history"
      );
      const price = response.body.prices[0];
      expect(price).toHaveProperty("price");
      expect(price).toHaveProperty("recordedAt");
      expect(price).toHaveProperty("source");
    });

    it("should respect hours query parameter", async () => {
      await request(app).get(
        "/api/detection/markets/condition123/price-history?hours=6"
      );
      expect(priceHistoryService.getPriceHistory).toHaveBeenCalledWith(
        "condition123",
        expect.any(Date),
        expect.any(Date)
      );
    });

    it("should default to 24 hours", async () => {
      await request(app).get(
        "/api/detection/markets/condition123/price-history"
      );
      expect(priceHistoryService.getPriceHistory).toHaveBeenCalledWith(
        "condition123",
        expect.any(Date),
        expect.any(Date)
      );
    });

    it("should include conditionId in response", async () => {
      const response = await request(app).get(
        "/api/detection/markets/condition123/price-history"
      );
      expect(response.body).toHaveProperty("conditionId", "condition123");
    });

    it("should include count and hours in response", async () => {
      const response = await request(app).get(
        "/api/detection/markets/condition123/price-history?hours=12"
      );
      expect(response.body).toHaveProperty("count", 3);
      expect(response.body).toHaveProperty("hours", 12);
    });
  });

  // ============================================
  // Phase 1.9.9: POST /api/detection/evaluate
  // ============================================
  describe("POST /api/detection/evaluate", () => {
    beforeEach(() => {
      vi.mocked(detectionEngine.evaluateWallet).mockResolvedValue({
        evaluated: true,
        rulesTriggered: [],
        alertsCreated: [],
        errors: [],
      });
      vi.mocked(detectionEngine.evaluateMarket).mockResolvedValue({
        evaluated: true,
        rulesTriggered: [],
        alertsCreated: [],
        errors: [],
      });
    });

    it("should return 200 OK for wallet evaluation", async () => {
      const response = await request(app)
        .post("/api/detection/evaluate")
        .send({
          walletAddress: "0x1234567890123456789012345678901234567890",
        });
      expect(response.status).toBe(200);
    });

    it("should evaluate wallet against all rules", async () => {
      await request(app)
        .post("/api/detection/evaluate")
        .send({
          walletAddress: "0x1234567890123456789012345678901234567890",
          conditionId: "condition123",
        });
      expect(detectionEngine.evaluateWallet).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890",
        "condition123"
      );
    });

    it("should return 200 OK for market evaluation", async () => {
      const response = await request(app)
        .post("/api/detection/evaluate")
        .send({ conditionId: "condition123" });
      expect(response.status).toBe(200);
    });

    it("should evaluate market for cluster activity", async () => {
      await request(app)
        .post("/api/detection/evaluate")
        .send({ conditionId: "condition123" });
      expect(detectionEngine.evaluateMarket).toHaveBeenCalledWith("condition123");
    });

    it("should return 400 when no target provided", async () => {
      const response = await request(app)
        .post("/api/detection/evaluate")
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return evaluation results", async () => {
      const mockResult = {
        evaluated: true,
        rulesTriggered: [
          { ruleName: "FreshConcentratedDepthImpact", triggered: true, confidence: 0.8 },
        ],
        alertsCreated: [42],
        errors: [],
      };
      vi.mocked(detectionEngine.evaluateWallet).mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/detection/evaluate")
        .send({
          walletAddress: "0x1234567890123456789012345678901234567890",
        });

      expect(response.body).toHaveProperty("evaluated", true);
      expect(response.body).toHaveProperty("rulesTriggered");
      expect(response.body.alertsCreated).toContain(42);
    });

    it("should return 400 for invalid wallet address", async () => {
      const response = await request(app)
        .post("/api/detection/evaluate")
        .send({ walletAddress: "invalid-address" });
      expect(response.status).toBe(400);
    });

    it("should include timestamp in response", async () => {
      const response = await request(app)
        .post("/api/detection/evaluate")
        .send({
          walletAddress: "0x1234567890123456789012345678901234567890",
        });
      expect(response.body).toHaveProperty("timestamp");
    });
  });
});
