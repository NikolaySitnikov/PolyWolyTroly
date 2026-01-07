/**
 * usePolymarketTrading Hook
 *
 * Combined hook that fetches all trading data from Polymarket.
 * Returns metrics, positions, activity, and profile in a single request.
 * Uses the backend endpoint for efficiency and caching.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchTradingData, type TradingDataResponse } from '../services/api';
import { toPosition, type Position } from '../types/position';
import { toActivity, type Activity } from '../types/activity';
import type { UserProfile } from '../types/profile';
import type { TradingMetrics, PnlTimeWindow } from '../types/polymarket';

interface UsePolymarketTradingOptions {
  /** Auto-fetch on mount */
  enabled?: boolean;
  /** Refetch interval in ms (0 = disabled) */
  refetchInterval?: number;
}

interface UsePolymarketTradingResult {
  /** Trading metrics (P&L, win rate, etc.) */
  metrics: TradingMetrics | null;
  /** Transformed positions */
  positions: Position[];
  /** Transformed activities */
  activity: Activity[];
  /** User profile from Gamma API */
  profile: UserProfile | null;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch all data */
  refetch: () => void;
  /** Timestamp when data was fetched */
  fetchedAt: string | null;
  /** Whether the whale is currently live */
  isLive: boolean;
  /** Get P&L for specific time window */
  getPnl: (window: PnlTimeWindow) => number;
  /** Active positions count */
  activePositionsCount: number;
  /** Total positions count */
  totalPositionsCount: number;
}

export function usePolymarketTrading(
  address: string | undefined,
  options: UsePolymarketTradingOptions = {}
): UsePolymarketTradingResult {
  const { enabled = true, refetchInterval = 0 } = options;

  const [data, setData] = useState<TradingDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedAddressRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!address || !enabled) {
      setData(null);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Only show loading on initial fetch
    if (!data) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetchTradingData(address);

      if (controller.signal.aborted) return;

      setData(response);
      fetchedAddressRef.current = address;
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      setError(err instanceof Error ? err.message : 'Failed to fetch trading data');
      setLoading(false);
    }
  }, [address, enabled, data]);

  // Fetch on mount and when address changes
  useEffect(() => {
    if (address !== fetchedAddressRef.current) {
      setData(null);
    }
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, address]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval > 0 && enabled && address) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, address, fetchData]);

  // Transform positions
  const positions = useMemo(() => {
    if (!data?.positions) return [];
    return data.positions.map(toPosition);
  }, [data?.positions]);

  // Transform activities
  const activity = useMemo(() => {
    if (!data?.activity) return [];
    return data.activity.map(toActivity);
  }, [data?.activity]);

  // Get P&L for time window
  const getPnl = useCallback(
    (window: PnlTimeWindow): number => {
      if (!data?.metrics) return 0;
      switch (window) {
        case '7d':
          return data.metrics.pnl7d;
        case '30d':
          return data.metrics.pnl30d;
        case 'all':
        default:
          return data.metrics.pnl;
      }
    },
    [data?.metrics]
  );

  // Compute derived values
  const activePositionsCount = useMemo(
    () => positions.filter((p) => p.status === 'active').length,
    [positions]
  );

  return {
    metrics: data?.metrics ?? null,
    positions,
    activity,
    profile: data?.profile ?? null,
    loading,
    error,
    refetch: fetchData,
    fetchedAt: data?.fetchedAt ?? null,
    isLive: data?.metrics?.isLive ?? false,
    getPnl,
    activePositionsCount,
    totalPositionsCount: positions.length,
  };
}
