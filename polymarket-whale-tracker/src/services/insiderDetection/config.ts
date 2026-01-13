/**
 * Detection threshold configuration loader
 *
 * Loads detection thresholds from database with caching and fallback defaults.
 * Thresholds can be updated at runtime without restarting the service.
 */

import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import type {
  DetectionConfig,
  WalletAgeConfig,
  FundingAmountConfig,
  TradeTimingConfig,
  EntryOddsConfig,
  ConcentrationConfig,
} from "./types.js";

// Default configuration values (fallback if DB is empty)
const DEFAULT_CONFIG: DetectionConfig = {
  wallet_age_days: {
    high: 14,   // < 14 days = HIGH alert
    medium: 30, // < 30 days = MEDIUM alert
  },
  funding_amount: {
    absolute_min: 3000,      // >= $3,000 USD
    market_volume_pct: 5,    // >= 5% of market 24h volume
  },
  trade_timing_hours: {
    high: 2,    // < 2 hours from funding = HIGH alert
    medium: 24, // < 24 hours from funding = MEDIUM alert
  },
  entry_odds_pct: {
    threshold: 15,     // <= 15% entry odds
    price_move_1h: 8,  // > 8% price move in 1h
  },
  concentration_pct: {
    wallet_level: 85,  // >= 85% concentration at wallet level
    cluster_level: 70, // >= 70% concentration at cluster level
  },
};

// In-memory cache for config (refreshed periodically)
let cachedConfig: DetectionConfig | null = null;
let lastRefresh: number = 0;
const REFRESH_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Load detection configuration
 * Uses multi-level caching: in-memory -> Redis -> DB -> defaults
 */
export async function loadConfig(): Promise<DetectionConfig> {
  const now = Date.now();

  // Check in-memory cache first
  if (cachedConfig && now - lastRefresh < REFRESH_INTERVAL_MS) {
    return cachedConfig;
  }

  // Check Redis cache
  const redisConfig = await detectionCache.getConfig();
  if (redisConfig) {
    cachedConfig = redisConfig;
    lastRefresh = now;
    return redisConfig;
  }

  // Load from database
  const dbConfig = await loadConfigFromDb();
  cachedConfig = dbConfig;
  lastRefresh = now;

  // Update Redis cache
  await detectionCache.setConfig(dbConfig);

  return dbConfig;
}

/**
 * Load config from database with fallback to defaults
 */
async function loadConfigFromDb(): Promise<DetectionConfig> {
  try {
    const allConfig = await detectionDb.getAllConfig();

    return {
      wallet_age_days: (allConfig.wallet_age_days as WalletAgeConfig) || DEFAULT_CONFIG.wallet_age_days,
      funding_amount: (allConfig.funding_amount as FundingAmountConfig) || DEFAULT_CONFIG.funding_amount,
      trade_timing_hours: (allConfig.trade_timing_hours as TradeTimingConfig) || DEFAULT_CONFIG.trade_timing_hours,
      entry_odds_pct: (allConfig.entry_odds_pct as EntryOddsConfig) || DEFAULT_CONFIG.entry_odds_pct,
      concentration_pct: (allConfig.concentration_pct as ConcentrationConfig) || DEFAULT_CONFIG.concentration_pct,
    };
  } catch (error) {
    console.error("[DetectionConfig] Failed to load from DB, using defaults:", error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Force refresh config from database
 */
export async function refreshConfig(): Promise<DetectionConfig> {
  cachedConfig = null;
  lastRefresh = 0;
  await detectionCache.invalidateConfig();
  return loadConfig();
}

/**
 * Update a specific config value
 */
export async function updateConfig<K extends keyof DetectionConfig>(
  key: K,
  value: DetectionConfig[K],
  updatedBy?: string
): Promise<boolean> {
  const success = await detectionDb.updateConfig(key, value, updatedBy);
  if (success) {
    // Invalidate caches
    cachedConfig = null;
    lastRefresh = 0;
    await detectionCache.invalidateConfig();
  }
  return success;
}

/**
 * Get default configuration (for reference/reset)
 */
export function getDefaultConfig(): DetectionConfig {
  return { ...DEFAULT_CONFIG };
}

// ============================================
// THRESHOLD CHECK HELPERS
// ============================================

/**
 * Check wallet age against thresholds
 */
export async function checkWalletAge(ageDays: number): Promise<{
  suspicious: boolean;
  severity: 'HIGH' | 'MEDIUM' | null;
}> {
  const config = await loadConfig();
  const { high, medium } = config.wallet_age_days;

  if (ageDays < high) {
    return { suspicious: true, severity: 'HIGH' };
  }
  if (ageDays < medium) {
    return { suspicious: true, severity: 'MEDIUM' };
  }
  return { suspicious: false, severity: null };
}

/**
 * Check funding amount against thresholds
 */
export async function checkFundingAmount(
  amountUsd: number,
  market24hVolume?: number
): Promise<{
  suspicious: boolean;
  reason: 'absolute' | 'relative' | null;
}> {
  const config = await loadConfig();
  const { absolute_min, market_volume_pct } = config.funding_amount;

  // Check absolute threshold
  if (amountUsd >= absolute_min) {
    return { suspicious: true, reason: 'absolute' };
  }

  // Check relative threshold (if market volume provided)
  if (market24hVolume && market24hVolume > 0) {
    const volumeSharePct = (amountUsd / market24hVolume) * 100;
    if (volumeSharePct >= market_volume_pct) {
      return { suspicious: true, reason: 'relative' };
    }
  }

  return { suspicious: false, reason: null };
}

/**
 * Check trade timing (hours from funding to trade)
 */
export async function checkTradeTiming(hoursFromFunding: number): Promise<{
  suspicious: boolean;
  severity: 'HIGH' | 'MEDIUM' | null;
}> {
  const config = await loadConfig();
  const { high, medium } = config.trade_timing_hours;

  if (hoursFromFunding < high) {
    return { suspicious: true, severity: 'HIGH' };
  }
  if (hoursFromFunding < medium) {
    return { suspicious: true, severity: 'MEDIUM' };
  }
  return { suspicious: false, severity: null };
}

/**
 * Check entry odds against thresholds
 */
export async function checkEntryOdds(
  entryOddsPct: number,
  priceMove1hPct?: number
): Promise<{
  suspicious: boolean;
  reason: 'low_odds' | 'price_move' | null;
}> {
  const config = await loadConfig();
  const { threshold, price_move_1h } = config.entry_odds_pct;

  // Check entry odds threshold
  if (entryOddsPct <= threshold) {
    return { suspicious: true, reason: 'low_odds' };
  }

  // Check price move (if provided)
  if (priceMove1hPct !== undefined && priceMove1hPct > price_move_1h) {
    return { suspicious: true, reason: 'price_move' };
  }

  return { suspicious: false, reason: null };
}

/**
 * Check position concentration
 */
export async function checkConcentration(
  concentrationPct: number,
  level: 'wallet' | 'cluster' = 'wallet'
): Promise<{
  suspicious: boolean;
}> {
  const config = await loadConfig();
  const { wallet_level, cluster_level } = config.concentration_pct;

  const threshold = level === 'wallet' ? wallet_level : cluster_level;
  return { suspicious: concentrationPct >= threshold };
}

// ============================================
// COMBINED SUSPICION SCORING
// ============================================

export interface SuspicionCheckResult {
  walletAge?: { suspicious: boolean; severity: 'HIGH' | 'MEDIUM' | null };
  fundingAmount?: { suspicious: boolean; reason: 'absolute' | 'relative' | null };
  tradeTiming?: { suspicious: boolean; severity: 'HIGH' | 'MEDIUM' | null };
  entryOdds?: { suspicious: boolean; reason: 'low_odds' | 'price_move' | null };
  concentration?: { suspicious: boolean };
  overallSuspicious: boolean;
  triggeredChecks: string[];
}

/**
 * Run all threshold checks and return combined result
 */
export async function runAllChecks(params: {
  walletAgeDays?: number;
  fundingAmountUsd?: number;
  market24hVolume?: number;
  hoursFromFunding?: number;
  entryOddsPct?: number;
  priceMove1hPct?: number;
  concentrationPct?: number;
  concentrationLevel?: 'wallet' | 'cluster';
}): Promise<SuspicionCheckResult> {
  const result: SuspicionCheckResult = {
    overallSuspicious: false,
    triggeredChecks: [],
  };

  // Check wallet age
  if (params.walletAgeDays !== undefined) {
    result.walletAge = await checkWalletAge(params.walletAgeDays);
    if (result.walletAge.suspicious) {
      result.triggeredChecks.push(`wallet_age_${result.walletAge.severity}`);
    }
  }

  // Check funding amount
  if (params.fundingAmountUsd !== undefined) {
    result.fundingAmount = await checkFundingAmount(
      params.fundingAmountUsd,
      params.market24hVolume
    );
    if (result.fundingAmount.suspicious) {
      result.triggeredChecks.push(`funding_${result.fundingAmount.reason}`);
    }
  }

  // Check trade timing
  if (params.hoursFromFunding !== undefined) {
    result.tradeTiming = await checkTradeTiming(params.hoursFromFunding);
    if (result.tradeTiming.suspicious) {
      result.triggeredChecks.push(`timing_${result.tradeTiming.severity}`);
    }
  }

  // Check entry odds
  if (params.entryOddsPct !== undefined) {
    result.entryOdds = await checkEntryOdds(
      params.entryOddsPct,
      params.priceMove1hPct
    );
    if (result.entryOdds.suspicious) {
      result.triggeredChecks.push(`odds_${result.entryOdds.reason}`);
    }
  }

  // Check concentration
  if (params.concentrationPct !== undefined) {
    result.concentration = await checkConcentration(
      params.concentrationPct,
      params.concentrationLevel
    );
    if (result.concentration.suspicious) {
      result.triggeredChecks.push(`concentration_${params.concentrationLevel || 'wallet'}`);
    }
  }

  // Overall suspicious if any check triggered
  result.overallSuspicious = result.triggeredChecks.length > 0;

  return result;
}
