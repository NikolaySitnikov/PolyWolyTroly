/**
 * usePolymarketRTDS Hook
 *
 * Connects to Polymarket's Real-Time Data Socket (RTDS) for live activity updates.
 * Subscribes to the global trades feed and filters for specific wallet addresses.
 *
 * WebSocket: wss://ws-live-data.polymarket.com
 * Topic: activity, Type: trades
 *
 * @see https://docs.polymarket.com/developers/RTDS/RTDS-overview
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PolymarketActivity } from '../types/polymarket';

const RTDS_URL = 'wss://ws-live-data.polymarket.com';
const PING_INTERVAL = 5000; // 5 seconds as per docs
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

/**
 * Trade message from RTDS WebSocket
 */
interface RTDSTradeMessage {
  topic: 'activity';
  type: 'trades';
  timestamp: number;
  payload: {
    asset: string;
    conditionId: string;
    eventSlug: string;
    outcome: string;
    price: number;
    proxyWallet: string;
    side: 'BUY' | 'SELL';
    size: number;
    slug: string;
    timestamp: number;
    title: string;
    transactionHash: string;
    usdcSize?: number;
    fee?: number;
  };
}

interface UsePolymarketRTDSOptions {
  /** Wallet address to filter trades for (case-insensitive) */
  walletAddress?: string;
  /** Whether to enable the WebSocket connection */
  enabled?: boolean;
  /** Callback when a new trade is received for the wallet */
  onNewTrade?: (trade: PolymarketActivity) => void;
}

interface UsePolymarketRTDSResult {
  /** Whether WebSocket is connected */
  connected: boolean;
  /** Connection error message */
  error: string | null;
  /** Recent trades for the wallet (newest first, capped at 100) */
  recentTrades: PolymarketActivity[];
}

/**
 * Convert RTDS trade payload to PolymarketActivity format
 */
function toPolymarketActivity(payload: RTDSTradeMessage['payload']): PolymarketActivity {
  return {
    proxyWallet: payload.proxyWallet,
    timestamp: payload.timestamp,
    type: 'TRADE',
    conditionId: payload.conditionId,
    title: payload.title,
    slug: payload.slug,
    side: payload.side,
    outcome: payload.outcome,
    size: payload.size,
    usdcSize: payload.usdcSize,
    price: payload.price,
    transactionHash: payload.transactionHash,
    fee: payload.fee,
  };
}

/**
 * Module-level singleton for RTDS WebSocket connection.
 * Prevents duplicate connections in React StrictMode.
 */
let globalWs: WebSocket | null = null;
let subscriberCount = 0;
let reconnectAttempt = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;

// Callback registries
const tradeCallbacks = new Map<string, Set<(trade: RTDSTradeMessage['payload']) => void>>();
const connectionCallbacks = new Set<(connected: boolean) => void>();
const errorCallbacks = new Set<(error: string | null) => void>();

function notifyConnection(connected: boolean) {
  connectionCallbacks.forEach((cb) => cb(connected));
  if (connected) {
    errorCallbacks.forEach((cb) => cb(null));
  }
}

function notifyError(error: string) {
  errorCallbacks.forEach((cb) => cb(error));
}

function notifyTrade(trade: RTDSTradeMessage['payload']) {
  const walletLower = trade.proxyWallet.toLowerCase();
  // Notify subscribers watching this wallet
  tradeCallbacks.forEach((callbacks, address) => {
    if (address.toLowerCase() === walletLower) {
      callbacks.forEach((cb) => cb(trade));
    }
  });
}

function startPing() {
  if (pingInterval) return;
  pingInterval = setInterval(() => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify({ action: 'ping' }));
    }
  }, PING_INTERVAL);
}

function stopPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

function connect() {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    return;
  }
  if (globalWs && globalWs.readyState === WebSocket.CONNECTING) {
    return;
  }

  const ws = new WebSocket(RTDS_URL);
  globalWs = ws;

  ws.onopen = () => {
    reconnectAttempt = 0;
    notifyConnection(true);

    // Subscribe to trades
    ws.send(JSON.stringify({
      action: 'subscribe',
      subscriptions: [{
        topic: 'activity',
        type: 'trades',
      }],
    }));

    startPing();
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      // Handle trade messages
      if (message.topic === 'activity' && message.type === 'trades' && message.payload) {
        notifyTrade(message.payload);
      }
      // Ignore pong/ack messages
    } catch {
      // Ignore parse errors (binary pong frames, etc.)
    }
  };

  ws.onclose = () => {
    notifyConnection(false);
    stopPing();
    globalWs = null;

    // Auto-reconnect if there are still subscribers
    if (subscriberCount > 0) {
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
      reconnectAttempt++;
      notifyError(`Connection lost. Reconnecting in ${delay / 1000}s...`);
      reconnectTimeout = setTimeout(connect, delay);
    }
  };

  ws.onerror = () => {
    notifyError('WebSocket connection error');
    // onclose will be called after onerror
  };
}

function disconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  stopPing();
  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }
}

export function usePolymarketRTDS(
  options: UsePolymarketRTDSOptions = {}
): UsePolymarketRTDSResult {
  const { walletAddress, enabled = true, onNewTrade } = options;

  const [connected, setConnected] = useState(globalWs?.readyState === WebSocket.OPEN);
  const [error, setError] = useState<string | null>(null);
  const [recentTrades, setRecentTrades] = useState<PolymarketActivity[]>([]);

  const onNewTradeRef = useRef(onNewTrade);
  onNewTradeRef.current = onNewTrade;

  // Handle trade callback
  const handleTrade = useCallback((payload: RTDSTradeMessage['payload']) => {
    const activity = toPolymarketActivity(payload);

    // Add to recent trades (newest first, cap at 100)
    setRecentTrades((prev) => {
      // Check for duplicates by transactionHash
      if (prev.some((t) => t.transactionHash === activity.transactionHash)) {
        return prev;
      }
      return [activity, ...prev].slice(0, 100);
    });

    // Notify callback
    onNewTradeRef.current?.(activity);
  }, []);

  useEffect(() => {
    if (!enabled || !walletAddress) {
      return;
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Register callbacks
    const connectionCb = (isConnected: boolean) => setConnected(isConnected);
    const errorCb = (err: string | null) => setError(err);

    connectionCallbacks.add(connectionCb);
    errorCallbacks.add(errorCb);

    // Register trade callback for this wallet
    if (!tradeCallbacks.has(normalizedAddress)) {
      tradeCallbacks.set(normalizedAddress, new Set());
    }
    tradeCallbacks.get(normalizedAddress)!.add(handleTrade);

    subscriberCount++;
    connect();

    return () => {
      subscriberCount--;

      // Remove callbacks
      connectionCallbacks.delete(connectionCb);
      errorCallbacks.delete(errorCb);

      const callbacks = tradeCallbacks.get(normalizedAddress);
      if (callbacks) {
        callbacks.delete(handleTrade);
        if (callbacks.size === 0) {
          tradeCallbacks.delete(normalizedAddress);
        }
      }

      // Disconnect if no more subscribers
      if (subscriberCount === 0) {
        disconnect();
        reconnectAttempt = 0;
      }
    };
  }, [enabled, walletAddress, handleTrade]);

  // Clear recent trades when wallet changes
  useEffect(() => {
    setRecentTrades([]);
  }, [walletAddress]);

  return {
    connected,
    error,
    recentTrades,
  };
}
