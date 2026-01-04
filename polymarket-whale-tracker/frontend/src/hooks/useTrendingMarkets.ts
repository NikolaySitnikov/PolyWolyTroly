/**
 * useTrendingMarkets Hook
 *
 * React hook for fetching and managing trending Polymarket prediction markets.
 * Handles loading, error, and data states with automatic initial fetch.
 * Auto-refreshes every 5 minutes to keep data current.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTrendingMarkets, type TrendingMarketResponse } from '../services/api';

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

  const fetchData = useCallback(async () => {
    // Only show loading on initial load, not on background refresh
    if (isInitialLoad.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetchTrendingMarkets(limit);

      if (isMounted.current) {
        setMarkets(response.markets);
        setUpdatedAt(response.updatedAt);
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
  }, [limit]);

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
