/**
 * useAlerts Hook
 *
 * React hook for fetching and managing live alert data.
 * Handles loading, error states, pagination, and seamless live updates.
 * Supports server-side minimum amount filtering for proper pagination.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDeposits, type DepositsResponse } from '../services/api';
import type { Alert } from '../types/alert';

interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  refetch: () => void;
  /** Add a new alert seamlessly (no loading state) - used for WebSocket updates */
  addAlert: (alert: Alert) => void;
}

/**
 * Transform raw API deposit data to Alert object
 */
function transformDeposit(deposit: DepositsResponse['deposits'][0]): Alert {
  return {
    id: deposit.tx_hash,
    type: 'deposit',
    walletAddress: deposit.wallet_address,
    amount: parseFloat(deposit.amount),
    timestamp: deposit.created_at,
    txHash: deposit.tx_hash,
  };
}

/**
 * Hook for fetching and managing alerts with server-side filtering.
 * @param limit - Items per page (default 20)
 * @param minAmount - Minimum deposit amount filter (applied server-side for proper pagination)
 */
export function useAlerts(limit = 20, minAmount?: number): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const isInitialLoad = useRef(true);
  const prevMinAmount = useRef(minAmount);

  const totalPages = Math.ceil(total / limit);

  // Reset to page 1 when minAmount filter changes
  useEffect(() => {
    if (prevMinAmount.current !== minAmount) {
      prevMinAmount.current = minAmount;
      setPage(1);
    }
  }, [minAmount]);

  const fetchData = useCallback(async () => {
    // Only show loading on initial load, not on refetch
    if (isInitialLoad.current) {
      setLoading(true);
    }
    // Don't clear error until fetch succeeds to prevent flicker on retry

    try {
      const response = await fetchDeposits(page, limit, undefined, minAmount);
      setAlerts(response.deposits.map(transformDeposit));
      setTotal(response.total);
      setError(null); // Clear error only on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [limit, page, minAmount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Add a new alert without triggering loading state.
   * Used for live WebSocket updates.
   * Prevents duplicates by checking alert ID.
   * Only adds if alert meets current minAmount filter.
   */
  const addAlert = useCallback((alert: Alert) => {
    // Skip if alert doesn't meet minimum amount threshold
    if (minAmount !== undefined && minAmount > 0 && alert.amount < minAmount) {
      return;
    }

    setAlerts((prev) => {
      // Check if alert already exists
      const exists = prev.some((a) => a.id === alert.id);
      if (exists) {
        return prev;
      }
      // Add new alert at the beginning (most recent)
      return [alert, ...prev];
    });
    // Increment total count
    setTotal((prev) => prev + 1);
  }, [minAmount]);

  return {
    alerts,
    loading,
    error,
    total,
    page,
    totalPages,
    setPage,
    refetch: fetchData,
    addAlert,
  };
}
