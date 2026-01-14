/**
 * Cache Warmer Service
 *
 * Background service that proactively fetches and caches trading data
 * for top whales, ensuring instant data availability in the whale table.
 *
 * Strategy:
 * - On startup: warm cache for top 100 whales (first 5 pages)
 * - Continuously: cycle through all whales, refreshing stale cache entries
 * - Rate limited: respects Polymarket API limits (~1 req/sec)
 */

import { db } from "./database.js";
import { tradingCache } from "./polymarketTradingCache.js";
import { polymarketApi } from "./polymarketApi.js";

// Configuration
const TOP_WHALES_COUNT = 100; // Warm top 100 on startup
const BATCH_SIZE = 10; // Fetch 10 whales in parallel (faster warming)
const DELAY_BETWEEN_BATCHES_MS = 1500; // 1.5 seconds between batches
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes - re-warm cache
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes - match Redis TTL

let isRunning = false;
let warmingInProgress = false;

/**
 * Warm cache for a single wallet
 * Returns the trading data if successful, null if failed
 * Also persists trading metrics to the database for filtering/sorting
 */
async function warmWallet(address: string): Promise<{
  address: string;
  pnl: number;
  pnl7d: number;
  pnl30d: number;
  winRate: number;
  portfolioValue: number;
  totalTrades: number;
  lastActivityAt: string | null;
  isLive: boolean;
} | null> {
  try {
    // Check if already cached and fresh
    const cached = await tradingCache.getTradingData(address);
    if (cached) {
      // Already cached, return the metrics for DB update
      return {
        address,
        pnl: cached.metrics.pnl,
        pnl7d: cached.metrics.pnl7d,
        pnl30d: cached.metrics.pnl30d,
        winRate: cached.metrics.winRate,
        portfolioValue: cached.metrics.portfolioValue,
        totalTrades: cached.metrics.totalTrades,
        lastActivityAt: cached.metrics.lastActivityAt,
        isLive: cached.metrics.isLive,
      };
    }

    // Fetch fresh data
    const data = await polymarketApi.getWalletTradingData(address);
    await tradingCache.setTradingData(address, data);

    // Return metrics for DB persistence
    return {
      address,
      pnl: data.metrics.pnl,
      pnl7d: data.metrics.pnl7d,
      pnl30d: data.metrics.pnl30d,
      winRate: data.metrics.winRate,
      portfolioValue: data.metrics.portfolioValue,
      totalTrades: data.metrics.totalTrades,
      lastActivityAt: data.metrics.lastActivityAt,
      isLive: data.metrics.isLive,
    };
  } catch (error) {
    console.error(`[CacheWarmer] Failed to warm ${address.slice(0, 10)}...:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Warm cache for a batch of wallets in parallel
 * Also persists trading metrics to DB for filtering/sorting
 */
async function warmBatch(addresses: string[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    addresses.map(addr => warmWallet(addr))
  );

  let success = 0;
  let failed = 0;
  const metricsToUpdate: Array<{
    address: string;
    pnl: number;
    pnl7d: number;
    pnl30d: number;
    winRate: number;
    portfolioValue: number;
    totalTrades: number;
    lastActivityAt: string | null;
    isLive: boolean;
  }> = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      success++;
      metricsToUpdate.push(result.value);
    } else {
      failed++;
    }
  }

  // Persist trading metrics to database for filtering/sorting
  if (metricsToUpdate.length > 0) {
    try {
      await db.batchUpdateTradingMetrics(metricsToUpdate);
    } catch (error) {
      console.error("[CacheWarmer] Failed to persist metrics to DB:", error);
    }
  }

  return { success, failed };
}

/**
 * Warm cache for top N whales
 * Called on startup and periodically
 */
async function warmTopWhales(count: number = TOP_WHALES_COUNT): Promise<void> {
  if (warmingInProgress) {
    console.log("[CacheWarmer] Warming already in progress, skipping");
    return;
  }

  warmingInProgress = true;
  console.log(`[CacheWarmer] Starting cache warm for top ${count} whales...`);

  try {
    // Fetch top whales from database
    const result = await db.getAllWallets(1, count, "total_deposited", "desc");
    const addresses = result.wallets.map(w => w.address);

    let totalSuccess = 0;
    let totalFailed = 0;

    // Process in batches with rate limiting
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      if (!isRunning) {
        console.log("[CacheWarmer] Stopped during warming");
        break;
      }

      const batch = addresses.slice(i, i + BATCH_SIZE);
      const { success, failed } = await warmBatch(batch);
      totalSuccess += success;
      totalFailed += failed;

      // Progress log every 20 whales
      if ((i + BATCH_SIZE) % 20 === 0 || i + BATCH_SIZE >= addresses.length) {
        console.log(`[CacheWarmer] Progress: ${Math.min(i + BATCH_SIZE, addresses.length)}/${addresses.length} (${totalSuccess} cached, ${totalFailed} failed)`);
      }

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    console.log(`[CacheWarmer] Completed: ${totalSuccess} cached, ${totalFailed} failed`);
  } catch (error) {
    console.error("[CacheWarmer] Error during warming:", error);
  } finally {
    warmingInProgress = false;
  }
}

/**
 * Warm ALL wallets that need trading data refresh
 * Used for comprehensive data population (runs in background)
 */
async function warmAllWallets(): Promise<void> {
  if (warmingInProgress) {
    console.log("[CacheWarmer] Warming already in progress, skipping full warm");
    return;
  }

  warmingInProgress = true;
  console.log("[CacheWarmer] Starting comprehensive warm for ALL wallets...");

  try {
    // Get wallets that need refresh (oldest data first)
    const addresses = await db.getWalletsNeedingTradingRefresh(2500, 5);

    if (addresses.length === 0) {
      console.log("[CacheWarmer] All wallets have fresh trading data!");
      return;
    }

    console.log(`[CacheWarmer] Found ${addresses.length} wallets needing refresh`);

    let totalSuccess = 0;
    let totalFailed = 0;

    // Process in batches with rate limiting
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      if (!isRunning) {
        console.log("[CacheWarmer] Stopped during full warming");
        break;
      }

      const batch = addresses.slice(i, i + BATCH_SIZE);
      const { success, failed } = await warmBatch(batch);
      totalSuccess += success;
      totalFailed += failed;

      // Progress log every 100 whales
      if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= addresses.length) {
        const dbCount = await db.getWalletsWithTradingDataCount();
        console.log(`[CacheWarmer] Full warm: ${Math.min(i + BATCH_SIZE, addresses.length)}/${addresses.length} (${totalSuccess} success, ${totalFailed} failed, ${dbCount} total in DB)`);
      }

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    const finalDbCount = await db.getWalletsWithTradingDataCount();
    console.log(`[CacheWarmer] Full warm completed: ${totalSuccess} success, ${totalFailed} failed, ${finalDbCount} total with trading data in DB`);
  } catch (error) {
    console.error("[CacheWarmer] Error during full warming:", error);
  } finally {
    warmingInProgress = false;
  }
}

/**
 * Start the cache warmer service
 * - Immediately warms top whales
 * - Then warms ALL remaining wallets
 * - Sets up periodic refresh
 */
export async function startCacheWarmer(): Promise<void> {
  if (isRunning) {
    console.log("[CacheWarmer] Already running");
    return;
  }

  isRunning = true;
  console.log("[CacheWarmer] Starting background cache warmer...");

  // Phase 1: Warm top whales first (priority)
  await warmTopWhales(TOP_WHALES_COUNT);

  // Phase 2: Warm ALL remaining wallets (background, non-blocking)
  // This runs without await so server can start responding
  warmAllWallets().catch(err => {
    console.error("[CacheWarmer] Background full warm failed:", err);
  });

  // Schedule periodic refresh of stale data
  const refreshInterval = setInterval(async () => {
    if (!isRunning) {
      clearInterval(refreshInterval);
      return;
    }
    // Refresh wallets that have stale data (older than 5 minutes)
    await warmAllWallets();
  }, REFRESH_INTERVAL_MS);

  console.log(`[CacheWarmer] Scheduled refresh every ${REFRESH_INTERVAL_MS / 1000 / 60} minutes`);
}

/**
 * Stop the cache warmer service
 */
export function stopCacheWarmer(): void {
  isRunning = false;
  console.log("[CacheWarmer] Stopped");
}

/**
 * Get cache warmer status
 */
export function getCacheWarmerStatus(): {
  isRunning: boolean;
  warmingInProgress: boolean;
} {
  return {
    isRunning,
    warmingInProgress,
  };
}

/**
 * Warm cache for specific addresses (non-blocking)
 * Used for on-demand warming when user navigates to a page
 */
export async function warmAddresses(addresses: string[]): Promise<void> {
  if (addresses.length === 0) return;

  // Don't log individual addresses to reduce noise
  const uncachedAddresses: string[] = [];

  // Filter to only uncached addresses
  for (const address of addresses) {
    const cached = await tradingCache.getTradingData(address);
    if (!cached) {
      uncachedAddresses.push(address);
    }
  }

  if (uncachedAddresses.length === 0) return;

  console.log(`[CacheWarmer] On-demand warming ${uncachedAddresses.length} wallets...`);

  // Process in batches with rate limiting
  for (let i = 0; i < uncachedAddresses.length; i += BATCH_SIZE) {
    const batch = uncachedAddresses.slice(i, i + BATCH_SIZE);
    await warmBatch(batch);

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < uncachedAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  console.log(`[CacheWarmer] On-demand warming complete for ${uncachedAddresses.length} wallets`);
}

export const cacheWarmer = {
  start: startCacheWarmer,
  stop: stopCacheWarmer,
  getStatus: getCacheWarmerStatus,
  warmTopWhales,
  warmAddresses,
};
