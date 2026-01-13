/**
 * Redis caching layer for the Insider Trading Detection System
 *
 * Provides caching for:
 * - Market metadata
 * - Depth snapshots
 * - Wallet profiles and risk analysis
 * - Funding analysis results
 * - Detection config
 */

import Redis from "ioredis";
import { config } from "../../config/index.js";
import type {
  Market,
  DepthSnapshot,
  WalletActivity,
  WalletFundingSource,
  DetectionConfig,
  WalletRiskProfile,
} from "./types.js";

const redis = new (Redis as any)(config.redis.url);

// Cache key prefixes
const PREFIX = {
  market: "det:market:",
  depth: "det:depth:",
  walletProfile: "det:wallet:",
  walletActivity: "det:activity:",
  walletRisk: "det:risk:",
  fundingAnalysis: "det:funding:",
  config: "det:config:",
  recentAlerts: "det:alerts:recent",
  ctfProcessed: "det:ctf_processed:",
  ctfLock: "det:ctf_lock:",
  detectionStats: "det:stats",
} as const;

// TTL values in seconds
const TTL = {
  market: 5 * 60,           // 5 minutes
  depth: 30,                // 30 seconds (snapshots are frequent)
  walletProfile: 5 * 60,    // 5 minutes
  walletActivity: 5 * 60,   // 5 minutes
  walletRisk: 5 * 60,       // 5 minutes
  fundingAnalysis: 30 * 60, // 30 minutes (rarely changes)
  config: 60,               // 1 minute (allow quick config updates)
  ctfProcessed: 7 * 24 * 60 * 60, // 7 days
  ctfLock: 60,              // 60 seconds
  detectionStats: 30,       // 30 seconds (for fast UI updates)
} as const;

export const detectionCache = {
  // ----------------------------------------
  // MARKET CACHE
  // ----------------------------------------

  async setMarket(conditionId: string, market: Market, ttl?: number): Promise<void> {
    await redis.setex(
      `${PREFIX.market}${conditionId}`,
      ttl || TTL.market,
      JSON.stringify(market)
    );
  },

  async getMarket(conditionId: string): Promise<Market | null> {
    const data = await redis.get(`${PREFIX.market}${conditionId}`);
    return data ? JSON.parse(data) : null;
  },

  async deleteMarket(conditionId: string): Promise<void> {
    await redis.del(`${PREFIX.market}${conditionId}`);
  },

  async invalidateMarket(conditionId: string): Promise<void> {
    await redis.del(`${PREFIX.market}${conditionId}`);
  },

  // ----------------------------------------
  // DEPTH SNAPSHOT CACHE
  // ----------------------------------------

  async setLatestDepth(conditionId: string, snapshot: DepthSnapshot): Promise<void> {
    await redis.setex(
      `${PREFIX.depth}${conditionId}`,
      TTL.depth,
      JSON.stringify(snapshot)
    );
  },

  async getLatestDepth(conditionId: string): Promise<DepthSnapshot | null> {
    const data = await redis.get(`${PREFIX.depth}${conditionId}`);
    return data ? JSON.parse(data) : null;
  },

  // ----------------------------------------
  // WALLET PROFILE CACHE
  // ----------------------------------------

  async setWalletProfile(
    walletAddress: string,
    profile: {
      activities: WalletActivity[];
      fundingSources: WalletFundingSource[];
      totalVolume: number;
      marketCount: number;
      topMarketShare?: number;
    }
  ): Promise<void> {
    await redis.setex(
      `${PREFIX.walletProfile}${walletAddress.toLowerCase()}`,
      TTL.walletProfile,
      JSON.stringify(profile)
    );
  },

  async getWalletProfile(walletAddress: string): Promise<{
    activities: WalletActivity[];
    fundingSources: WalletFundingSource[];
    totalVolume: number;
    marketCount: number;
    topMarketShare?: number;
  } | null> {
    const data = await redis.get(`${PREFIX.walletProfile}${walletAddress.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  },

  async deleteWalletProfile(walletAddress: string): Promise<void> {
    await redis.del(`${PREFIX.walletProfile}${walletAddress.toLowerCase()}`);
  },

  // ----------------------------------------
  // WALLET ACTIVITY CACHE (per market)
  // ----------------------------------------

  /**
   * Set wallet activity using a cache key (wallet:conditionId format)
   */
  async setWalletActivity(
    cacheKey: string,
    activity: WalletActivity,
    ttl?: number
  ): Promise<void> {
    await redis.setex(
      `${PREFIX.walletActivity}${cacheKey.toLowerCase()}`,
      ttl || TTL.walletActivity,
      JSON.stringify(activity)
    );
  },

  /**
   * Get wallet activity using a cache key (wallet:conditionId format)
   */
  async getWalletActivity(cacheKey: string): Promise<WalletActivity | null> {
    const data = await redis.get(`${PREFIX.walletActivity}${cacheKey.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Invalidate wallet activity cache entry
   */
  async invalidateWalletActivity(cacheKey: string): Promise<void> {
    await redis.del(`${PREFIX.walletActivity}${cacheKey.toLowerCase()}`);
  },

  // ----------------------------------------
  // WALLET RISK PROFILE CACHE
  // ----------------------------------------

  async setWalletRiskProfile(
    walletAddress: string,
    profile: WalletRiskProfile,
    ttl?: number
  ): Promise<void> {
    await redis.setex(
      `${PREFIX.walletRisk}${walletAddress.toLowerCase()}`,
      ttl || TTL.walletRisk,
      JSON.stringify(profile)
    );
  },

  async getWalletRiskProfile(walletAddress: string): Promise<WalletRiskProfile | null> {
    const data = await redis.get(`${PREFIX.walletRisk}${walletAddress.toLowerCase()}`);
    if (!data) return null;

    const profile = JSON.parse(data);
    // Restore Date objects
    if (profile.walletAge?.firstSeenAt) {
      profile.walletAge.firstSeenAt = new Date(profile.walletAge.firstSeenAt);
    }
    if (profile.assessedAt) {
      profile.assessedAt = new Date(profile.assessedAt);
    }
    if (profile.alerts?.recent) {
      profile.alerts.recent = profile.alerts.recent.map((a: any) => ({
        ...a,
        detectedAt: a.detectedAt ? new Date(a.detectedAt) : undefined,
        reviewedAt: a.reviewedAt ? new Date(a.reviewedAt) : undefined,
      }));
    }
    return profile;
  },

  async invalidateWalletRiskProfile(walletAddress: string): Promise<void> {
    await redis.del(`${PREFIX.walletRisk}${walletAddress.toLowerCase()}`);
  },

  // ----------------------------------------
  // FUNDING ANALYSIS CACHE
  // ----------------------------------------

  async setFundingAnalysis(
    walletAddress: string,
    analysis: {
      sources: WalletFundingSource[];
      totalFunded: number;
      firstFundingAt?: Date;
      hoursBeforeFirstTrade?: number;
    }
  ): Promise<void> {
    await redis.setex(
      `${PREFIX.fundingAnalysis}${walletAddress.toLowerCase()}`,
      TTL.fundingAnalysis,
      JSON.stringify(analysis)
    );
  },

  async getFundingAnalysis(walletAddress: string): Promise<{
    sources: WalletFundingSource[];
    totalFunded: number;
    firstFundingAt?: Date;
    hoursBeforeFirstTrade?: number;
  } | null> {
    const data = await redis.get(`${PREFIX.fundingAnalysis}${walletAddress.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  },

  async deleteFundingAnalysis(walletAddress: string): Promise<void> {
    await redis.del(`${PREFIX.fundingAnalysis}${walletAddress.toLowerCase()}`);
  },

  // ----------------------------------------
  // DETECTION CONFIG CACHE
  // ----------------------------------------

  async setConfig(configData: DetectionConfig): Promise<void> {
    await redis.setex(
      `${PREFIX.config}all`,
      TTL.config,
      JSON.stringify(configData)
    );
  },

  async getConfig(): Promise<DetectionConfig | null> {
    const data = await redis.get(`${PREFIX.config}all`);
    return data ? JSON.parse(data) : null;
  },

  async invalidateConfig(): Promise<void> {
    await redis.del(`${PREFIX.config}all`);
  },

  // ----------------------------------------
  // CTF TRANSFER DEDUPLICATION
  // ----------------------------------------

  /**
   * Acquire a distributed lock for a CTF transfer (prevents duplicate processing)
   * Returns true if lock acquired, false if another process already has the lock
   */
  async acquireCtfLock(txHash: string, logIndex: number): Promise<boolean> {
    const key = `${PREFIX.ctfLock}${txHash.toLowerCase()}:${logIndex}`;
    const result = await redis.set(key, Date.now().toString(), "EX", TTL.ctfLock, "NX");
    return result === "OK";
  },

  /**
   * Check if a CTF transfer has been fully processed
   */
  async isCtfProcessed(txHash: string, logIndex: number): Promise<boolean> {
    const key = `${PREFIX.ctfProcessed}${txHash.toLowerCase()}:${logIndex}`;
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Mark a CTF transfer as fully processed
   */
  async markCtfProcessed(txHash: string, logIndex: number): Promise<void> {
    const key = `${PREFIX.ctfProcessed}${txHash.toLowerCase()}:${logIndex}`;
    await redis.setex(key, TTL.ctfProcessed, Date.now().toString());
  },

  /**
   * Acquire lock using dedup key (for ctfEventListener)
   */
  async acquireCtfTransferLock(dedupKey: string): Promise<boolean> {
    const key = `${PREFIX.ctfLock}${dedupKey.toLowerCase()}`;
    const result = await redis.set(key, Date.now().toString(), "EX", TTL.ctfLock, "NX");
    return result === "OK";
  },

  /**
   * Check if CTF transfer is processed using dedup key
   */
  async isCtfTransferProcessed(dedupKey: string): Promise<boolean> {
    const key = `${PREFIX.ctfProcessed}${dedupKey.toLowerCase()}`;
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Mark CTF transfer as processed using dedup key
   */
  async markCtfTransferProcessed(dedupKey: string): Promise<void> {
    const key = `${PREFIX.ctfProcessed}${dedupKey.toLowerCase()}`;
    await redis.setex(key, TTL.ctfProcessed, Date.now().toString());
  },

  // ----------------------------------------
  // RECENT ALERTS (for quick dashboard access)
  // ----------------------------------------

  async addRecentAlert(alertId: number, timestamp: number): Promise<void> {
    // Use sorted set with timestamp as score
    await redis.zadd(PREFIX.recentAlerts, timestamp, alertId.toString());
    // Keep only last 100 alerts
    await redis.zremrangebyrank(PREFIX.recentAlerts, 0, -101);
  },

  async getRecentAlertIds(limit: number = 20): Promise<number[]> {
    const ids = await redis.zrevrange(PREFIX.recentAlerts, 0, limit - 1);
    return ids.map((id: string) => parseInt(id));
  },

  // ----------------------------------------
  // UTILITY METHODS
  // ----------------------------------------

  // ----------------------------------------
  // DETECTION STATS CACHE
  // ----------------------------------------

  async setDetectionStats(stats: {
    alertsToday: number;
    alertsTotal: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    activeMarkets: number;
    walletsTracked: number;
  }): Promise<void> {
    await redis.setex(
      PREFIX.detectionStats,
      TTL.detectionStats,
      JSON.stringify(stats)
    );
  },

  async getDetectionStats(): Promise<{
    alertsToday: number;
    alertsTotal: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    activeMarkets: number;
    walletsTracked: number;
  } | null> {
    const data = await redis.get(PREFIX.detectionStats);
    return data ? JSON.parse(data) : null;
  },

  async invalidateDetectionStats(): Promise<void> {
    await redis.del(PREFIX.detectionStats);
  },

  /**
   * Clear all detection cache entries (useful for testing)
   */
  async clearAll(): Promise<void> {
    const keys = await redis.keys("det:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Get cache stats for monitoring
   */
  async getStats(): Promise<{
    marketCount: number;
    walletProfileCount: number;
    fundingAnalysisCount: number;
    recentAlertsCount: number;
  }> {
    const [marketKeys, walletKeys, fundingKeys, alertsCount] = await Promise.all([
      redis.keys(`${PREFIX.market}*`),
      redis.keys(`${PREFIX.walletProfile}*`),
      redis.keys(`${PREFIX.fundingAnalysis}*`),
      redis.zcard(PREFIX.recentAlerts),
    ]);

    return {
      marketCount: marketKeys.length,
      walletProfileCount: walletKeys.length,
      fundingAnalysisCount: fundingKeys.length,
      recentAlertsCount: alertsCount,
    };
  },

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await redis.quit();
  },
};
