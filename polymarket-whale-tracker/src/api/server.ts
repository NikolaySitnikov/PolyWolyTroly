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
import { tradingCache } from "../services/polymarketTradingCache.js";
import { polymarketApi } from "../services/polymarketApi.js";
import { ctfEventListener, detectionDb, marketMetadataService, marketDepthService, fundingAnalyzer, walletRiskService, loadConfig, updateConfig } from "../services/insiderDetection/index.js";

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
    const ctfHealthStatus = ctfEventListener.getHealthStatus();
    const marketMetadataStatus = marketMetadataService.getStatus();
    const marketDepthStatus = marketDepthService.getStatus();

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
      ctfListener: {
        listening: ctfHealthStatus.isRunning,
        healthy: ctfHealthStatus.healthy,
        lastHeartbeatTime: ctfHealthStatus.lastHeartbeatTime?.toISOString() || null,
        lastEventTime: ctfHealthStatus.lastEventTime?.toISOString() || null,
        startTime: ctfHealthStatus.startTime?.toISOString() || null,
        consecutiveErrors: ctfHealthStatus.consecutiveErrors,
        transfersProcessed: ctfHealthStatus.transfersProcessed,
        transfersSkippedDuplicate: ctfHealthStatus.transfersSkippedDuplicate,
      },
      marketMetadata: {
        syncing: marketMetadataStatus.isRunning,
        lastSyncAt: marketMetadataStatus.lastSyncAt?.toISOString() || null,
        totalSynced: marketMetadataStatus.totalSynced,
        lastSyncDuration: marketMetadataStatus.lastSyncDuration,
        errors: marketMetadataStatus.errors,
      },
      marketDepth: {
        polling: marketDepthStatus.isRunning,
        lastPollAt: marketDepthStatus.lastPollAt?.toISOString() || null,
        totalSnapshots: marketDepthStatus.totalSnapshots,
        marketsPolled: marketDepthStatus.marketsPolled,
        lastPollDuration: marketDepthStatus.lastPollDuration,
        errors: marketDepthStatus.errors,
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

  // Wallets list endpoint with pagination, sorting, and filtering - connected to database
  // Market makers are automatically excluded via database query
  // Trading metrics: cached in database, refreshed by background cache warmer
  // Filters: profitable (pnl > 0), losing (pnl < 0), live (active in last 24h)
  app.get("/api/wallets", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Validate sort parameters (now includes 'pnl' for P&L sorting)
      const validSortFields = ['total_deposited', 'deposit_count', 'first_seen_at', 'pnl'];
      const validSortDirs = ['asc', 'desc'];

      const sortByParam = req.query.sortBy as string;
      const sortDirParam = req.query.sortDir as string;

      const sortBy = validSortFields.includes(sortByParam)
        ? sortByParam as 'total_deposited' | 'deposit_count' | 'first_seen_at' | 'pnl'
        : 'total_deposited';
      const sortDir = validSortDirs.includes(sortDirParam)
        ? sortDirParam as 'asc' | 'desc'
        : 'desc';

      // Parse filter parameter (comma-separated: profitable,losing,live)
      const filterParam = req.query.filter as string;
      const filters = filterParam
        ? filterParam.split(',').filter(f => ['profitable', 'losing', 'live'].includes(f)) as ('profitable' | 'losing' | 'live')[]
        : [];
      const hasFilters = filters.length > 0;

      // Transform DB row to API response format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformWallet = (wallet: any) => ({
        ...wallet,
        // Map snake_case DB columns to camelCase for API response
        pnl: wallet.pnl !== null ? parseFloat(wallet.pnl) : null,
        pnl7d: wallet.pnl_7d !== null ? parseFloat(wallet.pnl_7d) : null,
        pnl30d: wallet.pnl_30d !== null ? parseFloat(wallet.pnl_30d) : null,
        winRate: wallet.win_rate !== null ? parseFloat(wallet.win_rate) : null,
        portfolioValue: wallet.portfolio_value !== null ? parseFloat(wallet.portfolio_value) : null,
        totalTrades: wallet.total_trades,
        lastActivityAt: wallet.last_activity_at,
        isLive: wallet.is_live,
      });

      if (hasFilters) {
        // Use database-based filtering (trading metrics are cached in DB)
        // This is FAST - uses SQL indexes for filtering and sorting
        const result = await db.getFilteredWallets(page, limit, sortBy, sortDir, filters);

        res.json({
          wallets: result.wallets.map(transformWallet),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / limit),
        });
      } else {
        // No filters - standard pagination from DB with cached trading data
        const result = await db.getAllWallets(page, limit, sortBy, sortDir);

        res.json({
          wallets: result.wallets.map(transformWallet),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / limit),
        });

        // BACKGROUND: Prefetch adjacent pages for smooth navigation
        const prefetchPages = [page - 2, page - 1, page + 1, page + 2].filter(p => p > 0);
        for (const prefetchPage of prefetchPages) {
          db.getAllWallets(prefetchPage, limit, sortBy, sortDir)
            .then(prefetchResult => {
              const addresses = prefetchResult.wallets.map(w => w.address);
              import('../services/cacheWarmer.js').then(({ cacheWarmer }) => {
                cacheWarmer.warmAddresses(addresses);
              }).catch(() => {});
            })
            .catch(() => {});
        }
      }
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ error: "Failed to fetch wallets" });
    }
  });

  // Wallet trading data endpoint - fetches Polymarket trading metrics
  app.get("/api/wallets/:address/trading", async (req: Request, res: Response) => {
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

      const forceRefresh = req.query.refresh === "true";
      const tradingData = await tradingCache.getOrFetchTradingData(address, forceRefresh);
      res.json(tradingData);
    } catch (error) {
      console.error("Error fetching trading data:", error);
      res.status(500).json({ error: "Failed to fetch trading data" });
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

  // Deposits list endpoint with pagination, filtering, and sorting - connected to database
  app.get("/api/deposits", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const walletFilter = req.query.wallet as string | undefined;
      const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined;

      // Validate sort parameters
      const validSortFields = ['amount', 'created_at', 'type'];
      const validSortDirs = ['asc', 'desc'];

      const sortByParam = req.query.sortBy as string;
      const sortDirParam = req.query.sortDir as string;

      const sortBy = validSortFields.includes(sortByParam)
        ? sortByParam as 'amount' | 'created_at' | 'type'
        : 'created_at';
      const sortDir = validSortDirs.includes(sortDirParam)
        ? sortDirParam as 'asc' | 'desc'
        : 'desc';

      const result = await db.getRecentDeposits(page, limit, walletFilter, minAmount, sortBy, sortDir);
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

  // Wallet activity endpoint - fetches paginated activity history
  app.get("/api/wallets/:address/activity", async (req: Request, res: Response) => {
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

      // Parse pagination parameters
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const activity = await polymarketApi.getActivity(address, limit + offset);
      const paginatedActivity = activity.slice(offset, offset + limit);

      res.json({
        activity: paginatedActivity,
        pagination: {
          limit,
          offset,
          count: paginatedActivity.length,
          hasMore: paginatedActivity.length === limit,
        },
      });
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Wallet closed positions endpoint - fetches historical settled positions
  app.get("/api/wallets/:address/closed-positions", async (req: Request, res: Response) => {
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

      // Parse pagination parameters
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      // Parse sort parameters
      const validSortFields = ['realizedpnl', 'timestamp', 'avgprice', 'totalbought'];
      const sortByParam = (req.query.sortBy as string || 'realizedpnl').toLowerCase();
      const sortBy = validSortFields.includes(sortByParam) ? sortByParam : 'realizedpnl';

      const sortDirParam = (req.query.sortDir as string || 'DESC').toUpperCase();
      const sortDirection = sortDirParam === 'ASC' ? 'ASC' : 'DESC';

      const positions = await polymarketApi.getClosedPositions(
        address,
        limit,
        offset,
        sortBy,
        sortDirection as 'ASC' | 'DESC'
      );

      res.json({
        positions,
        pagination: {
          limit,
          offset,
          count: positions.length,
          hasMore: positions.length === limit,
        },
      });
    } catch (error) {
      console.error("Error fetching closed positions:", error);
      res.status(500).json({ error: "Failed to fetch closed positions" });
    }
  });

  // ===========================================
  // DETECTION ENDPOINTS (Phase 0 - Insider Trading Detection)
  // ===========================================

  // Detection stats endpoint - returns insider detection dashboard statistics
  app.get("/api/detection/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await detectionDb.getStats();
      const ctfHealth = ctfEventListener.getHealthStatus();

      res.json({
        ...stats,
        ctfListener: {
          healthy: ctfHealth.healthy,
          transfersProcessed: ctfHealth.transfersProcessed,
        },
      });
    } catch (error) {
      console.error("Error fetching detection stats:", error);
      res.status(500).json({ error: "Failed to fetch detection stats" });
    }
  });

  // Detection alerts list endpoint with pagination and filters
  app.get("/api/detection/alerts", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      // Parse filters
      const status = req.query.status as string | undefined;
      const severity = req.query.severity as string | undefined;
      const alertType = req.query.alertType as string | undefined;
      const walletAddress = req.query.wallet as string | undefined;
      const conditionId = req.query.market as string | undefined;

      // Parse sort parameters
      const validSortFields = ["detected_at", "severity", "confidence_score", "status"];
      const sortByParam = req.query.sortBy as string;
      const sortDirParam = req.query.sortDir as string;
      const sortBy = validSortFields.includes(sortByParam) ? sortByParam : "detected_at";
      const sortDir = sortDirParam === "asc" ? "asc" : "desc";

      const result = await detectionDb.getAlerts(
        {
          status: status as any,
          severity: severity as any,
          alertType: alertType as any,
          walletAddress,
          conditionId,
        },
        { page, limit, sortBy, sortDir }
      );

      res.json(result);
    } catch (error) {
      console.error("Error fetching detection alerts:", error);
      res.status(500).json({ error: "Failed to fetch detection alerts" });
    }
  });

  // Single alert detail endpoint
  app.get("/api/detection/alerts/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
      const id = parseInt(idStr);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid alert ID" });
        return;
      }

      const alert = await detectionDb.getAlert(id);
      if (!alert) {
        res.status(404).json({ error: "Alert not found" });
        return;
      }

      res.json(alert);
    } catch (error) {
      console.error("Error fetching alert:", error);
      res.status(500).json({ error: "Failed to fetch alert" });
    }
  });

  // Update alert status endpoint
  app.patch("/api/detection/alerts/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
      const id = parseInt(idStr);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid alert ID" });
        return;
      }

      const { status, notes } = req.body;
      const validStatuses = ["new", "investigating", "confirmed", "dismissed"];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }

      const success = await detectionDb.updateAlertStatus(id, status, undefined, notes);
      if (!success) {
        res.status(404).json({ error: "Alert not found" });
        return;
      }

      const updatedAlert = await detectionDb.getAlert(id);
      res.json(updatedAlert);
    } catch (error) {
      console.error("Error updating alert:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  // ===========================================
  // MARKET METADATA ENDPOINTS (Phase 0.3)
  // ===========================================

  // Get list of active markets tracked in detection system
  app.get("/api/detection/markets", async (req: Request, res: Response) => {
    try {
      const nearResolutionHours = parseInt(req.query.nearResolution as string) || 0;

      let markets;
      if (nearResolutionHours > 0) {
        // Get markets near resolution (useful for detection monitoring)
        markets = await marketMetadataService.getMarketsNearResolution(nearResolutionHours);
      } else {
        // Get all active markets
        markets = await marketMetadataService.getActiveMarkets();
      }

      res.json({
        markets,
        total: markets.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching markets:", error);
      res.status(500).json({ error: "Failed to fetch markets" });
    }
  });

  // Get single market by condition ID
  app.get("/api/detection/markets/:conditionId", async (req: Request, res: Response) => {
    try {
      const conditionId = req.params.conditionId;
      const market = await marketMetadataService.getMarket(conditionId);

      if (!market) {
        res.status(404).json({ error: "Market not found" });
        return;
      }

      res.json(market);
    } catch (error) {
      console.error("Error fetching market:", error);
      res.status(500).json({ error: "Failed to fetch market" });
    }
  });

  // Trigger manual market sync (admin/debug endpoint)
  app.post("/api/detection/markets/sync", async (_req: Request, res: Response) => {
    try {
      const result = await marketMetadataService.triggerSync();
      res.json({
        message: "Sync completed",
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error triggering market sync:", error);
      res.status(500).json({ error: "Failed to trigger sync" });
    }
  });

  // ============================================
  // Market Depth Endpoints (Phase 0.4)
  // ============================================

  // Get latest depth snapshot for a market
  app.get("/api/detection/depth/:conditionId", async (req: Request, res: Response) => {
    try {
      const conditionId = req.params.conditionId as string;
      const snapshot = await marketDepthService.getLatestDepth(conditionId);

      if (!snapshot) {
        res.status(404).json({ error: "No depth data found for this market" });
        return;
      }

      res.json({
        conditionId,
        snapshot,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching market depth:", error);
      res.status(500).json({ error: "Failed to fetch market depth" });
    }
  });

  // Get depth history for a market
  app.get("/api/detection/depth/:conditionId/history", async (req: Request, res: Response) => {
    try {
      const conditionId = req.params.conditionId as string;
      const hours = parseInt(req.query.hours as string) || 24;

      const snapshots = await marketDepthService.getDepthHistory(conditionId, hours);

      res.json({
        conditionId,
        hours,
        count: snapshots.length,
        snapshots,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching depth history:", error);
      res.status(500).json({ error: "Failed to fetch depth history" });
    }
  });

  // Get liquidity at specific tick level
  app.get("/api/detection/depth/:conditionId/liquidity", async (req: Request, res: Response) => {
    try {
      const conditionId = req.params.conditionId as string;
      const tickLevel = parseInt(req.query.ticks as string) || 2;

      // Validate tick level
      if (![2, 5, 10].includes(tickLevel)) {
        res.status(400).json({ error: "Invalid tick level. Use 2, 5, or 10." });
        return;
      }

      const liquidity = await marketDepthService.getLiquidityAtTick(
        conditionId,
        tickLevel as 2 | 5 | 10
      );

      if (!liquidity) {
        res.status(404).json({ error: "No liquidity data found for this market" });
        return;
      }

      res.json({
        conditionId,
        tickLevel,
        liquidity,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching liquidity:", error);
      res.status(500).json({ error: "Failed to fetch liquidity" });
    }
  });

  // Calculate depth ratio for a trade size
  app.get("/api/detection/depth/:conditionId/ratio", async (req: Request, res: Response) => {
    try {
      const conditionId = req.params.conditionId as string;
      const tradeSizeUsd = parseFloat(req.query.size as string);
      const tickLevel = parseInt(req.query.ticks as string) || 2;

      if (!tradeSizeUsd || isNaN(tradeSizeUsd)) {
        res.status(400).json({ error: "Invalid or missing 'size' query parameter" });
        return;
      }

      if (![2, 5, 10].includes(tickLevel)) {
        res.status(400).json({ error: "Invalid tick level. Use 2, 5, or 10." });
        return;
      }

      const ratio = await marketDepthService.calculateDepthRatio(
        conditionId,
        tradeSizeUsd,
        tickLevel as 2 | 5 | 10
      );

      if (ratio === null) {
        res.status(404).json({ error: "No liquidity data to calculate ratio" });
        return;
      }

      res.json({
        conditionId,
        tradeSizeUsd,
        tickLevel,
        depthRatio: ratio,
        interpretation: ratio >= 3 ? "HIGH_IMPACT" : ratio >= 1 ? "MEDIUM_IMPACT" : "LOW_IMPACT",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error calculating depth ratio:", error);
      res.status(500).json({ error: "Failed to calculate depth ratio" });
    }
  });

  // Trigger manual depth poll
  app.post("/api/detection/depth/poll", async (_req: Request, res: Response) => {
    try {
      const marketCount = await marketDepthService.pollAllMarkets();
      res.json({
        message: "Poll completed",
        marketsPolled: marketCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error triggering depth poll:", error);
      res.status(500).json({ error: "Failed to trigger depth poll" });
    }
  });

  // ============================================
  // FUNDING ANALYSIS ENDPOINTS
  // ============================================

  // Get wallet funding profile
  app.get("/api/detection/wallets/:address/funding", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const forceRefresh = req.query.refresh === "true";

      const profile = await fundingAnalyzer.getFundingProfile(address);

      res.json({
        walletAddress: address,
        ...profile,
      });
    } catch (error) {
      console.error("Error getting wallet funding:", error);
      res.status(500).json({ error: "Failed to get wallet funding" });
    }
  });

  // Analyze funding sources for a wallet (with optional force refresh)
  app.post("/api/detection/wallets/:address/funding/analyze", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const { forceRefresh, minAmount } = req.body as {
        forceRefresh?: boolean;
        minAmount?: number;
      };

      const analysis = await fundingAnalyzer.analyzeFundingSources(address, {
        forceRefresh,
        minAmount,
      });

      res.json({
        walletAddress: address,
        ...analysis,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error analyzing wallet funding:", error);
      res.status(500).json({ error: "Failed to analyze wallet funding" });
    }
  });

  // Check if wallet was recently funded
  app.get("/api/detection/wallets/:address/funding/recent", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const hoursThreshold = parseInt(req.query.hours as string) || 24;

      const result = await fundingAnalyzer.isRecentlyFunded(address, hoursThreshold);

      res.json({
        walletAddress: address,
        hoursThreshold,
        ...result,
      });
    } catch (error) {
      console.error("Error checking recent funding:", error);
      res.status(500).json({ error: "Failed to check recent funding" });
    }
  });

  // Find wallets with the same funding source (cluster detection)
  app.get("/api/detection/funding/clusters/:sourceAddress", async (req: Request, res: Response) => {
    try {
      const { sourceAddress } = req.params;

      const wallets = await fundingAnalyzer.findWalletsWithSameFunder(sourceAddress);

      res.json({
        sourceAddress,
        walletCount: wallets.length,
        wallets,
      });
    } catch (error) {
      console.error("Error finding wallet clusters:", error);
      res.status(500).json({ error: "Failed to find wallet clusters" });
    }
  });

  // ============================================
  // WALLET RISK PROFILE ENDPOINTS (Phase 0.7)
  // ============================================

  // Get wallet risk profile
  app.get("/api/detection/wallets/:address/risk", async (req: Request, res: Response) => {
    try {
      const addressParam = req.params.address;
      const address = Array.isArray(addressParam) ? addressParam[0] : addressParam;
      const forceRefresh = req.query.refresh === "true";

      const profile = await walletRiskService.getRiskProfile(address, { forceRefresh });

      res.json(profile);
    } catch (error) {
      console.error("Error getting wallet risk profile:", error);
      res.status(500).json({ error: "Failed to get wallet risk profile" });
    }
  });

  // ============================================
  // DETECTION CONFIG ENDPOINTS (Phase 0.7)
  // ============================================

  // Get all detection configuration
  app.get("/api/detection/config", async (_req: Request, res: Response) => {
    try {
      const config = await loadConfig();
      res.json({
        config,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error getting detection config:", error);
      res.status(500).json({ error: "Failed to get detection config" });
    }
  });

  // Update a specific config key
  app.patch("/api/detection/config/:key", async (req: Request, res: Response) => {
    try {
      const keyParam = req.params.key;
      const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;
      const { value } = req.body;

      // Validate key
      const validKeys = [
        "wallet_age_days",
        "funding_amount",
        "trade_timing_hours",
        "entry_odds_pct",
        "concentration_pct",
      ];

      if (!validKeys.includes(key)) {
        res.status(400).json({
          error: "Invalid config key",
          validKeys,
        });
        return;
      }

      if (value === undefined) {
        res.status(400).json({ error: "Missing 'value' in request body" });
        return;
      }

      const success = await updateConfig(key as any, value);

      if (!success) {
        res.status(500).json({ error: "Failed to update config" });
        return;
      }

      // Return updated config
      const updatedConfig = await loadConfig();
      res.json({
        message: "Config updated successfully",
        key,
        config: updatedConfig,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating detection config:", error);
      res.status(500).json({ error: "Failed to update detection config" });
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

  // Start cache warmer for trading data (background)
  try {
    const { cacheWarmer } = await import('../services/cacheWarmer.js');
    // Don't await - let it warm in background while server is ready
    cacheWarmer.start();
    console.log('Cache warmer started - trading data will be pre-fetched');
  } catch (error) {
    console.error('Failed to start cache warmer:', error);
    console.log('Trading data will be fetched on-demand instead');
  }

  // Start CTF event listener for insider detection (Phase 0)
  try {
    await ctfEventListener.startListening();
    console.log('CTF event listener started - tracking ERC-1155 transfers');
  } catch (error) {
    console.error('Failed to start CTF event listener:', error);
    console.log('Insider detection CTF tracking will be unavailable');
  }

  // Start market metadata service for insider detection (Phase 0.3)
  try {
    // Warm market cache (fetches active markets from Gamma API)
    // Don't await - let it warm in background while server is ready
    marketMetadataService.warmCache().catch(err => {
      console.error('Market cache warming error:', err);
    });
    // Start background sync (every 5 minutes)
    marketMetadataService.startBackgroundSync();
    console.log('Market metadata service started - syncing from Gamma API');
  } catch (error) {
    console.error('Failed to start market metadata service:', error);
    console.log('Market metadata will be fetched on-demand instead');
  }

  // Start market depth service for insider detection (Phase 0.4)
  try {
    // Start background polling (every 30 seconds by default)
    // Polls CLOB API for order book depth on all active markets
    marketDepthService.startPolling();
    console.log('Market depth service started - polling CLOB API for order book depth');
  } catch (error) {
    console.error('Failed to start market depth service:', error);
    console.log('Market depth data will be unavailable');
  }

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.close();
    process.exit(0);
  });
}
