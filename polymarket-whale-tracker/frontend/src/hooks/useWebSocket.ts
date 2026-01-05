/**
 * useWebSocket Hook
 *
 * Provides instant live updates via WebSocket connection.
 * Receives real-time stats updates and new deposit notifications.
 * Auto-reconnects on disconnect with exponential backoff.
 *
 * Note: Uses module-level singleton to prevent duplicate connections
 * in React StrictMode (which double-mounts components in dev).
 */

import { useState, useEffect, useRef } from 'react';
import type { StatsResponse } from '../services/api';

export interface DepositEvent {
  walletAddress: string;
  amount: number;
  txHash: string;
  isNewWallet: boolean;
}

interface WebSocketMessage {
  type: 'stats_update' | 'new_deposit';
  data: StatsResponse | DepositEvent;
}

interface UseWebSocketOptions {
  onStats?: (stats: StatsResponse) => void;
  onDeposit?: (deposit: DepositEvent) => void;
}

interface UseWebSocketResult {
  connected: boolean;
}

/** Reconnection delays (exponential backoff): 1s, 2s, 4s, 8s, then stay at 8s */
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000];

/**
 * Module-level singleton for WebSocket connection.
 * Prevents duplicate connections in React StrictMode.
 */
let globalWs: WebSocket | null = null;
let globalUrl: string | null = null;
let subscriberCount = 0;
let reconnectAttempt = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

// Callbacks registry - allows multiple components to subscribe
const statsCallbacks = new Set<(stats: StatsResponse) => void>();
const depositCallbacks = new Set<(deposit: DepositEvent) => void>();
const connectionCallbacks = new Set<(connected: boolean) => void>();

function notifyConnection(connected: boolean) {
  connectionCallbacks.forEach((cb) => cb(connected));
}

function connect(url: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    return; // Already connected
  }

  if (globalWs && globalWs.readyState === WebSocket.CONNECTING) {
    return; // Connection in progress
  }

  globalUrl = url;
  const ws = new WebSocket(url);
  globalWs = ws;

  ws.onopen = () => {
    reconnectAttempt = 0;
    notifyConnection(true);
  };

  ws.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'stats_update':
          statsCallbacks.forEach((cb) => cb(message.data as StatsResponse));
          break;
        case 'new_deposit':
          depositCallbacks.forEach((cb) => cb(message.data as DepositEvent));
          break;
      }
    } catch (e) {
      console.error('[WebSocket] Parse error:', e);
    }
  };

  ws.onclose = () => {
    notifyConnection(false);
    globalWs = null;

    // Auto-reconnect if there are still subscribers
    if (subscriberCount > 0 && globalUrl) {
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
      reconnectAttempt++;
      reconnectTimeout = setTimeout(() => connect(globalUrl!), delay);
    }
  };

  ws.onerror = (error) => {
    console.error('[WebSocket] Error:', error);
    // onclose will be called after onerror
  };
}

function disconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketResult {
  const [connected, setConnected] = useState(
    globalWs?.readyState === WebSocket.OPEN
  );
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Use refs for callbacks so they have stable identity across StrictMode remounts
  const callbacksRef = useRef<{
    onStats: ((stats: StatsResponse) => void) | null;
    onDeposit: ((deposit: DepositEvent) => void) | null;
    onConnection: ((connected: boolean) => void) | null;
  }>({ onStats: null, onDeposit: null, onConnection: null });

  useEffect(() => {
    // Create callbacks if not already created (first mount)
    if (!callbacksRef.current.onStats) {
      callbacksRef.current.onStats = (stats: StatsResponse) => optionsRef.current.onStats?.(stats);
      callbacksRef.current.onDeposit = (deposit: DepositEvent) => optionsRef.current.onDeposit?.(deposit);
      callbacksRef.current.onConnection = (isConnected: boolean) => setConnected(isConnected);
    }

    // Always add to sets (they're Sets so duplicates are ignored)
    // This handles both initial mount and StrictMode remount
    statsCallbacks.add(callbacksRef.current.onStats);
    depositCallbacks.add(callbacksRef.current.onDeposit);
    connectionCallbacks.add(callbacksRef.current.onConnection);

    subscriberCount++;

    // Connect if not already connected
    connect(url);

    return () => {
      subscriberCount--;

      // Remove callbacks from sets
      statsCallbacks.delete(callbacksRef.current.onStats!);
      depositCallbacks.delete(callbacksRef.current.onDeposit!);
      connectionCallbacks.delete(callbacksRef.current.onConnection!);

      // Disconnect and reset ref only when truly unmounted
      if (subscriberCount === 0) {
        callbacksRef.current = { onStats: null, onDeposit: null, onConnection: null };
        disconnect();
      }
    };
  }, [url]);

  return { connected };
}
