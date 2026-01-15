# Decision 003: Switch to On-Demand Depth Fetching

**Date**: 2026-01-15
**Status**: Implemented
**Impact**: High (Storage Optimization)

## Context

After migrating to local PostgreSQL (Decision 002), we analyzed storage usage and found:

| Table | Projected Growth | Problem |
|-------|------------------|---------|
| `depth_snapshots` | ~4 GB/month | Continuous polling of 100 markets every 30s |
| `ctf_transfers` | ~1.5 GB/month | Required - stores all transfers for cluster detection |
| `price_history` | ~500 MB/month | Required - stores prices for MTM calculations |

**Key Insight**: Only Rule #1 (Fresh-Concentrated-Depth Impact) needs order book depth data, and it only needs depth at the moment a trade is being evaluated, not historical depth.

## Decision

Switch from **continuous background polling** to **on-demand depth fetching**:

1. **Remove background polling** - No more 30-second polling of top 100 markets
2. **Fetch on-demand** - When Rule #1 evaluates a trade, fetch depth from CLOB API
3. **Update retention** - Keep only 3 days of depth (rarely stored in on-demand mode)

## Analysis: When Is Depth Actually Needed?

### Rule #1: Fresh-Concentrated-Depth Impact
- **Needs**: Current depth at time of trade evaluation
- **Solution**: Fetch from CLOB API (~300ms) when evaluating

### Rule #2: Pre-Move Advantage
- **Needs**: Price history only (no depth)
- **Solution**: Already using `priceHistoryService`

### Rule #3: Coordinated Cluster
- **Needs**: Wallet clusters and funding sources only (no depth)
- **Solution**: Already using `clusterService`

**Conclusion**: Only Rule #1 needs depth, and only at evaluation time.

## Implementation

### 1. Disabled Background Polling (`server.ts`)

```typescript
// Market depth service - ON-DEMAND mode (no background polling)
// Depth is fetched from CLOB API only when Rule #1 evaluates a trade
// This saves ~4GB/month of storage vs continuous polling
console.log('Market depth service ready - ON-DEMAND mode (no background polling)');
console.log('Depth will be fetched from CLOB API when detection rules need it');
```

### 2. Added On-Demand Fallback (`marketDepthService.ts`)

```typescript
async getLiquidityAtTick(
  conditionId: string,
  tickLevel: 2 | 5 | 10 = 2
): Promise<{ bid: number; ask: number; total: number } | null> {
  // Try cached/stored data first
  let snapshot = await this.getLatestDepth(conditionId);

  // If no data, fetch on-demand from CLOB API
  if (!snapshot) {
    snapshot = await this.captureDepthOnDemand(conditionId);
  }

  if (!snapshot) {
    return null;
  }
  // ... calculate liquidity at tick level
}
```

### 3. Updated Retention Periods (`dataRetentionService.ts`)

```typescript
const RETENTION_POLICIES = {
  ctf_transfers: 14,   // 14 days for cluster detection lookback
  depth_snapshots: 3,  // Minimal - on-demand mode rarely stores
  price_history: 14,   // 14 days for MTM calculations
  wallet_activity: 30, // 30 days for wallet profiles
};
```

## Trade-offs

### Pros
- **~80% storage reduction** - From ~5GB/month to ~1GB/month
- **Simpler architecture** - No background polling loop
- **No rate limit concerns** - Only fetch when needed

### Cons
- **~300ms latency** - On-demand fetch adds latency to Rule #1 evaluation
- **No historical depth** - Can't analyze depth patterns over time
- **API dependency** - Rule #1 blocked if CLOB API is down

### Why This Is Acceptable

1. **300ms latency is negligible** - User reviewing alerts won't notice
2. **Historical depth rarely useful** - Insider detection cares about depth at trade time, not trends
3. **API downtime is rare** - CLOB API is highly available; if down, Rule #1 returns "not triggered"

## Expected Storage

| Table | Retention | Expected Size |
|-------|-----------|---------------|
| `ctf_transfers` | 14 days | ~500 MB |
| `price_history` | 14 days | ~200 MB |
| `wallet_activity` | 30 days | ~100 MB |
| `depth_snapshots` | 3 days | ~50 MB (on-demand only) |
| **Total** | - | **~850 MB** |

## Related Files

- `src/api/server.ts` - Removed `marketDepthService.startPolling()` call
- `src/services/insiderDetection/marketDepthService.ts` - Added on-demand fallback
- `src/services/insiderDetection/dataRetentionService.ts` - Updated retention periods
- `CLAUDE.md` - Updated documentation

## Cron Setup

Daily cleanup at 3 AM:
```bash
0 3 * * * cd /path/to/polymarket-whale-tracker && npx tsx src/services/insiderDetection/dataRetentionService.ts >> /var/log/polywoly-retention.log 2>&1
```

Add to crontab with `crontab -e`.
