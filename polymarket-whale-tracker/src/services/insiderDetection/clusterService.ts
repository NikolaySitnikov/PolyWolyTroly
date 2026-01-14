/**
 * Cluster Service for Insider Trading Detection
 *
 * Builds and manages wallet relationship clusters for detecting coordinated trading.
 * Used by Rule #3 (Coordinated Cluster) to identify groups of wallets trading
 * together in suspicious patterns.
 *
 * Key responsibilities:
 * - Build cluster graphs from wallet relationships (shared funders, timing)
 * - Assign wallets to clusters using Union-Find algorithm
 * - Query cluster membership and activity
 * - Refresh cluster data periodically
 *
 * Relationship types:
 * 1. shared_funder - Wallets funded from the same source address
 * 2. shared_cashout - Wallets sending funds to the same destination
 * 3. timing_correlation - Wallets trading same market within a time window
 */

import { randomUUID } from "crypto";
import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import type {
  WalletCluster,
  ClusterRelationshipType,
  ClusterSummary,
  WalletActivity,
} from "./types.js";

// Configuration
const DEFAULT_TIMING_WINDOW_HOURS = 6;
const MIN_SHARED_FUNDER_AMOUNT = 100; // Minimum USD funded to consider
const MIN_RELATIONSHIP_STRENGTH = 0.3; // Minimum strength to include

// Service state
let isRefreshing = false;
let lastRefreshAt: Date | null = null;
let stats = {
  clustersBuilt: 0,
  edgesCreated: 0,
  walletsClustered: 0,
  refreshes: 0,
  errors: 0,
};

/**
 * Union-Find data structure for clustering wallets
 */
class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  /**
   * Make a set for a wallet (add to structure)
   */
  makeSet(wallet: string): void {
    const w = wallet.toLowerCase();
    if (!this.parent.has(w)) {
      this.parent.set(w, w);
      this.rank.set(w, 0);
    }
  }

  /**
   * Find the root/representative of a wallet's set
   * Uses path compression for efficiency
   */
  find(wallet: string): string {
    const w = wallet.toLowerCase();
    this.makeSet(w);

    if (this.parent.get(w) !== w) {
      // Path compression
      this.parent.set(w, this.find(this.parent.get(w)!));
    }
    return this.parent.get(w)!;
  }

  /**
   * Union two sets (merge clusters)
   * Uses union by rank for efficiency
   */
  union(wallet1: string, wallet2: string): void {
    const root1 = this.find(wallet1);
    const root2 = this.find(wallet2);

    if (root1 === root2) return;

    const rank1 = this.rank.get(root1) || 0;
    const rank2 = this.rank.get(root2) || 0;

    if (rank1 < rank2) {
      this.parent.set(root1, root2);
    } else if (rank1 > rank2) {
      this.parent.set(root2, root1);
    } else {
      this.parent.set(root2, root1);
      this.rank.set(root1, rank1 + 1);
    }
  }

  /**
   * Get all clusters as a map of root -> members
   */
  getClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();

    for (const wallet of Array.from(this.parent.keys())) {
      const root = this.find(wallet);
      if (!clusters.has(root)) {
        clusters.set(root, []);
      }
      clusters.get(root)!.push(wallet);
    }

    return clusters;
  }

  /**
   * Get all wallets in the same cluster as the given wallet
   */
  getClusterMembers(wallet: string): string[] {
    const root = this.find(wallet);
    const members: string[] = [];

    for (const w of Array.from(this.parent.keys())) {
      if (this.find(w) === root) {
        members.push(w);
      }
    }

    return members;
  }
}

/**
 * Edge in the relationship graph
 */
interface ClusterEdge {
  wallet1: string;
  wallet2: string;
  type: ClusterRelationshipType;
  strength: number;
  evidence: Record<string, unknown>;
}

/**
 * Cluster Service
 */
export const clusterService = {
  /**
   * Build edges from shared funding sources
   *
   * Wallets funded from the same source are likely related.
   * Strength based on timing proximity and amount similarity.
   */
  async buildSharedFunderEdges(): Promise<ClusterEdge[]> {
    const edges: ClusterEdge[] = [];

    try {
      // Get all funding sources grouped by source address
      const funderToWallets = new Map<string, Array<{
        wallet: string;
        amount: number;
        fundedAt: Date | null;
        txHash: string;
      }>>();

      // Query all funding sources
      // Note: In production, this would be paginated/batched
      const allWallets = await this._getWalletsWithFunding();

      for (const wallet of allWallets) {
        const sources = await detectionDb.getWalletFunding(wallet);

        for (const source of sources) {
          if (source.amount < MIN_SHARED_FUNDER_AMOUNT) continue;

          const funder = source.sourceAddress.toLowerCase();
          if (!funderToWallets.has(funder)) {
            funderToWallets.set(funder, []);
          }

          funderToWallets.get(funder)!.push({
            wallet: wallet.toLowerCase(),
            amount: source.amount,
            fundedAt: source.fundedAt || null,
            txHash: source.txHash,
          });
        }
      }

      // Build edges between wallets with same funder
      for (const [funder, wallets] of Array.from(funderToWallets.entries())) {
        // Only consider funders with multiple recipients
        if (wallets.length < 2) continue;

        // Skip known CEX/bridge funders (many unrelated wallets)
        // These are handled separately based on source type
        const firstSource = await detectionDb.getWalletFunding(wallets[0].wallet);
        const sourceType = firstSource[0]?.sourceType;
        if (sourceType === "cex" || sourceType === "bridge") continue;

        // Create edges between all pairs
        for (let i = 0; i < wallets.length; i++) {
          for (let j = i + 1; j < wallets.length; j++) {
            const w1 = wallets[i];
            const w2 = wallets[j];

            // Calculate strength based on timing and amount similarity
            let strength = 0.5; // Base strength

            // Timing factor: closer funding times = higher strength
            if (w1.fundedAt && w2.fundedAt) {
              const timeDiffHours = Math.abs(
                w1.fundedAt.getTime() - w2.fundedAt.getTime()
              ) / (1000 * 60 * 60);

              if (timeDiffHours < 1) strength += 0.3;
              else if (timeDiffHours < 24) strength += 0.2;
              else if (timeDiffHours < 168) strength += 0.1;
            }

            // Amount factor: similar amounts = higher strength
            const amountRatio = Math.min(w1.amount, w2.amount) / Math.max(w1.amount, w2.amount);
            if (amountRatio > 0.8) strength += 0.2;
            else if (amountRatio > 0.5) strength += 0.1;

            strength = Math.min(1, strength);

            if (strength >= MIN_RELATIONSHIP_STRENGTH) {
              edges.push({
                wallet1: w1.wallet,
                wallet2: w2.wallet,
                type: "shared_funder",
                strength,
                evidence: {
                  funder,
                  wallet1TxHash: w1.txHash,
                  wallet2TxHash: w2.txHash,
                  wallet1Amount: w1.amount,
                  wallet2Amount: w2.amount,
                  timeDiffHours: w1.fundedAt && w2.fundedAt
                    ? Math.abs(w1.fundedAt.getTime() - w2.fundedAt.getTime()) / (1000 * 60 * 60)
                    : null,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("[ClusterService] Error building shared funder edges:", error);
      stats.errors++;
    }

    return edges;
  },

  /**
   * Build edges from timing correlation
   *
   * Wallets trading the same market within a time window may be coordinated.
   * Only considers wallets trading in the same direction.
   */
  async buildTimingCorrelationEdges(
    conditionId: string,
    windowHours: number = DEFAULT_TIMING_WINDOW_HOURS
  ): Promise<ClusterEdge[]> {
    const edges: ClusterEdge[] = [];

    try {
      // Get all activity for this market
      const activities = await detectionDb.getMarketActivity(conditionId);

      if (activities.length < 2) return edges;

      // Group by trade time windows
      const windowMs = windowHours * 60 * 60 * 1000;
      const tradesByTime: Array<{
        wallet: string;
        firstTradeAt: Date;
        netPosition: number;
        volume: number;
      }> = [];

      for (const activity of activities) {
        if (activity.firstTradeAt && activity.netPosition !== 0) {
          tradesByTime.push({
            wallet: activity.walletAddress.toLowerCase(),
            firstTradeAt: activity.firstTradeAt,
            netPosition: activity.netPosition,
            volume: activity.totalVolume,
          });
        }
      }

      // Sort by trade time
      tradesByTime.sort((a, b) => a.firstTradeAt.getTime() - b.firstTradeAt.getTime());

      // Find wallets trading within window and same direction
      for (let i = 0; i < tradesByTime.length; i++) {
        for (let j = i + 1; j < tradesByTime.length; j++) {
          const t1 = tradesByTime[i];
          const t2 = tradesByTime[j];

          const timeDiff = t2.firstTradeAt.getTime() - t1.firstTradeAt.getTime();

          // Stop if outside window
          if (timeDiff > windowMs) break;

          // Check same direction (both positive or both negative position)
          const sameDirection = (t1.netPosition > 0) === (t2.netPosition > 0);

          if (!sameDirection) continue;

          // Calculate strength based on timing proximity and volume similarity
          let strength = 0.4; // Base strength

          // Timing factor
          const timeDiffHours = timeDiff / (1000 * 60 * 60);
          if (timeDiffHours < 0.5) strength += 0.3;
          else if (timeDiffHours < 2) strength += 0.2;
          else if (timeDiffHours < windowHours) strength += 0.1;

          // Volume factor
          const volumeRatio = Math.min(t1.volume, t2.volume) / Math.max(t1.volume, t2.volume);
          if (volumeRatio > 0.8) strength += 0.2;
          else if (volumeRatio > 0.5) strength += 0.1;

          // Position size factor
          const posRatio = Math.min(Math.abs(t1.netPosition), Math.abs(t2.netPosition)) /
            Math.max(Math.abs(t1.netPosition), Math.abs(t2.netPosition));
          if (posRatio > 0.8) strength += 0.1;

          strength = Math.min(1, strength);

          if (strength >= MIN_RELATIONSHIP_STRENGTH) {
            edges.push({
              wallet1: t1.wallet,
              wallet2: t2.wallet,
              type: "timing_correlation",
              strength,
              evidence: {
                sharedMarket: conditionId,
                timeDiffHours,
                wallet1Volume: t1.volume,
                wallet2Volume: t2.volume,
                wallet1Side: t1.netPosition > 0 ? "YES" : "NO",
                wallet2Side: t2.netPosition > 0 ? "YES" : "NO",
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("[ClusterService] Error building timing correlation edges:", error);
      stats.errors++;
    }

    return edges;
  },

  /**
   * Build complete cluster graph from all edge types
   *
   * Combines edges from shared funders and timing correlations,
   * then uses Union-Find to identify connected components (clusters).
   *
   * @param conditionId Optional: focus on specific market for timing edges
   */
  async buildClusterGraph(conditionId?: string): Promise<{
    clusters: Map<string, string[]>;
    edges: ClusterEdge[];
    clusterIds: Map<string, string>;
  }> {
    const allEdges: ClusterEdge[] = [];
    const uf = new UnionFind();

    try {
      // Build shared funder edges
      const funderEdges = await this.buildSharedFunderEdges();
      allEdges.push(...funderEdges);

      // Build timing edges (for specific market or all active markets)
      if (conditionId) {
        const timingEdges = await this.buildTimingCorrelationEdges(conditionId);
        allEdges.push(...timingEdges);
      } else {
        // Get all active markets
        const markets = await detectionDb.getActiveMarkets();
        for (const market of markets) {
          const timingEdges = await this.buildTimingCorrelationEdges(market.conditionId);
          allEdges.push(...timingEdges);
        }
      }

      // Add all wallets from edges to Union-Find
      for (const edge of allEdges) {
        uf.makeSet(edge.wallet1);
        uf.makeSet(edge.wallet2);
      }

      // Union wallets connected by edges
      for (const edge of allEdges) {
        uf.union(edge.wallet1, edge.wallet2);
      }

      // Get clusters
      const clusters = uf.getClusters();

      // Generate cluster IDs (deterministic based on root wallet)
      const clusterIds = new Map<string, string>();
      for (const [root, members] of Array.from(clusters.entries())) {
        // Generate deterministic cluster ID based on root wallet
        const clusterId = `cluster_${root.slice(2, 10)}`;
        for (const member of members) {
          clusterIds.set(member, clusterId);
        }
      }

      stats.clustersBuilt = clusters.size;
      stats.edgesCreated = allEdges.length;
      stats.walletsClustered = clusterIds.size;

      return { clusters, edges: allEdges, clusterIds };
    } catch (error) {
      console.error("[ClusterService] Error building cluster graph:", error);
      stats.errors++;
      return { clusters: new Map<string, string[]>(), edges: [], clusterIds: new Map<string, string>() };
    }
  },

  /**
   * Get the cluster a wallet belongs to
   *
   * Returns cluster membership info including related wallets and relationships.
   */
  async getWalletCluster(walletAddress: string): Promise<ClusterSummary | null> {
    const address = walletAddress.toLowerCase();

    // Check cache first
    const cachedClusterId = await detectionCache.getWalletClusterId(address);
    if (cachedClusterId) {
      const cachedSummary = await detectionCache.getClusterSummary(cachedClusterId);
      if (cachedSummary) {
        return cachedSummary;
      }
    }

    // Check database
    const relationships = await detectionDb.getWalletCluster(address);

    if (relationships.length === 0) {
      return null;
    }

    // Get cluster ID from first relationship
    const clusterId = relationships[0].clusterId;

    // Get full cluster summary
    const summary = await detectionDb.getClusterSummary(clusterId);

    if (summary) {
      // Cache the results
      await detectionCache.setClusterSummary(clusterId, summary);
      await detectionCache.setWalletClusterId(address, clusterId);
    }

    return summary;
  },

  /**
   * Get aggregated activity for all wallets in a cluster
   *
   * Returns combined trading metrics for the cluster in a specific market.
   */
  async getClusterActivity(
    clusterId: string,
    conditionId: string
  ): Promise<{
    wallets: string[];
    totalVolume: number;
    totalNotional: number;
    netPosition: number;
    tradeCount: number;
    medianAgeDays: number | null;
    dominantSide: "YES" | "NO" | null;
    allSameSide: boolean;
    activities: WalletActivity[];
  } | null> {
    // Get cluster summary
    const summary = await detectionDb.getClusterSummary(clusterId);
    if (!summary) return null;

    const activities: WalletActivity[] = [];
    let totalVolume = 0;
    let totalNotional = 0;
    let netPosition = 0;
    let tradeCount = 0;
    let yesCount = 0;
    let noCount = 0;

    // Get activity for each wallet in the cluster
    for (const wallet of summary.wallets) {
      const walletActivities = await detectionDb.getWalletActivity(wallet);
      const activity = walletActivities.find(a => a.conditionId === conditionId);

      if (activity) {
        activities.push(activity);
        totalVolume += activity.totalVolume;
        netPosition += activity.netPosition;
        tradeCount += activity.tradeCount;

        // Estimate notional (volume is a proxy)
        totalNotional += activity.totalVolume;

        // Track sides
        if (activity.netPosition > 0) yesCount++;
        else if (activity.netPosition < 0) noCount++;
      }
    }

    if (activities.length === 0) {
      return null;
    }

    // Calculate median age (would need wallet age data)
    // For now, return null - will be calculated when needed
    const medianAgeDays: number | null = null;

    // Determine dominant side and if all same side
    const dominantSide: "YES" | "NO" | null =
      yesCount > noCount ? "YES" : noCount > yesCount ? "NO" : null;

    const allSameSide =
      (yesCount > 0 && noCount === 0) || (noCount > 0 && yesCount === 0);

    return {
      wallets: summary.wallets,
      totalVolume,
      totalNotional,
      netPosition,
      tradeCount,
      medianAgeDays,
      dominantSide,
      allSameSide,
      activities,
    };
  },

  /**
   * Refresh all clusters
   *
   * Rebuilds cluster graph and stores in database.
   * Should be run periodically (e.g., hourly).
   */
  async refreshClusters(conditionId?: string): Promise<{
    clustersCreated: number;
    edgesCreated: number;
    walletsProcessed: number;
  }> {
    if (isRefreshing) {
      throw new Error("Cluster refresh already in progress");
    }

    isRefreshing = true;
    lastRefreshAt = new Date();

    try {
      console.log("[ClusterService] Starting cluster refresh...");

      // Build cluster graph
      const { clusters, edges, clusterIds } = await this.buildClusterGraph(conditionId);

      // Clear existing clusters for these wallets (if any)
      const processedClusters = new Set<string>();

      // Store edges as relationships in database
      for (const edge of edges) {
        const wallet1ClusterId = clusterIds.get(edge.wallet1);
        const wallet2ClusterId = clusterIds.get(edge.wallet2);

        // Use the common cluster ID
        const clusterId = wallet1ClusterId || wallet2ClusterId || randomUUID();

        // Store relationship for wallet1
        await detectionDb.recordClusterRelationship({
          clusterId,
          walletAddress: edge.wallet1,
          relationshipType: edge.type,
          relatedWallet: edge.wallet2,
          evidence: edge.evidence,
          strength: edge.strength,
          discoveredAt: new Date(),
        });

        processedClusters.add(clusterId);
      }

      // Invalidate cached cluster data
      for (const clusterId of Array.from(processedClusters)) {
        await detectionCache.invalidateCluster(clusterId);
      }
      const walletAddresses = Array.from(clusterIds.keys()) as string[];
      for (const wallet of walletAddresses) {
        await detectionCache.invalidateWalletCluster(wallet);
      }

      stats.refreshes++;

      const result = {
        clustersCreated: clusters.size,
        edgesCreated: edges.length,
        walletsProcessed: clusterIds.size,
      };

      console.log(
        `[ClusterService] Refresh complete: ${result.clustersCreated} clusters, ` +
        `${result.edgesCreated} edges, ${result.walletsProcessed} wallets`
      );

      return result;
    } catch (error) {
      console.error("[ClusterService] Error refreshing clusters:", error);
      stats.errors++;
      throw error;
    } finally {
      isRefreshing = false;
    }
  },

  /**
   * Get all clusters
   */
  async getAllClusters(): Promise<ClusterSummary[]> {
    return detectionDb.getAllClusters();
  },

  /**
   * Delete a cluster
   */
  async deleteCluster(clusterId: string): Promise<number> {
    await detectionCache.invalidateCluster(clusterId);
    return detectionDb.deleteCluster(clusterId);
  },

  /**
   * Get service status
   */
  getStatus(): {
    isRefreshing: boolean;
    lastRefreshAt: Date | null;
    clustersBuilt: number;
    edgesCreated: number;
    walletsClustered: number;
    refreshes: number;
    errors: number;
  } {
    return {
      isRefreshing,
      lastRefreshAt,
      ...stats,
    };
  },

  /**
   * Reset statistics
   */
  resetStats(): void {
    stats = {
      clustersBuilt: 0,
      edgesCreated: 0,
      walletsClustered: 0,
      refreshes: 0,
      errors: 0,
    };
  },

  // ============================================
  // INTERNAL HELPERS
  // ============================================

  /**
   * Get list of wallets with funding sources
   * Internal helper for buildSharedFunderEdges
   */
  async _getWalletsWithFunding(): Promise<string[]> {
    // This would ideally be a dedicated query, but we can use
    // the existing wallet_funding_sources table
    // For now, get unique wallets from funding sources
    try {
      // Get wallets that have recorded funding
      // Note: This is a simplified approach - in production you'd have a direct query
      const activeMarkets = await detectionDb.getActiveMarkets();
      const wallets = new Set<string>();

      for (const market of activeMarkets) {
        const activities = await detectionDb.getMarketActivity(market.conditionId);
        for (const activity of activities) {
          wallets.add(activity.walletAddress.toLowerCase());
        }
      }

      return Array.from(wallets);
    } catch (error) {
      console.error("[ClusterService] Error getting wallets with funding:", error);
      return [];
    }
  },

  /**
   * Calculate median of an array of numbers
   */
  _calculateMedian(values: number[]): number | null {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  },
};
