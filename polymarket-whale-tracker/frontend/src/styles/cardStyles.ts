/**
 * Unified Mobile Card Styles
 *
 * Shared card patterns for consistent mobile UI across:
 * - WhaleTable (whale cards)
 * - AlertFeed (alert cards)
 * - WalletProfile (transaction cards)
 *
 * Core Principles:
 * 1. One card pattern - All cards share the same structural bones
 * 2. Contextual content - What changes is the data, not the chrome
 * 3. Consistent interactions - Same hover, touch, animation everywhere
 * 4. Unified time format - Human-friendly relative dates
 * 5. No redundant indicators - If it's clickable, it's clickable. No arrows.
 *
 * @see ../../Design docs/Jan 4 2026 - mobile Whale Alert enhacements/whales alerts unified card enhancemenent
 */

import { tokens } from './tokens';

/**
 * Unified time formatting for all cards
 * Consistent across WhaleTable, AlertFeed, WalletProfile
 *
 * Format priority:
 * - Under 1 minute: "Just now"
 * - Under 1 hour: "Xm ago" (minutes)
 * - Same day: "Xh ago" (hours)
 * - Yesterday: "Yesterday"
 * - This week: "Xd ago" (days)
 * - Older: "Mon DD" format
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

  // Under 24 hours - show hours
  if (diffDay === 0) return `${diffHour}h ago`;

  // Yesterday
  if (diffDay === 1) return 'Yesterday';

  // Under 7 days - show days
  if (diffDay < 7) return `${diffDay}d ago`;

  // Older - show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Unified card container styles
 * Base styles for all mobile cards
 */
export const mobileCardStyles = {
  /**
   * Base container style for mobile cards
   * - 14px border radius
   * - 16px padding
   * - Surface background with border
   * - Smooth transitions
   */
  container: {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '14px',
    padding: '16px',
    cursor: 'pointer',
    transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
    WebkitTapHighlightColor: 'transparent',
  } as React.CSSProperties,

  /**
   * Hover state styles (for devices with hover capability)
   * - Subtle lift (translateY -2px)
   * - Cyan border glow
   * - Box shadow effect
   */
  containerHover: {
    transform: 'translateY(-2px)',
    borderColor: tokens.colors.cyan,
    boxShadow: `0 0 30px ${tokens.colors.cyanGlow}, inset 0 1px 0 ${tokens.colors.cyan}`,
  } as React.CSSProperties,

  /**
   * Touch/active state styles
   * - Scale down slightly (0.98)
   * - Darker background
   */
  containerTouch: {
    transform: 'scale(0.98)',
    background: tokens.colors.surfaceHover,
  } as React.CSSProperties,

  /**
   * Reset state (return to normal)
   */
  containerReset: {
    transform: 'scale(1) translateY(0)',
    borderColor: tokens.colors.border,
    boxShadow: 'none',
    background: tokens.colors.surface,
  } as React.CSSProperties,

  /**
   * Icon container styles (left side of card header)
   * @param glowColor - The glow color for the icon (e.g., cyanGlow, profitGlow)
   */
  iconContainer: (glowColor: string): React.CSSProperties => ({
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

  /**
   * Address text styling
   * - Mono font, 13px
   * - Cyan color with text shadow
   */
  address: {
    fontFamily: tokens.fonts.mono,
    fontSize: '13px',
    fontWeight: 500,
    color: tokens.colors.cyan,
    textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
  } as React.CSSProperties,

  /**
   * Time pill styling
   * - Positioned in top-right of card header
   * - Dark background with rounded corners
   */
  timePill: {
    fontFamily: tokens.fonts.mono,
    fontSize: '11px',
    color: tokens.colors.textMuted,
    padding: '4px 8px',
    background: `${tokens.colors.void}80`,
    borderRadius: '6px',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  /**
   * Stat label styling (small uppercase text)
   */
  statLabel: {
    fontFamily: tokens.fonts.mono,
    fontSize: '10px',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '4px',
  } as React.CSSProperties,

  /**
   * Primary stat value (green/profit color with glow)
   */
  statValuePrimary: {
    fontFamily: tokens.fonts.mono,
    fontSize: '17px',
    fontWeight: 600,
    color: tokens.colors.profit,
    textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
  } as React.CSSProperties,

  /**
   * Secondary stat value (white, no glow)
   */
  statValueSecondary: {
    fontFamily: tokens.fonts.mono,
    fontSize: '17px',
    fontWeight: 600,
    color: tokens.colors.textPrimary,
  } as React.CSSProperties,
};

/**
 * Get unified card interaction handlers
 * Provides consistent touch and hover behavior across all cards
 *
 * @param onClick - Optional click handler
 * @returns Object with event handlers for touch, hover, and animation
 */
export function getCardInteractionHandlers(onClick?: () => void) {
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
      // Only apply hover styles on devices with true hover capability
      if (window.matchMedia('(hover: hover)').matches && onClick) {
        Object.assign(e.currentTarget.style, mobileCardStyles.containerHover);
      }
    },

    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      Object.assign(e.currentTarget.style, mobileCardStyles.containerReset);
    },

    onAnimationEnd: (e: React.AnimationEvent<HTMLDivElement>) => {
      // Clear animation after it plays to prevent re-triggering
      e.currentTarget.style.animation = 'none';
    },
  };
}
