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
    icon: '🛒',
    label: 'Buy',
    color: tokens.colors.cyan,
    bgColor: `${tokens.colors.cyan}15`,
  },
  sell: {
    icon: '💰',
    label: 'Sell',
    color: tokens.colors.magenta,
    bgColor: `${tokens.colors.magenta}15`,
  },
  redeem: {
    icon: '✓',
    label: 'Redeem',
    color: tokens.colors.profit,
    bgColor: `${tokens.colors.profit}15`,
  },
  claim: {
    icon: '🎁',
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
 */
export function normalizeActivityType(rawType?: string): ActivityType {
  if (!rawType) return 'unknown';

  const lower = rawType.toLowerCase();

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
 */
export function toActivity(raw: PolymarketActivity): Activity {
  const normalizedType = normalizeActivityType(raw.type);
  const config = ACTIVITY_TYPE_CONFIGS[normalizedType];

  return {
    ...raw,
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
export type ActivityFilterOption = 'all' | 'deposits' | 'trades' | 'buys' | 'sells';

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
  deposits: {
    label: 'Deposits',
    types: ['deposit', 'withdrawal'],
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
