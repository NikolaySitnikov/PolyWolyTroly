/**
 * TradingMetricsGridSkeleton Component
 *
 * Beautiful loading skeleton for TradingMetricsGrid.
 * Shows animated placeholder cards while trading data loads.
 * Uses the same layout and semantic colors as the real grid.
 *
 * Features:
 * - Shimmer animation across all cards
 * - Color-coded skeleton lines matching KPI colors
 * - Whale-themed loading message
 * - Respects mobile/desktop layouts
 */

import { type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';

interface TradingMetricsGridSkeletonProps {
  /** Whether on mobile */
  isMobile: boolean;
}

/**
 * KPI colors for skeleton loading bars
 */
const KPI_COLORS = [
  tokens.colors.gold,    // Total Deposited
  tokens.colors.cyan,    // P&L (default cyan since we don't know +/-)
  tokens.colors.cyan,    // Win Rate
  tokens.colors.violet,  // Portfolio
  tokens.colors.blue,    // Positions
  tokens.colors.pink,    // Predictions
];

const KPI_LABELS = [
  'TOTAL DEPOSITED',
  'P&L (7D)',
  'WIN RATE',
  'PORTFOLIO',
  'POSITIONS',
  'PREDICTIONS',
];

/**
 * Individual skeleton card
 */
function SkeletonCard({ color, label }: { color: string; label: string }) {
  const cardStyle: CSSProperties = {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'hidden',
    position: 'relative',
  };

  const labelRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const iconSkeletonStyle: CSSProperties = {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    background: `${color}30`,
  };

  const labelStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: '10px',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  const valueSkeletonStyle: CSSProperties = {
    width: '70%',
    height: '24px',
    borderRadius: '6px',
    background: `linear-gradient(90deg, ${color}15 0%, ${color}30 50%, ${color}15 100%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
  };

  // Shimmer overlay for the entire card
  const shimmerOverlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, transparent 0%, ${color}10 50%, transparent 100%)`,
    animation: 'shimmerSlide 2s ease-in-out infinite',
  };

  return (
    <div style={cardStyle}>
      <div style={shimmerOverlayStyle} />
      <div style={labelRowStyle}>
        <div style={iconSkeletonStyle} />
        <span style={labelStyle}>{label}</span>
      </div>
      <div style={valueSkeletonStyle} />
    </div>
  );
}

export function TradingMetricsGridSkeleton({ isMobile }: TradingMetricsGridSkeletonProps) {
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
    gap: isMobile ? '12px' : '16px',
  };

  const containerStyle: CSSProperties = {
    position: 'relative',
  };

  const loadingTextStyle: CSSProperties = {
    textAlign: 'center',
    marginTop: '16px',
    fontFamily: tokens.fonts.mono,
    fontSize: '12px',
    color: tokens.colors.cyan,
    textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
    animation: 'pulse 2s ease-in-out infinite',
  };

  return (
    <div style={containerStyle}>
      {/* CSS Animations */}
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
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}
      </style>

      {/* Skeleton Grid */}
      <div style={gridStyle}>
        {KPI_COLORS.map((color, index) => (
          <SkeletonCard key={index} color={color} label={KPI_LABELS[index]} />
        ))}
      </div>

      {/* Whale-themed loading message */}
      <div style={loadingTextStyle}>
        Diving for trading data...
      </div>
    </div>
  );
}
