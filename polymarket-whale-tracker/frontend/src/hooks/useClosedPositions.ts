/**
 * useClosedPositions Hook
 *
 * Fetches and manages closed/historical positions for a wallet address.
 * Uses server-side pagination for efficient loading of large position histories.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchClosedPositions, type ClosedPositionSortField } from '../services/api';
import type { PolymarketClosedPosition } from '../types/polymarket';

interface UseClosedPositionsOptions {
  /** Number of positions per page (max 50) */
  pageSize?: number;
  /** Initial sort field */
  sortBy?: ClosedPositionSortField;
  /** Initial sort direction */
  sortDir?: 'ASC' | 'DESC';
  /** Auto-fetch on mount */
  enabled?: boolean;
}

interface UseClosedPositionsResult {
  /** List of closed positions for current page */
  positions: PolymarketClosedPosition[];
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Current page (1-indexed for UI, converted to offset internally) */
  page: number;
  /** Set current page */
  setPage: (page: number) => void;
  /** Current sort field */
  sortBy: ClosedPositionSortField;
  /** Set sort field */
  setSortBy: (field: ClosedPositionSortField) => void;
  /** Current sort direction */
  sortDir: 'ASC' | 'DESC';
  /** Set sort direction */
  setSortDir: (dir: 'ASC' | 'DESC') => void;
  /** Refetch positions */
  refetch: () => void;
  /** Whether there are more pages */
  hasMore: boolean;
  /** Load next page (appends to current positions) */
  loadMore: () => void;
  /** All loaded positions (for infinite scroll mode) */
  allLoadedPositions: PolymarketClosedPosition[];
  /** Reset to first page */
  reset: () => void;
}

const DEFAULT_PAGE_SIZE = 25;

export function useClosedPositions(
  address: string | undefined,
  options: UseClosedPositionsOptions = {}
): UseClosedPositionsResult {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    sortBy: initialSortBy = 'realizedpnl',
    sortDir: initialSortDir = 'DESC',
    enabled = true,
  } = options;

  const [positions, setPositions] = useState<PolymarketClosedPosition[]>([]);
  const [allLoadedPositions, setAllLoadedPositions] = useState<PolymarketClosedPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageInternal] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortByInternal] = useState<ClosedPositionSortField>(initialSortBy);
  const [sortDir, setSortDirInternal] = useState<'ASC' | 'DESC'>(initialSortDir);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedAddressRef = useRef<string | null>(null);

  const fetchData = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!address || !enabled) {
      setPositions([]);
      setAllLoadedPositions([]);
      setError(null);
      setHasMore(false);
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
      // Convert 1-indexed page to offset
      const offset = (pageNum - 1) * pageSize;
      const data = await fetchClosedPositions(address, pageSize, offset, sortBy, sortDir);

      if (controller.signal.aborted) return;

      if (append) {
        // Infinite scroll mode: append to existing
        setAllLoadedPositions(prev => [...prev, ...data.positions]);
        setPositions(data.positions);
      } else {
        // Regular pagination mode: replace
        setPositions(data.positions);
        setAllLoadedPositions(data.positions);
      }

      setHasMore(data.pagination.hasMore);
      fetchedAddressRef.current = address;
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      setError(err instanceof Error ? err.message : 'Failed to fetch closed positions');
      setLoading(false);
    }
  }, [address, enabled, pageSize, sortBy, sortDir]);

  // Fetch on mount and when address changes
  useEffect(() => {
    if (address !== fetchedAddressRef.current) {
      setPageInternal(1);
      setAllLoadedPositions([]);
    }
    fetchData(1, false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [address, enabled, sortBy, sortDir]);

  // Fetch when page changes (but not on initial load)
  useEffect(() => {
    if (page > 1) {
      fetchData(page, false);
    }
  }, [page]);

  // Set page with reset
  const setPage = useCallback((newPage: number) => {
    setPageInternal(newPage);
  }, []);

  // Set sort with page reset
  const setSortBy = useCallback((field: ClosedPositionSortField) => {
    setSortByInternal(field);
    setPageInternal(1);
    setAllLoadedPositions([]);
  }, []);

  const setSortDir = useCallback((dir: 'ASC' | 'DESC') => {
    setSortDirInternal(dir);
    setPageInternal(1);
    setAllLoadedPositions([]);
  }, []);

  // Load more for infinite scroll
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPageInternal(nextPage);
      fetchData(nextPage, true);
    }
  }, [loading, hasMore, page, fetchData]);

  // Reset to first page
  const reset = useCallback(() => {
    setPageInternal(1);
    setAllLoadedPositions([]);
    fetchData(1, false);
  }, [fetchData]);

  return {
    positions,
    loading,
    error,
    page,
    setPage,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    refetch: () => fetchData(page, false),
    hasMore,
    loadMore,
    allLoadedPositions,
    reset,
  };
}
