/**
 * useDetectionStats Hook
 *
 * React hook for fetching and managing insider detection statistics.
 * Handles loading, error, and data states with automatic polling for live updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDetectionStats } from '../services/api';
import type { DetectionStatsResponse } from '../types/detection';

// Poll every 10 seconds for near-real-time updates
const POLL_INTERVAL_MS = 10_000;

interface UseDetectionStatsResult {
  stats: DetectionStatsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDetectionStats(): UseDetectionStatsResult {
  const [stats, setStats] = useState<DetectionStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }

    try {
      const data = await fetchDetectionStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling for live updates
    pollIntervalRef.current = setInterval(fetchData, POLL_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchData]);

  return {
    stats,
    loading,
    error,
    refetch: fetchData,
  };
}
