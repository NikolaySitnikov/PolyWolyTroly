/**
 * useDetectionAlerts Hook
 *
 * React hook for fetching and managing insider detection alerts.
 * Supports pagination and filtering with WebSocket for instant live updates.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchDetectionAlerts, updateDetectionAlertStatus, getWebSocketUrl } from '../services/api';
import { useWebSocket, type DetectionAlertEvent } from './useWebSocket';
import type {
  DetectionAlert,
  AlertFilters,
  AlertStatus,
  AlertSeverity,
  AlertType,
} from '../types/detection';

/**
 * Filter alerts locally for instant UI responsiveness
 */
function filterAlertsLocally(alerts: DetectionAlert[], filters: AlertFilters): DetectionAlert[] {
  return alerts.filter((alert) => {
    // Severity filter
    if (filters.severity) {
      const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
      if (!severities.includes(alert.severity)) return false;
    }
    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(alert.status)) return false;
    }
    // Type filter
    if (filters.alertType) {
      const types = Array.isArray(filters.alertType) ? filters.alertType : [filters.alertType];
      if (!types.includes(alert.alertType)) return false;
    }
    return true;
  });
}

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
  // Raw alerts from API (unfiltered)
  const [rawAlerts, setRawAlerts] = useState<DetectionAlert[]>([]);
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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Optimistically filter alerts locally for instant UI response
  // This ensures filters feel instant while API call is in flight
  const alerts = useMemo(() => {
    // Only apply local filtering if we have active filters
    const hasFilters = filters.severity || filters.status || filters.alertType;
    if (!hasFilters) return rawAlerts;
    return filterAlertsLocally(rawAlerts, filters);
  }, [rawAlerts, filters]);

  // Debounced fetch to prevent excessive API calls when rapidly changing filters
  const fetchData = useCallback(async (immediate = false) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const doFetch = async () => {
      if (isInitialLoad.current) {
        setLoading(true);
      }

      try {
        const data = await fetchDetectionAlerts(page, limit, filters);
        setRawAlerts(data.alerts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    };

    if (immediate || isInitialLoad.current) {
      await doFetch();
    } else {
      // Debounce subsequent fetches by 150ms for smoother filter changes
      debounceTimerRef.current = setTimeout(doFetch, 150);
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

    // Add to raw alerts if on page 1 (local filtering will handle visibility)
    if (pageRef.current === 1) {
      setRawAlerts((prev) => {
        // Don't add if already exists
        if (prev.some((a) => a.id === newAlert.id)) {
          return prev;
        }
        // Add to beginning, keep only up to limit
        return [newAlert, ...prev].slice(0, limit);
      });
    }
    // Increment total if alert matches current filters
    if (matchesSeverity && matchesStatus && matchesType) {
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

  // Use functional updates to always get the latest filter state
  // This ensures filters respond instantly without stale closure issues
  const setSeverityFilter = useCallback((severity: AlertSeverity | AlertSeverity[] | undefined) => {
    setFilters((prev) => ({ ...prev, severity }));
    setPage(1);
  }, []);

  const setStatusFilter = useCallback((status: AlertStatus | AlertStatus[] | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
    setPage(1);
  }, []);

  const setTypeFilter = useCallback((alertType: AlertType | AlertType[] | undefined) => {
    setFilters((prev) => ({ ...prev, alertType }));
    setPage(1);
  }, []);

  const updateStatus = useCallback(async (id: number, status: AlertStatus, notes?: string) => {
    const updatedAlert = await updateDetectionAlertStatus(id, status, notes);
    // Update alert in local state (use rawAlerts since alerts is derived)
    setRawAlerts((prev) =>
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
