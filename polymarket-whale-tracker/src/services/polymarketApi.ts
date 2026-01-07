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

// 24 hours in milliseconds for "live" status check
const LIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Default limits for data fetching
const DEFAULT_POSITIONS_LIMIT = 50;
const DEFAULT_ACTIVITY_LIMIT = 100;
const DEFAULT_TRADES_LIMIT = 500;

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
   * Fetch portfolio value for a wallet from Polymarket Data API
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

      const value = await response.json();
      return value || null;
    } catch (error) {
      console.error("Error fetching portfolio value:", error);
      return null;
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
   * Calculate trading metrics from positions, activity, and trades
   */
  calculateTradingMetrics(
    positions: PolymarketPosition[],
    activity: PolymarketActivityType[],
    trades: PolymarketTrade[],
    value?: PolymarketValue | null
  ): TradingMetrics {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Calculate total P&L from positions (unrealized) + value (realized)
    const unrealizedPnl = positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
    const realizedPnl = value?.realizedPnl || 0;
    const totalPnl = unrealizedPnl + realizedPnl;

    // Calculate time-windowed P&L from trades
    const pnl7d = this.calculatePnlForPeriod(trades, sevenDaysAgo);
    const pnl30d = this.calculatePnlForPeriod(trades, thirtyDaysAgo);

    // Calculate win rate from trades
    const { wins, total } = this.calculateWinRate(trades);
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    // Get portfolio value
    const portfolioValue = value?.portfolioValue ||
      positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);

    // Count active positions
    const activePositions = positions.filter(p => p.isActive !== false).length;

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
      pnl: Math.round(totalPnl * 100) / 100,
      pnl7d: Math.round(pnl7d * 100) / 100,
      pnl30d: Math.round(pnl30d * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      activePositions,
      totalTrades,
      lastActivityAt,
      isLive,
    };
  },

  /**
   * Fetch all trading data for a wallet and calculate metrics
   */
  async getWalletTradingData(walletAddress: string): Promise<WalletTradingData> {
    const address = walletAddress.toLowerCase();

    // Fetch all data in parallel for efficiency
    const [positions, activity, trades, value, profile] = await Promise.all([
      this.getPositions(address),
      this.getActivity(address),
      this.getTrades(address),
      this.getValue(address),
      this.getProfile(address),
    ]);

    // Calculate aggregated metrics
    const metrics = this.calculateTradingMetrics(positions, activity, trades, value);

    return {
      address,
      metrics,
      positions: positions.slice(0, 20),
      activity: activity.slice(0, 50),
      profile,
      fetchedAt: new Date().toISOString(),
    };
  },
};
