# Skeleton Loading System

## Overview

PolyWolyTroly implements a beautiful, color-coded skeleton loading system that provides visual feedback while data is being fetched. The skeleton components match the structure and semantic colors of the actual content they represent, creating a seamless loading experience.

## Design Principles

### 1. Color-Coded Shimmer Effects
Each skeleton uses accent colors that match the semantic meaning of the content it represents:
- **Cyan** (`#00fff0`): Primary data, whale tracking
- **Magenta** (`#ff2d92`): Volume, secondary metrics
- **Purple** (`#a855f7`): Alerts, tertiary data
- **Green/Profit** (`#00ff88`): New whales, positive indicators

### 2. Staggered Animations
Animation delays create a wave effect across multiple skeleton elements:
- KPI cards: 100ms increments
- Trending market cards: 150ms increments
- Individual skeleton elements: 50ms increments within each card

### 3. Structure Matching
Skeleton cards mirror the exact layout of their loaded counterparts:
- Same dimensions and border radius
- Matching internal structure (header, content, stats row)
- Identical grid layouts

## Components

### DashboardLoading Component
**File**: `frontend/src/components/DashboardLoading.tsx`

Displays the complete dashboard loading state including:

#### KPI Skeleton Cards (4 cards)
```
Colors: [cyan, magenta, purple, profit]
Features:
- Colored top border (3px solid)
- Shimmer slide overlay
- Icon placeholder with color tint
- Value placeholder with color accent
- Label placeholder
```

#### Trending Markets Skeleton (4 cards on desktop, 3 on mobile)
```
Colors: [cyan, profit, magenta, purple]
Features:
- Section header skeleton (icon, title, link)
- Category tag skeleton with color tint
- Title skeleton (2 lines)
- Probability bar skeleton
- Stats row skeleton (YES %, sparkline, volume)
```

### LoadingSkeleton (TrendingMarkets internal)
**File**: `frontend/src/components/TrendingMarkets.tsx`

Used when TrendingMarkets data loads independently after dashboard data.

## CSS Animations

### Shimmer Animation
```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```
- Duration: 1.5s
- Timing: ease-in-out
- Iteration: infinite

### Shimmer Slide Animation
```css
@keyframes shimmerSlide {
  0% { left: -100%; }
  100% { left: 100%; }
}
```
- Duration: 2s
- Timing: ease-in-out
- Iteration: infinite

## Color Application

### Gradient Patterns

**Color-tinted shimmer** (for semantic elements):
```css
background: linear-gradient(90deg, ${color}15 0%, ${color}30 50%, ${color}15 100%);
```

**Neutral shimmer** (for text placeholders):
```css
background: linear-gradient(90deg, ${border} 0%, ${surfaceHover} 50%, ${border} 100%);
```

**Shimmer overlay** (slides across cards):
```css
background: linear-gradient(90deg, transparent 0%, ${color}15 50%, transparent 100%);
```

## Responsive Behavior

### Desktop
- 4-column grid for KPI cards
- 4-column grid for trending market cards
- Full-width probability bars

### Mobile
- 2-column grid for KPI cards
- Horizontal scrolling for trending market cards (3 visible)
- Spacers on left/right of scroll container
- Larger border radius (16px vs 12px)

## Implementation Notes

### Loading State Flow
1. Initial page load: `loading` (stats) is true
2. `DashboardLoading` renders with all skeletons
3. Stats API responds: `loading` becomes false
4. Dashboard renders with KPI cards
5. TrendingMarkets may still show skeleton if `trendingLoading` is true
6. Trending API responds: full content displays

### Key Files
- `frontend/src/components/DashboardLoading.tsx` - Main loading component
- `frontend/src/components/TrendingMarkets.tsx` - Contains `LoadingSkeleton` and `SkeletonMarketCard`
- `frontend/src/components/Skeleton.tsx` - Base skeleton primitives
- `frontend/src/styles/tokens.ts` - Color definitions

## Usage

The skeleton loading is automatically displayed when:
1. The dashboard page loads initially
2. Data is being refreshed (background refresh shows content, not skeleton)
3. Network requests are in progress

No manual implementation required - the components handle loading states internally based on the `loading` prop from their respective hooks.
