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

/**
 * Health check response from API
 */
export interface HealthResponse {
  status: string;
  timestamp: string;
  blockchain: {
    listening: boolean;
    healthy: boolean;
    lastHeartbeatTime: string | null;
    lastEventTime: string | null;
    startTime: string | null;
    consecutiveErrors: number;
  };
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
 * Sort field options for whale API
 * Maps frontend names to backend column names
 */
export type WhaleSortField = 'total_deposited' | 'deposit_count' | 'first_seen_at';
export type SortDirection = 'asc' | 'desc';

/**
 * Fetches paginated list of tracked whale wallets.
 * @param page - Page number (default 1)
 * @param limit - Items per page (default 20)
 * @param sortBy - Field to sort by (default 'total_deposited')
 * @param sortDir - Sort direction (default 'desc')
 * @returns Promise resolving to paginated wallet data
 * @throws Error if the request fails
 */
export async function fetchWhales(
  page = 1,
  limit = 20,
  sortBy: WhaleSortField = 'total_deposited',
  sortDir: SortDirection = 'desc'
): Promise<WalletsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortDir,
  });

  const response = await fetch(`${api.baseUrl}/api/wallets?${params.toString()}`);

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
 * @param minAmount - Optional minimum amount filter (server-side)
 * @returns Promise resolving to paginated deposit data
 * @throws Error if the request fails
 */
export async function fetchDeposits(
  page = 1,
  limit = 50,
  walletAddress?: string,
  minAmount?: number
): Promise<DepositsResponse> {
  let url = `${api.baseUrl}/api/deposits?page=${page}&limit=${limit}`;
  if (walletAddress) {
    url += `&wallet=${walletAddress}`;
  }
  if (minAmount !== undefined && minAmount > 0) {
    url += `&minAmount=${minAmount}`;
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
  eventSlug: string;
  yesPrice: number;
  noPrice: number;
  volume24hr: number;
  liquidity: number;
  endDate: string;
  category: string;
  active: boolean;
  clobTokenId: string; // CLOB token ID for price history lookups
  // Optional fields for enhanced display (populated by frontend)
  priceHistory?: PriceHistoryPoint[];
  priceHistoryLoading?: boolean;
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

/**
 * Price history data point from Polymarket CLOB API
 */
export interface PriceHistoryPoint {
  t: number; // Unix timestamp
  p: number; // Price value (0-1)
}

/**
 * Price history response from CLOB API
 */
export interface PriceHistoryResponse {
  history: PriceHistoryPoint[];
}

/**
 * Fetches price history for a market from Polymarket CLOB API.
 * Uses 1-week interval with hourly fidelity for sparklines.
 *
 * @param clobTokenId - The CLOB token ID for the Yes outcome
 * @returns Promise resolving to price history data, or empty array on error
 */
export async function fetchPriceHistory(clobTokenId: string): Promise<PriceHistoryPoint[]> {
  if (!clobTokenId) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      market: clobTokenId,
      interval: '1w',    // Last 1 week
      fidelity: '60',    // 60-minute intervals (hourly data)
    });

    const response = await fetch(`https://clob.polymarket.com/prices-history?${params.toString()}`);

    if (!response.ok) {
      console.error(`CLOB API error: ${response.status}`);
      return [];
    }

    const data: PriceHistoryResponse = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
}

/**
 * Fetches health status including blockchain listener state.
 * @returns Promise resolving to health data
 * @throws Error if the request fails
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${api.baseUrl}/api/health`);

  if (!response.ok) {
    throw new Error(`Failed to fetch health: ${response.status}`);
  }

  return response.json();
}
