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
 * Configuration for alert type badges
 * Used for consistent styling across desktop table and mobile cards
 */
export interface AlertTypeConfig {
  emoji: string;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Badge configuration for each alert type
 */
export const ALERT_TYPE_CONFIG: Record<AlertType, AlertTypeConfig> = {
  deposit: {
    emoji: '💰',
    label: 'Deposit',
    bgColor: 'rgba(0, 255, 136, 0.15)',
    textColor: '#00ff88',
    borderColor: '#00ff88',
  },
};

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
