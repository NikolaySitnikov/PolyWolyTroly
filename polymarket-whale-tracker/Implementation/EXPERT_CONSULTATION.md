# Expert Consultation: Insider Detection System Design Decisions

This document collects design and logic questions that arose during implementation of the Insider Trading Detection System. These require expert input from someone with domain expertise in:
- Prediction market mechanics
- Insider trading detection patterns
- Statistical confidence scoring
- Risk assessment algorithms

---

## Question 1: Normalization Range Mismatch with Thresholds

### Context
The detection rules use a confidence scoring system where multiple factors contribute to an overall confidence score (0.0 to 1.0). Each factor is normalized to a 0-1 range using helper functions, then weighted.

### Current Implementation

**Wallet Age Factor (FreshConcentratedDepthImpact rule):**
```typescript
const NORM_RANGES = {
  walletAge: { min: 1, max: 30 },  // 1-30 days
};

// Rule threshold: wallet age ≤ 14 days to trigger
// Normalization: normalizeInverse() maps younger = higher score
```

**Problem:**
- Rule only triggers if wallet age ≤ 14 days
- But normalization range is 1-30 days
- A 14-day wallet (edge of threshold) gets score ≈ 0.55
- A 0-day wallet gets score = 1.0

**Mathematical inconsistency:** The threshold range (0-14 days) doesn't align with the scoring range (1-30 days). A wallet that barely triggers the rule (14 days) scores ~0.5 instead of ~0.

**Trade Size Factor:**
```typescript
const NORM_RANGES = {
  tradeSize: { min: 1000, max: 50000 },  // Log scale
};

// Rule threshold: min_trade_size_usd = $3,000
// Normalization: normalizeLog() maps larger = higher score
```

**Problem:**
- Rule only triggers if trade ≥ $3,000
- But normalization range starts at $1,000
- A $3K trade (minimum to trigger) gets score ≈ 0.28 instead of 0.0
- Trades over $50K all get capped at 1.0

### Questions for Expert

1. **Should normalization ranges match threshold ranges?**
   - Option A: Keep current (wider range allows for nuance above threshold)
   - Option B: Align ranges so threshold boundary = 0, extreme = 1

2. **What does "high confidence" mean for each factor?**
   - For wallet age: Is a 1-day wallet truly 2x more suspicious than a 7-day wallet?
   - For trade size: Is $50K the right "maximum suspicion" cutoff, or should it be higher (e.g., $500K)?

3. **Is capping at the extremes appropriate?**
   - Currently: $100K trade and $50K trade both score 1.0
   - Should there be differentiation above $50K?

### Proposed Alternative (pending expert input)
```typescript
// Option: Align normalization with thresholds
walletAge: { min: 0, max: 14 }   // 0 days = 1.0, 14 days = 0.0
tradeSize: { min: 3000, max: 100000 }  // $3K = 0.0, $100K = 1.0
```

---

## Question 2: Confidence Score Weight Distribution

### Context
The FreshConcentratedDepthImpact rule combines 5 factors with these weights:

```typescript
const WEIGHTS = {
  walletAge: 0.25,      // How new is the wallet
  tradeSize: 0.20,      // How large is the trade
  depthImpact: 0.25,    // How much did it move the market
  concentration: 0.15,  // How focused on one market
  timing: 0.15,         // How close to market resolution
};
```

### Questions for Expert

1. **Are these weights appropriate for insider detection?**
   - Is wallet age really as important as depth impact (both 0.25)?
   - Should timing be weighted higher since insiders need to trade before the event?

2. **Should weights be configurable per-market-type?**
   - Sports events (known resolution time) vs. political events (uncertain resolution)
   - Short-term markets vs. long-term markets

3. **Is additive combination appropriate?**
   - Current: `totalScore = Σ(weight × normalizedValue)`
   - Alternative: Multiplicative for certain "must-have" factors?
   - E.g., if wallet age > 30 days, should that override other factors regardless of score?

---

## Question 3: Pre-Move Advantage Price Movement Thresholds

### Context
The PreMoveAdvantage rule detects trades made before significant price movements.

```typescript
const THRESHOLDS = {
  min_price_move_pct: 15,      // 15% minimum price movement to consider
  max_time_window_hours: 24,   // Look back 24 hours before the move
  min_trade_size_usd: 5000,    // Minimum $5K trade
};
```

### Questions for Expert

1. **Is 15% the right threshold for "significant" price movement?**
   - Polymarket prices are 0-1 (representing probability)
   - A move from 0.50 to 0.65 is 15% absolute, but 30% relative
   - Should we use absolute or relative percentage?

2. **Is 24 hours the right lookback window?**
   - Too short: Miss insiders who trade days ahead
   - Too long: More false positives from lucky trades
   - Should this vary by market type (sports vs. political)?

3. **How to handle multi-leg trades?**
   - Insider might split $50K into 10 × $5K trades
   - Current implementation evaluates each trade independently
   - Should we aggregate trades by wallet within a time window?

---

## Question 4: Wallet Auto-Add Service Thresholds

### Context
When a detection alert is created, the system can automatically add the wallet to the whale tracking database for ongoing monitoring.

```typescript
const CONFIG = {
  minSeverityToAdd: "MEDIUM",  // Only MEDIUM, HIGH, CRITICAL
  minConfidenceToAdd: 0.5,     // 50% minimum confidence
  enabledRules: {
    FreshConcentratedDepthImpact: true,
    PreMoveAdvantage: true,
    CoordinatedCluster: true,
  },
};
```

### Questions for Expert

1. **Are these thresholds appropriate?**
   - Should LOW severity alerts ever trigger auto-add?
   - Is 50% confidence too low or too high?

2. **Should different rules have different thresholds?**
   - PreMoveAdvantage (proven price movement) might warrant lower threshold
   - CoordinatedCluster (pattern-based) might need higher threshold

3. **What about false positive management?**
   - Auto-added wallets could bloat the database
   - Should there be a "provisional" status that expires if no further alerts?

---

## Question 5: Coordinated Cluster Detection Parameters

### Context
The CoordinatedCluster rule detects groups of wallets that trade together suspiciously.

```typescript
// Current thresholds (to be implemented in Phase 1.6)
const CLUSTER_THRESHOLDS = {
  min_cluster_size: 3,           // At least 3 wallets
  max_time_spread_minutes: 60,   // All trades within 60 minutes
  min_total_volume_usd: 10000,   // Combined volume ≥ $10K
  same_market_required: true,    // Must all trade same market
  same_direction_required: true, // Must all trade same direction (YES/NO)
};
```

### Questions for Expert

1. **How to define "coordinated"?**
   - Time-based: All within X minutes
   - Funding-based: Wallets funded from same source
   - Behavioral: Similar trading patterns historically

2. **What's the minimum cluster size for suspicion?**
   - 2 wallets could be coincidence or one person with 2 wallets
   - 5+ wallets is more clearly coordinated
   - Where's the threshold?

3. **How to handle legitimate group behavior?**
   - Trading groups, DAOs, or copy-trading could look like coordination
   - Any heuristics to distinguish legitimate from malicious?

---

## How to Use This Document

1. Review each question section
2. Provide your expert opinion on the numbered questions
3. If you have alternative approaches, describe them
4. Indicate confidence level in your recommendations (high/medium/low)

We will incorporate your feedback into the detection system configuration and potentially the algorithm design itself.

---

*Document created: 2026-01-14*
*Implementation reference: [Insider Trading Detection System.md](./Insider%20Trading%20Detection%20System.md)*
*Phase 1 progress: [Phase 1 tasks.md](./Phase%201%20tasks.md)*
