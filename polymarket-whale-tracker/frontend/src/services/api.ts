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
 * @param walletAddress - Optional wallet address to filter by
 * @returns Promise resolving to paginated deposit data
 * @throws Error if the request fails
 */
export async function fetchDeposits(page = 1, limit = 50, walletAddress?: string): Promise<DepositsResponse> {
  let url = `${api.baseUrl}/api/deposits?page=${page}&limit=${limit}`;
  if (walletAddress) {
    url += `&wallet=${walletAddress}`;
  }
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch deposits: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches a single wallet by address.
 * @param address - Wallet address to fetch
 * @returns Promise resolving to wallet data
 * @throws Error if the request fails or wallet not found
 */
export async function fetchWallet(address: string): Promise<WalletApiResponse> {
  const response = await fetch(`${api.baseUrl}/api/wallets/${address}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Wallet not found');
    }
    throw new Error(`Failed to fetch wallet: ${response.status}`);
  }

  return response.json();
}

/**
 * Trending market data from API
 */
export interface TrendingMarketResponse {
  id: string;
  question: string;
  slug: string;
  yesPrice: number;
  noPrice: number;
  volume24hr: number;
  liquidity: number;
  endDate: string;
  category: string;
  active: boolean;
}

/**
 * Trending markets API response
 */
export interface TrendingMarketsResponse {
  markets: TrendingMarketResponse[];
  updatedAt: string;
}

/**
 * Fetches trending prediction markets from Polymarket.
 * @param limit - Maximum number of markets to fetch (default 8)
 * @returns Promise resolving to trending markets data
 * @throws Error if the request fails
 */
export async function fetchTrendingMarkets(limit = 8): Promise<TrendingMarketsResponse> {
  const response = await fetch(`${api.baseUrl}/api/markets/trending?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch trending markets: ${response.status}`);
  }

  return response.json();
}
