/**
 * TrendingMarkets Component
 *
 * Displays trending prediction markets from Polymarket.
 * Shows market question, current probability, 24h volume, and links to Polymarket.
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { tokens } from '../styles/tokens';
import { EmptyState } from './EmptyState';
import type { TrendingMarketResponse } from '../services/api';

interface TrendingMarketsProps {
  /** Array of trending markets to display */
  markets: TrendingMarketResponse[];
  /** Whether data is loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether to use mobile layout */
  isMobile: boolean;
  /** Callback when retry is clicked on error state */
  onRetry?: () => void;
}

/**
 * Format a number as USD with K/M suffix
 */
function formatVolume(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Format probability as percentage
 */
function formatProbability(price: number): string {
  return `${Math.round(price * 100)}%`;
}

/**
 * Get Polymarket URL for a market using event slug
 */
function getMarketUrl(eventSlug: string): string {
  return `https://polymarket.com/event/${eventSlug}`;
}

/**
 * Single market card component
 */
function MarketCard({
  market,
  index,
}: {
  market: TrendingMarketResponse;
  index: number;
}) {
  const yesPercent = Math.round(market.yesPrice * 100);

  return (
    <a
      href={getMarketUrl(market.eventSlug)}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="market-card"
      style={{
        display: 'block',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: '16px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        animation: `fadeInUp 0.4s ${index * 0.05}s both cubic-bezier(0.16, 1, 0.3, 1)`,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.cyan;
        e.currentTarget.style.boxShadow = tokens.shadows.cardHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Market question */}
      <div
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: '14px',
          fontWeight: 500,
          color: tokens.colors.textPrimary,
          marginBottom: '12px',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '40px',
        }}
      >
        {market.question}
      </div>

      {/* Probability bar */}
      <div
        style={{
          position: 'relative',
          height: '8px',
          background: tokens.colors.loss + '40',
          borderRadius: '4px',
          marginBottom: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${yesPercent}%`,
            background: `linear-gradient(90deg, ${tokens.colors.profit}, ${tokens.colors.cyan})`,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Yes probability */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '18px',
              fontWeight: 700,
              color: tokens.colors.profit,
            }}
          >
            {formatProbability(market.yesPrice)}
          </span>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
            }}
          >
            Yes
          </span>
        </div>

        {/* 24h volume */}
        <div
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            color: tokens.colors.textSecondary,
          }}
        >
          {formatVolume(market.volume24hr)} 24h
        </div>
      </div>
    </a>
  );
}

/**
 * Loading skeleton for market cards
 */
function LoadingSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '16px',
            animation: 'pulse 2s infinite',
          }}
        >
          {/* Title skeleton */}
          <div
            style={{
              height: '16px',
              background: tokens.colors.border,
              borderRadius: '4px',
              marginBottom: '8px',
              width: '80%',
            }}
          />
          <div
            style={{
              height: '16px',
              background: tokens.colors.border,
              borderRadius: '4px',
              marginBottom: '12px',
              width: '60%',
            }}
          />
          {/* Bar skeleton */}
          <div
            style={{
              height: '8px',
              background: tokens.colors.border,
              borderRadius: '4px',
              marginBottom: '12px',
            }}
          />
          {/* Stats skeleton */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                height: '18px',
                width: '60px',
                background: tokens.colors.border,
                borderRadius: '4px',
              }}
            />
            <div
              style={{
                height: '14px',
                width: '80px',
                background: tokens.colors.border,
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Error state component
 */
function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '48px 20px',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📊</div>
      <div
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: '14px',
          color: tokens.colors.textMuted,
          marginBottom: '16px',
        }}
      >
        Failed to load trending markets: {error}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            fontWeight: 500,
            color: tokens.colors.cyan,
            background: 'transparent',
            border: `1px solid ${tokens.colors.cyan}`,
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = tokens.colors.cyanGlow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Empty state wrapper with grid spanning
 */
function MarketsEmptyState() {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radius.lg,
      }}
    >
      <EmptyState
        icon="📈"
        message="No trending markets available"
      />
    </div>
  );
}

export function TrendingMarkets({
  markets,
  loading,
  error,
  isMobile,
  onRetry,
}: TrendingMarketsProps) {
  return (
    <div data-testid="trending-markets">
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>🔥</span>
          <span
            style={{
              fontFamily: tokens.fonts.body,
              fontWeight: 600,
              fontSize: '16px',
              color: tokens.colors.textPrimary,
            }}
          >
            Trending Markets
          </span>
        </div>
        <a
          href="https://polymarket.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            color: tokens.colors.textMuted,
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.cyan;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.textMuted;
          }}
        >
          View all →
        </a>
      </div>

      {/* Market cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        {loading ? (
          <LoadingSkeleton count={isMobile ? 2 : 4} />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : markets.length === 0 ? (
          <MarketsEmptyState />
        ) : (
          markets.map((market, index) => (
            <MarketCard key={market.id} market={market} index={index} />
          ))
        )}
      </div>
    </div>
  );
}
