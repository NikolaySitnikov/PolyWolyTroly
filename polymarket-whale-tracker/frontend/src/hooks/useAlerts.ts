/**
 * useAlerts Hook
 *
 * React hook for fetching and managing live alert data.
 * Handles loading, error states, and seamless live updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDeposits, type DepositsResponse } from '../services/api';
import type { Alert } from '../types/alert';

interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  total: number;
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

export function useAlerts(limit = 50): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const isInitialLoad = useRef(true);

  const fetchData = useCallback(async () => {
    // Only show loading on initial load, not on refetch
    if (isInitialLoad.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetchDeposits(1, limit);
      setAlerts(response.deposits.map(transformDeposit));
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Add a new alert without triggering loading state.
   * Used for live WebSocket updates.
   * Prevents duplicates by checking alert ID.
   */
  const addAlert = useCallback((alert: Alert) => {
    setAlerts((prev) => {
      // Check if alert already exists
      const exists = prev.some((a) => a.id === alert.id);
      if (exists) {
        return prev;
      }
      // Add new alert at the beginning (most recent)
      return [alert, ...prev];
    });
  }, []);

  return {
    alerts,
    loading,
    error,
    total,
    refetch: fetchData,
    addAlert,
  };
}
