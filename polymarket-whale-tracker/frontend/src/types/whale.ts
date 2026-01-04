/**
 * Whale Types
 *
 * Type definitions for whale wallet data.
 */

/**
 * Whale wallet data from the API
 */
export interface Whale {
  address: string;
  firstSeenAt: string;
  totalDeposited: number;
  depositCount: number;
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
 * Sort field options for whale table
 */
export type WhaleSortField = 'totalDeposited' | 'depositCount' | 'firstSeenAt';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';
