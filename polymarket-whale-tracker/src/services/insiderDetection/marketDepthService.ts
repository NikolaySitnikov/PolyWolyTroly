/**
 * Market Depth Service for Insider Trading Detection
 *
 * Polls the Polymarket CLOB API to capture order book depth snapshots.
 * Used for detecting large trades relative to available liquidity.
 *
 * Key responsibilities:
 * - Fetch order book from CLOB API for active markets
 * - Extract depth at 2/5/10 tick levels
 * - Calculate liquidity metrics (bid/ask at each level)
 * - Store snapshots in `depth_snapshots` table
 * - Calculate 30-day rolling median liquidity (hourly job)
 * - Background polling with configurable interval
 *
 * CLOB API: https://clob.polymarket.com/book?token_id={tokenId}
 * Documentation: https://docs.polymarket.com/api-reference/orderbook/get-order-book-summary
 */

import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import { marketMetadataService } from "./marketMetadataService.js";
import type { DepthSnapshot, OrderBookLevel, Market } from "./types.js";

// Lazy import to avoid circular dependency
let priceHistoryService: typeof import("./priceHistoryService.js").priceHistoryService | null = null;

async function getPriceHistoryService() {
  if (!priceHistoryService) {
    const module = await import("./priceHistoryService.js");
    priceHistoryService = module.priceHistoryService;
  }
  return priceHistoryService;
}

// CLOB API base URL
const CLOB_API = "https://clob.polymarket.com";

// Default polling interval: 30 seconds (adjusted from original 5s to reduce load)
// Can be configured via environment variable
const DEFAULT_POLL_INTERVAL_MS = 30 * 1000;

// Median calculation interval: 1 hour
const MEDIAN_CALC_INTERVAL_MS = 60 * 60 * 1000;

// Rate limiting: max requests per second
const MAX_REQUESTS_PER_SECOND = 5;

// Batch size for market depth fetching
const BATCH_SIZE = 10;

// Cache TTL for depth data: 30 seconds
const DEPTH_CACHE_TTL = 30;

// Maximum number of markets to poll in background
// See: Implementation/decisions/001_depth_polling_strategy.md
// Rationale: Polling all 5,500+ markets causes DB connection pool exhaustion
// Instead, we poll top markets by volume and fetch others on-demand
const MAX_BACKGROUND_POLL_MARKETS = 100;

// Tick levels to extract (in percentage points: 0.02 = 2%, 0.05 = 5%, 0.10 = 10%)
const TICK_LEVELS = {
  LEVEL_2: 0.02,
  LEVEL_5: 0.05,
  LEVEL_10: 0.10,
} as const;

/**
 * CLOB API order book response structure
 */
interface ClobOrderBook {
  market: string;
  asset_id: string;
  timestamp: string;
  hash: string;
  bids: ClobPriceLevel[];
  asks: ClobPriceLevel[];
  min_order_size?: string;
  tick_size?: string;
  neg_risk?: boolean;
}

interface ClobPriceLevel {
  price: string;
  size: string;
}

/**
 * Service state
 */
let pollInterval: ReturnType<typeof setInterval> | null = null;
let medianInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastPollAt: Date | null = null;
let pollStats = {
  totalSnapshots: 0,
  lastPollDuration: 0,
  errors: 0,
  marketsPolled: 0,
};

/**
 * Fetch order book from CLOB API for a specific token
 */
async function fetchOrderBook(tokenId: string): Promise<ClobOrderBook | null> {
  try {
    const url = `${CLOB_API}/book?token_id=${tokenId}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        // Market not found - may be resolved or delisted
        return null;
      }
      console.error(`[MarketDepth] CLOB API error for ${tokenId}: ${response.status}`);
      return null;
    }

    return await response.json() as ClobOrderBook;
  } catch (error) {
    console.error(`[MarketDepth] Error fetching order book for ${tokenId}:`, error);
    return null;
  }
}

/**
 * Calculate mid price from best bid and ask
 */
function calculateMidPrice(bids: ClobPriceLevel[], asks: ClobPriceLevel[]): number | undefined {
  if (bids.length === 0 || asks.length === 0) {
    return undefined;
  }

  const bestBid = parseFloat(bids[0].price);
  const bestAsk = parseFloat(asks[0].price);

  return (bestBid + bestAsk) / 2;
}

/**
 * Calculate spread from best bid and ask
 */
function calculateSpread(bids: ClobPriceLevel[], asks: ClobPriceLevel[]): number | undefined {
  if (bids.length === 0 || asks.length === 0) {
    return undefined;
  }

  const bestBid = parseFloat(bids[0].price);
  const bestAsk = parseFloat(asks[0].price);

  return bestAsk - bestBid;
}

/**
 * Extract order book levels within a tick range from mid price
 *
 * @param levels Array of price levels (bids or asks)
 * @param midPrice The mid price to measure from
 * @param tickRange The tick range (e.g., 0.02 = 2%)
 * @param isBid Whether these are bid levels (affects price comparison)
 * @returns Filtered levels within the tick range and total liquidity
 */
function extractLevelsWithinTicks(
  levels: ClobPriceLevel[],
  midPrice: number,
  tickRange: number,
  isBid: boolean
): { levels: OrderBookLevel[]; liquidity: number } {
  const filteredLevels: OrderBookLevel[] = [];
  let totalLiquidity = 0;

  for (const level of levels) {
    const price = parseFloat(level.price);
    const size = parseFloat(level.size);

    // Calculate distance from mid price
    const distance = Math.abs(price - midPrice);

    // Check if within tick range
    if (distance <= tickRange) {
      filteredLevels.push({ price, size });
      // Liquidity in USD = size * price (since Polymarket prices are probabilities 0-1)
      // For bids: what you'd get if you sold at this price
      // For asks: what you'd pay if you bought at this price
      totalLiquidity += size * price;
    }
  }

  return { levels: filteredLevels, liquidity: totalLiquidity };
}

/**
 * Extract depth snapshot from order book data
 *
 * IMPORTANT: When order book is one-sided (no bids or no asks), we do NOT
 * default to 0.5 for mid_price. This caused critical bugs where markets
 * trading at near-zero (e.g., YES at 0.05%) would show as 50% price,
 * leading to 1000x overestimation of trade values.
 *
 * Instead, we:
 * 1. Return undefined for midPrice when order book is one-sided
 * 2. Use the best available price (best bid or best ask) as reference for depth calculations
 * 3. This prevents price_history from recording incorrect 0.5 values
 */
function extractDepthSnapshot(
  conditionId: string,
  orderBook: ClobOrderBook
): Omit<DepthSnapshot, 'id'> {
  const midPrice = calculateMidPrice(orderBook.bids, orderBook.asks);
  const spread = calculateSpread(orderBook.bids, orderBook.asks);

  // DO NOT default to 0.5 - this causes critical pricing bugs!
  // If no mid price (one-sided order book), use best available price for depth calc
  // but leave midPrice as undefined so it doesn't get recorded incorrectly
  let refPrice: number;
  if (midPrice !== undefined) {
    refPrice = midPrice;
  } else if (orderBook.bids.length > 0) {
    // Only bids exist - use best bid as reference
    refPrice = parseFloat(orderBook.bids[0].price);
  } else if (orderBook.asks.length > 0) {
    // Only asks exist - use best ask as reference
    refPrice = parseFloat(orderBook.asks[0].price);
  } else {
    // Completely empty order book - use 0.5 as last resort for depth calc only
    // midPrice will still be undefined (not stored)
    refPrice = 0.5;
  }

  // Extract levels at different tick depths
  const bids2 = extractLevelsWithinTicks(orderBook.bids, refPrice, TICK_LEVELS.LEVEL_2, true);
  const asks2 = extractLevelsWithinTicks(orderBook.asks, refPrice, TICK_LEVELS.LEVEL_2, false);

  const bids5 = extractLevelsWithinTicks(orderBook.bids, refPrice, TICK_LEVELS.LEVEL_5, true);
  const asks5 = extractLevelsWithinTicks(orderBook.asks, refPrice, TICK_LEVELS.LEVEL_5, false);

  const bids10 = extractLevelsWithinTicks(orderBook.bids, refPrice, TICK_LEVELS.LEVEL_10, true);
  const asks10 = extractLevelsWithinTicks(orderBook.asks, refPrice, TICK_LEVELS.LEVEL_10, false);

  return {
    conditionId,
    snapshotAt: new Date(),
    depth2tick: [...bids2.levels, ...asks2.levels],
    depth5tick: [...bids5.levels, ...asks5.levels],
    depth10tick: [...bids10.levels, ...asks10.levels],
    bidLiquidity2tick: bids2.liquidity,
    askLiquidity2tick: asks2.liquidity,
    bidLiquidity5tick: bids5.liquidity,
    askLiquidity5tick: asks5.liquidity,
    midPrice,
    spread,
    // medianLiquidity30d is calculated separately by the hourly job
  };
}

/**
 * Fetch and store depth snapshot for a single market
 */
async function captureMarketDepth(market: Market): Promise<boolean> {
  // Use YES token for order book (primary market side)
  const tokenId = market.outcomeYesTokenId;

  if (!tokenId) {
    console.warn(`[MarketDepth] No YES token ID for market ${market.conditionId}`);
    return false;
  }

  try {
    const orderBook = await fetchOrderBook(tokenId);

    if (!orderBook) {
      return false;
    }

    const snapshot = extractDepthSnapshot(market.conditionId, orderBook);
    await detectionDb.insertDepthSnapshot(snapshot);

    // Cache the latest snapshot
    await detectionCache.setLatestDepth(market.conditionId, snapshot);

    // Record price for price history (Phase 1.2)
    // This enables MTM calculations for Rule #2 (Pre-Move Advantage)
    if (snapshot.midPrice !== undefined && snapshot.midPrice > 0 && snapshot.midPrice < 1) {
      const priceService = await getPriceHistoryService();
      await priceService.recordPriceFromDepth(market.conditionId, snapshot.midPrice, tokenId);
    }

    return true;
  } catch (error) {
    console.error(`[MarketDepth] Error capturing depth for ${market.conditionId}:`, error);
    return false;
  }
}

/**
 * Rate-limited batch processing
 * Processes markets in batches with delays to respect rate limits
 */
async function processBatchWithRateLimit(
  markets: Market[],
  processor: (market: Market) => Promise<boolean>
): Promise<number> {
  let successCount = 0;
  const delayMs = 1000 / MAX_REQUESTS_PER_SECOND;

  for (let i = 0; i < markets.length; i += BATCH_SIZE) {
    const batch = markets.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const results = await Promise.all(batch.map(processor));
    successCount += results.filter(Boolean).length;

    // Rate limit delay between batches
    if (i + BATCH_SIZE < markets.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs * BATCH_SIZE));
    }
  }

  return successCount;
}

/**
 * Calculate 30-day rolling median liquidity for a market
 */
async function calculateMedianLiquidity(conditionId: string): Promise<number | null> {
  try {
    // Get snapshots from last 30 days (720 hours)
    const snapshots = await detectionDb.getRecentSnapshots(conditionId, 720);

    if (snapshots.length === 0) {
      return null;
    }

    // Extract total liquidity (bid + ask at 2-tick level) from each snapshot
    const liquidities = snapshots
      .map(s => (s.bidLiquidity2tick || 0) + (s.askLiquidity2tick || 0))
      .filter(l => l > 0)
      .sort((a, b) => a - b);

    if (liquidities.length === 0) {
      return null;
    }

    // Calculate median
    const mid = Math.floor(liquidities.length / 2);
    return liquidities.length % 2 === 0
      ? (liquidities[mid - 1] + liquidities[mid]) / 2
      : liquidities[mid];
  } catch (error) {
    console.error(`[MarketDepth] Error calculating median for ${conditionId}:`, error);
    return null;
  }
}

/**
 * Update median liquidity for top markets by volume
 *
 * Only calculates median for markets in the background polling set
 * to avoid excessive database queries.
 */
async function updateAllMedianLiquidity(): Promise<number> {
  try {
    const markets = await marketMetadataService.getActiveMarkets();

    // Only update median for top markets (same as polling)
    const topMarkets = markets
      .filter(m => m.outcomeYesTokenId)
      .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
      .slice(0, MAX_BACKGROUND_POLL_MARKETS);

    let updated = 0;

    for (const market of topMarkets) {
      const median = await calculateMedianLiquidity(market.conditionId);

      if (median !== null) {
        // Store median in the latest snapshot
        // Note: This updates the most recent snapshot rather than creating a new one
        const latestSnapshot = await detectionDb.getLatestSnapshot(market.conditionId);
        if (latestSnapshot) {
          latestSnapshot.medianLiquidity30d = median;
          // Cache the updated snapshot
          await detectionCache.setLatestDepth(market.conditionId, latestSnapshot);
        }
        updated++;
      }
    }

    console.log(`[MarketDepth] Updated median liquidity for ${updated}/${topMarkets.length} top markets`);
    return updated;
  } catch (error) {
    console.error("[MarketDepth] Error updating median liquidity:", error);
    return 0;
  }
}

/**
 * Market Depth Service
 */
export const marketDepthService = {
  /**
   * Capture depth snapshots for top markets by volume
   *
   * Note: Only polls top MAX_BACKGROUND_POLL_MARKETS markets to avoid
   * database connection pool exhaustion. Other markets can be fetched
   * on-demand via captureDepth() or captureDepthOnDemand().
   *
   * See: Implementation/decisions/001_depth_polling_strategy.md
   *
   * @returns Number of markets successfully polled
   */
  async pollAllMarkets(): Promise<number> {
    const startTime = Date.now();

    try {
      console.log("[MarketDepth] Starting depth poll...");

      // Get active markets from metadata service
      const markets = await marketMetadataService.getActiveMarkets();

      if (markets.length === 0) {
        console.log("[MarketDepth] No active markets to poll");
        return 0;
      }

      // Filter to only markets with YES token IDs
      const marketsWithTokens = markets.filter(m => m.outcomeYesTokenId);

      if (marketsWithTokens.length === 0) {
        console.log("[MarketDepth] No markets with token IDs");
        return 0;
      }

      // Sort by 24h volume (descending) and take top N markets
      // This ensures we capture depth for the most active markets
      const topMarkets = marketsWithTokens
        .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
        .slice(0, MAX_BACKGROUND_POLL_MARKETS);

      console.log(
        `[MarketDepth] Polling top ${topMarkets.length} markets by volume (of ${marketsWithTokens.length} total)`
      );

      // Process with rate limiting
      const successCount = await processBatchWithRateLimit(
        topMarkets,
        captureMarketDepth
      );

      pollStats.totalSnapshots += successCount;
      pollStats.lastPollDuration = Date.now() - startTime;
      pollStats.marketsPolled = successCount;
      lastPollAt = new Date();

      console.log(
        `[MarketDepth] Captured ${successCount}/${topMarkets.length} depth snapshots in ${pollStats.lastPollDuration}ms`
      );

      return successCount;
    } catch (error) {
      console.error("[MarketDepth] Poll failed:", error);
      pollStats.errors++;
      return 0;
    }
  },

  /**
   * Capture depth snapshot for a single market
   */
  async captureDepth(conditionId: string): Promise<DepthSnapshot | null> {
    const market = await marketMetadataService.getMarket(conditionId);

    if (!market) {
      console.warn(`[MarketDepth] Market not found: ${conditionId}`);
      return null;
    }

    const success = await captureMarketDepth(market);

    if (success) {
      return detectionDb.getLatestSnapshot(conditionId);
    }

    return null;
  },

  /**
   * Fetch depth on-demand for a market (with caching)
   *
   * Use this for markets outside the top MAX_BACKGROUND_POLL_MARKETS.
   * Returns cached depth if fresh (< 30s), otherwise fetches new data.
   *
   * @returns Depth snapshot or null if unavailable
   */
  async captureDepthOnDemand(conditionId: string): Promise<DepthSnapshot | null> {
    // Check cache first
    const cached = await detectionCache.getLatestDepth(conditionId);
    if (cached) {
      return cached;
    }

    // Not cached - fetch fresh data
    return this.captureDepth(conditionId);
  },

  /**
   * Get latest depth snapshot for a market (with caching)
   */
  async getLatestDepth(conditionId: string): Promise<DepthSnapshot | null> {
    // Check cache first
    const cached = await detectionCache.getLatestDepth(conditionId);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const snapshot = await detectionDb.getLatestSnapshot(conditionId);

    if (snapshot) {
      await detectionCache.setLatestDepth(conditionId, snapshot);
    }

    return snapshot;
  },

  /**
   * Get depth history for a market
   */
  async getDepthHistory(conditionId: string, hours: number): Promise<DepthSnapshot[]> {
    return detectionDb.getRecentSnapshots(conditionId, hours);
  },

  /**
   * Get liquidity at specific tick level for a market
   * Useful for calculating trade size vs. available liquidity
   */
  async getLiquidityAtTick(
    conditionId: string,
    tickLevel: 2 | 5 | 10 = 2
  ): Promise<{ bid: number; ask: number; total: number } | null> {
    const snapshot = await this.getLatestDepth(conditionId);

    if (!snapshot) {
      return null;
    }

    let bidLiquidity: number;
    let askLiquidity: number;

    switch (tickLevel) {
      case 2:
        bidLiquidity = snapshot.bidLiquidity2tick || 0;
        askLiquidity = snapshot.askLiquidity2tick || 0;
        break;
      case 5:
        bidLiquidity = snapshot.bidLiquidity5tick || 0;
        askLiquidity = snapshot.askLiquidity5tick || 0;
        break;
      case 10:
        // Calculate 10-tick from stored depth levels
        const levels10 = snapshot.depth10tick || [];
        bidLiquidity = levels10
          .filter(l => l.price <= (snapshot.midPrice || 0.5))
          .reduce((sum, l) => sum + l.size * l.price, 0);
        askLiquidity = levels10
          .filter(l => l.price > (snapshot.midPrice || 0.5))
          .reduce((sum, l) => sum + l.size * l.price, 0);
        break;
    }

    return {
      bid: bidLiquidity,
      ask: askLiquidity,
      total: bidLiquidity + askLiquidity,
    };
  },

  /**
   * Calculate depth ratio (trade size / available liquidity)
   * Used for detecting large trades relative to market depth
   */
  async calculateDepthRatio(
    conditionId: string,
    tradeSizeUsd: number,
    tickLevel: 2 | 5 | 10 = 2
  ): Promise<number | null> {
    const liquidity = await this.getLiquidityAtTick(conditionId, tickLevel);

    if (!liquidity || liquidity.total === 0) {
      return null;
    }

    return tradeSizeUsd / liquidity.total;
  },

  /**
   * Start background polling job
   * @param intervalMs Polling interval in milliseconds (default: 30s)
   */
  startPolling(intervalMs: number = DEFAULT_POLL_INTERVAL_MS): void {
    if (pollInterval) {
      console.log("[MarketDepth] Polling already running");
      return;
    }

    console.log(`[MarketDepth] Starting polling (every ${intervalMs / 1000}s)`);
    isRunning = true;

    // Initial poll
    this.pollAllMarkets().catch(err => {
      console.error("[MarketDepth] Initial poll error:", err);
    });

    // Set up recurring poll
    pollInterval = setInterval(async () => {
      try {
        await this.pollAllMarkets();
      } catch (error) {
        console.error("[MarketDepth] Polling error:", error);
        pollStats.errors++;
      }
    }, intervalMs);

    // Start hourly median calculation job
    console.log("[MarketDepth] Starting hourly median calculation job");
    medianInterval = setInterval(async () => {
      try {
        await updateAllMedianLiquidity();
      } catch (error) {
        console.error("[MarketDepth] Median calculation error:", error);
      }
    }, MEDIAN_CALC_INTERVAL_MS);
  },

  /**
   * Stop background polling job
   */
  stopPolling(): void {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    if (medianInterval) {
      clearInterval(medianInterval);
      medianInterval = null;
    }

    isRunning = false;
    console.log("[MarketDepth] Polling stopped");
  },

  /**
   * Get service status for health checks
   */
  getStatus(): {
    isRunning: boolean;
    lastPollAt: Date | null;
    totalSnapshots: number;
    lastPollDuration: number;
    marketsPolled: number;
    errors: number;
  } {
    return {
      isRunning,
      lastPollAt,
      ...pollStats,
    };
  },

  /**
   * Force update median liquidity for all markets
   * (useful for initial setup or manual trigger)
   */
  async updateMedianLiquidity(): Promise<number> {
    return updateAllMedianLiquidity();
  },

  /**
   * Get median liquidity for a specific market
   */
  async getMedianLiquidity(conditionId: string): Promise<number | null> {
    return calculateMedianLiquidity(conditionId);
  },
};
