# Bug Fix: Positions Table Sorting with Pagination

## Issue
When viewing a whale's positions in the table view:
1. Sort by Market title
2. Go to page 2
3. Sort by Size

**Expected**: All rows should re-sort by Size, page resets to 1
**Actual**: First two rows would get "stuck" and not re-sort properly

## Root Cause
**Duplicate React keys due to non-unique `conditionId`**

The Polymarket API was returning duplicate positions with the same `conditionId`. This caused React key collisions since we were using `conditionId` as the key:

```tsx
<tr key={position.conditionId}>
```

Console showed the error:
```
Warning: Encountered two children with the same key
```

When React encounters duplicate keys, it cannot properly reconcile which DOM elements to update when data changes, causing the "stuck rows" behavior.

### Why duplicates occurred
- `conditionId` identifies a **market**, not a unique position
- A wallet can have multiple positions in the same market (e.g., bought at different times/prices)
- The `asset` field is the unique token identifier for each position

## Solution

### 1. Backend: Deduplicate positions by `asset` field
**File**: `src/services/polymarketApi.ts`

Added deduplication in `getAllPositions()`:

```typescript
async getAllPositions(walletAddress: string): Promise<PolymarketPosition[]> {
  const allPositions: PolymarketPosition[] = [];
  const seenAssets = new Set<string>();

  // ... pagination loop ...

  // Deduplicate by asset field (unique token identifier)
  for (const pos of positions) {
    if (!seenAssets.has(pos.asset)) {
      seenAssets.add(pos.asset);
      allPositions.push(pos);
    }
  }
}
```

### 2. Frontend: Use `asset` as React key
Changed the key from `conditionId` to `asset` in three files:

**File**: `frontend/src/components/PositionsTable.tsx`
```tsx
<tr
  key={position.asset}
  data-testid={`position-row-${position.asset}`}
>
```

**File**: `frontend/src/components/WalletProfile.tsx`
```tsx
{filteredPositions.map((position) => (
  <PositionCard
    key={position.asset}
    position={position}
  />
))}
```

**File**: `frontend/src/components/PositionCard.tsx`
```tsx
<div
  data-testid={`position-card-${position.asset}`}
>
```

## Verification
Tested the exact scenario that was failing:
1. ✅ Sort by Market title → positions sorted A-Z
2. ✅ Go to page 2 → shows positions 11-20
3. ✅ Sort by Size → **ALL rows properly re-sort**, page resets to 1, largest positions shown first

No more stuck rows, no more React key collision warnings.

## Key Learnings
- `conditionId` = market identifier (not unique per position)
- `asset` = token identifier (unique per position)
- Always verify React keys are truly unique across the entire dataset
- Pagination + sorting bugs often indicate key uniqueness issues
