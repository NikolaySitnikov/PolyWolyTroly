/**
 * useDetectionAlerts Hook
 *
 * React hook for fetching and managing insider detection alerts.
 * Supports pagination and filtering with WebSocket for instant live updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDetectionAlerts, updateDetectionAlertStatus, getWebSocketUrl } from '../services/api';
import { useWebSocket, type DetectionAlertEvent } from './useWebSocket';
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
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const pageRef = useRef(page);
  pageRef.current = page;

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

  // Handle incoming WebSocket detection alerts - instant updates!
  const handleDetectionAlert = useCallback((alertEvent: DetectionAlertEvent) => {
    // Convert WebSocket event to DetectionAlert format
    const newAlert: DetectionAlert = {
      id: alertEvent.id,
      alertType: alertEvent.alertType as AlertType,
      severity: alertEvent.severity as AlertSeverity,
      walletAddress: alertEvent.walletAddress,
      conditionId: alertEvent.conditionId,
      title: alertEvent.title,
      description: alertEvent.description,
      confidenceScore: alertEvent.confidenceScore,
      detectedAt: alertEvent.detectedAt,
      status: 'new',
      detectionRule: alertEvent.alertType, // Will be updated on next fetch
    };

    // Check if alert matches current filters
    const currentFilters = filtersRef.current;
    const matchesSeverity = !currentFilters.severity ||
      (Array.isArray(currentFilters.severity)
        ? currentFilters.severity.includes(newAlert.severity)
        : currentFilters.severity === newAlert.severity);
    const matchesStatus = !currentFilters.status ||
      (Array.isArray(currentFilters.status)
        ? currentFilters.status.includes(newAlert.status)
        : currentFilters.status === newAlert.status);
    const matchesType = !currentFilters.alertType ||
      (Array.isArray(currentFilters.alertType)
        ? currentFilters.alertType.includes(newAlert.alertType)
        : currentFilters.alertType === newAlert.alertType);

    // Only add to list if on page 1 and matches filters
    if (pageRef.current === 1 && matchesSeverity && matchesStatus && matchesType) {
      setAlerts((prev) => {
        // Don't add if already exists
        if (prev.some((a) => a.id === newAlert.id)) {
          return prev;
        }
        // Add to beginning, keep only up to limit
        return [newAlert, ...prev].slice(0, limit);
      });
      setTotal((prev) => prev + 1);
    } else {
      // Still increment total even if not shown
      setTotal((prev) => prev + 1);
    }
  }, [limit]);

  // Connect to WebSocket for instant alert updates
  useWebSocket(getWebSocketUrl(), {
    onDetectionAlert: handleDetectionAlert,
  });

  useEffect(() => {
    // Initial fetch
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
