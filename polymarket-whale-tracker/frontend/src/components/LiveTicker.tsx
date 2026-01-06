/**
 * LiveTicker Component
 *
 * Horizontal scrolling banner showing live whale activity.
 * Shows recent deposits with wallet addresses, amounts, and timing.
 *
 * Per DESIGN_IMPLEMENTATION_ROADMAP.md Task 11:
 * "Implement live ticker banner (horizontal scrolling whale activity)"
 *
 * @see ../../../DESIGN_IMPLEMENTATION_ROADMAP.md - Group 5, Task 11
 * @see ../styles/tokens.ts - Design tokens
 */

import { useState, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { LAYOUT } from '../constants/layout';
import type { Alert } from '../types/alert';

/** Speed variants for ticker animation */
export type TickerSpeed = 'slow' | 'normal' | 'fast';

/** Speed configuration in seconds per loop (desktop) */
const SPEED_CONFIG: Record<TickerSpeed, number> = {
  slow: 40,
  normal: 25,
  fast: 15,
};

/** Speed configuration for mobile (faster due to smaller screen) */
const MOBILE_SPEED_CONFIG: Record<TickerSpeed, number> = {
  slow: 20,
  normal: 12,
  fast: 8,
};

export interface LiveTickerProps {
  /** Array of alerts to display in the ticker */
  alerts: Alert[];
  /** Whether the component is hidden */
  hidden?: boolean;
  /** Whether to show dismiss button */
  dismissable?: boolean;
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Callback when a ticker item is clicked */
  onItemClick?: (alert: Alert) => void;
  /** Whether in mobile mode */
  isMobile?: boolean;
  /** Animation speed */
  speed?: TickerSpeed;
}

/**
 * Format amount for ticker display
 * $1,000,000 → "$1M"
 * $500,000 → "$500K"
 * $50,000 → "$50K"
 */
function formatTickerAmount(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Truncate wallet address for display
 * 0x1234567890abcdef... → 0x1234...5678
 */
function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get relative time string
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Determine if amount qualifies as "whale" level
 */
function isWhaleAmount(amount: number): boolean {
  return amount >= 100000; // $100K+
}

/**
 * LiveTicker - Horizontal scrolling whale activity banner
 *
 * Displays recent whale deposits in a continuously scrolling banner.
 * Pauses on hover for readability.
 *
 * @example
 * ```tsx
 * <LiveTicker
 *   alerts={recentAlerts}
 *   onItemClick={(alert) => navigateToWallet(alert.walletAddress)}
 *   dismissable
 *   onDismiss={() => setShowTicker(false)}
 * />
 * ```
 */
export function LiveTicker({
  alerts,
  hidden = false,
  dismissable = false,
  onDismiss,
  onItemClick,
  isMobile = false,
  speed = 'normal',
}: LiveTickerProps) {
  const [isPaused, setIsPaused] = useState(false);

  // Don't render if hidden or no alerts
  if (hidden || alerts.length === 0) {
    return null;
  }

  const animationDuration = isMobile ? MOBILE_SPEED_CONFIG[speed] : SPEED_CONFIG[speed];

  // Container styles - fixed position below header
  const headerHeight = isMobile ? LAYOUT.header.mobile : LAYOUT.header.desktop;
  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: headerHeight,
    left: 0,
    right: 0,
    width: '100%',
    height: isMobile ? '36px' : '40px',
    background: `linear-gradient(90deg, ${tokens.colors.void} 0%, ${tokens.colors.surface} 50%, ${tokens.colors.void} 100%)`,
    borderBottom: `1px solid ${tokens.colors.border}`,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    zIndex: tokens.zIndex.sticky,
  };

  // Track wrapper (for edge fade effect)
  const wrapperStyle: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    maskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
  };

  // Scrolling track styles
  // On mobile, never pause (touch interactions shouldn't pause the ticker)
  const shouldPause = !isMobile && isPaused;
  const trackStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    animation: `scroll ${animationDuration}s linear infinite`,
    animationPlayState: shouldPause ? 'paused' : 'running',
  };

  // Individual item styles
  const itemStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: isMobile ? '6px' : '8px',
    padding: isMobile ? '0 16px' : '0 20px',
    cursor: onItemClick ? 'pointer' : 'default',
    transition: `opacity ${tokens.animation.durationFast} ease`,
  };

  // Separator styles
  const separatorStyle: CSSProperties = {
    display: 'inline-block',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: tokens.colors.border,
    margin: '0 8px',
  };

  // Address styles
  const addressStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: isMobile ? tokens.fontSizes.xs : tokens.fontSizes.sm,
    color: tokens.colors.textSecondary,
  };

  // Amount styles
  const amountStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: isMobile ? tokens.fontSizes.xs : tokens.fontSizes.sm,
    fontWeight: 600,
    color: tokens.colors.cyan,
  };

  // Time styles
  const timeStyle: CSSProperties = {
    fontFamily: tokens.fonts.body,
    fontSize: tokens.fontSizes.xs,
    color: tokens.colors.textMuted,
  };

  // Dismiss button styles
  const dismissStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '100%',
    background: `linear-gradient(90deg, transparent 0%, ${tokens.colors.void} 50%)`,
    border: 'none',
    cursor: 'pointer',
    color: tokens.colors.textMuted,
    fontSize: '16px',
    transition: `color ${tokens.animation.durationFast} ease`,
    paddingRight: '8px',
  };

  // Duplicate alerts for seamless loop
  const tickerItems = [...alerts, ...alerts];

  return (
    <>
      {/* Keyframe animation for scrolling */}
      <style>
        {`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-testid="ticker-track"] {
              animation: none !important;
            }
          }
        `}
      </style>
      <div
        data-testid="live-ticker"
        style={containerStyle}
        aria-live="polite"
        aria-label="Live whale activity ticker"
        // Only pause on hover for desktop - mobile touch doesn't need hover pause
        onMouseEnter={!isMobile ? () => setIsPaused(true) : undefined}
        onMouseLeave={!isMobile ? () => setIsPaused(false) : undefined}
      >
        <div style={wrapperStyle}>
          <div data-testid="ticker-track" style={trackStyle}>
            {tickerItems.map((alert, index) => (
              <span key={`${alert.id}-${index}`}>
                <span
                  data-testid={index < alerts.length ? `ticker-item-${alert.id}` : undefined}
                  style={itemStyle}
                  onClick={() => onItemClick?.(alert)}
                  role={onItemClick ? 'button' : undefined}
                  tabIndex={onItemClick && index < alerts.length ? 0 : undefined}
                >
                  {/* Whale emoji for large deposits */}
                  {isWhaleAmount(alert.amount) && (
                    <span style={{ fontSize: isMobile ? '12px' : '14px' }}>🐋</span>
                  )}
                  {/* Wallet address */}
                  <span
                    data-testid={index < alerts.length ? `ticker-address-${alert.id}` : undefined}
                    style={addressStyle}
                  >
                    {truncateAddress(alert.walletAddress)}
                  </span>
                  {/* Amount */}
                  <span
                    data-testid={index < alerts.length ? `ticker-amount-${alert.id}` : undefined}
                    style={amountStyle}
                  >
                    {formatTickerAmount(alert.amount)}
                  </span>
                  {/* Time */}
                  <span style={timeStyle}>{getRelativeTime(alert.timestamp)}</span>
                </span>
                {/* Separator dot */}
                <span style={separatorStyle} aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>

        {/* Dismiss button */}
        {dismissable && (
          <button
            data-testid="ticker-dismiss"
            style={dismissStyle}
            onClick={onDismiss}
            aria-label="Dismiss ticker"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = tokens.colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = tokens.colors.textMuted;
            }}
          >
            ✕
          </button>
        )}
      </div>
    </>
  );
}

export default LiveTicker;
