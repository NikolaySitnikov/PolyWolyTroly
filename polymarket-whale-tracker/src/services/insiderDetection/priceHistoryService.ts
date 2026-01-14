/**
 * Price History Service for Insider Trading Detection
 *
 * Tracks token prices over time for Mark-to-Market (MTM) calculations.
 * Used by Rule #2 (Pre-Move Advantage) to detect trades that gain
 * significant value shortly after execution.
 *
 * Key responsibilities:
 * - Record price snapshots from CLOB order book mid-price
 * - Retrieve historical prices for a given timestamp
 * - Calculate price changes over time windows
 * - Calculate MTM gain for a trade position
 * - Fallback to Gamma API for price data when CLOB unavailable
 *
 * Data sources:
 * 1. CLOB mid-price (primary) - captured during depth polling
 * 2. Gamma API (fallback) - for markets without active order books
 */

import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import { marketMetadataService } from "./marketMetadataService.js";
import type { PriceHistory, PriceSource, Market } from "./types.js";

// Gamma API base URL for price data
const GAMMA_API = "https://gamma-api.polymarket.com";

// Price recording interval (aligned with depth polling)
const DEFAULT_RECORD_INTERVAL_MS = 30 * 1000;

// Maximum age for "fresh" cached price (30 seconds)
const PRICE_CACHE_FRESHNESS_MS = 30 * 1000;

// Default lookback for MTM calculation (1 hour)
const DEFAULT_MTM_LOOKBACK_HOURS = 1;

// Rate limiting for Gamma API
const MAX_GAMMA_REQUESTS_PER_SECOND = 3;

// Service state
let recordingInterval: ReturnType<typeof setInterval> | null = null;
let gammaPollingInterval: ReturnType<typeof setInterval> | null = null;
let isRecording = false;
let stats = {
  pricesRecorded: 0,
  cacheHits: 0,
  cacheMisses: 0,
  gammaFallbacks: 0,
  errors: 0,
};

/**
 * Gamma API price response
 */
interface GammaPriceResponse {
  conditionId: string;
  outcomePrices: string; // JSON string of [yesPrice, noPrice]
  volume: string;
}

/**
 * Calculate mid-price from outcome prices
 */
function calculateYesMidPrice(outcomePrices: string): number | null {
  try {
    const prices = JSON.parse(outcomePrices);
    if (Array.isArray(prices) && prices.length >= 1) {
      return parseFloat(prices[0]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch price from Gamma API for a market
 */
async function fetchGammaPrice(conditionId: string): Promise<number | null> {
  try {
    const url = `${GAMMA_API}/markets/${conditionId}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as GammaPriceResponse;
    return calculateYesMidPrice(data.outcomePrices);
  } catch (error) {
    console.error(`[PriceHistory] Gamma API error for ${conditionId}:`, error);
    return null;
  }
}

/**
 * Price History Service
 */
export const priceHistoryService = {
  /**
   * Record a price snapshot for a market
   *
   * @param conditionId Market condition ID
   * @param price YES token price (0-1)
   * @param tokenId YES token ID
   * @param source Price data source
   * @param recordedAt Timestamp of the price (defaults to now)
   * @returns ID of recorded price or null if failed
   */
  async recordPrice(
    conditionId: string,
    price: number,
    tokenId: string,
    source: PriceSource = "clob",
    recordedAt: Date = new Date()
  ): Promise<number | null> {
    try {
      const priceRecord: Omit<PriceHistory, "id"> = {
        conditionId,
        tokenId,
        price,
        source,
        recordedAt,
      };

      // Store in database
      const id = await detectionDb.recordPrice(priceRecord);

      // Update cache with latest price
      if (id) {
        await detectionCache.setLatestPrice(conditionId, {
          ...priceRecord,
          id,
        });
        stats.pricesRecorded++;
      }

      return id;
    } catch (error) {
      console.error(`[PriceHistory] Error recording price for ${conditionId}:`, error);
      stats.errors++;
      return null;
    }
  },

  /**
   * Get price for a market at a specific timestamp
   *
   * Returns the most recent price at or before the given timestamp.
   * Uses cache for recent prices, falls back to database.
   *
   * @param conditionId Market condition ID
   * @param timestamp Target timestamp
   * @returns Price record or null if not found
   */
  async getPrice(conditionId: string, timestamp: Date): Promise<PriceHistory | null> {
    const now = Date.now();
    const targetTime = timestamp.getTime();

    // If asking for recent price, check cache first
    if (now - targetTime < PRICE_CACHE_FRESHNESS_MS) {
      const cached = await detectionCache.getLatestPrice(conditionId);
      if (cached && cached.recordedAt.getTime() <= targetTime) {
        stats.cacheHits++;
        return cached;
      }
    }

    stats.cacheMisses++;
    return detectionDb.getPrice(conditionId, timestamp);
  },

  /**
   * Get the latest price for a market
   *
   * @param conditionId Market condition ID
   * @returns Latest price record or null
   */
  async getLatestPrice(conditionId: string): Promise<PriceHistory | null> {
    // Check cache first
    const cached = await detectionCache.getLatestPrice(conditionId);
    if (cached) {
      stats.cacheHits++;
      return cached;
    }

    stats.cacheMisses++;
    const price = await detectionDb.getLatestPrice(conditionId);

    // Populate cache if found
    if (price) {
      await detectionCache.setLatestPrice(conditionId, price);
    }

    return price;
  },

  /**
   * Get price history for a market in a time range
   *
   * @param conditionId Market condition ID
   * @param fromTime Start of time range
   * @param toTime End of time range
   * @returns Array of price records
   */
  async getPriceHistory(
    conditionId: string,
    fromTime: Date,
    toTime: Date
  ): Promise<PriceHistory[]> {
    return detectionDb.getPriceHistory(conditionId, fromTime, toTime);
  },

  /**
   * Calculate price change percentage between two timestamps
   *
   * @param conditionId Market condition ID
   * @param fromTime Start timestamp
   * @param toTime End timestamp
   * @returns Price change as decimal (e.g., 0.08 = 8% increase) or null if prices unavailable
   */
  async getPriceChange(
    conditionId: string,
    fromTime: Date,
    toTime: Date
  ): Promise<number | null> {
    const [fromPrice, toPrice] = await Promise.all([
      this.getPrice(conditionId, fromTime),
      this.getPrice(conditionId, toTime),
    ]);

    if (!fromPrice || !toPrice) {
      return null;
    }

    // Avoid division by zero
    if (fromPrice.price === 0) {
      return null;
    }

    return (toPrice.price - fromPrice.price) / fromPrice.price;
  },

  /**
   * Calculate Mark-to-Market (MTM) gain for a trade
   *
   * MTM gain = (current_price - entry_price) / entry_price
   *
   * For YES positions: positive MTM means price went up
   * For NO positions: positive MTM means YES price went down (invert calculation)
   *
   * @param conditionId Market condition ID
   * @param entryPrice Price at entry
   * @param entryTime Time of entry
   * @param afterHours Hours after entry to evaluate (default: 1)
   * @param side Position side (YES or NO)
   * @returns MTM result or null if price unavailable
   */
  async calculateMTM(
    conditionId: string,
    entryPrice: number,
    entryTime: Date,
    afterHours: number = DEFAULT_MTM_LOOKBACK_HOURS,
    side: "YES" | "NO" = "YES"
  ): Promise<{
    mtmGain: number;
    priceAtEvaluation: number;
    evaluationTime: Date;
  } | null> {
    // Calculate evaluation time
    const evaluationTime = new Date(entryTime.getTime() + afterHours * 60 * 60 * 1000);

    // Get price at evaluation time
    const priceRecord = await this.getPrice(conditionId, evaluationTime);

    if (!priceRecord) {
      return null;
    }

    // Avoid division by zero
    if (entryPrice === 0) {
      return null;
    }

    // Calculate MTM based on side
    let mtmGain: number;
    if (side === "YES") {
      // For YES: gain when price goes up
      mtmGain = (priceRecord.price - entryPrice) / entryPrice;
    } else {
      // For NO: gain when YES price goes down
      // NO value = 1 - YES price, so NO gain = (1 - currentYesPrice) - (1 - entryYesPrice)
      // = entryYesPrice - currentYesPrice
      // Relative gain = (entryYesPrice - currentYesPrice) / (1 - entryYesPrice)
      const noEntryValue = 1 - entryPrice;
      if (noEntryValue === 0) {
        return null;
      }
      mtmGain = (entryPrice - priceRecord.price) / noEntryValue;
    }

    return {
      mtmGain,
      priceAtEvaluation: priceRecord.price,
      evaluationTime,
    };
  },

  /**
   * Calculate volatility for a market over a time window
   *
   * Uses standard deviation of price changes as a simple volatility measure.
   *
   * @param conditionId Market condition ID
   * @param hours Lookback window in hours
   * @returns Volatility as decimal (standard deviation of returns) or null
   */
  async getVolatility(conditionId: string, hours: number): Promise<number | null> {
    const toTime = new Date();
    const fromTime = new Date(toTime.getTime() - hours * 60 * 60 * 1000);

    const prices = await this.getPriceHistory(conditionId, fromTime, toTime);

    if (prices.length < 2) {
      return null;
    }

    // Calculate returns (price changes)
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1].price > 0) {
        const ret = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
        returns.push(ret);
      }
    }

    if (returns.length === 0) {
      return null;
    }

    // Calculate mean return
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate variance
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    // Return standard deviation
    return Math.sqrt(variance);
  },

  /**
   * Check if market is in a volatile regime
   *
   * Compares recent volatility to historical median volatility.
   *
   * @param conditionId Market condition ID
   * @param recentHours Recent window for volatility
   * @param historicalHours Historical window for median
   * @param multiplier Threshold multiplier (e.g., 1.5x median = volatile)
   * @returns True if in volatile regime
   */
  async isVolatileRegime(
    conditionId: string,
    recentHours: number = 24,
    historicalHours: number = 168, // 7 days
    multiplier: number = 1.5
  ): Promise<boolean> {
    const [recentVol, historicalVol] = await Promise.all([
      this.getVolatility(conditionId, recentHours),
      this.getVolatility(conditionId, historicalHours),
    ]);

    if (recentVol === null || historicalVol === null || historicalVol === 0) {
      // Default to non-volatile if we can't calculate
      return false;
    }

    return recentVol > historicalVol * multiplier;
  },

  /**
   * Record price from depth snapshot
   *
   * Called by marketDepthService when capturing depth.
   * Extracts mid-price and records to price history.
   *
   * @param conditionId Market condition ID
   * @param midPrice Mid-price from order book
   * @param tokenId YES token ID
   */
  async recordPriceFromDepth(
    conditionId: string,
    midPrice: number,
    tokenId: string
  ): Promise<void> {
    if (midPrice <= 0 || midPrice >= 1) {
      // Invalid price - skip
      return;
    }

    await this.recordPrice(conditionId, midPrice, tokenId, "clob");
  },

  /**
   * Fetch and record price from Gamma API (fallback)
   *
   * Used for markets without active order books or when CLOB is unavailable.
   *
   * @param conditionId Market condition ID
   * @returns True if price was recorded
   */
  async recordPriceFromGamma(conditionId: string): Promise<boolean> {
    const price = await fetchGammaPrice(conditionId);

    if (price === null || price <= 0 || price >= 1) {
      return false;
    }

    // Get market metadata for token ID
    const market = await marketMetadataService.getMarket(conditionId);
    const tokenId = market?.outcomeYesTokenId || conditionId;

    const id = await this.recordPrice(conditionId, price, tokenId, "gamma");
    if (id) {
      stats.gammaFallbacks++;
      return true;
    }
    return false;
  },

  /**
   * Poll Gamma API for prices of markets without recent CLOB data
   *
   * This is a background job that runs periodically to fill in
   * price data for markets that may not have active order books.
   *
   * @param markets List of markets to check
   * @param maxAgeMinutes Maximum age of CLOB price before using Gamma
   */
  async pollGammaFallback(markets: Market[], maxAgeMinutes: number = 5): Promise<number> {
    let recorded = 0;
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    for (const market of markets) {
      // Check if we have recent CLOB price
      const latest = await this.getLatestPrice(market.conditionId);

      if (!latest || latest.recordedAt < cutoff) {
        // No recent CLOB price - try Gamma
        const success = await this.recordPriceFromGamma(market.conditionId);
        if (success) {
          recorded++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000 / MAX_GAMMA_REQUESTS_PER_SECOND));
      }
    }

    return recorded;
  },

  /**
   * Start background Gamma polling for markets without CLOB prices
   *
   * @param intervalMs Polling interval in milliseconds (default: 60s)
   */
  startGammaPolling(intervalMs: number = 60 * 1000): void {
    if (gammaPollingInterval) {
      console.log("[PriceHistory] Gamma polling already running");
      return;
    }

    console.log(`[PriceHistory] Starting Gamma fallback polling (every ${intervalMs / 1000}s)`);

    gammaPollingInterval = setInterval(async () => {
      try {
        const markets = await marketMetadataService.getActiveMarkets();
        const recorded = await this.pollGammaFallback(markets);
        if (recorded > 0) {
          console.log(`[PriceHistory] Recorded ${recorded} prices from Gamma API`);
        }
      } catch (error) {
        console.error("[PriceHistory] Gamma polling error:", error);
        stats.errors++;
      }
    }, intervalMs);
  },

  /**
   * Stop background Gamma polling
   */
  stopGammaPolling(): void {
    if (gammaPollingInterval) {
      clearInterval(gammaPollingInterval);
      gammaPollingInterval = null;
      console.log("[PriceHistory] Gamma polling stopped");
    }
  },

  /**
   * Get service status for health checks
   */
  getStatus(): {
    isRecording: boolean;
    pricesRecorded: number;
    cacheHits: number;
    cacheMisses: number;
    gammaFallbacks: number;
    errors: number;
    cacheHitRate: string;
  } {
    const total = stats.cacheHits + stats.cacheMisses;
    const hitRate = total > 0 ? ((stats.cacheHits / total) * 100).toFixed(1) : "0";

    return {
      isRecording,
      ...stats,
      cacheHitRate: `${hitRate}%`,
    };
  },

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    stats = {
      pricesRecorded: 0,
      cacheHits: 0,
      cacheMisses: 0,
      gammaFallbacks: 0,
      errors: 0,
    };
  },
};
