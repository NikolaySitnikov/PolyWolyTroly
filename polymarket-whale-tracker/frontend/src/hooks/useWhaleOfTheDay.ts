/**
 * useWhaleOfTheDay Hook
 *
 * Fetches today's top whale directly from the backend API.
 * The backend queries the database for the wallet with highest
 * total deposits in the last 24 hours.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWhaleOfTheDay } from '../services/api';

export interface TodaysTopWhale {
  address: string;
  totalToday: number;
  depositCount: number;
  largestDeposit: number;
}

interface UseWhaleOfTheDayResult {
  topWhale: TodaysTopWhale | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Hook that fetches today's top whale from the backend.
 * The backend calculates the top depositor in the last 24 hours
 * directly from the database.
 */
export function useWhaleOfTheDay(): UseWhaleOfTheDayResult {
  const [topWhale, setTopWhale] = useState<TodaysTopWhale | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTopWhale = useCallback(async () => {
    try {
      setLoading(true);
      const whale = await fetchWhaleOfTheDay();

      if (!whale) {
        setTopWhale(null);
        return;
      }

      setTopWhale({
        address: whale.address,
        totalToday: whale.totalToday,
        depositCount: whale.depositCount,
        largestDeposit: whale.largestDeposit,
      });
    } catch (error) {
      console.error('Error fetching whale of the day:', error);
      setTopWhale(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopWhale();
  }, [fetchTopWhale]);

  return {
    topWhale,
    loading,
    refetch: fetchTopWhale,
  };
}
