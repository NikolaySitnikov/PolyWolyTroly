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

export interface DepositEvent {
  walletAddress: string;
  amount: number;
  txHash: string;
  blockNumber: bigint;
  isNewWallet: boolean;
  depositId: number;
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

  return wss;
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
 * Get number of connected clients (for testing/monitoring)
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * Close WebSocket server
 */
export function closeWebSocket(): void {
  if (wss) {
    wss.close();
    wss = null;
  }
  clients.clear();
}
