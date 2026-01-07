/**
 * Polymarket Trading Types (Frontend)
 *
 * Type definitions mirroring the backend Polymarket API types.
 * Used for trading data display in whale profiles.
 */

// ============================================================================
// Polymarket Data API Types (data-api.polymarket.com)
// ============================================================================

/**
 * Position data from Polymarket Data API
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
 */
export interface PolymarketUserProfile {
  address: string;
  name?: string;
  pseudonym?: string;
  /** Profile image from Gamma API (use profileImageOptimized for smaller size) */
  profileImage?: string;
  /** Optimized/smaller version of profile image */
  profileImageOptimized?: string;
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
export type PnlTimeWindow = '7d' | '30d' | 'all';

// ============================================================================
// Combined Trading Data Response
// ============================================================================

/**
 * Complete trading data for a wallet (API response)
 */
export interface WalletTradingData {
  address: string;
  metrics: TradingMetrics;
  positions: PolymarketPosition[];
  activity: PolymarketActivity[];
  profile: PolymarketUserProfile | null;
  fetchedAt: string;
}
