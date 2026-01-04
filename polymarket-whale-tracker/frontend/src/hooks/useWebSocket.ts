/**
 * useWebSocket Hook
 *
 * Provides instant live updates via WebSocket connection.
 * Receives real-time stats updates and new deposit notifications.
 * Auto-reconnects on disconnect with exponential backoff.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketResult {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  // Keep options ref updated
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!isMounted.current) return;

    console.log('[WebSocket] Connecting to:', url);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected!');
      setConnected(true);
      reconnectAttempt.current = 0; // Reset on successful connection
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('[WebSocket] Received:', message.type, message.data);

        switch (message.type) {
          case 'stats_update':
            optionsRef.current.onStats?.(message.data as StatsResponse);
            break;
          case 'new_deposit':
            optionsRef.current.onDeposit?.(message.data as DepositEvent);
            break;
        }
      } catch (e) {
        console.error('[WebSocket] Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setConnected(false);

      // Auto-reconnect with exponential backoff
      if (isMounted.current) {
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempt.current + 1})`);
        reconnectAttempt.current++;
        reconnectTimeout.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      // onclose will be called after onerror, which handles reconnection
    };
  }, [url]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      console.log('[WebSocket] Closing connection');
      isMounted.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected };
}
