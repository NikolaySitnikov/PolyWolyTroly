/**
 * LiveBadge Component
 *
 * Displays a pulsing green indicator for whales active in last 24h.
 * Per TRADING_FEATURES_DESIGN_GUIDE.md Section 3.
 *
 * Sizes:
 * - sm: 6px dot, no label (for table rows, cards)
 * - md: 8px dot, no label (for dashboard stats)
 * - lg: 10px dot with "LIVE" label (for profile header)
 */

import type { CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { Tooltip } from './Tooltip';
import { getLiveTooltip } from '../utils/liveStatus';

export interface LiveBadgeProps {
  /** Whether the whale is currently live (active in last 24h) */
  isLive: boolean;
  /** Last activity timestamp (for tooltip) */
  lastActivityAt?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show "LIVE" text label (defaults to true for lg size) */
  showLabel?: boolean;
}

const SIZE_CONFIG = {
  sm: { dot: 6, fontSize: 0, gap: 0, padding: '2px' },
  md: { dot: 8, fontSize: 0, gap: 0, padding: '3px' },
  lg: { dot: 10, fontSize: 10, gap: 4, padding: '4px 8px' },
} as const;

export function LiveBadge({
  isLive,
  lastActivityAt,
  size = 'md',
  showLabel,
}: LiveBadgeProps) {
  // Don't render if not live
  if (!isLive) return null;

  const config = SIZE_CONFIG[size];
  const shouldShowLabel = showLabel ?? size === 'lg';
  const tooltipContent = getLiveTooltip(lastActivityAt);

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: config.gap,
    padding: shouldShowLabel ? config.padding : undefined,
    background: shouldShowLabel ? `${tokens.colors.live}15` : 'transparent',
    border: shouldShowLabel ? `1px solid ${tokens.colors.live}40` : 'none',
    borderRadius: '999px',
  };

  const dotStyle: CSSProperties = {
    width: config.dot,
    height: config.dot,
    borderRadius: '50%',
    background: tokens.colors.live,
    boxShadow: `0 0 ${config.dot}px ${tokens.colors.liveGlow}`,
    animation: 'livePulse 2s ease-in-out infinite',
    flexShrink: 0,
  };

  const labelStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: config.fontSize,
    fontWeight: 600,
    color: tokens.colors.live,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    lineHeight: 1,
  };

  const badge = (
    <div style={containerStyle} aria-label={tooltipContent}>
      <div style={dotStyle} />
      {shouldShowLabel && <span style={labelStyle}>LIVE</span>}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} placement="bottom">
      {badge}
    </Tooltip>
  );
}
