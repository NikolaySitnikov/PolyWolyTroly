/**
 * Polymarket Trading Types
 *
 * TDD: GREEN phase - Implementation to make tests pass.
 * Type definitions for Polymarket Data API and Gamma API responses.
 */

// ============================================================================
// Polymarket Data API Types (data-api.polymarket.com)
// ============================================================================

/**
 * Position data from Polymarket Data API
 * GET /positions?user={address}
 */
export interface PolymarketPosition {
  conditionId: string;
  asset: string;
  outcomeIndex: number;
  outcome: string;
  title: string;
  slug: string;
  eventSlug: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  initialValue: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  isActive: boolean;
  endDate?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Activity data from Polymarket Data API
 * GET /activity?user={address}
 */
export interface PolymarketActivity {
  proxyWallet: string;
  timestamp: number;
  type: string;
  conditionId?: string;
  title?: string;
  slug?: string;
  side?: string;
  outcome?: string;
  size?: number;
  usdcSize?: number;
  price?: number;
  transactionHash?: string;
  fee?: number;
}

/**
 * Trade data from Polymarket Data API
 * GET /trades?user={address}
 */
export interface PolymarketTrade {
  transactionHash: string;
  timestamp: number;
  conditionId: string;
  title: string;
  slug: string;
  side: string;
  outcome: string;
  size: number;
  usdcSize: number;
  price: number;
  fee: number;
  isMaker: boolean;
}

/**
 * Portfolio value from Polymarket Data API
 * GET /value?user={address}
 */
export interface PolymarketValue {
  portfolioValue: number;
  positionsValue: number;
  cashBalance: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  activePositions: number;
  timestamp: number;
}

// ============================================================================
// Polymarket Gamma API Types (gamma-api.polymarket.com)
// ============================================================================

/**
 * User profile from Gamma API
 * GET /public-profile?address={address}
 */
export interface PolymarketUserProfile {
  address: string;
  name?: string;
  pseudonym?: string;
  avatarUrl?: string;
  verified: boolean;
  twitterHandle?: string;
  bio?: string;
  createdAt?: string;
  followers?: number;
  following?: number;
  totalVolume?: number;
  totalProfit?: number;
}

// ============================================================================
// Aggregated Trading Metrics
// ============================================================================

/**
 * Aggregated trading metrics for a whale
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

/**
 * Time window for P&L calculation
 */
export type PnlTimeWindow = "7d" | "30d" | "all";

// ============================================================================
// Combined Trading Data Response
// ============================================================================

/**
 * Complete trading data for a wallet
 */
export interface WalletTradingData {
  address: string;
  metrics: TradingMetrics;
  positions: PolymarketPosition[];
  activity: PolymarketActivity[];
  profile: PolymarketUserProfile | null;
  fetchedAt: string;
}
