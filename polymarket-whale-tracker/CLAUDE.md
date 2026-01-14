# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend Tracker Development
npm run dev          # Run with hot-reload (nodemon + tsx)
npx tsx src/index.ts # Run directly without compilation
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled JS from dist/

# API Server (serves frontend dashboard)
npm run start:api    # Start API server on port 3001 (compiled)
npm run dev:api      # Start with hot-reload (nodemon + tsx)

# Frontend Development
cd frontend
npm run dev          # Start Vite dev server on port 5173
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run frontend tests (126 tests)

# Database
npm run db:setup     # Create PostgreSQL schema (wallets, deposits, notifications tables)

# Testing
npm test             # Run backend tests
npm run test:watch   # Run tests in watch mode
npm test -- src/services/blockchain.test.ts  # Run single test file
```

## Architecture

PolyWolyTroly - Real-time monitoring of large USDC deposits to Polymarket on Polygon. Has three main components:
1. **Backend Tracker**: Monitors blockchain, sends Telegram alerts
2. **API Server**: REST API + WebSocket server for web dashboard
3. **Frontend Dashboard**: React web app for visualizing whale activity

### Backend Tracker Data Flow
1. **blockchain.ts** - WebSocket listener (viem) watches USDC Transfer events to Polymarket Exchange
2. **walletTracker.ts** - Determines if depositor is new using 3-layer lookup:
   - Redis cache (fast path)
   - PostgreSQL database (our records)
   - Polymarket Data API (true historical activity)
3. **polymarketApi.ts** - Queries Polymarket's public API to check wallet history
4. **notifications.ts** - Sends Telegram alert with "FIRST TIME DEPOSIT" or "Returning user" status
5. **database.ts** - PostgreSQL persistence (pg) for wallets/deposits/notifications
6. **cache.ts** - Redis (ioredis) for fast wallet lookups, block tracking, and deduplication

### API Server (src/api/server.ts)
REST API + WebSocket server that powers the web dashboard:
- **GET /api/health** - Health check
- **GET /api/stats** - Dashboard statistics (whale count, volume, alerts)
- **GET /api/wallets** - Paginated whale list with search/sort
- **GET /api/wallets/:address** - Individual wallet details
- **GET /api/wallets/:address/trading** - Trading data (positions, activity, metrics, profile)
- **GET /api/deposits** - Recent deposit history
- **GET /api/markets/trending** - Top prediction markets by whale volume
- **WS /ws** - Real-time deposit events via WebSocket

### Frontend (frontend/)
React + TypeScript + Vite dashboard with cyberpunk terminal aesthetic:
- **Dashboard**: Real-time stats with live WebSocket updates
- **Whale Table**: Searchable, sortable list with pagination
- **Alert Feed**: Live deposit notifications
- **Wallet Profiles**: Individual wallet details, transaction history, and trading performance
  - **Position Search**: Filter positions by market name with real-time search (ProfileTabs component)
  - **Trading Metrics**: P&L, win rate, portfolio value with time window toggles (7D/30D/ALL)
- **Trending Markets**: Top markets by whale activity
- **Settings**: User preferences, theme, notifications
- **780+ tests** with Vitest + React Testing Library

### Recent UI Enhancements

#### Size/Shares Toggle Feature
The positions table (desktop and mobile) supports toggling between dollar value and share count:
- **Desktop**: Click Size column header or hover cells to preview alternate value (150ms delay crossfade)
- **Mobile**: Tap the Position metric box to toggle; syncs with sort field automatically
- Sort pill stays highlighted when sorted by either `currentValue` ($ mode) or `size` (shares mode)

#### Mobile UX Improvements
- **Status filter pills** (Active, Redeemable, All, Closed) now horizontally scrollable on mobile
- **Sort pills** highlight correctly when toggling between $ and shares modes
- **Auto-resort on toggle**: When sorted by Size on mobile, toggling display mode automatically re-sorts

#### Sortable Column Hover Highlighting
Desktop table headers have hover highlighting for sortable columns:
- **WhaleTable**: Total Deposited, Deposits, First Seen columns
- **AlertFeed**: Amount, Time columns
- **PositionsTable**: Market, Size, P&L columns
- Inactive columns transition from grey to white on hover (0.15s ease)

#### Sports Category Detection
Enhanced `CategoryTag.tsx` with comprehensive team databases for accurate sports detection:
- WCC college basketball teams (Pepperdine, Gonzaga, San Diego Toreros, etc.)
- Saudi Pro League teams (Al Nassr, Al Hilal, Al Ittihad, etc.)
- Full coverage of NFL, NBA, MLB, NHL, Premier League, La Liga, Bundesliga, Serie A, Ligue 1
- College football FBS conferences (SEC, Big Ten, Big 12, ACC, Pac-12, etc.)

### Trading Data Integration (In Progress)
Integration of Polymarket trading data (P&L, positions, activity) for each whale:

**Frontend Types** (src/types/):
- `polymarket.ts` - Polymarket API types (positions, activity, trades, profiles)
- `position.ts` - Position interface with category configs and sorting
- `activity.ts` - Activity interface with type configs and filtering
- `profile.ts` - UserProfile interface with avatar utilities
- `whale.ts` - Extended with trading fields (pnl, winRate, portfolioValue, etc.)

**Frontend Hooks** (src/hooks/):
- `usePositions.ts` - Fetch positions with pagination, sorting, filtering
- `useActivity.ts` - Fetch activity with pagination, type filtering, load-more
- `useProfile.ts` - Fetch Gamma API profile
- `usePolymarketTrading.ts` - Combined hook for all trading data

**Frontend Components** (src/components/):
- `ProfileTabs.tsx` - Tab navigation (Positions/Activity/Deposits) with integrated search
  - Desktop: search input inline with tabs on right side
  - Mobile: search bar in separate row below tabs
  - Uses React state for focus management to ensure proper blur behavior
- `PositionsTable.tsx` - Desktop table view for positions with sortable columns
- `PositionCard.tsx` - Mobile card view for individual positions

### Key Services

#### polymarketApi.ts
Queries `https://data-api.polymarket.com/activity?user={address}` to determine if a wallet has ever used Polymarket:
- `hasHistoricalActivity(address)` - Returns true if wallet has any activity
- `getActivityCount(address)` - Returns number of activities (up to 500)
- `getFirstActivityTimestamp(address)` - Returns timestamp of first activity

#### walletTracker.ts
- `isNewWallet(address)` - 3-layer check: cache → database → Polymarket API
- `ensureWalletExists(address, amount, txHash)` - Creates wallet record if not in DB
- `processDeposit(address, amount, txHash, blockNumber)` - Main entry point, returns `{isNew, depositId}`

#### cache.ts (Deduplication)
- `acquireTransactionLock(txHash)` - Distributed lock (60s TTL, NX) prevents race conditions
- `isTransactionProcessed(txHash)` - Check if notification was already sent (7-day TTL)
- `markTransactionProcessed(txHash)` - Mark transaction as fully processed after notification

### Key Constants (src/utils/constants.ts)
- USDC contract: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- Polymarket Exchange: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
- CTF Exchange: `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045`
- USDC has 6 decimals

### Insider Detection Module (src/services/insiderDetection/)

Module for detecting suspicious trading patterns on Polymarket. **Phase 0 COMPLETE** (0.1-0.9).

**Database Tables** (7 new tables via migration 002):
- `markets` - Market metadata, resolution times, volume tracking
- `depth_snapshots` - Order book depth at 2/5/10 tick levels
- `wallet_activity` - Per-market wallet activity index
- `wallet_funding_sources` - 1-hop funding source analysis
- `ctf_transfers` - ERC-1155 token movements
- `detection_alerts` - Suspicious pattern alerts with severity/status
- `detection_config` - Configurable detection thresholds

**Services**:
- `types.ts` - TypeScript interfaces for all detection entities
- `detectionDatabase.ts` - CRUD operations for detection tables
- `detectionCache.ts` - Redis caching with TTLs (market: 5min, depth: 30s, wallet: 5min)
- `config.ts` - Threshold configuration loader with helper functions
- `ctfEventListener.ts` - Real-time ERC-1155 event listener for CTF token transfers
  - Monitors TransferSingle and TransferBatch events on CTF Exchange
  - Same robust pattern as `blockchain.ts` (heartbeat, health tracking, auto-restart)
  - Redis deduplication prevents duplicate processing
  - Filters mints/burns, stores wallet-to-wallet transfers in `ctf_transfers` table
  - Automatically updates wallet activity index on each transfer
- `marketMetadataService.ts` - Gamma API integration for market metadata
  - Syncs active markets from `gamma-api.polymarket.com/markets`
  - Extracts CLOB token IDs, resolution times, volume, liquidity
  - Background sync every 5 minutes
  - Cache warming on startup
  - Resolution tracking (detects when markets resolve)
  - Stores in `markets` table for detection analysis
- `marketDepthService.ts` - CLOB API integration for order book depth
  - Fetches order books from `clob.polymarket.com/book`
  - Extracts depth at 2/5/10 tick levels from mid price
  - Calculates bid/ask liquidity, mid price, spread
  - Background polling every 30 seconds
  - Hourly 30-day median liquidity calculation
  - Rate limiting (5 req/s) and batch processing
  - `calculateDepthRatio()` - Compare trade size to available liquidity
- `walletActivityIndex.ts` - Per-market wallet activity tracking
  - Process CTF transfers and update activity for buyer/seller
  - Track volume, trade count, net position, avg entry price, realized PnL
  - Calculate volume share (concentration metric)
  - `getWalletConcentration()` - Top market and volume share
  - `getHighConcentrationWallets()` - Find wallets with ≥70% in one market
  - `getNewWalletActivity()` - Find wallets trading soon after first trade
  - `backfillFromTransfers()` - Backfill from existing CTF transfer history
  - Auto-triggers funding analysis for new wallets on first trade
- `fundingAnalyzer.ts` - Wallet funding source analysis
  - Alchemy Asset Transfers API for 1-hop funding source lookup
  - Address classification: `cex`, `bridge`, `contract`, `eoa`, `unknown`
  - Known address labels: 12+ CEXs (Binance, Coinbase, Kraken, OKX, etc.)
  - Known address labels: 10+ bridges (Polygon Bridge, Hop, Stargate, etc.)
  - `analyzeFundingSources()` - Fetch and classify all funding transfers
  - `updateTimingMetrics()` - Calculate hours between funding and first trade
  - `findWalletsWithSameFunder()` - Find wallet clusters from same source
  - `isRecentlyFunded()` - Check if wallet was funded within N hours
  - `getFundingProfile()` - Comprehensive profile with related wallets
  - Rate limiting (200ms) and retry logic (3 retries)
  - Cache results for 30 minutes
- `walletRiskService.ts` - Comprehensive wallet risk assessment
  - Combines wallet age, funding patterns, activity concentration, and alert history
  - Weighted risk scoring: age (25%), funding (30%), activity (25%), alerts (20%)
  - Risk levels: CRITICAL (≥80), HIGH (≥60), MEDIUM (≥40), LOW (≥20), UNKNOWN (<20)
  - Human-readable risk factor descriptions
  - `getRiskProfile()` - Full risk profile with all factors
  - `getRiskLevel()` - Quick risk level only (for list views)
  - `isHighRisk()` - Boolean check for HIGH/CRITICAL wallets
  - `invalidateProfile()` - Clear cached risk profile
  - Cached for 5 minutes

**Default Thresholds** (from `detection_config` table):
- Wallet age: <14 days = HIGH, <30 days = MEDIUM
- Funding: ≥$3,000 OR ≥5% of market 24h volume
- Trade timing: <2h from funding = HIGH, <24h = MEDIUM
- Entry odds: ≤15% OR price moved >8% in 1h
- Concentration: ≥85% wallet level, ≥70% cluster level

**Usage**:
```typescript
import {
  detectionDb, detectionCache, loadConfig, runAllChecks,
  ctfEventListener, marketMetadataService, marketDepthService,
  walletActivityIndex, fundingAnalyzer, walletRiskService
} from "./services/insiderDetection/index.js";

// Check thresholds
const result = await runAllChecks({
  walletAgeDays: 10,
  fundingAmountUsd: 5000,
  hoursFromFunding: 1,
});
// result.overallSuspicious = true, result.triggeredChecks = ['wallet_age_HIGH', 'timing_HIGH']

// CTF Event Listener (auto-updates wallet activity on each transfer)
await ctfEventListener.startListening();
const health = ctfEventListener.getHealthStatus();
// { isRunning: true, healthy: true, transfersProcessed: 42, ... }

// Market Depth Service
marketDepthService.startPolling();  // Start 30s polling
const depth = await marketDepthService.getLatestDepth("0xcondition...");
const ratio = await marketDepthService.calculateDepthRatio("0xcondition...", 5000, 2);
// ratio = trade size / available liquidity at 2-tick level

// Wallet Activity Index
const concentration = await walletActivityIndex.getWalletConcentration("0xwallet...");
// { topMarket: { conditionId, volumeShare: 85 }, totalVolume: 10000, marketCount: 3 }
const highConcentration = await walletActivityIndex.getHighConcentrationWallets("0xcondition...", 70);
// Wallets with ≥70% of their volume in this market

// Funding Analyzer
const profile = await fundingAnalyzer.getFundingProfile("0xwallet...");
// { sources: [...], totalFunded: 15000, primarySourceType: "cex", relatedWallets: [...] }
const recentlyFunded = await fundingAnalyzer.isRecentlyFunded("0xwallet...", 24);
// { isRecent: true, hoursAgo: 3, fundingSource: { sourceType: "cex", sourceLabel: "Binance" } }
const cluster = await fundingAnalyzer.findWalletsWithSameFunder("0xbinance...");
// ["0xwallet1", "0xwallet2", ...] - wallets all funded from same source

// Wallet Risk Service
const riskProfile = await walletRiskService.getRiskProfile("0xwallet...");
// { riskLevel: "HIGH", riskScore: 65, walletAge: {...}, funding: {...}, activity: {...}, riskFactors: [...] }
const isHighRisk = await walletRiskService.isHighRisk("0xwallet...");
// true if CRITICAL or HIGH risk level
```

**API Endpoints** (Added to server.ts):
- `GET /api/detection/stats` - Detection dashboard statistics
- `GET /api/detection/alerts` - Paginated alert list with filters (type, severity, status)
- `GET /api/detection/alerts/:id` - Single alert detail
- `PATCH /api/detection/alerts/:id` - Update alert status (reviewed, dismissed, etc.)
- `GET /api/detection/markets` - List active markets (supports `?nearResolution=<hours>` filter)
- `GET /api/detection/markets/:conditionId` - Get single market details
- `POST /api/detection/markets/sync` - Trigger manual market sync
- `GET /api/detection/depth/:conditionId` - Latest depth snapshot for a market
- `GET /api/detection/depth/:conditionId/history` - Depth history (with `?hours=N` param)
- `GET /api/detection/depth/:conditionId/liquidity` - Liquidity at tick level (2/5/10)
- `GET /api/detection/depth/:conditionId/ratio` - Calculate depth ratio for trade size
- `POST /api/detection/depth/poll` - Trigger manual depth poll
- `GET /api/detection/wallets/:address/funding` - Get wallet funding profile
- `POST /api/detection/wallets/:address/funding/analyze` - Trigger funding analysis (with `forceRefresh`)
- `GET /api/detection/wallets/:address/funding/recent` - Check if recently funded (with `?hours=N`)
- `GET /api/detection/funding/clusters/:sourceAddress` - Find wallets funded by same source
- `GET /api/detection/wallets/:address/risk` - Comprehensive wallet risk profile
- `GET /api/detection/config` - Get all detection thresholds
- `PATCH /api/detection/config/:key` - Update specific threshold
- `GET /api/health` - Extended with `ctfListener`, `marketMetadata`, and `marketDepth` status

### Phase 1: Core Detection Engine (In Progress)

**Phase 1.1 - Database & Types Setup** ✅ COMPLETE

Added infrastructure for the three MVP detection rules:

**New Database Tables** (Migration 003):
- `price_history` - Token price tracking for Mark-to-Market (MTM) calculations
- `wallet_clusters` - Wallet relationship tracking (shared funders, timing correlation)
- `detection_rule_config` - Per-rule configuration with thresholds
- `pending_mtm_evaluations` - Queue for delayed price movement evaluation

**New Types** (in `types.ts`):
- `PriceHistory`, `PriceSource` - Price tracking types
- `WalletCluster`, `ClusterRelationshipType`, `ClusterSummary` - Cluster types
- `DetectionRuleConfig` - Rule configuration type
- `PendingMtmEvaluation` - Delayed evaluation tracking
- Threshold types for each rule: `FreshConcentratedDepthThresholds`, `PreMoveAdvantageThresholds`, `CoordinatedClusterThresholds`
- `RuleResult`, `RuleEvaluationContext` - Rule execution types

**Rule Types** (new `rules/types.ts`):
- `DetectionRule` interface - Base interface for all detection rules
- Rule-specific context, data, and result interfaces
- Confidence score helpers:
  - `normalizeLinear(value, min, max)` - Linear normalization 0-1
  - `normalizeLog(value, min, max)` - Log-scale normalization for heavy-tailed distributions
  - `normalizeInverse(value, min, max)` - Inverse normalization (lower = higher score)
  - `calculateWeightedScore(scores)` - Weighted average of multiple signals
  - `confidenceToSeverity(confidence)` - Map confidence to alert severity

**New Database Operations** (in `detectionDatabase.ts`):
- Price: `recordPrice()`, `getPrice()`, `getPriceHistory()`, `getLatestPrice()`
- Clusters: `recordClusterRelationship()`, `getWalletCluster()`, `getClusterById()`, `getClusterSummary()`, `getAllClusters()`, `deleteCluster()`
- Rule Config: `getRuleConfig()`, `getAllRuleConfigs()`, `updateRuleConfig()`
- MTM Evaluations: `createPendingMtmEvaluation()`, `getPendingMtmEvaluations()`, `markMtmEvaluationComplete()`, `cleanupOldMtmEvaluations()`

**New Cache Operations** (in `detectionCache.ts`):
- Price: `setLatestPrice()`, `getLatestPrice()`, `invalidateLatestPrice()`
- Clusters: `setClusterSummary()`, `getClusterSummary()`, `invalidateCluster()`, `setWalletClusterId()`, `getWalletClusterId()`, `invalidateWalletCluster()`
- Rule Config: `setRuleConfig()`, `getRuleConfig()`, `invalidateRuleConfig()`, `invalidateAllRuleConfigs()`

**Default Rule Configurations** (seeded by migration):
```
FreshConcentratedDepthImpact:
  max_wallet_age_days: 14
  min_concentration_pct: 85
  min_trade_size_usd: 3000
  min_depth_ratio: 3.0

PreMoveAdvantage:
  min_trade_size_usd: 3000
  min_mtm_gain_pct: 8
  lookback_hours: 1
  vol_multiplier: 1.5

CoordinatedCluster:
  min_cluster_size: 3
  min_total_notional_usd: 50000
  max_median_age_days: 45
  time_window_hours: 6
```

**Tests**: 42 new tests for Phase 1.1 (161 total insider detection tests)
- `phase1Types.test.ts` - 27 tests for types and confidence helpers
- `phase1Database.test.ts` - 15 integration tests for new database operations

**Phase 1.2 - Price History Service** ✅ COMPLETE

New service for tracking token prices over time for Mark-to-Market (MTM) calculations:

**New Service** (`priceHistoryService.ts`):
- `recordPrice(conditionId, price, tokenId, source)` - Store price snapshot
- `getPrice(conditionId, timestamp)` - Get historical price closest to timestamp
- `getLatestPrice(conditionId)` - Get most recent price (cached)
- `getPriceChange(conditionId, fromTime, toTime)` - Calculate % change
- `calculateMTM(conditionId, entryPrice, entryTime, afterHours, side)` - Mark-to-market gain calculation
- `getVolatility(conditionId, hours)` - Calculate price volatility (std dev of returns)
- `isVolatileRegime(conditionId, recentHours, historicalHours, multiplier)` - Detect volatile conditions
- `recordPriceFromDepth(conditionId, midPrice, tokenId)` - Hook for marketDepthService
- `pollGammaFallback(markets, maxAgeMinutes)` - Fallback to Gamma API for stale prices
- `startGammaPolling(intervalMs)` / `stopGammaPolling()` - Background job management
- `getStatus()` / `resetStats()` - Service monitoring

**Integration with marketDepthService**:
- Prices are automatically recorded when depth snapshots are captured
- Mid-price from order book is stored with `source: 'clob'`
- Lazy import pattern avoids circular dependencies

**Tests**: 25 new tests for priceHistoryService (186 total insider detection tests)

**Upcoming Phases**:
- Phase 1.3: Cluster Service
- Phase 1.4-1.6: Three Detection Rules
- Phase 1.7: Detection Engine Orchestration
- Phase 1.8-1.11: Integration, API, Frontend, Testing

**Frontend Detection Page** (Phase 0.8):
Components at `frontend/src/components/detection/`:
- `DetectionDashboard.tsx` - Main dashboard with stats grid and alert list
- `DetectionAlertList.tsx` - Alert list with severity/status/type filter pills and pagination
- `AlertDetail.tsx` - Detailed alert view with status update actions
- `WalletRiskCard.tsx` - Risk profile visualization with risk meter and factor breakdown
- `index.ts` - Barrel exports

Hooks at `frontend/src/hooks/`:
- `useDetectionStats.ts` - Fetch detection statistics
- `useDetectionAlerts.ts` - Paginated alerts with filtering and status updates
- `useWalletRisk.ts` - Wallet risk profile fetching

Types at `frontend/src/types/detection.ts`:
- Alert types, severities, statuses
- Detection stats and wallet risk interfaces
- Color mappings and label helpers

Navigation: Detection accessible via `/detection` route or clicking "Detection" in nav.

**Performance Considerations**:
- Depth service polls top 100 markets by volume only (not all 5,500+)
- On-demand depth fetching for other markets via `captureDepthOnDemand()`
- See `Implementation/decisions/001_depth_polling_strategy.md` for rationale

### Required Environment Variables
- `ALCHEMY_WSS_URL` / `ALCHEMY_HTTP_URL` - Polygon RPC endpoints (PublicNode)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (local: `redis://localhost:6379`)
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` - Alert destination
- `MIN_DEPOSIT_AMOUNT` - Threshold in USD (default: 7500)

## Testing Patterns

Tests use vitest with extensive mocking. Each service mock follows this pattern:
```typescript
const mockFn = vi.fn();
vi.mock("./service.js", () => ({ service: { method: mockFn } }));
```

Always use `vi.resetModules()` in `beforeEach` when testing modules with side effects.

Test files:
- `blockchain.test.ts` - 18 tests for event processing and WebSocket handling
- `walletTracker.test.ts` - 15 tests for new wallet detection with Polymarket API
- `polymarketApi.test.ts` - 13 tests for Polymarket Data API integration
- `notifications.test.ts` - 12 tests for Telegram alerts
- `database.test.ts` - Tests for PostgreSQL operations
- `cache.test.ts` - Tests for Redis operations
- `index.test.ts` - Tests for main application startup
- `insiderDetection/__tests__/ctfEventListener.test.ts` - 7 tests for CTF event listener
- `insiderDetection/__tests__/marketMetadataService.test.ts` - 15 tests for market metadata
- `insiderDetection/__tests__/marketDepthService.test.ts` - 22 tests for order book depth
- `insiderDetection/__tests__/walletActivityIndex.test.ts` - 24 tests for wallet activity
- `insiderDetection/__tests__/fundingAnalyzer.test.ts` - 22 tests for funding source analysis
- `insiderDetection/__tests__/walletRiskService.test.ts` - 17 tests for wallet risk assessment
- `insiderDetection/__tests__/integration.test.ts` - 12 tests for full pipeline integration
- `insiderDetection/__tests__/phase1Types.test.ts` - 27 tests for Phase 1 types and confidence helpers
- `insiderDetection/__tests__/phase1Database.test.ts` - 15 integration tests for Phase 1 database operations
- `insiderDetection/__tests__/priceHistoryService.test.ts` - 25 tests for price history service

## Module System

ES Modules with `.js` extensions in imports (e.g., `import { x } from "./file.js"`). The `main()` function in index.ts uses `decodeURIComponent(import.meta.url)` to handle paths with spaces and avoid auto-execution during tests.

## MCP Browser Testing Guidelines

When using MCP tools (Playwright or Chrome DevTools) for testing or verification:

**DO NOT take screenshots.** Instead:
- Use `browser_snapshot` (Playwright) or `take_snapshot` (Chrome DevTools) for accessibility tree snapshots
- Use `browser_console_messages` or `list_console_messages` to check for errors
- Use `browser_network_requests` or `list_network_requests` to verify API calls
- Read the snapshot text output to verify UI state

Screenshots waste storage and are rarely needed when snapshots provide the same information in a more useful text format.

## Common Issues

### Path with spaces
The project path contains spaces. The `import.meta.url` returns URL-encoded paths (`%20` for spaces), but `process.argv[1]` uses regular spaces. Fixed with `decodeURIComponent()`.

### Foreign key constraints
When recording deposits, wallet must exist in database first. `ensureWalletExists()` handles this by creating the wallet record if it doesn't exist, even for returning Polymarket users who aren't in our database yet.

### Output buffering
Use `console.log` instead of pino logger for immediate output visibility during development.
