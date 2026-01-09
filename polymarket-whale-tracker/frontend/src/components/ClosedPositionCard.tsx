/**
 * ClosedPositionCard Component
 *
 * Card/row layout for displaying a closed/historical position.
 * Shows win/loss result, outcome, P&L, and timestamp.
 *
 * These are fully settled positions that have been redeemed.
 */

import { tokens } from '../styles/tokens';
import { CategoryTag, inferCategory, getSportEmoji, type MarketCategory } from './CategoryTag';
import type { PolymarketClosedPosition } from '../types/polymarket';

interface ClosedPositionCardProps {
  /** Closed position data */
  position: PolymarketClosedPosition;
  /** Is mobile layout */
  isMobile?: boolean;
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
 * Format P&L with + prefix for positive
 */
function formatPnl(pnl: number): string {
  if (pnl === 0) return '$0';
  const formatted = formatUSD(Math.abs(pnl));
  return pnl > 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Format timestamp as relative or date
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}w ago`;
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}mo ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
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
 * Get outcome color based on the type of outcome
 * - Yes/Over → Green (profit)
 * - No/Under → Red (loss)
 * - Team names and other outcomes → Gold (warm accent)
 */
function getOutcomeColor(outcome: string): string {
  const normalized = outcome?.toUpperCase()?.trim() || '';

  // Yes/Over outcomes → Green
  if (normalized === 'YES' || normalized === 'OVER') {
    return tokens.colors.profit;
  }

  // No/Under outcomes → Red
  if (normalized === 'NO' || normalized === 'UNDER') {
    return tokens.colors.loss;
  }

  // All other outcomes (team names, player names, etc.) → Gold accent
  return tokens.colors.gold;
}

/**
 * Determine if position was a win based on curPrice
 * curPrice = 1 means YES won, curPrice = 0 means NO won
 */
function getResult(position: PolymarketClosedPosition): 'won' | 'lost' {
  // If realizedPnl is positive, they won. If negative, they lost.
  return position.realizedPnl >= 0 ? 'won' : 'lost';
}

/**
 * ClosedPositionCard - Card/row for displaying a closed position
 */
export function ClosedPositionCard({ position, isMobile = false, onClick }: ClosedPositionCardProps) {
  // Infer category from title
  const category: MarketCategory = inferCategory(position.title);
  const pnlColor = getPnlColor(position.realizedPnl);
  const result = getResult(position);
  const sportEmoji = category === 'sports' ? getSportEmoji(undefined, position.title) : undefined;

  if (isMobile) {
    // Mobile: Card layout
    return (
      <div
        data-testid={`closed-position-${position.conditionId}`}
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
          padding: '14px 16px',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.borderColor = tokens.colors.cyan;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = tokens.colors.border;
        }}
      >
        {/* Header: Category + Result + Time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CategoryTag category={category} size="small" iconOverride={sportEmoji} />
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: result === 'won' ? tokens.colors.profit : tokens.colors.loss,
                padding: '2px 6px',
                background: result === 'won' ? `${tokens.colors.profit}15` : `${tokens.colors.loss}15`,
                borderRadius: '4px',
              }}
            >
              {result === 'won' ? 'WON' : 'LOST'}
            </span>
          </div>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
            }}
          >
            {formatTimestamp(position.timestamp)}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 10px 0',
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

        {/* Outcome + P&L row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: tokens.colors.void,
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '11px',
                color: tokens.colors.textMuted,
              }}
            >
              Bet:
            </span>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '13px',
                fontWeight: 600,
                color: getOutcomeColor(position.outcome),
              }}
            >
              {position.outcome}
            </span>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '11px',
                color: tokens.colors.textMuted,
              }}
            >
              @ {Math.round(position.avgPrice * 100)}¢
            </span>
          </div>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '14px',
              fontWeight: 600,
              color: pnlColor,
            }}
          >
            {formatPnl(position.realizedPnl)}
          </span>
        </div>
      </div>
    );
  }

  // Desktop: Row layout (table-like)
  return (
    <div
      data-testid={`closed-position-${position.conditionId}`}
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
        display: 'flex',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: `1px solid ${tokens.colors.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = tokens.colors.surfaceHover;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Result indicator */}
      <div
        style={{
          width: '48px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: result === 'won' ? tokens.colors.profit : tokens.colors.loss,
            padding: '3px 8px',
            background: result === 'won' ? `${tokens.colors.profit}15` : `${tokens.colors.loss}15`,
            borderRadius: '4px',
          }}
        >
          {result === 'won' ? 'WON' : 'LOST'}
        </span>
      </div>

      {/* Category + Title */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <CategoryTag category={category} size="small" iconOverride={sportEmoji} />
        <span
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            color: tokens.colors.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {position.title}
        </span>
      </div>

      {/* Outcome */}
      <div
        style={{
          width: '80px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            fontWeight: 600,
            color: getOutcomeColor(position.outcome),
          }}
        >
          {position.outcome}
        </span>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.textMuted,
            marginLeft: '4px',
          }}
        >
          @ {Math.round(position.avgPrice * 100)}¢
        </span>
      </div>

      {/* Invested */}
      <div
        style={{
          width: '90px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '13px',
            color: tokens.colors.textSecondary,
          }}
        >
          {formatUSD(position.totalBought)}
        </span>
      </div>

      {/* P&L */}
      <div
        style={{
          width: '90px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '13px',
            fontWeight: 600,
            color: pnlColor,
          }}
        >
          {formatPnl(position.realizedPnl)}
        </span>
      </div>

      {/* Timestamp */}
      <div
        style={{
          width: '80px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.textMuted,
          }}
        >
          {formatTimestamp(position.timestamp)}
        </span>
      </div>
    </div>
  );
}
