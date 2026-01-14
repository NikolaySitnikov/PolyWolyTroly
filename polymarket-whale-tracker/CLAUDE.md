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

# PM2 Process Management (Production)
pm2 start ecosystem.config.cjs   # Start backend + frontend with auto-restart
pm2 list                         # Check status
pm2 logs polywoly-backend        # View backend logs
pm2 restart polywoly-backend     # Restart after code changes
pm2 stop all                     # Stop all services
pm2 kill                         # Kill PM2 daemon
```

### PM2 Auto-Restart (Recommended for Production)

Use PM2 for reliable service uptime. Configuration in `ecosystem.config.cjs`:

- **polywoly-backend**: Runs `dist/api/index.js` on port 3002
- **polywoly-frontend**: Runs `npm run dev -- --host` for hot-reload

Features:
- Auto-restart on crash (max 10 restarts in 15 min)
- Memory limit restart at 1GB
- Logs in `./logs/pm2-*.log`

**Important**: After code changes, rebuild and restart:
```bash
npm run build && pm2 restart polywoly-backend
```

See DEVELOPMENT.md for full PM2 command reference.

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

**Phase 1.3 - Cluster Service** ✅ COMPLETE

Service for building and managing wallet relationship clusters:

**New Service** (`clusterService.ts`):
- `buildSharedFunderEdges()` - Detect wallets funded from same source
- `buildTimingCorrelationEdges()` - Detect wallets trading same direction within time window
- `buildClusterGraph()` - Combine edges and assign cluster IDs using Union-Find
- `getWalletCluster(address)` - Get cluster membership with caching
- `getClusterActivity(clusterId, conditionId)` - Aggregate trading metrics across cluster
- `refreshClusters()` - Background job to rebuild cluster graph
- `getAllClusters()` / `deleteCluster()` - Cluster management
- `getClusterCount()` - Total cluster count

**Relationship Strength Calculation**:
- Funding timing proximity (closer = stronger)
- Funding amount similarity
- Trade timing proximity
- Trade volume similarity
- Filters: Skips CEX/bridge funders, ignores small funding (<$100)

**Tests**: 30 new tests for clusterService (216 total insider detection tests)

**Phase 1.4 - Rule #1: Fresh-Concentrated-Depth Impact** ✅ COMPLETE

First detection rule implementation:

**New Files**:
- `rules/ruleBase.ts` - Abstract base class for all detection rules
  - Configuration loading from database with cache fallback
  - Threshold get/set methods
  - Alert creation with deduplication
  - `notTriggered()` / `triggered()` result factories
- `rules/freshConcentratedDepth.ts` - Rule #1 implementation

**Detection Logic**:
Triggers when ALL four conditions are met:
1. Wallet age ≤ 14 days (or unknown)
2. Concentration ≥ 85% in single market
3. Trade size ≥ $3,000
4. Depth ratio ≥ 3.0x (trade vs available liquidity)

**Confidence Scoring**:
- Wallet age: 30% weight (younger = higher)
- Concentration: 25% weight (higher = higher)
- Depth ratio: 25% weight (higher = higher, log scale)
- Trade size: 20% weight (larger = higher, log scale)

**Severity Mapping**:
- ≥0.85 → CRITICAL
- ≥0.70 → HIGH
- ≥0.50 → MEDIUM
- <0.50 → LOW

**Usage**:
```typescript
import { freshConcentratedDepthRule } from "./rules/index.js";

const result = await freshConcentratedDepthRule.evaluate({
  walletAddress: "0x...",
  conditionId: "0x...",
  tradeSize: 5000,
  txHash: "0x...",
});

if (result.triggered) {
  // result.confidence = 0.75, result.severity = "HIGH"
  // result.triggerValues = { walletAgeDays: 7, concentration: 92, ... }
  await freshConcentratedDepthRule.createAlert(result, context);
}
```

**Tests**: 37 new tests for Rule #1 (253 total insider detection tests)

**Phase 1.5 - Rule #2: Pre-Move Advantage** ✅ COMPLETE

Second detection rule implementation - detects trades that gain significant value shortly after execution:

**New Files**:
- `rules/preMoveAdvantage.ts` - Rule #2 implementation

**Detection Logic**:
Evaluates trades after a lookback window (default: 1 hour) to check for suspicious gains:
1. Trade size ≥ $3,000
2. MTM (Mark-to-Market) gain ≥ 8% (or 12% in volatile markets)

**Key Methods**:
- `schedulePendingEvaluation()` - Schedule trade for future MTM evaluation
- `processPendingEvaluations()` - Background job to process pending evaluations
- `evaluate()` - Core evaluation logic checking MTM gain thresholds
- `cleanupOldEvaluations()` - Cleanup utility for old completed evaluations

**Volatility Adjustment**:
In volatile markets (recent volatility > 1.5x historical), the MTM threshold is increased by the volatility multiplier to reduce false positives.

**Confidence Scoring**:
- MTM gain: 40% weight (higher gain = higher)
- Trade size: 25% weight (larger = higher)
- Volatility regime: 20% weight (volatile = higher)
- Timing: 15% weight (fixed moderate score)

**Usage**:
```typescript
import { preMoveAdvantageRule } from "./rules/index.js";

// Schedule a trade for future evaluation
await preMoveAdvantageRule.schedulePendingEvaluation(
  walletAddress,
  conditionId,
  entryPrice,
  tradeSizeUsd,
  tradeTimestamp,
  txHash
);

// Process pending evaluations (run periodically)
const results = await preMoveAdvantageRule.processPendingEvaluations(100);
// results = { processed: 10, triggered: 2, errors: 0 }

// Or evaluate directly (if price data already available)
const result = await preMoveAdvantageRule.evaluate({
  walletAddress: "0x...",
  conditionId: "0x...",
  entryPrice: 0.50,
  tradeSize: 5000,
  timestamp: new Date(),
  txHash: "0x...",
  side: "YES", // or "NO"
});
```

**Tests**: 35 new tests for Rule #2 (288 total insider detection tests)

**Phase 1.6 - Rule #3: Coordinated Cluster** ✅ COMPLETE

Third detection rule implementation - detects coordinated trading from related wallet clusters:

**New Files**:
- `rules/coordinatedCluster.ts` - Rule #3 implementation

**Detection Logic**:
Evaluates clusters at the market level (not individual trades). Triggers when ALL conditions are met:
1. Cluster size ≥ 3 wallets
2. All wallets trading same side (all YES or all NO)
3. Total notional ≥ $50,000
4. Median wallet age ≤ 45 days

**Key Methods**:
- `evaluate(context)` - Evaluate all clusters with activity in a market
- `evaluateCluster(clusterId, conditionId)` - Targeted evaluation of specific cluster
- `getClustersForMarket(conditionId)` - Find all clusters with activity in a market
- `gatherClusterData(clusterId, conditionId, wallets, windowHours)` - Aggregate cluster activity
- `calculateMedian(values)` - Utility for median age calculation

**Confidence Scoring**:
- Cluster size: 30% weight (more wallets = higher)
- Total notional: 30% weight (larger aggregate = higher, log scale)
- Median age: 20% weight (younger = higher)
- Relationship strength: 20% weight (stronger = higher)

**Usage**:
```typescript
import { coordinatedClusterRule } from "./rules/index.js";

// Evaluate all clusters in a market
const result = await coordinatedClusterRule.evaluate({
  walletAddress: "0x...", // Any wallet (used for context)
  conditionId: "0x...",   // Market to evaluate
});

// Or evaluate a specific cluster
const result = await coordinatedClusterRule.evaluateCluster(
  "cluster_abc123",
  "0xcondition..."
);

if (result.triggered) {
  // result.confidence = 0.72, result.severity = "HIGH"
  // result.triggerValues = { clusterId, clusterSize: 4, totalNotionalUsd: 75000, ... }
  // result.relatedWallets = ["0xwallet1", "0xwallet2", ...]
  await coordinatedClusterRule.createAlert(result, context);
}
```

**Tests**: 32 new tests for Rule #3 (320 total insider detection tests)

**Phase 1.7 - Detection Engine** ✅ COMPLETE

Core orchestration service that runs all detection rules:

**New Files**:
- `detectionEngine.ts` - Main detection engine service

**Key Methods**:
- `initialize()` - Loads and configures all rules on startup
- `loadRules()` - Registers all 3 detection rules with configurations
- `evaluateTrade(transfer)` - Evaluates CTF transfers against applicable rules
- `evaluateWallet(address, conditionId?)` - Evaluates a wallet against all rules
- `evaluateMarket(conditionId)` - Evaluates a market for coordinated cluster activity
- `processPendingMtmEvaluations(limit)` - Processes delayed Rule #2 evaluations
- `getMetrics()` / `resetMetrics()` - Metrics tracking
- `getHealthStatus()` - Health status reporting
- `setRuleEnabled(ruleName, enabled)` - Enable/disable rules
- `setRuleThresholds(ruleName, thresholds)` - Update rule thresholds
- `getRuleConfig(ruleName)` - Get single rule configuration
- `getAllRuleConfigs()` - List all rule configurations with priorities
- `reloadRules()` - Reload all rules after config changes

**Features**:
- **Rule Priority System**: CoordinatedCluster (3) > PreMoveAdvantage (2) > FreshConcentratedDepthImpact (1)
- **Alert Deduplication**: 24-hour window to prevent duplicate alerts for same wallet/market/rule
- **Evaluation Throttling**: 30-second interval between same wallet+market evaluations
- **Metrics Tracking**: Evaluations (total/success/error), rules triggered, alerts created
- **Auto Pre-Move Scheduling**: Schedules trades for delayed MTM evaluation when price available
- **Error Handling**: Graceful degradation - continues processing after individual rule errors

**Usage**:
```typescript
import { detectionEngine } from "./services/insiderDetection/index.js";

// Initialize on startup
await detectionEngine.initialize();

// Evaluate a CTF transfer (called from CTF listener)
const result = await detectionEngine.evaluateTrade(transfer);
// result = { evaluated: true, rulesTriggered: [...], alertsCreated: [1, 2], errors: [] }

// Manual wallet evaluation
const result = await detectionEngine.evaluateWallet("0xwallet...", "0xcondition...");

// Manual market cluster evaluation
const result = await detectionEngine.evaluateMarket("0xcondition...");

// Process pending Pre-Move evaluations (run periodically)
const mtmResults = await detectionEngine.processPendingMtmEvaluations(100);
// mtmResults = { processed: 10, triggered: 2, errors: 0 }

// Health monitoring
const health = detectionEngine.getHealthStatus();
// { initialized: true, rulesLoaded: 3, enabledRules: 3, lastEvaluation: Date, metrics: {...} }

// Rule management
await detectionEngine.setRuleEnabled("FreshConcentratedDepthImpact", false);
await detectionEngine.setRuleThresholds("PreMoveAdvantage", { min_mtm_gain_pct: 10 });
const configs = await detectionEngine.getAllRuleConfigs();
```

**Tests**: 43 new tests for detection engine (363 total insider detection tests)

**Phase 1.8 - CTF Listener Integration** ✅ COMPLETE

Integrates the detection engine with the CTF event listener for real-time detection:

**Updated Files**:
- `ctfEventListener.ts` - Added detection engine integration

**New Methods on `ctfEventListener`**:
- `setDetectionEnabled(enabled)` - Enable/disable detection engine evaluation
- `isDetectionEnabled()` - Check if detection is enabled
- `_evaluateTransfer(transfer)` - Evaluate transfer through detection engine (non-blocking, async)
- `queueForDetection(transfer)` - Queue transfer for async detection processing
- `getDetectionQueueLength()` - Get current queue size
- `processDetectionQueue(limit)` - Process queued transfers in batches
- `batchEvaluateTransfers(transfers)` - Batch evaluation for catch-up/historical analysis
- `_resetDetectionStats()` - Reset detection stats (for testing)

**Features**:
- **Non-blocking Evaluation**: Detection runs asynchronously, errors caught/logged without blocking transfer processing
- **Lazy Import**: Detection engine imported lazily to avoid circular dependencies
- **Detection Queue**: Queue with max size of 10,000 transfers, overflow handling (drops oldest 10%)
- **Health Status Integration**: `CtfListenerHealthStatus` includes detection stats
- **Batch Processing**: Support for evaluating historical transfers in batches

**Updated Health Status**:
```typescript
interface CtfListenerHealthStatus {
  // ... existing fields ...
  detectionEnabled: boolean;           // Whether detection is enabled
  detectionQueueLength: number;        // Current queue size
  detectionEvaluationsProcessed: number; // Total evaluations processed
  detectionAlertsTriggered: number;    // Total alerts triggered
}
```

**Usage**:
```typescript
import { ctfEventListener } from "./services/insiderDetection/index.js";

// Enable detection
ctfEventListener.setDetectionEnabled(true);

// Check health (includes detection stats)
const health = ctfEventListener.getHealthStatus();
// { ..., detectionEnabled: true, detectionQueueLength: 0, detectionEvaluationsProcessed: 150, ... }

// Batch evaluation for historical catch-up
const transfers = await detectionDb.getRecentTransfers(1000);
const result = await ctfEventListener.batchEvaluateTransfers(transfers);
// { processed: 1000, triggered: 5, errors: 0 }

// Queue and process detection asynchronously
ctfEventListener.queueForDetection(transfer);
const processed = await ctfEventListener.processDetectionQueue(100);
```

**Server Startup Integration**:
The detection engine is initialized on server startup in `server.ts` `startServer()`:
```typescript
// Initialize detection engine - loads rule configurations from database
await detectionEngine.initialize();
// Enable detection on CTF listener (async, non-blocking)
ctfEventListener.setDetectionEnabled(true);
```

**Tests**: 12 new tests for CTF-Detection integration (375 total insider detection tests)
- `ctfDetectionIntegration.test.ts` - Integration tests covering enable/disable, async queue, batch processing, health status

**Phase 1.9 - API Endpoints** ✅ COMPLETE

New API endpoints for detection rules, clusters, and price history:

**New Endpoints**:
- `GET /api/detection/rules` - List all detection rules with config and status
- `GET /api/detection/rules/:name` - Get specific rule details
- `PATCH /api/detection/rules/:name` - Update rule enabled/thresholds
- `POST /api/detection/rules/:name/evaluate` - Trigger manual rule evaluation
- `GET /api/detection/clusters` - List all wallet clusters
- `GET /api/detection/clusters/:clusterId` - Get cluster details
- `GET /api/detection/wallets/:address/cluster` - Get wallet's cluster membership
- `GET /api/detection/markets/:conditionId/price-history` - Get price history
- `POST /api/detection/evaluate` - Manual detection evaluation

**Tests**: 52 API tests in `detectionRulesApi.test.ts` (427 total insider detection tests)

**Phase 1.10 - Frontend Enhancements** ✅ COMPLETE

New frontend components and hooks for detection rule management and visualization:

**New Components** (`frontend/src/components/detection/`):
- `RuleCard.tsx` - Detection rule card with config display, threshold info, toggle switch
- `RuleCardList.tsx` - Grid layout for multiple rule cards
- `ClusterView.tsx` - Wallet cluster visualization with relationship display and strength meter
- `ClusterBadge.tsx` - Compact badge showing cluster wallet count and average strength
- `PriceChart.tsx` - SVG-based price history chart with gradient fill and highlight points
- `PriceSparkline.tsx` - Compact sparkline for inline use in lists

**New Hooks** (`frontend/src/hooks/`):
- `useDetectionRules.ts` - Fetch rules, toggle enabled state, update thresholds (with polling)
- `useWalletCluster.ts` - Fetch cluster membership with relationship details
- `usePriceHistory.ts` - Fetch price history with helper functions (calculatePriceChange, getLatestPrice, getPriceAt)

**New API Functions** (`frontend/src/services/api.ts`):
- `fetchDetectionRules()`, `fetchDetectionRule()`, `updateDetectionRule()`, `evaluateDetectionRule()`
- `fetchClusters()`, `fetchCluster()`, `fetchWalletCluster()`
- `fetchDetectionPriceHistory()`

**New Types** (`frontend/src/types/detection.ts`):
- Rule types: `DetectionRuleName`, `DetectionRuleConfig`, `DetectionRulesResponse`
- Cluster types: `ClusterSummary`, `ClusterRelationship`, `ClusterDetails`, `WalletClusterResponse`
- Price types: `PriceHistoryPoint`, `PriceHistoryResponse`
- UI helpers: `RULE_NAME_LABELS`, `RULE_DESCRIPTIONS`, `CLUSTER_RELATIONSHIP_LABELS`

**Updated Components**:
- `DetectionDashboard.tsx` - Added "Detection Rules" section with RuleCardList
- `AlertDetail.tsx` - Added cluster info section, price history chart, MTM gain visualization

**Tests**: Frontend build passes with no TypeScript errors. E2E verified via MCP browser testing.

**Upcoming Phases**:
- Phase 1.11: Integration & Testing

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

## MANDATORY: Testing Requirements

**CRITICAL: Read `TESTING_REQUIREMENTS.md` before implementing any feature that integrates with external APIs or blockchain data.**

Key rules:
1. **Never assume data formats** - Always verify with real API responses first
2. **Trace real transactions** - Before writing blockchain code, manually verify 2-3 real transactions on Polygonscan
3. **Write integration tests with real data** - Use actual tx hashes and API responses, not synthetic mocks
4. **Add sanity checks** - Runtime assertions for values that indicate bugs (e.g., trade size > $10k from fallback price)

This requirement exists because of past bugs where unit tests passed but real-world integrations failed (e.g., token ID vs condition ID confusion).

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
- `insiderDetection/__tests__/clusterService.test.ts` - 30 tests for wallet cluster service
- `insiderDetection/__tests__/freshConcentratedDepth.test.ts` - 37 tests for Rule #1
- `insiderDetection/__tests__/preMoveAdvantage.test.ts` - 35 tests for Rule #2
- `insiderDetection/__tests__/coordinatedCluster.test.ts` - 32 tests for Rule #3
- `insiderDetection/__tests__/detectionEngine.test.ts` - 43 tests for detection engine orchestration
- `insiderDetection/__tests__/ctfDetectionIntegration.test.ts` - 12 tests for CTF-Detection integration
- `insiderDetection/__tests__/detectionRulesApi.test.ts` - 52 tests for Phase 1.9 API endpoints

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

### Database Connection Pool Architecture
The system uses **two separate PostgreSQL connection pools** by design:
1. `src/services/database.ts` - Main whale tracker pool
2. `src/services/insiderDetection/detectionDatabase.ts` - Separate detection system pool

**Why separate pools**: Isolation ensures detection system issues don't affect the main whale tracker and vice versa during active development.

**Connection Limits**: Supabase free tier has ~15-20 connections. Each pool defaults to 10 connections max.

**IMPORTANT - Do NOT run standalone scripts while the server is running**:
- The server uses both pools (~20 connections total)
- Running a standalone script (e.g., migration, data cleanup) creates another pool
- This will exceed connection limits and cause "connection pool exhausted" errors

**Solution for admin operations**: Instead of standalone scripts, add API endpoints that reuse existing pools:
```typescript
// Example: DELETE /api/detection/alerts/test endpoint
// Uses the existing detectionDatabase pool, no new connections
app.delete("/api/detection/alerts/test", async (req, res) => {
  const deletedCount = await detectionDb.deleteTestAlerts();
  res.json({ success: true, deletedCount });
});
```

**Future optimization** (post-Phase 1): Consider consolidating to a single pool or configuring smaller pool sizes once the detection system is stable.

### One-Sided Order Book Price Bug (Fixed 2026-01-14)

**CRITICAL BUG**: When markets have no bids (e.g., YES at 0.05%), the old code defaulted mid-price to 0.5 (50%), causing 1000x trade value overestimation.

**Root Cause Chain**:
1. `calculateMidPrice()` returns `undefined` for one-sided order books
2. Old code: `const refPrice = midPrice ?? 0.5;` defaulted to 50%
3. This 0.5 was stored in `depth_snapshots.mid_price` and passed to `priceHistoryService`
4. `detectionEngine.estimateTradeSize()` used cached price (0.5) instead of real CLOB price (0.0005)
5. Result: $500 trade reported as $500,000

**Fix Applied**:
1. `marketDepthService.ts` - No more 0.5 default. Uses best bid/ask for depth calc, `midPrice` stays `undefined`
2. `detectionEngine.ts` - CLOB API fetched first (source of truth), cache is fallback only
3. Returns 0 for trade size if no reliable price (fails threshold, prevents false positive)

**Lesson**: Never trust cached prices for critical calculations. Always verify against the authoritative source (CLOB API).
