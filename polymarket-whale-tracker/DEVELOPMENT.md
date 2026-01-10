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
