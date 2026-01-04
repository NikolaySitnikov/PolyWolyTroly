/**
 * Alert Types
 *
 * Type definitions for live alert feed data.
 */

/**
 * Alert type - currently only deposits are tracked
 * Future: could add 'trade', 'withdrawal' types
 */
export type AlertType = 'deposit';

/**
 * A single alert item in the feed
 */
export interface Alert {
  /** Unique identifier (tx hash for deposits) */
  id: string;
  /** Type of alert */
  type: AlertType;
  /** Wallet address that triggered the alert */
  walletAddress: string;
  /** Amount in USD */
  amount: number;
  /** When the alert occurred */
  timestamp: string;
  /** Transaction hash for on-chain verification */
  txHash: string;
}

/**
 * Raw deposit data from API
 */
export interface DepositApiResponse {
  id: string;
  wallet_address: string;
  amount: string;
  tx_hash: string;
  created_at: string;
}

/**
 * Paginated deposits response from API
 */
export interface DepositsResponse {
  deposits: DepositApiResponse[];
  total: number;
  page: number;
  limit: number;
}
