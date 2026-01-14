/**
 * useWhales Hook
 *
 * React hook for fetching and managing whale wallet data.
 * Handles loading, error, pagination, and sorting states.
 *
 * Now returns WhaleWithTrading when trading data is available from the backend.
 * Trading metrics are fetched server-side and included in the API response.
 *
 * Supports seamless live updates via updateWhale() - updates existing whale
 * data without triggering loading states or full re-renders.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWhales, type WalletsResponse, type WhaleSortField, type SortDirection, type WhaleFilterType } from '../services/api';
import type { Whale, WhaleWithTrading } from '../types/whale';

interface UseWhalesResult {
  whales: (Whale | WhaleWithTrading)[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  /** Update a single whale's data seamlessly (no loading state) */
  updateWhale: (address: string, updates: Partial<Whale | WhaleWithTrading>) => void;
  /** Add a new whale seamlessly (no loading state) - only affects page 1 */
  addWhale: (whale: Whale | WhaleWithTrading) => void;
  /** Number of new whales detected while on other pages */
  pendingNewWhales: number;
}

/**
 * Transform raw API wallet data to Whale or WhaleWithTrading object
 * Always includes trading fields when present in API response (even if null)
 * This allows frontend to distinguish between "loading" (null) and "no data"
 */
function transformWallet(wallet: WalletsResponse['wallets'][0]): Whale | WhaleWithTrading {
  const baseWhale: Whale = {
    address: wallet.address,
    firstSeenAt: wallet.first_seen_at,
    totalDeposited: parseFloat(wallet.total_deposited),
    depositCount: wallet.deposit_count,
  };

  // If pnl field exists in API response (even if null), include trading fields
  // This allows frontend to show shimmer for loading state (pnl === null)
  if ('pnl' in wallet) {
    return {
      ...baseWhale,
      pnl: wallet.pnl,
      pnl7d: wallet.pnl7d ?? null,
      pnl30d: wallet.pnl30d ?? null,
      winRate: wallet.winRate ?? null,
      portfolioValue: wallet.portfolioValue ?? null,
      totalTrades: wallet.totalTrades ?? null,
      lastActivityAt: wallet.lastActivityAt ?? null,
      isLive: wallet.isLive ?? null,
    } as WhaleWithTrading;
  }

  return baseWhale;
}

export function useWhales(
  limit = 1000,
  sortBy: WhaleSortField = 'total_deposited',
  sortDir: SortDirection = 'desc',
  filters: WhaleFilterType[] = ['all']
): UseWhalesResult {
  const [whales, setWhales] = useState<(Whale | WhaleWithTrading)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pendingNewWhales, setPendingNewWhales] = useState(0);
  const isInitialLoad = useRef(true);
  const pageRef = useRef(page);
  pageRef.current = page;

  // Reset to page 1 when sort or filters change
  const prevSortBy = useRef(sortBy);
  const prevSortDir = useRef(sortDir);
  const prevFilters = useRef(filters);

  useEffect(() => {
    const filtersChanged = JSON.stringify(prevFilters.current) !== JSON.stringify(filters);
    if (prevSortBy.current !== sortBy || prevSortDir.current !== sortDir || filtersChanged) {
      setPage(1);
      prevSortBy.current = sortBy;
      prevSortDir.current = sortDir;
      prevFilters.current = filters;
    }
  }, [sortBy, sortDir, filters]);

  // Track abort controller to cancel pending requests on sort/page change
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Only show loading on initial load, not on refetch
    if (isInitialLoad.current) {
      setLoading(true);
    }
    // Don't clear error until fetch succeeds to prevent flicker on retry

    try {
      const response = await fetchWhales(page, limit, sortBy, sortDir, filters, controller.signal);
      // Only update if not aborted
      if (!controller.signal.aborted) {
        setWhales(response.wallets.map(transformWallet));
        setTotal(response.total);
        setPendingNewWhales(0);
        setError(null);
        setLoading(false);
        isInitialLoad.current = false;
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [page, limit, sortBy, sortDir, filters]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Auto-refresh when whales have null trading data (showing shimmer)
  // Backend warms cache in background, so we poll until data is ready
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5; // Max 5 retries (15 seconds total)

  useEffect(() => {
    // Check if any whales have null pnl (still loading)
    const hasLoadingWhales = whales.some(
      (whale) => 'pnl' in whale && (whale as WhaleWithTrading).pnl === null
    );

    if (!hasLoadingWhales || loading) {
      retryCountRef.current = 0; // Reset on success or new page
      return;
    }

    if (retryCountRef.current >= MAX_RETRIES) {
      return; // Stop retrying after max attempts
    }

    // Refetch after 3 seconds to check if cache is ready
    const timer = setTimeout(() => {
      retryCountRef.current += 1;
      fetchData();
    }, 3000);

    return () => clearTimeout(timer);
  }, [whales, loading, fetchData]);

  /**
   * Update a single whale's data without triggering loading state.
   * Used for live WebSocket updates.
   *
   * Only updates if the whale is in the current page's data.
   * If not found (whale is on a different page), silently ignores.
   */
  const updateWhale = useCallback((address: string, updates: Partial<Whale | WhaleWithTrading>) => {
    setWhales((prev) => {
      // Check if whale exists on current page
      const exists = prev.some(
        (w) => w.address.toLowerCase() === address.toLowerCase()
      );
      if (!exists) {
        // Whale is on a different page, don't modify current data
        return prev;
      }
      return prev.map((whale) =>
        whale.address.toLowerCase() === address.toLowerCase()
          ? { ...whale, ...updates }
          : whale
      );
    });
  }, []);

  /**
   * Add a new whale to the list without triggering loading state.
   * Used for live WebSocket updates when a new wallet is detected.
   *
   * IMPORTANT: Only adds to the visible list if on page 1 to prevent
   * corrupting paginated data. If on another page, increments pending count.
   */
  const addWhale = useCallback((whale: Whale | WhaleWithTrading) => {
    // Always update total count
    setTotal((prev) => prev + 1);

    // Only add to visible list if on page 1
    if (pageRef.current === 1) {
      setWhales((prev) => {
        // Check if whale already exists
        const exists = prev.some(
          (w) => w.address.toLowerCase() === whale.address.toLowerCase()
        );
        if (exists) {
          // Update existing whale instead
          return prev.map((w) =>
            w.address.toLowerCase() === whale.address.toLowerCase() ? whale : w
          );
        }
        // Add new whale at the beginning (most recent)
        return [whale, ...prev];
      });
    } else {
      // On other pages, track pending new whales for UI indicator
      setPendingNewWhales((prev) => prev + 1);
    }
  }, []);

  return {
    whales,
    loading,
    error,
    total,
    page,
    setPage,
    refetch: fetchData,
    updateWhale,
    addWhale,
    pendingNewWhales,
  };
}
