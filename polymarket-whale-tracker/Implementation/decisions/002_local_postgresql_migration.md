# Decision 002: Migration from Supabase to Local PostgreSQL

**Date**: 2026-01-14
**Status**: Implemented
**Impact**: High (Infrastructure Change)

## Context

The Insider Trading Detection System was storing excessive data in Supabase, causing critical usage limit violations:

- **Egress**: 203.872 / 5 GB (4,077% - over 40x the limit)
- **Database Size**: 1.336 / 0.5 GB (267% - nearly 3x the limit)

### Root Cause Analysis

| Table | Size | Row Count | Problem |
|-------|------|-----------|---------|
| `depth_snapshots` | 904 MB | 1,297,083 | Capturing snapshots for too many markets |
| `ctf_transfers` | 166 MB | 231,136 | Storing ALL transfers (~170K+/day), not just suspicious ones |
| `price_history` | 117 MB | 187,938 | Recording prices for all active markets |
| `wallet_activity` | 34 MB | 9,266 | Derived from excessive transfers |

**Key Insight**: The system was designed to EVALUATE all transfers but should only STORE suspicious ones. Instead, it was storing everything.

## Decision

Migrate from Supabase (cloud) to local PostgreSQL for development/testing phase because:

1. **No budget for paid tier** - Free tier limits are insufficient
2. **Local development benefit** - Faster queries, no network latency
3. **No storage limits** - Local disk has plenty of space
4. **Privacy** - Data stays on local machine during development

## Implementation

### Step 1: Install PostgreSQL Locally

```bash
# Install via Homebrew
brew install postgresql@15

# Start service (auto-starts on boot)
brew services start postgresql@15

# Create database
/opt/homebrew/opt/postgresql@15/bin/createdb polywoly
```

### Step 2: Apply Schema

Created `/tmp/local_schema.sql` with all tables from Supabase, adding:
- Primary keys for all tables
- Unique constraints for ON CONFLICT clauses
- Indexes for performance
- Default rule configurations

Key constraint added for transfer deduplication:
```sql
ALTER TABLE ctf_transfers ADD CONSTRAINT ctf_transfers_unique_tx
  UNIQUE (tx_hash, log_index);
```

### Step 3: Update Environment

Changed `.env` from:
```
DATABASE_URL=postgresql://postgres.xxx:xxx@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

To:
```
DATABASE_URL=postgresql://localhost:5432/polywoly
```

### Step 4: Restart Services

```bash
pm2 restart polywoly-backend
```

## Results

After migration:
- Markets syncing correctly: 136+ markets
- Depth snapshots being recorded: 97+ snapshots
- Transfers being recorded: 683+ (and counting)
- No more Supabase usage limit warnings

## Managing Local PostgreSQL

### Commands

```bash
# Check status
brew services list | grep postgresql

# Stop PostgreSQL
brew services stop postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Access database directly
/opt/homebrew/opt/postgresql@15/bin/psql -d polywoly

# View table sizes
/opt/homebrew/opt/postgresql@15/bin/psql -d polywoly -c "
  SELECT tablename, pg_size_pretty(pg_total_relation_size('public.' || tablename))
  FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size('public.' || tablename) DESC;
"
```

### Data Location

PostgreSQL data is stored at:
```
/opt/homebrew/var/postgresql@15
```

### Logs

PostgreSQL logs are at:
```
/opt/homebrew/var/log/postgresql@15.log
```

## Future Considerations

### Still Pending

1. **Fix transfer storage logic** - Only store transfers that trigger detection rules or meet minimum criteria (e.g., >$1000 trade size)
2. **Add data retention** - Auto-delete old `depth_snapshots` and `price_history` (e.g., keep only 24-48 hours)
3. **Optimize polling** - Reduce depth polling frequency for markets with no suspicious activity

### Migration to Production

When ready to deploy to production:

1. **Option A: Upgrade Supabase** - Pro plan ($25/month) with 8GB database, 50GB egress
2. **Option B: Self-hosted PostgreSQL** - DigitalOcean Droplet ($4-6/month)
3. **Option C: Railway/Render** - Managed PostgreSQL with better pricing

### Switching Back to Supabase

The old Supabase connection string is preserved in `.env` as a comment:
```bash
# To switch back to Supabase, uncomment:
# DATABASE_URL=postgresql://postgres.cmhowipmwewpzhkqcfoy:xxx@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

## Lessons Learned

1. **Monitor usage early** - Check database/egress usage before hitting limits
2. **Design for selective storage** - Evaluate all data, store only what's needed
3. **Local development is valuable** - Avoids cloud costs during active development
4. **Keep schema in version control** - Schema was not in a `.sql` file, had to export

## Related Files

- `.env` - Database connection string
- `/tmp/local_schema.sql` - Schema applied to local PostgreSQL
- `src/services/insiderDetection/detectionDatabase.ts` - Database operations
- `ecosystem.config.cjs` - PM2 configuration for backend service
