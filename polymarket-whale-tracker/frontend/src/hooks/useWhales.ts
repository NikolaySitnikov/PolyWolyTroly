/**
 * useWhales Hook
 *
 * React hook for fetching and managing whale wallet data.
 * Handles loading, error, and pagination states.
 *
 * Supports seamless live updates via updateWhale() - updates existing whale
 * data without triggering loading states or full re-renders.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWhales, type WalletsResponse } from '../services/api';
import type { Whale } from '../types/whale';

interface UseWhalesResult {
  whales: Whale[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  /** Update a single whale's data seamlessly (no loading state) */
  updateWhale: (address: string, updates: Partial<Whale>) => void;
  /** Add a new whale seamlessly (no loading state) - only affects page 1 */
  addWhale: (whale: Whale) => void;
  /** Number of new whales detected while on other pages */
  pendingNewWhales: number;
}

/**
 * Transform raw API wallet data to Whale object
 */
function transformWallet(wallet: WalletsResponse['wallets'][0]): Whale {
  return {
    address: wallet.address,
    firstSeenAt: wallet.first_seen_at,
    totalDeposited: parseFloat(wallet.total_deposited),
    depositCount: wallet.deposit_count,
  };
}

export function useWhales(limit = 1000): UseWhalesResult {
  const [whales, setWhales] = useState<Whale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pendingNewWhales, setPendingNewWhales] = useState(0);
  const isInitialLoad = useRef(true);
  const pageRef = useRef(page);
  pageRef.current = page;

  const fetchData = useCallback(async () => {
    // Only show loading on initial load, not on refetch
    if (isInitialLoad.current) {
      setLoading(true);
    }
    // Don't clear error until fetch succeeds to prevent flicker on retry

    try {
      const response = await fetchWhales(page, limit);
      setWhales(response.wallets.map(transformWallet));
      setTotal(response.total);
      // Clear pending whales when refreshing data
      setPendingNewWhales(0);
      setError(null); // Clear error only on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Update a single whale's data without triggering loading state.
   * Used for live WebSocket updates.
   *
   * Only updates if the whale is in the current page's data.
   * If not found (whale is on a different page), silently ignores.
   */
  const updateWhale = useCallback((address: string, updates: Partial<Whale>) => {
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
  const addWhale = useCallback((whale: Whale) => {
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
