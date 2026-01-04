/**
 * useStats Hook
 *
 * React hook for fetching and managing dashboard statistics.
 * Handles loading, error, and data states with automatic initial fetch.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchStats, type StatsResponse } from '../services/api';

interface UseStatsResult {
  data: StatsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStats(): UseStatsResult {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = await fetchStats();
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
