/**
 * Wallet Activity Index Service for Insider Trading Detection
 *
 * Tracks and aggregates wallet activity across markets to enable:
 * - Concentration analysis (how much of wallet's activity is in one market)
 * - New wallet detection (first trade timing)
 * - Volume tracking per wallet per market
 * - Position tracking (net position, avg entry price, PnL)
 *
 * Key responsibilities:
 * - Process CTF transfers and update wallet_activity table
 * - Calculate volume share of wallet (concentration metric)
 * - Support historical backfill from existing transfers
 * - Provide queries for detection rules
 */

import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import { marketMetadataService } from "./marketMetadataService.js";
import type { WalletActivity, CtfTransfer, Market } from "./types.js";

// Lazy import to avoid circular dependency
let fundingAnalyzerModule: typeof import("./fundingAnalyzer.js") | null = null;
async function getFundingAnalyzer() {
  if (!fundingAnalyzerModule) {
    fundingAnalyzerModule = await import("./fundingAnalyzer.js");
  }
  return fundingAnalyzerModule.fundingAnalyzer;
}

// Batch size for backfill processing
const BACKFILL_BATCH_SIZE = 100;

// Cache TTL for wallet activity: 2 minutes
const WALLET_ACTIVITY_CACHE_TTL = 2 * 60;

/**
 * Service state
 */
let isBackfilling = false;
let backfillProgress = {
  processed: 0,
  total: 0,
  startedAt: null as Date | null,
  completedAt: null as Date | null,
  errors: 0,
};

/**
 * Convert token amount (in smallest unit) to USD value
 * CTF tokens use 6 decimals (same as USDC)
 * Price is a probability 0-1, so value = amount * price
 */
function tokenAmountToUsd(amount: bigint, price: number): number {
  // CTF tokens use 6 decimals
  const amountInTokens = Number(amount) / 1e6;
  return amountInTokens * price;
}

/**
 * Determine if a transfer is a buy or sell from a wallet's perspective
 * - If wallet is `to` address: wallet is RECEIVING tokens (bought)
 * - If wallet is `from` address: wallet is SENDING tokens (sold)
 */
function isWalletBuying(transfer: CtfTransfer, walletAddress: string): boolean {
  return transfer.toAddress.toLowerCase() === walletAddress.toLowerCase();
}

/**
 * Get current mid price for a market's YES outcome
 * Falls back to 0.5 if no price data available
 */
async function getMarketPrice(conditionId: string): Promise<number> {
  try {
    // Try to get latest depth snapshot which has mid price
    const depth = await detectionCache.getLatestDepth(conditionId);
    if (depth?.midPrice) {
      return depth.midPrice;
    }

    // Fall back to 0.5 as default
    return 0.5;
  } catch {
    return 0.5;
  }
}

/**
 * Get or create wallet activity record for a wallet-market pair
 */
async function getOrCreateWalletActivity(
  walletAddress: string,
  conditionId: string
): Promise<WalletActivity> {
  // Check cache first
  const cacheKey = `${walletAddress.toLowerCase()}:${conditionId}`;
  const cached = await detectionCache.getWalletActivity(cacheKey);
  if (cached) {
    return cached;
  }

  // Check database
  const activities = await detectionDb.getWalletActivity(walletAddress);
  const existing = activities.find(a => a.conditionId === conditionId);

  if (existing) {
    await detectionCache.setWalletActivity(cacheKey, existing, WALLET_ACTIVITY_CACHE_TTL);
    return existing;
  }

  // Create new empty activity
  return {
    walletAddress: walletAddress.toLowerCase(),
    conditionId,
    totalVolume: 0,
    tradeCount: 0,
    netPosition: 0,
    realizedPnl: 0,
  };
}

/**
 * Calculate volume share for a wallet across all their markets
 * Returns the percentage of total wallet volume that is in each market
 */
async function calculateVolumeShares(walletAddress: string): Promise<Map<string, number>> {
  const activities = await detectionDb.getWalletActivity(walletAddress);
  const totalVolume = activities.reduce((sum, a) => sum + a.totalVolume, 0);

  const shares = new Map<string, number>();

  if (totalVolume === 0) {
    return shares;
  }

  for (const activity of activities) {
    const share = (activity.totalVolume / totalVolume) * 100;
    shares.set(activity.conditionId, share);
  }

  return shares;
}

// Set to track wallets we've already triggered funding analysis for
// This prevents duplicate analysis within a session
const fundingAnalysisTriggered = new Set<string>();

/**
 * Trigger funding analysis for a new wallet (non-blocking)
 * Called when we detect a wallet's first ever trade
 */
async function triggerFundingAnalysisForNewWallet(
  walletAddress: string,
  firstTradeAt: Date
): Promise<void> {
  const address = walletAddress.toLowerCase();

  // Skip if we've already triggered analysis for this wallet
  if (fundingAnalysisTriggered.has(address)) {
    return;
  }

  fundingAnalysisTriggered.add(address);

  // Run funding analysis in the background (don't block transfer processing)
  // This is a fire-and-forget operation
  setTimeout(async () => {
    try {
      const analyzer = await getFundingAnalyzer();

      // Analyze funding sources
      const analysis = await analyzer.analyzeFundingSources(address);

      // Update timing metrics if we found funding sources
      if (analysis.sources.length > 0) {
        await analyzer.updateTimingMetrics(address, firstTradeAt);
      }

      console.log(
        `[WalletActivityIndex] Funding analysis complete for ${address}: ` +
        `${analysis.sources.length} sources, $${analysis.totalFunded.toFixed(2)} total`
      );
    } catch (error) {
      console.error(
        `[WalletActivityIndex] Failed to analyze funding for ${address}:`,
        error
      );
    }
  }, 100); // Small delay to not block the current event processing
}

/**
 * Update wallet activity based on a CTF transfer
 */
async function updateActivityFromTransfer(
  transfer: CtfTransfer,
  walletAddress: string,
  isBuyer: boolean
): Promise<void> {
  // Get or create activity record
  const conditionId = transfer.conditionId;
  if (!conditionId) {
    // Skip transfers without condition ID
    return;
  }

  const activity = await getOrCreateWalletActivity(walletAddress, conditionId);

  // Check if this is the wallet's first ever trade (for funding analysis)
  const isFirstEverTrade = activity.tradeCount === 0;

  // Get current price for value calculation
  const price = await getMarketPrice(conditionId);

  // Calculate trade value
  const tradeValue = tokenAmountToUsd(transfer.amount, price);
  const tokenAmount = Number(transfer.amount) / 1e6;

  // Update trade timing
  const tradeTime = transfer.blockTimestamp || new Date();

  if (!activity.firstTradeAt || tradeTime < activity.firstTradeAt) {
    activity.firstTradeAt = tradeTime;
  }
  if (!activity.lastTradeAt || tradeTime > activity.lastTradeAt) {
    activity.lastTradeAt = tradeTime;
  }

  // Update volume and trade count
  activity.totalVolume += tradeValue;
  activity.tradeCount += 1;

  // Update net position
  // Buying increases position, selling decreases it
  if (isBuyer) {
    activity.netPosition += tokenAmount;
  } else {
    activity.netPosition -= tokenAmount;
  }

  // Calculate average entry price (simplified - uses running average for buys)
  // Only track avg entry price for positive positions
  if (isBuyer && activity.netPosition > 0) {
    const oldPositionValue = (activity.avgEntryPrice || price) * (activity.netPosition - tokenAmount);
    const newTradeValue = price * tokenAmount;
    activity.avgEntryPrice = (oldPositionValue + newTradeValue) / activity.netPosition;
  }

  // Calculate realized PnL for sells
  // PnL = (sell price - avg entry price) * amount sold
  if (!isBuyer && activity.avgEntryPrice) {
    const pnl = (price - activity.avgEntryPrice) * tokenAmount;
    activity.realizedPnl += pnl;
  }

  // Save to database
  await detectionDb.upsertWalletActivity(activity);

  // Update volume share for this wallet
  // Recalculate all shares after updating activity
  const shares = await calculateVolumeShares(walletAddress);
  const volumeShare = shares.get(conditionId);

  if (volumeShare !== undefined) {
    activity.volumeShareOfWallet = volumeShare;
    await detectionDb.upsertWalletActivity(activity);
  }

  // Update cache
  const cacheKey = `${walletAddress.toLowerCase()}:${conditionId}`;
  await detectionCache.setWalletActivity(cacheKey, activity, WALLET_ACTIVITY_CACHE_TTL);

  // Trigger funding analysis for new wallets
  // This helps detect wallets that were funded specifically for this trade
  if (isFirstEverTrade && activity.firstTradeAt) {
    triggerFundingAnalysisForNewWallet(walletAddress, activity.firstTradeAt);
  }
}

/**
 * Wallet Activity Index Service
 */
export const walletActivityIndex = {
  /**
   * Process a CTF transfer and update wallet activity for both parties
   * This is called from the CTF event listener for each transfer
   */
  async processTransfer(transfer: CtfTransfer): Promise<void> {
    // Update activity for the receiver (buyer)
    await updateActivityFromTransfer(transfer, transfer.toAddress, true);

    // Update activity for the sender (seller)
    await updateActivityFromTransfer(transfer, transfer.fromAddress, false);
  },

  /**
   * Get wallet activity across all markets
   */
  async getWalletActivity(walletAddress: string): Promise<WalletActivity[]> {
    return detectionDb.getWalletActivity(walletAddress);
  },

  /**
   * Get activity for a specific wallet-market pair
   */
  async getWalletMarketActivity(
    walletAddress: string,
    conditionId: string
  ): Promise<WalletActivity | null> {
    const cacheKey = `${walletAddress.toLowerCase()}:${conditionId}`;
    const cached = await detectionCache.getWalletActivity(cacheKey);
    if (cached) {
      return cached;
    }

    const activities = await detectionDb.getWalletActivity(walletAddress);
    const activity = activities.find(a => a.conditionId === conditionId);

    if (activity) {
      await detectionCache.setWalletActivity(cacheKey, activity, WALLET_ACTIVITY_CACHE_TTL);
    }

    return activity || null;
  },

  /**
   * Get market activity (all wallets for a specific market)
   */
  async getMarketActivity(conditionId: string): Promise<WalletActivity[]> {
    return detectionDb.getMarketActivity(conditionId);
  },

  /**
   * Get wallet concentration metrics
   * Returns info about wallet's most concentrated market
   */
  async getWalletConcentration(walletAddress: string): Promise<{
    topMarket: { conditionId: string; volumeShare: number; question?: string } | null;
    totalVolume: number;
    marketCount: number;
  }> {
    const concentration = await detectionDb.getWalletConcentration(walletAddress);

    // Enrich with market question if top market exists
    if (concentration.topMarket) {
      const market = await marketMetadataService.getMarket(
        concentration.topMarket.conditionId
      );
      if (market) {
        return {
          ...concentration,
          topMarket: {
            ...concentration.topMarket,
            question: market.question,
          },
        };
      }
    }

    return concentration;
  },

  /**
   * Get wallets with high concentration in a specific market
   * Returns wallets where this market represents >= thresholdPct of their total volume
   */
  async getHighConcentrationWallets(
    conditionId: string,
    thresholdPct: number = 70
  ): Promise<WalletActivity[]> {
    const marketActivity = await detectionDb.getMarketActivity(conditionId);

    // Filter to wallets with high concentration
    const highConcentration: WalletActivity[] = [];

    for (const activity of marketActivity) {
      const concentration = await detectionDb.getWalletConcentration(activity.walletAddress);
      if (
        concentration.topMarket?.conditionId === conditionId &&
        concentration.topMarket.volumeShare >= thresholdPct
      ) {
        activity.volumeShareOfWallet = concentration.topMarket.volumeShare;
        highConcentration.push(activity);
      }
    }

    return highConcentration.sort((a, b) => b.totalVolume - a.totalVolume);
  },

  /**
   * Get wallets that traded in a market within N hours of their first-ever trade
   * These are "new" wallets that may have been funded specifically for this market
   */
  async getNewWalletActivity(
    conditionId: string,
    hoursThreshold: number = 24
  ): Promise<WalletActivity[]> {
    const marketActivity = await detectionDb.getMarketActivity(conditionId);
    const newWallets: WalletActivity[] = [];

    for (const activity of marketActivity) {
      if (!activity.firstTradeAt) continue;

      // Get all wallet activity to find their absolute first trade
      const allActivity = await detectionDb.getWalletActivity(activity.walletAddress);
      const absoluteFirstTrade = allActivity.reduce(
        (earliest, a) => {
          if (!a.firstTradeAt) return earliest;
          if (!earliest) return a.firstTradeAt;
          return a.firstTradeAt < earliest ? a.firstTradeAt : earliest;
        },
        null as Date | null
      );

      if (!absoluteFirstTrade) continue;

      // Check if this market's first trade is within threshold of wallet's first ever trade
      const hoursSinceFirstTrade =
        (activity.firstTradeAt.getTime() - absoluteFirstTrade.getTime()) / (1000 * 60 * 60);

      if (hoursSinceFirstTrade <= hoursThreshold) {
        newWallets.push(activity);
      }
    }

    return newWallets.sort((a, b) => b.totalVolume - a.totalVolume);
  },

  /**
   * Backfill wallet activity from existing ctf_transfers table
   * Useful for initial setup or after historical import
   */
  async backfillFromTransfers(options?: {
    fromBlock?: number;
    conditionId?: string;
    onProgress?: (processed: number, total: number) => void;
  }): Promise<{ processed: number; errors: number }> {
    if (isBackfilling) {
      throw new Error("Backfill already in progress");
    }

    isBackfilling = true;
    backfillProgress = {
      processed: 0,
      total: 0,
      startedAt: new Date(),
      completedAt: null,
      errors: 0,
    };

    try {
      console.log("[WalletActivityIndex] Starting backfill from transfers...");

      // Get all unique wallet-condition pairs from transfers
      // This is a simplified approach - in production you'd want to paginate
      let transfers: CtfTransfer[] = [];

      if (options?.conditionId) {
        transfers = await detectionDb.getMarketTransfers(options.conditionId);
      } else {
        // Get transfers for all wallets we've seen
        // Note: This could be memory-intensive for large datasets
        // In production, you'd want to stream or batch by block ranges
        const stats = await detectionDb.getStats();
        console.log(
          `[WalletActivityIndex] Processing transfers (${stats.walletsTracked} wallets tracked)`
        );

        // For now, we'll process by getting unique wallets from the activity table
        // and fetching their transfers
        // This is more memory-efficient than loading all transfers at once
      }

      backfillProgress.total = transfers.length;

      // Process transfers in order (oldest first for accurate position tracking)
      transfers.sort((a, b) => a.blockNumber - b.blockNumber);

      for (let i = 0; i < transfers.length; i++) {
        try {
          await this.processTransfer(transfers[i]);
          backfillProgress.processed++;

          if (options?.onProgress && i % 100 === 0) {
            options.onProgress(backfillProgress.processed, backfillProgress.total);
          }
        } catch (error) {
          console.error(
            `[WalletActivityIndex] Error processing transfer ${transfers[i].txHash}:`,
            error
          );
          backfillProgress.errors++;
        }
      }

      backfillProgress.completedAt = new Date();
      console.log(
        `[WalletActivityIndex] Backfill complete: ${backfillProgress.processed} processed, ${backfillProgress.errors} errors`
      );

      return {
        processed: backfillProgress.processed,
        errors: backfillProgress.errors,
      };
    } finally {
      isBackfilling = false;
    }
  },

  /**
   * Recalculate volume shares for all wallets
   * Called periodically or after bulk updates
   */
  async recalculateAllVolumeShares(): Promise<number> {
    console.log("[WalletActivityIndex] Recalculating volume shares...");

    // Get all unique wallets from activity table
    const stats = await detectionDb.getStats();
    let updated = 0;

    // This is a simplified implementation
    // In production, you'd want to batch this
    // For now, we rely on updateActivityFromTransfer to keep shares updated

    console.log(`[WalletActivityIndex] Volume share recalculation complete: ${updated} updated`);
    return updated;
  },

  /**
   * Get backfill status
   */
  getBackfillStatus(): {
    isBackfilling: boolean;
    processed: number;
    total: number;
    startedAt: Date | null;
    completedAt: Date | null;
    errors: number;
  } {
    return {
      isBackfilling,
      ...backfillProgress,
    };
  },

  /**
   * Clear activity cache for a specific wallet
   */
  async invalidateWalletCache(walletAddress: string): Promise<void> {
    const activities = await detectionDb.getWalletActivity(walletAddress);
    for (const activity of activities) {
      const cacheKey = `${walletAddress.toLowerCase()}:${activity.conditionId}`;
      await detectionCache.invalidateWalletActivity(cacheKey);
    }
  },
};
