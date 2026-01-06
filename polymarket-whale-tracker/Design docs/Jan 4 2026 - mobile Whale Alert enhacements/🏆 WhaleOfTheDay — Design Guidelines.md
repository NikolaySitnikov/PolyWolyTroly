🏆 WhaleOfTheDay — Design Guidelines
Current Problems
IssueCurrentProblemCharacter encodingðŸ'', âœ•, â†'Broken unicode — should be 👑, ✕, →Crown treatmentStatic emoji, no glowDoesn't feel "special" or celebratoryColor choiceAll cyanCrown should be gold to stand outMicro stateCrown + amount always visibleToo busy — should tease, not tellExpand animationBasic scale/opacityFeels generic, not premiumHover stateLabel slides inJerky, layout-shiftingExpanded cardDoesn't match card systemInconsistent with WhaleTable/AlertFeed patternsTouch feedbackNoneMissing mobile interaction polishEntry animationNoneMisses opportunity for delight

Design Philosophy
This is the trophy case of the app — it showcases excellence. It should feel:

Precious — Gold accent, not cyan (stands out from data-focused UI)
Celebratory — Subtle animation suggests achievement
Unobtrusive — Micro state is minimal, doesn't compete with main content
Rewarding — Expanding feels like opening a treasure chest
Consistent — Expanded state uses unified card patterns


Visual Specifications
Color Treatment
tsx// Special gold accent for "Whale of the Day" only
const gold = {
  base: '#ffd700',      // Pure gold
  glow: 'rgba(255, 215, 0, 0.3)',
  gradient: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)',
  dim: '#cc9900',
};
```

The crown and "of the Day" designation uses **gold**, while the data (amount, address, stats) uses our standard **cyan/profit** colors. This creates visual hierarchy: gold = status, cyan = data.

### States
```
┌─────────────────────────────────────────────────────────────────┐
│  MICRO (default)           HOVER                   EXPANDED     │
│                                                                 │
│     👑                    👑 $847K              ┌─────────────┐ │
│    (pulse)               (glow intensifies)     │ 👑 WHALE OF │ │
│                                                 │   THE DAY   │ │
│                                                 │             │ │
│                                                 │  $847.5K    │ │
│                                                 │  0x12...89  │ │
│                                                 │             │ │
│                                                 │  3 deposits │ │
│                                                 │  $425K max  │ │
│                                                 │             │ │
│                                                 │ [View Prof] │ │
│                                                 └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Complete Redesigned Component
tsx/**
 * WhaleOfTheDay Component
 *
 * Fixed-position floating trophy showcasing today's top whale.
 * Uses gold accent to stand out from cyan-focused data UI.
 *
 * States:
 * - Micro: Crown icon with subtle pulse (default)
 * - Hover: Crown + amount revealed
 * - Expanded: Full trophy card with stats
 *
 * @see Design docs/DESIGN_SYSTEM.md
 */

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { GlowText } from './GlowText';
import { useWhaleOfTheDay } from '../hooks/useWhaleOfTheDay';

export interface WhaleOfTheDayProps {
  isMobile: boolean;
  onViewProfile?: (address: string) => void;
}

// Gold accent colors (unique to this component)
const gold = {
  base: '#ffd700',
  glow: 'rgba(255, 215, 0, 0.25)',
  glowIntense: 'rgba(255, 215, 0, 0.4)',
  gradient: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)',
  dim: '#b8860b',
};

/** Format large USD amounts */
function formatUSD(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/** Truncate wallet address */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * WhaleOfTheDay - Floating trophy badge
 */
export function WhaleOfTheDay({ isMobile, onViewProfile }: WhaleOfTheDayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const { topWhale, loading } = useWhaleOfTheDay();
  const containerRef = useRef<HTMLDivElement>(null);

  // Entry animation trigger
  useEffect(() => {
    if (topWhale && !loading && !hasAnimatedIn) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => setHasAnimatedIn(true), 300);
      return () => clearTimeout(timer);
    }
  }, [topWhale, loading, hasAnimatedIn]);

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Close on escape
  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  // Don't render if no data
  if (!loading && !topWhale) return null;

  const handleToggleExpand = () => {
    if (!loading) setIsExpanded(!isExpanded);
  };

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (topWhale && onViewProfile) {
      onViewProfile(topWhale.address);
      setIsExpanded(false);
    }
  };

  // ==================
  // STYLES
  // ==================

  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: isMobile ? '90px' : '24px', // Above mobile nav + pagination
    right: isMobile ? '16px' : '24px',
    zIndex: 150, // Above sticky pagination (100)
    fontFamily: tokens.fonts.body,
    // Entry animation
    opacity: hasAnimatedIn || loading ? 1 : 0,
    transform: hasAnimatedIn || loading ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
    transition: 'opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  // Micro badge (collapsed state)
  const microBadgeStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isHovered ? '10px' : '0',
    padding: '12px',
    background: tokens.colors.surface,
    border: `1px solid ${isHovered ? gold.base : tokens.colors.border}`,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: `all 0.25s ${tokens.animation.easeOutExpo}`,
    boxShadow: isHovered
      ? `0 4px 24px ${gold.glow}, 0 0 0 1px ${gold.base}40`
      : `0 2px 12px rgba(0,0,0,0.3)`,
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
  };

  // Expanded card
  const expandedCardStyle: CSSProperties = {
    width: isMobile ? '280px' : '300px',
    background: tokens.colors.surface,
    border: `1px solid ${gold.base}`,
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: `
      0 8px 32px ${gold.glow},
      0 0 0 1px ${gold.base}40,
      inset 0 1px 0 rgba(255, 215, 0, 0.1)
    `,
    animation: 'expandIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  // Crown styles
  const crownStyle: CSSProperties = {
    fontSize: isExpanded ? '20px' : '22px',
    filter: `drop-shadow(0 0 ${isHovered || isExpanded ? '12px' : '8px'} ${gold.glow})`,
    animation: !isExpanded ? 'crownFloat 3s ease-in-out infinite' : 'none',
    transition: 'filter 0.2s ease',
  };

  // Amount in micro state (revealed on hover)
  const microAmountStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: '14px',
    fontWeight: 700,
    color: tokens.colors.textPrimary,
    whiteSpace: 'nowrap',
    maxWidth: isHovered ? '100px' : '0',
    opacity: isHovered ? 1 : 0,
    overflow: 'hidden',
    transition: 'all 0.25s ease-out',
  };

  // ==================
  // LOADING STATE
  // ==================

  if (loading) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            ...microBadgeStyle,
            opacity: 0.5,
            cursor: 'default',
          }}
          data-testid="whale-of-the-day-loading"
        >
          <span style={{ ...crownStyle, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }}>
            👑
          </span>
        </div>
      </div>
    );
  }

  if (!topWhale) return null;

  // ==================
  // EXPANDED STATE
  // ==================

  if (isExpanded) {
    return (
      <div style={containerStyle} ref={containerRef}>
        <div
          data-testid="whale-of-the-day"
          style={expandedCardStyle}
          role="dialog"
          aria-label="Whale of the Day details"
        >
          {/* Header with gold gradient */}
          <div
            style={{
              background: `linear-gradient(135deg, ${gold.base}15 0%, ${gold.dim}10 100%)`,
              borderBottom: `1px solid ${tokens.colors.border}`,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={crownStyle}>👑</span>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: gold.base,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  textShadow: `0 0 20px ${gold.glow}`,
                }}
              >
                Whale of the Day
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: tokens.colors.void,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '8px',
                color: tokens.colors.textMuted,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.textMuted;
                e.currentTarget.style.color = tokens.colors.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border;
                e.currentTarget.style.color = tokens.colors.textMuted;
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Main content */}
          <div style={{ padding: '16px' }}>
            {/* Amount - hero treatment */}
            <div style={{ marginBottom: '4px' }}>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: isMobile ? '28px' : '32px',
                  fontWeight: 700,
                  color: tokens.colors.profit,
                  textShadow: `0 0 30px ${tokens.colors.profitGlow}`,
                }}
              >
                {formatUSD(topWhale.totalToday)}
              </span>
            </div>

            {/* Address */}
            <div
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '13px',
                color: tokens.colors.cyan,
                textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
                marginBottom: '16px',
              }}
            >
              {truncateAddress(topWhale.address)}
            </div>

            {/* Stats grid - matches card system */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                paddingTop: '16px',
                borderTop: `1px solid ${tokens.colors.border}`,
                marginBottom: '16px',
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
                  Deposits Today
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '17px',
                    fontWeight: 600,
                    color: tokens.colors.textPrimary,
                  }}
                >
                  {topWhale.depositCount}
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
                  Largest
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '17px',
                    fontWeight: 600,
                    color: tokens.colors.textPrimary,
                  }}
                >
                  {formatUSD(topWhale.largestDeposit)}
                </div>
              </div>
            </div>

            {/* View Profile Button */}
            <button
              onClick={handleViewProfile}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: gold.gradient,
                border: 'none',
                borderRadius: '10px',
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                fontWeight: 600,
                color: tokens.colors.void,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: `0 4px 20px ${gold.glow}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 6px 24px ${gold.glowIntense}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 20px ${gold.glow}`;
              }}
            >
              View Profile →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================
  // MICRO STATE (default)
  // ==================

  return (
    <div style={containerStyle} ref={containerRef}>
      <div
        data-testid="whale-of-the-day"
        role="button"
        tabIndex={0}
        onClick={handleToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        // Touch feedback
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = isHovered ? 'translateY(-2px)' : 'translateY(0)';
        }}
        style={microBadgeStyle}
        aria-expanded={false}
        aria-label={`Whale of the Day: ${formatUSD(topWhale.totalToday)}. Click to expand.`}
      >
        <span style={crownStyle} aria-hidden="true">
          👑
        </span>
        <span style={microAmountStyle}>
          <GlowText color={tokens.colors.profit}>{formatUSD(topWhale.totalToday)}</GlowText>
        </span>
      </div>
    </div>
  );
}

export default WhaleOfTheDay;

Required CSS Keyframes
Add to your globals.css:
css/* WhaleOfTheDay animations */
@keyframes crownFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-2px) rotate(-3deg);
  }
  75% {
    transform: translateY(2px) rotate(3deg);
  }
}

@keyframes expandIn {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Pulse animation (if not already present) */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

## Key Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Crown color** | Cyan (same as everything) | **Gold** — stands out as special |
| **Micro state** | Crown + amount visible | **Crown only** — amount reveals on hover |
| **Crown animation** | None | **Gentle float** — feels alive |
| **Hover transition** | Jerky label slide | **Smooth reveal** — amount fades in |
| **Expand animation** | Basic CSS transition | **Spring scale** — feels premium |
| **Expanded header** | Plain | **Gold gradient banner** — trophy feel |
| **Stats layout** | Custom | **Unified card grid** — consistent |
| **Button** | Cyan gradient | **Gold gradient** — matches crown |
| **Entry animation** | None | **Scale + fade in** — dramatic arrival |
| **Touch feedback** | None | **Scale on touch** — mobile polish |
| **Close button** | Text × | **Proper button** — accessible |
| **Z-index** | 100 | **150** — above sticky pagination |
| **Bottom position** | 70px mobile | **90px** — above nav + pagination |

---

## Visual Comparison
```
BEFORE                              AFTER

┌─────────────┐                     ┌─────┐
│ 👑 $847.5K  │  (always visible)   │ 👑  │  (crown only, floating)
└─────────────┘                     └─────┘
                                        ↓ hover
                                    ┌───────────┐
                                    │ 👑 $847K  │  (amount fades in)
                                    └───────────┘

EXPANDED BEFORE                     EXPANDED AFTER

┌─────────────────┐                 ┌─────────────────────┐
│ 👑 Whale of Day │                 │░░░░░░░░░░░░░░░░░░░░░│ ← Gold gradient
│                 │                 │ 👑 WHALE OF THE DAY │
│ $847.5K         │                 ├─────────────────────┤
│ 0x12...89       │                 │                     │
│                 │                 │ $847.5K  (green)    │
│ Deposits: 3     │                 │ 0x12...89 (cyan)    │
│ Largest: $425K  │                 │                     │
│                 │                 │ DEPOSITS    LARGEST │
│ [View Profile] ─┼─ cyan           │ 3           $425K   │
└─────────────────┘                 │                     │
                                    │ [View Profile →]    │ ← Gold button
                                    └─────────────────────┘

Optional Enhancement: Sparkle Effect
For extra celebration, add occasional sparkles around the crown:
tsx// Add to the micro state crown container
<div style={{ position: 'relative' }}>
  <span style={crownStyle}>👑</span>
  {/* Sparkle particles */}
  <span
    style={{
      position: 'absolute',
      top: '-4px',
      right: '-4px',
      fontSize: '8px',
      opacity: 0.8,
      animation: 'sparkle 2s ease-in-out infinite',
    }}
  >
    ✦
  </span>
  <span
    style={{
      position: 'absolute',
      bottom: '0',
      left: '-6px',
      fontSize: '6px',
      opacity: 0.6,
      animation: 'sparkle 2s ease-in-out infinite 0.5s',
    }}
  >
    ✦
  </span>
</div>
css@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

This redesign makes the WhaleOfTheDay feel like the trophy it should be — special, celebratory, and distinct from the data-focused cyan UI while still fitting the overall aesthetic.