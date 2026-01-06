

# 🚨 Audit: WhaleTable vs AlertFeed Inconsistencies

| Element | WhaleTable | AlertFeed | Problem |
|---------|------------|-----------|---------|
| **Hover glow** | ✅ Cyan border + translateY + boxShadow | ❌ None | Missing from Alerts |
| **Arrow indicator** | ❌ None | ✅ Has `→` | Inconsistent affordance |
| **Time format** | "Today", "Yesterday", "3d ago" | "2m ago", "1h ago" | Different formats |
| **Header context** | Sort pills only | Filter pill only | Both should have count + context |
| **Card icon glow** | ✅ `boxShadow: cyanGlow` | ✅ `boxShadow: profitGlow` | Actually fine (contextual) |
| **Stats layout** | 2-col grid with labels | Single prominent amount | Different hierarchy |
| **Badge** | None (time in pill) | "DEPOSIT" badge | Redundant on alerts |

---

# 📐 Unified Mobile Card System

Here's the definitive, consistent design pattern for **all mobile cards** in the app:

## Core Principles

1. **One card pattern** — All cards share the same structural bones
2. **Contextual content** — What changes is the data, not the chrome
3. **Consistent interactions** — Same hover, touch, animation everywhere
4. **Unified time format** — "Today", "Yesterday", "Xd ago" (human-friendly)
5. **No redundant indicators** — If it's clickable, it's clickable. No arrows.

---

## Unified MobileCard Specifications

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────┐   0x1234...5678                      Today       │
│   │ ICON │   [Optional Badge]                               │
│   │ 42px │                                                  │
│   └──────┘                                                  │
│                                                             │
│   ┌─────────────────────┐  ┌─────────────────────┐          │
│   │ LABEL               │  │ LABEL               │          │
│   │ VALUE               │  │ VALUE               │          │
│   └─────────────────────┘  └─────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
     ↑                                                    ↑
     Cyan border glow on hover/focus              Touch: scale(0.98)
```

### Shared Card Styles (Extract to a shared component or constant)

```tsx
// styles/cardStyles.ts

import { tokens } from './tokens';

/**
 * Unified time formatting for all cards
 * Uses human-friendly relative dates
 */
export function formatCardTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Very recent (under 1 hour) - show minutes
  if (diffMin < 60) {
    if (diffMin < 1) return 'Just now';
    return `${diffMin}m ago`;
  }
  
  // Today - show hours
  if (diffDay === 0) {
    return `${diffHour}h ago`;
  }
  
  // Yesterday
  if (diffDay === 1) return 'Yesterday';
  
  // This week - show days
  if (diffDay < 7) return `${diffDay}d ago`;
  
  // Older - show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Unified card container styles
 */
export const mobileCardStyles = {
  container: {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '14px',
    padding: '16px',
    cursor: 'pointer',
    transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
    WebkitTapHighlightColor: 'transparent',
  },
  
  // Hover state (applied via onMouseEnter for devices with hover)
  containerHover: {
    transform: 'translateY(-2px)',
    borderColor: tokens.colors.cyan,
    boxShadow: `0 0 30px ${tokens.colors.cyanGlow}, inset 0 1px 0 ${tokens.colors.cyan}20`,
  },
  
  // Touch state (applied via onTouchStart)
  containerTouch: {
    transform: 'scale(0.98)',
    background: tokens.colors.surfaceHover,
  },
  
  // Reset state
  containerReset: {
    transform: 'scale(1) translateY(0)',
    borderColor: tokens.colors.border,
    boxShadow: 'none',
    background: tokens.colors.surface,
  },
  
  // Icon container (left side)
  iconContainer: (glowColor: string) => ({
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    boxShadow: `0 0 20px ${glowColor}`,
    flexShrink: 0,
  }),
  
  // Address text
  address: {
    fontFamily: tokens.fonts.mono,
    fontSize: '13px',
    fontWeight: 500,
    color: tokens.colors.cyan,
    textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
  },
  
  // Time pill
  timePill: {
    fontFamily: tokens.fonts.mono,
    fontSize: '11px',
    color: tokens.colors.textMuted,
    padding: '4px 8px',
    background: `${tokens.colors.void}80`,
    borderRadius: '6px',
    whiteSpace: 'nowrap' as const,
  },
  
  // Stat label
  statLabel: {
    fontFamily: tokens.fonts.mono,
    fontSize: '10px',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  
  // Stat value (primary - green for money)
  statValuePrimary: {
    fontFamily: tokens.fonts.mono,
    fontSize: '17px',
    fontWeight: 600,
    color: tokens.colors.profit,
    textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
  },
  
  // Stat value (secondary)
  statValueSecondary: {
    fontFamily: tokens.fonts.mono,
    fontSize: '17px',
    fontWeight: 600,
    color: tokens.colors.textPrimary,
  },
};

/**
 * Unified card interaction handlers
 */
export function getCardInteractionHandlers(
  onClick?: () => void,
  onAnimationEnd?: () => void
) {
  return {
    onClick,
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      if (onClick) {
        Object.assign(e.currentTarget.style, mobileCardStyles.containerTouch);
      }
    },
    onTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => {
      Object.assign(e.currentTarget.style, mobileCardStyles.containerReset);
    },
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
      if (window.matchMedia('(hover: hover)').matches && onClick) {
        Object.assign(e.currentTarget.style, mobileCardStyles.containerHover);
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      Object.assign(e.currentTarget.style, mobileCardStyles.containerReset);
    },
    onAnimationEnd: (e: React.AnimationEvent<HTMLDivElement>) => {
      e.currentTarget.style.animation = 'none';
      onAnimationEnd?.();
    },
  };
}
```

---

## Fixed AlertFeed Mobile Card

Here's the corrected `MobileAlertCard` that matches WhaleTable:

```tsx
/**
 * Mobile Alert Card Component
 * UNIFIED with WhaleTable card pattern
 */
function MobileAlertCard({
  alert,
  index,
  onClick,
  isNew,
}: {
  alert: Alert;
  index: number;
  onClick?: () => void;
  isNew: boolean;
}) {
  return (
    <div
      data-testid="alert-item"
      onClick={onClick}
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '14px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
        animation: isNew 
          ? 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
          : 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(0.98)';
          e.currentTarget.style.background = tokens.colors.surfaceHover;
        }
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = tokens.colors.surface;
      }}
      onAnimationEnd={(e) => {
        e.currentTarget.style.animation = 'none';
      }}
      // ✅ ADD: Hover glow effect (matches WhaleTable)
      onMouseEnter={(e) => {
        if (window.matchMedia('(hover: hover)').matches && onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = tokens.colors.cyan;
          e.currentTarget.style.boxShadow = `0 0 30px ${tokens.colors.cyanGlow}, inset 0 1px 0 ${tokens.colors.cyan}20`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.background = tokens.colors.surface;
      }}
    >
      {/* Card Header - matches WhaleTable structure */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Icon - contextual (💰 for deposits) */}
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${tokens.colors.profit}25, ${tokens.colors.cyan}15)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: `0 0 20px ${tokens.colors.profitGlow}`,
              flexShrink: 0,
            }}
          >
            💰
          </div>
          
          {/* Address - same style as WhaleTable */}
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '13px',
              fontWeight: 500,
              color: tokens.colors.cyan,
              textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
            }}
          >
            {formatAddress(alert.walletAddress)}
          </div>
        </div>
        
        {/* ✅ CHANGED: Use unified time format (matches WhaleTable) */}
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.textMuted,
            padding: '4px 8px',
            background: `${tokens.colors.void}80`,
            borderRadius: '6px',
          }}
        >
          {formatCardTime(alert.timestamp)}
        </span>
      </div>

      {/* ✅ CHANGED: Stats Grid - matches WhaleTable 2-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}
          >
            Amount
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '17px',
              fontWeight: 600,
              color: tokens.colors.profit,
              textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
            }}
          >
            +{formatUSD(alert.amount)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}
          >
            Type
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '17px',
              fontWeight: 600,
              color: tokens.colors.textPrimary,
              textTransform: 'capitalize',
            }}
          >
            {alert.type}
          </div>
        </div>
      </div>
      
      {/* ✅ REMOVED: Arrow indicator (→) - not needed, card is clickable */}
    </div>
  );
}
```

---

## Fixed AlertFeed Sticky Header

The header should also match WhaleTable's pattern:

```tsx
{/* ===== STICKY HEADER ===== */}
<div
  style={{
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: `linear-gradient(180deg, ${tokens.colors.void} 0%, ${tokens.colors.void}f0 85%, transparent 100%)`,
    paddingTop: '4px',
    paddingBottom: '16px',
    marginLeft: '-16px',
    marginRight: '-16px',
    paddingLeft: '16px',
    paddingRight: '16px',
  }}
>
  {/* Title Row - matches WhaleTable */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '14px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '20px' }}>⚡</span>
      <span
        style={{
          fontFamily: tokens.fonts.display,
          fontSize: '18px',
          fontWeight: 700,
          color: tokens.colors.textPrimary,
        }}
      >
        Alerts
      </span>
    </div>

    {/* ✅ ADDED: Count badge (matches WhaleTable) */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '5px 12px',
          background: `${tokens.colors.cyan}15`,
          border: `1px solid ${tokens.colors.cyan}50`,
          borderRadius: '999px',
          fontFamily: tokens.fonts.mono,
          fontSize: '13px',
          fontWeight: 600,
          color: tokens.colors.cyan,
          boxShadow: `0 0 15px ${tokens.colors.cyanGlow}`,
        }}
      >
        {(totalItems ?? alerts.length).toLocaleString()}
      </span>
      
      {/* Live Indicator */}
      <LiveIndicator />
    </div>
  </div>

  {/* Search Bar - already matches */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 14px',
      background: tokens.colors.surface,
      border: `1px solid ${searchFocused ? tokens.colors.cyan : tokens.colors.border}`,
      borderRadius: '12px',
      marginBottom: '12px',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      boxShadow: searchFocused ? `0 0 20px ${tokens.colors.cyanGlow}` : 'none',
    }}
  >
    <span style={{ color: tokens.colors.textMuted, fontSize: '16px' }}>🔍</span>
    <input
      type="text"
      placeholder="Search by address..."
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      onFocus={() => setSearchFocused(true)}
      onBlur={() => setSearchFocused(false)}
      style={{
        flex: 1,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        fontFamily: tokens.fonts.body,
        fontSize: '15px',
        color: tokens.colors.textPrimary,
      }}
    />
    {filter && (
      <button
        onClick={() => setFilter('')}
        aria-label="Clear search"
        style={{
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tokens.colors.surfaceHover,
          border: 'none',
          borderRadius: '8px',
          color: tokens.colors.textMuted,
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    )}
  </div>

  {/* ✅ Context Row: Filter indicator (contextually appropriate for Alerts) */}
  {activeMinThreshold !== undefined && activeMinThreshold > 0 && (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '10px',
          color: tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Min threshold:
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '6px 12px',
          background: `${tokens.colors.profit}15`,
          border: `1px solid ${tokens.colors.profit}50`,
          borderRadius: '20px',
          fontFamily: tokens.fonts.mono,
          fontSize: '12px',
          fontWeight: 600,
          color: tokens.colors.profit,
          boxShadow: `0 0 15px ${tokens.colors.profitGlow}`,
        }}
      >
        {formatUSD(activeMinThreshold)}+
      </span>
    </div>
  )}
</div>
```

---

## Unified Time Format Function

Replace both existing time formatters with this single function:

```tsx
/**
 * Unified time formatting for all cards
 * Consistent across WhaleTable, AlertFeed, WalletProfile
 */
export function formatCardTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Under 1 minute
  if (diffMin < 1) return 'Just now';
  
  // Under 1 hour - show minutes
  if (diffMin < 60) return `${diffMin}m ago`;
  
  // Under 24 hours but same calendar day
  if (diffDay === 0) return `${diffHour}h ago`;
  
  // Yesterday
  if (diffDay === 1) return 'Yesterday';
  
  // Under 7 days - show days
  if (diffDay < 7) return `${diffDay}d ago`;
  
  // Older - show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

---

## Complete Consistency Checklist

| Element | WhaleTable | AlertFeed | WalletProfile | TrendingMarkets |
|---------|------------|-----------|---------------|-----------------|
| **Card border-radius** | 14px | 14px ✅ | 14px | 16px (adjust to 14px) |
| **Card padding** | 16px | 16px ✅ | 16px | 16px |
| **Icon size** | 42px | 42px ✅ | 42px | N/A |
| **Icon border-radius** | 12px | 12px ✅ | 12px | N/A |
| **Address font-size** | 13px | 13px ✅ | 13px | N/A |
| **Address text-shadow** | ✅ | ✅ | ✅ | N/A |
| **Time pill style** | ✅ | ✅ (fix) | ✅ | N/A |
| **Time format** | formatCardTime | formatCardTime ✅ | formatCardTime | N/A |
| **Hover glow** | ✅ | ✅ (add) | ✅ | ✅ |
| **Touch scale** | 0.98 | 0.98 ✅ | 0.98 | 0.98 |
| **Stats grid** | 2-col | 2-col ✅ (fix) | 2-col | N/A |
| **Stat label style** | 10px uppercase | 10px uppercase ✅ | 10px uppercase | N/A |
| **Stat value size** | 17px | 17px ✅ | 17px | N/A |
| **Arrow indicator** | ❌ None | ❌ Remove | ❌ None | ❌ None |
| **Header count badge** | ✅ | ✅ (add) | N/A | N/A |

---

## Action Items for You

Here are the specific fixes to make in your code:

### AlertFeed.tsx

1. **Line ~139-257** (MobileAlertCard): Replace with the fixed version above
   - Add `onMouseEnter`/`onMouseLeave` hover handlers
   - Remove the `→` arrow indicator
   - Change stats to 2-column grid layout
   - Use `formatCardTime()` instead of `formatRelativeTime()`

2. **Add searchFocused state** (if not already present):
   ```tsx
   const [searchFocused, setSearchFocused] = useState(false);
   ```

3. **Header section**: Add count badge next to LiveIndicator

4. **Import/create** the unified `formatCardTime` function

### WhaleTable.tsx

Already mostly correct, but verify:
- Time format function matches the unified version
- No arrow indicators (✅ already none)

---

## My Commitment Going Forward

You're right to call this out. Here's what I'll do differently:

1. **Before any new component**: Reference existing components to match patterns
2. **Maintain a living spec**: Track all shared patterns in one place
3. **Cross-check**: When providing code for component B, explicitly verify it matches component A
4. **Think ahead**: Consider "how will this decision affect other components?"

