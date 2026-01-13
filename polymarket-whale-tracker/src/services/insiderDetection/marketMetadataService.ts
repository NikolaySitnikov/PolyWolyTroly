/**
 * Market Metadata Service for Insider Trading Detection
 *
 * Syncs market metadata from Polymarket Gamma API to the local database.
 * Tracks market resolution times and outcomes for detection analysis.
 *
 * Key responsibilities:
 * - Fetch active markets from Gamma API
 * - Sync market metadata to `markets` table
 * - Track market resolutions
 * - Background sync every 5 minutes
 * - Warm cache on startup
 */

import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import type { Market } from "./types.js";

// Gamma API base URL
const GAMMA_API = "https://gamma-api.polymarket.com";

// Sync interval: 5 minutes
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

// Page size for API requests
const PAGE_SIZE = 100;

// Cache TTL for market metadata: 5 minutes
const MARKET_CACHE_TTL = 5 * 60;

/**
 * Gamma API market response structure
 * Based on https://gamma-api.polymarket.com/markets endpoint
 * Note: Gamma API uses camelCase for field names
 */
interface GammaMarket {
  conditionId: string;
  question: string;
  slug: string;
  description?: string;
  category?: string;
  marketType?: string;
  // Outcome token IDs (from clobTokenIds field - JSON array string)
  clobTokenIds?: string;
  // Outcome info
  outcomes?: string;  // JSON array string like '["Yes", "No"]'
  outcomePrices?: string; // JSON array string
  // Resolution info
  endDate?: string;
  endDateIso?: string;
  closed?: boolean;
  resolved?: boolean;
  resolutionSource?: string;
  // Volume and liquidity
  volume?: number;
  volumeNum?: number;
  volume24hr?: number;
  liquidity?: number;
  liquidityNum?: number;
  // Additional metadata
  active?: boolean;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Background sync job state
 */
let syncInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastSyncAt: Date | null = null;
let syncStats = {
  totalSynced: 0,
  lastSyncDuration: 0,
  errors: 0,
};

/**
 * Convert Gamma API response to our Market type
 */
function gammaToMarket(gamma: GammaMarket): Omit<Market, "firstSeenAt" | "lastUpdatedAt"> {
  // Extract YES/NO token IDs from clobTokenIds (JSON array string)
  let outcomeYesTokenId: string | undefined;
  let outcomeNoTokenId: string | undefined;
  let resolutionOutcome: Market["resolutionOutcome"];

  // Parse clobTokenIds - format is '["tokenId1", "tokenId2"]'
  // First token is typically YES, second is NO
  if (gamma.clobTokenIds) {
    try {
      const tokenIds = JSON.parse(gamma.clobTokenIds) as string[];
      if (tokenIds.length >= 2) {
        outcomeYesTokenId = tokenIds[0];
        outcomeNoTokenId = tokenIds[1];
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check for resolution outcome based on outcomePrices
  // If market is resolved, one price will be 1 and other will be 0
  if (gamma.resolved && gamma.outcomePrices) {
    try {
      const prices = JSON.parse(gamma.outcomePrices) as string[];
      if (prices.length >= 2) {
        const yesPrice = parseFloat(prices[0]);
        const noPrice = parseFloat(prices[1]);
        if (yesPrice >= 0.99) {
          resolutionOutcome = "YES";
        } else if (noPrice >= 0.99) {
          resolutionOutcome = "NO";
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Parse end date - prefer endDateIso, fallback to endDate
  const endDateStr = gamma.endDateIso || gamma.endDate;
  const resolutionTime = endDateStr ? new Date(endDateStr) : undefined;

  return {
    conditionId: gamma.conditionId,
    question: gamma.question,
    slug: gamma.slug,
    description: gamma.description,
    category: gamma.category,
    outcomeYesTokenId,
    outcomeNoTokenId,
    resolutionTime,
    resolvedAt: gamma.resolved ? new Date() : undefined,
    resolutionOutcome,
    volume24h: gamma.volume24hr || 0,
    volumeTotal: gamma.volumeNum || gamma.volume || 0,
    liquidity: gamma.liquidityNum || gamma.liquidity || 0,
  };
}

/**
 * Fetch markets from Gamma API with pagination
 */
async function fetchMarketsFromGamma(options: {
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
}): Promise<GammaMarket[]> {
  const params = new URLSearchParams();

  if (options.active !== undefined) {
    params.set("active", String(options.active));
  }
  if (options.closed !== undefined) {
    params.set("closed", String(options.closed));
  }
  params.set("limit", String(options.limit || PAGE_SIZE));
  params.set("offset", String(options.offset || 0));

  const url = `${GAMMA_API}/markets?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[MarketMetadata] Gamma API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[MarketMetadata] Error fetching from Gamma:", error);
    return [];
  }
}

/**
 * Fetch all active markets (paginated)
 */
async function fetchAllActiveMarkets(): Promise<GammaMarket[]> {
  const allMarkets: GammaMarket[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await fetchMarketsFromGamma({
      active: true,
      closed: false,
      limit: PAGE_SIZE,
      offset,
    });

    if (batch.length === 0) {
      hasMore = false;
    } else {
      allMarkets.push(...batch);
      offset += PAGE_SIZE;

      // Stop if we got fewer than page size
      if (batch.length < PAGE_SIZE) {
        hasMore = false;
      }
    }
  }

  return allMarkets;
}

/**
 * Fetch a specific market by condition ID
 */
async function fetchMarketByConditionId(conditionId: string): Promise<GammaMarket | null> {
  const url = `${GAMMA_API}/markets?condition_id=${conditionId}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`[MarketMetadata] Error fetching market ${conditionId}:`, error);
    return null;
  }
}

/**
 * Fetch recently resolved markets to track resolutions
 */
async function fetchRecentlyResolvedMarkets(): Promise<GammaMarket[]> {
  const allResolved: GammaMarket[] = [];
  let offset = 0;
  const MAX_RESOLVED_FETCH = 200; // Limit how far back we look

  while (allResolved.length < MAX_RESOLVED_FETCH) {
    const batch = await fetchMarketsFromGamma({
      closed: true,
      limit: PAGE_SIZE,
      offset,
    });

    if (batch.length === 0) {
      break;
    }

    // Only include markets that are resolved
    // Note: We check resolution via outcomePrices - one should be "1" (winner)
    const resolved = batch.filter((m) => m.resolved);
    allResolved.push(...resolved);
    offset += PAGE_SIZE;

    if (batch.length < PAGE_SIZE) {
      break;
    }
  }

  return allResolved;
}

/**
 * Market Metadata Service
 */
export const marketMetadataService = {
  /**
   * Sync active markets from Gamma API to database
   * Returns number of markets synced
   */
  async syncActiveMarkets(): Promise<number> {
    const startTime = Date.now();

    try {
      console.log("[MarketMetadata] Starting market sync...");
      const markets = await fetchAllActiveMarkets();

      let synced = 0;
      for (const gamma of markets) {
        try {
          const market = gammaToMarket(gamma);
          await detectionDb.upsertMarket(market);
          synced++;
        } catch (error) {
          console.error(`[MarketMetadata] Error syncing market ${gamma.conditionId}:`, error);
          syncStats.errors++;
        }
      }

      syncStats.totalSynced += synced;
      syncStats.lastSyncDuration = Date.now() - startTime;
      lastSyncAt = new Date();

      console.log(
        `[MarketMetadata] Synced ${synced} active markets in ${syncStats.lastSyncDuration}ms`
      );

      return synced;
    } catch (error) {
      console.error("[MarketMetadata] Sync failed:", error);
      syncStats.errors++;
      return 0;
    }
  },

  /**
   * Check for newly resolved markets and update database
   * Returns number of resolutions detected
   */
  async checkResolutions(): Promise<number> {
    try {
      console.log("[MarketMetadata] Checking for market resolutions...");

      // Get markets in our DB that are not yet resolved
      const unresolvedMarkets = await detectionDb.getActiveMarkets();

      if (unresolvedMarkets.length === 0) {
        return 0;
      }

      let resolutionCount = 0;

      // Check each unresolved market
      for (const market of unresolvedMarkets) {
        const gammaMarket = await fetchMarketByConditionId(market.conditionId);

        if (gammaMarket && gammaMarket.resolved) {
          // Market has resolved - update our database
          const updatedMarket = gammaToMarket(gammaMarket);
          updatedMarket.resolvedAt = new Date();
          await detectionDb.upsertMarket(updatedMarket);
          resolutionCount++;

          console.log(
            `[MarketMetadata] Market resolved: ${market.slug} -> ${updatedMarket.resolutionOutcome}`
          );

          // Invalidate cache
          await detectionCache.invalidateMarket(market.conditionId);
        }
      }

      console.log(`[MarketMetadata] Found ${resolutionCount} new resolutions`);
      return resolutionCount;
    } catch (error) {
      console.error("[MarketMetadata] Resolution check failed:", error);
      return 0;
    }
  },

  /**
   * Get market by condition ID (with caching)
   */
  async getMarket(conditionId: string): Promise<Market | null> {
    // Check cache first
    const cached = await detectionCache.getMarket(conditionId);
    if (cached) {
      return cached;
    }

    // Check database
    let market = await detectionDb.getMarket(conditionId);

    // If not in DB, fetch from API and store
    if (!market) {
      const gammaMarket = await fetchMarketByConditionId(conditionId);
      if (gammaMarket) {
        const marketData = gammaToMarket(gammaMarket);
        await detectionDb.upsertMarket(marketData);
        market = await detectionDb.getMarket(conditionId);
      }
    }

    // Cache the result
    if (market) {
      await detectionCache.setMarket(conditionId, market, MARKET_CACHE_TTL);
    }

    return market;
  },

  /**
   * Get markets near resolution (within N hours)
   */
  async getMarketsNearResolution(hours: number): Promise<Market[]> {
    return detectionDb.getMarketsNearResolution(hours);
  },

  /**
   * Get all active (unresolved) markets
   */
  async getActiveMarkets(): Promise<Market[]> {
    return detectionDb.getActiveMarkets();
  },

  /**
   * Warm the market cache on startup
   * Fetches and stores all active markets
   */
  async warmCache(): Promise<void> {
    console.log("[MarketMetadata] Warming market cache...");

    try {
      // Sync active markets from API
      await this.syncActiveMarkets();

      // Check for any recently resolved markets
      await this.checkResolutions();

      console.log("[MarketMetadata] Cache warming complete");
    } catch (error) {
      console.error("[MarketMetadata] Cache warming failed:", error);
    }
  },

  /**
   * Start background sync job (runs every 5 minutes)
   */
  startBackgroundSync(): void {
    if (syncInterval) {
      console.log("[MarketMetadata] Background sync already running");
      return;
    }

    console.log("[MarketMetadata] Starting background sync (every 5 min)");
    isRunning = true;

    syncInterval = setInterval(async () => {
      try {
        await this.syncActiveMarkets();
        await this.checkResolutions();
      } catch (error) {
        console.error("[MarketMetadata] Background sync error:", error);
        syncStats.errors++;
      }
    }, SYNC_INTERVAL_MS);
  },

  /**
   * Stop background sync job
   */
  stopBackgroundSync(): void {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      isRunning = false;
      console.log("[MarketMetadata] Background sync stopped");
    }
  },

  /**
   * Get sync status for health checks
   */
  getStatus(): {
    isRunning: boolean;
    lastSyncAt: Date | null;
    totalSynced: number;
    lastSyncDuration: number;
    errors: number;
  } {
    return {
      isRunning,
      lastSyncAt,
      ...syncStats,
    };
  },

  /**
   * Manual trigger for full sync (useful for testing)
   */
  async triggerSync(): Promise<{ marketsUpdated: number; resolutionsFound: number }> {
    const marketsUpdated = await this.syncActiveMarkets();
    const resolutionsFound = await this.checkResolutions();
    return { marketsUpdated, resolutionsFound };
  },
};
