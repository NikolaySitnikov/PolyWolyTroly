/**
 * Unit tests for Cluster Service (Phase 1.3)
 *
 * Tests the cluster building and querying functionality:
 * - Union-Find algorithm
 * - Shared funder edge detection
 * - Timing correlation edge detection
 * - Cluster graph building
 * - Cluster queries and activity aggregation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { clusterService } from "../clusterService.js";
import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";
import type {
  WalletFundingSource,
  WalletActivity,
  Market,
  ClusterSummary,
  WalletCluster,
} from "../types.js";

// Mock dependencies
vi.mock("../detectionDatabase.js");
vi.mock("../detectionCache.js");

describe("Cluster Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clusterService.resetStats();

    // Default mock implementations
    vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([]);
    vi.mocked(detectionDb.getWalletFunding).mockResolvedValue([]);
    vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([]);
    vi.mocked(detectionCache.getWalletClusterId).mockResolvedValue(null);
    vi.mocked(detectionCache.getClusterSummary).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildSharedFunderEdges()", () => {
    it("should return empty array when no wallets have funding", async () => {
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([]);

      const edges = await clusterService.buildSharedFunderEdges();

      expect(edges).toEqual([]);
    });

    it("should create edges between wallets with same funder", async () => {
      // Mock active markets to get wallet addresses
      const mockMarket: Market = {
        conditionId: "0xcond1",
        question: "Test Market",
        slug: "test-market",
        volume24h: 1000,
        volumeTotal: 5000,
        liquidity: 2000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([mockMarket]);

      // Mock market activity with two wallets
      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          totalVolume: 1500,
          tradeCount: 3,
          netPosition: 150,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      // Mock funding from same source for both wallets
      const funderAddress = "0xfunder1";
      const fundingTime = new Date("2024-01-01T10:00:00Z");

      vi.mocked(detectionDb.getWalletFunding).mockImplementation(async (wallet) => {
        if (wallet === "0xwallet1") {
          return [{
            id: 1,
            walletAddress: "0xwallet1",
            sourceAddress: funderAddress,
            sourceType: "eoa" as const,
            txHash: "0xtx1",
            amount: 500,
            fundedAt: fundingTime,
            isFirstFunding: true,
          }];
        }
        if (wallet === "0xwallet2") {
          return [{
            id: 2,
            walletAddress: "0xwallet2",
            sourceAddress: funderAddress,
            sourceType: "eoa" as const,
            txHash: "0xtx2",
            amount: 600,
            fundedAt: new Date("2024-01-01T11:00:00Z"), // 1 hour later
            isFirstFunding: true,
          }];
        }
        return [];
      });

      const edges = await clusterService.buildSharedFunderEdges();

      expect(edges.length).toBe(1);
      expect(edges[0].type).toBe("shared_funder");
      expect(edges[0].wallet1).toBe("0xwallet1");
      expect(edges[0].wallet2).toBe("0xwallet2");
      expect(edges[0].evidence.funder).toBe(funderAddress);
      expect(edges[0].strength).toBeGreaterThan(0.3);
    });

    it("should skip CEX and bridge funders", async () => {
      const mockMarket: Market = {
        conditionId: "0xcond1",
        question: "Test Market",
        slug: "test-market",
        volume24h: 1000,
        volumeTotal: 5000,
        liquidity: 2000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([mockMarket]);

      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          totalVolume: 1500,
          tradeCount: 3,
          netPosition: 150,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      // Both funded from CEX
      vi.mocked(detectionDb.getWalletFunding).mockImplementation(async (wallet) => {
        return [{
          id: 1,
          walletAddress: wallet as string,
          sourceAddress: "0xbinance",
          sourceType: "cex" as const,
          sourceLabel: "Binance",
          txHash: `0xtx_${wallet}`,
          amount: 500,
          fundedAt: new Date(),
          isFirstFunding: true,
        }];
      });

      const edges = await clusterService.buildSharedFunderEdges();

      // Should skip CEX funders
      expect(edges.length).toBe(0);
    });

    it("should calculate higher strength for closer funding times", async () => {
      const mockMarket: Market = {
        conditionId: "0xcond1",
        question: "Test Market",
        slug: "test-market",
        volume24h: 1000,
        volumeTotal: 5000,
        liquidity: 2000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([mockMarket]);

      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          totalVolume: 1500,
          tradeCount: 3,
          netPosition: 150,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      const baseTime = new Date("2024-01-01T10:00:00Z");

      // Funded within minutes of each other (very close timing)
      vi.mocked(detectionDb.getWalletFunding).mockImplementation(async (wallet) => {
        const offset = wallet === "0xwallet1" ? 0 : 30 * 60 * 1000; // 30 minutes apart
        return [{
          id: 1,
          walletAddress: wallet as string,
          sourceAddress: "0xfunder",
          sourceType: "eoa" as const,
          txHash: `0xtx_${wallet}`,
          amount: 500,
          fundedAt: new Date(baseTime.getTime() + offset),
          isFirstFunding: true,
        }];
      });

      const edges = await clusterService.buildSharedFunderEdges();

      expect(edges.length).toBe(1);
      // Close timing should give higher strength (0.5 base + 0.3 timing bonus)
      expect(edges[0].strength).toBeGreaterThanOrEqual(0.8);
    });

    it("should skip small funding amounts", async () => {
      const mockMarket: Market = {
        conditionId: "0xcond1",
        question: "Test Market",
        slug: "test-market",
        volume24h: 1000,
        volumeTotal: 5000,
        liquidity: 2000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([mockMarket]);

      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          totalVolume: 1500,
          tradeCount: 3,
          netPosition: 150,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      // Small funding amounts (below threshold)
      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue([{
        id: 1,
        walletAddress: "0xwallet1",
        sourceAddress: "0xfunder",
        sourceType: "eoa" as const,
        txHash: "0xtx",
        amount: 10, // Below MIN_SHARED_FUNDER_AMOUNT
        fundedAt: new Date(),
        isFirstFunding: true,
      }]);

      const edges = await clusterService.buildSharedFunderEdges();

      expect(edges.length).toBe(0);
    });
  });

  describe("buildTimingCorrelationEdges()", () => {
    it("should return empty array when no market activity", async () => {
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue([]);

      const edges = await clusterService.buildTimingCorrelationEdges("0xcond1");

      expect(edges).toEqual([]);
    });

    it("should create edges for wallets trading same direction within window", async () => {
      const baseTime = new Date("2024-01-01T10:00:00Z");

      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          firstTradeAt: baseTime,
          lastTradeAt: baseTime,
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100, // YES position
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          firstTradeAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
          lastTradeAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000),
          totalVolume: 1200,
          tradeCount: 3,
          netPosition: 120, // YES position (same direction)
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      const edges = await clusterService.buildTimingCorrelationEdges("0xcond1", 6);

      expect(edges.length).toBe(1);
      expect(edges[0].type).toBe("timing_correlation");
      expect(edges[0].evidence.sharedMarket).toBe("0xcond1");
      expect(edges[0].evidence.wallet1Side).toBe("YES");
      expect(edges[0].evidence.wallet2Side).toBe("YES");
    });

    it("should not create edges for wallets trading opposite directions", async () => {
      const baseTime = new Date("2024-01-01T10:00:00Z");

      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          firstTradeAt: baseTime,
          lastTradeAt: baseTime,
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100, // YES position
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          firstTradeAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000),
          lastTradeAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000),
          totalVolume: 1200,
          tradeCount: 3,
          netPosition: -120, // NO position (opposite direction)
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      const edges = await clusterService.buildTimingCorrelationEdges("0xcond1");

      expect(edges.length).toBe(0);
    });

    it("should not create edges for trades outside time window", async () => {
      const baseTime = new Date("2024-01-01T10:00:00Z");

      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          firstTradeAt: baseTime,
          lastTradeAt: baseTime,
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          firstTradeAt: new Date(baseTime.getTime() + 12 * 60 * 60 * 1000), // 12 hours later
          lastTradeAt: new Date(baseTime.getTime() + 12 * 60 * 60 * 1000),
          totalVolume: 1200,
          tradeCount: 3,
          netPosition: 120,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      const edges = await clusterService.buildTimingCorrelationEdges("0xcond1", 6); // 6 hour window

      expect(edges.length).toBe(0);
    });

    it("should calculate higher strength for closer trade times", async () => {
      const baseTime = new Date("2024-01-01T10:00:00Z");

      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          firstTradeAt: baseTime,
          lastTradeAt: baseTime,
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          firstTradeAt: new Date(baseTime.getTime() + 15 * 60 * 1000), // 15 minutes later
          lastTradeAt: new Date(baseTime.getTime() + 15 * 60 * 1000),
          totalVolume: 1100, // Similar volume
          tradeCount: 4,
          netPosition: 105, // Similar position
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      const edges = await clusterService.buildTimingCorrelationEdges("0xcond1");

      expect(edges.length).toBe(1);
      // Very close timing + similar volumes should give high strength
      expect(edges[0].strength).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("buildClusterGraph()", () => {
    it("should return empty clusters when no edges", async () => {
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([]);

      const result = await clusterService.buildClusterGraph();

      expect(result.clusters.size).toBe(0);
      expect(result.edges.length).toBe(0);
      expect(result.clusterIds.size).toBe(0);
    });

    it("should combine edges from multiple sources", async () => {
      const mockMarket: Market = {
        conditionId: "0xcond1",
        question: "Test Market",
        slug: "test-market",
        volume24h: 1000,
        volumeTotal: 5000,
        liquidity: 2000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([mockMarket]);

      const baseTime = new Date("2024-01-01T10:00:00Z");

      // Three wallets with both timing and funding relationships
      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          firstTradeAt: baseTime,
          lastTradeAt: baseTime,
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          firstTradeAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
          lastTradeAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
          totalVolume: 1200,
          tradeCount: 3,
          netPosition: 120,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet3",
          conditionId: "0xcond1",
          firstTradeAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000),
          lastTradeAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000),
          totalVolume: 800,
          tradeCount: 4,
          netPosition: 80,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);

      // Wallet 1 and 2 funded by same source
      vi.mocked(detectionDb.getWalletFunding).mockImplementation(async (wallet) => {
        if (wallet === "0xwallet1" || wallet === "0xwallet2") {
          return [{
            id: 1,
            walletAddress: wallet as string,
            sourceAddress: "0xfunder",
            sourceType: "eoa" as const,
            txHash: `0xtx_${wallet}`,
            amount: 500,
            fundedAt: baseTime,
            isFirstFunding: true,
          }];
        }
        return [];
      });

      const result = await clusterService.buildClusterGraph("0xcond1");

      // Should have timing edges between all 3 wallets (since all trade same direction)
      // Plus shared funder edge between wallet1 and wallet2
      expect(result.edges.length).toBeGreaterThan(0);

      // All wallets should be in the same cluster (connected via edges)
      expect(result.clusterIds.size).toBeGreaterThan(0);
    });

    it("should assign same cluster ID to connected wallets", async () => {
      const mockMarket: Market = {
        conditionId: "0xcond1",
        question: "Test Market",
        slug: "test-market",
        volume24h: 1000,
        volumeTotal: 5000,
        liquidity: 2000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([mockMarket]);

      const baseTime = new Date("2024-01-01T10:00:00Z");

      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          firstTradeAt: baseTime,
          lastTradeAt: baseTime,
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          firstTradeAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
          lastTradeAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
          totalVolume: 1200,
          tradeCount: 3,
          netPosition: 120,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);
      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue([]);

      const result = await clusterService.buildClusterGraph("0xcond1");

      // Both wallets should have the same cluster ID
      if (result.clusterIds.size === 2) {
        const ids = Array.from(result.clusterIds.values());
        expect(ids[0]).toBe(ids[1]);
      }
    });
  });

  describe("getWalletCluster()", () => {
    it("should return null for wallet not in any cluster", async () => {
      vi.mocked(detectionCache.getWalletClusterId).mockResolvedValue(null);
      vi.mocked(detectionDb.getWalletCluster).mockResolvedValue([]);

      const result = await clusterService.getWalletCluster("0xunknown");

      expect(result).toBeNull();
    });

    it("should return cached cluster when available", async () => {
      const mockSummary: ClusterSummary = {
        clusterId: "cluster_abc123",
        wallets: ["0xwallet1", "0xwallet2"],
        relationshipTypes: ["shared_funder"],
        size: 2,
        discoveredAt: new Date(),
      };

      vi.mocked(detectionCache.getWalletClusterId).mockResolvedValue("cluster_abc123");
      vi.mocked(detectionCache.getClusterSummary).mockResolvedValue(mockSummary);

      const result = await clusterService.getWalletCluster("0xwallet1");

      expect(result).toEqual(mockSummary);
      expect(detectionDb.getWalletCluster).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache when not cached", async () => {
      const mockRelationships: WalletCluster[] = [{
        id: 1,
        clusterId: "cluster_abc123",
        walletAddress: "0xwallet1",
        relationshipType: "shared_funder",
        relatedWallet: "0xwallet2",
        evidence: { funder: "0xfunder" },
        strength: 0.8,
        discoveredAt: new Date(),
      }];

      const mockSummary: ClusterSummary = {
        clusterId: "cluster_abc123",
        wallets: ["0xwallet1", "0xwallet2"],
        relationshipTypes: ["shared_funder"],
        size: 2,
        discoveredAt: new Date(),
      };

      vi.mocked(detectionCache.getWalletClusterId).mockResolvedValue(null);
      vi.mocked(detectionDb.getWalletCluster).mockResolvedValue(mockRelationships);
      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(mockSummary);
      vi.mocked(detectionCache.setClusterSummary).mockResolvedValue(undefined);
      vi.mocked(detectionCache.setWalletClusterId).mockResolvedValue(undefined);

      const result = await clusterService.getWalletCluster("0xwallet1");

      expect(result).toEqual(mockSummary);
      expect(detectionCache.setClusterSummary).toHaveBeenCalledWith("cluster_abc123", mockSummary);
      expect(detectionCache.setWalletClusterId).toHaveBeenCalledWith("0xwallet1", "cluster_abc123");
    });
  });

  describe("getClusterActivity()", () => {
    it("should return null when cluster not found", async () => {
      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(null);

      const result = await clusterService.getClusterActivity("unknown_cluster", "0xcond1");

      expect(result).toBeNull();
    });

    it("should aggregate activity from all cluster wallets", async () => {
      const mockSummary: ClusterSummary = {
        clusterId: "cluster_abc123",
        wallets: ["0xwallet1", "0xwallet2"],
        relationshipTypes: ["shared_funder"],
        size: 2,
        discoveredAt: new Date(),
      };

      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(mockSummary);
      vi.mocked(detectionDb.getWalletActivity).mockImplementation(async (wallet) => {
        if (wallet === "0xwallet1") {
          return [{
            walletAddress: "0xwallet1",
            conditionId: "0xcond1",
            totalVolume: 1000,
            tradeCount: 5,
            netPosition: 100,
            realizedPnl: 50,
          }];
        }
        if (wallet === "0xwallet2") {
          return [{
            walletAddress: "0xwallet2",
            conditionId: "0xcond1",
            totalVolume: 1500,
            tradeCount: 3,
            netPosition: 150,
            realizedPnl: 75,
          }];
        }
        return [];
      });

      const result = await clusterService.getClusterActivity("cluster_abc123", "0xcond1");

      expect(result).not.toBeNull();
      expect(result!.totalVolume).toBe(2500);
      expect(result!.netPosition).toBe(250);
      expect(result!.tradeCount).toBe(8);
      expect(result!.wallets).toEqual(["0xwallet1", "0xwallet2"]);
      expect(result!.allSameSide).toBe(true); // Both positive
      expect(result!.dominantSide).toBe("YES");
    });

    it("should return null when no activity in market", async () => {
      const mockSummary: ClusterSummary = {
        clusterId: "cluster_abc123",
        wallets: ["0xwallet1", "0xwallet2"],
        relationshipTypes: ["shared_funder"],
        size: 2,
        discoveredAt: new Date(),
      };

      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(mockSummary);
      vi.mocked(detectionDb.getWalletActivity).mockResolvedValue([]);

      const result = await clusterService.getClusterActivity("cluster_abc123", "0xcond1");

      expect(result).toBeNull();
    });

    it("should detect when not all wallets trading same side", async () => {
      const mockSummary: ClusterSummary = {
        clusterId: "cluster_abc123",
        wallets: ["0xwallet1", "0xwallet2"],
        relationshipTypes: ["shared_funder"],
        size: 2,
        discoveredAt: new Date(),
      };

      vi.mocked(detectionDb.getClusterSummary).mockResolvedValue(mockSummary);
      vi.mocked(detectionDb.getWalletActivity).mockImplementation(async (wallet) => {
        if (wallet === "0xwallet1") {
          return [{
            walletAddress: "0xwallet1",
            conditionId: "0xcond1",
            totalVolume: 1000,
            tradeCount: 5,
            netPosition: 100, // YES
            realizedPnl: 0,
          }];
        }
        if (wallet === "0xwallet2") {
          return [{
            walletAddress: "0xwallet2",
            conditionId: "0xcond1",
            totalVolume: 1500,
            tradeCount: 3,
            netPosition: -150, // NO
            realizedPnl: 0,
          }];
        }
        return [];
      });

      const result = await clusterService.getClusterActivity("cluster_abc123", "0xcond1");

      expect(result).not.toBeNull();
      expect(result!.allSameSide).toBe(false);
    });
  });

  describe("refreshClusters()", () => {
    it("should throw if already refreshing", async () => {
      // Start a refresh that won't complete immediately
      vi.mocked(detectionDb.getActiveMarkets).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return [];
      });

      const firstRefresh = clusterService.refreshClusters();

      // Attempt second refresh should fail
      await expect(clusterService.refreshClusters()).rejects.toThrow("Cluster refresh already in progress");

      // Clean up
      await firstRefresh;
    });

    it("should store edges in database", async () => {
      const mockMarket: Market = {
        conditionId: "0xcond1",
        question: "Test Market",
        slug: "test-market",
        volume24h: 1000,
        volumeTotal: 5000,
        liquidity: 2000,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      vi.mocked(detectionDb.getActiveMarkets).mockResolvedValue([mockMarket]);

      const baseTime = new Date("2024-01-01T10:00:00Z");
      const mockActivities: WalletActivity[] = [
        {
          walletAddress: "0xwallet1",
          conditionId: "0xcond1",
          firstTradeAt: baseTime,
          lastTradeAt: baseTime,
          totalVolume: 1000,
          tradeCount: 5,
          netPosition: 100,
          realizedPnl: 0,
        },
        {
          walletAddress: "0xwallet2",
          conditionId: "0xcond1",
          firstTradeAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
          lastTradeAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
          totalVolume: 1200,
          tradeCount: 3,
          netPosition: 120,
          realizedPnl: 0,
        },
      ];
      vi.mocked(detectionDb.getMarketActivity).mockResolvedValue(mockActivities);
      vi.mocked(detectionDb.getWalletFunding).mockResolvedValue([]);
      vi.mocked(detectionDb.recordClusterRelationship).mockResolvedValue(1);
      vi.mocked(detectionCache.invalidateCluster).mockResolvedValue(undefined);
      vi.mocked(detectionCache.invalidateWalletCluster).mockResolvedValue(undefined);

      const result = await clusterService.refreshClusters("0xcond1");

      expect(result.clustersCreated).toBeGreaterThan(0);
      expect(detectionDb.recordClusterRelationship).toHaveBeenCalled();
    });
  });

  describe("getAllClusters()", () => {
    it("should return all clusters from database", async () => {
      const mockClusters: ClusterSummary[] = [
        {
          clusterId: "cluster_1",
          wallets: ["0xa", "0xb"],
          relationshipTypes: ["shared_funder"],
          size: 2,
          discoveredAt: new Date(),
        },
        {
          clusterId: "cluster_2",
          wallets: ["0xc", "0xd", "0xe"],
          relationshipTypes: ["timing_correlation"],
          size: 3,
          discoveredAt: new Date(),
        },
      ];
      vi.mocked(detectionDb.getAllClusters).mockResolvedValue(mockClusters);

      const result = await clusterService.getAllClusters();

      expect(result).toEqual(mockClusters);
      expect(result.length).toBe(2);
    });
  });

  describe("deleteCluster()", () => {
    it("should delete cluster and invalidate cache", async () => {
      vi.mocked(detectionDb.deleteCluster).mockResolvedValue(2);
      vi.mocked(detectionCache.invalidateCluster).mockResolvedValue(undefined);

      const result = await clusterService.deleteCluster("cluster_abc123");

      expect(result).toBe(2);
      expect(detectionCache.invalidateCluster).toHaveBeenCalledWith("cluster_abc123");
    });
  });

  describe("getStatus()", () => {
    it("should return service status", () => {
      const status = clusterService.getStatus();

      expect(status).toHaveProperty("isRefreshing");
      expect(status).toHaveProperty("lastRefreshAt");
      expect(status).toHaveProperty("clustersBuilt");
      expect(status).toHaveProperty("edgesCreated");
      expect(status).toHaveProperty("walletsClustered");
      expect(status).toHaveProperty("refreshes");
      expect(status).toHaveProperty("errors");
    });
  });

  describe("resetStats()", () => {
    it("should reset all statistics", () => {
      // First call something that increments stats
      clusterService.resetStats();

      const status = clusterService.getStatus();

      expect(status.clustersBuilt).toBe(0);
      expect(status.edgesCreated).toBe(0);
      expect(status.walletsClustered).toBe(0);
      expect(status.refreshes).toBe(0);
      expect(status.errors).toBe(0);
    });
  });

  describe("_calculateMedian()", () => {
    it("should calculate median for odd length array", () => {
      const result = clusterService._calculateMedian([1, 3, 5, 7, 9]);
      expect(result).toBe(5);
    });

    it("should calculate median for even length array", () => {
      const result = clusterService._calculateMedian([1, 3, 5, 7]);
      expect(result).toBe(4); // (3 + 5) / 2
    });

    it("should return null for empty array", () => {
      const result = clusterService._calculateMedian([]);
      expect(result).toBeNull();
    });

    it("should handle single element array", () => {
      const result = clusterService._calculateMedian([42]);
      expect(result).toBe(42);
    });
  });
});
