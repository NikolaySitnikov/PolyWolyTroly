/**
 * useAlerts Hook
 *
 * React hook for fetching and managing live alert data.
 * Handles loading, error states, pagination, sorting, and seamless live updates.
 * Supports server-side minimum amount filtering and sorting for proper pagination.
 *
 * Pattern matches useWhales hook for consistency.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDeposits, type DepositsResponse, type DepositSortField, type SortDirection } from '../services/api';
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
 * Hook for fetching and managing alerts with server-side filtering and sorting.
 * @param limit - Items per page (default 20)
 * @param minAmount - Minimum deposit amount filter (applied server-side for proper pagination)
 * @param sortBy - Field to sort by (default 'created_at')
 * @param sortDir - Sort direction (default 'desc')
 */
export function useAlerts(
  limit = 20,
  minAmount?: number,
  sortBy: DepositSortField = 'created_at',
  sortDir: SortDirection = 'desc'
): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const isInitialLoad = useRef(true);
  const pageRef = useRef(page);
  pageRef.current = page;

  const totalPages = Math.ceil(total / limit);

  // Track previous values to reset page when filters/sort change
  const prevMinAmount = useRef(minAmount);
  const prevSortBy = useRef(sortBy);
  const prevSortDir = useRef(sortDir);

  // Reset to page 1 when minAmount filter or sort changes
  useEffect(() => {
    if (
      prevMinAmount.current !== minAmount ||
      prevSortBy.current !== sortBy ||
      prevSortDir.current !== sortDir
    ) {
      setPage(1);
      prevMinAmount.current = minAmount;
      prevSortBy.current = sortBy;
      prevSortDir.current = sortDir;
    }
  }, [minAmount, sortBy, sortDir]);

  const fetchData = useCallback(async () => {
    // Only show loading on initial load, not on refetch
    if (isInitialLoad.current) {
      setLoading(true);
    }
    // Don't clear error until fetch succeeds to prevent flicker on retry

    try {
      const response = await fetchDeposits(page, limit, undefined, minAmount, sortBy, sortDir);
      setAlerts(response.deposits.map(transformDeposit));
      setTotal(response.total);
      setError(null); // Clear error only on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [limit, page, minAmount, sortBy, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Add a new alert without triggering loading state.
   * Used for live WebSocket updates.
   * Prevents duplicates by checking alert ID.
   * Only adds if alert meets current minAmount filter.
   * Only adds to visible list if on page 1 (when sorted by timestamp desc).
   */
  const addAlert = useCallback((alert: Alert) => {
    // Skip if alert doesn't meet minimum amount threshold
    if (minAmount !== undefined && minAmount > 0 && alert.amount < minAmount) {
      return;
    }

    // Always increment total count
    setTotal((prev) => prev + 1);

    // Only add to visible list if on page 1 AND sorted by time desc
    // (otherwise the new alert might not belong at the top)
    if (pageRef.current === 1 && sortBy === 'created_at' && sortDir === 'desc') {
      setAlerts((prev) => {
        // Check if alert already exists
        const exists = prev.some((a) => a.id === alert.id);
        if (exists) {
          return prev;
        }
        // Add new alert at the beginning (most recent)
        return [alert, ...prev];
      });
    }
  }, [minAmount, sortBy, sortDir]);

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
