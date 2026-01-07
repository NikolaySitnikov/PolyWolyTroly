/**
 * usePositions Hook
 *
 * Fetches and manages position data for a wallet address.
 * Supports pagination, sorting, and filtering by status.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTradingData } from '../services/api';
import { toPosition, sortPositions, type Position, type PositionSortField } from '../types/position';

interface UsePositionsOptions {
  /** Number of positions per page */
  pageSize?: number;
  /** Initial sort field */
  sortBy?: PositionSortField;
  /** Initial sort direction */
  sortDir?: 'asc' | 'desc';
  /** Filter by active status */
  activeOnly?: boolean;
  /** Auto-fetch on mount */
  enabled?: boolean;
}

interface UsePositionsResult {
  /** List of positions for current page */
  positions: Position[];
  /** All positions (unpaginated) */
  allPositions: Position[];
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Total number of positions */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Set current page */
  setPage: (page: number) => void;
  /** Total number of pages */
  totalPages: number;
  /** Current sort field */
  sortBy: PositionSortField;
  /** Set sort field */
  setSortBy: (field: PositionSortField) => void;
  /** Current sort direction */
  sortDir: 'asc' | 'desc';
  /** Set sort direction */
  setSortDir: (dir: 'asc' | 'desc') => void;
  /** Refetch positions */
  refetch: () => void;
  /** Whether there are more pages */
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 10;

export function usePositions(
  address: string | undefined,
  options: UsePositionsOptions = {}
): UsePositionsResult {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    sortBy: initialSortBy = 'pnl',
    sortDir: initialSortDir = 'desc',
    activeOnly = false,
    enabled = true,
  } = options;

  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<PositionSortField>(initialSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedAddressRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!address || !enabled) {
      setAllPositions([]);
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

      // Transform and filter positions
      let positions = data.positions.map(toPosition);

      if (activeOnly) {
        positions = positions.filter((p) => p.status === 'active');
      }

      setAllPositions(positions);
      fetchedAddressRef.current = address;
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
      setLoading(false);
    }
  }, [address, enabled, activeOnly]);

  // Fetch on mount and when address changes
  useEffect(() => {
    if (address !== fetchedAddressRef.current) {
      setPage(1);
    }
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, address]);

  // Reset page when sort changes
  useEffect(() => {
    setPage(1);
  }, [sortBy, sortDir]);

  // Sort positions
  const sortedPositions = sortPositions(allPositions, sortBy, sortDir);

  // Calculate pagination
  const total = sortedPositions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const positions = sortedPositions.slice(startIndex, endIndex);
  const hasMore = page < totalPages;

  return {
    positions,
    allPositions: sortedPositions,
    loading,
    error,
    total,
    page,
    setPage,
    totalPages,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    refetch: fetchData,
    hasMore,
  };
}
