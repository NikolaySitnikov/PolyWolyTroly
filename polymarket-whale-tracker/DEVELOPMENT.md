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
