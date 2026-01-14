# Phase 0.9.2: Performance Testing Plan

**Date:** 2026-01-13
**Status:** DOCUMENTED

---

## Overview

This document outlines the performance characteristics and testing strategy for the Phase 0 Insider Detection System infrastructure.

---

## Current Performance Baseline

### Service Metrics (as of 2026-01-13)

| Service | Metric | Value | Target |
|---------|--------|-------|--------|
| **Depth Service** | Markets polled | 100 (top by volume) | 100 |
| | Poll cycle duration | ~26 seconds | < 60s |
| | Snapshots per cycle | 97-100 | 100 |
| | API calls/cycle | 100 | 100 |
| **CTF Listener** | Transfers processed | 35,000+ | Unlimited |
| | Deduplication rate | Near 0% | < 1% |
| | Processing latency | Real-time | < 5s |
| **Market Metadata** | Markets synced | 5,602 | All active |
| | Sync interval | 5 minutes | 5 min |
| | Sync duration | < 1 second | < 30s |
| **Detection APIs** | Response time (stats) | < 100ms | < 500ms |
| | Response time (alerts) | < 100ms | < 500ms |
| | Response time (config) | < 50ms | < 200ms |

### Database Tables

| Table | Rows | Growth Rate | Index Health |
|-------|------|-------------|--------------|
| `markets` | ~5,600 | ~50/day | Good |
| `depth_snapshots` | ~117,000 | ~100/30s | Good |
| `ctf_transfers` | ~35,000 | ~1,000/day | Good |
| `wallet_activity` | ~2,000 | Variable | Good |
| `wallet_funding_sources` | Variable | On-demand | Good |
| `detection_alerts` | 0 (Phase 1) | TBD | Good |
| `detection_config` | 5 | Static | Good |

---

## Performance Test Scenarios

### Scenario 1: Sustained Load (Baseline)

**Purpose:** Verify system stability under normal operating conditions.

**Procedure:**
1. Run all services for 24 hours
2. Monitor memory usage, CPU, and connection pool
3. Track error rates across all services

**Metrics to Capture:**
- Peak memory usage
- Average CPU utilization
- Connection pool saturation
- Error rate per service

**Acceptance Criteria:**
- Memory growth < 100MB over 24 hours
- CPU average < 50%
- Connection pool never exhausted
- Error rate < 0.1%

### Scenario 2: Burst Trade Activity

**Purpose:** Verify system handles high transaction volume spikes.

**Procedure:**
1. Simulate 1,000 CTF transfers in 60 seconds
2. Monitor processing backlog and latency
3. Verify no data loss

**Metrics to Capture:**
- Processing latency (p50, p95, p99)
- Queue depth
- Deduplication accuracy

**Acceptance Criteria:**
- p95 latency < 5 seconds
- No duplicate processing
- All transfers persisted

### Scenario 3: API Stress Test

**Purpose:** Verify API endpoints handle concurrent requests.

**Procedure:**
1. 50 concurrent requests to `/api/detection/stats`
2. 50 concurrent requests to `/api/detection/alerts`
3. Mixed workload: 100 concurrent mixed requests

**Metrics to Capture:**
- Response time (p50, p95, p99)
- Error rate
- Throughput (requests/second)

**Acceptance Criteria:**
- p95 response time < 1 second
- Error rate < 1%
- Throughput > 100 req/s

### Scenario 4: Database Growth Simulation

**Purpose:** Verify system handles large data volumes.

**Procedure:**
1. Simulate 1M depth snapshots
2. Query performance with large dataset
3. Index effectiveness verification

**Metrics to Capture:**
- Query time for common operations
- Index usage statistics
- Table/index sizes

**Acceptance Criteria:**
- Query time < 500ms for all operations
- Index hit rate > 95%
- No full table scans

---

## Monitoring Commands

### Real-time Service Status
```bash
curl http://localhost:3002/api/health | jq
```

### Database Connection Pool
```bash
# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'polywolytroly';"
```

### Redis Cache Status
```bash
redis-cli INFO stats | grep -E "total_connections|connected_clients|used_memory"
```

### Memory Usage
```bash
ps aux | grep "tsx src/api" | awk '{print $6/1024 " MB"}'
```

---

## Known Performance Considerations

### 1. Depth Polling Scaling

**Issue:** Originally tried to poll all 5,591 markets every 30 seconds.

**Solution:** Limited to top 100 markets by volume with on-demand fetching for others.

**See:** `Implementation/decisions/001_depth_polling_strategy.md`

### 2. Funding Analysis API Rate Limits

**Issue:** Alchemy API has rate limits for asset transfer queries.

**Mitigation:**
- Retry with exponential backoff (3 attempts)
- Cache funding analysis results for 30 minutes
- Background analysis to avoid blocking user requests

### 3. WebSocket Connection Pool

**Issue:** Multiple browser tabs can exhaust WebSocket connections.

**Mitigation:** Connection pooling and heartbeat-based cleanup.

---

## Load Testing Tools

For formal load testing, consider:

1. **k6** - JavaScript-based load testing
   ```bash
   k6 run --vus 50 --duration 60s load-test.js
   ```

2. **autocannon** - Node.js HTTP benchmarking
   ```bash
   npx autocannon -c 50 -d 30 http://localhost:3002/api/detection/stats
   ```

3. **wrk** - HTTP benchmarking tool
   ```bash
   wrk -t12 -c400 -d30s http://localhost:3002/api/detection/stats
   ```

---

## Future Performance Optimizations (Phase 1+)

1. **Database Partitioning**: Partition `depth_snapshots` by month when table exceeds 10M rows
2. **Read Replicas**: Add read replica for heavy query workloads
3. **Caching Layer**: Expand Redis caching for frequently accessed data
4. **Alert Batching**: Batch alert creation to reduce DB writes during high activity
5. **Connection Pool Tuning**: Adjust pool size based on observed connection patterns

---

## Performance Testing Schedule

| Test | Frequency | Last Run | Status |
|------|-----------|----------|--------|
| Baseline (24h) | Weekly | - | Pending |
| Burst activity | After major changes | - | Pending |
| API stress | After API changes | - | Pending |
| DB growth | Monthly | - | Pending |

---

## Conclusion

Phase 0 infrastructure is designed for scalability with the current optimizations:
- Depth polling limited to top 100 markets
- Aggressive caching (30s-30min TTLs)
- Indexed database queries
- Rate-limited external API calls

Formal load testing should be conducted before Phase 1 deployment to establish baselines and identify bottlenecks.
