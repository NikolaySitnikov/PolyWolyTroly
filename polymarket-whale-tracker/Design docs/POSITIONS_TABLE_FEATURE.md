# Positions Table Feature

## Overview

The Positions Table displays active and redeemable trading positions for whale wallets in the Whale Profile view. It provides a comprehensive desktop table layout with sorting, pagination, and visual status indicators.

## Location

`frontend/src/components/PositionsTable.tsx`

## Features

### 1. Sortable Columns

The table supports sorting by multiple columns:

| Column | Sort Field | Direction Logic |
|--------|------------|-----------------|
| Market | `title` | ↓ = A to Z, ↑ = Z to A |
| Size | `currentValue` | ↓ = Highest first, ↑ = Lowest first |
| P&L | `pnl` | ↓ = Highest first, ↑ = Lowest first |

**Default Sort**: P&L descending (highest profit first)

#### Sorting Implementation

```typescript
export type PositionSortField = 'pnl' | 'currentValue' | 'size' | 'title';

// For alphabetical (title): desc = A-Z, asc = Z-A
// For numeric fields: desc = highest first, asc = lowest first
```

### 2. Position Status Indicators

Each position displays a colored status dot with tooltip:

| Status | Color | Glow | Tooltip |
|--------|-------|------|---------|
| Active | Green (`tokens.colors.live`) | Yes | "Active - Market is live" |
| Redeemable | Purple (`tokens.colors.purple`) | Yes | "Redeemable - Claim your winnings" |

#### Status Determination

```typescript
// Based on Polymarket's redeemable field
const status: PositionStatus = raw.redeemable ? 'redeemable' : 'active';
```

#### Status Dot Design

- Visual dot size: 6x6 pixels
- Hit area: 16x16 pixels (for easier hover/touch)
- Both statuses have glow effect: `boxShadow: 0 0 6px ${color}`

### 3. Category Tags with Sport Emojis

Each position displays a category tag with sport-specific emoji:

- Category is determined from `sportsMarketType` (Gamma API) or inferred from title using comprehensive team databases
- Sports markets show sport-specific emoji based on detected sport type
- Uses `getSportEmoji()` from `CategoryTag.tsx` with comprehensive regex databases

#### Sport Emoji Mapping

| Sport | Emoji | Database Coverage |
|-------|-------|-------------------|
| Boxing/MMA | 🥊 | UFC fighters, boxing champions, weight classes |
| Basketball | 🏀 | All 30 NBA teams + WNBA |
| American Football | 🏈 | All 32 NFL teams + 134 FBS college teams |
| Soccer | ⚽ | EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS (200+ teams) |
| Baseball | ⚾ | All 30 MLB teams |
| Hockey | 🏒 | All 32 NHL teams (including Utah Mammoth) |
| Tennis | 🎾 | Top players, Grand Slam tournaments |
| Golf | ⛳ | PGA/LPGA players, major tournaments |
| Racing | 🏎️ | F1 drivers/teams, NASCAR drivers |
| Cricket | 🏏 | IPL teams, international players |
| Rugby | 🏉 | Six Nations, international teams |
| Esports | 🎮 | LoL, Dota, CS2, Valorant teams/players |
| Default | 🏆 | Unknown sports |

See `CLOSED_POSITIONS_FEATURE.md` for complete team lists.

### 4. Truncated Market Title Tooltip

Long market titles are truncated with ellipsis and show a styled tooltip on hover:

#### TruncatedText Component

The `TruncatedText` component:
1. Detects when text is actually truncated (using `scrollWidth > clientWidth`)
2. Only shows tooltip when text doesn't fit
3. Uses the `title` variant of the Tooltip component for better readability

#### Tooltip "title" Variant Styling

| Property | Value |
|----------|-------|
| Max Width | 400px (vs 280px default) |
| Padding | `tokens.spacing[3]` × `tokens.spacing[4]` |
| Border | Cyan accent (`tokens.colors.cyan + '40'`) |
| Font Size | `tokens.fontSizes.sm` (14px) |
| Font Weight | 500 (medium) |
| Text Color | `tokens.colors.textPrimary` (white) |
| Shadow | Enhanced with cyan glow |

This variant provides better readability for market titles compared to the default tooltip style.

### 5. Outcome Badge

Displays YES/NO badge with semantic colors:
- YES: Green (`tokens.colors.profit`)
- NO: Red (`tokens.colors.loss`)

### 6. Pagination

- Default: 10 items per page
- Uses `Pagination` component
- Resets to page 1 when sort changes

## Table Columns

| Column | Width | Content |
|--------|-------|---------|
| Market | 35% | Category tag, status dot, market title |
| Position | 10% | YES/NO outcome badge |
| Size | 12% | Position value in USD (formatted with K/M suffix) |
| Avg | 10% | Average entry price in cents |
| Current | 10% | Current price in cents |
| P&L | 13% | Profit/loss with color and glow effect |

## Position Types

```typescript
export type PositionStatus = 'active' | 'redeemable';

export interface Position extends PolymarketPosition {
  normalizedOutcome: 'YES' | 'NO';
  status: PositionStatus;
  normalizedCategory: MarketCategory;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  isActive: boolean;
  category: string;
}
```

## Filter Integration

The positions table works with filter buttons in WalletProfile:

| Filter | Description |
|--------|-------------|
| Active | Shows positions where `redeemable === false` |
| Redeemable | Shows positions where `redeemable === true` |
| All | Shows both active and redeemable positions |
| Closed | Shows historical closed positions (separate component) |

## Styling

### Table Container
- Background: `tokens.colors.surface`
- Border: `1px solid ${tokens.colors.border}`
- No border radius (inside tab panel)

### Row Hover
- Background changes to `tokens.colors.surfaceHover`
- Cursor: pointer (if onClick handler provided)

### Header Row
- Background: `tokens.colors.void`
- Font: Mono, 10px, uppercase, letter-spacing 0.1em
- Sortable headers highlight in cyan when active

### P&L Cell
- Green glow for positive P&L
- Red glow for negative P&L
- Font weight: 600

## Empty State

When no positions found:
- Icon: 📊
- Title: "No positions found"
- Message: "This whale hasn't opened any positions yet"

## Loading State

Displays 3 skeleton rows with shimmer animation while loading.

## Accessibility

- Sortable headers are keyboard accessible
- Status dots have descriptive tooltips
- Rows are clickable with proper cursor indication

## Related Files

- `frontend/src/types/position.ts` - Position types and sorting logic
- `frontend/src/components/Tooltip.tsx` - Tooltip for status dots
- `frontend/src/components/CategoryTag.tsx` - Category inference and sport emojis
- `frontend/src/components/Pagination.tsx` - Table pagination
- `frontend/src/components/WalletProfile.tsx` - Parent component with filters
