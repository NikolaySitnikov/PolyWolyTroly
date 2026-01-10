/**
 * useWhalesWithTrading Hook
 *
 * Enriches a list of whales with trading data from Polymarket.
 * Fetches trading data for visible whales in parallel and caches results.
 *
 * Features:
 * - Parallel fetching for visible whales
 * - In-memory cache to avoid redundant API calls
 * - Graceful fallback (returns original whale if fetch fails)
 * - Configurable concurrency limit
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchTradingData, type TradingDataResponse } from '../services/api';
import type { Whale, WhaleWithTrading } from '../types/whale';

interface UseWhalesWithTradingOptions {
  /** Enable trading data fetching (default: true) */
  enabled?: boolean;
  /** Max concurrent requests (default: 5) */
  concurrency?: number;
  /** Cache TTL in ms (default: 60000 = 1 minute) */
  cacheTtl?: number;
}

interface TradingCacheEntry {
  data: TradingDataResponse;
  timestamp: number;
}

// Global cache for trading data (persists across component remounts)
const tradingCache = new Map<string, TradingCacheEntry>();

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(ttl: number): void {
  const now = Date.now();
  for (const [key, entry] of tradingCache) {
    if (now - entry.timestamp > ttl) {
      tradingCache.delete(key);
    }
  }
}

/**
 * Convert trading response to WhaleWithTrading fields
 */
function enrichWhaleWithTrading(
  whale: Whale,
  trading: TradingDataResponse
): WhaleWithTrading {
  return {
    ...whale,
    pnl: trading.metrics.pnl,
    pnl7d: trading.metrics.pnl7d,
    pnl30d: trading.metrics.pnl30d,
    winRate: trading.metrics.winRate,
    portfolioValue: trading.metrics.portfolioValue,
    totalTrades: trading.metrics.totalTrades,
    lastActivityAt: trading.metrics.lastActivityAt,
    isLive: trading.metrics.isLive,
  };
}

export function useWhalesWithTrading(
  whales: Whale[],
  options: UseWhalesWithTradingOptions = {}
): {
  whales: (Whale | WhaleWithTrading)[];
  loading: boolean;
  enrichedCount: number;
} {
  const {
    enabled = true,
    concurrency = 5,
    cacheTtl = 60000,
  } = options;

  const [enrichedWhales, setEnrichedWhales] = useState<Map<string, WhaleWithTrading>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef<Set<string>>(new Set());

  // Clean cache on mount and periodically
  useEffect(() => {
    cleanExpiredCache(cacheTtl);
    const interval = setInterval(() => cleanExpiredCache(cacheTtl), cacheTtl);
    return () => clearInterval(interval);
  }, [cacheTtl]);

  // Fetch trading data for a batch of whales
  const fetchBatch = useCallback(
    async (addresses: string[]): Promise<void> => {
      if (addresses.length === 0) return;

      // Process in chunks based on concurrency
      for (let i = 0; i < addresses.length; i += concurrency) {
        const chunk = addresses.slice(i, i + concurrency);

        // Fetch in parallel
        const results = await Promise.allSettled(
          chunk.map(async (address) => {
            // Mark as fetching
            fetchingRef.current.add(address);

            try {
              const data = await fetchTradingData(address, 3000); // 3s timeout
              // Cache the result
              tradingCache.set(address.toLowerCase(), {
                data,
                timestamp: Date.now(),
              });
              return { address, data };
            } finally {
              fetchingRef.current.delete(address);
            }
          })
        );

        // Update state with successful results
        const successfulResults: Array<{ address: string; data: TradingDataResponse }> = [];
        for (const result of results) {
          if (result.status === 'fulfilled') {
            successfulResults.push(result.value);
          }
        }

        if (successfulResults.length > 0) {
          setEnrichedWhales((prev) => {
            const next = new Map(prev);
            for (const { address, data } of successfulResults) {
              // Find the original whale
              const whale = whales.find(
                (w) => w.address.toLowerCase() === address.toLowerCase()
              );
              if (whale) {
                next.set(address.toLowerCase(), enrichWhaleWithTrading(whale, data));
              }
            }
            return next;
          });
        }
      }
    },
    [concurrency, whales]
  );

  // Fetch trading data for visible whales
  useEffect(() => {
    if (!enabled || whales.length === 0) {
      setLoading(false);
      return;
    }

    // Abort previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Find whales that need trading data
    const needsFetch: string[] = [];
    const now = Date.now();

    for (const whale of whales) {
      const address = whale.address.toLowerCase();

      // Skip if already fetching
      if (fetchingRef.current.has(address)) continue;

      // Check cache
      const cached = tradingCache.get(address);
      if (cached && now - cached.timestamp < cacheTtl) {
        // Use cached data
        setEnrichedWhales((prev) => {
          if (prev.has(address)) return prev;
          const next = new Map(prev);
          next.set(address, enrichWhaleWithTrading(whale, cached.data));
          return next;
        });
        continue;
      }

      needsFetch.push(address);
    }

    if (needsFetch.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchBatch(needsFetch).finally(() => {
      setLoading(false);
    });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [whales, enabled, cacheTtl, fetchBatch]);

  // Merge enriched data with original whales
  const result = useMemo(() => {
    return whales.map((whale) => {
      const enriched = enrichedWhales.get(whale.address.toLowerCase());
      return enriched ?? whale;
    });
  }, [whales, enrichedWhales]);

  return {
    whales: result,
    loading,
    enrichedCount: enrichedWhales.size,
  };
}
