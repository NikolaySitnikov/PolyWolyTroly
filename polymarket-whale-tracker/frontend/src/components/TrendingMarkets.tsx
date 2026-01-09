/**
 * TrendingMarkets Component
 *
 * Displays trending prediction markets from Polymarket.
 * Shows market question, current probability, 24h volume, sparkline chart,
 * and links to Polymarket.
 *
 * GROUP 2: Data Visualization & Charts
 * - Sparklines show 1-week price history for each market
 * - Color indicates trend direction (cyan=up, red=down)
 *
 * Enhanced mobile view with:
 * - Horizontal scrolling cards
 * - Larger touch targets
 * - Scroll position indicators
 * - Category tags
 *
 * @see ../Design docs/DESIGN_SYSTEM.md - Chart specifications
 */

import { useRef, useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { EmptyState } from './EmptyState';
import { Sparkline } from './Sparkline';
import { CategoryTag, inferCategory, mapApiCategory, getSportEmoji } from './CategoryTag';
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
 * Calculate price change percentage from price history data
 * Returns null if insufficient data
 */
function calculatePriceChange(priceHistory: { t: number; p: number }[] | undefined): number | null {
  if (!priceHistory || priceHistory.length < 2) return null;
  const firstPrice = priceHistory[0].p;
  const lastPrice = priceHistory[priceHistory.length - 1].p;
  if (firstPrice === 0) return null;
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

/** Threshold for considering a change as "neutral" (no arrow) */
const NEUTRAL_THRESHOLD = 0.5; // ±0.5%

/**
 * Format price change with arrow indicator
 * Returns neutral style (no arrow, gray) for changes within threshold
 */
function formatPriceChange(change: number): { text: string; isPositive: boolean; isNeutral: boolean } {
  const absChange = Math.abs(change);
  const isNeutral = absChange < NEUTRAL_THRESHOLD;
  const formatted = absChange >= 10 ? absChange.toFixed(0) : absChange.toFixed(1);

  if (isNeutral) {
    return {
      text: `${formatted}%`,
      isPositive: false,
      isNeutral: true,
    };
  }

  const arrow = change > 0 ? '↑' : '↓';
  return {
    text: `${arrow}${formatted}%`,
    isPositive: change > 0,
    isNeutral: false,
  };
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
  const priceChange = calculatePriceChange(market.priceHistory);
  const changeDisplay = priceChange !== null ? formatPriceChange(priceChange) : null;

  // Determine category: if sportsMarketType is present, it's a sports market
  // Otherwise, try to map from API category or infer from question
  const isSportsMarket = !!market.sportsMarketType;
  const category = isSportsMarket
    ? 'sports'
    : (mapApiCategory(market.category) || inferCategory(market.question));

  // Get sport-specific emoji if it's a sports market (either via API or inference)
  const sportEmoji = (isSportsMarket || category === 'sports')
    ? getSportEmoji(market.seriesSlug, market.question)
    : undefined;

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
      onAnimationEnd={(e) => {
        // Clear animation so hover transform can work
        e.currentTarget.style.animation = 'none';
      }}
      onMouseEnter={(e) => {
        if (window.matchMedia('(hover: hover)').matches) {
          e.currentTarget.style.borderColor = tokens.colors.cyan;
          e.currentTarget.style.boxShadow = tokens.shadows.cardHover;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Category tag - positioned in top-left corner */}
      <div style={{ marginTop: '-12px', marginLeft: '-12px', marginBottom: '12px' }}>
        <CategoryTag category={category} size="small" iconOverride={sportEmoji} />
      </div>

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

      {/* Stats row with sparkline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
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

        {/* Sparkline with price change indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkline
            data={market.priceHistory || []}
            loading={market.priceHistoryLoading}
            width={70}
            height={24}
          />
          {changeDisplay && (
            <span
              data-testid="price-change"
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '11px',
                fontWeight: 500,
                color: changeDisplay.isNeutral
                  ? tokens.colors.purple
                  : changeDisplay.isPositive
                    ? tokens.colors.profit
                    : tokens.colors.loss,
                whiteSpace: 'nowrap',
              }}
            >
              {changeDisplay.text}
            </span>
          )}
        </div>

        {/* 24h volume */}
        <div
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            color: tokens.colors.textSecondary,
            whiteSpace: 'nowrap',
          }}
        >
          {formatVolume(market.volume24hr)} 24h
        </div>
      </div>
    </a>
  );
}

/**
 * Mobile market card component with enhanced touch feedback
 */
function MobileMarketCard({
  market,
  index,
}: {
  market: TrendingMarketResponse;
  index: number;
}) {
  const yesPercent = Math.round(market.yesPrice * 100);
  const priceChange = calculatePriceChange(market.priceHistory);
  const changeDisplay = priceChange !== null ? formatPriceChange(priceChange) : null;

  // Determine category
  const isSportsMarket = !!market.sportsMarketType;
  const category = isSportsMarket
    ? 'sports'
    : (mapApiCategory(market.category) || inferCategory(market.question));
  // Get sport-specific emoji if it's a sports market (either via API or inference)
  const sportEmoji = (isSportsMarket || category === 'sports')
    ? getSportEmoji(market.seriesSlug, market.question)
    : undefined;

  return (
    <a
      href={getMarketUrl(market.eventSlug)}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="market-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        width: '280px',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '16px',
        padding: '16px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        animation: `fadeInUp 0.4s ${index * 0.1}s both cubic-bezier(0.16, 1, 0.3, 1)`,
        WebkitTapHighlightColor: 'transparent',
      }}
      onAnimationEnd={(e) => {
        e.currentTarget.style.animation = 'none';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
        e.currentTarget.style.background = tokens.colors.surfaceHover;
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = tokens.colors.surface;
      }}
      onTouchCancel={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = tokens.colors.surface;
      }}
    >
      {/* Category Tag */}
      <div style={{ marginBottom: '12px' }}>
        <CategoryTag category={category} size="default" iconOverride={sportEmoji} />
      </div>

      {/* Market Question */}
      <div
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: '15px',
          fontWeight: 600,
          color: tokens.colors.textPrimary,
          marginBottom: '16px',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '63px', // 3 lines
        }}
      >
        {market.question}
      </div>

      {/* Probability Bar */}
      <div style={{ marginBottom: '14px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
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
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
            }}
          >
            No
          </span>
        </div>
        <div
          style={{
            position: 'relative',
            height: '10px',
            background: `${tokens.colors.loss}30`,
            borderRadius: '5px',
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
              borderRadius: '5px',
              transition: 'width 0.3s ease',
              boxShadow: `0 0 10px ${tokens.colors.profitGlow}`,
            }}
          />
        </div>
      </div>

      {/* Stats Row - 3 column layout: % YES | Sparkline | Volume */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: `1px solid ${tokens.colors.border}`,
        }}
      >
        {/* Left: Yes Probability */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '24px',
              fontWeight: 700,
              color: tokens.colors.profit,
              textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
            }}
          >
            {yesPercent}%
          </span>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
            }}
          >
            Yes
          </span>
        </div>

        {/* Center: Sparkline + Price Change */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <Sparkline
            data={market.priceHistory || []}
            loading={market.priceHistoryLoading}
            width={60}
            height={22}
          />
          {changeDisplay && (
            <span
              data-testid="price-change"
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '10px',
                fontWeight: 500,
                color: changeDisplay.isNeutral
                  ? tokens.colors.purple
                  : changeDisplay.isPositive
                    ? tokens.colors.profit
                    : tokens.colors.loss,
                whiteSpace: 'nowrap',
              }}
            >
              {changeDisplay.text}
            </span>
          )}
        </div>

        {/* Right: 24h Volume */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '14px',
              fontWeight: 600,
              color: tokens.colors.textPrimary,
            }}
          >
            {formatVolume(market.volume24hr)}
          </span>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
            }}
          >
            24h volume
          </span>
        </div>
      </div>
    </a>
  );
}

/**
 * Scroll indicator dots for horizontal scroll
 * Uses a sliding window approach - active dot is always visible in center area,
 * with "+N" counters on left/right showing hidden items
 */
function ScrollIndicator({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  const maxDots = 5;

  // If total items fit within maxDots, just show all dots
  if (total <= maxDots) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          marginTop: '12px',
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: current === i ? '16px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: current === i ? tokens.colors.cyan : tokens.colors.border,
              transition: 'all 0.2s ease',
              boxShadow: current === i ? `0 0 10px ${tokens.colors.cyanGlow}` : 'none',
            }}
          />
        ))}
      </div>
    );
  }

  // Sliding window: calculate which dots to show
  // Keep current in center-ish position (index 2 of 5 dots = middle)
  const centerPosition = 2;

  // Calculate window start
  let windowStart = current - centerPosition;

  // Clamp windowStart so window doesn't go past boundaries
  if (windowStart < 0) windowStart = 0;
  if (windowStart > total - maxDots) windowStart = total - maxDots;

  const windowEnd = windowStart + maxDots;

  // Calculate how many items are hidden on each side
  const hiddenLeft = windowStart;
  const hiddenRight = total - windowEnd;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
        marginTop: '12px',
      }}
    >
      {/* Left counter */}
      {hiddenLeft > 0 && (
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            color: tokens.colors.textMuted,
            marginRight: '4px',
            minWidth: '20px',
            textAlign: 'right',
          }}
        >
          +{hiddenLeft}
        </span>
      )}

      {/* Visible dots */}
      {Array.from({ length: maxDots }).map((_, i) => {
        const actualIndex = windowStart + i;
        const isActive = actualIndex === current;
        return (
          <div
            key={actualIndex}
            style={{
              width: isActive ? '16px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: isActive ? tokens.colors.cyan : tokens.colors.border,
              transition: 'all 0.2s ease',
              boxShadow: isActive ? `0 0 10px ${tokens.colors.cyanGlow}` : 'none',
            }}
          />
        );
      })}

      {/* Right counter */}
      {hiddenRight > 0 && (
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            color: tokens.colors.textMuted,
            marginLeft: '4px',
            minWidth: '20px',
            textAlign: 'left',
          }}
        >
          +{hiddenRight}
        </span>
      )}
    </div>
  );
}

/**
 * Beautiful skeleton card matching the KPI skeleton style
 * Features shimmer animation with color-coded accent
 */
function SkeletonMarketCard({ index, isMobile = false }: { index: number; isMobile?: boolean }) {
  // Stagger colors for visual variety
  const accentColors = [
    tokens.colors.cyan,
    tokens.colors.profit,
    tokens.colors.magenta,
    tokens.colors.purple,
  ];
  const color = accentColors[index % accentColors.length];
  const delay = index * 100;

  return (
    <div
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: isMobile ? '16px' : '12px',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
        width: isMobile ? '280px' : 'auto',
        flexShrink: isMobile ? 0 : undefined,
      }}
    >
      {/* Shimmer overlay - slides across the card */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, transparent 0%, ${color}10 50%, transparent 100%)`,
          animation: `shimmerSlide 2s ease-in-out infinite`,
          animationDelay: `${delay}ms`,
        }}
      />

      {/* Category tag skeleton */}
      <div
        style={{
          width: '70px',
          height: '22px',
          borderRadius: '6px',
          background: `linear-gradient(90deg, ${color}15 0%, ${color}30 50%, ${color}15 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          animationDelay: `${delay}ms`,
          marginBottom: '12px',
        }}
      />

      {/* Title skeleton - two lines */}
      <div
        style={{
          width: '90%',
          height: '14px',
          borderRadius: '4px',
          background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          animationDelay: `${delay + 50}ms`,
          marginBottom: '8px',
        }}
      />
      <div
        style={{
          width: '65%',
          height: '14px',
          borderRadius: '4px',
          background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          animationDelay: `${delay + 100}ms`,
          marginBottom: '12px',
        }}
      />

      {/* Probability bar skeleton */}
      <div
        style={{
          height: '8px',
          borderRadius: '4px',
          background: `${tokens.colors.loss}20`,
          marginBottom: '12px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: '60%',
            background: `linear-gradient(90deg, ${tokens.colors.profit}40 0%, ${tokens.colors.cyan}40 100%)`,
            borderRadius: '4px',
            animation: 'shimmer 1.5s ease-in-out infinite',
            animationDelay: `${delay + 150}ms`,
          }}
        />
      </div>

      {/* Stats row skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Yes probability */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '45px',
              height: '18px',
              borderRadius: '4px',
              background: `linear-gradient(90deg, ${tokens.colors.profit}20 0%, ${tokens.colors.profit}40 50%, ${tokens.colors.profit}20 100%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              animationDelay: `${delay + 200}ms`,
            }}
          />
          <div
            style={{
              width: '24px',
              height: '10px',
              borderRadius: '3px',
              background: tokens.colors.border,
            }}
          />
        </div>

        {/* Sparkline placeholder */}
        <div
          style={{
            width: '70px',
            height: '24px',
            borderRadius: '4px',
            background: `linear-gradient(90deg, ${color}10 0%, ${color}25 50%, ${color}10 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
            animationDelay: `${delay + 250}ms`,
          }}
        />

        {/* Volume */}
        <div
          style={{
            width: '65px',
            height: '12px',
            borderRadius: '4px',
            background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
            animationDelay: `${delay + 300}ms`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for market cards
 * Beautiful animated skeleton matching KPI grid style
 */
function LoadingSkeleton({ count = 4, isMobile = false }: { count?: number; isMobile?: boolean }) {
  return (
    <>
      {/* CSS Animations for skeleton */}
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes shimmerSlide {
            0% { left: -100%; }
            100% { left: 100%; }
          }
        `}
      </style>

      {isMobile ? (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Left spacer */}
          <div style={{ flexShrink: 0, width: '16px' }} aria-hidden="true" />
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonMarketCard key={i} index={i} isMobile />
          ))}
          {/* Right spacer */}
          <div style={{ flexShrink: 0, width: '16px' }} aria-hidden="true" />
        </div>
      ) : (
        Array.from({ length: count }).map((_, i) => (
          <SkeletonMarketCard key={i} index={i} />
        ))
      )}
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
            padding: '10px 20px',
            background: tokens.colors.cyan,
            border: 'none',
            borderRadius: '10px',
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            fontWeight: 600,
            color: tokens.colors.void,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1)';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);

  // Track scroll position for indicator on mobile
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const scrollLeft = scrollRef.current.scrollLeft;
        const cardWidth = 292; // 280px card + 12px gap
        const index = Math.round(scrollLeft / cardWidth);
        setScrollIndex(index);
      }
    };

    const el = scrollRef.current;
    if (el && isMobile) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [isMobile]);

  // =====================
  // MOBILE VIEW
  // =====================
  if (isMobile) {
    return (
      <div data-testid="trending-markets">
        {/* Section Header - Mobile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔥</span>
            <span
              style={{
                fontFamily: tokens.fonts.display,
                fontWeight: 700,
                fontSize: '18px',
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
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: tokens.fonts.mono,
              fontSize: '12px',
              color: tokens.colors.cyan,
              textDecoration: 'none',
              padding: '6px 10px',
              background: `${tokens.colors.cyan}10`,
              borderRadius: '8px',
            }}
          >
            View all →
          </a>
        </div>

        {/* Loading State - Mobile */}
        {loading && <LoadingSkeleton count={3} isMobile />}

        {/* Error State - Mobile */}
        {error && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '16px',
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
              Failed to load markets
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '10px 20px',
                  background: tokens.colors.cyan,
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: tokens.fonts.body,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: tokens.colors.void,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Empty State - Mobile */}
        {!loading && !error && markets.length === 0 && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '16px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📈</div>
            <div style={{ color: tokens.colors.textMuted }}>
              No trending markets available
            </div>
          </div>
        )}

        {/* Horizontal Scroll Cards - Mobile */}
        {!loading && !error && markets.length > 0 && (
          <>
            <div
              ref={scrollRef}
              style={{
                display: 'flex',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {/* Left spacer */}
              <div style={{ flexShrink: 0, width: '16px' }} aria-hidden="true" />
              {markets.map((market, index) => (
                <div
                  key={market.id}
                  style={{
                    scrollSnapAlign: 'start',
                    marginRight: index < markets.length - 1 ? '12px' : '0',
                  }}
                >
                  <MobileMarketCard market={market} index={index} />
                </div>
              ))}
              {/* Right spacer */}
              <div style={{ flexShrink: 0, width: '16px' }} aria-hidden="true" />
            </div>

            {/* Scroll Indicators */}
            {markets.length > 1 && (
              <ScrollIndicator total={markets.length} current={scrollIndex} />
            )}
          </>
        )}
      </div>
    );
  }

  // =====================
  // DESKTOP VIEW
  // =====================
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
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        {loading ? (
          <LoadingSkeleton count={4} />
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
