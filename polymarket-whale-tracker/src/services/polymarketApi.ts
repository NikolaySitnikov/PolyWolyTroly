import type {
  PolymarketPosition,
  PolymarketActivity as PolymarketActivityType,
  PolymarketTrade,
  PolymarketValue,
  PolymarketUserProfile,
  TradingMetrics,
  WalletTradingData,
} from "../types/polymarket.js";

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_API = "https://clob.polymarket.com";
const POLYMARKET_PNL_SUBGRAPH = "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn";
const DEFILLAMA_BLOCK_API = "https://coins.llama.fi/block/polygon";
const POLYMARKET_USER_PNL_API = "https://user-pnl-api.polymarket.com";

/**
 * Position data from the PnL subgraph
 * Values are stored in micro-USDC (6 decimals)
 */
interface SubgraphPosition {
  tokenId: string;
  amount: string;  // BigInt in wei (18 decimals for CTF tokens)
  avgPrice: string; // BigInt in micro-USDC (6 decimals), scaled by 1e6
  realizedPnl: string; // BigInt in micro-USDC (6 decimals)
  totalBought: string; // BigInt in micro-USDC (6 decimals)
}

/**
 * Price history point from CLOB API
 */
interface PriceHistoryPoint {
  t: number;  // Unix timestamp
  p: number;  // Price (0-1)
}

/**
 * P&L history point from user-pnl-api.polymarket.com
 * This is the official API that Polymarket's frontend uses
 */
interface UserPnlHistoryPoint {
  t: number;  // Unix timestamp (seconds)
  p: number;  // Cumulative P&L at this point in USD
}

/**
 * Interval options for user-pnl API
 * - 1d: 1 day of history
 * - 1w: 1 week of history
 * - 1m: 1 month of history
 * - max: All time history
 */
type UserPnlInterval = "1d" | "1w" | "1m" | "max";

// 24 hours in milliseconds for "live" status check
const LIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Time periods for P&L calculation in days
 */
const TIME_PERIODS = {
  "7d": 7,
  "30d": 30,
} as const;

// Default limits for data fetching
const DEFAULT_POSITIONS_LIMIT = 100;
const DEFAULT_ACTIVITY_LIMIT = 100;
const DEFAULT_TRADES_LIMIT = 500;
const MAX_POSITIONS_FOR_PNL = 500; // Fetch more positions for accurate P&L

// Legacy interface for backwards compatibility
interface PolymarketActivity {
  proxyWallet: string;
  timestamp: number;
  type: string;
  size?: number;
  usdcSize?: number;
  transactionHash?: string;
}

export const polymarketApi = {
  /**
   * Check if a wallet has any historical activity on Polymarket
   * Returns true if the wallet has ever traded on Polymarket
   */
  async hasHistoricalActivity(walletAddress: string): Promise<boolean> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_DATA_API}/activity?user=${address}&limit=1`;

      const response = await fetch(url);

      if (!response.ok) {
        return false;
      }

      const activities: PolymarketActivity[] = await response.json();
      return activities.length > 0;
    } catch (error) {
      console.error("Error checking Polymarket history:", error);
      return false;
    }
  },

  /**
   * Get the count of activities for a wallet
   * Useful for understanding how active a wallet has been
   */
  async getActivityCount(walletAddress: string): Promise<number> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_DATA_API}/activity?user=${address}&limit=500`;

      const response = await fetch(url);

      if (!response.ok) {
        return 0;
      }

      const activities: PolymarketActivity[] = await response.json();
      return activities.length;
    } catch (error) {
      console.error("Error getting Polymarket activity count:", error);
      return 0;
    }
  },

  /**
   * Get the timestamp of the first activity for a wallet
   * Useful for knowing when a wallet first used Polymarket
   */
  async getFirstActivityTimestamp(
    walletAddress: string
  ): Promise<number | null> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_DATA_API}/activity?user=${address}&limit=1&sortBy=TIMESTAMP&sortDirection=ASC`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const activities: PolymarketActivity[] = await response.json();

      if (activities.length === 0) {
        return null;
      }

      return activities[0].timestamp;
    } catch (error) {
      console.error("Error getting first activity timestamp:", error);
      return null;
    }
  },

  // ==========================================================================
  // Trading Data Methods (TDD GREEN phase)
  // ==========================================================================

  /**
   * Fetch positions for a wallet from Polymarket Data API
   * Supports pagination to fetch all positions for accurate P&L
   */
  async getPositions(
    walletAddress: string,
    limit: number = DEFAULT_POSITIONS_LIMIT
  ): Promise<PolymarketPosition[]> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_DATA_API}/positions?user=${address}&limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Positions API error: ${response.status}`);
        return [];
      }

      const positions = await response.json();
      return Array.isArray(positions) ? positions : [];
    } catch (error) {
      console.error("Error fetching positions:", error);
      return [];
    }
  },

  /**
   * Fetch ALL positions for a wallet (paginated)
   * Used for accurate P&L calculation
   */
  async getAllPositions(walletAddress: string): Promise<PolymarketPosition[]> {
    try {
      const address = walletAddress.toLowerCase();
      const allPositions: PolymarketPosition[] = [];
      let offset = 0;
      const pageSize = 100;

      // Fetch ALL positions - no arbitrary limit
      // Loop until we get fewer than pageSize (meaning no more data)
      while (true) {
        const url = `${POLYMARKET_DATA_API}/positions?user=${address}&limit=${pageSize}&offset=${offset}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Positions API error: ${response.status}`);
          break;
        }

        const positions = await response.json();
        if (!Array.isArray(positions) || positions.length === 0) {
          break;
        }

        allPositions.push(...positions);
        offset += pageSize;

        // Stop if we got fewer than requested (no more data)
        if (positions.length < pageSize) {
          break;
        }
      }

      return allPositions;
    } catch (error) {
      console.error("Error fetching all positions:", error);
      return [];
    }
  },

  /**
   * Fetch market metadata from Gamma API for given slugs
   * Returns a map of slug -> { sportsMarketType, seriesSlug }
   *
   * Note: We use slug for lookup because the Gamma API doesn't properly filter by conditionId
   */
  async getMarketMetadataBySlug(
    slugs: string[]
  ): Promise<Map<string, { sportsMarketType: string | null; seriesSlug: string | null }>> {
    const metadataMap = new Map<string, { sportsMarketType: string | null; seriesSlug: string | null }>();

    if (slugs.length === 0) return metadataMap;

    try {
      // Fetch each market individually since Gamma API doesn't support batch slug queries
      // Use Promise.all for parallel fetching with a concurrency limit
      const BATCH_SIZE = 10; // Limit concurrent requests

      for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
        const batch = slugs.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (slug) => {
            try {
              const url = `${POLYMARKET_GAMMA_API}/markets?slug=${encodeURIComponent(slug)}`;
              const response = await fetch(url);
              if (!response.ok) return null;

              const markets = await response.json();
              if (Array.isArray(markets) && markets.length > 0) {
                const market = markets[0];
                return {
                  slug,
                  sportsMarketType: market.sportsMarketType || null,
                  seriesSlug: market.events?.[0]?.series?.[0]?.slug || null,
                };
              }
              return null;
            } catch {
              return null;
            }
          })
        );

        for (const result of results) {
          if (result) {
            metadataMap.set(result.slug, {
              sportsMarketType: result.sportsMarketType,
              seriesSlug: result.seriesSlug,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching market metadata:", error);
    }

    return metadataMap;
  },

  /**
   * Enrich positions with market metadata (sportsMarketType, seriesSlug)
   * Fetches metadata from Gamma API and adds it to each position
   */
  async enrichPositionsWithMetadata(
    positions: PolymarketPosition[]
  ): Promise<PolymarketPosition[]> {
    if (positions.length === 0) return positions;

    // Extract unique slugs (positions have a slug field)
    const slugs = [...new Set(positions.map(p => p.slug).filter(Boolean))];

    // Fetch metadata for all slugs
    const metadataMap = await this.getMarketMetadataBySlug(slugs);

    // Enrich positions with metadata
    return positions.map(position => {
      const metadata = metadataMap.get(position.slug);
      if (metadata) {
        return {
          ...position,
          sportsMarketType: metadata.sportsMarketType,
          seriesSlug: metadata.seriesSlug,
        };
      }
      return position;
    });
  },

  /**
   * Fetch activity history for a wallet from Polymarket Data API
   */
  async getActivity(
    walletAddress: string,
    limit: number = DEFAULT_ACTIVITY_LIMIT
  ): Promise<PolymarketActivityType[]> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_DATA_API}/activity?user=${address}&limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Activity API error: ${response.status}`);
        return [];
      }

      const activities = await response.json();
      return Array.isArray(activities) ? activities : [];
    } catch (error) {
      console.error("Error fetching activity:", error);
      return [];
    }
  },

  /**
   * Fetch ALL activity for a wallet (paginated)
   * Used for accurate P&L calculation
   */
  async getAllActivity(
    walletAddress: string,
    maxActivity: number = 1000
  ): Promise<PolymarketActivityType[]> {
    try {
      const address = walletAddress.toLowerCase();
      const allActivity: PolymarketActivityType[] = [];
      let offset = 0;
      const pageSize = 100;

      while (allActivity.length < maxActivity) {
        const url = `${POLYMARKET_DATA_API}/activity?user=${address}&limit=${pageSize}&offset=${offset}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Activity API error: ${response.status}`);
          break;
        }

        const activity = await response.json();
        if (!Array.isArray(activity) || activity.length === 0) {
          break;
        }

        allActivity.push(...activity);
        offset += pageSize;

        // Stop if we got fewer than requested (no more data)
        if (activity.length < pageSize) {
          break;
        }
      }

      return allActivity;
    } catch (error) {
      console.error("Error fetching all activity:", error);
      return [];
    }
  },

  /**
   * Fetch trades for a wallet from Polymarket Data API
   */
  async getTrades(
    walletAddress: string,
    limit: number = DEFAULT_TRADES_LIMIT
  ): Promise<PolymarketTrade[]> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_DATA_API}/trades?user=${address}&limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Trades API error: ${response.status}`);
        return [];
      }

      const trades = await response.json();
      return Array.isArray(trades) ? trades : [];
    } catch (error) {
      console.error("Error fetching trades:", error);
      return [];
    }
  },

  /**
   * Get total predictions count from the /traded endpoint.
   *
   * This is a FAST single API call that returns the exact count of unique
   * markets the user has traded on - matching what Polymarket shows on profiles.
   */
  async getTotalPredictionsCount(walletAddress: string): Promise<number> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_DATA_API}/traded?user=${address}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Traded API error: ${response.status}`);
        return 0;
      }

      const data = await response.json();
      return data?.traded || 0;
    } catch (error) {
      console.error("Error fetching predictions count:", error);
      return 0;
    }
  },

  /**
   * Fetch portfolio value for a wallet from Polymarket Data API
   *
   * NOTE: API returns array with single object: [{user, value}]
   */
  async getValue(walletAddress: string): Promise<PolymarketValue | null> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_DATA_API}/value?user=${address}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Value API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // API returns array with single object [{user, value}]
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }

      return null;
    } catch (error) {
      console.error("Error fetching portfolio value:", error);
      return null;
    }
  },

  /**
   * Get Polygon block number for a specific timestamp using DeFiLlama API
   */
  async getBlockByTimestamp(timestamp: number): Promise<number | null> {
    try {
      const response = await fetch(`${DEFILLAMA_BLOCK_API}/${timestamp}`);
      if (!response.ok) {
        console.error(`DeFiLlama block API error: ${response.status}`);
        return null;
      }
      const data = await response.json();
      return data.height;
    } catch (error) {
      console.error("Error fetching block by timestamp:", error);
      return null;
    }
  },

  /**
   * Fetch all positions for a user from the Polymarket PnL subgraph
   *
   * Uses The Graph's time-travel feature to query at a specific block.
   * Returns full position data needed for P&L calculation.
   *
   * @param walletAddress The user's proxy wallet address
   * @param blockNumber Optional block number for historical query
   * @returns Array of positions with tokenId, amount, avgPrice, realizedPnl
   */
  async getSubgraphPositions(
    walletAddress: string,
    blockNumber?: number
  ): Promise<SubgraphPosition[]> {
    try {
      const address = walletAddress.toLowerCase();

      // GraphQL query - optionally includes block parameter for time travel
      const blockParam = blockNumber ? `, block: { number: ${blockNumber} }` : "";
      const query = `{
        userPositions(where: { user: "${address}" }, first: 1000${blockParam}) {
          tokenId
          amount
          avgPrice
          realizedPnl
          totalBought
        }
      }`;

      const response = await fetch(POLYMARKET_PNL_SUBGRAPH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error(`PnL subgraph error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!data.data?.userPositions) {
        return [];
      }

      return data.data.userPositions;
    } catch (error) {
      console.error("Error fetching subgraph positions:", error);
      return [];
    }
  },

  /**
   * Fetch total realized P&L for a user from the Polymarket PnL subgraph
   *
   * Uses The Graph's time-travel feature to query at a specific block.
   * This allows us to calculate P&L deltas for specific time windows.
   *
   * @param walletAddress The user's proxy wallet address
   * @param blockNumber Optional block number for historical query
   * @returns Total realized P&L in USD, or null if unavailable
   */
  async getSubgraphRealizedPnl(
    walletAddress: string,
    blockNumber?: number
  ): Promise<number | null> {
    try {
      const positions = await this.getSubgraphPositions(walletAddress, blockNumber);

      if (positions.length === 0) {
        return null;
      }

      // Sum all realized P&L values (stored in 6 decimals / micro-USDC)
      const totalRealizedPnl = positions.reduce(
        (sum: number, pos: SubgraphPosition) =>
          sum + parseInt(pos.realizedPnl, 10),
        0
      );

      // Convert from micro-USDC to USD
      return totalRealizedPnl / 1_000_000;
    } catch (error) {
      console.error("Error fetching subgraph realized P&L:", error);
      return null;
    }
  },

  /**
   * Fetch price history for a token from CLOB API
   *
   * @param tokenId The CLOB token ID
   * @param startTs Optional start timestamp (unix seconds)
   * @param endTs Optional end timestamp (unix seconds)
   * @returns Array of price history points
   */
  async getPriceHistory(
    tokenId: string,
    startTs?: number,
    endTs?: number
  ): Promise<PriceHistoryPoint[]> {
    try {
      let url = `${POLYMARKET_CLOB_API}/prices-history?market=${tokenId}`;

      if (startTs && endTs) {
        url += `&startTs=${startTs}&endTs=${endTs}`;
      } else {
        // Default to daily interval for last 30 days
        url += `&interval=1d`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (!data.history || !Array.isArray(data.history)) {
        return [];
      }

      return data.history;
    } catch (error) {
      console.error("Error fetching price history:", error);
      return [];
    }
  },

  /**
   * Get the price at a specific timestamp from price history
   *
   * @param history Price history array
   * @param targetTs Target timestamp (unix seconds)
   * @returns Price at or closest before the target timestamp
   */
  getPriceAtTimestamp(history: PriceHistoryPoint[], targetTs: number): number | null {
    if (history.length === 0) return null;

    // Find the closest price point at or before the target timestamp
    let closestPoint: PriceHistoryPoint | null = null;

    for (const point of history) {
      if (point.t <= targetTs) {
        if (!closestPoint || point.t > closestPoint.t) {
          closestPoint = point;
        }
      }
    }

    // If no point before target, use the first available point
    if (!closestPoint && history.length > 0) {
      closestPoint = history[0];
    }

    return closestPoint?.p ?? null;
  },

  /**
   * Calculate unrealized P&L for positions at a specific timestamp
   *
   * For each position with amount > 0:
   * Unrealized P&L = amount × (current_price - avg_price)
   *
   * @param positions Array of subgraph positions
   * @param targetTs Target timestamp for price lookup
   * @returns Total unrealized P&L in USD
   */
  async calculateHistoricalUnrealizedPnl(
    positions: SubgraphPosition[],
    targetTs: number
  ): Promise<number> {
    let totalUnrealized = 0;

    // Filter positions with non-zero amount
    const activePositions = positions.filter(p => BigInt(p.amount) > 0n);

    if (activePositions.length === 0) {
      return 0;
    }

    // Fetch price history for each active position
    // Use a window around the target timestamp
    const startTs = targetTs - 86400; // 1 day before
    const endTs = targetTs + 86400;   // 1 day after

    const pricePromises = activePositions.map(async (pos) => {
      const history = await this.getPriceHistory(pos.tokenId, startTs, endTs);
      const price = this.getPriceAtTimestamp(history, targetTs);

      if (price === null) {
        return 0;
      }

      // Convert subgraph values:
      // - amount is in wei (18 decimals for CTF tokens)
      // - avgPrice is stored as price × 1e6 (e.g., 0.703 → 703000)
      // - price from CLOB is 0-1 (e.g., 0.785)
      const amount = Number(BigInt(pos.amount)) / 1e18;
      const avgPrice = Number(BigInt(pos.avgPrice)) / 1e6;

      // Unrealized P&L = amount × (current_price - avg_price)
      const unrealized = amount * (price - avgPrice);

      return unrealized;
    });

    const unrealizedValues = await Promise.all(pricePromises);
    totalUnrealized = unrealizedValues.reduce((sum, val) => sum + val, 0);

    return totalUnrealized;
  },

  /**
   * Fetch total unrealized P&L from the Data API positions endpoint
   *
   * @returns Total unrealized P&L (cashPnl) in USD
   */
  async getUnrealizedPnl(walletAddress: string): Promise<number> {
    try {
      const address = walletAddress.toLowerCase();
      const response = await fetch(
        `${POLYMARKET_DATA_API}/positions?user=${address}&sizeThreshold=0`
      );

      if (!response.ok) {
        return 0;
      }

      const positions = await response.json();

      if (!Array.isArray(positions)) {
        return 0;
      }

      // Sum all cashPnl values (already in USD)
      return positions.reduce(
        (sum: number, pos: { cashPnl?: number }) => sum + (pos.cashPnl || 0),
        0
      );
    } catch (error) {
      console.error("Error fetching unrealized P&L:", error);
      return 0;
    }
  },

  /**
   * Fetch P&L history from user-pnl-api.polymarket.com
   *
   * This is the official API that Polymarket's frontend uses for P&L charts.
   * Returns array of {t, p} where:
   * - t: Unix timestamp (seconds)
   * - p: Cumulative P&L at that point in USD
   *
   * @param walletAddress The user's wallet address
   * @param interval Time interval: 1d, 1w, 1m, max
   * @param fidelity Data point granularity: 1h, 1d
   * @returns Array of P&L history points
   */
  async getUserPnlHistory(
    walletAddress: string,
    interval: UserPnlInterval = "max",
    fidelity: "1h" | "1d" = "1d"
  ): Promise<UserPnlHistoryPoint[]> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_USER_PNL_API}/user-pnl?user_address=${address}&interval=${interval}&fidelity=${fidelity}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`User PnL API error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return [];
      }

      return data;
    } catch (error) {
      console.error("Error fetching user P&L history:", error);
      return [];
    }
  },

  /**
   * Calculate P&L for a specific time window using The Graph time-travel
   *
   * Formula: P&L(period) = TotalP&L(now) - TotalP&L(period_days_ago)
   * Where TotalP&L = RealizedP&L + UnrealizedP&L
   *
   * This matches how Polymarket GUI calculates time-windowed P&L.
   *
   * @param walletAddress The user's proxy wallet address
   * @param days Number of days for the time window (7 or 30)
   * @returns P&L change over the time period
   */
  async calculateTimeWindowedPnl(
    walletAddress: string,
    days: number
  ): Promise<number | null> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const pastTimestamp = now - days * 24 * 60 * 60;

      // Get block number from N days ago
      const pastBlock = await this.getBlockByTimestamp(pastTimestamp);
      if (pastBlock === null) {
        return null;
      }

      // Fetch current and past positions in parallel
      const [currentPositions, pastPositions] = await Promise.all([
        this.getSubgraphPositions(walletAddress),
        this.getSubgraphPositions(walletAddress, pastBlock),
      ]);

      if (currentPositions.length === 0 && pastPositions.length === 0) {
        return null;
      }

      // Calculate current total P&L = realized + unrealized
      const currentRealizedPnl = currentPositions.reduce(
        (sum, pos) => sum + parseInt(pos.realizedPnl, 10),
        0
      ) / 1_000_000;

      const currentUnrealizedPnl = await this.getUnrealizedPnl(walletAddress);
      const currentTotalPnl = currentRealizedPnl + currentUnrealizedPnl;

      // Calculate past total P&L = realized + unrealized at past timestamp
      const pastRealizedPnl = pastPositions.reduce(
        (sum, pos) => sum + parseInt(pos.realizedPnl, 10),
        0
      ) / 1_000_000;

      const pastUnrealizedPnl = await this.calculateHistoricalUnrealizedPnl(
        pastPositions,
        pastTimestamp
      );
      const pastTotalPnl = pastRealizedPnl + pastUnrealizedPnl;

      // Delta = current total P&L - past total P&L
      return currentTotalPnl - pastTotalPnl;
    } catch (error) {
      console.error(`Error calculating ${days}d P&L:`, error);
      return null;
    }
  },

  /**
   * Fetch all time-windowed P&L values (7d, 30d, all) using user-pnl API
   *
   * Uses Polymarket's internal user-pnl-api.polymarket.com endpoint to get
   * accurate P&L history data that matches the Polymarket UI.
   *
   * The API returns cumulative P&L at each timestamp, so:
   * - 7d P&L = current_pnl - pnl_from_7_days_ago
   * - 30d P&L = current_pnl - pnl_from_30_days_ago
   * - all P&L = current_pnl (latest value)
   */
  async getAllTimeWindowedPnl(
    walletAddress: string
  ): Promise<{ pnl7d: number; pnl30d: number; pnlAll: number }> {
    try {
      // Fetch P&L history for max interval to get all data points
      const history = await this.getUserPnlHistory(walletAddress, "max", "1d");

      if (history.length === 0) {
        return { pnl7d: 0, pnl30d: 0, pnlAll: 0 };
      }

      // Get current P&L (latest data point)
      const currentPnl = history[history.length - 1].p;

      // Calculate timestamps for 7d and 30d ago
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysAgo = now - 7 * 24 * 60 * 60;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

      // Find P&L at 7 days ago (closest point before that timestamp)
      let pnl7dAgo = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].t <= sevenDaysAgo) {
          pnl7dAgo = history[i].p;
          break;
        }
      }

      // Find P&L at 30 days ago (closest point before that timestamp)
      let pnl30dAgo = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].t <= thirtyDaysAgo) {
          pnl30dAgo = history[i].p;
          break;
        }
      }

      return {
        pnl7d: currentPnl - pnl7dAgo,
        pnl30d: currentPnl - pnl30dAgo,
        pnlAll: currentPnl,
      };
    } catch (error) {
      console.error("Error fetching time-windowed P&L:", error);
      return { pnl7d: 0, pnl30d: 0, pnlAll: 0 };
    }
  },

  /**
   * Fetch user profile from Polymarket Gamma API
   */
  async getProfile(walletAddress: string): Promise<PolymarketUserProfile | null> {
    try {
      const address = walletAddress.toLowerCase();
      const url = `${POLYMARKET_GAMMA_API}/public-profile?address=${address}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        console.error(`Profile API error: ${response.status}`);
        return null;
      }

      const profile = await response.json();
      return profile || null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  },

  /**
   * Calculate P&L for a specific time period from trades
   */
  calculatePnlForPeriod(trades: PolymarketTrade[], sinceTimestamp: number): number {
    const periodTrades = trades.filter(t => t.timestamp * 1000 >= sinceTimestamp);

    let pnl = 0;
    for (const trade of periodTrades) {
      if (trade.side === "SELL") {
        pnl += trade.usdcSize || 0;
      } else if (trade.side === "BUY") {
        pnl -= trade.usdcSize || 0;
      }
    }
    return pnl;
  },

  /**
   * Calculate win rate from trades
   */
  calculateWinRate(trades: PolymarketTrade[]): { wins: number; total: number } {
    const marketTrades = new Map<string, PolymarketTrade[]>();
    for (const trade of trades) {
      const key = `${trade.conditionId}-${trade.outcome}`;
      const existing = marketTrades.get(key) || [];
      existing.push(trade);
      marketTrades.set(key, existing);
    }

    let wins = 0;
    let total = 0;

    for (const [, positionTrades] of marketTrades) {
      const buys = positionTrades.filter(t => t.side === "BUY");
      const sells = positionTrades.filter(t => t.side === "SELL");

      if (buys.length > 0 && sells.length > 0) {
        const buyValue = buys.reduce((sum, t) => sum + (t.usdcSize || 0), 0);
        const sellValue = sells.reduce((sum, t) => sum + (t.usdcSize || 0), 0);

        if (sellValue > buyValue) {
          wins++;
        }
        total++;
      }
    }

    return { wins, total };
  },

  /**
   * Calculate win rate from positions (not trades)
   * A position is "winning" if it has positive cashPnl
   */
  calculateWinRateFromPositions(positions: PolymarketPosition[]): number {
    if (positions.length === 0) return 0;

    const winningPositions = positions.filter(p => p.cashPnl > 0);
    return Math.round((winningPositions.length / positions.length) * 100);
  },

  /**
   * Calculate P&L from activity (trades and redemptions)
   *
   * P&L = (Total Sold + Total Redeemed) - Total Bought
   * This matches how Polymarket calculates P&L on their profile page
   */
  calculatePnlFromActivity(activity: PolymarketActivityType[]): number {
    let totalBought = 0;
    let totalSold = 0;
    let totalRedeemed = 0;

    for (const a of activity) {
      if (a.type === "TRADE") {
        if (a.side === "BUY") {
          totalBought += a.usdcSize || 0;
        } else if (a.side === "SELL") {
          totalSold += a.usdcSize || 0;
        }
      } else if (a.type === "REDEEM") {
        totalRedeemed += a.usdcSize || 0;
      }
    }

    return totalSold + totalRedeemed - totalBought;
  },

  /**
   * Calculate trading metrics from positions, activity, and trades
   *
   * P&L values are calculated using The Graph's time-travel feature:
   * - 7d/30d: Change in realized P&L over the period (delta calculation)
   * - all: Total P&L = Realized P&L + Unrealized P&L
   *
   * This matches how Polymarket's GUI calculates time-windowed P&L.
   * Falls back to activity-based calculation if Graph data is unavailable.
   */
  calculateTradingMetrics(
    positions: PolymarketPosition[],
    activity: PolymarketActivityType[],
    trades: PolymarketTrade[],
    value?: PolymarketValue | null,
    leaderboardPnl?: { pnl7d: number; pnl30d: number; pnlAll: number }
  ): TradingMetrics {
    const now = Date.now();

    // Use Graph-based P&L if available (accurate time-windowed deltas)
    // Otherwise fall back to activity-based calculation (less accurate for time windows)
    let pnl: number;
    let pnl7d: number;
    let pnl30d: number;

    if (leaderboardPnl) {
      pnl = leaderboardPnl.pnlAll;
      pnl7d = leaderboardPnl.pnl7d;
      pnl30d = leaderboardPnl.pnl30d;
    } else {
      // Fallback: Calculate from activity (less accurate for time windows)
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      pnl = this.calculatePnlFromActivity(activity);
      const activity7d = activity.filter(a => a.timestamp * 1000 >= sevenDaysAgo);
      const activity30d = activity.filter(a => a.timestamp * 1000 >= thirtyDaysAgo);
      pnl7d = this.calculatePnlFromActivity(activity7d);
      pnl30d = this.calculatePnlFromActivity(activity30d);
    }

    // Calculate win rate from positions (positions with positive cashPnl)
    const winRate = this.calculateWinRateFromPositions(positions);

    // Get portfolio value from /value API response
    // API returns {user, value} - use the value field
    const portfolioValue = value?.value ||
      positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);

    // Count total positions (all positions, including resolved ones)
    // This matches Polymarket's Positions tab which shows all positions
    const activePositions = positions.length;

    // Total trades count
    const totalTrades = trades.length;

    // Find most recent activity timestamp
    const lastActivityTimestamp = activity.length > 0
      ? Math.max(...activity.map(a => a.timestamp * 1000))
      : null;

    const lastActivityAt = lastActivityTimestamp
      ? new Date(lastActivityTimestamp).toISOString()
      : null;

    // Check if whale is "live" (active in last 24h)
    const isLive = lastActivityTimestamp
      ? now - lastActivityTimestamp < LIVE_THRESHOLD_MS
      : false;

    return {
      pnl: Math.round(pnl * 100) / 100,
      pnl7d: Math.round(pnl7d * 100) / 100,
      pnl30d: Math.round(pnl30d * 100) / 100,
      winRate,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      activePositions,
      totalTrades,
      lastActivityAt,
      isLive,
    };
  },

  /**
   * Helper to wrap a promise with a timeout
   * Returns default value if timeout expires
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    defaultValue: T
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(defaultValue), timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch {
      clearTimeout(timeoutId!);
      return defaultValue;
    }
  },

  /**
   * Fetch accurate position count by paginating through all positions
   * Returns the total count of positions (not capped at 100)
   */
  async getPositionCount(walletAddress: string): Promise<number> {
    try {
      const address = walletAddress.toLowerCase();
      let count = 0;
      let offset = 0;
      const pageSize = 100;

      while (true) {
        const url = `${POLYMARKET_DATA_API}/positions?user=${address}&limit=${pageSize}&offset=${offset}`;
        const response = await fetch(url);

        if (!response.ok) {
          break;
        }

        const positions = await response.json();
        if (!Array.isArray(positions) || positions.length === 0) {
          break;
        }

        count += positions.length;
        offset += pageSize;

        // Stop if we got fewer than page size (no more data)
        if (positions.length < pageSize) {
          break;
        }
      }

      return count;
    } catch (error) {
      console.error("Error counting positions:", error);
      return 0;
    }
  },

  /**
   * Fetch trading data for a wallet with ACCURATE counts
   *
   * Strategy: Fetch all data in parallel including the accurate counts.
   * Uses longer timeouts on pagination operations to handle active whales.
   */
  async getWalletTradingData(walletAddress: string): Promise<WalletTradingData> {
    const address = walletAddress.toLowerCase();

    // Timeouts: Fast calls get 3s, pagination calls get 15s (for whales with 1000+ trades)
    const FAST_TIMEOUT = 3000;
    const PAGINATION_TIMEOUT = 15000;

    // Fetch everything in parallel
    const [
      positions,
      activity,
      value,
      profile,
      timeWindowedPnl,
      predictionsCount,
    ] = await Promise.all([
      // ALL positions for display (paginated fetch - no limit)
      this.withTimeout(this.getAllPositions(address), PAGINATION_TIMEOUT, []),
      // Single page of activity for display (fast)
      this.withTimeout(this.getActivity(address, 100), FAST_TIMEOUT, []),
      // Portfolio value (fast - single API call)
      this.withTimeout(this.getValue(address), FAST_TIMEOUT, null),
      // Profile (fast - single API call)
      this.withTimeout(this.getProfile(address), FAST_TIMEOUT, null),
      // P&L history from user-pnl API (fast - pre-aggregated)
      this.withTimeout(this.getAllTimeWindowedPnl(address), FAST_TIMEOUT, { pnl7d: 0, pnl30d: 0, pnlAll: 0 }),
      // ACCURATE predictions count (paginates all trades, counts unique markets) - needs time for active whales
      this.withTimeout(this.getTotalPredictionsCount(address), PAGINATION_TIMEOUT, 0),
    ]);

    // Calculate metrics from the fetched data
    // Pass empty trades array - we'll override the counts anyway
    const metrics = this.calculateTradingMetrics(
      positions,
      activity,
      [],
      value,
      timeWindowedPnl
    );

    // Use actual positions count from fetched data (already accurate from getAllPositions)
    metrics.activePositions = positions.length;
    metrics.totalTrades = predictionsCount;

    // Enrich positions with market metadata (sportsMarketType, seriesSlug) for sport emoji detection
    const enrichedPositions = await this.enrichPositionsWithMetadata(positions);

    return {
      address,
      metrics,
      positions: enrichedPositions,
      activity: activity.slice(0, 50),
      profile,
      fetchedAt: new Date().toISOString(),
    };
  },
};
