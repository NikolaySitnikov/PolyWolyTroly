/**
 * PullToRefresh Component
 *
 * A wrapper component that adds pull-to-refresh gesture support.
 * Used for mobile to refresh data with a whale-themed ASCII animation.
 *
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Threshold: 80px
 * - Animation: Whale emerges from top
 * - Loading: Whale swims in circle
 * - Complete: Whale dives back down
 *
 * Features:
 * - Touch gesture detection with resistance
 * - ASCII whale indicator matching WhaleAnimation component style
 * - Only activates when scrolled to top
 * - Prevents multiple concurrent refreshes
 *
 * @see ./WhaleAnimation.tsx - ASCII whale mascot component
 * @see ../styles/tokens.ts - Design tokens
 */

import { useState, useRef, useCallback, type ReactNode, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';

/**
 * Compact ASCII whale for pull-to-refresh indicator
 * Simplified version of the WhaleAnimation whale art
 */
const COMPACT_WHALE = `   .
  ":"
___:____ |"\\/"|
,'    \\. \\ /
| °    \\___/|`;

const COMPACT_WAVES = '~^~^~^~^~^~^~^~';

interface PullToRefreshProps {
  children: ReactNode;
  /** Async function to call when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Pull distance threshold in pixels (default: 80) */
  threshold?: number;
  /** Disable pull-to-refresh */
  disabled?: boolean;
  /** Additional styles for the container */
  style?: CSSProperties;
}

type RefreshState = 'idle' | 'pulling' | 'loading' | 'complete';

/**
 * Apply resistance to pull distance for natural feel
 * Returns a value that increases slower as distance increases
 */
function applyResistance(distance: number, maxDistance: number = 150): number {
  // Logarithmic resistance - feels natural on mobile
  const resistance = 0.5;
  return Math.min(distance * resistance, maxDistance);
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
  style,
}: PullToRefreshProps) {
  const [state, setState] = useState<RefreshState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  /**
   * Get scroll position - checks both window and container scroll
   * This handles both body-scroll apps and container-scroll scenarios
   */
  const getScrollTop = useCallback(() => {
    const container = containerRef.current;
    // Check window scroll first (body-scroll apps), then container scroll
    const windowScroll = window.scrollY || document.documentElement.scrollTop;
    const containerScroll = container?.scrollTop ?? 0;
    return Math.max(windowScroll, containerScroll);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state === 'loading') return;

      // Only allow pull when scrolled to top
      if (getScrollTop() > 0) return;

      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      isPullingRef.current = true;
    },
    [disabled, state, getScrollTop]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPullingRef.current || disabled || state === 'loading') return;

      // Double-check we're at top
      if (getScrollTop() > 0) {
        isPullingRef.current = false;
        setPullDistance(0);
        setState('idle');
        return;
      }

      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;

      // Only handle downward pull
      if (deltaY > 0) {
        // Prevent default scrolling while pulling
        e.preventDefault();

        const resistedDistance = applyResistance(deltaY);
        setPullDistance(resistedDistance);
        setState('pulling');
      }
    },
    [disabled, state]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) return;

    isPullingRef.current = false;

    if (state === 'loading') {
      setPullDistance(0);
      return;
    }

    // Check if pull exceeded threshold
    if (pullDistance >= threshold * 0.5) {
      // Use half threshold due to resistance
      setState('loading');
      setPullDistance(threshold * 0.5); // Keep indicator visible while loading

      try {
        await onRefresh();
      } finally {
        setState('complete');

        // Brief completion animation, then reset
        setTimeout(() => {
          setState('idle');
          setPullDistance(0);
        }, 300);
      }
    } else {
      // Snap back
      setState('idle');
      setPullDistance(0);
    }
  }, [disabled, state, pullDistance, threshold, onRefresh]);

  // Calculate indicator styles based on state
  // Increase height for ASCII whale (needs more space than emoji)
  const indicatorHeight = state === 'loading' ? 100 : Math.max(pullDistance, 0);
  const showIndicator = pullDistance > 10 || state === 'loading' || state === 'complete';

  // Whale animation based on state - matches WhaleAnimation component animations
  const getWhaleAnimation = (): string => {
    switch (state) {
      case 'loading':
        return 'whaleSwim 3s ease-in-out infinite'; // Match WhaleAnimation loading
      case 'complete':
        return 'whaleDive 0.3s ease-in forwards';
      default:
        return 'none';
    }
  };

  // Whale color based on state - matches WhaleAnimation styles
  const getWhaleColor = (): string => {
    switch (state) {
      case 'loading':
        return tokens.colors.cyan;
      case 'complete':
        return tokens.colors.profit;
      default:
        return tokens.colors.cyan;
    }
  };

  // Whale glow based on state
  const getWhaleGlow = (): string => {
    switch (state) {
      case 'loading':
        return `0 0 20px ${tokens.colors.cyanGlow}`;
      case 'complete':
        return `0 0 20px ${tokens.colors.profitGlow}`;
      default:
        return `0 0 10px ${tokens.colors.cyanGlow}`;
    }
  };

  return (
    <>
      {/* Keyframe animations */}
      <style>
        {`
          @keyframes whaleSwim {
            0%, 100% {
              transform: translateX(0) rotate(0deg);
            }
            25% {
              transform: translateX(-10px) rotate(-10deg);
            }
            75% {
              transform: translateX(10px) rotate(10deg);
            }
          }

          @keyframes whaleDive {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(-30px) rotate(-45deg);
              opacity: 0;
            }
          }
        `}
      </style>

      <div
        ref={containerRef}
        data-testid="pull-to-refresh"
        style={{
          position: 'relative',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          ...style,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull indicator */}
        {showIndicator && (
          <div
            data-testid="pull-indicator"
            data-state={state}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${indicatorHeight}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: `linear-gradient(180deg, ${tokens.colors.surface} 0%, transparent 100%)`,
              zIndex: 10,
              transition: state === 'idle' ? 'height 0.3s ease' : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: getWhaleAnimation(),
                transform: state === 'pulling'
                  ? `translateY(${Math.min(pullDistance / 3, 15)}px)`
                  : 'none',
                transition: state === 'idle' ? 'transform 0.3s ease' : 'none',
              }}
            >
              {/* ASCII Whale - matches WhaleAnimation component style */}
              <pre
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '8px',
                  lineHeight: 1.2,
                  margin: 0,
                  whiteSpace: 'pre',
                  color: getWhaleColor(),
                  textShadow: getWhaleGlow(),
                  opacity: state === 'pulling'
                    ? Math.min(pullDistance / (threshold * 0.4), 1)
                    : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {COMPACT_WHALE}
              </pre>

              {/* Waves with shimmer */}
              <pre
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '8px',
                  lineHeight: 1.2,
                  margin: 0,
                  whiteSpace: 'pre',
                  color: getWhaleColor(),
                  textShadow: getWhaleGlow(),
                  animation: state === 'loading' ? 'waveShimmer 2s ease-in-out infinite' : 'none',
                  opacity: state === 'pulling'
                    ? Math.min(pullDistance / (threshold * 0.4), 1)
                    : 1,
                }}
              >
                {COMPACT_WAVES}
              </pre>

              {/* Status text */}
              <span
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: tokens.fontSizes.xs,
                  color: tokens.colors.textSecondary,
                  marginTop: '4px',
                  opacity: pullDistance > 20 || state === 'loading' ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {state === 'loading'
                  ? 'Refreshing...'
                  : pullDistance >= threshold * 0.4
                    ? 'Release to refresh'
                    : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

        {/* Content with pull offset */}
        <div
          style={{
            transform: `translateY(${showIndicator ? indicatorHeight : 0}px)`,
            transition: state === 'idle' ? 'transform 0.3s ease' : 'none',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
