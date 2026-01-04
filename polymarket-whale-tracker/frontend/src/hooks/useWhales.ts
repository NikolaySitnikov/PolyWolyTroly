/**
 * useWhales Hook
 *
 * React hook for fetching and managing whale wallet data.
 * Handles loading, error, and pagination states.
 */

import { useState, useEffect, useCallback } from 'react';
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

export function useWhales(limit = 20): UseWhalesResult {
  const [whales, setWhales] = useState<Whale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWhales(page, limit);
      setWhales(response.wallets.map(transformWallet));
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    whales,
    loading,
    error,
    total,
    page,
    setPage,
    refetch: fetchData,
  };
}
