# Phase 1: Core Detection Engine - Implementation Tasks

## Overview

Phase 1 implements the three MVP detection rules that form the core of the insider trading detection engine:

1. **Rule #1: Fresh-Concentrated-Depth Impact** - Detects new wallets with high concentration making impactful trades
2. **Rule #2: Pre-Move Advantage** - Detects trades that gain significant value shortly after execution
3. **Rule #3: Coordination Cluster Detection** - Detects multiple related wallets trading same direction

**Architecture Decision:** We will create a new `detectionEngine` service that orchestrates the three rules, evaluates trades in real-time, and generates alerts. The engine will hook into the existing CTF listener to evaluate incoming trades.

---

## What Already Exists (Reusable from Phase 0)

| Component | Location | Reuse For |
|-----------|----------|-----------|
| Wallet age calculation | `walletRiskService.ts:50-98` | Rule #1 age check |
| Wallet concentration | `walletActivityIndex.ts:getWalletConcentration()` | Rule #1 concentration check |
| Market depth ratio | `marketDepthService.ts:calculateDepthRatio()` | Rule #1 depth impact |
| Funding source analysis | `fundingAnalyzer.ts:findWalletsWithSameFunder()` | Rule #3 cluster detection |
| Alert creation | `detectionDb.createAlert()` | All rules |
| Detection thresholds | `config.ts:loadConfig()` | All rules |
| CTF transfer listener | `ctfEventListener.ts` | Trigger for real-time evaluation |
| Wallet activity tracking | `walletActivityIndex.ts` | All rules |
| Risk factors | `walletRiskService.ts:riskFactors` | Alert descriptions |

## What's Missing (Must Build)

1. **Detection Engine** - Core orchestration service that runs all rules
2. **Rule #1 Implementation** - Fresh-Concentrated-Depth Impact detector
3. **Rule #2 Implementation** - Pre-Move Advantage detector (requires price tracking)
4. **Rule #3 Implementation** - Coordination Cluster detector
5. **Price History Service** - Track token prices over time for MTM calculations
6. **Cluster Graph Builder** - Build and query wallet relationship graphs
7. **Detection Engine Integration** - Hook into CTF listener for real-time detection
8. **New API Endpoints** - Rule configuration, manual evaluation triggers
9. **Frontend Updates** - Rule-specific alert details, detection dashboard enhancements

---

## Database Schema Additions

### New Tables (Migration 003)

```sql
-- 1. price_history: Track token prices for MTM calculations
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  condition_id VARCHAR(66) NOT NULL,
  token_id VARCHAR(100) NOT NULL,
  price DECIMAL(10,6) NOT NULL,
  source VARCHAR(50) DEFAULT 'clob', -- 'clob', 'gamma', 'calculated'
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(condition_id, recorded_at)
);
CREATE INDEX idx_price_history_condition_time ON price_history(condition_id, recorded_at DESC);
CREATE INDEX idx_price_history_time ON price_history(recorded_at DESC);

-- 2. wallet_clusters: Store computed wallet relationships
CREATE TABLE wallet_clusters (
  id SERIAL PRIMARY KEY,
  cluster_id UUID NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  relationship_type VARCHAR(50) NOT NULL, -- 'shared_funder', 'shared_cashout', 'timing_correlation'
  related_wallet VARCHAR(42),
  evidence JSONB, -- { "funder": "0x...", "tx_hash": "...", "timing_diff_hours": 2 }
  strength DECIMAL(5,2), -- 0-1 relationship strength
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, related_wallet, relationship_type)
);
CREATE INDEX idx_wallet_clusters_cluster ON wallet_clusters(cluster_id);
CREATE INDEX idx_wallet_clusters_wallet ON wallet_clusters(wallet_address);

-- 3. detection_rule_config: Per-rule configuration
CREATE TABLE detection_rule_config (
  rule_name VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  thresholds JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default rule configurations
INSERT INTO detection_rule_config VALUES
('FreshConcentratedDepthImpact', true, '{
  "max_wallet_age_days": 14,
  "min_concentration_pct": 85,
  "min_trade_size_usd": 3000,
  "min_depth_ratio": 3.0
}', 'Detects new wallets with high concentration making impactful trades'),

('PreMoveAdvantage', true, '{
  "min_trade_size_usd": 3000,
  "min_mtm_gain_pct": 8,
  "lookback_hours": 1,
  "vol_multiplier": 1.5
}', 'Detects trades that gain significant value within lookback window'),

('CoordinatedCluster', true, '{
  "min_cluster_size": 3,
  "min_total_notional_usd": 50000,
  "max_median_age_days": 45,
  "time_window_hours": 6
}', 'Detects coordinated trading from related wallets');
```

---

## Service Architecture

```
src/services/insiderDetection/
├── index.ts                    # Updated exports
├── detectionEngine.ts          # NEW: Orchestrates all detection rules
├── rules/                      # NEW: Detection rule implementations
│   ├── index.ts                # Rule exports
│   ├── types.ts                # Rule-specific types
│   ├── ruleBase.ts             # Base class/interface for rules
│   ├── freshConcentratedDepth.ts   # Rule #1
│   ├── preMoveAdvantage.ts         # Rule #2
│   └── coordinatedCluster.ts       # Rule #3
├── priceHistoryService.ts      # NEW: Price tracking for MTM
├── clusterService.ts           # NEW: Wallet cluster management
└── __tests__/
    ├── detectionEngine.test.ts
    ├── freshConcentratedDepth.test.ts
    ├── preMoveAdvantage.test.ts
    ├── coordinatedCluster.test.ts
    ├── priceHistoryService.test.ts
    └── clusterService.test.ts
```

---

## API Endpoints (New/Updated)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/detection/rules` | List all detection rules with status |
| GET | `/api/detection/rules/:name` | Get rule details and config |
| PATCH | `/api/detection/rules/:name` | Update rule config (thresholds, enabled) |
| POST | `/api/detection/rules/:name/evaluate` | Manually trigger rule evaluation |
| GET | `/api/detection/clusters` | List wallet clusters |
| GET | `/api/detection/clusters/:clusterId` | Get cluster details |
| GET | `/api/detection/wallets/:address/cluster` | Get wallet's cluster membership |
| GET | `/api/detection/markets/:conditionId/price-history` | Get price history |
| POST | `/api/detection/evaluate` | Manually evaluate a wallet/trade |

---

## Implementation Subtasks

### Phase 1.1: Database & Types Setup ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.1.1 | Create migration `003_add_detection_engine_tables.ts` | Run migration, verify tables exist | ✅ |
| 1.1.2 | Add rule types to `types.ts` (RuleResult, RuleConfig, etc.) | TypeScript compilation | ✅ |
| 1.1.3 | Create `rules/types.ts` with rule-specific interfaces | TypeScript compilation | ✅ |
| 1.1.4 | Add price history and cluster DB operations to `detectionDatabase.ts` | Unit tests | ✅ |
| 1.1.5 | Add cluster and price caching to `detectionCache.ts` | Unit tests | ✅ |

### Phase 1.2: Price History Service ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.2.1 | Create `priceHistoryService.ts` skeleton | TypeScript compilation | ✅ |
| 1.2.2 | Implement `recordPrice()` - store price snapshot | Unit test | ✅ |
| 1.2.3 | Implement `getPrice(conditionId, timestamp)` - get historical price | Unit test | ✅ |
| 1.2.4 | Implement `getPriceChange(conditionId, fromTime, toTime)` - calculate % change | Unit test | ✅ |
| 1.2.5 | Implement `calculateMTM(trade, afterHours)` - mark-to-market calculation | Unit test | ✅ |
| 1.2.6 | Hook price recording into market depth polling (reuse mid_price from snapshots) | Integration test | ✅ |
| 1.2.7 | Add background job for Gamma API price polling (fallback) | Integration test | ✅ |
| 1.2.8 | Unit tests for price history service (15+ tests) | Vitest | ✅ |

### Phase 1.3: Cluster Service ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.3.1 | Create `clusterService.ts` skeleton | TypeScript compilation | ✅ |
| 1.3.2 | Implement `buildSharedFunderEdges()` - find wallets with same funder | Unit test with mock data | ✅ |
| 1.3.3 | Implement `buildTimingCorrelationEdges()` - find wallets trading same market in window | Unit test | ✅ |
| 1.3.4 | Implement `buildClusterGraph()` - combine edges into clusters | Unit test | ✅ |
| 1.3.5 | Implement `getWalletCluster(address)` - get cluster for wallet | Unit test | ✅ |
| 1.3.6 | Implement `getClusterActivity(clusterId, conditionId)` - aggregate cluster trading | Unit test | ✅ |
| 1.3.7 | Implement `refreshClusters()` - background job to rebuild clusters | Integration test | ✅ |
| 1.3.8 | Cache cluster data for performance | Unit test | ✅ |
| 1.3.9 | Unit tests for cluster service (20+ tests) | Vitest | ✅ |

### Phase 1.4: Rule #1 - Fresh-Concentrated-Depth Impact ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.4.1 | Create `rules/ruleBase.ts` with `DetectionRule` interface | TypeScript compilation | ✅ |
| 1.4.2 | Create `rules/freshConcentratedDepth.ts` skeleton | TypeScript compilation | ✅ |
| 1.4.3 | Implement `evaluate(wallet, trade, market)` method | Unit test | ✅ |
| 1.4.4 | Implement wallet age check (reuse from walletRiskService) | Unit test | ✅ |
| 1.4.5 | Implement concentration check (reuse from walletActivityIndex) | Unit test | ✅ |
| 1.4.6 | Implement depth impact check (reuse from marketDepthService) | Unit test | ✅ |
| 1.4.7 | Implement confidence score calculation | Unit test | ✅ |
| 1.4.8 | Create alert with detailed trigger values | Unit test | ✅ |
| 1.4.9 | Unit tests for Rule #1 (18+ tests) | Vitest | ✅ |

### Phase 1.5: Rule #2 - Pre-Move Advantage ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.5.1 | Create `rules/preMoveAdvantage.ts` skeleton | TypeScript compilation | ✅ |
| 1.5.2 | Implement `evaluate(trade, market)` method | Unit test | ✅ |
| 1.5.3 | Implement MTM calculation using priceHistoryService | Unit test | ✅ |
| 1.5.4 | Implement volatility regime detection | Unit test | ✅ |
| 1.5.5 | Implement lookback evaluation (schedulePendingEvaluation) | Unit test | ✅ |
| 1.5.6 | Implement scheduled re-evaluation job (processPendingEvaluations) | Integration test | ✅ |
| 1.5.7 | Create alert with MTM gain details | Unit test | ✅ |
| 1.5.8 | Unit tests for Rule #2 (35 tests) | Vitest | ✅ |

### Phase 1.6: Rule #3 - Coordinated Cluster ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.6.1 | Create `rules/coordinatedCluster.ts` skeleton | TypeScript compilation | ✅ |
| 1.6.2 | Implement `evaluate(market, timeWindow)` method | Unit test | ✅ |
| 1.6.3 | Implement same-side detection (all wallets trading same direction) | Unit test | ✅ |
| 1.6.4 | Implement cluster size and notional thresholds | Unit test | ✅ |
| 1.6.5 | Implement median age calculation for cluster | Unit test | ✅ |
| 1.6.6 | Create alert with cluster details and wallet list | Unit test | ✅ |
| 1.6.7 | Unit tests for Rule #3 (32 tests) | Vitest | ✅ |

### Phase 1.7: Detection Engine ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.7.1 | Create `detectionEngine.ts` skeleton | TypeScript compilation | ✅ |
| 1.7.2 | Implement `loadRules()` - load and configure all rules | Unit test | ✅ |
| 1.7.3 | Implement `evaluateTrade(transfer)` - run all applicable rules | Unit test | ✅ |
| 1.7.4 | Implement `evaluateWallet(address)` - evaluate wallet against all rules | Unit test | ✅ |
| 1.7.5 | Implement `evaluateMarket(conditionId)` - evaluate market for cluster activity | Unit test | ✅ |
| 1.7.6 | Implement alert deduplication (don't re-alert same pattern) | Unit test | ✅ |
| 1.7.7 | Implement rule priority and conflict resolution | Unit test | ✅ |
| 1.7.8 | Add metrics tracking (rules triggered, alerts created) | Unit test | ✅ |
| 1.7.9 | Unit tests for detection engine (43 tests) | Vitest | ✅ |

### Phase 1.8: CTF Listener Integration ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.8.1 | Add detection engine hook to CTF listener | Integration test | ✅ |
| 1.8.2 | Implement async evaluation (non-blocking transfer processing) | Integration test | ✅ |
| 1.8.3 | Add rate limiting for detection evaluations | Unit test | ✅ |
| 1.8.4 | Implement batch evaluation for catch-up scenarios | Integration test | ✅ |
| 1.8.5 | Add health status for detection engine | Integration test | ✅ |
| 1.8.6 | Integration tests for CTF → Detection pipeline | Vitest | ✅ |

### Phase 1.9: API Endpoints ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.9.1 | Add `GET /api/detection/rules` endpoint | API test | ✅ |
| 1.9.2 | Add `GET /api/detection/rules/:name` endpoint | API test | ✅ |
| 1.9.3 | Add `PATCH /api/detection/rules/:name` endpoint | API test | ✅ |
| 1.9.4 | Add `POST /api/detection/rules/:name/evaluate` endpoint | API test | ✅ |
| 1.9.5 | Add `GET /api/detection/clusters` endpoint | API test | ✅ |
| 1.9.6 | Add `GET /api/detection/clusters/:clusterId` endpoint | API test | ✅ |
| 1.9.7 | Add `GET /api/detection/wallets/:address/cluster` endpoint | API test | ✅ |
| 1.9.8 | Add `GET /api/detection/markets/:conditionId/price-history` endpoint | API test | ✅ |
| 1.9.9 | Add `POST /api/detection/evaluate` manual evaluation endpoint | API test | ✅ |

### Phase 1.10: Frontend Enhancements ✅ COMPLETED
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.10.1 | Create `RuleCard.tsx` component for detection rules | Component test | ✅ |
| 1.10.2 | Create `ClusterView.tsx` component for wallet clusters | Component test | ✅ |
| 1.10.3 | Create `PriceChart.tsx` component for price history | Component test | ✅ |
| 1.10.4 | Add rules list to Detection dashboard | Component test | ✅ |
| 1.10.5 | Add cluster info to AlertDetail component | Component test | ✅ |
| 1.10.6 | Add MTM gain visualization to AlertDetail | Component test | ✅ |
| 1.10.7 | Create hooks: `useDetectionRules`, `useWalletCluster`, `usePriceHistory` | Hook tests | ✅ |
| 1.10.8 | Add frontend API functions for new endpoints | Unit tests | ✅ |
| 1.10.9 | Browser E2E verification via MCP | Manual test | ✅ |

### Phase 1.11: Integration & Testing
| # | Task | Test Strategy | Status |
|---|------|---------------|--------|
| 1.11.1 | End-to-end integration test: CTF → Rule #1 → Alert | Integration test | |
| 1.11.2 | End-to-end integration test: Trade → Rule #2 → Alert (after delay) | Integration test | |
| 1.11.3 | End-to-end integration test: Cluster → Rule #3 → Alert | Integration test | |
| 1.11.4 | Backtest against documented insider trading cases | Manual verification | |
| 1.11.5 | Performance testing with simulated load | Load test | |
| 1.11.6 | Update CLAUDE.md documentation | Review | |
| 1.11.7 | Browser E2E full flow verification | MCP verification | |

---

## Critical Files to Create

### Backend (Create)
- `src/scripts/migrations/003_add_detection_engine_tables.ts`
- `src/services/insiderDetection/priceHistoryService.ts`
- `src/services/insiderDetection/clusterService.ts`
- `src/services/insiderDetection/detectionEngine.ts`
- `src/services/insiderDetection/rules/index.ts`
- `src/services/insiderDetection/rules/types.ts`
- `src/services/insiderDetection/rules/ruleBase.ts`
- `src/services/insiderDetection/rules/freshConcentratedDepth.ts`
- `src/services/insiderDetection/rules/preMoveAdvantage.ts`
- `src/services/insiderDetection/rules/coordinatedCluster.ts`

### Backend (Modify)
- `src/services/insiderDetection/types.ts` - Add rule types
- `src/services/insiderDetection/detectionDatabase.ts` - Add price/cluster operations
- `src/services/insiderDetection/detectionCache.ts` - Add price/cluster caching
- `src/services/insiderDetection/ctfEventListener.ts` - Hook detection engine
- `src/services/insiderDetection/index.ts` - Export new services
- `src/api/server.ts` - Add new API endpoints

### Frontend (Create)
- `frontend/src/components/detection/RuleCard.tsx`
- `frontend/src/components/detection/ClusterView.tsx`
- `frontend/src/components/detection/PriceChart.tsx`
- `frontend/src/hooks/useDetectionRules.ts`
- `frontend/src/hooks/useWalletCluster.ts`

### Frontend (Modify)
- `frontend/src/components/detection/DetectionDashboard.tsx` - Add rules section
- `frontend/src/components/detection/AlertDetail.tsx` - Add cluster/MTM info
- `frontend/src/services/api.ts` - Add new API functions
- `frontend/src/types/detection.ts` - Add rule/cluster types

---

## Dependencies

```
Phase 1.1 (DB) ─┬─> Phase 1.2 (Price) ─> Phase 1.5 (Rule #2)
                │
                ├─> Phase 1.3 (Cluster) ─> Phase 1.6 (Rule #3)
                │
                └─> Phase 1.4 (Rule #1)
                              │
                              ▼
                    Phase 1.7 (Engine) ─> Phase 1.8 (Integration)
                              │
                              ▼
                    Phase 1.9 (API) ─> Phase 1.10 (Frontend)
                              │
                              ▼
                    Phase 1.11 (Testing)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Rule #2 requires delayed evaluation | Implement job queue for scheduled re-evaluation |
| Cluster building may be expensive | Cache clusters, rebuild on schedule (hourly) |
| Price history gaps | Fallback to Gamma API, interpolation for missing data |
| High alert volume | Alert deduplication, configurable thresholds |
| Detection engine blocking CTF listener | Async evaluation, separate worker queue |
| False positive flood | Start with conservative thresholds, tune based on data |

---

## Confidence Score Calculations

### Rule #1: Fresh-Concentrated-Depth Impact
```python
confidence = (
    0.30 * normalize_age(wallet_age_days) +      # Younger = higher
    0.25 * normalize_concentration(top_share) +   # Higher = higher
    0.25 * normalize_depth_ratio(trade/depth) +   # Higher = higher
    0.20 * normalize_trade_size(notional_usd)     # Larger = higher
)
```

### Rule #2: Pre-Move Advantage
```python
confidence = (
    0.40 * normalize_mtm_gain(mtm_1h) +           # Higher gain = higher
    0.25 * normalize_trade_size(notional_usd) +   # Larger = higher
    0.20 * (1 if in_volatile_regime else 0.3) +   # Volatile = higher
    0.15 * normalize_timing(hours_before_move)    # Sooner = higher
)
```

### Rule #3: Coordinated Cluster
```python
confidence = (
    0.30 * normalize_cluster_size(wallet_count) +     # More wallets = higher
    0.30 * normalize_total_notional(aggregate_usd) +  # Larger = higher
    0.20 * normalize_median_age(median_days) +        # Younger = higher
    0.20 * normalize_relationship_strength(avg)       # Stronger = higher
)
```

---

## Progress Tracking

**Total Subtasks:** 78
**Completed:** 79
**In Progress:** 0
**Remaining:** 7 (Phase 1.11 integration tests)

Last Updated: 2026-01-14

---

## Changelog

### 2026-01-14 - Phase 1.10 Completed
- Created frontend components for detection enhancements:
  - `RuleCard.tsx` - Displays detection rule with config, thresholds, toggle switch
  - `RuleCardList.tsx` - Grid layout for multiple rule cards
  - `ClusterView.tsx` - Displays wallet cluster info with relationships and strength meter
  - `ClusterBadge.tsx` - Compact badge for cluster summary
  - `PriceChart.tsx` - SVG-based price history chart with gradient fill and highlight points
  - `PriceSparkline.tsx` - Compact sparkline for inline use
- Created frontend hooks:
  - `useDetectionRules.ts` - Fetch/toggle/update detection rules with polling
  - `useWalletCluster.ts` - Fetch cluster membership with relationship details
  - `usePriceHistory.ts` - Fetch price history with helper functions (calculatePriceChange, getLatestPrice, getPriceAt)
- Updated existing components:
  - `DetectionDashboard.tsx` - Added "Detection Rules" section with RuleCardList
  - `AlertDetail.tsx` - Added cluster info, price history chart, and MTM gain visualization
- Added frontend API functions in `api.ts`:
  - `fetchDetectionRules`, `fetchDetectionRule`, `updateDetectionRule`, `evaluateDetectionRule`
  - `fetchClusters`, `fetchCluster`, `fetchWalletCluster`
  - `fetchDetectionPriceHistory`
- Added types to `detection.ts`:
  - Rule types: `DetectionRuleName`, `DetectionRuleConfig`, `DetectionRulesResponse`
  - Cluster types: `ClusterSummary`, `ClusterRelationship`, `ClusterDetails`
  - Price types: `PriceHistoryPoint`, `PriceHistoryResponse`
  - UI helpers: `RULE_NAME_LABELS`, `RULE_DESCRIPTIONS`, `CLUSTER_RELATIONSHIP_LABELS`
- Browser E2E verification via MCP:
  - Detection dashboard displays stats, alerts by type, rules section, and alerts list
  - API endpoints returning correct data (stats, rules)
  - Frontend build passes with no TypeScript errors

### 2026-01-14 - Phase 1.9 Completed
- Added 9 new API endpoints for detection rules, clusters, and price history:
  - `GET /api/detection/rules` - List all detection rules with config and status
  - `GET /api/detection/rules/:name` - Get specific rule details
  - `PATCH /api/detection/rules/:name` - Update rule enabled/thresholds
  - `POST /api/detection/rules/:name/evaluate` - Trigger manual rule evaluation
  - `GET /api/detection/clusters` - List all wallet clusters
  - `GET /api/detection/clusters/:clusterId` - Get cluster details
  - `GET /api/detection/wallets/:address/cluster` - Get wallet's cluster membership
  - `GET /api/detection/markets/:conditionId/price-history` - Get price history
  - `POST /api/detection/evaluate` - Manual detection evaluation
- Added imports for `detectionEngine`, `clusterService`, `priceHistoryService` to server.ts
- Created 52 API tests in `detectionRulesApi.test.ts` covering all endpoints
- All tests passing (375 insider detection tests + 52 API tests)

### 2026-01-14 - Phase 1.8 Completed
- Integrated detection engine with CTF event listener:
  - `setDetectionEnabled()` / `isDetectionEnabled()` - enable/disable detection
  - `_evaluateTransfer()` - evaluate transfer through detection engine (non-blocking)
  - `queueForDetection()` - queue transfers for async processing
  - `getDetectionQueueLength()` - check queue size
  - `processDetectionQueue()` - process queued transfers in batches
  - `batchEvaluateTransfers()` - batch evaluation for catch-up scenarios
  - `_resetDetectionStats()` - reset stats for testing
- Features implemented:
  - Lazy import of detection engine to avoid circular dependencies
  - Non-blocking async evaluation with error handling
  - Detection queue with configurable max size (10,000 transfers)
  - Queue overflow handling (drops oldest 10% when full)
  - Health status includes detection stats
  - Batch processing for historical/catch-up evaluation
- Updated `CtfListenerHealthStatus` interface with detection fields:
  - `detectionEnabled` - whether detection is enabled
  - `detectionQueueLength` - current queue size
  - `detectionEvaluationsProcessed` - total evaluations processed
  - `detectionAlertsTriggered` - total alerts triggered
- Created 12 integration tests in `ctfDetectionIntegration.test.ts` covering:
  - Detection engine hook (enable/disable, error handling)
  - Async evaluation queue (queue, process, batch limits)
  - Rate limiting (engine handles throttling internally)
  - Health status integration
  - Batch evaluation for historical transfers
- All tests passing (375 insider detection tests)

### 2026-01-14 - Phase 1.7 Completed
- Created `detectionEngine.ts` - Core orchestration service for all detection rules:
  - `initialize()` - loads and configures all rules on startup
  - `loadRules()` - registers and configures all 3 detection rules
  - `evaluateTrade()` - evaluates CTF transfers against applicable rules
  - `evaluateWallet()` - evaluates a wallet against all rules
  - `evaluateMarket()` - evaluates a market for coordinated cluster activity
  - `processPendingMtmEvaluations()` - processes delayed Rule #2 evaluations
  - `getMetrics()` / `resetMetrics()` - metrics tracking
  - `getHealthStatus()` - health status reporting
  - `setRuleEnabled()` / `setRuleThresholds()` - rule configuration
  - `getAllRuleConfigs()` - list all rule configurations
- Features implemented:
  - Rule priority system: CoordinatedCluster (3) > PreMoveAdvantage (2) > FreshConcentratedDepthImpact (1)
  - Alert deduplication: 24-hour window to prevent duplicate alerts
  - Evaluation throttling: 30-second interval between same wallet+market evaluations
  - Metrics tracking: evaluations, triggered rules, alerts created
  - Automatic Pre-Move scheduling: schedules trades for delayed MTM evaluation
  - Error handling with graceful degradation
- Entry points:
  - `evaluateTrade()` - called when CTF transfer is processed
  - `evaluateWallet()` - manual wallet evaluation
  - `evaluateMarket()` - manual market cluster evaluation
- Exported from `index.ts` with rules module
- Created 43 unit tests for detection engine covering:
  - Initialization and rule loading
  - Rule management (get, enable/disable, thresholds)
  - Trade evaluation and throttling
  - Wallet evaluation
  - Market evaluation
  - Alert deduplication
  - Metrics tracking
  - Health status
  - Error handling
  - Edge cases
- All tests passing (363 insider detection tests)

### 2026-01-14 - Phase 1.6 Completed
- Created `rules/coordinatedCluster.ts` with full Rule #3 implementation:
  - `evaluate()` - evaluates all clusters with activity in a market
  - `evaluateCluster()` - targeted evaluation of a specific cluster
  - `getClustersForMarket()` - finds all clusters with activity in a market
  - `gatherClusterData()` - aggregates wallet activity for a cluster
  - `calculateConfidence()` - weighted confidence scoring
  - `calculateMedian()` - utility for median age calculation
- Features implemented:
  - Same-side detection: all wallets must trade YES or all NO
  - Cluster size threshold: minimum N wallets acting together
  - Total notional threshold: minimum aggregate position size
  - Median age check: fresh wallet clusters are more suspicious
  - Relationship strength from clusterService
  - Human-readable descriptions with market context
- Confidence scoring weights:
  - 30% cluster size (more wallets = higher)
  - 30% total notional (larger aggregate = higher)
  - 20% median age (younger = higher)
  - 20% relationship strength (stronger = higher)
- Threshold defaults: 3 wallets, $50,000 total notional, 45 days max median age, 6 hour window
- Created 32 unit tests for Rule #3 covering:
  - Basic triggering conditions
  - Same-side detection (YES and NO)
  - Threshold boundary tests
  - Confidence score calculations
  - Edge cases and error handling
  - Alert deduplication
  - Rule configuration
  - evaluateCluster() method
- Updated `rules/index.ts` to export CoordinatedClusterRule
- All tests passing (320 insider detection tests)

### 2026-01-14 - Phase 1.5 Completed
- Created `rules/preMoveAdvantage.ts` with full Rule #2 implementation:
  - `schedulePendingEvaluation()` - schedules trades for delayed MTM evaluation
  - `processPendingEvaluations()` - background job that processes pending evaluations
  - `evaluate()` - core evaluation logic checking MTM gain thresholds
  - `cleanupOldEvaluations()` - cleanup utility for old completed evaluations
- Features implemented:
  - MTM (Mark-to-Market) calculation using priceHistoryService
  - Volatility regime detection - higher threshold in volatile markets
  - Volatility-adjusted thresholds: base threshold * vol_multiplier in volatile markets
  - Delayed evaluation workflow via pending_mtm_evaluations table
  - YES/NO side handling for proper MTM direction
- Confidence scoring weights:
  - 40% MTM gain (higher gain = higher confidence)
  - 25% trade size (larger = higher)
  - 20% volatility regime (volatile = higher)
  - 15% timing score (fixed moderate value for now)
- Threshold defaults: $3,000 min trade, 8% MTM gain, 1 hour lookback, 1.5x vol multiplier
- Created 35 unit tests for Rule #2 covering:
  - Basic triggering conditions
  - Volatility regime adjustments
  - Pending evaluation scheduling and processing
  - Confidence score calculations
  - YES/NO side handling
  - Input validation and edge cases
  - Alert deduplication
  - Configuration management
- Added `side` field to `RuleEvaluationContext` type
- All tests passing (288 insider detection tests)

### 2026-01-14 - Phase 1.4 Completed
- Created `rules/ruleBase.ts` with abstract `BaseDetectionRule` class:
  - Configuration loading from database/cache
  - Threshold management (get/set)
  - Alert creation helpers
  - Confidence score utilities
  - Alert deduplication logic
- Created `rules/freshConcentratedDepth.ts` with full Rule #1 implementation:
  - Detects new wallets (< N days) with high concentration (> N%)
  - Evaluates depth impact (trade size vs available liquidity)
  - Reuses existing services: walletActivityIndex, marketDepthService
  - Weighted confidence scoring: age (30%), concentration (25%), depth (25%), size (20%)
  - Maps confidence to severity: >=0.85 CRITICAL, >=0.70 HIGH, >=0.50 MEDIUM, else LOW
  - Human-readable alert descriptions with market context
- Threshold defaults: 14 days, 85% concentration, $3,000 min trade, 3.0x depth ratio
- Created 37 unit tests for Rule #1 covering:
  - Basic triggering conditions
  - Threshold boundary tests
  - Confidence score calculations
  - Edge cases and error handling
  - Alert deduplication
  - Rule configuration
- All tests passing (253 insider detection tests)

### 2026-01-13 - Phase 1.3 Completed
- Created `clusterService.ts` with full implementation:
  - Union-Find data structure for efficient cluster assignment
  - `buildSharedFunderEdges()` - detects wallets funded from same source
  - `buildTimingCorrelationEdges()` - detects wallets trading same direction within time window
  - `buildClusterGraph()` - combines all edges and assigns cluster IDs
  - `getWalletCluster()` - retrieves cluster membership with caching
  - `getClusterActivity()` - aggregates trading metrics across cluster wallets
  - `refreshClusters()` - background job to rebuild cluster graph
  - `getAllClusters()` / `deleteCluster()` - cluster management
- Strength calculation based on:
  - Funding timing proximity (closer = stronger)
  - Funding amount similarity
  - Trade timing proximity
  - Trade volume similarity
- Skips CEX and bridge funders (many unrelated wallets)
- Filters out small funding amounts (< $100)
- Created 30 unit tests for clusterService
- All tests passing (216 insider detection tests)

### 2026-01-13 - Phase 1.2 Completed
- Created `priceHistoryService.ts` with full implementation:
  - `recordPrice()` - stores price snapshots from CLOB and Gamma
  - `getPrice()` - retrieves historical price closest to timestamp
  - `getLatestPrice()` - gets most recent price with caching
  - `getPriceChange()` - calculates % change between two timestamps
  - `calculateMTM()` - mark-to-market calculation for YES/NO positions
  - `getVolatility()` - calculates price volatility using standard deviation
  - `isVolatileRegime()` - detects volatile market conditions
  - `recordPriceFromDepth()` - hook called from marketDepthService
  - `pollGammaFallback()` - background job for Gamma API prices
- Hooked price recording into marketDepthService:
  - Lazy import to avoid circular dependencies
  - Records mid-price from order book during depth capture
- Added Gamma API fallback for markets without active order books
- Created 25 unit tests for priceHistoryService
- All tests passing (186 insider detection tests)

### 2026-01-13 - Phase 1.1 Completed
- Created migration `003_add_detection_engine_tables.ts` with tables:
  - `price_history` for MTM calculations
  - `wallet_clusters` for relationship tracking
  - `detection_rule_config` for per-rule thresholds
  - `pending_mtm_evaluations` for delayed rule evaluation
- Added 14 new types to `types.ts` (PriceHistory, WalletCluster, RuleResult, etc.)
- Created `rules/types.ts` with rule-specific interfaces and confidence helpers
- Added 15+ database operations for price history, clusters, rule config, and MTM evaluations
- Added price/cluster/rule caching to detectionCache.ts
- All tests passing (161 insider detection tests, 42 new for Phase 1.1)

### 2026-01-13 - Initial Plan Created
- Analyzed existing Phase 0 implementation
- Identified reusable components from walletRiskService, walletActivityIndex, marketDepthService
- Designed database schema for price history and wallet clusters
- Created detailed subtasks for all 3 MVP detection rules
- Mapped dependencies between subtasks
