/**
 * API Service
 *
 * Client for connecting to the PolyWolyTroly backend API.
 * Provides typed functions for fetching data from REST endpoints.
 */

export interface StatsResponse {
  whaleCount: number;
  whaleCountTrend: number;
  totalVolume: number;
  totalVolumeTrend: number;
  alertsToday: number;
  newWhalesThisWeek: number;
}

export const api = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3002',
};

/**
 * Fetches dashboard statistics from the API.
 * @returns Promise resolving to stats data
 * @throws Error if the request fails
 */
export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch(`${api.baseUrl}/api/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.status}`);
  }

  return response.json();
}

/**
 * Raw wallet data from API
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
 * Paginated wallets response from API
 */
export interface WalletsResponse {
  wallets: WalletApiResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetches paginated list of tracked whale wallets.
 * @param page - Page number (default 1)
 * @param limit - Items per page (default 20)
 * @returns Promise resolving to paginated wallet data
 * @throws Error if the request fails
 */
export async function fetchWhales(page = 1, limit = 20): Promise<WalletsResponse> {
  const response = await fetch(`${api.baseUrl}/api/wallets?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch wallets: ${response.status}`);
  }

  return response.json();
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

/**
 * Fetches paginated list of recent deposits.
 * @param page - Page number (default 1)
 * @param limit - Items per page (default 50)
 * @returns Promise resolving to paginated deposit data
 * @throws Error if the request fails
 */
export async function fetchDeposits(page = 1, limit = 50): Promise<DepositsResponse> {
  const response = await fetch(`${api.baseUrl}/api/deposits?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch deposits: ${response.status}`);
  }

  return response.json();
}
