/**
 * Sparkline Component
 *
 * A minimal, inline sparkline chart for displaying price history trends.
 * Uses Recharts for rendering with design system styling.
 *
 * Design System Specs:
 * - Thin (1px) stroke, no labels
 * - Cyan color (#00fff0) for positive trend
 * - Loss red (#ff3366) for negative trend
 * - Inline with data, minimal footprint
 *
 * @see ../../../Design docs/DESIGN_SYSTEM.md - Chart specifications
 */

import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { tokens } from '../styles/tokens';
import type { PriceHistoryPoint } from '../services/api';

interface SparklineProps {
  /** Price history data points */
  data: PriceHistoryPoint[];
  /** Width in pixels (default: 80) */
  width?: number;
  /** Height in pixels (default: 24) */
  height?: number;
  /** Loading state - shows shimmer effect */
  loading?: boolean;
}

/** Threshold for considering a trend as "neutral" (percentage) */
const NEUTRAL_THRESHOLD = 0.5; // ±0.5%

/**
 * Calculate trend direction from price history data.
 * Compares first and last data points with threshold for neutral.
 */
function calculateTrend(data: PriceHistoryPoint[]): 'up' | 'down' | 'neutral' {
  if (data.length < 2) return 'neutral';
  const first = data[0].p;
  const last = data[data.length - 1].p;
  if (first === 0) return 'neutral';
  const changePercent = ((last - first) / first) * 100;
  if (Math.abs(changePercent) < NEUTRAL_THRESHOLD) return 'neutral';
  if (changePercent > 0) return 'up';
  return 'down';
}

/**
 * Get stroke color based on trend direction per design system.
 * Uses purple for neutral/flat trends to match Alerts Today accent.
 */
function getTrendColor(trend: 'up' | 'down' | 'neutral'): string {
  switch (trend) {
    case 'up':
      return tokens.colors.cyan;
    case 'down':
      return tokens.colors.loss;
    default:
      return tokens.colors.purple;
  }
}

/**
 * Sparkline component for inline price trend visualization.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  loading = false,
}: SparklineProps) {
  // Calculate trend for color and accessibility
  const trend = useMemo(() => calculateTrend(data), [data]);
  const strokeColor = getTrendColor(trend);

  // Generate aria label for screen readers
  const ariaLabel = useMemo(() => {
    if (loading) return 'Loading price history';
    if (data.length === 0) return 'No price history available';
    const trendText = trend === 'up' ? 'upward' : trend === 'down' ? 'downward' : 'stable';
    const changePercent = data.length >= 2
      ? Math.abs(((data[data.length - 1].p - data[0].p) / data[0].p) * 100).toFixed(1)
      : '0';
    return `Price trend: ${trendText}, ${changePercent}% change`;
  }, [data, trend, loading]);

  // Loading state with shimmer effect
  if (loading) {
    return (
      <div
        data-testid="sparkline"
        aria-label="Loading price history"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: `linear-gradient(90deg, ${tokens.colors.surface} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.surface} 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: tokens.radius.sm,
        }}
      />
    );
  }

  // Empty state - just show placeholder
  if (data.length === 0) {
    return (
      <div
        data-testid="sparkline"
        aria-label="No price history available"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: tokens.colors.surface,
          borderRadius: tokens.radius.sm,
          opacity: 0.5,
        }}
      />
    );
  }

  return (
    <div
      data-testid="sparkline"
      aria-label={ariaLabel}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="linear"
            dataKey="p"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
