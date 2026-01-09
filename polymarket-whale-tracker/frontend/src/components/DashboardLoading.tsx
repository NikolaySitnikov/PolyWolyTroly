/**
 * DashboardLoading Component
 *
 * Skeleton loading state for the dashboard.
 * Displays animated whale mascot and placeholder cards while data is being fetched.
 * Features color-coded shimmer effects matching the KPI card accent colors.
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md - Whale Animation Sequences
 */

import { tokens } from '../styles/tokens';
import { WhaleAnimation } from './WhaleAnimation';

interface DashboardLoadingProps {
  isMobile: boolean;
}

/**
 * KPI accent colors matching the actual StatCard components
 * Order: Whales Tracked (cyan), Total Volume (magenta), Alerts Today (purple), Whales Today (profit/green)
 */
const KPI_COLORS = [
  tokens.colors.cyan,
  tokens.colors.magenta,
  tokens.colors.purple,
  tokens.colors.profit,
];

/**
 * Trending Markets skeleton card colors
 * Matches the visual variety in TrendingMarkets component
 */
const TRENDING_COLORS = [
  tokens.colors.cyan,
  tokens.colors.profit,
  tokens.colors.magenta,
  tokens.colors.purple,
];

export function DashboardLoading({ isMobile }: DashboardLoadingProps) {
  return (
    <div data-testid="dashboard-loading">
      {/* Animated whale mascot */}
      <WhaleAnimation
        state="loading"
        title="Scanning the depths..."
        subtitle="Looking for whale activity..."
      />

      {/* Skeleton cards grid */}
      <div
        data-testid="skeleton-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {KPI_COLORS.map((color, i) => (
          <div
            key={i}
            data-testid="skeleton-card"
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderTop: `3px solid ${color}`,
              borderRadius: tokens.radius.lg,
              padding: '20px',
              minHeight: '120px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Colored shimmer overlay - slides across the card */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: `linear-gradient(90deg, transparent 0%, ${color}15 50%, transparent 100%)`,
                animation: 'shimmerSlide 2s ease-in-out infinite',
                animationDelay: `${i * 150}ms`,
              }}
            />

            {/* Icon placeholder with color tint */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: tokens.radius.md,
                background: `linear-gradient(90deg, ${color}20 0%, ${color}35 50%, ${color}20 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: `${i * 100}ms`,
                marginBottom: '12px',
              }}
            />
            {/* Value placeholder with color accent */}
            <div
              style={{
                width: '70%',
                height: '28px',
                borderRadius: tokens.radius.sm,
                background: `linear-gradient(90deg, ${color}15 0%, ${color}30 50%, ${color}15 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: `${i * 100 + 50}ms`,
                marginBottom: '8px',
              }}
            />
            {/* Label placeholder */}
            <div
              style={{
                width: '50%',
                height: '14px',
                borderRadius: tokens.radius.sm,
                background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: `${i * 100 + 100}ms`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Trending Markets Skeleton Section */}
      <div style={{ marginTop: tokens.spacing[6] }}>
        {/* Section header skeleton */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: '140px',
                height: '16px',
                borderRadius: '4px',
                background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: '50ms',
              }}
            />
          </div>
          <div
            style={{
              width: '70px',
              height: '14px',
              borderRadius: '4px',
              background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              animationDelay: '100ms',
            }}
          />
        </div>

        {/* Trending markets skeleton grid */}
        {isMobile ? (
          // Mobile: horizontal scrolling cards
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
            <div style={{ flexShrink: 0, width: '16px' }} aria-hidden="true" />
            {TRENDING_COLORS.slice(0, 3).map((color, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  width: '280px',
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: '16px',
                  padding: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, transparent 0%, ${color}15 50%, transparent 100%)`,
                    animation: 'shimmerSlide 2s ease-in-out infinite',
                    animationDelay: `${i * 150}ms`,
                  }}
                />
                {/* Category tag */}
                <div
                  style={{
                    width: '70px',
                    height: '24px',
                    borderRadius: '6px',
                    background: `linear-gradient(90deg, ${color}15 0%, ${color}30 50%, ${color}15 100%)`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                    animationDelay: `${i * 100}ms`,
                    marginBottom: '12px',
                  }}
                />
                {/* Title lines */}
                <div
                  style={{
                    width: '90%',
                    height: '15px',
                    borderRadius: '4px',
                    background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                    animationDelay: `${i * 100 + 50}ms`,
                    marginBottom: '8px',
                  }}
                />
                <div
                  style={{
                    width: '70%',
                    height: '15px',
                    borderRadius: '4px',
                    background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                    animationDelay: `${i * 100 + 100}ms`,
                    marginBottom: '16px',
                  }}
                />
                {/* Probability bar */}
                <div
                  style={{
                    height: '10px',
                    borderRadius: '5px',
                    background: `${tokens.colors.loss}20`,
                    marginBottom: '14px',
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
                      width: '55%',
                      background: `linear-gradient(90deg, ${tokens.colors.profit}40 0%, ${tokens.colors.cyan}40 100%)`,
                      borderRadius: '5px',
                      animation: 'shimmer 1.5s ease-in-out infinite',
                      animationDelay: `${i * 100 + 150}ms`,
                    }}
                  />
                </div>
                {/* Stats row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: `1px solid ${tokens.colors.border}`,
                  }}
                >
                  <div
                    style={{
                      width: '50px',
                      height: '24px',
                      borderRadius: '4px',
                      background: `linear-gradient(90deg, ${tokens.colors.profit}20 0%, ${tokens.colors.profit}40 50%, ${tokens.colors.profit}20 100%)`,
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s ease-in-out infinite',
                      animationDelay: `${i * 100 + 200}ms`,
                    }}
                  />
                  <div
                    style={{
                      width: '60px',
                      height: '22px',
                      borderRadius: '4px',
                      background: `linear-gradient(90deg, ${color}10 0%, ${color}25 50%, ${color}10 100%)`,
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s ease-in-out infinite',
                      animationDelay: `${i * 100 + 250}ms`,
                    }}
                  />
                  <div
                    style={{
                      width: '55px',
                      height: '14px',
                      borderRadius: '4px',
                      background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s ease-in-out infinite',
                      animationDelay: `${i * 100 + 300}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
            <div style={{ flexShrink: 0, width: '16px' }} aria-hidden="true" />
          </div>
        ) : (
          // Desktop: 4-column grid (matches 8 markets in 2 rows)
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
            }}
          >
            {TRENDING_COLORS.map((color, i) => (
              <div
                key={i}
                style={{
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, transparent 0%, ${color}15 50%, transparent 100%)`,
                    animation: 'shimmerSlide 2s ease-in-out infinite',
                    animationDelay: `${i * 150}ms`,
                  }}
                />
                {/* Category tag */}
                <div
                  style={{
                    width: '70px',
                    height: '22px',
                    borderRadius: '6px',
                    background: `linear-gradient(90deg, ${color}15 0%, ${color}30 50%, ${color}15 100%)`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                    animationDelay: `${i * 100}ms`,
                    marginBottom: '12px',
                  }}
                />
                {/* Title lines */}
                <div
                  style={{
                    width: '90%',
                    height: '14px',
                    borderRadius: '4px',
                    background: `linear-gradient(90deg, ${tokens.colors.border} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.border} 100%)`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                    animationDelay: `${i * 100 + 50}ms`,
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
                    animationDelay: `${i * 100 + 100}ms`,
                    marginBottom: '12px',
                  }}
                />
                {/* Probability bar */}
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
                      animationDelay: `${i * 100 + 150}ms`,
                    }}
                  />
                </div>
                {/* Stats row */}
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
                        animationDelay: `${i * 100 + 200}ms`,
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
                      animationDelay: `${i * 100 + 250}ms`,
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
                      animationDelay: `${i * 100 + 300}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyframe animations - injected inline */}
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
          @keyframes shimmerSlide {
            0% {
              left: -100%;
            }
            100% {
              left: 100%;
            }
          }
        `}
      </style>
    </div>
  );
}
