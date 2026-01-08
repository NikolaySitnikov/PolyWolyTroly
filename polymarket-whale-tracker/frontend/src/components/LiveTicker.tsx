/**
 * LiveTicker Component
 *
 * Continuous horizontal scrolling marquee showing live whale activity.
 * Animation speed is based on actual content width for consistent scroll speed.
 *
 * @see ../../../DESIGN_IMPLEMENTATION_ROADMAP.md - Group 5, Task 11
 */

import { useRef, useEffect, useState, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { LAYOUT } from '../constants/layout';
import type { Alert } from '../types/alert';

/** Speed variants for ticker animation */
export type TickerSpeed = 'slow' | 'normal' | 'fast';

/** Pixels per second for each speed level */
const SPEED_PX_PER_SEC: Record<TickerSpeed, number> = {
  slow: 40,
  normal: 70,
  fast: 120,
};

/** Mobile speed multiplier */
const MOBILE_SPEED_MULTIPLIER = 1.3;

export interface LiveTickerProps {
  alerts: Alert[];
  hidden?: boolean;
  dismissable?: boolean;
  onDismiss?: () => void;
  onItemClick?: (alert: Alert) => void;
  isMobile?: boolean;
  speed?: TickerSpeed;
}

/** Format amount for ticker display */
function formatTickerAmount(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/** Truncate wallet address for display */
function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Get relative time string */
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

/** Determine if amount qualifies as "whale" level ($100K+) */
function isWhaleAmount(amount: number): boolean {
  return amount >= 100000;
}

/**
 * LiveTicker - Continuous scrolling whale activity banner
 *
 * Uses measured content width to calculate animation duration,
 * ensuring consistent scroll speed regardless of content length.
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
  const [contentWidth, setContentWidth] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Measure content width when alerts change
  useEffect(() => {
    if (contentRef.current) {
      // Measure just the first set of items (half of total since we duplicate)
      const width = contentRef.current.scrollWidth / 2;
      setContentWidth(width);
    }
  }, [alerts]);

  // Don't render if hidden or no alerts
  if (hidden || alerts.length === 0) {
    return null;
  }

  // Calculate duration based on content width and desired speed
  const pxPerSec = isMobile
    ? SPEED_PX_PER_SEC[speed] * MOBILE_SPEED_MULTIPLIER
    : SPEED_PX_PER_SEC[speed];

  // Duration = width / speed, with minimum of 5 seconds
  const duration = contentWidth > 0 ? Math.max(5, contentWidth / pxPerSec) : 20;

  // Styles
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

  const wrapperStyle: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    maskImage: 'linear-gradient(90deg, transparent 0%, black 3%, black 97%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 3%, black 97%, transparent 100%)',
  };

  const shouldPause = !isMobile && isPaused;

  const trackStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    willChange: 'transform',
    // Only apply animation once we've measured the width
    animation: contentWidth > 0
      ? `ticker-scroll ${duration}s linear infinite`
      : 'none',
    animationPlayState: shouldPause ? 'paused' : 'running',
  };

  const itemStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: isMobile ? '6px' : '8px',
    padding: isMobile ? '0 12px' : '0 16px',
    cursor: onItemClick ? 'pointer' : 'default',
    flexShrink: 0,
  };

  const separatorStyle: CSSProperties = {
    display: 'inline-block',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: tokens.colors.border,
    margin: isMobile ? '0 6px' : '0 8px',
    flexShrink: 0,
  };

  const addressStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: isMobile ? tokens.fontSizes.xs : tokens.fontSizes.sm,
    color: tokens.colors.textSecondary,
  };

  const amountStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: isMobile ? tokens.fontSizes.xs : tokens.fontSizes.sm,
    fontWeight: 600,
    color: tokens.colors.cyan,
  };

  const timeStyle: CSSProperties = {
    fontFamily: tokens.fonts.body,
    fontSize: tokens.fontSizes.xs,
    color: tokens.colors.textMuted,
  };

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
    flexShrink: 0,
  };

  // Render a single ticker item
  const renderItem = (alert: Alert, index: number, isOriginal: boolean) => (
    <span
      key={`${alert.id}-${isOriginal ? 'a' : 'b'}-${index}`}
      style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
    >
      <span
        data-testid={isOriginal ? `ticker-item-${alert.id}` : undefined}
        style={itemStyle}
        onClick={() => onItemClick?.(alert)}
        role={onItemClick ? 'button' : undefined}
        tabIndex={onItemClick && isOriginal ? 0 : undefined}
      >
        {isWhaleAmount(alert.amount) && (
          <span style={{ fontSize: isMobile ? '12px' : '14px' }}>🐋</span>
        )}
        <span
          data-testid={isOriginal ? `ticker-address-${alert.id}` : undefined}
          style={addressStyle}
        >
          {truncateAddress(alert.walletAddress)}
        </span>
        <span
          data-testid={isOriginal ? `ticker-amount-${alert.id}` : undefined}
          style={amountStyle}
        >
          {formatTickerAmount(alert.amount)}
        </span>
        <span style={timeStyle}>{getRelativeTime(alert.timestamp)}</span>
      </span>
      <span style={separatorStyle} aria-hidden="true" />
    </span>
  );

  return (
    <>
      <style>
        {`
          @keyframes ticker-scroll {
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
        onMouseEnter={!isMobile ? () => setIsPaused(true) : undefined}
        onMouseLeave={!isMobile ? () => setIsPaused(false) : undefined}
      >
        <div style={wrapperStyle}>
          <div ref={contentRef} data-testid="ticker-track" style={trackStyle}>
            {/* First set of items */}
            {alerts.map((alert, i) => renderItem(alert, i, true))}
            {/* Duplicate set for seamless loop */}
            {alerts.map((alert, i) => renderItem(alert, i, false))}
          </div>
        </div>

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
