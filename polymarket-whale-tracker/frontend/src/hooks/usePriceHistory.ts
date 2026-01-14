/**
 * usePriceHistory Hook
 *
 * React hook for fetching market price history from the detection system.
 * Used to display price charts and MTM calculations.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchDetectionPriceHistory } from '../services/api';
import type { PriceHistoryResponse, PriceHistoryPoint } from '../types/detection';

interface UsePriceHistoryResult {
  priceHistory: PriceHistoryPoint[];
  loading: boolean;
  error: string | null;
  count: number;
  refetch: () => void;
}

/**
 * Hook to fetch price history for a specific market
 */
export function usePriceHistory(
  conditionId: string | null,
  hours = 24
): UsePriceHistoryResult {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!conditionId) {
      setPriceHistory([]);
      setLoading(false);
      setError(null);
      setCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: PriceHistoryResponse = await fetchDetectionPriceHistory(
        conditionId,
        hours
      );
      setPriceHistory(data.prices);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPriceHistory([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [conditionId, hours]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    priceHistory,
    loading,
    error,
    count,
    refetch: fetchData,
  };
}

/**
 * Calculate price change percentage from price history
 */
export function calculatePriceChange(prices: PriceHistoryPoint[]): number | null {
  if (prices.length < 2) return null;

  const firstPrice = prices[0].price;
  const lastPrice = prices[prices.length - 1].price;

  if (firstPrice === 0) return null;

  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

/**
 * Get the latest price from price history
 */
export function getLatestPrice(prices: PriceHistoryPoint[]): number | null {
  if (prices.length === 0) return null;
  return prices[prices.length - 1].price;
}

/**
 * Get the price at a specific timestamp (or closest before it)
 */
export function getPriceAt(
  prices: PriceHistoryPoint[],
  timestamp: Date
): number | null {
  if (prices.length === 0) return null;

  const targetTime = timestamp.getTime();

  // Find the price at or just before the target time
  let closestPrice: number | null = null;
  let closestTimeDiff = Infinity;

  for (const point of prices) {
    const pointTime = new Date(point.recordedAt).getTime();

    // Only consider prices before or at the target time
    if (pointTime <= targetTime) {
      const timeDiff = targetTime - pointTime;
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestPrice = point.price;
      }
    }
  }

  return closestPrice;
}
