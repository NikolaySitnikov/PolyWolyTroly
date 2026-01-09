/**
 * useActivity Hook
 *
 * Fetches and manages activity history for a wallet address.
 * Supports pagination, filtering by type, and "load more" pattern.
 *
 * LIVE UPDATES: Connects to Polymarket RTDS WebSocket for real-time trade
 * activity. New trades are automatically prepended to the list.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchTradingData, fetchActivity as fetchActivityApi } from '../services/api';
import {
  toActivity,
  filterActivities,
  sortActivitiesByTime,
  type Activity,
  type ActivityFilterOption,
} from '../types/activity';
import { usePolymarketRTDS } from './usePolymarketRTDS';

interface UseActivityOptions {
  /** Number of items per page */
  pageSize?: number;
  /** Initial filter */
  filter?: ActivityFilterOption;
  /** Auto-fetch on mount */
  enabled?: boolean;
  /** Enable live WebSocket updates (default: true) */
  enableLiveUpdates?: boolean;
}

interface UseActivityResult {
  /** List of activities for current page */
  activities: Activity[];
  /** All activities (unpaginated) */
  allActivities: Activity[];
  /** Loading state */
  loading: boolean;
  /** Loading state for "load more" operation */
  loadingMore: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Total number of activities matching filter */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Set current page */
  setPage: (page: number) => void;
  /** Total number of pages */
  totalPages: number;
  /** Current filter */
  filter: ActivityFilterOption;
  /** Set filter */
  setFilter: (filter: ActivityFilterOption) => void;
  /** Refetch activities */
  refetch: () => void;
  /** Whether there are more activities to load from API */
  hasMore: boolean;
  /** Load more activities from API */
  loadMore: () => void;
  /** Items loaded so far (for load more pattern) */
  loadedCount: number;
  /** Whether live WebSocket is connected */
  liveConnected: boolean;
  /** Number of new trades received via WebSocket since last fetch */
  newTradesCount: number;
}

const DEFAULT_PAGE_SIZE = 50;
const LOAD_MORE_PAGE_SIZE = 50;

export function useActivity(
  address: string | undefined,
  options: UseActivityOptions = {}
): UseActivityResult {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    filter: initialFilter = 'all',
    enabled = true,
    enableLiveUpdates = true,
  } = options;

  const [allRawActivities, setAllRawActivities] = useState<Activity[]>([]);
  const [liveActivities, setLiveActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ActivityFilterOption>(initialFilter);
  const [hasMoreFromApi, setHasMoreFromApi] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedAddressRef = useRef<string | null>(null);
  const lastFetchTimestampRef = useRef<number>(0);

  // Connect to Polymarket RTDS WebSocket for live trades
  const { connected: liveConnected, recentTrades } = usePolymarketRTDS({
    walletAddress: address,
    enabled: enabled && enableLiveUpdates,
  });

  // Convert live trades to Activity format and merge with fetched data
  useEffect(() => {
    if (recentTrades.length === 0) return;

    // Only process trades newer than our last fetch
    const newTrades = recentTrades.filter((trade) => {
      const tradeTs = trade.timestamp;
      return tradeTs > lastFetchTimestampRef.current;
    });

    if (newTrades.length === 0) return;

    // Convert to Activity format
    const newActivities = newTrades.map(toActivity);

    setLiveActivities((prev) => {
      // Dedupe by transactionHash
      const existingHashes = new Set(prev.map((a) => a.transactionHash));
      const unique = newActivities.filter((a) => a.transactionHash && !existingHashes.has(a.transactionHash));
      if (unique.length === 0) return prev;
      return sortActivitiesByTime([...unique, ...prev], 'desc');
    });
  }, [recentTrades]);

  const fetchData = useCallback(async () => {
    if (!address || !enabled) {
      setAllRawActivities([]);
      setLiveActivities([]);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchTradingData(address);

      if (controller.signal.aborted) return;

      // Transform activities
      const activities = data.activity.map(toActivity);
      const sorted = sortActivitiesByTime(activities, 'desc');

      setAllRawActivities(sorted);
      // Clear live activities since we just fetched fresh data
      setLiveActivities([]);
      // Track timestamp for live updates filtering
      lastFetchTimestampRef.current = sorted.length > 0 ? sorted[0].timestamp : Date.now();
      fetchedAddressRef.current = address;
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
      setLoading(false);
    }
  }, [address, enabled]);

  // Fetch on mount and when address changes
  useEffect(() => {
    if (address !== fetchedAddressRef.current) {
      setPage(1);
      setHasMoreFromApi(true);
      setLiveActivities([]);
      setAllRawActivities([]);
    }
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, address]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  // Load more activities from API
  const loadMore = useCallback(async () => {
    if (!address || loadingMore || !hasMoreFromApi) return;

    setLoadingMore(true);
    try {
      const newOffset = allRawActivities.length;
      const response = await fetchActivityApi(address, LOAD_MORE_PAGE_SIZE, newOffset);

      if (response.activity.length > 0) {
        const newActivities = response.activity.map(toActivity);
        setAllRawActivities((prev) => {
          // Dedupe by transactionHash
          const existingHashes = new Set(prev.map((a) => a.transactionHash));
          const unique = newActivities.filter((a) => !a.transactionHash || !existingHashes.has(a.transactionHash));
          return [...prev, ...unique];
        });
      }

      setHasMoreFromApi(response.pagination.hasMore);
    } catch (err) {
      console.error('Failed to load more activities:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [address, loadingMore, hasMoreFromApi, allRawActivities.length]);

  // Combine live and fetched activities, dedupe and sort
  const combinedActivities = useMemo(() => {
    // Merge live and fetched, dedupe by transactionHash
    const seenHashes = new Set<string>();
    const combined: Activity[] = [];

    // Live activities first (they're newer)
    for (const activity of liveActivities) {
      if (activity.transactionHash) {
        if (seenHashes.has(activity.transactionHash)) continue;
        seenHashes.add(activity.transactionHash);
      }
      combined.push(activity);
    }

    // Then fetched activities
    for (const activity of allRawActivities) {
      if (activity.transactionHash) {
        if (seenHashes.has(activity.transactionHash)) continue;
        seenHashes.add(activity.transactionHash);
      }
      combined.push(activity);
    }

    return sortActivitiesByTime(combined, 'desc');
  }, [liveActivities, allRawActivities]);

  // Filter and sort activities
  const filteredActivities = filterActivities(combinedActivities, filter);
  const allActivities = sortActivitiesByTime(filteredActivities, 'desc');

  // Calculate pagination for display
  const total = allActivities.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const activities = allActivities.slice(startIndex, endIndex);

  return {
    activities,
    allActivities,
    loading,
    loadingMore,
    error,
    total,
    page,
    setPage,
    totalPages,
    filter,
    setFilter,
    refetch: fetchData,
    hasMore: hasMoreFromApi,
    loadMore,
    loadedCount: allActivities.length,
    liveConnected,
    newTradesCount: liveActivities.length,
  };
}
