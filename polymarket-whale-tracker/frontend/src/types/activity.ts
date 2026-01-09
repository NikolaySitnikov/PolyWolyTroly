/**
 * Activity Types (Frontend)
 *
 * Enhanced activity interface for display in wallet profiles.
 * Includes type configurations for visual styling.
 */

import type { PolymarketActivity } from './polymarket';
import { tokens } from '../styles/tokens';

/**
 * Activity type enumeration
 */
export type ActivityType =
  | 'deposit'
  | 'withdrawal'
  | 'buy'
  | 'sell'
  | 'redeem'
  | 'claim'
  | 'transfer'
  | 'unknown';

/**
 * Activity type display configuration
 */
export interface ActivityTypeConfig {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}

/**
 * Activity type configurations for UI display
 *
 * Color logic:
 * | Type       | Color   | Meaning                              |
 * |------------|---------|--------------------------------------|
 * | Buy        | Green   | Acquiring assets - positive action   |
 * | Sell       | Red     | Liquidating assets                   |
 * | Redeem     | Gold    | Cashing out resolved position        |
 * | Deposit    | Green   | Adding funds                         |
 * | Withdrawal | Red     | Removing funds                       |
 * | Claim      | Purple  | Rewards/incentives                   |
 * | Transfer   | Neutral | Moving between wallets               |
 */
export const ACTIVITY_TYPE_CONFIGS: Record<ActivityType, ActivityTypeConfig> = {
  deposit: {
    icon: '↓',
    label: 'Deposit',
    color: tokens.colors.profit,
    bgColor: `${tokens.colors.profit}15`,
  },
  withdrawal: {
    icon: '↑',
    label: 'Withdrawal',
    color: tokens.colors.loss,
    bgColor: `${tokens.colors.loss}15`,
  },
  buy: {
    icon: '+',
    label: 'Buy',
    color: tokens.colors.profit,
    bgColor: `${tokens.colors.profit}15`,
  },
  sell: {
    icon: '−',
    label: 'Sell',
    color: tokens.colors.loss,
    bgColor: `${tokens.colors.loss}15`,
  },
  redeem: {
    icon: '✓',
    label: 'Redeem',
    color: tokens.colors.gold,
    bgColor: `${tokens.colors.gold}15`,
  },
  claim: {
    icon: '★',
    label: 'Claim',
    color: tokens.colors.purple,
    bgColor: `${tokens.colors.purple}15`,
  },
  transfer: {
    icon: '↔',
    label: 'Transfer',
    color: tokens.colors.textSecondary,
    bgColor: `${tokens.colors.textSecondary}15`,
  },
  unknown: {
    icon: '•',
    label: 'Activity',
    color: tokens.colors.textMuted,
    bgColor: `${tokens.colors.textMuted}15`,
  },
} as const;

/**
 * Enhanced activity for UI display
 */
export interface Activity extends PolymarketActivity {
  /** Normalized activity type */
  normalizedType: ActivityType;
  /** Display configuration */
  config: ActivityTypeConfig;
  /** Formatted timestamp */
  formattedTime?: string;
}

/**
 * Normalize raw activity type string to ActivityType
 * Handles various Polymarket API type formats including TRADE with side field
 */
export function normalizeActivityType(rawType?: string, side?: string): ActivityType {
  if (!rawType) return 'unknown';

  const lower = rawType.toLowerCase();

  // Handle TRADE type - determine buy/sell based on side field
  if (lower === 'trade') {
    const sideLower = side?.toLowerCase();
    if (sideLower === 'buy') return 'buy';
    if (sideLower === 'sell') return 'sell';
    return 'unknown'; // TRADE without valid side
  }

  if (lower.includes('deposit') || lower === 'usdc_deposit') {
    return 'deposit';
  }
  if (lower.includes('withdraw') || lower === 'usdc_withdrawal') {
    return 'withdrawal';
  }
  if (lower.includes('buy') || lower === 'trade_buy' || lower === 'market_buy') {
    return 'buy';
  }
  if (lower.includes('sell') || lower === 'trade_sell' || lower === 'market_sell') {
    return 'sell';
  }
  if (lower.includes('redeem') || lower === 'redemption') {
    return 'redeem';
  }
  if (lower.includes('claim') || lower === 'reward_claim') {
    return 'claim';
  }
  if (lower.includes('transfer')) {
    return 'transfer';
  }

  return 'unknown';
}

/**
 * Convert raw Polymarket activity to UI Activity
 * Normalizes timestamp (converts seconds to milliseconds if needed)
 */
export function toActivity(raw: PolymarketActivity): Activity {
  const normalizedType = normalizeActivityType(raw.type, raw.side);
  const config = ACTIVITY_TYPE_CONFIGS[normalizedType];

  // Normalize timestamp: if it looks like seconds (< year 2100 in ms), convert to ms
  // Timestamps in seconds are roughly 10 digits, in milliseconds 13 digits
  const timestamp = raw.timestamp < 10000000000
    ? raw.timestamp * 1000  // Convert seconds to milliseconds
    : raw.timestamp;

  return {
    ...raw,
    timestamp,
    normalizedType,
    config,
  };
}

/**
 * Get activity type config
 */
export function getActivityConfig(type: ActivityType): ActivityTypeConfig {
  return ACTIVITY_TYPE_CONFIGS[type];
}

/**
 * Filter options for activity list
 */
export type ActivityFilterOption = 'all' | 'trades' | 'buys' | 'sells';

/**
 * Activity filter configuration
 */
export const ACTIVITY_FILTER_OPTIONS: Record<ActivityFilterOption, {
  label: string;
  types: ActivityType[];
}> = {
  all: {
    label: 'All',
    types: ['deposit', 'withdrawal', 'buy', 'sell', 'redeem', 'claim', 'transfer', 'unknown'],
  },
  trades: {
    label: 'Trades',
    types: ['buy', 'sell'],
  },
  buys: {
    label: 'Buys',
    types: ['buy'],
  },
  sells: {
    label: 'Sells',
    types: ['sell'],
  },
} as const;

/**
 * Filter activities by type
 */
export function filterActivities(
  activities: Activity[],
  filter: ActivityFilterOption
): Activity[] {
  const allowedTypes = ACTIVITY_FILTER_OPTIONS[filter].types;
  return activities.filter(a => allowedTypes.includes(a.normalizedType));
}

/**
 * Sort activities by timestamp (most recent first)
 */
export function sortActivitiesByTime(
  activities: Activity[],
  direction: 'asc' | 'desc' = 'desc'
): Activity[] {
  return [...activities].sort((a, b) => {
    const diff = b.timestamp - a.timestamp;
    return direction === 'desc' ? diff : -diff;
  });
}
