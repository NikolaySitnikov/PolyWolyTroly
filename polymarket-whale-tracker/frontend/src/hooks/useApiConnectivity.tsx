/**
 * useApiConnectivity Hook
 *
 * Monitors API connectivity and provides auto-reconnection capabilities.
 * When the API recovers after being down, registered callbacks are invoked
 * to allow components to refetch their data without page reload.
 *
 * Features:
 * - Polls /api/health endpoint to detect connectivity
 * - Faster polling (1s) when disconnected for quick recovery
 * - Normal polling (3s) when connected
 * - Triggers onReconnect callbacks when API recovers
 * - Distinguishes initial connection from reconnection
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { fetchHealth } from '../services/api';

/** Poll interval when connected (3 seconds) */
const POLL_INTERVAL_CONNECTED = 3000;

/** Poll interval when disconnected (1 second - faster retry) */
const POLL_INTERVAL_DISCONNECTED = 1000;

interface ApiConnectivityContextValue {
  /** Whether the API is currently reachable */
  isConnected: boolean;
  /** Register a callback to be invoked when API recovers from disconnection */
  onReconnect: (callback: () => void) => () => void;
}

const ApiConnectivityContext = createContext<ApiConnectivityContextValue | null>(null);

/**
 * Provider component that monitors API connectivity
 */
export function ApiConnectivityProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const wasConnectedRef = useRef(false);
  const hadFailedCheckRef = useRef(false);
  const callbacksRef = useRef<Set<() => void>>(new Set());

  const checkHealth = useCallback(async () => {
    try {
      await fetchHealth();
      // Trigger callbacks if we're recovering from a failed state
      // This covers both: "was connected then disconnected" AND "started disconnected"
      const shouldTriggerCallbacks = hadFailedCheckRef.current && !wasConnectedRef.current;

      setIsConnected(true);
      wasConnectedRef.current = true;
      hadFailedCheckRef.current = false;

      // If we just recovered from disconnection, invoke all callbacks
      if (shouldTriggerCallbacks) {
        console.log('[ApiConnectivity] API recovered! Triggering refetch...');
        callbacksRef.current.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error('[ApiConnectivity] Callback error:', e);
          }
        });
      }
    } catch {
      setIsConnected(false);
      wasConnectedRef.current = false;
      hadFailedCheckRef.current = true;
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up polling with dynamic interval
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = () => {
      const interval = wasConnectedRef.current ? POLL_INTERVAL_CONNECTED : POLL_INTERVAL_DISCONNECTED;
      timeoutId = setTimeout(async () => {
        await checkHealth();
        poll();
      }, interval);
    };

    poll();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [checkHealth]);

  /**
   * Register a callback to be invoked when API reconnects.
   * Returns a cleanup function to unregister the callback.
   */
  const onReconnect = useCallback((callback: () => void) => {
    callbacksRef.current.add(callback);
    return () => {
      callbacksRef.current.delete(callback);
    };
  }, []);

  return (
    <ApiConnectivityContext.Provider value={{ isConnected, onReconnect }}>
      {children}
    </ApiConnectivityContext.Provider>
  );
}

/**
 * Hook to access API connectivity state and register reconnection callbacks
 */
export function useApiConnectivity(): ApiConnectivityContextValue {
  const context = useContext(ApiConnectivityContext);
  if (!context) {
    throw new Error('useApiConnectivity must be used within ApiConnectivityProvider');
  }
  return context;
}
