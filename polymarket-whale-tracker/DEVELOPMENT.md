# Development Guide

## Starting the Services

Always start **both** services for full functionality.

### 1. Backend API (start first)

```bash
cd polymarket-whale-tracker
npm run dev:api
```

- API: http://localhost:3002
- WebSocket: ws://localhost:3002

### 2. Frontend (start second)

```bash
cd polymarket-whale-tracker/frontend
npm run dev -- --host
```

- Local: http://localhost:5173
- Network: http://<your-ip>:5173

### Production Mode with PM2 (Recommended)

For reliable auto-restart on crash, use PM2:

```bash
cd polymarket-whale-tracker

# Start both services with auto-restart
pm2 start ecosystem.config.cjs

# Check status
pm2 list

# View logs
pm2 logs polywoly-backend
pm2 logs polywoly-frontend

# Stop all
pm2 stop all

# Restart after code changes
npm run build && pm2 restart polywoly-backend
```

**PM2 Features:**
- Auto-restarts on crash (max 10 restarts in 15 min)
- Restarts if memory exceeds 1GB
- Logs saved to `./logs/pm2-*.log`
- Process list saved for easy restart: `pm2 save` then `pm2 resurrect`

#### PM2 Manual Control Commands

```bash
# === STATUS ===
pm2 list                      # Show all processes with status
pm2 status                    # Same as list
pm2 show polywoly-backend     # Detailed info for one process

# === STOP ===
pm2 stop polywoly-backend     # Stop backend only
pm2 stop polywoly-frontend    # Stop frontend only
pm2 stop all                  # Stop all processes

# === RESTART ===
pm2 restart polywoly-backend  # Restart backend only
pm2 restart polywoly-frontend # Restart frontend only
pm2 restart all               # Restart all processes

# === KILL (complete shutdown) ===
pm2 delete polywoly-backend   # Remove backend from PM2
pm2 delete polywoly-frontend  # Remove frontend from PM2
pm2 delete all                # Remove all processes
pm2 kill                      # Kill PM2 daemon entirely

# === LOGS ===
pm2 logs                      # Stream all logs
pm2 logs polywoly-backend     # Stream backend logs only
pm2 logs --lines 100          # Show last 100 lines
pm2 flush                     # Clear all log files

# === AFTER CODE CHANGES ===
npm run build && pm2 restart polywoly-backend

# === RECOVER ===
pm2 resurrect                 # Restore saved process list (after pm2 kill)
pm2 start ecosystem.config.cjs  # Start fresh from config
```

**To enable auto-start on system boot:**
```bash
pm2 save
sudo env PATH=$PATH:/opt/homebrew/Cellar/node/24.3.0/bin /opt/homebrew/lib/node_modules/pm2/bin/pm2 startup launchd -u nikolaysitnikov --hp /Users/nikolaysitnikov
```

### Development Mode (manual start)

For development with hot-reload:

```bash
# Backend (from polymarket-whale-tracker directory)
npm run dev:api

# Frontend (from polymarket-whale-tracker/frontend directory)
npm run dev -- --host
```

### Starting Services via Claude Code

When using Claude Code to start services, use `nohup` to prevent processes from being killed when the conversation progresses:

```bash
# Backend (from polymarket-whale-tracker directory)
nohup npm run dev:api > /tmp/polywoly-api.log 2>&1 &

# Frontend (from polymarket-whale-tracker/frontend directory)
nohup npm run dev -- --host > /tmp/polywoly-frontend.log 2>&1 &
```

**Important**: Do NOT use Claude Code's `run_in_background` parameter - those processes get killed between messages. Always use `nohup` directly.

To check logs:
```bash
tail -f /tmp/polywoly-api.log      # Backend logs
tail -f /tmp/polywoly-frontend.log # Frontend logs
```

**Better option**: Use PM2 instead of nohup - it provides auto-restart and better logging.

### Access from Other Devices (same WiFi)

To find your local IP:
```bash
ipconfig getifaddr en0
```

Then access the frontend from other devices at `http://<your-ip>:5173`

---

## Configuration

### Environment Variables

Key environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `MIN_DEPOSIT_AMOUNT` | Minimum deposit amount (USD) to trigger Telegram alerts | `14500` |
| `ALCHEMY_WSS_URL` | Alchemy WebSocket URL for Polygon | Required |
| `ALCHEMY_HTTP_URL` | Alchemy HTTP URL for Polygon | Required |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for alerts | Required |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for alerts | Required |

### Redis Setup (Local Development)

This project uses Redis for caching trading data, detection stats, and event deduplication. For local development, we recommend running Redis locally via Homebrew.

#### Install and Start Redis

```bash
# Install via Homebrew (macOS)
brew install redis

# Start Redis as a background service
brew services start redis

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

#### Configure .env

Set the `REDIS_URL` to use local Redis:

```
REDIS_URL=redis://localhost:6379
```

#### Managing Redis

```bash
# Check Redis status
brew services list | grep redis

# Stop Redis
brew services stop redis

# Restart Redis
brew services restart redis

# View Redis logs
tail -f /opt/homebrew/var/log/redis.log

# Clear all Redis data (useful for testing)
redis-cli FLUSHALL
```

#### Alternative: Docker

If you prefer Docker:

```bash
docker run -d --name polywoly-redis -p 6379:6379 redis:alpine

# With persistence (data survives restarts)
docker run -d --name polywoly-redis -p 6379:6379 -v redis-data:/data redis:alpine redis-server --appendonly yes
```

#### Redis Data

Redis stores:
- **Trading data cache**: P&L, win rate, portfolio values (5-min TTL)
- **Detection cache**: Market metadata, depth snapshots, wallet activity
- **Event deduplication**: Prevents duplicate processing of blockchain events
- **Stats cache**: Dashboard statistics (30-second TTL)

All data is ephemeral cache - losing Redis data just means slower initial loads while caches rebuild.

### Changing Alert Threshold

To change the minimum deposit amount for Telegram alerts:

1. Edit `.env` file:
   ```
   MIN_DEPOSIT_AMOUNT=14500
   ```

2. **Restart the blockchain listener** - the process must be restarted to pick up `.env` changes:
   ```bash
   # Kill existing processes
   pkill -f "src/index.ts"

   # Restart
   npm run dev
   ```

3. Verify the threshold is loaded:
   ```bash
   node -e "require('dotenv/config'); console.log('Threshold:', process.env.MIN_DEPOSIT_AMOUNT)"
   ```

**Important**: Multiple stale processes can cause alerts with old thresholds. Always verify only one blockchain listener is running:
```bash
# Check for TypeScript source processes
ps aux | grep "src/index.ts" | grep -v grep

# Also check for compiled JavaScript processes (dist/index.js)
ps aux | grep "dist/index.js" | grep -v grep
```

**Warning**: If you previously ran `npm run build` and started `node dist/index.js`, that process may still be running with old settings. Kill it with:
```bash
pkill -f "dist/index.js"
```

---

## Trading Data System

### Overview

The whale table displays real-time P&L and Win Rate data for all whales. This data is fetched from the Polymarket API and cached in Redis for performance.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   Redis Cache   │
│   WhaleTable    │     │   /api/wallets  │     │   5-min TTL     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Polymarket API │
                        │  (if not cached)│
                        └─────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Cache Warmer | `src/services/cacheWarmer.ts` | Pre-warms top 100 whales on startup |
| Trading Cache | `src/services/polymarketTradingCache.ts` | Redis cache for trading data |
| API Endpoint | `src/api/server.ts` | `/api/wallets` with sync fetch |
| Frontend Hook | `frontend/src/hooks/useWhales.ts` | Auto-refresh for null data |
| Table Component | `frontend/src/components/WhaleTable.tsx` | Shimmer placeholders |

### How It Works

1. **Server Startup**: Cache warmer pre-fetches trading data for top 100 whales (first 5 pages)
   - Batch size: 10 wallets in parallel
   - Delay between batches: 1.5 seconds
   - Cache TTL: 5 minutes in Redis

2. **API Request**: When `/api/wallets` is called:
   - Fetches wallet list from PostgreSQL
   - For each wallet, calls `getOrFetchTradingData()` with 2-second timeout
   - Returns `pnl: null` for wallets that timeout (shows shimmer in UI)
   - Prefetches adjacent pages (±2) in background

3. **Frontend Auto-Refresh**: If any whales have `pnl === null`:
   - Retries every 3 seconds
   - Max 5 retries (15 seconds total)
   - Stops when all data loaded

4. **Shimmer Placeholders**: While `pnl === null`:
   - Cyan/magenta gradient animation
   - 1.5s loop duration
   - Replaces P&L and Win Rate cells

### Configuration

```typescript
// cacheWarmer.ts
const TOP_WHALES_COUNT = 100;        // Warm top 100 on startup
const BATCH_SIZE = 10;               // Parallel fetch batch size
const DELAY_BETWEEN_BATCHES_MS = 1500; // Rate limiting
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Re-warm every 5 min

// server.ts
const TIMEOUT_MS = 2000;             // Per-wallet fetch timeout

// useWhales.ts
const MAX_RETRIES = 5;               // Auto-refresh retry limit
// Retry interval: 3000ms
```

### Shimmer Effect CSS

The shimmer animation is defined inline in `WhaleTable.tsx`:

```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Type Guards

```typescript
// Check if whale has trading data loaded (not null)
function hasTrading(whale: Whale | WhaleWithTrading): whale is WhaleWithTrading {
  return 'pnl' in whale && whale.pnl !== null;
}

// Check if whale has trading fields but they're null (still loading)
function isTradingLoading(whale: Whale | WhaleWithTrading): boolean {
  return 'pnl' in whale && whale.pnl === null;
}
```

### Performance Notes

- **Pages 1-5**: Load instantly (pre-cached)
- **Pages 6+**: Initial load may show shimmers briefly, then resolve via auto-refresh
- **Prefetching**: Viewing any page warms adjacent ±2 pages in background
- **Rate Limiting**: Polymarket API has rate limits; cache warmer respects ~1 req/sec

### Win Rate Color Gradient

The Win Rate column uses a smooth gradient color scale to indicate performance at a glance.

#### Color Scale

| Win Rate | Color | Hex Code |
|----------|-------|----------|
| 0% (with trades) | Vibrant red | `#FF4757` |
| 50% | Golden yellow | `#FFD93D` |
| 100% | Bright green | `#00D26A` |
| No trades | Muted gray dash "—" | `tokens.colors.textMuted` |

#### How It Works

The gradient uses linear RGB interpolation between color stops:

1. **0% → 50%**: Interpolates from red to yellow
2. **50% → 100%**: Interpolates from yellow to green

```typescript
function getWinRateColor(winRate: number, totalTrades: number | null): string {
  // No trades = neutral dash
  if (totalTrades === null || totalTrades === 0) {
    return tokens.colors.textMuted;
  }

  // Clamp to 0-100 range
  const rate = Math.max(0, Math.min(100, winRate));

  // Color definitions
  const red = { r: 255, g: 71, b: 87 };    // #FF4757
  const yellow = { r: 255, g: 217, b: 61 }; // #FFD93D
  const green = { r: 0, g: 210, b: 106 };   // #00D26A

  let r: number, g: number, b: number;

  if (rate <= 50) {
    // Interpolate red → yellow (0% → 50%)
    const t = rate / 50;
    r = Math.round(red.r + (yellow.r - red.r) * t);
    g = Math.round(red.g + (yellow.g - red.g) * t);
    b = Math.round(red.b + (yellow.b - red.b) * t);
  } else {
    // Interpolate yellow → green (50% → 100%)
    const t = (rate - 50) / 50;
    r = Math.round(yellow.r + (green.r - yellow.r) * t);
    g = Math.round(yellow.g + (green.g - yellow.g) * t);
    b = Math.round(yellow.b + (green.b - yellow.b) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}
```

#### Edge Cases

- **0% with trades**: Shows red (not gray) — the whale traded but lost every position
- **0 trades**: Shows gray "—" — no trading activity to evaluate
- **Null data**: Shows shimmer placeholder while loading

#### Visual Examples

| Win Rate | Resulting Color |
|----------|-----------------|
| 0% | Red `rgb(255, 71, 87)` |
| 25% | Orange-red `rgb(255, 144, 74)` |
| 50% | Golden yellow `rgb(255, 217, 61)` |
| 75% | Yellow-green `rgb(128, 214, 84)` |
| 100% | Bright green `rgb(0, 210, 106)` |

---

## Insider Trading Detection System

### Overview

The Detection system monitors trading activity for suspicious patterns. Access it at `http://localhost:5173/#detection`.

### Starting Detection Services

The detection services start automatically with the API server:

```bash
npm run dev:api
```

This starts:
- Market metadata sync (every 5 minutes from Gamma API)
- Market depth polling (every 30 seconds from CLOB API)
- CTF token transfer listener (real-time from Polygon)

### Detection Dashboard

The Detection page (`#detection`) shows:
- **Stats Grid**: Alerts today, total alerts, critical/high counts
- **Alerts by Type**: Timing, Large Size, Pattern, Cluster, Funding
- **Recent Alerts**: Filterable list with severity/status/type filters

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/detection/stats` | GET | Dashboard statistics |
| `/api/detection/alerts` | GET | Paginated alerts (supports `?page=`, `?limit=`, `?severity=`, `?status=`, `?alertType=`) |
| `/api/detection/alerts/:id` | GET | Single alert details |
| `/api/detection/alerts/:id` | PATCH | Update alert status (`investigating`, `confirmed`, `dismissed`) |
| `/api/detection/wallets/:address/risk` | GET | Wallet risk profile |
| `/api/detection/config` | GET | Detection thresholds |

### Caching

Detection stats are cached in Redis with 30-second TTL for fast page loads. The frontend polls every 10 seconds for near-real-time updates.

### Database Tables

```sql
-- Core detection tables
markets              -- Market metadata from Gamma API
depth_snapshots      -- Order book depth snapshots
wallet_activity      -- Per-market wallet trading activity
wallet_funding_sources -- 1-hop funding analysis
ctf_transfers        -- ERC-1155 token movements
detection_alerts     -- Suspicious pattern alerts
detection_config     -- Configurable thresholds
```

### Key Files

| Component | Location |
|-----------|----------|
| Detection services | `src/services/insiderDetection/` |
| API endpoints | `src/api/server.ts` (lines 379-520) |
| Frontend components | `frontend/src/components/detection/` |
| Frontend hooks | `frontend/src/hooks/useDetection*.ts` |
| Types | `frontend/src/types/detection.ts` |

### Performance Notes

- **Stats endpoint**: Cached in Redis (30s TTL) to avoid slow COUNT queries
- **Frontend polling**: 10-second interval for live updates
- **Wallets count**: Uses `wallets` table count (fast) instead of `COUNT(DISTINCT)` on `wallet_activity`

---

## UI Components

### PositionsTable

Desktop table view for displaying trading positions with sortable columns.

#### Features

- **Sortable columns**: Market, Size, P&L (click header to sort)
- **Size toggle**: Click or Shift+click Size header to switch between $ value and shares count. Right-click also toggles.
- **Hover preview**: Hover over size cells to preview alternate value with elegant crossfade animation
- **Outcome badges**: Color-coded badges for positions (Yes=green, No=red, team names=gold)
- **Status indicators**: Green dot for active markets, purple for redeemable positions
- **Truncated text**: Long market titles truncate with tooltip on hover (using `title` variant)
- **Custom tooltips**: Size header has tooltip explaining sort/toggle behavior

#### Column Layout (with `tableLayout: fixed`)

| Column   | Width | Notes                                    |
|----------|-------|------------------------------------------|
| Market   | 30%   | Truncates with tooltip                   |
| Position | 15%   | Outcome badges, wraps on narrow screens  |
| Size     | 12%   | Toggleable $ value / shares              |
| Avg      | 11%   | Average buy price                        |
| Current  | 11%   | Current market price                     |
| P&L      | 13%   | Profit/loss with glow effect             |

#### Responsive Behavior

- **Position badges**: Display on one line when space allows; wrap to multiple lines at word boundaries when column is constrained (no mid-word breaks)
- **Market titles**: Always truncate with ellipsis, show full title in tooltip on hover

### Tooltip Component

Reusable tooltip for hover explanations.

#### Variants

| Variant   | Use Case                          | Style                              |
|-----------|-----------------------------------|------------------------------------|
| `default` | General tooltips                  | Small font, muted text             |
| `title`   | Truncated text reveals            | Larger font, white text, cyan glow |

#### Props

```tsx
interface TooltipProps {
  content: ReactNode;        // Tooltip content
  children: ReactElement;    // Trigger element
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;            // ms before showing (default: 150)
  variant?: 'default' | 'title';
}
```

#### Usage

```tsx
// Regular tooltip
<Tooltip content="Click to sort" placement="top">
  <button>Sort</button>
</Tooltip>

// Title variant for truncated text
<Tooltip content={fullText} variant="title" placement="top">
  <TruncatedText>{shortText}</TruncatedText>
</Tooltip>
```
