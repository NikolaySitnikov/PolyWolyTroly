# Decision: Market Depth Polling Strategy

**Date:** 2026-01-13
**Status:** DECIDED
**Decision ID:** 001
**Phase:** 0.9 (Integration & Testing)

---

## Context

During Phase 0.9 integration testing, we discovered that the market depth service was attempting to poll **all 5,591 active markets** every 30 seconds. This caused:
- Database connection pool exhaustion
- API endpoint timeouts (detection endpoints became unresponsive)
- Over 117,000 depth snapshots accumulated in the database
- Poll cycles taking 7,000+ seconds (nearly 2 hours) instead of 30 seconds

The original implementation (from Phase 0.4) followed the spec literally:
> "Poll order book every 5 seconds" (later adjusted to 30s)
> "Store depth at 2-tick, 5-tick, 10-tick levels"

However, the spec didn't account for the scale of Polymarket (5,500+ active markets).

---

## Options Considered

### Option A: Poll All Markets (Status Quo)
**Pros:**
- Complete data coverage
- Simple implementation
- No filtering logic needed

**Cons:**
- 5,591 API calls per poll cycle (even with batching)
- Database writes every 30s × 5,591 markets = massive I/O
- Connection pool exhaustion
- Unsustainable at scale

### Option B: Poll Only High-Volume Markets
**Pros:**
- Reduces polling to manageable number (~100-500 markets)
- High-volume markets are where large trades occur
- Most insider activity targets liquid markets

**Cons:**
- Misses low-volume markets where manipulation is easier
- Volume thresholds need tuning

### Option C: On-Demand Depth Fetching (Lazy Loading)
**Pros:**
- Only fetch depth when evaluating a suspicious trade
- Zero background polling overhead
- Scales linearly with suspicious activity, not market count

**Cons:**
- Slight latency on first access
- No historical depth baseline without polling
- Can't detect "depth impact" without knowing pre-trade depth

### Option D: Hybrid Approach (CHOSEN)
**Strategy:**
1. **Background polling**: Only poll top ~100 markets by 24h volume
2. **On-demand fetching**: Fetch depth for any market when a trade is being evaluated
3. **Cache aggressively**: 30-second cache for all depth data
4. **Defer median calculation**: Calculate 30-day median only for markets with alerts

**Pros:**
- Manageable background load (~100 markets × 30s = sustainable)
- Full coverage when actually needed (on-demand)
- Historical baseline for high-activity markets
- Scales with alert volume, not market count

**Cons:**
- More complex implementation
- Some latency for long-tail markets

---

## Decision

**We will implement Option D: Hybrid Approach**

### Implementation Details

1. **Modify `marketDepthService.ts`:**
   - Add `MAX_BACKGROUND_MARKETS = 100` constant
   - Filter `pollAllMarkets()` to only include top markets by volume
   - Add `captureDepthOnDemand(conditionId)` method for ad-hoc fetches

2. **Depth fetching priority:**
   ```
   Priority 1: Markets with recent whale activity (from wallets table)
   Priority 2: Markets with high 24h volume (from markets table)
   Priority 3: Markets approaching resolution (within 7 days)
   ```

3. **When evaluating trades (Phase 1):**
   - If depth is cached (< 30s old): use cache
   - If not cached: fetch on-demand, cache result
   - If fetch fails: proceed without depth data (log warning)

4. **Median calculation:**
   - Only calculate for markets that triggered alerts
   - Run hourly, not for all markets

---

## Metrics to Monitor

After implementation, track:
- Poll cycle duration (target: < 60 seconds)
- API endpoint response times (target: < 500ms p95)
- Cache hit rate for depth data (target: > 80%)
- Number of on-demand fetches per hour

---

## Future Considerations

When implementing Phase 1 (Core Detection Engine), revisit this decision:
- If detection rules require depth for ALL trades, may need to expand polling
- If detection rules only fire on whale activity, current approach is sufficient
- Consider adding market "watchlist" feature for manual priority markets

---

## Related Files

- `src/services/insiderDetection/marketDepthService.ts` - Primary implementation
- `src/services/insiderDetection/detectionDatabase.ts` - Depth snapshot storage
- `Implementation/Phase 0 tasks.md` - Phase 0.4 original spec

---

## Changelog

- **2026-01-13**: Initial decision documented during Phase 0.9 integration testing
