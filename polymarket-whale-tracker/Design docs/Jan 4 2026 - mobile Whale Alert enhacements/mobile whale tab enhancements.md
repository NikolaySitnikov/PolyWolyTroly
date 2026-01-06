

# 📱 Mobile Whale List — Enhanced Design Guidelines

## Current Issues

1. **Pagination floats at bottom** — gets lost after scrolling through cards
2. **No visual container** — pagination looks disconnected from the card stack
3. **Missing context** — no header/summary showing whale count and active filters
4. **Sort options hidden** — mobile users can't sort by different criteria
5. **No sticky navigation** — user loses context when scrolling deep

---

## Recommended Mobile Structure

```
┌─────────────────────────────────────┐
│  🐋 Tracked Whales          847     │  ← Sticky Header
│  ┌─────────────────────────────┐    │
│  │ 🔍 Search whales...         │    │  ← Search Bar
│  └─────────────────────────────┘    │
│  [ 💰 Volume ▾ ] [ 📊 Count ] [📅]  │  ← Sort Pills
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │ 🐋  0x1234...5678      2d ago│    │  ← Whale Cards
│  │     ──────────────────       │    │     (scrollable)
│  │  $125.5K        12 deposits  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🐋  0xABCD...EFGH     Today │    │
│  │     ──────────────────       │    │
│  │  $89.2K          8 deposits  │    │
│  └─────────────────────────────┘    │
│                 ...                 │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│     ‹   Page 3 of 43   ›            │  ← Sticky Bottom
│     Showing 41-60 of 847            │     Pagination
└─────────────────────────────────────┘
```

---

## Component Specifications

### 1. Mobile Header Bar (Sticky)

A sticky header that provides context and search without taking too much space.

```tsx
/**
 * MobileWhaleHeader
 * Sticky header with title, count, search, and sort options
 */

interface MobileWhaleHeaderProps {
  totalWhales: number;
  filter: string;
  onFilterChange: (value: string) => void;
  sortBy: WhaleSortField;
  sortDir: SortDirection;
  onSortChange: (field: WhaleSortField) => void;
}

// Styles
const headerStyles = {
  container: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    background: `linear-gradient(180deg, ${tokens.colors.void} 0%, ${tokens.colors.void}f5 80%, ${tokens.colors.void}00 100%)`,
    paddingBottom: '16px',
    marginBottom: '-8px', // Overlap with cards for seamless scroll
  },
  
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: tokens.fonts.display,
    fontSize: '18px',
    fontWeight: 700,
    color: tokens.colors.textPrimary,
  },
  
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    background: `${tokens.colors.cyan}15`,
    border: `1px solid ${tokens.colors.cyan}40`,
    borderRadius: '999px',
    fontFamily: tokens.fonts.mono,
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colors.cyan,
    boxShadow: `0 0 15px ${tokens.colors.cyanGlow}`,
  },
  
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '10px',
    marginBottom: '12px',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  
  searchContainerFocused: {
    borderColor: tokens.colors.cyan,
    boxShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
  },
  
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: tokens.fonts.body,
    fontSize: '15px',
    color: tokens.colors.textPrimary,
  },
};
```

### 2. Sort Pills (Horizontal Scroll)

Compact, touch-friendly sort options:

```tsx
/**
 * Mobile Sort Pills
 * Horizontally scrollable sort options with active state
 */

interface SortPillProps {
  field: WhaleSortField;
  label: string;
  icon: string;
  isActive: boolean;
  direction?: SortDirection;
  onClick: () => void;
}

const SORT_OPTIONS: { field: WhaleSortField; label: string; icon: string }[] = [
  { field: 'totalDeposited', label: 'Volume', icon: '💰' },
  { field: 'depositCount', label: 'Count', icon: '📊' },
  { field: 'firstSeenAt', label: 'Date', icon: '📅' },
];

function SortPill({ field, label, icon, isActive, direction, onClick }: SortPillProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        background: isActive ? `${tokens.colors.cyan}20` : tokens.colors.surface,
        border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: '20px',
        fontFamily: tokens.fonts.body,
        fontSize: '13px',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        boxShadow: isActive ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
        // Minimum touch target
        minHeight: '44px',
      }}
    >
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <span>{label}</span>
      {isActive && (
        <span style={{ 
          fontSize: '12px',
          opacity: 0.8,
          marginLeft: '-2px',
        }}>
          {direction === 'desc' ? '↓' : '↑'}
        </span>
      )}
    </button>
  );
}

function MobileSortBar({ sortBy, sortDir, onSortChange }: MobileSortBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        // Hide scrollbar
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {SORT_OPTIONS.map((option) => (
        <SortPill
          key={option.field}
          {...option}
          isActive={sortBy === option.field}
          direction={sortBy === option.field ? sortDir : undefined}
          onClick={() => onSortChange(option.field)}
        />
      ))}
    </div>
  );
}
```

### 3. Enhanced Mobile Whale Card

Cards with hover-lift effect and visual hierarchy:

```tsx
/**
 * Enhanced Mobile Whale Card
 * Touch-friendly with clear visual hierarchy
 */

const mobileCardStyles = {
  card: {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '14px',
    padding: '16px',
    cursor: 'pointer',
    transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
    // Touch feedback
    WebkitTapHighlightColor: 'transparent',
  },
  
  cardActive: {
    transform: 'scale(0.98)',
    background: tokens.colors.surfaceHover,
  },
  
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    boxShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
  },
  
  address: {
    fontFamily: tokens.fonts.mono,
    fontSize: '13px',
    fontWeight: 500,
    color: tokens.colors.cyan,
    // Glow effect
    textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
  },
  
  timestamp: {
    fontFamily: tokens.fonts.mono,
    fontSize: '11px',
    color: tokens.colors.textMuted,
    padding: '4px 8px',
    background: `${tokens.colors.void}80`,
    borderRadius: '6px',
  },
  
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  
  statLabel: {
    fontFamily: tokens.fonts.mono,
    fontSize: '10px',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  
  statValue: {
    fontFamily: tokens.fonts.mono,
    fontSize: '16px',
    fontWeight: 600,
  },
  
  statValueProfit: {
    color: tokens.colors.profit,
    textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
  },
};
```

### 4. Sticky Bottom Pagination

A sticky footer that stays visible while scrolling:

```tsx
/**
 * Mobile Sticky Pagination
 * Fixed to bottom with glass morphism effect
 */

const mobilePaginationStyles = {
  container: {
    position: 'fixed' as const,
    bottom: '70px', // Above mobile nav
    left: '16px',
    right: '16px',
    zIndex: 100,
    
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px',
    
    // Glass morphism effect
    background: `${tokens.colors.surface}e8`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '16px',
    
    boxShadow: `
      0 -10px 40px ${tokens.colors.void}80,
      0 0 30px ${tokens.colors.cyanGlow}
    `,
  },
  
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  
  navButton: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '12px',
    
    fontSize: '20px',
    color: tokens.colors.textSecondary,
    
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  
  navButtonActive: {
    background: tokens.colors.cyan,
    borderColor: tokens.colors.cyan,
    color: tokens.colors.void,
    boxShadow: `0 0 25px ${tokens.colors.cyanGlow}`,
  },
  
  navButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  
  pageInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
  },
  
  pageNumber: {
    fontFamily: tokens.fonts.mono,
    fontSize: '15px',
    fontWeight: 600,
    color: tokens.colors.textPrimary,
  },
  
  pageNumberHighlight: {
    color: tokens.colors.cyan,
    textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
  },
  
  itemCount: {
    fontFamily: tokens.fonts.mono,
    fontSize: '11px',
    color: tokens.colors.textMuted,
  },
};
```

---

## Complete Mobile Implementation

Here's the full updated mobile section for `WhaleTable.tsx`:

```tsx
// Mobile card view
if (isMobile) {
  return (
    <div
      data-testid="whale-table"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        // Add padding at bottom for sticky pagination
        paddingBottom: onPageChange && totalPages > 1 ? '140px' : '0',
      }}
    >
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
        {/* Title Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🐋</span>
            <span
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: '18px',
                fontWeight: 700,
                color: tokens.colors.textPrimary,
              }}
            >
              Whales
            </span>
          </div>
          
          {/* Whale count badge */}
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
            {actualTotal.toLocaleString()}
          </span>
        </div>

        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            marginBottom: '12px',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <span style={{ color: tokens.colors.textMuted, fontSize: '16px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by address..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
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

        {/* Sort Pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            marginBottom: '-4px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {[
            { field: 'totalDeposited' as WhaleSortField, label: 'Volume', icon: '💰' },
            { field: 'depositCount' as WhaleSortField, label: 'Count', icon: '📊' },
            { field: 'firstSeenAt' as WhaleSortField, label: 'Date', icon: '📅' },
          ].map((option) => {
            const isActive = sortBy === option.field;
            return (
              <button
                key={option.field}
                onClick={() => handleSort(option.field)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  background: isActive ? `${tokens.colors.cyan}20` : tokens.colors.surface,
                  border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
                  borderRadius: '20px',
                  fontFamily: tokens.fonts.body,
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
                  minHeight: '44px',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '14px' }}>{option.icon}</span>
                <span>{option.label}</span>
                {isActive && (
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>
                    {sortDir === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== WHALE CARDS ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedWhales.length === 0 && filter ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              background: tokens.colors.surface,
              borderRadius: '12px',
              border: `1px solid ${tokens.colors.border}`,
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🔍</div>
            <div style={{ color: tokens.colors.textSecondary }}>
              No whales found matching "{filter}"
            </div>
          </div>
        ) : (
          sortedWhales.map((whale, i) => (
            <div
              key={whale.address}
              data-testid={`whale-card-${whale.address}`}
              onClick={() => onWhaleClick(whale.address)}
              style={{
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '14px',
                padding: '16px',
                cursor: 'pointer',
                transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
                animation: `fadeInUp 0.4s ${i * 0.04}s both cubic-bezier(0.16, 1, 0.3, 1)`,
                WebkitTapHighlightColor: 'transparent',
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
                e.currentTarget.style.background = tokens.colors.surfaceHover;
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = tokens.colors.surface;
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      boxShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
                    }}
                  >
                    🐋
                  </div>
                  <div
                    style={{
                      fontFamily: tokens.fonts.mono,
                      fontSize: '13px',
                      fontWeight: 500,
                      color: tokens.colors.cyan,
                      textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
                    }}
                  >
                    {shortenAddress(whale.address)}
                  </div>
                </div>
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
                  {formatDate(whale.firstSeenAt)}
                </span>
              </div>

              {/* Stats Grid */}
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
                    Total Deposited
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
                    {formatUSD(whale.totalDeposited)}
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
                    Deposits
                  </div>
                  <div
                    style={{
                      fontFamily: tokens.fonts.mono,
                      fontSize: '17px',
                      fontWeight: 600,
                      color: tokens.colors.textPrimary,
                    }}
                  >
                    {whale.depositCount}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== STICKY PAGINATION ===== */}
      {onPageChange && totalPages > 1 && (
        <div
          style={{
            position: 'fixed',
            bottom: '78px', // Above mobile nav (60px) + spacing
            left: '16px',
            right: '16px',
            zIndex: 100,
            
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '14px 20px',
            
            // Glass morphism
            background: `${tokens.colors.surface}e8`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '16px',
            
            boxShadow: `
              0 -10px 40px ${tokens.colors.void}80,
              0 0 30px ${tokens.colors.cyanGlow}
            `,
          }}
        >
          {/* Navigation Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Previous Button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
              style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: currentPage === 1 ? tokens.colors.surface : tokens.colors.surface,
                border: `1px solid ${currentPage === 1 ? tokens.colors.border : tokens.colors.border}`,
                borderRadius: '14px',
                fontSize: '20px',
                color: currentPage === 1 ? tokens.colors.muted : tokens.colors.textSecondary,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              ‹
            </button>

            {/* Page Info */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: tokens.colors.textPrimary,
                }}
              >
                Page{' '}
                <span
                  style={{
                    color: tokens.colors.cyan,
                    textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
                  }}
                >
                  {currentPage}
                </span>
                {' '}of {totalPages}
              </div>
              <div
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '11px',
                  color: tokens.colors.textMuted,
                  marginTop: '2px',
                }}
              >
                Showing {((currentPage - 1) * itemsPerPage) + 1}-
                {Math.min(currentPage * itemsPerPage, actualTotal)} of {actualTotal.toLocaleString()}
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: currentPage === totalPages ? tokens.colors.surface : tokens.colors.cyan,
                border: `1px solid ${currentPage === totalPages ? tokens.colors.border : tokens.colors.cyan}`,
                borderRadius: '14px',
                fontSize: '20px',
                color: currentPage === totalPages ? tokens.colors.muted : tokens.colors.void,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.4 : 1,
                transition: 'all 0.15s ease',
                boxShadow: currentPage !== totalPages ? `0 0 25px ${tokens.colors.cyanGlow}` : 'none',
              }}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Key Enhancements Summary

| Feature | Before | After |
|---------|--------|-------|
| **Header** | No sticky header | Sticky with title + count badge |
| **Search** | Basic input | Enhanced with focus glow effect |
| **Sort** | Hidden | Visible pills with active state |
| **Cards** | Basic hover | Touch feedback (scale) + glows |
| **Pagination** | At bottom, scrolls away | **Fixed sticky** with glass effect |
| **Touch UX** | Desktop hover only | Native touch states |
| **Visual Polish** | Minimal | Glows, shadows, gradients |

---

## Animation Keyframe to Add

Make sure `globals.css` has this animation:

```css
@keyframes activePulse {
  0%, 100% { 
    box-shadow: 0 0 15px rgba(0, 255, 240, 0.2); 
  }
  50% { 
    box-shadow: 0 0 25px rgba(0, 255, 240, 0.4); 
  }
}
```
