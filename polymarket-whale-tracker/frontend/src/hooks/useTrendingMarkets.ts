/**
 * useTrendingMarkets Hook
 *
 * React hook for fetching and managing trending Polymarket prediction markets.
 * Handles loading, error, and data states with automatic initial fetch.
 * Auto-refreshes every 5 minutes to keep data current.
 *
 * Also fetches price history for each market in the background to display
 * sparkline charts showing 1-week price trends.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTrendingMarkets, fetchPriceHistory, type TrendingMarketResponse } from '../services/api';

/** Refresh interval: 5 minutes */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface UseTrendingMarketsResult {
  /** Array of trending markets */
  markets: TrendingMarketResponse[];
  /** Whether data is currently being loaded */
  loading: boolean;
  /** Error message if fetch failed, null otherwise */
  error: string | null;
  /** Timestamp of last successful update */
  updatedAt: string | null;
  /** Manually trigger a refetch */
  refetch: () => void;
}

/**
 * Hook for fetching trending prediction markets from Polymarket.
 *
 * @param limit - Maximum number of markets to fetch (default 8)
 * @returns Object with markets data, loading state, error state, and refetch function
 *
 * @example
 * ```tsx
 * function TrendingMarkets() {
 *   const { markets, loading, error, refetch } = useTrendingMarkets(8);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <ul>
 *       {markets.map(market => (
 *         <li key={market.id}>{market.question}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useTrendingMarkets(limit = 8): UseTrendingMarketsResult {
  const [markets, setMarkets] = useState<TrendingMarketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const isMounted = useRef(true);
  // Track if this is the initial load (show loading state only on first fetch)
  const isInitialLoad = useRef(true);

  /**
   * Fetch price history for all markets in parallel (background, non-blocking).
   * Updates each market with priceHistory data as it arrives.
   */
  const fetchAllPriceHistories = useCallback(async (marketsList: TrendingMarketResponse[]) => {
    // Set all markets to loading state for sparklines
    setMarkets(prevMarkets =>
      prevMarkets.map(m => ({ ...m, priceHistoryLoading: true }))
    );

    // Fetch price history for each market in parallel
    const historyPromises = marketsList.map(async (market) => {
      if (!market.clobTokenId) {
        return { id: market.id, history: [] };
      }
      const history = await fetchPriceHistory(market.clobTokenId);
      return { id: market.id, history };
    });

    // Process results as they complete
    const results = await Promise.all(historyPromises);

    if (isMounted.current) {
      setMarkets(prevMarkets =>
        prevMarkets.map(market => {
          const result = results.find(r => r.id === market.id);
          return {
            ...market,
            priceHistory: result?.history || [],
            priceHistoryLoading: false,
          };
        })
      );
    }
  }, []);

  const fetchData = useCallback(async () => {
    // Only show loading on initial load, not on background refresh
    if (isInitialLoad.current) {
      setLoading(true);
    }
    // Don't clear error until fetch succeeds to prevent flicker on retry

    try {
      const response = await fetchTrendingMarkets(limit);

      if (isMounted.current) {
        setMarkets(response.markets);
        setUpdatedAt(response.updatedAt);
        setError(null); // Clear error only on success

        // Fetch price histories in the background (non-blocking)
        fetchAllPriceHistories(response.markets);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trending markets');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }
  }, [limit, fetchAllPriceHistories]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    // Set up silent background refresh - no loading state shown
    const intervalId = setInterval(fetchData, REFRESH_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, [fetchData]);

  return {
    markets,
    loading,
    error,
    updatedAt,
    refetch: fetchData,
  };
}
