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
 *
 * Field names match actual API response (verified against live API 2026-01-07)
 */
export interface PolymarketPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  /** Unrealized P&L - use this for total P&L calculation */
  cashPnl: number;
  /** Percent P&L */
  percentPnl: number;
  totalBought: number;
  /** Realized P&L from closed/redeemed portions */
  realizedPnl: number;
  percentRealizedPnl: number;
  /** Current price (0 = market resolved) */
  curPrice: number;
  /** Whether position can be redeemed (market resolved) */
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon: string;
  eventId: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset: string;
  endDate: string;
  negativeRisk: boolean;
  // Enriched fields from Gamma API (optional - populated by backend)
  /** Sports market type (e.g., "moneyline", "spread") - presence indicates sports market */
  sportsMarketType?: string | null;
  /** Series/league slug (e.g., "nba-2026", "premier-league-2025") for sport type detection */
  seriesSlug?: string | null;
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
 *
 * NOTE: API returns ARRAY with single object: [{user, value}]
 */
export interface PolymarketValue {
  user: string;
  value: number;
}

// ============================================================================
// Polymarket Gamma API Types (gamma-api.polymarket.com)
// ============================================================================

/**
 * User profile from Gamma API
 *
 * Field names match actual API response (verified against live API 2026-01-07)
 * Some fields are optional as they may not be present for all profiles.
 */
export interface PolymarketUserProfile {
  createdAt: string;
  proxyWallet: string;
  displayUsernamePublic: boolean;
  pseudonym: string;
  name: string;
  users: Array<{
    id: string;
    creator: boolean;
    mod: boolean;
  }>;
  /** Whether user has a verified badge */
  verifiedBadge: boolean;
  /** Alias for verifiedBadge for backwards compatibility */
  verified?: boolean;
  /** Optional profile image URL */
  profileImage?: string;
  /** Optimized/smaller version of profile image */
  profileImageOptimized?: string;
  bio?: string;
  /** Optional Twitter/X handle */
  twitterHandle?: string;
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
