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
ps aux | grep "src/index.ts" | grep -v grep
```

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
