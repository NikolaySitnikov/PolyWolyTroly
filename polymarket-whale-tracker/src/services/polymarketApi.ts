const POLYMARKET_DATA_API = "https://data-api.polymarket.com";

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
};
