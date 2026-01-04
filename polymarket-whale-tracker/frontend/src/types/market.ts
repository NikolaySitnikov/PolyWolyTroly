/**
 * Market Types
 *
 * Type definitions for Polymarket market data.
 * Based on the Polymarket Gamma API response structure.
 *
 * @see https://gamma-api.polymarket.com/markets
 */

/**
 * Trending market data for display in the UI.
 * Simplified from the full Gamma API response to essential fields.
 */
export interface TrendingMarket {
  /** Unique market identifier */
  id: string;
  /** Market question/title */
  question: string;
  /** URL-friendly slug for linking to Polymarket */
  slug: string;
  /** Current price for "Yes" outcome (0-1) */
  yesPrice: number;
  /** Current price for "No" outcome (0-1) */
  noPrice: number;
  /** 24-hour trading volume in USD */
  volume24hr: number;
  /** Total liquidity available */
  liquidity: number;
  /** Market end/resolution date */
  endDate: string;
  /** Market category (e.g., "Crypto", "Politics") */
  category: string;
  /** Whether the market is still active for trading */
  active: boolean;
}

/**
 * Raw market response from Polymarket Gamma API.
 * Contains all fields returned by the API.
 */
export interface GammaMarketResponse {
  id: string;
  question: string;
  slug: string;
  description: string;
  conditionId: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  volumeNum: number;
  liquidity: string;
  liquidityNum: number;
  volume24hr: number;
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  closed: boolean;
  active: boolean;
  archived: boolean;
  restricted: boolean;
  category: string;
  enableOrderBook: boolean;
  acceptingOrders: boolean;
  clobTokenIds: string[];
  spread: number;
  commentCount: number;
}

/**
 * API response for trending markets endpoint
 */
export interface TrendingMarketsResponse {
  markets: TrendingMarket[];
  updatedAt: string;
}
