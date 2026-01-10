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
  newWhalesToday: number;
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
 * Get WebSocket URL derived from API base URL
 */
export function getWebSocketUrl(): string {
  const baseUrl = api.baseUrl;
  // Convert HTTP URL to WebSocket URL
  if (baseUrl.startsWith('https://')) {
    return baseUrl.replace('https://', 'wss://');
  }
  return baseUrl.replace('http://', 'ws://');
}

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
 * Raw wallet data from API (now includes trading metrics)
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
  // Trading metrics (included in /api/wallets response, null if fetch failed)
  pnl: number | null;
  pnl7d: number | null;
  pnl30d: number | null;
  winRate: number | null;
  portfolioValue: number | null;
  totalTrades: number | null;
  lastActivityAt: string | null;
  isLive: boolean | null;
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
 * Market makers are automatically excluded server-side.
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
  sortDir: SortDirection = 'desc',
  signal?: AbortSignal
): Promise<WalletsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortDir,
  });

  const response = await fetch(`${api.baseUrl}/api/wallets?${params.toString()}`, { signal });

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
 * Sort field options for deposits API
 * Maps frontend names to backend column names
 */
export type DepositSortField = 'amount' | 'created_at' | 'type';

/**
 * Fetches paginated list of recent deposits.
 * @param page - Page number (default 1)
 * @param limit - Items per page (default 50)
 * @param walletAddress - Optional wallet address to filter by
 * @param minAmount - Optional minimum amount filter (server-side)
 * @param sortBy - Field to sort by (default 'created_at')
 * @param sortDir - Sort direction (default 'desc')
 * @returns Promise resolving to paginated deposit data
 * @throws Error if the request fails
 */
export async function fetchDeposits(
  page = 1,
  limit = 50,
  walletAddress?: string,
  minAmount?: number,
  sortBy: DepositSortField = 'created_at',
  sortDir: SortDirection = 'desc'
): Promise<DepositsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortDir,
  });

  if (walletAddress) {
    params.append('wallet', walletAddress);
  }
  if (minAmount !== undefined && minAmount > 0) {
    params.append('minAmount', String(minAmount));
  }

  const response = await fetch(`${api.baseUrl}/api/deposits?${params.toString()}`);

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
 * Fetches a single whale at a specific index (0-indexed) in the sorted list.
 * Uses offset/limit to efficiently fetch just that one whale.
 *
 * @param index - 0-indexed position in the sorted whale list
 * @param sortBy - Field to sort by (must match the current sort)
 * @param sortDir - Sort direction (must match the current sort)
 * @returns Promise resolving to the whale at that index, or null if out of bounds
 */
export async function fetchWhaleAtIndex(
  index: number,
  sortBy: WhaleSortField = 'total_deposited',
  sortDir: SortDirection = 'desc'
): Promise<WalletApiResponse | null> {
  // Use page/limit to get just the one whale at that position
  // Page is 1-indexed, so page = index + 1 with limit = 1
  const page = index + 1;

  const params = new URLSearchParams({
    page: String(page),
    limit: '1',
    sortBy,
    sortDir,
  });

  const response = await fetch(`${api.baseUrl}/api/wallets?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch whale: ${response.status}`);
  }

  const data: WalletsResponse = await response.json();

  // Return the whale if found
  if (data.wallets.length > 0) {
    return data.wallets[0];
  }

  return null;
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
  sportsMarketType: string | null; // Sports market type (e.g., "moneyline", "spread") - if present, market is sports
  seriesSlug: string | null; // Series/league slug (e.g., "nba-2026", "premier-league-2025") for sport type detection
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

/**
 * Whale of the Day response from API
 */
export interface WhaleOfTheDayResponse {
  address: string;
  totalToday: number;
  depositCount: number;
  largestDeposit: number;
}

/**
 * Trading metrics from Polymarket Data API
 */
export interface TradingMetrics {
  pnl: number;
  pnl7d: number;
  pnl30d: number;
  winRate: number;
  portfolioValue: number;
  activePositions: number;
  totalTrades: number;
  lastActivityAt: string | null;
  isLive: boolean;
}

// Re-export trading types from polymarket.ts for consistency with backend response
// The backend returns these exact types from Polymarket APIs
export type { PolymarketPosition, PolymarketActivity, PolymarketUserProfile, PolymarketClosedPosition } from '../types/polymarket';

// Legacy type aliases for backwards compatibility
// TODO: Migrate all usages to use Polymarket* types directly
import type { PolymarketPosition, PolymarketActivity, PolymarketUserProfile } from '../types/polymarket';
export type PositionData = PolymarketPosition;
export type ActivityData = PolymarketActivity;
export type UserProfileData = PolymarketUserProfile;

/**
 * Complete trading data response from backend
 * Matches WalletTradingData from backend
 */
export interface TradingDataResponse {
  address: string;
  metrics: TradingMetrics;
  positions: PolymarketPosition[];
  activity: PolymarketActivity[];
  profile: PolymarketUserProfile | null;
  fetchedAt: string;
}

/**
 * Fetches whale of the day (top depositor in last 24 hours).
 * @returns Promise resolving to whale data, or null if no deposits today
 */
export async function fetchWhaleOfTheDay(): Promise<WhaleOfTheDayResponse | null> {
  const response = await fetch(`${api.baseUrl}/api/whale-of-the-day`);

  if (!response.ok) {
    throw new Error(`Failed to fetch whale of the day: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches trading data for a wallet from Polymarket APIs.
 * Includes positions, activity, metrics, and user profile.
 *
 * Backend is optimized for FAST responses (3s timeout per API call).
 * Frontend timeout is set to 5s for blazing fast UX.
 *
 * @param address - Ethereum wallet address
 * @param timeoutMs - Request timeout in milliseconds (default: 5000ms)
 * @returns Promise resolving to complete trading data
 * @throws Error if the request fails or times out
 */
export async function fetchTradingData(address: string, timeoutMs = 5000): Promise<TradingDataResponse> {
  // Normalize address to lowercase for consistency
  const normalizedAddress = address.toLowerCase();

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${api.baseUrl}/api/wallets/${normalizedAddress}/trading`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trading data: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Trading data request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Activity response from API
 */
export interface ActivityResponse {
  activity: import('../types/polymarket').PolymarketActivity[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
}

/**
 * Fetches paginated activity history for a wallet.
 *
 * @param address - Ethereum wallet address
 * @param limit - Number of activities per page (max 100)
 * @param offset - Offset for pagination
 * @returns Promise resolving to activity with pagination info
 */
export async function fetchActivity(
  address: string,
  limit = 50,
  offset = 0
): Promise<ActivityResponse> {
  const normalizedAddress = address.toLowerCase();

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(
    `${api.baseUrl}/api/wallets/${normalizedAddress}/activity?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch activity: ${response.status}`);
  }

  return response.json();
}

/**
 * Closed positions response from API
 */
export interface ClosedPositionsResponse {
  positions: import('../types/polymarket').PolymarketClosedPosition[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
}

/**
 * Sort field options for closed positions
 */
export type ClosedPositionSortField = 'realizedpnl' | 'timestamp' | 'avgprice' | 'totalbought';

/**
 * Fetches closed/historical positions for a wallet.
 * These are fully settled positions that have been redeemed.
 *
 * @param address - Ethereum wallet address
 * @param limit - Number of positions per page (max 50)
 * @param offset - Offset for pagination
 * @param sortBy - Field to sort by (default 'realizedpnl')
 * @param sortDir - Sort direction (default 'DESC')
 * @returns Promise resolving to closed positions with pagination info
 */
export async function fetchClosedPositions(
  address: string,
  limit = 50,
  offset = 0,
  sortBy: ClosedPositionSortField = 'realizedpnl',
  sortDir: 'ASC' | 'DESC' = 'DESC'
): Promise<ClosedPositionsResponse> {
  const normalizedAddress = address.toLowerCase();

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sortBy,
    sortDir,
  });

  const response = await fetch(
    `${api.baseUrl}/api/wallets/${normalizedAddress}/closed-positions?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch closed positions: ${response.status}`);
  }

  return response.json();
}
