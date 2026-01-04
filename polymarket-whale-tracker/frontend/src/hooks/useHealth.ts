/**
 * useHealth Hook
 *
 * Monitors backend health including blockchain listener status.
 * Polls the health endpoint periodically to detect if the
 * blockchain listener has stopped receiving events.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchHealth, type HealthResponse } from '../services/api';

interface UseHealthResult {
  /** Whether blockchain listener is running and healthy */
  blockchainHealthy: boolean;
  /** When the last blockchain event was received */
  lastEventTime: Date | null;
  /** Whether the health check itself is working */
  healthCheckOk: boolean;
}

/** Poll interval for health checks (30 seconds) */
const HEALTH_POLL_INTERVAL = 30000;

/** Consider listener unhealthy if no events for this long (10 minutes) */
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

/** Grace period for startup - don't consider unhealthy immediately (1 minute) */
const STARTUP_GRACE_MS = 1 * 60 * 1000;

export function useHealth(): UseHealthResult {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthCheckOk, setHealthCheckOk] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setHealthCheckOk(true);
    } catch {
      setHealthCheckOk(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Poll periodically
    const interval = setInterval(checkHealth, HEALTH_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Determine if blockchain is actually healthy
  const lastEventTime = health?.blockchain?.lastEventTime
    ? new Date(health.blockchain.lastEventTime)
    : null;

  // Get server start time for grace period calculation
  const serverStartTime = health?.blockchain?.startTime
    ? new Date(health.blockchain.startTime)
    : null;

  // Check if events are stale (no events for too long)
  const isStale = lastEventTime
    ? Date.now() - lastEventTime.getTime() > STALE_THRESHOLD_MS
    : false;

  // If no events have ever been received, check if server has been running past grace period
  const timeSinceServerStart = serverStartTime
    ? Date.now() - serverStartTime.getTime()
    : 0;
  const pastGracePeriod = timeSinceServerStart > STARTUP_GRACE_MS;
  const neverReceivedEvents = !lastEventTime && pastGracePeriod;

  const blockchainHealthy =
    healthCheckOk &&
    health?.blockchain?.listening === true &&
    health?.blockchain?.healthy === true &&
    !isStale &&
    !neverReceivedEvents;

  return {
    blockchainHealthy,
    lastEventTime,
    healthCheckOk,
  };
}
