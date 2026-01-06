/**
 * Express REST API Server
 *
 * TDD: GREEN phase - Implementation to make tests pass.
 * Provides REST endpoints for the PolyWolyTroly frontend.
 *
 * Step 5 (Fixed): Now connected to real PostgreSQL database.
 */

import express from "express";
import cors from "cors";
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../services/database.js";
import { trendingMarketsService } from "../services/trendingMarkets.js";
import { blockchain } from "../services/blockchain.js";

/**
 * Creates and configures the Express application.
 * Separated from server startup for testing purposes.
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint - includes blockchain listener status
  app.get("/api/health", (_req: Request, res: Response) => {
    const healthStatus = blockchain.getHealthStatus();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      blockchain: {
        listening: healthStatus.isRunning,
        healthy: healthStatus.healthy,
        lastHeartbeatTime: healthStatus.lastHeartbeatTime?.toISOString() || null,
        lastEventTime: healthStatus.lastEventTime?.toISOString() || null,
        startTime: healthStatus.startTime?.toISOString() || null,
        consecutiveErrors: healthStatus.consecutiveErrors,
      },
    });
  });

  // Stats endpoint - returns dashboard statistics from database
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await db.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Wallets list endpoint with pagination and sorting - connected to database
  app.get("/api/wallets", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Validate sort parameters
      const validSortFields = ['total_deposited', 'deposit_count', 'first_seen_at'];
      const validSortDirs = ['asc', 'desc'];

      const sortByParam = req.query.sortBy as string;
      const sortDirParam = req.query.sortDir as string;

      const sortBy = validSortFields.includes(sortByParam)
        ? sortByParam as 'total_deposited' | 'deposit_count' | 'first_seen_at'
        : 'total_deposited';
      const sortDir = validSortDirs.includes(sortDirParam)
        ? sortDirParam as 'asc' | 'desc'
        : 'desc';

      const result = await db.getAllWallets(page, limit, sortBy, sortDir);
      res.json(result);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ error: "Failed to fetch wallets" });
    }
  });

  // Single wallet endpoint - connected to database
  app.get("/api/wallets/:address", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      // Validate Ethereum address format
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(address)) {
        res.status(400).json({
          error: "Invalid wallet address format",
        });
        return;
      }

      const wallet = await db.getWallet(address);
      if (!wallet) {
        res.status(404).json({
          error: "Wallet not found",
        });
        return;
      }

      res.json(wallet);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  // Deposits list endpoint with pagination and filtering - connected to database
  app.get("/api/deposits", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const walletFilter = req.query.wallet as string | undefined;
      const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined;

      const result = await db.getRecentDeposits(page, limit, walletFilter, minAmount);
      res.json(result);
    } catch (error) {
      console.error("Error fetching deposits:", error);
      res.status(500).json({ error: "Failed to fetch deposits" });
    }
  });

  // Whale of the Day endpoint - top depositor in last 24 hours
  app.get("/api/whale-of-the-day", async (_req: Request, res: Response) => {
    try {
      const whale = await db.getWhaleOfTheDay();
      if (!whale) {
        res.json(null);
        return;
      }
      res.json(whale);
    } catch (error) {
      console.error("Error fetching whale of the day:", error);
      res.status(500).json({ error: "Failed to fetch whale of the day" });
    }
  });

  // Trending markets endpoint - fetches from Polymarket Gamma API
  app.get("/api/markets/trending", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 8;
      const markets = await trendingMarketsService.getTrendingMarkets(limit);

      res.json({
        markets,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching trending markets:", error);
      res.status(500).json({ error: "Failed to fetch trending markets" });
    }
  });

  // 404 handler for unknown API routes (Express 5 syntax)
  app.use("/api/{*path}", (_req: Request, res: Response) => {
    res.status(404).json({
      error: "Not found",
    });
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal server error",
    });
  });

  return app;
}

/**
 * Start the server with WebSocket support and blockchain listener
 */
export async function startServer(port: number = 3001): Promise<void> {
  const app = createApp();

  // Import WebSocket module
  const { initWebSocket } = await import('./websocket.js');

  const server = app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
    console.log(`WebSocket server running on ws://localhost:${port}`);
  });

  // Initialize WebSocket on the same server
  initWebSocket(server);

  // Start blockchain listener for instant deposit detection
  try {
    const { blockchain } = await import('../services/blockchain.js');
    await blockchain.startListening();
    console.log('Blockchain listener started - deposits will push instantly');
  } catch (error) {
    console.error('Failed to start blockchain listener:', error);
    console.log('WebSocket will still work, but deposits won\'t push automatically');
  }

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.close();
    process.exit(0);
  });
}
