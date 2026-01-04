/**
 * useStats Hook
 *
 * React hook for fetching and managing dashboard statistics.
 * Handles loading, error, and data states with automatic initial fetch.
 * Supports live updates via WebSocket.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchStats, type StatsResponse } from '../services/api';

interface UseStatsResult {
  data: StatsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateStats: (stats: StatsResponse) => void;
}

export function useStats(): UseStatsResult {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only show loading on initial load, not on refetch
  const isInitialLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const stats = await fetchStats();
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  // Allow external updates (from WebSocket)
  const updateStats = useCallback((stats: StatsResponse) => {
    console.log('[useStats] Updating stats:', stats);
    setData(stats);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    updateStats,
  };
}
