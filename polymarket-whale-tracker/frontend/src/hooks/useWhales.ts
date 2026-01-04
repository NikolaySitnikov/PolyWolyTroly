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
  /** Add a new whale seamlessly (no loading state) */
  addWhale: (whale: Whale) => void;
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
  const isInitialLoad = useRef(true);

  const fetchData = useCallback(async () => {
    // Only show loading on initial load, not on refetch
    if (isInitialLoad.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetchWhales(page, limit);
      setWhales(response.wallets.map(transformWallet));
      setTotal(response.total);
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
   */
  const updateWhale = useCallback((address: string, updates: Partial<Whale>) => {
    setWhales((prev) =>
      prev.map((whale) =>
        whale.address.toLowerCase() === address.toLowerCase()
          ? { ...whale, ...updates }
          : whale
      )
    );
  }, []);

  /**
   * Add a new whale to the list without triggering loading state.
   * Used for live WebSocket updates when a new wallet is detected.
   */
  const addWhale = useCallback((whale: Whale) => {
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
    setTotal((prev) => prev + 1);
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
  };
}
