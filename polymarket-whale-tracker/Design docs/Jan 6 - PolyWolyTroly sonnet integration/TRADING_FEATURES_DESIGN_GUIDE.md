# PolyWolyTroly — Trading Features Design Guide
## Integration of Polymarket Trading Data, Profiles & Live Status

**Version:** 1.0  
**Date:** January 2026  
**Scope:** High & Medium priority features from enhancement roadmap

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [New Colour Semantics](#2-new-colour-semantics)
3. [LiveBadge Component](#3-livebadge-component)
4. [Trading Metrics Display](#4-trading-metrics-display)
5. [Profile Header (Avatar & Username)](#5-profile-header-avatar--username)
6. [Filter Pills (Trading Performance)](#6-filter-pills-trading-performance)
7. [Positions Display](#7-positions-display)
8. [Activity History Expansion](#8-activity-history-expansion)
9. [Alert Feed Enhancement](#9-alert-feed-enhancement)
10. [Dashboard Updates](#10-dashboard-updates)
11. [WhaleTable Updates](#11-whaletable-updates)
12. [WalletProfile Restructure](#12-walletprofile-restructure)
13. [Component Specifications](#13-component-specifications)
14. [Animation Keyframes](#14-animation-keyframes)

---

## 1. Design Philosophy

### Core Principle: "Data Density Without Overwhelm"

Trading data is complex. Our job is to make whales' trading performance **instantly scannable** while allowing **deep dives** for those who want them.

**Hierarchy of Information:**
1. **Glanceable** — Live status, P&L direction (profit/loss colour)
2. **Scannable** — Win rate, portfolio value, position count
3. **Explorable** — Full position breakdown, activity history, time-windowed analysis

**Visual Hierarchy for Trading Data:**
- P&L uses **profit/loss colours with glow** — the most important trading metric
- Win rate uses **cyan accent** — a performance indicator
- Portfolio value uses **standard text** — context, not primary
- Position count uses **muted text** — supporting detail

### Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Losing whales styling | **Red-tinted left border** on cards, not full card tint | Subtle but clear. Full red would be too aggressive and break visual harmony |
| P&L time windows | **Pill toggle** (7d / 30d / All) | Familiar pattern, doesn't add cognitive load |
| Live status | **Pulsing green dot + optional "LIVE" label** | Universal pattern, auto-refreshes |
| No Gamma profile | **Generated gradient avatar from address hash** | Feels personalised, not broken |
| Filter stacking | **Profitable + Live = valid combination** | Users expect this behaviour |

---

## 2. New Colour Semantics

### Additions to tokens.ts

```typescript
// Add to tokens.colors
colors: {
  // ... existing colours ...
  
  // Live status (distinct from profit green)
  live: '#22c55e',           // Slightly different green for "active" vs "profit"
  liveGlow: 'rgba(34, 197, 94, 0.3)',
  livePulse: 'rgba(34, 197, 94, 0.6)',
  
  // Trading-specific
  neutral: '#888899',        // For 0% change / break-even
  neutralGlow: 'rgba(136, 136, 153, 0.2)',
  
  // Profile gradients (for generated avatars)
  avatarGradient1: ['#00fff0', '#ff2d92'],  // cyan → magenta
  avatarGradient2: ['#a855f7', '#00fff0'],  // purple → cyan
  avatarGradient3: ['#ff2d92', '#ffaa00'],  // magenta → warning
  avatarGradient4: ['#00ff88', '#00fff0'],  // profit → cyan
}
```

### P&L Colour Logic

```typescript
function getPnlColor(pnl: number): { color: string; glow: string } {
  if (pnl > 0) return { color: tokens.colors.profit, glow: tokens.colors.profitGlow };
  if (pnl < 0) return { color: tokens.colors.loss, glow: tokens.colors.lossGlow };
  return { color: tokens.colors.neutral, glow: tokens.colors.neutralGlow };
}
```

---

## 3. LiveBadge Component

### Purpose
Indicates a whale has been active on Polymarket in the last 24 hours.

### Visual Specification

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   SIZE: SM           SIZE: MD            SIZE: LG           │
│                                                             │
│   ● (6px dot)       ● (8px dot)         ● LIVE (10px dot)  │
│   (no label)        (no label)          (with label)        │
│                                                             │
│   Pulse animation: 2s infinite                              │
│   Glow: 0 0 8px liveGlow                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Specification

```tsx
interface LiveBadgeProps {
  /** Whether the whale is currently live (active in last 24h) */
  isLive: boolean;
  /** Last activity timestamp (for tooltip) */
  lastActivityAt?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show "LIVE" text label (only for lg size by default) */
  showLabel?: boolean;
}

// Size configurations
const SIZE_CONFIG = {
  sm: { dot: 6, fontSize: 0, gap: 0, padding: '2px' },
  md: { dot: 8, fontSize: 0, gap: 0, padding: '3px' },
  lg: { dot: 10, fontSize: 10, gap: 4, padding: '4px 8px' },
};
```

### Styles

```tsx
// LiveBadge.tsx

const dotStyle: CSSProperties = {
  width: SIZE_CONFIG[size].dot,
  height: SIZE_CONFIG[size].dot,
  borderRadius: '50%',
  background: tokens.colors.live,
  boxShadow: `0 0 ${SIZE_CONFIG[size].dot}px ${tokens.colors.liveGlow}`,
  animation: isLive ? 'livePulse 2s ease-in-out infinite' : 'none',
};

const containerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: SIZE_CONFIG[size].gap,
  padding: SIZE_CONFIG[size].padding,
  background: showLabel ? `${tokens.colors.live}15` : 'transparent',
  border: showLabel ? `1px solid ${tokens.colors.live}40` : 'none',
  borderRadius: '999px',
};

const labelStyle: CSSProperties = {
  fontFamily: tokens.fonts.mono,
  fontSize: SIZE_CONFIG[size].fontSize,
  fontWeight: 600,
  color: tokens.colors.live,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};
```

### Tooltip Content

```
"Active 2h ago on Polymarket"
"Last seen trading 45m ago"
```

Format: `Active {relativeTime} on Polymarket`

### Placement Guidelines

| Location | Size | Show Label |
|----------|------|------------|
| WhaleTable mobile card (header) | sm | No |
| WhaleTable desktop row | sm | No |
| WalletProfile header | lg | Yes |
| AlertFeed card | sm | No |
| Dashboard stat card | md | No |

---

## 4. Trading Metrics Display

### P&L with Time Windows

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   P&L Time Selector (Pill Toggle)                          │
│                                                             │
│   ┌───────┐ ┌───────┐ ┌───────┐                            │
│   │  7D   │ │  30D  │ │  ALL  │  ← Active has cyan bg/border│
│   └───────┘ └───────┘ └───────┘                            │
│                                                             │
│   +$47,250                                                  │
│   ════════ (profit green with glow)                        │
│                                                             │
│   -$12,830                                                  │
│   ════════ (loss red with glow)                            │
│                                                             │
│   $0                                                        │
│   ════ (neutral grey, no glow)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### P&L Toggle Component

```tsx
interface PnlToggleProps {
  value: '7d' | '30d' | 'all';
  onChange: (value: '7d' | '30d' | 'all') => void;
  size?: 'sm' | 'md';
}

// Styling matches existing sort pills but more compact
const toggleContainerStyle: CSSProperties = {
  display: 'inline-flex',
  gap: '4px',
  padding: '3px',
  background: tokens.colors.void,
  borderRadius: '8px',
  border: `1px solid ${tokens.colors.border}`,
};

const toggleButtonStyle = (isActive: boolean): CSSProperties => ({
  padding: '6px 12px',
  background: isActive ? `${tokens.colors.cyan}20` : 'transparent',
  border: 'none',
  borderRadius: '6px',
  fontFamily: tokens.fonts.mono,
  fontSize: '11px',
  fontWeight: isActive ? 600 : 400,
  color: isActive ? tokens.colors.cyan : tokens.colors.textMuted,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});
```

### Win Rate Display

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   WIN RATE                                                  │
│   68%        ← Cyan colour, no glow (secondary metric)     │
│                                                             │
│   Visual bar (optional, for profile page):                 │
│   ████████████░░░░░░ 68%                                   │
│   ↑ cyan fill    ↑ border/muted                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Win Rate Bar Component (Optional enhancement)

```tsx
interface WinRateBarProps {
  rate: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

// For profile page detail view
const barContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const barTrackStyle: CSSProperties = {
  flex: 1,
  height: '6px',
  background: tokens.colors.border,
  borderRadius: '3px',
  overflow: 'hidden',
};

const barFillStyle = (rate: number): CSSProperties => ({
  width: `${rate}%`,
  height: '100%',
  background: `linear-gradient(90deg, ${tokens.colors.cyan}, ${tokens.colors.profit})`,
  borderRadius: '3px',
  transition: 'width 0.3s ease',
});
```

### Portfolio Value Display

```
PORTFOLIO VALUE
$125,400        ← Standard textPrimary, no special treatment
```

### Trading Metrics Grid (for cards)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   2x2 Grid (matches existing card pattern)                 │
│                                                             │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │ P&L (7D)        │  │ WIN RATE        │                 │
│   │ +$47,250 ✨     │  │ 68%             │                 │
│   └─────────────────┘  └─────────────────┘                 │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │ PORTFOLIO       │  │ POSITIONS       │                 │
│   │ $125,400        │  │ 12              │                 │
│   └─────────────────┘  └─────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Profile Header (Avatar & Username)

### Avatar Generation

When no Gamma API profile exists, generate a gradient avatar based on address hash.

```typescript
// utils/avatar.ts

/**
 * Generate a deterministic gradient based on wallet address
 */
export function getAvatarGradient(address: string): { from: string; to: string } {
  // Use first 6 chars of address (after 0x) to determine gradient
  const hash = address.slice(2, 8);
  const num = parseInt(hash, 16);
  
  const gradients = [
    { from: '#00fff0', to: '#ff2d92' }, // cyan → magenta
    { from: '#a855f7', to: '#00fff0' }, // purple → cyan
    { from: '#ff2d92', to: '#ffaa00' }, // magenta → warning
    { from: '#00ff88', to: '#00fff0' }, // profit → cyan
    { from: '#00fff0', to: '#a855f7' }, // cyan → purple
    { from: '#ffaa00', to: '#ff2d92' }, // warning → magenta
  ];
  
  return gradients[num % gradients.length];
}

/**
 * Get initials from username or address
 */
export function getAvatarInitials(username?: string, address?: string): string {
  if (username) {
    // "CryptoWhale" → "CW", "alice" → "AL"
    const words = username.split(/[\s_-]+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }
  if (address) {
    // "0x1234...5678" → "12"
    return address.slice(2, 4).toUpperCase();
  }
  return '🐋';
}
```

### Profile Header Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   DESKTOP (WalletProfile header)                           │
│                                                             │
│   ┌──────────┐                                             │
│   │          │  CryptoWhale_2024           ● LIVE          │
│   │  AVATAR  │  @cryptowhale ✓ verified                    │
│   │  64x64   │  0x1234...5678  [📋 Copy] [↗ Scan] [𝕏]     │
│   │          │                                             │
│   └──────────┘                                             │
│                                                             │
│   MOBILE                                                    │
│                                                             │
│   ┌────────┐  CryptoWhale      ● LIVE                      │
│   │ AVATAR │  0x1234...5678                                │
│   │ 48x48  │  [📋] [↗] [𝕏]                                │
│   └────────┘                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### WalletProfileHeader Component

```tsx
interface WalletProfileHeaderProps {
  address: string;
  profile?: {
    name?: string;
    pseudonym?: string;
    avatarUrl?: string;
    verified?: boolean;
    twitterHandle?: string;
  };
  isLive: boolean;
  lastActivityAt?: string;
  isMobile: boolean;
  onCopy: () => void;
}

// Avatar styles
const avatarContainerStyle = (size: number, gradient: { from: string; to: string }): CSSProperties => ({
  width: size,
  height: size,
  borderRadius: '16px',
  background: `linear-gradient(135deg, ${gradient.from}40, ${gradient.to}40)`,
  border: `2px solid ${tokens.colors.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: size * 0.4,
  fontFamily: tokens.fonts.mono,
  fontWeight: 700,
  color: tokens.colors.textPrimary,
  boxShadow: `0 0 30px ${tokens.colors.cyanGlow}`,
  overflow: 'hidden',
});

// When avatar image exists
const avatarImageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

// Username styles
const usernameStyle: CSSProperties = {
  fontFamily: tokens.fonts.display,
  fontSize: '20px',
  fontWeight: 700,
  color: tokens.colors.textPrimary,
};

const handleStyle: CSSProperties = {
  fontFamily: tokens.fonts.mono,
  fontSize: '13px',
  color: tokens.colors.textSecondary,
};

const verifiedBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  background: tokens.colors.cyan,
  color: tokens.colors.void,
  fontSize: '10px',
  marginLeft: '4px',
};
```

### Display Name Logic

```typescript
function getDisplayName(profile?: Profile, address?: string): string {
  if (profile?.name) return profile.name;
  if (profile?.pseudonym) return profile.pseudonym;
  return truncateAddress(address || '');
}
```

---

## 6. Filter Pills (Trading Performance)

### Filter Row Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Filter Pills (horizontal scroll on mobile)               │
│                                                             │
│   ┌───────┐ ┌────────────┐ ┌──────────┐ ┌────────┐         │
│   │  ALL  │ │ PROFITABLE │ │  LOSING  │ │ ● LIVE │         │
│   └───────┘ └────────────┘ └──────────┘ └────────┘         │
│       ↑          ↑              ↑            ↑             │
│    default    green dot      red dot    pulsing dot        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Filter Pill Variants

```tsx
type FilterOption = 'all' | 'profitable' | 'losing' | 'live';

const FILTER_CONFIG: Record<FilterOption, { 
  label: string; 
  icon?: string;
  dotColor?: string;
  activeColor: string;
}> = {
  all: { 
    label: 'All', 
    activeColor: tokens.colors.cyan 
  },
  profitable: { 
    label: 'Profitable', 
    dotColor: tokens.colors.profit,
    activeColor: tokens.colors.profit 
  },
  losing: { 
    label: 'Losing', 
    dotColor: tokens.colors.loss,
    activeColor: tokens.colors.loss 
  },
  live: { 
    label: 'Live', 
    dotColor: tokens.colors.live,
    activeColor: tokens.colors.live 
  },
};
```

### Filter Pill Styling

```tsx
const filterPillStyle = (
  isActive: boolean, 
  config: typeof FILTER_CONFIG[FilterOption]
): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  background: isActive ? `${config.activeColor}15` : tokens.colors.surface,
  border: `1px solid ${isActive ? config.activeColor : tokens.colors.border}`,
  borderRadius: '20px',
  fontFamily: tokens.fonts.body,
  fontSize: '13px',
  fontWeight: isActive ? 600 : 500,
  color: isActive ? config.activeColor : tokens.colors.textSecondary,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: isActive ? `0 0 15px ${config.activeColor}30` : 'none',
  minHeight: '40px',
});

// Indicator dot
const filterDotStyle = (color: string, isLive: boolean): CSSProperties => ({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: color,
  boxShadow: `0 0 6px ${color}`,
  animation: isLive ? 'livePulse 2s ease-in-out infinite' : 'none',
});
```

### Filter State Management

```typescript
// Filters can stack (not mutually exclusive)
interface WhaleFilters {
  profitability: 'all' | 'profitable' | 'losing';
  liveOnly: boolean;
}

// API query params
function buildFilterParams(filters: WhaleFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.profitability !== 'all') {
    params.set('profitability', filters.profitability);
  }
  if (filters.liveOnly) {
    params.set('live', 'true');
  }
  return params;
}
```

---

## 7. Positions Display

### Position Card Layout (Mobile)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ 🏛️ POLITICS                           ● Active       │  │
│   │                                                     │  │
│   │ Will Trump win the 2024 election?                   │  │
│   │                                                     │  │
│   │ ┌─────────────────────────────────────────────┐    │  │
│   │ │ Mini-chart (sparkline) - 7 day price       │    │  │
│   │ │ ▁▂▃▅▆▇█▇▅▄▃▂▃▄▅▆                           │    │  │
│   │ └─────────────────────────────────────────────┘    │  │
│   │                                                     │  │
│   │ ┌───────────┐  ┌───────────┐  ┌───────────┐       │  │
│   │ │ POSITION  │  │ AVG PRICE │  │ CURRENT   │       │  │
│   │ │ YES       │  │ 42¢       │  │ 58¢       │       │  │
│   │ │ $12,500   │  │           │  │ +$3,800   │       │  │
│   │ └───────────┘  └───────────┘  └───────────┘       │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Position Card Component

```tsx
interface PositionCardProps {
  position: {
    marketSlug: string;
    question: string;
    category?: string;
    outcome: 'YES' | 'NO';
    size: number;          // USD value of position
    avgPrice: number;      // 0-1
    currentPrice: number;  // 0-1
    priceHistory?: number[]; // For sparkline
    unrealizedPnl: number;
    isActive: boolean;
  };
  isMobile: boolean;
  onClick?: () => void;
}

// Category tag (reuse from TrendingMarkets)
const CATEGORY_COLORS: Record<string, string> = {
  politics: '#ff6b35',
  crypto: '#f7931a',
  sports: '#22c55e',
  finance: '#3b82f6',
  tech: '#a855f7',
  entertainment: '#ec4899',
  other: '#6b7280',
};

// Position direction indicator
const outcomeStyle = (outcome: 'YES' | 'NO'): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  background: outcome === 'YES' ? `${tokens.colors.profit}15` : `${tokens.colors.loss}15`,
  border: `1px solid ${outcome === 'YES' ? tokens.colors.profit : tokens.colors.loss}40`,
  borderRadius: '6px',
  fontFamily: tokens.fonts.mono,
  fontSize: '12px',
  fontWeight: 600,
  color: outcome === 'YES' ? tokens.colors.profit : tokens.colors.loss,
});
```

### Sparkline Component

```tsx
interface SparklineProps {
  data: number[];        // Array of prices (0-1)
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}

const SparklineDefaults = {
  width: 120,
  height: 32,
  color: tokens.colors.cyan,
  showArea: true,
};

// Render as SVG path
function Sparkline({ data, width, height, color, showArea }: SparklineProps) {
  const w = width ?? SparklineDefaults.width;
  const h = height ?? SparklineDefaults.height;
  const c = color ?? SparklineDefaults.color;
  
  // Normalize data to height
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((val - min) / range) * h,
  }));
  
  const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;
  
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {showArea && (
        <path
          d={areaPath}
          fill={`${c}20`}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={c}
      />
    </svg>
  );
}
```

### Positions Table (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ MARKET                    | POSITION | SIZE    | AVG    | CURRENT | P&L    │
│ ─────────────────────────────────────────────────────────────────────────── │
│ 🏛️ Will Trump win...      | YES      | $12,500 | 42¢    | 58¢     | +$3.8K │
│    ▁▂▃▅▆▇█▇▅▄            |          |         |        |         |        │
│ ─────────────────────────────────────────────────────────────────────────── │
│ ₿ BTC $100K by...         | NO       | $8,200  | 65¢    | 52¢     | +$1.6K │
│    ▇▆▅▄▃▂▁▂▃▄            |          |         |        |         |        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pagination for Positions

Since positions can range from few to hundreds:
- Default: Show 10 per page
- Mobile: Card stack with "Load More" button
- Desktop: Table with traditional pagination

---

## 8. Activity History Expansion

### Activity Types & Styling

```typescript
type ActivityType = 
  | 'deposit'      // USDC deposit to Polymarket
  | 'withdrawal'   // USDC withdrawal
  | 'buy'          // Bought shares
  | 'sell'         // Sold shares
  | 'redeem'       // Redeemed winning position
  | 'claim'        // Claimed rewards
  | 'transfer';    // Token transfer

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}> = {
  deposit: {
    icon: '↓',
    label: 'Deposit',
    color: tokens.colors.profit,
    bgColor: `${tokens.colors.profit}15`,
  },
  withdrawal: {
    icon: '↑',
    label: 'Withdrawal',
    color: tokens.colors.loss,
    bgColor: `${tokens.colors.loss}15`,
  },
  buy: {
    icon: '🛒',
    label: 'Buy',
    color: tokens.colors.cyan,
    bgColor: `${tokens.colors.cyan}15`,
  },
  sell: {
    icon: '💰',
    label: 'Sell',
    color: tokens.colors.magenta,
    bgColor: `${tokens.colors.magenta}15`,
  },
  redeem: {
    icon: '✓',
    label: 'Redeem',
    color: tokens.colors.profit,
    bgColor: `${tokens.colors.profit}15`,
  },
  claim: {
    icon: '🎁',
    label: 'Claim',
    color: tokens.colors.purple,
    bgColor: `${tokens.colors.purple}15`,
  },
  transfer: {
    icon: '↔',
    label: 'Transfer',
    color: tokens.colors.textSecondary,
    bgColor: `${tokens.colors.textSecondary}15`,
  },
};
```

### Activity Card Layout (Mobile)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ ┌────┐  BUY                              2h ago     │  │
│   │ │ 🛒 │  Will Trump win 2024?                        │  │
│   │ └────┘  ─────────────────────────────               │  │
│   │                                                     │  │
│   │  ┌───────────┐  ┌───────────┐                       │  │
│   │  │ AMOUNT    │  │ PRICE     │                       │  │
│   │  │ 2,500 YES │  │ 42¢       │                       │  │
│   │  │ $1,050    │  │           │                       │  │
│   │  └───────────┘  └───────────┘                       │  │
│   │                                                     │  │
│   │  [View on Polygonscan ↗]                            │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Activity Row (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ TYPE  | MARKET                  | AMOUNT      | PRICE | VALUE   | TIME     │
│ ───────────────────────────────────────────────────────────────────────────│
│ 🛒 BUY | Will Trump win...      | 2,500 YES   | 42¢   | $1,050  | 2h ago   │
│ 💰 SELL| BTC $100K by...        | 1,200 NO    | 65¢   | $780    | 5h ago   │
│ ↓ DEP | —                       | $50,000     | —     | $50,000 | 1d ago   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Alert Feed Enhancement

### Expanded Alert Types

Currently: Deposits only  
After: Deposits, Trades, Large Position Changes

```typescript
type AlertType = 
  | 'deposit'           // Existing
  | 'withdrawal'        // New
  | 'large_buy'         // New: Buy > $X threshold
  | 'large_sell'        // New: Sell > $X threshold
  | 'position_opened'   // New: New position in market
  | 'position_closed';  // New: Exited position

interface Alert {
  id: string;
  type: AlertType;
  walletAddress: string;
  amount: number;
  timestamp: string;
  // New fields for trading alerts
  marketSlug?: string;
  marketQuestion?: string;
  outcome?: 'YES' | 'NO';
  price?: number;
}
```

### Alert Card Variants

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   DEPOSIT (existing style, profit green)                   │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ 💰  0x1234...5678                          2m ago   │  │
│   │     ─────────────────────────────                   │  │
│   │     +$50,000                                        │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   LARGE BUY (cyan accent)                                  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ 🛒  0x1234...5678                          5m ago   │  │
│   │     Will Trump win 2024?                            │  │
│   │     ─────────────────────────────                   │  │
│   │     BUY 5,000 YES @ 42¢                             │  │
│   │     $2,100                                          │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   LARGE SELL (magenta accent)                              │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ 💰  0xABCD...EFGH                          12m ago  │  │
│   │     BTC $100K by Dec?                               │  │
│   │     ─────────────────────────────                   │  │
│   │     SELL 3,200 NO @ 58¢                             │  │
│   │     $1,856                                          │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Alert Icon Config

```typescript
const ALERT_CONFIG: Record<AlertType, {
  icon: string;
  label: string;
  color: string;
  glowColor: string;
}> = {
  deposit: {
    icon: '💰',
    label: 'Deposit',
    color: tokens.colors.profit,
    glowColor: tokens.colors.profitGlow,
  },
  withdrawal: {
    icon: '📤',
    label: 'Withdrawal',
    color: tokens.colors.loss,
    glowColor: tokens.colors.lossGlow,
  },
  large_buy: {
    icon: '🛒',
    label: 'Large Buy',
    color: tokens.colors.cyan,
    glowColor: tokens.colors.cyanGlow,
  },
  large_sell: {
    icon: '💰',
    label: 'Large Sell',
    color: tokens.colors.magenta,
    glowColor: tokens.colors.magentaGlow,
  },
  position_opened: {
    icon: '📈',
    label: 'Position Opened',
    color: tokens.colors.cyan,
    glowColor: tokens.colors.cyanGlow,
  },
  position_closed: {
    icon: '📉',
    label: 'Position Closed',
    color: tokens.colors.purple,
    glowColor: `${tokens.colors.purple}30`,
  },
};
```

### Alert Filter Pills

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌─────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│   │ ALL │ │ DEPOSITS │ │ TRADES │ │ BUYS   │ │ SELLS    │  │
│   └─────┘ └──────────┘ └────────┘ └────────┘ └──────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Dashboard Updates

### New Stat Cards

Add two new cards to the stats grid:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   CURRENT 4 CARDS:                                         │
│   [Whales Tracked] [Total Volume] [Alerts Today] [New Today]│
│                                                             │
│   NEW 6-CARD LAYOUT:                                       │
│   [Whales] [Volume] [Alerts] [New] [Avg Win Rate] [P&L]    │
│                                                             │
│   Or keep 4 and add row below:                             │
│   [Whales] [Volume] [Alerts] [New]                         │
│   [Avg Win Rate] [Total P&L] [Live Whales] [Trades Today]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Recommended: Keep 4 primary, add 4 secondary

```tsx
// Primary row (existing)
<StatCard label="Whales Tracked" ... />
<StatCard label="Total Volume" ... />
<StatCard label="Alerts Today" ... />
<StatCard label="New Whales" ... />

// Secondary row (new) - smaller cards
<MiniStatCard label="Avg Win Rate" value="62%" icon={WinRateIcon} />
<MiniStatCard label="Total P&L" value="+$1.2M" icon={PnlIcon} color="profit" />
<MiniStatCard label="Live Now" value="47" icon={LiveIcon} />
<MiniStatCard label="Trades Today" value="234" icon={TradesIcon} />
```

### New Icon Components

```tsx
// WinRateIcon - Target/bullseye
export function WinRateIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

// PnlIcon - Chart with arrow
export function PnlIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polyline 
        points="3,17 9,11 13,15 21,7" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <polyline 
        points="17,7 21,7 21,11" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

// LiveIcon - Pulsing signal
export function LiveIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill={color} />
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.5" opacity="0.6" />
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

// TradesIcon - Exchange arrows
export function TradesIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path 
        d="M7 10L3 14L7 18" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M3 14H16" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <path 
        d="M17 6L21 10L17 14" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M21 10H8" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  );
}
```

---

## 11. WhaleTable Updates

### Desktop Table - New Columns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ WALLET          | DEPOSITED | P&L (7D) | WIN RATE | POSITIONS | LAST ACTIVE│
│ ─────────────────────────────────────────────────────────────────────────── │
│ 🐋 0x123...● LIVE| $125K    | +$12.5K  | 68%      | 12        | 2h ago     │
│ 🐋 0xABC...      | $89K     | -$3.2K   | 42%      | 8         | 1d ago     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile Card - Enhanced Stats

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ ┌────┐  0x1234...5678  ● LIVE           Today      │  │
│   │ │ 🐋 │  [Achievement badges...]                     │  │
│   │ └────┘                                              │  │
│   │ ─────────────────────────────────────────────────── │  │
│   │                                                     │  │
│   │  ┌───────────┐  ┌───────────┐                      │  │
│   │  │ DEPOSITED │  │ P&L (7D)  │                      │  │
│   │  │ $125,500  │  │ +$12,500  │  ← green glow       │  │
│   │  └───────────┘  └───────────┘                      │  │
│   │                                                     │  │
│   │  ┌───────────┐  ┌───────────┐                      │  │
│   │  │ WIN RATE  │  │ POSITIONS │                      │  │
│   │  │ 68%       │  │ 12        │                      │  │
│   │  └───────────┘  └───────────┘                      │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### New Sort Pills (Mobile)

```tsx
const SORT_OPTIONS = [
  { field: 'totalDeposited', label: 'Volume', icon: '💰' },
  { field: 'depositCount', label: 'Count', icon: '📊' },
  { field: 'pnl', label: 'P&L', icon: '📈' },           // NEW
  { field: 'winRate', label: 'Win Rate', icon: '🎯' },   // NEW
  { field: 'portfolioValue', label: 'Portfolio', icon: '💼' }, // NEW
  { field: 'lastActivityAt', label: 'Active', icon: '⚡' },    // NEW
];
```

### Card with Losing Indicator

For whales with negative P&L, add a subtle red left border:

```tsx
const cardStyle = (pnl: number): CSSProperties => ({
  // ... existing styles ...
  borderLeft: pnl < 0 ? `3px solid ${tokens.colors.loss}` : undefined,
  boxShadow: pnl < 0 ? `inset 3px 0 10px ${tokens.colors.lossGlow}` : undefined,
});
```

---

## 12. WalletProfile Restructure

### New Layout with Tabs

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ← Back                                                    │
│                                                             │
│   ┌──────────┐                                             │
│   │  AVATAR  │  CryptoWhale_2024           ● LIVE          │
│   │          │  0x1234...5678  [📋] [↗] [𝕏]               │
│   └──────────┘                                             │
│                                                             │
│   ═══════════════════════════════════════════════════════  │
│                                                             │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│   │DEPOSIT │ │ P&L    │ │WIN RATE│ │PORTFOLIO│ │POSITIONS│ │
│   │$125.5K │ │+$47.2K │ │ 68%    │ │$89.4K  │ │  12    │  │
│   └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │
│                                                             │
│   P&L: [7D] [30D] [ALL]                                    │
│                                                             │
│   ═══════════════════════════════════════════════════════  │
│                                                             │
│   TABS: [📊 Positions] [📜 Activity] [💰 Deposits]         │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                                                     │  │
│   │        Tab content area (Positions/Activity/        │  │
│   │        Deposits based on selection)                 │  │
│   │                                                     │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tab Component

```tsx
interface ProfileTab {
  id: 'positions' | 'activity' | 'deposits';
  label: string;
  icon: string;
  count?: number;
}

const PROFILE_TABS: ProfileTab[] = [
  { id: 'positions', label: 'Positions', icon: '📊' },
  { id: 'activity', label: 'Activity', icon: '📜' },
  { id: 'deposits', label: 'Deposits', icon: '💰' },
];

const tabStyle = (isActive: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 20px',
  background: isActive ? tokens.colors.surface : 'transparent',
  border: 'none',
  borderBottom: isActive ? `2px solid ${tokens.colors.cyan}` : '2px solid transparent',
  fontFamily: tokens.fonts.body,
  fontSize: '14px',
  fontWeight: isActive ? 600 : 500,
  color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});
```

### Metrics Grid Enhancement

Expand from 4 to 6 stats on desktop, 2x3 grid on mobile:

```tsx
// Desktop: 6 columns
// Mobile: 2 columns, 3 rows

const metricsGridStyle = (isMobile: boolean): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
  gap: isMobile ? '12px' : '16px',
});

// Stats to show:
// 1. Total Deposited (existing)
// 2. P&L (with time toggle)
// 3. Win Rate
// 4. Portfolio Value
// 5. Active Positions
// 6. Total Trades
```

---

## 13. Component Specifications

### File Structure

```
frontend/src/
├── components/
│   ├── LiveBadge.tsx              # NEW
│   ├── PnlToggle.tsx              # NEW
│   ├── WinRateBar.tsx             # NEW (optional)
│   ├── Sparkline.tsx              # NEW
│   ├── GeneratedAvatar.tsx        # NEW
│   ├── WalletProfileHeader.tsx    # NEW
│   ├── PositionCard.tsx           # NEW
│   ├── PositionsTable.tsx         # NEW
│   ├── ActivityCard.tsx           # NEW
│   ├── ActivityHistoryTable.tsx   # NEW
│   ├── FilterPills.tsx            # NEW
│   ├── ProfileTabs.tsx            # NEW
│   ├── icons/
│   │   ├── WinRateIcon.tsx        # NEW
│   │   ├── PnlIcon.tsx            # NEW
│   │   ├── LiveIcon.tsx           # NEW
│   │   └── TradesIcon.tsx         # NEW
│   ├── Dashboard.tsx              # MODIFY
│   ├── WhaleTable.tsx             # MODIFY
│   ├── WalletProfile.tsx          # MODIFY (major)
│   └── AlertFeed.tsx              # MODIFY
├── types/
│   ├── polymarket.ts              # NEW
│   ├── position.ts                # NEW
│   ├── activity.ts                # NEW
│   ├── profile.ts                 # NEW
│   └── whale.ts                   # MODIFY
├── hooks/
│   ├── usePositions.ts            # NEW
│   ├── useActivity.ts             # NEW
│   ├── useProfile.ts              # NEW
│   ├── usePolymarketTrading.ts    # NEW
│   └── useWhales.ts               # MODIFY
├── utils/
│   ├── avatar.ts                  # NEW
│   ├── liveStatus.ts              # NEW
│   └── formatters.ts              # MODIFY
└── styles/
    └── tokens.ts                  # MODIFY
```

### Component Props Summary

```typescript
// LiveBadge
interface LiveBadgeProps {
  isLive: boolean;
  lastActivityAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// PnlToggle
interface PnlToggleProps {
  value: '7d' | '30d' | 'all';
  onChange: (value: '7d' | '30d' | 'all') => void;
  size?: 'sm' | 'md';
}

// Sparkline
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}

// GeneratedAvatar
interface GeneratedAvatarProps {
  address: string;
  imageUrl?: string;
  size?: number;
  username?: string;
}

// PositionCard
interface PositionCardProps {
  position: Position;
  isMobile: boolean;
  onClick?: () => void;
}

// ActivityCard
interface ActivityCardProps {
  activity: Activity;
  isMobile: boolean;
  onClick?: () => void;
}

// FilterPills
interface FilterPillsProps {
  filters: WhaleFilters;
  onChange: (filters: WhaleFilters) => void;
}
```

---

## 14. Animation Keyframes

### Add to globals.css

```css
/* Live pulse animation */
@keyframes livePulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0);
  }
}

/* P&L value update flash */
@keyframes pnlFlash {
  0% {
    background-color: transparent;
  }
  50% {
    background-color: var(--flash-color, rgba(0, 255, 136, 0.2));
  }
  100% {
    background-color: transparent;
  }
}

/* Sparkline draw animation */
@keyframes sparklineDraw {
  from {
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Tab slide indicator */
@keyframes tabSlide {
  from {
    transform: translateX(var(--from-x, 0));
  }
  to {
    transform: translateX(var(--to-x, 0));
  }
}

/* Filter pill selection */
@keyframes filterSelect {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. `tokens.ts` updates (new colours)
2. `LiveBadge.tsx` component
3. `GeneratedAvatar.tsx` component
4. `liveStatus.ts` utility
5. `avatar.ts` utility

### Phase 2: Profile Enhancement (Week 2)
1. `WalletProfileHeader.tsx`
2. `ProfileTabs.tsx`
3. `PnlToggle.tsx`
4. `Sparkline.tsx`
5. Update `WalletProfile.tsx` structure

### Phase 3: Positions & Activity (Week 2-3)
1. `PositionCard.tsx`
2. `PositionsTable.tsx`
3. `ActivityCard.tsx`
4. `ActivityHistoryTable.tsx`

### Phase 4: WhaleTable & Dashboard (Week 3)
1. `FilterPills.tsx`
2. New icon components
3. Update `WhaleTable.tsx`
4. Update `Dashboard.tsx`

### Phase 5: Alert Feed (Week 4)
1. Expand alert types
2. Update `AlertFeed.tsx`
3. Alert filter pills

---

## Quick Reference: Colour Usage

| Element | Colour | Glow |
|---------|--------|------|
| Positive P&L | `profit` (#00ff88) | `profitGlow` |
| Negative P&L | `loss` (#ff3366) | `lossGlow` |
| Zero P&L | `neutral` (#888899) | `neutralGlow` |
| Win Rate | `cyan` (#00fff0) | none |
| Live Badge | `live` (#22c55e) | `liveGlow` |
| Buy Activity | `cyan` (#00fff0) | `cyanGlow` |
| Sell Activity | `magenta` (#ff2d92) | `magentaGlow` |
| Deposit | `profit` (#00ff88) | `profitGlow` |
| Withdrawal | `loss` (#ff3366) | `lossGlow` |
| Portfolio Value | `textPrimary` | none |
| Position Count | `textSecondary` | none |

---

*"Trading data, visualised beautifully. Every pixel earns its place."*

— PolyWolyTroly Design Team
