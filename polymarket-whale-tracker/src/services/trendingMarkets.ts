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
}

/**
 * Event data from Gamma API (nested in market response)
 */
interface GammaEvent {
  id: string;
  slug: string;
  title: string;
}

/**
 * Raw market response from Gamma API.
 * Note: outcomes and outcomePrices are JSON-encoded strings, not arrays.
 */
interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string; // JSON-encoded array: "[\"Yes\", \"No\"]"
  outcomePrices: string; // JSON-encoded array: "[\"0.65\", \"0.35\"]"
  volume24hr: number;
  liquidityNum: number;
  endDate: string;
  category: string;
  active: boolean;
  closed: boolean;
  events: GammaEvent[]; // Parent events for this market
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
 * Transform Gamma API market to our TrendingMarket format
 */
function transformMarket(market: GammaMarket): TrendingMarket {
  const [yesPrice, noPrice] = parseOutcomePrices(market.outcomePrices);
  // Use the first event's slug for the Polymarket URL, fallback to market slug
  const eventSlug = market.events?.[0]?.slug || market.slug;

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
    category: market.category || "Other",
    active: market.active,
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
