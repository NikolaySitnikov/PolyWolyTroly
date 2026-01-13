# Phase 0: Insider Trading Detection - Data Infrastructure Setup

## Overview

This plan implements the foundation for the Insider Trading Detection System as outlined in the Implementation Roadmap. Phase 0 establishes the data infrastructure required for all subsequent detection phases.

**Architecture Decisions:**
- Separate detection module at `/src/services/insiderDetection/`
- Separate UI route at `/detection`
- Both data pipelines (Polygon RPC + Polymarket APIs) in parallel

---

## What Already Exists (Reusable)

| Component | Location | Can Reuse For |
|-----------|----------|---------------|
| Wallet tracking | `wallets` table | First seen timestamps, deposit amounts |
| USDC listener | `blockchain.ts` | Pattern for CTF event listener |
| Viem setup | `blockchain.ts:38-52` | WebSocket + HTTP clients |
| CTF contract address | `constants.ts:5` | `CTF_EXCHANGE: 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045` |
| Migration pattern | `001_add_trading_metrics.ts` | New table migrations |
| Redis caching | `cache.ts`, `polymarketTradingCache.ts` | Detection caching |
| WebSocket broadcast | `websocket.ts` | Real-time alerts |
| API patterns | `server.ts` | Detection endpoints |

## What's Missing (Must Build)

1. **Markets table** - No market metadata storage
2. **Order book depth tracking** - No CLOB API integration
3. **CTF token transfers** - No ERC-1155 event listeners
4. **Wallet funding analysis** - No 1-hop back tracing
5. **Wallet activity index** - No per-market activity tracking
6. **Detection alerts table** - No alert storage
7. **Configurable thresholds** - All hardcoded currently

---

## Database Schema

### New Tables (Migration 002)

```sql
-- 1. markets: Store market metadata for resolution tracking
CREATE TABLE markets (
  condition_id VARCHAR(66) PRIMARY KEY,
  question TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  outcome_yes_token_id VARCHAR(100),
  outcome_no_token_id VARCHAR(100),
  resolution_time TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_outcome VARCHAR(10),
  volume_24h DECIMAL(20,2) DEFAULT 0,
  volume_total DECIMAL(20,2) DEFAULT 0,
  liquidity DECIMAL(20,2) DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. depth_snapshots: Order book snapshots for liquidity analysis
CREATE TABLE depth_snapshots (
  id SERIAL PRIMARY KEY,
  condition_id VARCHAR(66) REFERENCES markets(condition_id),
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  depth_2tick JSONB,
  depth_5tick JSONB,
  depth_10tick JSONB,
  bid_liquidity_2tick DECIMAL(20,2),
  ask_liquidity_2tick DECIMAL(20,2),
  mid_price DECIMAL(10,6),
  spread DECIMAL(10,6),
  median_liquidity_30d DECIMAL(20,2)
);

-- 3. wallet_activity: Per-market wallet activity index
CREATE TABLE wallet_activity (
  wallet_address VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL,
  first_trade_at TIMESTAMPTZ,
  last_trade_at TIMESTAMPTZ,
  total_volume DECIMAL(20,2) DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  net_position DECIMAL(20,6) DEFAULT 0,
  avg_entry_price DECIMAL(10,6),
  realized_pnl DECIMAL(20,2) DEFAULT 0,
  volume_share_of_wallet DECIMAL(10,4),
  PRIMARY KEY (wallet_address, condition_id)
);

-- 4. wallet_funding_sources: 1-hop funding analysis
CREATE TABLE wallet_funding_sources (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  source_address VARCHAR(42) NOT NULL,
  source_type VARCHAR(50),
  source_label VARCHAR(255),
  tx_hash VARCHAR(66) NOT NULL,
  amount DECIMAL(20,6) NOT NULL,
  token_address VARCHAR(42),
  block_number BIGINT,
  funded_at TIMESTAMPTZ,
  is_first_funding BOOLEAN DEFAULT FALSE,
  hours_before_first_trade INTEGER,
  UNIQUE(wallet_address, tx_hash)
);

-- 5. ctf_transfers: ERC-1155 token movements
CREATE TABLE ctf_transfers (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  token_id VARCHAR(100) NOT NULL,
  amount DECIMAL(30,0) NOT NULL,
  condition_id VARCHAR(66),
  outcome VARCHAR(10),
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMPTZ,
  log_index INTEGER,
  UNIQUE(tx_hash, log_index)
);

-- 6. detection_alerts: Suspicious pattern alerts
CREATE TABLE detection_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  confidence_score DECIMAL(5,2),
  wallet_address VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66),
  detection_rule VARCHAR(100) NOT NULL,
  trigger_values JSONB,
  threshold_values JSONB,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  related_tx_hashes TEXT[],
  related_wallets TEXT[],
  status VARCHAR(20) DEFAULT 'new',
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. detection_config: Configurable thresholds
CREATE TABLE detection_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Default Threshold Configuration

```sql
INSERT INTO detection_config VALUES
('wallet_age_days', '{"high": 14, "medium": 30}'),
('funding_amount', '{"absolute_min": 3000, "market_volume_pct": 5}'),
('trade_timing_hours', '{"high": 2, "medium": 24}'),
('entry_odds_pct', '{"threshold": 15, "price_move_1h": 8}'),
('concentration_pct', '{"wallet_level": 85, "cluster_level": 70}');
```

---

## Service Architecture

```
src/services/insiderDetection/
├── index.ts                  # Module exports
├── types.ts                  # Detection types & interfaces
├── config.ts                 # Threshold config loader
├── detectionDatabase.ts      # DB operations for detection tables
├── detectionCache.ts         # Redis caching layer
├── ctfEventListener.ts       # ERC-1155 TransferSingle/Batch listener
├── marketMetadataService.ts  # Gamma API market sync
├── marketDepthService.ts     # CLOB order book polling (5s)
├── walletActivityIndex.ts    # Wallet activity aggregator
├── fundingAnalyzer.ts        # 1-hop funding source analysis
└── __tests__/                # Unit tests
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/detection/stats` | Dashboard stats (alerts today, by type/severity) |
| GET | `/api/detection/alerts` | Paginated alert list with filters |
| GET | `/api/detection/alerts/:id` | Single alert details |
| PATCH | `/api/detection/alerts/:id` | Update alert status |
| GET | `/api/detection/wallets/:address/risk` | Wallet risk profile |
| GET | `/api/detection/markets/:id/activity` | Market suspicious activity |
| GET | `/api/detection/config` | Get all thresholds |
| PATCH | `/api/detection/config/:key` | Update threshold |

---

## Implementation Subtasks

### Phase 0.1: Database Infrastructure ✅ COMPLETED (2026-01-13)
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.1.1 | Create `002_add_insider_detection_tables.ts` migration | Run migration, verify tables exist | ✅ |
| 0.1.2 | Create `types.ts` with detection interfaces | TypeScript compilation | ✅ |
| 0.1.3 | Implement `detectionDatabase.ts` CRUD operations | Unit tests with mock pool | ✅ |
| 0.1.4 | Implement `detectionCache.ts` Redis layer | Unit tests with mock Redis | ✅ |
| 0.1.5 | Implement `config.ts` threshold loader | Unit test config retrieval | ✅ |

### Phase 0.2: CTF Token Listener ✅ COMPLETED (2026-01-13)
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.2.1 | Add ERC-1155 ABI to `constants.ts` | N/A | ✅ |
| 0.2.2 | Implement `ctfEventListener.ts` (pattern: blockchain.ts) | Mock Viem tests | ✅ |
| 0.2.3 | Add CTF transfer processing & DB storage | Unit tests with sample events | ✅ |
| 0.2.4 | Integrate with server startup + API endpoints | Integration test | ✅ |
| 0.2.5 | Unit tests for CTF listener | Vitest | ✅ |

### Phase 0.3: Market Metadata Service ✅ COMPLETED (2026-01-13)
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.3.1 | Implement `marketMetadataService.ts` (Gamma API) | Mock fetch tests | ✅ |
| 0.3.2 | Add market resolution tracking | Unit tests | ✅ |
| 0.3.3 | Create background sync job (5 min interval) | Timer mock tests | ✅ |
| 0.3.4 | Warm market cache on startup | Integration test | ✅ |
| 0.3.5 | Add API endpoints (`/api/detection/markets`) | API tests | ✅ |
| 0.3.6 | Unit tests for market metadata service | Vitest | ✅ |

### Phase 0.4: Order Book Depth Service ✅ COMPLETED (2026-01-13)
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.4.1 | Implement CLOB API client (`clob.polymarket.com`) | Mock fetch tests | ✅ |
| 0.4.2 | Implement `marketDepthService.ts` (30s polling) | Mock timer tests | ✅ |
| 0.4.3 | Extract 2/5/10 tick level snapshots | Unit tests | ✅ |
| 0.4.4 | Calculate 30-day rolling median (hourly job) | Unit tests | ✅ |
| 0.4.5 | Add rate limiting and market batching | Integration test | ✅ |
| 0.4.6 | Add API endpoints (`/api/detection/depth`) | API tests | ✅ |
| 0.4.7 | Integrate with server startup | Integration test | ✅ |
| 0.4.8 | Unit tests for depth service (22 tests) | Vitest | ✅ |

### Phase 0.5: Wallet Activity Index ✅ COMPLETED (2026-01-13)
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.5.1 | Implement `walletActivityIndex.ts` | Unit tests | ✅ |
| 0.5.2 | Calculate concentration metrics (volume share) | Unit tests | ✅ |
| 0.5.3 | Integrate with CTF listener (update on transfer) | Integration test | ✅ |
| 0.5.4 | Add historical backfill support | Batch processing test | ✅ |
| 0.5.5 | Unit tests for wallet activity index (24 tests) | Vitest | ✅ |

### Phase 0.6: Funding Source Analysis
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.6.1 | Implement `fundingAnalyzer.ts` (Alchemy API) | Mock API tests | ⬜ |
| 0.6.2 | Add address labeling (CEX, bridges) | Unit tests | ⬜ |
| 0.6.3 | Integrate with new wallet detection | Integration test | ⬜ |
| 0.6.4 | Cache funding analysis results | Cache hit/miss tests | ⬜ |

### Phase 0.7: API Endpoints
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.7.1 | Add `/api/detection/stats` | API test | ⬜ |
| 0.7.2 | Add `/api/detection/alerts` with pagination | API test | ⬜ |
| 0.7.3 | Add `/api/detection/alerts/:id` | API test | ⬜ |
| 0.7.4 | Add `PATCH /api/detection/alerts/:id` | API test | ⬜ |
| 0.7.5 | Add `/api/detection/wallets/:address/risk` | API test | ⬜ |
| 0.7.6 | Add `/api/detection/config` endpoints | API tests | ⬜ |

### Phase 0.8: Frontend Detection Page
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.8.1 | Add `detection` route to App.tsx | Component test | ⬜ |
| 0.8.2 | Create `DetectionDashboard.tsx` (stats + alert list) | Component test | ⬜ |
| 0.8.3 | Create `AlertList.tsx` with filtering | Component test | ⬜ |
| 0.8.4 | Create `AlertDetail.tsx` with actions | Component test | ⬜ |
| 0.8.5 | Create `WalletRiskCard.tsx` | Component test | ⬜ |
| 0.8.6 | Add hooks: `useDetectionStats`, `useAlerts`, `useWalletRisk` | Hook tests | ⬜ |
| 0.8.7 | Browser E2E verification via MCP | Manual test | ⬜ |

### Phase 0.9: Integration & Testing
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 0.9.1 | End-to-end integration test | Full pipeline test | ⬜ |
| 0.9.2 | Performance testing (simulated load) | Load test | ⬜ |
| 0.9.3 | Update CLAUDE.md documentation | Review | ⬜ |
| 0.9.4 | Browser E2E full flow | MCP verification | ⬜ |

---

## Critical Files to Modify/Create

### Backend (Create)
- `src/scripts/migrations/002_add_insider_detection_tables.ts`
- `src/services/insiderDetection/index.ts`
- `src/services/insiderDetection/types.ts`
- `src/services/insiderDetection/config.ts`
- `src/services/insiderDetection/detectionDatabase.ts`
- `src/services/insiderDetection/detectionCache.ts`
- `src/services/insiderDetection/ctfEventListener.ts`
- `src/services/insiderDetection/marketMetadataService.ts`
- `src/services/insiderDetection/marketDepthService.ts`
- `src/services/insiderDetection/walletActivityIndex.ts`
- `src/services/insiderDetection/fundingAnalyzer.ts`

### Backend (Modify)
- `src/utils/constants.ts` - Add ERC-1155 ABI
- `src/api/server.ts` - Add detection endpoints
- `src/api/websocket.ts` - Add detection alert broadcast
- `src/index.ts` - Start detection services

### Frontend (Create)
- `frontend/src/components/detection/DetectionDashboard.tsx`
- `frontend/src/components/detection/AlertList.tsx`
- `frontend/src/components/detection/AlertDetail.tsx`
- `frontend/src/components/detection/WalletRiskCard.tsx`
- `frontend/src/hooks/useDetectionStats.ts`
- `frontend/src/hooks/useAlerts.ts`
- `frontend/src/hooks/useWalletRisk.ts`
- `frontend/src/types/detection.ts`

### Frontend (Modify)
- `frontend/src/App.tsx` - Add detection route
- `frontend/src/services/api.ts` - Add detection API functions

---

## Verification Strategy

For each subtask:

1. **Unit Tests**: Run `npm test` for the specific module
2. **Integration Tests**: Test with real database (dev environment)
3. **Browser Verification**: Use MCP tools to:
   - Navigate to `http://localhost:5173/#detection`
   - Take snapshots to verify UI renders
   - Check network requests for API calls
   - Verify data displays correctly

Example MCP verification flow:
```
1. mcp__playwright__browser_navigate({ url: "http://localhost:5173/#detection" })
2. mcp__playwright__browser_snapshot({})
3. Verify alert list loads
4. mcp__playwright__browser_click({ element: "first alert", ref: "..." })
5. Verify alert detail opens
```

---

## Dependencies

```
Phase 0.1 (DB) ─┬─> Phase 0.2 (CTF) ─> Phase 0.5 (Activity)
                │
                ├─> Phase 0.3 (Markets) ─> Phase 0.4 (Depth)
                │
                └─> Phase 0.6 (Funding)
                              │
                              ▼
                    Phase 0.7 (API) ─> Phase 0.8 (Frontend) ─> Phase 0.9 (Integration)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| CLOB API rate limits | Batch requests, exponential backoff |
| Data volume (depth snapshots) | Consider partitioning by month |
| Module isolation | All detection code in separate folder, feature flag to disable |
| Breaking whale tracker | Separate routes, no modifications to existing tables |

---

## Progress Tracking

**Total Subtasks:** 43
**Completed:** 29
**In Progress:** 0
**Remaining:** 14

Last Updated: 2026-01-13

---

## Changelog

### 2026-01-13 - Phase 0.5 Complete
- Created `walletActivityIndex.ts` with:
  - Process CTF transfers and update wallet activity for both buyer and seller
  - Track per-market wallet activity (volume, trade count, net position, avg entry price, realized PnL)
  - Calculate volume share of wallet (concentration metric)
  - Methods: `getWalletActivity`, `getWalletMarketActivity`, `getMarketActivity`
  - `getWalletConcentration()` - returns top market and volume share metrics
  - `getHighConcentrationWallets()` - find wallets with high concentration in a market
  - `getNewWalletActivity()` - find wallets that traded soon after their first-ever trade
  - `backfillFromTransfers()` - backfill wallet activity from existing CTF transfers
  - `recalculateAllVolumeShares()` - batch update all wallet volume shares
  - `invalidateWalletCache()` - clear cache for specific wallet
- Updated `ctfEventListener.ts`:
  - Integrated `walletActivityIndex.processTransfer()` for both TransferSingle and TransferBatch
  - Wallet activity is updated automatically when CTF transfers are processed
- Updated `detectionCache.ts`:
  - Changed `setWalletActivity()` signature to use cache key format
  - Added `invalidateWalletActivity()` method
- Exported `walletActivityIndex` from `index.ts`
- Created unit tests for wallet activity index (24 tests passing)

### 2026-01-13 - Phase 0.4 Complete
- Created `marketDepthService.ts` with:
  - CLOB API integration for fetching order book data (`clob.polymarket.com/book`)
  - Depth extraction at 2/5/10 tick levels from mid price
  - Liquidity calculation (bid/ask liquidity in USD)
  - Mid price and spread calculation
  - Background polling job (30s interval, configurable)
  - Hourly median liquidity calculation (30-day rolling window)
  - Rate limiting (5 req/s) and batch processing (10 markets per batch)
  - Depth ratio calculation for trade size vs. available liquidity
  - Status tracking for health monitoring
- Added market depth API endpoints to `server.ts`:
  - `GET /api/detection/depth/:conditionId` - Latest depth snapshot for a market
  - `GET /api/detection/depth/:conditionId/history` - Depth history (with hours param)
  - `GET /api/detection/depth/:conditionId/liquidity` - Liquidity at tick level (2/5/10)
  - `GET /api/detection/depth/:conditionId/ratio` - Calculate depth ratio for trade size
  - `POST /api/detection/depth/poll` - Trigger manual depth poll
- Extended `/api/health` endpoint with market depth service status
- Market depth service starts automatically with server
- Created unit tests for depth service (22 tests passing)
- Exported `marketDepthService` from `index.ts`
- Fixed TypeScript errors in `marketMetadataService.ts`:
  - Changed `m.tokens?.some(...)` to `m.resolved` for resolution detection
  - Fixed `gamma.condition_id` to `gamma.conditionId`

### 2026-01-13 - Phase 0.3 Complete
- Created `marketMetadataService.ts` with:
  - Gamma API integration for fetching market metadata
  - Automatic token ID extraction for YES/NO outcomes
  - Market resolution detection and tracking
  - Background sync job (every 5 minutes)
  - Cache warming on startup
  - Status tracking for health monitoring
- Updated `detectionCache.ts`:
  - Changed `setMarket()` signature to accept conditionId and optional TTL
  - Added `invalidateMarket()` method for cache invalidation on resolution
- Added market metadata API endpoints to `server.ts`:
  - `GET /api/detection/markets` - List active markets (with optional `nearResolution` filter)
  - `GET /api/detection/markets/:conditionId` - Get single market details
  - `POST /api/detection/markets/sync` - Trigger manual market sync
- Extended `/api/health` endpoint with market metadata service status
- Market metadata service starts automatically with server
- Created unit tests for market metadata service (15 tests passing)
- Exported `marketMetadataService` from `index.ts`

### 2026-01-13 - Phase 0.2 Complete
- Added ERC-1155 ABI to `constants.ts` (TransferSingle, TransferBatch events)
- Added `ZERO_ADDRESS` constant for mint/burn detection
- Created `ctfEventListener.ts` with:
  - Real-time ERC-1155 event monitoring (TransferSingle, TransferBatch)
  - Same robust pattern as `blockchain.ts` (heartbeat, health tracking, auto-restart)
  - Deduplication via Redis cache
  - DB storage to `ctf_transfers` table
  - Skips mints/burns, only tracks wallet-to-wallet transfers
- Extended `detectionCache.ts` with CTF transfer deduplication methods
- Added detection API endpoints to `server.ts`:
  - `GET /api/detection/stats` - Detection dashboard statistics
  - `GET /api/detection/alerts` - Paginated alert list with filters
  - `GET /api/detection/alerts/:id` - Single alert detail
  - `PATCH /api/detection/alerts/:id` - Update alert status
- Extended `/api/health` endpoint with CTF listener status
- CTF listener starts automatically with server
- Created unit tests for CTF listener (7 tests passing)

### 2026-01-13 - Phase 0.1 Complete
- Created database migration `002_add_insider_detection_tables.ts` with 7 new tables
- Created `src/services/insiderDetection/` module with:
  - `types.ts` - 25+ TypeScript interfaces for detection system
  - `detectionDatabase.ts` - Full CRUD operations for all 7 tables
  - `detectionCache.ts` - Redis caching with TTLs and deduplication
  - `config.ts` - Threshold configuration loader with helper functions
  - `index.ts` - Module exports
- Successfully ran migration - 10 tables now in database (3 original + 7 new)
