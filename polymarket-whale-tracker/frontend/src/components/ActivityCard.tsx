/**
 * ActivityCard Component
 *
 * Mobile card layout for displaying an activity/transaction item.
 * Shows activity type icon, market question (if applicable), amount, price, and timestamp.
 *
 * @see Design docs/TRADING_FEATURES_DESIGN_GUIDE.md - Section 8
 */

import { tokens } from '../styles/tokens';
import { type Activity, type ActivityTypeConfig } from '../types/activity';

interface ActivityCardProps {
  /** Activity data */
  activity: Activity;
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
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return diffSec <= 1 ? 'just now' : `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  if (diffDay < 30) {
    return `${diffDay}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format transaction hash for display (truncate)
 */
function formatTxHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

/**
 * Activity type icon component
 */
function ActivityIcon({ config }: { config: ActivityTypeConfig }) {
  return (
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        background: config.bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        flexShrink: 0,
      }}
    >
      {config.icon}
    </div>
  );
}

/**
 * Metric box component for activity stats
 */
function MetricBox({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
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
    </div>
  );
}

/**
 * Skeleton loader for ActivityCard - used during loading state
 */
export function ActivityCardSkeleton() {
  const shimmerStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, ${tokens.colors.void} 25%, ${tokens.colors.surface} 50%, ${tokens.colors.void} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  };

  return (
    <div
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            ...shimmerStyle,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: '60px',
              height: '14px',
              borderRadius: '4px',
              marginBottom: '4px',
              ...shimmerStyle,
            }}
          />
          <div
            style={{
              width: '40px',
              height: '11px',
              borderRadius: '3px',
              ...shimmerStyle,
            }}
          />
        </div>
      </div>

      {/* Title skeleton */}
      <div
        style={{
          width: '80%',
          height: '14px',
          borderRadius: '4px',
          marginBottom: '12px',
          ...shimmerStyle,
        }}
      />

      {/* Metrics skeleton */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: tokens.colors.void,
              borderRadius: '6px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '9px',
                borderRadius: '2px',
                marginBottom: '6px',
                ...shimmerStyle,
              }}
            />
            <div
              style={{
                width: '50px',
                height: '14px',
                borderRadius: '3px',
                ...shimmerStyle,
              }}
            />
          </div>
        ))}
      </div>

      <style>
        {`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
    </div>
  );
}

/**
 * ActivityCard - Mobile card for displaying an activity/transaction
 */
export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const hasMarket = Boolean(activity.title);
  const isTradeActivity = activity.normalizedType === 'buy' || activity.normalizedType === 'sell';

  // Calculate display values
  const amount = activity.usdcSize ?? 0;
  const price = activity.price ?? 0;
  const shares = activity.size ?? 0;

  return (
    <div
      data-testid={`activity-card-${activity.timestamp}`}
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
      {/* Header: Icon + Type Label + Time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: hasMarket ? '12px' : '0',
        }}
      >
        <ActivityIcon config={activity.config} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '13px',
              fontWeight: 600,
              color: activity.config.color,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {activity.config.label}
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
            }}
          >
            {formatRelativeTime(activity.timestamp)}
          </div>
        </div>
        {/* Value for non-trade activities on the right */}
        {!isTradeActivity && amount > 0 && (
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '16px',
              fontWeight: 600,
              color: activity.config.color,
            }}
          >
            {activity.normalizedType === 'deposit' ? '+' : activity.normalizedType === 'withdrawal' ? '-' : ''}
            {formatUSD(amount)}
          </div>
        )}
      </div>

      {/* Market Question (if applicable) */}
      {hasMarket && (
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
          {activity.title}
        </h3>
      )}

      {/* Metrics Grid for trades */}
      {isTradeActivity && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: hasMarket ? '0' : '12px',
          }}
        >
          <MetricBox
            label="Amount"
            value={shares > 0 ? `${shares.toLocaleString()} ${activity.outcome?.toUpperCase() || 'shares'}` : formatUSD(amount)}
            valueColor={activity.config.color}
          />
          {price > 0 && (
            <MetricBox
              label="Price"
              value={formatPrice(price)}
            />
          )}
          {amount > 0 && shares > 0 && (
            <MetricBox
              label="Value"
              value={formatUSD(amount)}
            />
          )}
        </div>
      )}

      {/* Transaction Link */}
      {activity.transactionHash && (
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
            href={`https://polygonscan.com/tx/${activity.transactionHash}`}
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
            {formatTxHash(activity.transactionHash)} ↗
          </a>
        </div>
      )}
    </div>
  );
}
