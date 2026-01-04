/**
 * Express REST API Server
 *
 * TDD: GREEN phase - Implementation to make tests pass.
 * Provides REST endpoints for the Polymarket whale tracker frontend.
 */

import express from "express";
import cors from "cors";
import type { Express, Request, Response, NextFunction } from "express";

/**
 * Creates and configures the Express application.
 * Separated from server startup for testing purposes.
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Stats endpoint - returns dashboard statistics
  app.get("/api/stats", (_req: Request, res: Response) => {
    // TODO: Connect to actual database in Step 5
    res.json({
      whaleCount: 42,
      totalVolume: 15750000,
      alertsToday: 12,
      newWhalesThisWeek: 5,
    });
  });

  // Wallets list endpoint with pagination
  app.get("/api/wallets", (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // TODO: Connect to actual database in Step 5
    const mockWallets = [
      {
        address: "0x1234567890123456789012345678901234567890",
        totalDeposited: 500000,
        depositCount: 15,
        firstSeen: "2024-01-15T10:30:00Z",
        lastActive: "2024-03-20T14:45:00Z",
      },
      {
        address: "0xabcdef1234567890abcdef1234567890abcdef12",
        totalDeposited: 350000,
        depositCount: 8,
        firstSeen: "2024-02-01T08:00:00Z",
        lastActive: "2024-03-19T16:30:00Z",
      },
    ];

    res.json({
      wallets: mockWallets,
      total: mockWallets.length,
      page,
      limit,
    });
  });

  // Single wallet endpoint
  app.get("/api/wallets/:address", (req: Request, res: Response) => {
    const { address } = req.params;

    // Validate Ethereum address format
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(address)) {
      res.status(400).json({
        error: "Invalid wallet address format",
      });
      return;
    }

    // TODO: Connect to actual database in Step 5
    // For now, return 404 for any address (mock behavior)
    res.status(404).json({
      error: "Wallet not found",
    });
  });

  // Deposits list endpoint with pagination and filtering
  app.get("/api/deposits", (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const walletFilter = req.query.wallet as string | undefined;

    // TODO: Connect to actual database in Step 5
    let mockDeposits = [
      {
        id: "1",
        walletAddress: "0x1234567890123456789012345678901234567890",
        amount: 50000,
        txHash: "0xabc123...",
        createdAt: "2024-03-20T14:45:00Z",
      },
      {
        id: "2",
        walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        amount: 25000,
        txHash: "0xdef456...",
        createdAt: "2024-03-19T16:30:00Z",
      },
      {
        id: "3",
        walletAddress: "0x1234567890123456789012345678901234567890",
        amount: 75000,
        txHash: "0xghi789...",
        createdAt: "2024-03-18T10:00:00Z",
      },
    ];

    // Filter by wallet if provided
    if (walletFilter) {
      mockDeposits = mockDeposits.filter(
        (d) => d.walletAddress.toLowerCase() === walletFilter.toLowerCase()
      );
    }

    // Already sorted by createdAt descending (mock data is pre-sorted)

    res.json({
      deposits: mockDeposits,
      total: mockDeposits.length,
      page,
      limit,
    });
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
 * Start the server (only when run directly, not in tests)
 */
export function startServer(port: number = 3001): void {
  const app = createApp();
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}
