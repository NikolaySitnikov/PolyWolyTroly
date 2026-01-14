# PolyWolyTroly Insider Trading Detection System
## Comprehensive Implementation Roadmap

---

## Executive Summary

After analyzing all three responses, here's what emerges: **Gemini gives you a clean taxonomy, ChatGPT gives you production-ready formulas, and Claude gives you the honest reality check.** The synthesis below takes the best of each while discarding redundancy and theoretical fluff.

The core insight across all three: **your original 5 criteria are a solid V1, but you're missing cluster detection (the Théo problem) and relative sizing (the depth problem).** Everything else is refinement.

---

## Phase 0: Foundation (Week 1-2)

### 0.1 Data Infrastructure Setup
**Priority: CRITICAL | Complexity: MEDIUM**

Before any detection logic, you need the data pipeline. ChatGPT's response is most specific here.

**Data sources to ingest:**

| Source | Data Type | Update Frequency | Purpose |
|--------|-----------|------------------|---------|
| Polygon RPC | USDC transfers, CTF token movements | Real-time | Wallet funding, position changes |
| Polymarket CLOB API | Order book depth, fills, best bid/ask | 1-5 second snapshots | Microstructure signals |
| Polymarket REST API | Market metadata, resolution times, outcomes | On-demand | Market classification |
| Historical backfill | Past trades, resolutions | One-time | Backtesting, baseline establishment |

**Implementation steps:**

```
1. Set up event listeners for:
   - USDC deposits to Polymarket proxy contracts
   - ERC-1155 outcome token transfers (CTF)
   - Settlement contract events

2. Build market depth snapshot service:
   - Poll order book every 5 seconds
   - Store depth at 2-tick, 5-tick, 10-tick levels
   - Calculate rolling median depth (30-day)

3. Create wallet activity index:
   - First seen timestamp
   - Markets traded
   - Total volume
   - Funding sources (1-hop back)
```

### 0.2 Revised Detection Thresholds
**Priority: CRITICAL | Complexity: LOW**

All three responses agree your thresholds need adjustment:

| Original Criterion | Problem Identified | Revised Threshold |
|--------------------|-------------------|-------------------|
| Wallet age < 30 days | Too generous for fast-acting insiders | **< 14 days** (Claude) or add dormancy detection |
| Funding ≥ $10,000 | Missed the $5.7K Maduro case | **≥ $3,000** OR **≥ 5% of market's 24h volume** |
| Trade within 24h of funding | Reasonable but add burst detection | **< 2 hours** for HIGH alert, **< 24h** for MEDIUM |
| Entry odds ≤ 25% | Misses "high-probability NO" insiders | **≤ 15%** OR **price moved >8% in your favour within 1h** |
| Concentration ≥ 90% | Per-wallet fails against multi-wallet | **≥ 85%** at wallet level, **≥ 70%** at cluster level |

---

## Phase 1: Core Detection Engine (Week 3-5) - IN PROGRESS

### Phase 1.1 - Database & Types Setup ✅ COMPLETE (2026-01-13)
- Created migration `003_add_detection_engine_tables.ts` with 4 new tables
- Added 14 new types to `types.ts`
- Created `rules/types.ts` with rule interfaces and confidence helpers
- Added 15+ database operations for price history, clusters, rule config, MTM evaluations
- Added caching for all new data types
- All tests passing (161 insider detection tests, 42 new for Phase 1.1)

### Phase 1.2 - Price History Service ✅ COMPLETE (2026-01-13)
- Created `priceHistoryService.ts` with full implementation for MTM calculations
- Methods: `recordPrice()`, `getPrice()`, `getLatestPrice()`, `getPriceChange()`, `calculateMTM()`, `getVolatility()`, `isVolatileRegime()`
- Hooked price recording into `marketDepthService.ts` (captures mid-price from order book)
- Added Gamma API fallback polling for markets without active order books
- All tests passing (186 insider detection tests, 25 new for Phase 1.2)

See [Phase 1 tasks.md](./Phase%201%20tasks.md) for detailed implementation status.

### 1.1 MVP Rule #1: Fresh-Concentrated-Depth Impact
**Priority: CRITICAL | Complexity: MEDIUM**

This is your bread-and-butter detector. ChatGPT's pseudocode is cleanest:

```python
def rule_fresh_concentrated_depth(wallet, trade, market):
    """
    Catches: Cases 1, 3, and most of Case 2
    Expected precision: 55-75%
    Expected recall on documented cases: HIGH
    """
    
    # Thresholds (tune after backtesting)
    MAX_WALLET_AGE_DAYS = 14
    MIN_CONCENTRATION = 0.85
    MIN_TRADE_SIZE = 3000  # USD
    MIN_DEPTH_RATIO = 3.0
    
    wallet_age = (now() - wallet.first_polymarket_tx).days
    top_market_share = wallet.get_concentration(market.id)
    depth_2tick = market.get_depth_within_ticks(2)
    depth_ratio = trade.notional_usdc / depth_2tick
    
    if (wallet_age <= MAX_WALLET_AGE_DAYS
        and top_market_share >= MIN_CONCENTRATION
        and trade.notional_usdc >= MIN_TRADE_SIZE
        and depth_ratio >= MIN_DEPTH_RATIO):
        
        return Alert(
            rule="FreshConcentratedDepthImpact",
            severity="HIGH",
            confidence=calculate_confidence(wallet_age, depth_ratio),
            wallet=wallet.address,
            market=market.id,
            trade=trade
        )
    
    return None
```

**Why this works:** It combines three independent signals (freshness, concentration, impact) that are individually noisy but collectively strong. The depth ratio is the key innovation from ChatGPT—absolute size matters less than size relative to available liquidity.

### 1.2 MVP Rule #2: Pre-Move Advantage Detector
**Priority: CRITICAL | Complexity: MEDIUM**

This is your most microstructure-native signal. Both Gemini and ChatGPT emphasize it.

```python
def rule_pre_move_advantage(trade, market, lookback_window=timedelta(hours=1)):
    """
    Catches: "Entered before repricing" pattern
    Expected precision: 65-85%
    """
    
    MIN_TRADE_SIZE = 3000
    MIN_MTM_GAIN = 0.08  # 8% gain
    VOL_MULTIPLIER = 1.5
    
    # Calculate mark-to-market 1h after entry
    entry_price = trade.execution_price
    price_1h_later = market.get_mid_price(trade.timestamp + lookback_window)
    mtm_1h = (price_1h_later - entry_price) / entry_price
    
    # Check if market is in volatile regime
    vol_24h = market.get_volatility(hours=24)
    vol_30d_median = market.get_volatility_median(days=30)
    in_volatile_regime = vol_24h >= VOL_MULTIPLIER * vol_30d_median
    
    if (trade.notional_usdc >= MIN_TRADE_SIZE
        and mtm_1h >= MIN_MTM_GAIN
        and in_volatile_regime):
        
        return Alert(
            rule="PreMoveAdvantage",
            severity="HIGH",
            mtm_gain=mtm_1h,
            regime="VOLATILE"
        )
    
    return None
```

**Why this works:** It directly measures what you care about—did this trade have information that wasn't yet in the price? The volatility regime filter reduces false positives from lucky trades in choppy markets.

### 1.3 MVP Rule #3: Coordination Cluster Detection
**Priority: HIGH | Complexity: HIGH**

This is your Théo-killer. Claude and ChatGPT both emphasize this is the biggest gap.

```python
def build_wallet_clusters(lookback_days=30):
    """
    Build graph of related wallets based on:
    1. Shared funding source (1-hop back)
    2. Shared withdrawal destination
    3. Timing correlation
    """
    
    edges = []
    wallets = get_active_wallets(lookback_days)
    
    for wallet in wallets:
        # Edge type 1: Shared funder
        funder = wallet.get_funding_source(hops=1)
        wallets_same_funder = find_wallets_with_funder(funder)
        for w in wallets_same_funder:
            if w != wallet:
                edges.append((wallet, w, "shared_funder"))
        
        # Edge type 2: Shared cash-out destination
        cashout = wallet.get_withdrawal_destination()
        if cashout:
            wallets_same_cashout = find_wallets_with_cashout(cashout)
            for w in wallets_same_cashout:
                if w != wallet:
                    edges.append((wallet, w, "shared_cashout"))
    
    return build_graph(edges)


def rule_coordinated_cluster(market, window=timedelta(hours=6)):
    """
    Catches: Monad-style multi-wallet coordination
    Expected precision: 70-90%
    """
    
    MIN_CLUSTER_SIZE = 3
    MIN_TOTAL_NOTIONAL = 50000
    MAX_MEDIAN_AGE = 45
    
    clusters = build_wallet_clusters()
    
    for cluster_id, wallets in clusters.items():
        # Find wallets that traded same side in this market
        same_side_wallets = []
        for wallet in wallets:
            trades = wallet.get_trades(market, window)
            if trades and all_same_direction(trades):
                same_side_wallets.append(wallet)
        
        if len(same_side_wallets) < MIN_CLUSTER_SIZE:
            continue
        
        total_notional = sum(w.get_notional(market, window) 
                           for w in same_side_wallets)
        median_age = median([w.age_days for w in same_side_wallets])
        
        if (total_notional >= MIN_TOTAL_NOTIONAL
            and median_age <= MAX_MEDIAN_AGE):
            
            return Alert(
                rule="CoordinatedClusterSameSide",
                severity="CRITICAL",
                cluster_size=len(same_side_wallets),
                total_notional=total_notional,
                wallets=[w.address for w in same_side_wallets]
            )
    
    return None
```

**Why this works:** Chainalysis cracked Théo through funding pattern analysis. You're replicating that logic in a lighter-weight form. The key insight from Claude: "You don't need sophisticated graph analysis for an MVP—just flag when you see >3 fresh wallets in the same market within a short window."

---

## Phase 2: Scoring System (Week 6-7)

### 2.1 Signal Normalization Functions
**Priority: HIGH | Complexity: MEDIUM**

ChatGPT's normalization approach is most rigorous. Here's the implementation:

```python
import math

def clip(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))

def lognorm(x, lo, hi):
    """Log-scale normalization for heavy-tailed distributions"""
    if x <= 0:
        return 0.0
    return clip((math.log(x) - math.log(lo)) / (math.log(hi) - math.log(lo)))

# Signal normalization functions
def normalize_wallet_age(age_days):
    """Newer = higher score"""
    return clip(1 - lognorm(age_days, 1, 180))

def normalize_deposit(usdc_amount):
    """Larger = higher score"""
    return lognorm(usdc_amount, 1000, 200000)

def normalize_fund_to_trade(hours):
    """Faster = higher score"""
    return clip(1 - (hours / 24))

def normalize_concentration(share):
    """More concentrated = higher score"""
    return clip((share - 0.60) / (0.95 - 0.60))

def normalize_entry_odds(prob):
    """Lower odds = higher score"""
    return clip((0.25 - prob) / 0.25)

def normalize_size_vs_depth(ratio):
    """Higher impact = higher score"""
    return clip((ratio - 1.0) / (5.0 - 1.0))

def normalize_pre_move(mtm_1h):
    """Larger gain = higher score"""
    return clip((mtm_1h - 0.02) / (0.15 - 0.02))
```

### 2.2 Composite Insider Score
**Priority: HIGH | Complexity: MEDIUM**

Synthesizing all three responses, here's the final weighting:

```python
WEIGHTS = {
    # Wallet-level (33%)
    'wallet_age': 0.08,
    'deposit_size': 0.07,
    'fund_to_trade': 0.08,
    'concentration': 0.10,
    
    # Trade-level (42%)
    'entry_odds': 0.06,
    'size_vs_depth': 0.14,
    'aggressiveness': 0.08,
    'pre_move_advantage': 0.14,
    
    # Market-level (13%)
    'market_opacity': 0.08,
    'late_volatility': 0.05,
    
    # Cluster-level (12%)
    'shared_funder': 0.07,
    'coordination': 0.05,
}

def calculate_insider_score(wallet, trade, market, cluster_info):
    signals = {
        'wallet_age': normalize_wallet_age(wallet.age_days),
        'deposit_size': normalize_deposit(wallet.total_deposits_7d),
        'fund_to_trade': normalize_fund_to_trade(wallet.hours_to_first_trade),
        'concentration': normalize_concentration(wallet.top_market_share),
        'entry_odds': normalize_entry_odds(trade.entry_probability),
        'size_vs_depth': normalize_size_vs_depth(trade.notional / market.depth_2tick),
        'aggressiveness': normalize_aggressiveness(wallet.taker_ratio_6h),
        'pre_move_advantage': normalize_pre_move(trade.mtm_1h),
        'market_opacity': market.opacity_score,  # 0, 0.5, or 1.0
        'late_volatility': normalize_late_vol(market),
        'shared_funder': 1.0 if cluster_info.has_shared_funder else 0.0,
        'coordination': normalize_coordination(cluster_info.same_side_count),
    }
    
    score = sum(WEIGHTS[k] * signals[k] for k in WEIGHTS)
    return score, signals
```

### 2.3 Alert Thresholds
**Priority: HIGH | Complexity: LOW**

All three responses converge on similar thresholds:

| Score Range | Severity | Action | SLA |
|-------------|----------|--------|-----|
| ≥ 0.85 | CRITICAL | Auto-flag, immediate human review | < 1 hour |
| 0.70 - 0.84 | HIGH | Queue for priority review | < 4 hours |
| 0.50 - 0.69 | MEDIUM | Add to watchlist, review within 24h | < 24 hours |
| < 0.50 | LOW | Log and store, pattern analysis only | N/A |

---

## Phase 3: Market Classification (Week 8)

### 3.1 Market Vulnerability Taxonomy
**Priority: MEDIUM | Complexity: LOW**

Gemini's taxonomy is clearest, enhanced with ChatGPT's decision tree:

```python
def classify_market_vulnerability(market):
    """
    Returns: HIGH, MEDIUM, or LOW vulnerability classification
    Based on: Information opacity, event discreteness, manipulability, liquidity
    """
    
    score = 0
    
    # Factor 1: Information Opacity (0-2 points)
    if market.category in ['awards', 'crypto_team_decisions', 'private_corporate']:
        score += 2  # HIGH opacity
    elif market.category in ['scheduled_data_releases', 'localized_events']:
        score += 1  # MEDIUM opacity
    # else: LOW opacity (0 points)
    
    # Factor 2: Event Discreteness (0-1 points)
    if market.has_specific_announcement_time:
        score += 1  # Discrete switch
    
    # Factor 3: Manipulability Risk (0-1 points)
    if market.resolution_source == 'subjective' or market.has_ambiguous_wording:
        score += 1
    
    # Factor 4: Liquidity Fragility (0-1 points)
    if market.depth_2tick < 25000:  # USD
        score += 1
    
    # Classification
    if score >= 3:
        return "HIGH"
    elif score == 2:
        return "MEDIUM"
    else:
        return "LOW"
```

### 3.2 Market Category Mapping
**Priority: MEDIUM | Complexity: LOW**

```python
MARKET_CATEGORIES = {
    'HIGH_OPACITY': [
        'Nobel Prize',
        'Academy Awards',
        'Crypto airdrops',
        'Token listings',
        'Executive appointments',
        'Merger announcements',
        'FDA approvals',
    ],
    'MEDIUM_OPACITY': [
        'Legal rulings (scheduled)',
        'Political raids/actions',
        'Embargoed data releases',
        'Specific sports outcomes',
    ],
    'LOW_OPACITY': [
        'Elections (poll-based)',
        'Macroeconomic indicators',
        'Continuous sports seasons',
        'Weather events',
    ],
}
```

---

## Phase 4: Adversarial Hardening (Week 9-10)

### 4.1 Evasion Counter-Measures
**Priority: MEDIUM | Complexity: HIGH**

Claude's adversarial analysis is most honest. Here's the counter-measure matrix:

| Your Criterion | Evasion Tactic | Counter-Measure | Implementation |
|----------------|----------------|-----------------|----------------|
| Wallet age < 14d | Pre-create wallets weeks ahead, make small trades | **Dormancy detection**: Flag accounts inactive >6 months that suddenly deposit + trade | Add `wallet.last_activity_before_current` field |
| Deposit ≥ $3k | Split across 10+ wallets at $500 each | **Entity-level aggregation**: Sum deposits across clustered wallets | Run cluster detection before size checks |
| Trade within 2h | Pre-fund days earlier, hold USDC idle | **Time-to-event tracking**: Flag when trade occurs <24h before resolution regardless of funding time | Add `market.hours_to_resolution` to alerts |
| Entry odds ≤ 15% | Enter at 30%, scale in as odds drop | **Pre-move detection**: Track MTM gain regardless of entry odds | Already covered by Rule #2 |
| Concentration ≥ 85% | Add noise trades in other markets | **Conviction ratio**: `(Trade size in target) / (Avg historical trade size)` | Add `wallet.avg_trade_size` metric |

### 4.2 Camouflage Pattern Detection
**Priority: LOW | Complexity: HIGH**

Théo's distinctive pattern (many $0.30-$187 noise orders + $4,302 "real" orders) is a fingerprint:

```python
def detect_camouflage_pattern(wallet, market, window=timedelta(hours=48)):
    """
    Detect Théo-style noise + anchor pattern
    """
    trades = wallet.get_trades(market, window)
    
    if len(trades) < 10:
        return False
    
    sizes = [t.notional_usdc for t in trades]
    small_trades = [s for s in sizes if s < 50]
    large_trades = [s for s in sizes if s > 1000]
    
    small_ratio = len(small_trades) / len(trades)
    has_anchor = len(large_trades) > 0
    
    # Théo pattern: >60% small orders AND presence of large anchors
    if small_ratio >= 0.6 and has_anchor:
        return Alert(
            rule="CamouflagePattern",
            severity="MEDIUM",
            small_order_ratio=small_ratio,
            anchor_sizes=large_trades
        )
    
    return None
```

---

## Phase 5: UI/UX Integration (Week 11-12)

### 5.1 Alert Dashboard
**Priority: HIGH | Complexity: MEDIUM**

Following PolyWolyTroly design system, here's the alert card structure:

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 CRITICAL ALERT                              Score: 0.87     │
│  ──────────────────────────────────────────────────────────────  │
│                                                                 │
│  📍 Market: Will Trump win 2024 election?                       │
│  👛 Wallet: 0x1234...5678 (3 days old)                          │
│  💰 Position: $45,000 @ 12% odds                                │
│  📈 MTM 1h: +14.2%                                              │
│                                                                 │
│  Triggered rules:                                               │
│  ✓ FreshConcentratedDepthImpact                                 │
│  ✓ PreMoveAdvantage                                             │
│  ○ CoordinatedCluster (not triggered)                           │
│                                                                 │
│  [View Wallet Profile]  [View Market]  [Dismiss]  [Investigate] │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Human Review Packet
**Priority: MEDIUM | Complexity: MEDIUM**

For each alert, generate:

1. **Wallet Summary**: Age, funding provenance, footprint, concentration, realized/unrealized PnL
2. **Trade Timeline**: Fills, prices, impact vs depth, MTM at 15m/1h/6h
3. **Cluster View**: Linked wallets, shared endpoints, aggregate exposure
4. **Market Context**: Opacity class, time to resolution, odds volatility regime

---

## Implementation Priority Matrix

| Task | Priority | Complexity | Dependencies | Week |
|------|----------|------------|--------------|------|
| Data pipeline setup | CRITICAL | MEDIUM | None | 1-2 |
| Threshold revision | CRITICAL | LOW | None | 1 |
| Rule #1: Fresh-Concentrated-Depth | CRITICAL | MEDIUM | Data pipeline | 3-4 |
| Rule #2: Pre-Move Advantage | CRITICAL | MEDIUM | Data pipeline | 3-4 |
| Rule #3: Cluster Detection | HIGH | HIGH | Data pipeline | 4-5 |
| Signal normalization | HIGH | MEDIUM | Rules 1-3 | 6 |
| Composite scoring | HIGH | MEDIUM | Normalization | 6-7 |
| Alert thresholds | HIGH | LOW | Scoring | 7 |
| Market classification | MEDIUM | LOW | None | 8 |
| Evasion counter-measures | MEDIUM | HIGH | Rules 1-3 | 9-10 |
| Camouflage detection | LOW | HIGH | Cluster detection | 10 |
| Alert UI | HIGH | MEDIUM | Scoring | 11-12 |
| Review packet UI | MEDIUM | MEDIUM | Alert UI | 12 |

---

## What I'm Discarding

From the three responses, I'm **not** including:

1. **Gemini's WSS formula** (too simplistic—only 3 components vs ChatGPT's 12)
2. **Sound effects for alerts** (from your design docs—not relevant to detection logic)
3. **Cross-platform hedging detection** (ChatGPT's idea—impractical without off-chain data)
4. **ML-based anomaly detection** (Claude correctly says this is v2.0)
5. **Alpha decay measurement** (Gemini's idea—overlaps with pre-move advantage)

---

## Honest Caveats (Claude's contribution)

1. **Base rates unknown**: We don't know how many wallets fit these criteria and *aren't* insiders. Expect to tune thresholds after seeing real alert volumes.

2. **False positive management**: Claude estimates 5-15% of large trades could alert if you use 3-of-5 rules. The composite scoring approach should bring this down to <3%.

3. **You won't catch sophisticated actors**: Théo avoided detection for months with $85M. This system targets sloppy insiders—which, based on your documented cases, is still a meaningful category.

4. **Legal ambiguity**: Polymarket doesn't prohibit insider trading. This creates more activity to detect but also means sophisticated actors have less reason to hide.

---

## Next Steps

1. **Immediate (this week)**: Set up Polygon RPC listeners and Polymarket API polling
2. **Week 2**: Backfill historical data for your 4 documented cases; verify rules would have caught them
3. **Week 3**: Implement Rules 1 & 2 in production
4. **Week 4-5**: Implement cluster detection (most complex piece)
5. **Week 6+**: Scoring, UI, refinement

