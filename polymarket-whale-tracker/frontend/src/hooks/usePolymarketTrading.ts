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
import { useWebSocket, type TradingUpdateEvent } from './useWebSocket';
import { getWebSocketUrl } from '../services/api';

interface UsePolymarketTradingOptions {
  /** Auto-fetch on mount */
  enabled?: boolean;
  /** Refetch interval in ms (0 = disabled). Default: 5000ms for live updates */
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

// Default polling interval: 5 seconds for live updates
const DEFAULT_REFETCH_INTERVAL = 5000;

export function usePolymarketTrading(
  address: string | undefined,
  options: UsePolymarketTradingOptions = {}
): UsePolymarketTradingResult {
  const { enabled = true, refetchInterval = DEFAULT_REFETCH_INTERVAL } = options;

  const [data, setData] = useState<TradingDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedAddressRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (forAddress: string, clearFirst: boolean = false) => {
    if (!forAddress || !enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Clear stale data immediately if address changed (prevents showing wrong whale's data)
    if (clearFirst) {
      setData(null);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchTradingData(forAddress);

      // Don't update if this request was aborted or address changed during fetch
      if (controller.signal.aborted) return;

      setData(response);
      lastFetchedAddressRef.current = forAddress;
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      setError(err instanceof Error ? err.message : 'Failed to fetch trading data');
      setLoading(false);
    }
  }, [enabled]);

  // Fetch on mount and when address changes
  useEffect(() => {
    if (!address) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Detect if address changed - clear stale data to show skeleton
    const addressChanged = lastFetchedAddressRef.current !== null &&
                           lastFetchedAddressRef.current !== address;

    fetchData(address, addressChanged);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [address, fetchData]);

  // Set up refetch interval for background polling (no data clear needed)
  useEffect(() => {
    if (refetchInterval > 0 && enabled && address) {
      intervalRef.current = setInterval(() => {
        fetchData(address, false);
      }, refetchInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, address, fetchData]);

  // Handle WebSocket trading updates for instant metrics refresh
  const handleTradingUpdate = useCallback(
    (update: TradingUpdateEvent) => {
      // Only process updates for the current wallet address
      if (!address || update.walletAddress.toLowerCase() !== address.toLowerCase()) {
        return;
      }

      // Update metrics instantly from WebSocket
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          metrics: update.metrics,
          fetchedAt: new Date().toISOString(),
        };
      });
    },
    [address]
  );

  // Subscribe to WebSocket for instant trading updates
  useWebSocket(getWebSocketUrl(), {
    onTradingUpdate: handleTradingUpdate,
  });

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

  // Manual refetch function (doesn't clear data)
  const refetch = useCallback(() => {
    if (address) {
      fetchData(address, false);
    }
  }, [address, fetchData]);

  return {
    metrics: data?.metrics ?? null,
    positions,
    activity,
    profile: data?.profile ?? null,
    loading,
    error,
    refetch,
    fetchedAt: data?.fetchedAt ?? null,
    isLive: data?.metrics?.isLive ?? false,
    getPnl,
    activePositionsCount,
    totalPositionsCount: positions.length,
  };
}
