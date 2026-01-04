/**
 * StatCard Component
 *
 * A statistics card for displaying key metrics on the dashboard.
 * Based on DESIGN_SYSTEM.md specifications.
 *
 * Features:
 * - Label, value, and optional icon
 * - Optional trend indicator with up/down arrows
 * - Optional subValue for additional context
 * - Configurable accent color
 * - Animated entrance
 */

import { tokens } from '../styles/tokens';

type AccentColor = 'cyan' | 'magenta' | 'purple' | 'profit' | 'loss';

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  subValue?: string;
  trend?: number;
  accentColor?: AccentColor;
  delay?: number;
}

const accentColors: Record<AccentColor, string> = {
  cyan: tokens.colors.cyan,
  magenta: tokens.colors.magenta,
  purple: '#a855f7',
  profit: tokens.colors.profit,
  loss: tokens.colors.loss,
};

export function StatCard({
  label,
  value,
  icon,
  subValue,
  trend,
  accentColor = 'cyan',
  delay = 0,
}: StatCardProps) {
  const accent = accentColors[accentColor];

  return (
    <div
      data-testid="stat-card"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        animation: `fadeInUp 0.5s ${delay}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
        cursor: 'pointer',
        transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
      }}
      onAnimationEnd={(e) => {
        // Clear animation so hover transform can work
        e.currentTarget.style.animation = 'none';
      }}
      onMouseEnter={(e) => {
        // Only apply hover effects on devices with hover capability
        if (window.matchMedia('(hover: hover)').matches) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = tokens.colors.cyan;
          e.currentTarget.style.boxShadow = `0 0 30px ${tokens.colors.cyanGlow}, inset 0 1px 0 ${tokens.colors.cyan}`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Accent glow bar at top */}
      <div
        data-testid="stat-card-accent"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '3px',
          background: `linear-gradient(90deg, ${accent}, transparent)`,
          opacity: 0.8,
        }}
      />

      {/* Header with label and icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontFamily: tokens.fonts.mono,
            color: tokens.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: '18px', opacity: 0.7 }}>{icon}</span>
      </div>

      {/* Main value */}
      <div
        data-testid="stat-card-value"
        style={{
          fontFamily: tokens.fonts.display,
          fontSize: '28px',
          fontWeight: 700,
          color: tokens.colors.textPrimary,
          marginBottom: '4px',
        }}
      >
        {value}
      </div>

      {/* Trend and subValue */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {trend !== undefined && (
          <span
            data-testid="stat-card-trend"
            style={{
              color: trend >= 0 ? tokens.colors.profit : tokens.colors.loss,
              fontSize: '12px',
              fontFamily: tokens.fonts.mono,
              fontWeight: 500,
            }}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {subValue && (
          <span
            style={{
              color: tokens.colors.textMuted,
              fontSize: '12px',
              fontFamily: tokens.fonts.mono,
            }}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
