/**
 * useWebSocket Hook
 *
 * Provides instant live updates via WebSocket connection.
 * Receives real-time stats updates and new deposit notifications.
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

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketResult {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref updated
  optionsRef.current = options;

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'stats_update':
            optionsRef.current.onStats?.(message.data as StatsResponse);
            break;
          case 'new_deposit':
            optionsRef.current.onDeposit?.(message.data as DepositEvent);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { connected };
}
