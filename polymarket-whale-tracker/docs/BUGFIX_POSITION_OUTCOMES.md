# Bug Fix: Position Outcomes Display

## Issue
Active and redeemable positions were incorrectly showing only "YES" or "NO" as the position outcome, when Polymarket actually supports many outcome types:
- Yes / No
- Over / Under
- Team names (e.g., "Ole Miss", "Mavericks", "Timberwolves")
- Player names
- And other custom outcomes

The Closed positions tab was already displaying outcomes correctly.

## Root Cause
In `frontend/src/types/position.ts`, the `toPosition()` function was forcibly converting all outcomes to either "YES" or "NO":

```typescript
// BEFORE (incorrect)
const normalizedOutcome: PositionOutcome =
  raw.outcome?.toUpperCase() === 'YES' ? 'YES' : 'NO';
```

This meant any outcome that wasn't exactly "YES" (like "Over", "Under", "Ole Miss", etc.) was incorrectly displayed as "NO".

## Solution

### 1. Updated type definition
**File**: `frontend/src/types/position.ts`

Changed `PositionOutcome` from a union type to a string:
```typescript
// AFTER (correct)
export type PositionOutcome = string;
```

### 2. Use actual outcome value
```typescript
// AFTER (correct)
const normalizedOutcome: PositionOutcome = raw.outcome || 'Unknown';
```

### 3. Updated OutcomeBadge component
**File**: `frontend/src/components/PositionsTable.tsx`

Added color logic for different outcome types:
```typescript
function getOutcomeColor(outcome: string): string {
  const normalized = outcome?.toUpperCase()?.trim() || '';

  // Yes/Over outcomes → Green
  if (normalized === 'YES' || normalized === 'OVER') {
    return tokens.colors.profit;
  }

  // No/Under outcomes → Red
  if (normalized === 'NO' || normalized === 'UNDER') {
    return tokens.colors.loss;
  }

  // All other outcomes (team names, etc.) → Gold accent
  return '#f59e0b';
}
```

### 4. Updated PositionCard (mobile)
**File**: `frontend/src/components/PositionCard.tsx`

Same color logic applied for consistency across desktop and mobile views.

## Color Scheme
| Outcome Type | Examples | Color |
|-------------|----------|-------|
| Positive | Yes, Over | Green (#22c55e) |
| Negative | No, Under | Red (#ef4444) |
| Other | Team names, player names | Gold (#f59e0b) |

## Files Changed
- `frontend/src/types/position.ts` - Type definition and conversion
- `frontend/src/components/PositionsTable.tsx` - Desktop table
- `frontend/src/components/PositionCard.tsx` - Mobile cards

## Verification
After the fix, positions now correctly display:
- "Ole Miss" instead of "NO"
- "Red Wings" instead of "NO"
- "Under" instead of "NO"
- "Timberwolves" instead of "NO"
- "Mavericks" instead of "NO"
- Team names with gold color styling
