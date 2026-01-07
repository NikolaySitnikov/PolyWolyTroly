/**
 * Whale Types
 *
 * Type definitions for whale wallet data.
 * Enhanced with trading performance fields.
 */

import type { PnlTimeWindow } from './polymarket';

/**
 * Whale wallet data from the API (base)
 */
export interface Whale {
  address: string;
  firstSeenAt: string;
  totalDeposited: number;
  depositCount: number;
}

/**
 * Whale with trading performance data
 */
export interface WhaleWithTrading extends Whale {
  pnl: number;
  pnl7d: number;
  pnl30d: number;
  winRate: number;
  portfolioValue: number;
  totalTrades: number;
  lastActivityAt: string | null;
  isLive: boolean;
}

/**
 * Type guard to check if whale has trading data
 */
export function isWhaleWithTrading(whale: Whale | WhaleWithTrading): whale is WhaleWithTrading {
  return 'pnl' in whale && 'winRate' in whale && 'isLive' in whale;
}

/**
 * Get P&L for specific time window
 */
export function getPnlForTimeWindow(whale: WhaleWithTrading, window: PnlTimeWindow): number {
  switch (window) {
    case '7d':
      return whale.pnl7d;
    case '30d':
      return whale.pnl30d;
    case 'all':
    default:
      return whale.pnl;
  }
}

/**
 * Raw API response format for a wallet
 */
export interface WalletApiResponse {
  address: string;
  first_seen_at: string;
  first_deposit_amount: string;
  first_deposit_tx: string;
  total_deposited: string;
  deposit_count: number;
  is_notified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Paginated wallets API response
 */
export interface WalletsApiResponse {
  wallets: WalletApiResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Sort field options for whale table (extended with trading fields)
 */
export type WhaleSortField =
  | 'totalDeposited'
  | 'depositCount'
  | 'firstSeenAt'
  | 'pnl'
  | 'winRate'
  | 'portfolioValue'
  | 'lastActivityAt';

/**
 * All available sort fields
 */
export const TRADING_SORT_FIELDS: WhaleSortField[] = [
  'totalDeposited',
  'depositCount',
  'firstSeenAt',
  'pnl',
  'winRate',
  'portfolioValue',
  'lastActivityAt',
];

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Filter options for whale list
 */
export type WhaleFilterOption = 'all' | 'profitable' | 'losing' | 'live';

/**
 * Filter option configuration
 */
export interface WhaleFilterConfig {
  label: string;
  description: string;
}

/**
 * Whale filter options with labels
 */
export const WHALE_FILTER_OPTIONS: Record<WhaleFilterOption, WhaleFilterConfig> = {
  all: {
    label: 'All',
    description: 'All whales',
  },
  profitable: {
    label: 'Profitable',
    description: 'Whales with positive P&L',
  },
  losing: {
    label: 'Losing',
    description: 'Whales with negative P&L',
  },
  live: {
    label: 'Live',
    description: 'Whales active in last 24h',
  },
} as const;

/**
 * Whale filter state (filters can stack)
 */
export interface WhaleFilters {
  profitability: 'all' | 'profitable' | 'losing';
  liveOnly: boolean;
}
