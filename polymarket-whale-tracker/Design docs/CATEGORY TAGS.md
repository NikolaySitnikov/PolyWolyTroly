## Market Category Tags — Design Specification

## Overview

Market category tags provide quick visual categorization for prediction markets, helping users scan and filter by topic area. They should be compact, scannable, and visually distinctive without overwhelming the market card content.

---

## Category Taxonomy

| Category          | Icon | Colour                     | Use Cases                              |
| ----------------- | ---- | -------------------------- | -------------------------------------- |
| **Politics**      | 🏛️  | `#ff6b35` (Orange)         | Elections, legislation, government     |
| **Crypto**        | ₿    | `#f7931a` (Bitcoin Orange) | Bitcoin, Ethereum, DeFi, regulations   |
| **Sports**        | ⚽    | `#22c55e` (Green)          | Games, championships, player stats     |
| **Finance**       | 📈   | `#3b82f6` (Blue)           | Stocks, Fed rates, economic indicators |
| **Tech**          | 💻   | `#a855f7` (Purple)         | Product launches, company news, AI     |
| **Entertainment** | 🎬   | `#ec4899` (Pink)           | Awards, releases, celebrity            |
| **Science**       | 🔬   | `#06b6d4` (Teal)           | Research, space, climate               |
| **World**         | 🌍   | `#64748b` (Slate)          | Geopolitics, international events      |
| **Other**         | 📌   | `#6b7280` (Grey)           | Uncategorized markets                  |

---

## Tag Component Specs

### Anatomy

```
┌─────────────────┐
│ 🏛️ Politics    │
└─────────────────┘
  ↑       ↑
 Icon   Label
```

### Sizing

| Variant               | Height | Padding  | Font Size | Icon Size |
| --------------------- | ------ | -------- | --------- | --------- |
| **Small** (in cards)  | 20px   | 4px 8px  | 10px      | 12px      |
| **Default** (filters) | 26px   | 6px 12px | 12px      | 14px      |
| **Large** (headers)   | 32px   | 8px 16px | 13px      | 16px      |

### Base Styles

css

```css
.category-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  font-family: var(--font-mono);  /* JetBrains Mono */
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  border-radius: 4px;
  white-space: nowrap;

  transition: all 0.15s ease;
}
```

### Colour Application

Tags use a subtle, low-contrast style to avoid competing with market data:

css

```css
.category-tag {
  /* Background: category colour at 15% opacity */
  background: ${categoryColor}15;

  /* Border: category colour at 40% opacity */
  border: 1px solid ${categoryColor}40;

  /* Text: category colour at full or 90% */
  color: ${categoryColor};
}

/* Hover: Increase intensity */
.category-tag:hover {
  background: ${categoryColor}25;
  border-color: ${categoryColor}60;
  box-shadow: 0 0 10px ${categoryColor}20;
}

/* Active/Selected state */
.category-tag.active {
  background: ${categoryColor};
  border-color: ${categoryColor};
  color: var(--void);  /* #0a0a0f */
  box-shadow: 0 0 15px ${categoryColor}40;
}
```

---

## React Component

tsx

```tsx
/**
 * CategoryTag Component
 * 
 * Visual tag for market categorization.
 * @see Design docs/MARKET_CATEGORIES.md
 */

import { tokens } from '../styles/tokens';

type MarketCategory = 
  | 'politics' 
  | 'crypto' 
  | 'sports' 
  | 'finance' 
  | 'tech' 
  | 'entertainment' 
  | 'science' 
  | 'world' 
  | 'other';

type TagSize = 'small' | 'default' | 'large';

interface CategoryTagProps {
  category: MarketCategory;
  size?: TagSize;
  /** If true, shows as selected/active */
  active?: boolean;
  /** If true, tag is clickable */
  onClick?: () => void;
  /** Hide the icon, show only text */
  hideIcon?: boolean;
}

const CATEGORY_CONFIG: Record<MarketCategory, { icon: string; label: string; color: string }> = {
  politics: { icon: '🏛️', label: 'Politics', color: '#ff6b35' },
  crypto: { icon: '₿', label: 'Crypto', color: '#f7931a' },
  sports: { icon: '⚽', label: 'Sports', color: '#22c55e' },
  finance: { icon: '📈', label: 'Finance', color: '#3b82f6' },
  tech: { icon: '💻', label: 'Tech', color: '#a855f7' },
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#ec4899' },
  science: { icon: '🔬', label: 'Science', color: '#06b6d4' },
  world: { icon: '🌍', label: 'World', color: '#64748b' },
  other: { icon: '📌', label: 'Other', color: '#6b7280' },
};

const SIZE_CONFIG: Record<TagSize, { 
  height: string; 
  padding: string; 
  fontSize: string; 
  iconSize: string;
  gap: string;
}> = {
  small: { height: '20px', padding: '0 8px', fontSize: '10px', iconSize: '11px', gap: '3px' },
  default: { height: '26px', padding: '0 12px', fontSize: '12px', iconSize: '13px', gap: '5px' },
  large: { height: '32px', padding: '0 16px', fontSize: '13px', iconSize: '15px', gap: '6px' },
};

export function CategoryTag({ 
  category, 
  size = 'small', 
  active = false,
  onClick,
  hideIcon = false,
}: CategoryTagProps) {
  const config = CATEGORY_CONFIG[category];
  const sizeConfig = SIZE_CONFIG[size];
  const isClickable = !!onClick;

  return (
    <span
      data-testid={`category-tag-${category}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        height: sizeConfig.height,
        padding: sizeConfig.padding,

        background: active ? config.color : `${config.color}15`,
        border: `1px solid ${active ? config.color : `${config.color}40`}`,
        borderRadius: '4px',

        fontFamily: tokens.fonts.mono,
        fontSize: sizeConfig.fontSize,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: active ? tokens.colors.void : config.color,

        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        userSelect: 'none',

        ...(active && {
          boxShadow: `0 0 15px ${config.color}40`,
        }),
      }}
      onMouseEnter={(e) => {
        if (!active && isClickable) {
          e.currentTarget.style.background = `${config.color}25`;
          e.currentTarget.style.borderColor = `${config.color}60`;
          e.currentTarget.style.boxShadow = `0 0 10px ${config.color}20`;
        }
      }}
      onMouseLeave={(e) => {
        if (!active && isClickable) {
          e.currentTarget.style.background = `${config.color}15`;
          e.currentTarget.style.borderColor = `${config.color}40`;
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {!hideIcon && (
        <span style={{ fontSize: sizeConfig.iconSize, lineHeight: 1 }}>
          {config.icon}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Helper to get category from market question (basic keyword matching)
 * In production, this should come from the API
 */
export function inferCategory(question: string): MarketCategory {
  const q = question.toLowerCase();

  if (/trump|biden|election|president|congress|senate|governor|vote|democrat|republican/i.test(q)) {
    return 'politics';
  }
  if (/bitcoin|btc|ethereum|eth|crypto|defi|token|blockchain|solana/i.test(q)) {
    return 'crypto';
  }
  if (/nfl|nba|mlb|world cup|championship|playoff|game|match|team|player/i.test(q)) {
    return 'sports';
  }
  if (/stock|fed|rate|inflation|gdp|earnings|ipo|market|s&p|nasdaq/i.test(q)) {
    return 'finance';
  }
  if (/apple|google|microsoft|ai|gpt|launch|iphone|android|startup/i.test(q)) {
    return 'tech';
  }
  if (/oscar|grammy|movie|film|album|award|netflix|disney|celebrity/i.test(q)) {
    return 'entertainment';
  }
  if (/nasa|space|climate|research|study|vaccine|species|discovery/i.test(q)) {
    return 'science';
  }
  if (/war|treaty|country|nation|international|un|nato|summit/i.test(q)) {
    return 'world';
  }

  return 'other';
}
```

---

## Integration with TrendingMarkets

Update `MarketCard` to include the tag:

tsx

```tsx
// In TrendingMarkets.tsx

import { CategoryTag, inferCategory } from './CategoryTag';

function MarketCard({ market, index }: { market: TrendingMarketResponse; index: number }) {
  // Ideally category comes from API, fallback to inference
  const category = market.category || inferCategory(market.question);

  return (
    <a href={...} style={...}>
      {/* Category tag - top right corner */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '8px',
      }}>
        <CategoryTag category={category} size="small" />
        {/* Optional: 24h change indicator */}
        {market.priceChange24h !== undefined && (
          <span style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: market.priceChange24h >= 0 ? tokens.colors.profit : tokens.colors.loss,
          }}>
            {market.priceChange24h >= 0 ? '↑' : '↓'} 
            {Math.abs(market.priceChange24h).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Market question */}
      <div style={{...}}>
        {market.question}
      </div>

      {/* ... rest of card */}
    </a>
  );
}
```

---

## Category Filter Bar

For filtering markets by category:

tsx

```tsx
/**
 * CategoryFilter Component
 * 
 * Horizontal scrollable filter bar for market categories.
 */

import { useState } from 'react';
import { tokens } from '../styles/tokens';
import { CategoryTag, type MarketCategory } from './CategoryTag';

const ALL_CATEGORIES: MarketCategory[] = [
  'politics', 'crypto', 'sports', 'finance', 
  'tech', 'entertainment', 'science', 'world', 'other'
];

interface CategoryFilterProps {
  selected: MarketCategory | null;
  onSelect: (category: MarketCategory | null) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '4px 0',
        marginBottom: '16px',
        /* Hide scrollbar but keep functionality */
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {/* "All" option */}
      <button
        onClick={() => onSelect(null)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '26px',
          padding: '0 12px',
          background: selected === null ? tokens.colors.cyan : 'transparent',
          border: `1px solid ${selected === null ? tokens.colors.cyan : tokens.colors.border}`,
          borderRadius: '4px',
          fontFamily: tokens.fonts.mono,
          fontSize: '12px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: selected === null ? tokens.colors.void : tokens.colors.textSecondary,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          boxShadow: selected === null ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
        }}
      >
        All
      </button>

      {/* Category tags */}
      {ALL_CATEGORIES.map((category) => (
        <CategoryTag
          key={category}
          category={category}
          size="default"
          active={selected === category}
          onClick={() => onSelect(selected === category ? null : category)}
        />
      ))}
    </div>
  );
}
```

---

## Visual Examples

### In Market Card (Small)
```
┌────────────────────────────────────────┐
│ 🏛️ POLITICS                    ↑ 2.3% │
│                                        │
│ Will Trump win the 2024 election?      │
│                                        │
│ ████████████░░░░░░░░  62% Yes         │
│                                        │
│ $1.2M 24h                              │
└────────────────────────────────────────┘
```

### Filter Bar (Default)
```
┌──────────────────────────────────────────────────────────────────┐
│ [All] [🏛️ Politics] [₿ Crypto] [⚽ Sports] [📈 Finance] [...]   │
└──────────────────────────────────────────────────────────────────┘
        ↑ active                  ↑ hover glow
```

---

## Accessibility

- Tags have `role="button"` when clickable
- Keyboard navigation with Enter/Space
- Colour is never the only indicator (always paired with icon + label)
- Focus-visible outline using cyan
- Screen reader announces category name

---

## API Considerations

Ideally the backend provides a `category` field on markets:

typescript

```typescript
interface TrendingMarketResponse {
  id: string;
  question: string;
  eventSlug: string;
  yesPrice: number;
  volume24hr: number;
  category?: MarketCategory;  // ← Add this
  priceChange24h?: number;    // ← For trend indicator
  priceHistory?: number[];    // ← For sparklines
}
```

If not available from Polymarket API, the `inferCategory()` helper provides a reasonable fallback based on keyword matching.
