/**
 * WebSocket Server for Real-Time Updates
 *
 * Broadcasts deposit events and stats updates to connected clients instantly.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { db } from '../services/database.js';

// Store connected clients
const clients = new Set<WebSocket>();

// WebSocket server instance
let wss: WebSocketServer | null = null;

// Periodic stats broadcast interval (for time-based rolling 24h updates)
let statsInterval: ReturnType<typeof setInterval> | null = null;

// Stats broadcast interval in ms (60 seconds - balances freshness vs DB load)
const STATS_BROADCAST_INTERVAL = 60_000;

export interface DepositEvent {
  walletAddress: string;
  amount: number;
  txHash: string;
  blockNumber: bigint;
  isNewWallet: boolean;
  depositId: number;
}

export interface TradingUpdateEvent {
  walletAddress: string;
  metrics: {
    pnl: number;
    pnl7d: number;
    pnl30d: number;
    winRate: number;
    portfolioValue: number;
    activePositions: number;
    totalTrades: number;
    lastActivityAt: string | null;
    isLive: boolean;
  };
}

/**
 * Initialize WebSocket server attached to HTTP server
 */
export function initWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`WebSocket client connected. Total: ${clients.size}`);

    // Send current stats immediately on connection
    sendCurrentStats(ws);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`WebSocket client disconnected. Total: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Start periodic stats broadcast for time-based rolling 24h metric updates
  // This ensures "Alerts Today" and "New Today" decrease as items fall out of the 24h window
  startPeriodicStatsBroadcast();

  return wss;
}

/**
 * Start periodic stats broadcast to all clients.
 * This handles time-based updates for rolling 24h metrics (Alerts Today, New Today)
 * that can decrease even without new deposits.
 */
function startPeriodicStatsBroadcast(): void {
  // Clear any existing interval
  if (statsInterval) {
    clearInterval(statsInterval);
  }

  statsInterval = setInterval(async () => {
    // Only broadcast if there are connected clients
    if (clients.size === 0) return;

    try {
      const stats = await db.getStats();
      broadcast({
        type: 'stats_update',
        data: stats
      });
    } catch (error) {
      console.error('[WebSocket] Error in periodic stats broadcast:', error);
    }
  }, STATS_BROADCAST_INTERVAL);

  console.log(`[WebSocket] Periodic stats broadcast started (every ${STATS_BROADCAST_INTERVAL / 1000}s)`);
}

/**
 * Send current stats to a single client
 */
async function sendCurrentStats(ws: WebSocket): Promise<void> {
  try {
    const stats = await db.getStats();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'stats_update',
        data: stats
      }));
    }
  } catch (error) {
    console.error('Error sending stats:', error);
  }
}

/**
 * Broadcast a message to all connected clients
 */
function broadcast(message: object): void {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

/**
 * Broadcast a new deposit event to all clients
 * Called from blockchain listener when a deposit is detected
 */
export async function broadcastDeposit(event: DepositEvent): Promise<void> {
  console.log(`[WebSocket] Broadcasting deposit to ${clients.size} clients: $${event.amount} from ${event.walletAddress}`);

  // Broadcast the deposit event
  broadcast({
    type: 'new_deposit',
    data: {
      walletAddress: event.walletAddress,
      amount: event.amount,
      txHash: event.txHash,
      isNewWallet: event.isNewWallet
    }
  });

  // Also broadcast updated stats
  try {
    const stats = await db.getStats();
    broadcast({
      type: 'stats_update',
      data: stats
    });
  } catch (error) {
    console.error('Error broadcasting stats:', error);
  }
}

/**
 * Broadcast trading data update for a wallet
 * Called when trading metrics are refreshed
 */
export function broadcastTradingUpdate(event: TradingUpdateEvent): void {
  console.log(`[WebSocket] Broadcasting trading update to ${clients.size} clients for ${event.walletAddress}`);

  broadcast({
    type: 'trading_update',
    data: event
  });
}

/**
 * Get number of connected clients (for testing/monitoring)
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * Close WebSocket server and cleanup resources
 */
export function closeWebSocket(): void {
  // Stop periodic stats broadcast
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }

  if (wss) {
    wss.close();
    wss = null;
  }
  clients.clear();
}
