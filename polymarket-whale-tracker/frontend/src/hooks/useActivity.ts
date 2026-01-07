/**
 * useActivity Hook
 *
 * Fetches and manages activity history for a wallet address.
 * Supports pagination, filtering by type, and "load more" pattern.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTradingData } from '../services/api';
import {
  toActivity,
  filterActivities,
  sortActivitiesByTime,
  type Activity,
  type ActivityFilterOption,
} from '../types/activity';

interface UseActivityOptions {
  /** Number of items per page */
  pageSize?: number;
  /** Initial filter */
  filter?: ActivityFilterOption;
  /** Auto-fetch on mount */
  enabled?: boolean;
}

interface UseActivityResult {
  /** List of activities for current page */
  activities: Activity[];
  /** All activities (unpaginated) */
  allActivities: Activity[];
  /** Loading state */
  loading: boolean;
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
  /** Whether there are more pages */
  hasMore: boolean;
  /** Load next page (appends to current) */
  loadMore: () => void;
  /** Items loaded so far (for load more pattern) */
  loadedCount: number;
}

const DEFAULT_PAGE_SIZE = 20;

export function useActivity(
  address: string | undefined,
  options: UseActivityOptions = {}
): UseActivityResult {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    filter: initialFilter = 'all',
    enabled = true,
  } = options;

  const [allRawActivities, setAllRawActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ActivityFilterOption>(initialFilter);
  const [loadedPages, setLoadedPages] = useState(1);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedAddressRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!address || !enabled) {
      setAllRawActivities([]);
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
      setLoadedPages(1);
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
    setLoadedPages(1);
  }, [filter]);

  // Filter and sort activities
  const filteredActivities = filterActivities(allRawActivities, filter);
  const allActivities = sortActivitiesByTime(filteredActivities, 'desc');

  // Calculate pagination
  const total = allActivities.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const activities = allActivities.slice(startIndex, endIndex);
  const hasMore = page < totalPages;

  // For "load more" pattern - show all items up to loadedPages
  const loadedCount = Math.min(loadedPages * pageSize, total);

  const loadMore = useCallback(() => {
    if (loadedPages < totalPages) {
      setLoadedPages((prev) => prev + 1);
      setPage((prev) => prev + 1);
    }
  }, [loadedPages, totalPages]);

  return {
    activities,
    allActivities,
    loading,
    error,
    total,
    page,
    setPage,
    totalPages,
    filter,
    setFilter,
    refetch: fetchData,
    hasMore,
    loadMore,
    loadedCount,
  };
}
