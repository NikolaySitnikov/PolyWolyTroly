# Closed Positions Feature

## Overview

The Closed Positions feature displays historical/settled positions for whale wallets. These are positions that have been fully resolved and redeemed on Polymarket.

## Data Source

**API Endpoint**: `GET https://data-api.polymarket.com/v1/closed-positions`

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | Wallet address (required) |
| `limit` | number | Max results per page (1-50, default 50) |
| `offset` | number | Pagination offset |
| `sortBy` | string | Sort field: `realizedpnl`, `timestamp`, `avgprice`, `totalbought` |
| `sortDir` | string | Sort direction: `ASC` or `DESC` |

### Response Fields
```typescript
interface PolymarketClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;          // Entry price (0-1)
  totalBought: number;       // Total invested in USD
  realizedPnl: number;       // Realized profit/loss
  curPrice: number;          // Final price (1 = won, 0 = lost)
  title: string;             // Market question
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;           // "Yes", "No", team name, player name, etc.
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset: string;
  endDate: string;
  timestamp: number;         // When position was closed (Unix seconds)
}
```

## UI Components

### ClosedPositionCard

Located at: `frontend/src/components/ClosedPositionCard.tsx`

#### Layout
- **Mobile**: Card layout with stacked information
- **Desktop**: Row layout (table-like) for efficient scanning

#### Key Elements
1. **WON/LOST Badge** - Green or red badge based on realizedPnl
2. **Category Tag** - Inferred from market title with sport-specific emoji
3. **Market Title** - Truncated to 2 lines on mobile
4. **Outcome** - The whale's bet (team name, Yes/No, Over/Under)
5. **Entry Price** - Shown as cents (e.g., "@ 38¢")
6. **Total Invested** - Formatted with K/M suffix
7. **P&L** - Green for profit, red for loss
8. **Timestamp** - Relative time (e.g., "2w ago", "1mo ago")

### Color Scheme for Outcomes

```typescript
function getOutcomeColor(outcome: string): string {
  const normalized = outcome?.toUpperCase()?.trim() || '';

  // Yes/Over outcomes → Green (profit color)
  if (normalized === 'YES' || normalized === 'OVER') {
    return tokens.colors.profit;  // #00ff88
  }

  // No/Under outcomes → Red (loss color)
  if (normalized === 'NO' || normalized === 'UNDER') {
    return tokens.colors.loss;    // #ff3366
  }

  // Team names, player names, etc. → Gold accent
  return tokens.colors.gold;      // #f59e0b
}
```

## Category Inference

Since closed positions don't include enriched data from Gamma API, categories are inferred from market titles using `inferCategory()` in `CategoryTag.tsx`.

### Sports Detection Patterns

The sports category is detected using comprehensive regex patterns:

1. **Betting Patterns**: `Spread:`, `O/U`, point spreads like `(-9.5)`, `vs.` matchups
2. **Major Leagues**: NFL, NBA, MLB, NHL, NCAA, MLS, UFC, PGA, WWE, WNBA, AFL, EPL, F1
3. **All Team Names**:
   - NFL: 49ers, Bears, Broncos, Chiefs, Cowboys, Eagles, Lions, Packers, Patriots, Ravens, etc.
   - NBA: 76ers, Bulls, Celtics, Lakers, Warriors, Nuggets, Heat, etc.
   - MLB: Yankees, Dodgers, Red Sox, etc.
   - NHL: Penguins, Bruins, Lightning, etc.
   - College: Volunteers, Bulldogs, Cougars, Wildcats, etc.
   - State schools: Ohio State, Penn State, Fresno State, etc.

4. **Important**: Sports patterns are checked BEFORE world patterns to prevent "Warriors" from matching "war"

### Sport Emoji Detection

`getSportEmoji()` returns sport-specific emojis:

| Sport | Emoji | Detection Examples |
|-------|-------|-------------------|
| Boxing/MMA | 🥊 | Jake Paul, Anthony Joshua, UFC, Tyson, Fury |
| Basketball | 🏀 | Warriors, Lakers, 76ers, NBA, WNBA |
| Football | 🏈 | Packers, Bears, Cowboys, NFL, Super Bowl, college teams (Ole Miss, Miami, Alabama, etc.) |
| Baseball | ⚾ | Yankees, Dodgers, MLB, World Series |
| Hockey | 🏒 | Penguins, NHL, Stanley Cup |
| Soccer | ⚽ | Premier League, Champions League, World Cup, EPL teams (Sheffield United, Manchester, Liverpool, etc.) |
| Tennis | 🎾 | Wimbledon, US Open, ATP |
| Golf | ⛳ | PGA, Masters, Ryder Cup |
| Racing | 🏎️ | F1, NASCAR, Grand Prix |
| Default | 🏆 | Unknown sports |

### College Football Detection

Comprehensive detection for CFB including:
- **SEC**: Ole Miss (Rebels), Alabama, Auburn, LSU, Georgia, Tennessee, Arkansas, etc.
- **Big Ten**: Michigan, Ohio State, Penn State, Wisconsin, Iowa, Nebraska, etc.
- **ACC**: Miami (Hurricanes), Clemson, Virginia Tech, Duke, NC State, etc.
- **Big 12**: Texas, Oklahoma, TCU, Baylor, Kansas, West Virginia, etc.
- **Pac-12/Other**: Oregon, USC, UCLA, Utah, Colorado, Stanford, etc.
- **Team nicknames**: Rebels, Hurricanes, Hokies, Wolfpack, Yellow Jackets, etc.

### Soccer/European Football Detection

Expanded detection for soccer including:
- **English Premier League**: Manchester, Liverpool, Chelsea, Arsenal, Tottenham, Sheffield United, Newcastle, Brighton, etc.
- **Top European Clubs**: Barcelona, Real Madrid, Bayern, Juventus, PSG, Inter Milan, AC Milan, Napoli, Dortmund, etc.
- **Generic patterns**: "FC", "United FC", "City FC", "football club"

## Access Pattern

### Frontend Hook

```typescript
const {
  positions: closedPositions,
  loading: closedLoading,
  error: closedError,
  hasMore: closedHasMore,
  loadMore: loadMoreClosed,
  page: closedPage,
  setPage: setClosedPage,
} = useClosedPositions(wallet.address, {
  enabled: positionStatusFilter === 'closed',
  pageSize: 25,
});
```

### Lazy Loading

Closed positions are only fetched when the "Closed" filter is selected (`enabled: positionStatusFilter === 'closed'`). This prevents unnecessary API calls.

### Pagination

Uses "Load More" button for infinite scroll-style pagination rather than traditional page numbers.

## Backend Endpoint

**Route**: `GET /api/wallets/:address/closed-positions`

Located at: `src/api/server.ts`

### Query Parameters
- `limit` (default: 50, max: 50)
- `offset` (default: 0)
- `sortBy` (default: 'realizedpnl')
- `sortDir` (default: 'DESC')

### Response
```json
{
  "positions": [...],
  "pagination": {
    "limit": 25,
    "offset": 0,
    "count": 25,
    "hasMore": true
  }
}
```

## Files Changed

### New Files
- `frontend/src/components/ClosedPositionCard.tsx` - Card component for closed positions
- `frontend/src/hooks/useClosedPositions.ts` - Hook for fetching closed positions

### Modified Files
- `frontend/src/types/polymarket.ts` - Added `PolymarketClosedPosition` interface
- `frontend/src/services/api.ts` - Added `fetchClosedPositions()` function
- `frontend/src/components/WalletProfile.tsx` - Added "Closed" filter button and view
- `frontend/src/components/CategoryTag.tsx` - Enhanced `inferCategory()` and `getSportEmoji()`
- `src/api/server.ts` - Added `/api/wallets/:address/closed-positions` endpoint
- `src/services/polymarketApi.ts` - Added `getClosedPositions()` function
- `src/types/polymarket.ts` - Added backend `PolymarketClosedPosition` type

## Design Considerations

1. **No enriched data**: Unlike active positions, closed positions don't have Gamma API enrichment (no `sportsMarketType`, `seriesSlug`). All categorization relies on title keyword matching.

2. **Outcome colors**: We use a semantic color system:
   - Green for positive outcomes (Yes, Over)
   - Red for negative outcomes (No, Under)
   - Gold for neutral outcomes (team names, player names)

3. **Sport emoji fallback**: Since we don't have `seriesSlug` for closed positions, we rely entirely on title keyword matching for sport emoji selection.

4. **WON/LOST determination**: Based on `realizedPnl >= 0` rather than `curPrice`, which is more accurate for partial positions.
