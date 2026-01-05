/**
 * Trending Markets Service
 *
 * Fetches trending prediction markets from the Polymarket Gamma API.
 * Returns markets sorted by 24-hour trading volume.
 *
 * @see https://gamma-api.polymarket.com/markets
 */

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

/**
 * Trending market data for display in the UI.
 */
export interface TrendingMarket {
  id: string;
  question: string;
  slug: string;
  eventSlug: string; // Event slug for Polymarket URL (polymarket.com/event/{eventSlug})
  yesPrice: number;
  noPrice: number;
  volume24hr: number;
  liquidity: number;
  endDate: string;
  category: string;
  active: boolean;
  clobTokenId: string; // CLOB token ID for Yes outcome (used for price history)
  sportsMarketType: string | null; // Sports market type (e.g., "moneyline", "spread") - if present, market is sports
  seriesSlug: string | null; // Series/league slug (e.g., "nba-2026", "premier-league-2025") for sport type detection
}

/**
 * Series data from Gamma API (nested in event response)
 */
interface GammaSeries {
  id: string;
  title: string;
  slug: string;
}

/**
 * Event data from Gamma API (nested in market response)
 */
interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  series?: GammaSeries[];
}

/**
 * Tag data from Gamma API
 * @see https://docs.polymarket.com/api-reference/tags/list-tags
 */
interface GammaTag {
  id: string;
  label: string;
  slug: string;
  forceShow?: boolean | null;
  forceHide?: boolean | null;
}

/**
 * Raw market response from Gamma API.
 * Note: outcomes, outcomePrices, and clobTokenIds are JSON-encoded strings, not arrays.
 * @see https://docs.polymarket.com/developers/gamma-markets-api/gamma-structure
 */
interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string; // JSON-encoded array: "[\"Yes\", \"No\"]"
  outcomePrices: string; // JSON-encoded array: "[\"0.65\", \"0.35\"]"
  clobTokenIds: string; // JSON-encoded array: "[\"123...\", \"456...\"]" - Yes and No token IDs
  volume24hr: number;
  liquidityNum: number;
  endDate: string;
  tags?: GammaTag[]; // Array of tag objects with label, slug, etc.
  active: boolean;
  closed: boolean;
  events: GammaEvent[]; // Parent events for this market
  sportsMarketType?: string | null; // Sports market type (e.g., "moneyline", "spread") - presence indicates sports market
}

/**
 * Parse outcome prices from JSON-encoded string.
 * Returns [yesPrice, noPrice] or [0, 0] on error.
 */
function parseOutcomePrices(outcomePrices: string): [number, number] {
  try {
    const prices = JSON.parse(outcomePrices);
    if (Array.isArray(prices) && prices.length >= 2) {
      return [parseFloat(prices[0]) || 0, parseFloat(prices[1]) || 0];
    }
  } catch {
    // Invalid JSON, return defaults
  }
  return [0, 0];
}

/**
 * Parse CLOB token IDs from JSON-encoded string.
 * Returns first token ID (Yes outcome) or empty string on error.
 */
function parseClobTokenId(clobTokenIds: string): string {
  try {
    const tokenIds = JSON.parse(clobTokenIds);
    if (Array.isArray(tokenIds) && tokenIds.length >= 1) {
      return String(tokenIds[0]) || "";
    }
  } catch {
    // Invalid JSON, return empty string
  }
  return "";
}

/**
 * Extract primary category from tags array.
 * Returns the first tag's label, or empty string if no tags.
 * Frontend will infer category from question if this is empty/generic.
 */
function extractCategory(tags?: GammaTag[]): string {
  if (!tags || tags.length === 0) return "";
  // Return the first tag's label (primary category)
  return tags[0]?.label || "";
}

/**
 * Transform Gamma API market to our TrendingMarket format
 */
function transformMarket(market: GammaMarket): TrendingMarket {
  const [yesPrice, noPrice] = parseOutcomePrices(market.outcomePrices);
  // Use the first event's slug for the Polymarket URL, fallback to market slug
  const eventSlug = market.events?.[0]?.slug || market.slug;
  // Get the Yes outcome token ID for price history lookups
  const clobTokenId = parseClobTokenId(market.clobTokenIds);
  // Extract category from tags array
  const category = extractCategory(market.tags);
  // Extract series slug for sport type detection (e.g., "nba-2026", "premier-league-2025")
  const seriesSlug = market.events?.[0]?.series?.[0]?.slug || null;

  return {
    id: market.id,
    question: market.question,
    slug: market.slug,
    eventSlug,
    yesPrice,
    noPrice,
    volume24hr: market.volume24hr || 0,
    liquidity: market.liquidityNum || 0,
    endDate: market.endDate,
    category,
    active: market.active,
    clobTokenId,
    sportsMarketType: market.sportsMarketType || null,
    seriesSlug,
  };
}

export const trendingMarketsService = {
  /**
   * Fetch trending markets from Polymarket Gamma API.
   * Returns markets sorted by 24-hour volume (highest first).
   *
   * @param limit - Maximum number of markets to return (default: 8)
   * @returns Array of trending markets, or empty array on error
   */
  async getTrendingMarkets(limit: number = 8): Promise<TrendingMarket[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        order: "volume24hr",
        ascending: "false",
        closed: "false",
        active: "true",
      });

      const url = `${GAMMA_API_URL}/markets?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `Gamma API error: ${response.status} ${response.statusText}`
        );
        return [];
      }

      const markets: GammaMarket[] = await response.json();

      // Transform and filter (backup filter in case API doesn't filter correctly)
      return markets
        .filter((market) => market.active && !market.closed)
        .map(transformMarket);
    } catch (error) {
      console.error("Error fetching trending markets:", error);
      return [];
    }
  },
};
