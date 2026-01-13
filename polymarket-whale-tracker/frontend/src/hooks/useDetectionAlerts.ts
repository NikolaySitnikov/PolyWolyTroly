/**
 * useDetectionAlerts Hook
 *
 * React hook for fetching and managing insider detection alerts.
 * Supports pagination and filtering with automatic refetch on filter changes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDetectionAlerts, updateDetectionAlertStatus } from '../services/api';
import type {
  DetectionAlert,
  AlertFilters,
  AlertStatus,
  AlertSeverity,
  AlertType,
} from '../types/detection';

interface UseDetectionAlertsResult {
  alerts: DetectionAlert[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  filters: AlertFilters;
  setFilters: (filters: AlertFilters) => void;
  setSeverityFilter: (severity: AlertSeverity | AlertSeverity[] | undefined) => void;
  setStatusFilter: (status: AlertStatus | AlertStatus[] | undefined) => void;
  setTypeFilter: (type: AlertType | AlertType[] | undefined) => void;
  refetch: () => void;
  updateStatus: (id: number, status: AlertStatus, notes?: string) => Promise<void>;
}

export function useDetectionAlerts(
  limit = 20,
  initialFilters?: AlertFilters
): UseDetectionAlertsResult {
  const [alerts, setAlerts] = useState<DetectionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<AlertFilters>(initialFilters || {});
  const isInitialLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }

    try {
      const data = await fetchDetectionAlerts(page, limit, filters);
      setAlerts(data.alerts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [page, limit, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  const handleSetFilters = useCallback((newFilters: AlertFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const setSeverityFilter = useCallback((severity: AlertSeverity | AlertSeverity[] | undefined) => {
    handleSetFilters({ ...filters, severity });
  }, [filters, handleSetFilters]);

  const setStatusFilter = useCallback((status: AlertStatus | AlertStatus[] | undefined) => {
    handleSetFilters({ ...filters, status });
  }, [filters, handleSetFilters]);

  const setTypeFilter = useCallback((alertType: AlertType | AlertType[] | undefined) => {
    handleSetFilters({ ...filters, alertType });
  }, [filters, handleSetFilters]);

  const updateStatus = useCallback(async (id: number, status: AlertStatus, notes?: string) => {
    const updatedAlert = await updateDetectionAlertStatus(id, status, notes);
    // Update alert in local state
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? updatedAlert : alert))
    );
  }, []);

  return {
    alerts,
    loading,
    error,
    total,
    page,
    totalPages,
    setPage,
    filters,
    setFilters: handleSetFilters,
    setSeverityFilter,
    setStatusFilter,
    setTypeFilter,
    refetch: fetchData,
    updateStatus,
  };
}
