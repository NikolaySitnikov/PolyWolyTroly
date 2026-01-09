/**
 * PositionCard Component
 *
 * Mobile card layout for displaying a trading position.
 * Shows category, market question, outcome, size, prices, and P&L.
 *
 * @see Design docs/TRADING_FEATURES_DESIGN_GUIDE.md - Section 7
 */

import { tokens } from '../styles/tokens';
import { CategoryTag, inferCategory, getSportEmoji, type MarketCategory } from './CategoryTag';
import type { Position } from '../types/position';

interface PositionCardProps {
  /** Position data */
  position: Position;
  /** Click handler for navigation to market */
  onClick?: () => void;
}

/**
 * Format a number as USD with K/M suffix
 */
function formatUSD(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Format price as cents (0-1 -> 0-100)
 */
function formatPrice(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

/**
 * Format P&L with + prefix for positive
 */
function formatPnl(pnl: number): string {
  if (pnl === 0) return '$0';
  const formatted = formatUSD(Math.abs(pnl));
  return pnl > 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Get P&L color based on value
 */
function getPnlColor(pnl: number): string {
  if (pnl > 0) return tokens.colors.profit;
  if (pnl < 0) return tokens.colors.loss;
  return tokens.colors.neutral;
}

/**
 * Status dot component - matches desktop StatusDot
 * Just a colored dot with glow, no text label
 */
function StatusDot({ status }: { status: 'active' | 'redeemable' }) {
  const config = {
    active: { color: tokens.colors.live },
    redeemable: { color: tokens.colors.purple },
  };

  const { color } = config[status];

  return (
    <span
      style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  );
}


/**
 * Metric box component for position stats
 */
function MetricBox({
  label,
  value,
  subValue,
  valueColor,
}: {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '8px 10px',
        background: tokens.colors.void,
        borderRadius: '6px',
      }}
    >
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '9px',
          fontWeight: 500,
          color: tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '14px',
          fontWeight: 600,
          color: valueColor || tokens.colors.textPrimary,
        }}
      >
        {value}
      </span>
      {subValue && (
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: valueColor || tokens.colors.textSecondary,
          }}
        >
          {subValue}
        </span>
      )}
    </div>
  );
}

/**
 * PositionCard - Mobile card for displaying a trading position
 */
export function PositionCard({ position, onClick }: PositionCardProps) {
  // Infer category from title if not provided
  const category: MarketCategory = position.normalizedCategory || inferCategory(position.title);
  const pnlColor = getPnlColor(position.pnl);
  // Get sport-specific emoji for sports markets using seriesSlug from Gamma API
  const sportEmoji = category === 'sports' ? getSportEmoji(position.seriesSlug, position.title) : undefined;

  return (
    <div
      data-testid={`position-card-${position.conditionId}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = tokens.colors.cyan;
          e.currentTarget.style.boxShadow = `0 0 20px ${tokens.colors.cyanGlow}`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header: Category + Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <CategoryTag category={category} size="small" iconOverride={sportEmoji} />
        <StatusDot status={position.status} />
      </div>

      {/* Market Question */}
      <h3
        style={{
          margin: '0 0 12px 0',
          fontFamily: tokens.fonts.body,
          fontSize: '14px',
          fontWeight: 500,
          color: tokens.colors.textPrimary,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {position.title}
      </h3>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '12px',
        }}
      >
        <MetricBox
          label="Position"
          value={position.normalizedOutcome}
          subValue={formatUSD(position.currentValue)}
          valueColor={position.normalizedOutcome === 'YES' ? tokens.colors.profit : tokens.colors.loss}
        />
        <MetricBox
          label="Avg Price"
          value={formatPrice(position.avgPrice)}
        />
        <MetricBox
          label="Current"
          value={formatPrice(position.currentPrice)}
          subValue={formatPnl(position.pnl)}
          valueColor={pnlColor}
        />
      </div>

      {/* Link to Polymarket */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <a
          href={`https://polymarket.com/event/${position.eventSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.textMuted,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.cyan;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.textMuted;
          }}
        >
          View on Polymarket ↗
        </a>
      </div>
    </div>
  );
}
