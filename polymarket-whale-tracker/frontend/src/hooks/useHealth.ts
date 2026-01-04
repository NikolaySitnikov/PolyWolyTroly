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
  /** Whether blockchain listener is running and healthy (based on RPC heartbeat) */
  blockchainHealthy: boolean;
  /** When the last successful RPC heartbeat was received */
  lastHeartbeatTime: Date | null;
  /** When the last deposit event was received (may be null if no deposits recently) */
  lastEventTime: Date | null;
  /** Whether the health check API call itself is working */
  healthCheckOk: boolean;
}

/** Poll interval for health checks (15 seconds - half of heartbeat interval) */
const HEALTH_POLL_INTERVAL = 15000;

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

  // Parse timestamps from health response
  const lastHeartbeatTime = health?.blockchain?.lastHeartbeatTime
    ? new Date(health.blockchain.lastHeartbeatTime)
    : null;

  const lastEventTime = health?.blockchain?.lastEventTime
    ? new Date(health.blockchain.lastEventTime)
    : null;

  // Health is determined by the backend based on heartbeat checks
  // The backend marks healthy=true only if RPC heartbeat is recent
  const blockchainHealthy =
    healthCheckOk &&
    health?.blockchain?.listening === true &&
    health?.blockchain?.healthy === true;

  return {
    blockchainHealthy,
    lastHeartbeatTime,
    lastEventTime,
    healthCheckOk,
  };
}
