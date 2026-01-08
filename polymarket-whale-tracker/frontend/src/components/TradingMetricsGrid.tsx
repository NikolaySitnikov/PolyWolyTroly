/**
 * TradingMetricsGrid Component
 *
 * Grid of 6 trading stats for WalletProfile.
 * Desktop: 6 columns in a row
 * Mobile: 2 columns, 3 rows (2x3 grid)
 *
 * Stats displayed:
 * 1. Total Deposited (profit green)
 * 2. P&L (profit/loss/neutral colors with glow)
 * 3. Win Rate (cyan)
 * 4. Portfolio Value (standard)
 * 5. Active Positions (muted)
 * 6. Total Trades (muted)
 *
 * Per TRADING_FEATURES_DESIGN_GUIDE.md Section 4 & 12.
 */

import { type CSSProperties, type ReactNode } from 'react';
import { tokens } from '../styles/tokens';
import { PnlIcon } from './icons/PnlIcon';
import { WinRateIcon } from './icons/WinRateIcon';
import { PortfolioIcon } from './icons/PortfolioIcon';
import { PositionsIcon } from './icons/PositionsIcon';
import { TradesIcon } from './icons/TradesIcon';
import type { PnlTimeWindow } from '../types/polymarket';

export interface TradingMetricsGridProps {
  /** Total deposited in USD */
  totalDeposited: number;
  /** P&L value for the selected time window */
  pnl: number;
  /** Win rate percentage (0-100) */
  winRate: number | null;
  /** Portfolio value in USD */
  portfolioValue: number | null;
  /** Number of active positions */
  activePositions: number | null;
  /** Total number of trades */
  totalTrades: number | null;
  /** Currently selected P&L time window */
  pnlTimeWindow: PnlTimeWindow;
  /** Whether on mobile */
  isMobile: boolean;
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
 * Format P&L with + prefix for positive, - prefix for negative
 */
function formatPnl(num: number): string {
  if (num === 0) return '$0';
  const formatted = formatUSD(Math.abs(num));
  return num > 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Format win rate percentage
 */
function formatWinRate(rate: number | null): string {
  if (rate === null || isNaN(rate)) return 'N/A';
  return `${Math.round(rate)}%`;
}

/**
 * Format count (positions, trades)
 */
function formatCount(count: number | null): string {
  if (count === null) return 'N/A';
  return count.toLocaleString();
}

/**
 * Get P&L color and glow based on value
 */
function getPnlStyle(pnl: number): { color: string; glow: string } {
  if (pnl > 0) {
    return { color: tokens.colors.profit, glow: tokens.colors.profitGlow };
  }
  if (pnl < 0) {
    return { color: tokens.colors.loss, glow: tokens.colors.lossGlow };
  }
  return { color: tokens.colors.neutral, glow: tokens.colors.neutralGlow };
}

/**
 * Get P&L time window label
 */
function getPnlLabel(window: PnlTimeWindow): string {
  switch (window) {
    case '7d':
      return 'P&L (7D)';
    case '30d':
      return 'P&L (30D)';
    case 'all':
    default:
      return 'P&L (All)';
  }
}

/**
 * Total Deposited SVG icon (stacked coins)
 */
function TotalDepositedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: tokens.colors.profit }}>
      <ellipse cx="12" cy="7" rx="8" ry="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 10.5c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 15.5c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  valueColor?: string;
  valueGlow?: string;
}

/**
 * Individual metric card
 */
function MetricCard({ label, value, icon, valueColor, valueGlow }: MetricCardProps) {
  const cardStyle: CSSProperties = {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const labelRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const iconStyle: CSSProperties = {
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    color: tokens.colors.textMuted,
  };

  const labelStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: '10px',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  const valueStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: '20px',
    fontWeight: 600,
    color: valueColor || tokens.colors.textPrimary,
    textShadow: valueGlow ? `0 0 10px ${valueGlow}` : undefined,
  };

  return (
    <div style={cardStyle}>
      <div style={labelRowStyle}>
        <span style={iconStyle}>{icon}</span>
        <span style={labelStyle}>{label}</span>
      </div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

export function TradingMetricsGrid({
  totalDeposited,
  pnl,
  winRate,
  portfolioValue,
  activePositions,
  totalTrades,
  pnlTimeWindow,
  isMobile,
}: TradingMetricsGridProps) {
  const pnlStyle = getPnlStyle(pnl);

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
    gap: isMobile ? '12px' : '16px',
  };

  return (
    <div style={gridStyle}>
      {/* 1. Total Deposited */}
      <MetricCard
        label="Total Deposited"
        value={formatUSD(totalDeposited)}
        icon={<TotalDepositedIcon />}
        valueColor={tokens.colors.profit}
        valueGlow={tokens.colors.profitGlow}
      />

      {/* 2. P&L */}
      <MetricCard
        label={getPnlLabel(pnlTimeWindow)}
        value={formatPnl(pnl)}
        icon={<PnlIcon size={16} color={pnlStyle.color} />}
        valueColor={pnlStyle.color}
        valueGlow={pnlStyle.glow}
      />

      {/* 3. Win Rate */}
      <MetricCard
        label="Win Rate"
        value={formatWinRate(winRate)}
        icon={<WinRateIcon size={16} color={tokens.colors.cyan} />}
        valueColor={tokens.colors.cyan}
      />

      {/* 4. Portfolio Value */}
      <MetricCard
        label="Portfolio"
        value={portfolioValue !== null ? formatUSD(portfolioValue) : 'N/A'}
        icon={<PortfolioIcon size={16} color={tokens.colors.textMuted} />}
      />

      {/* 5. Active Positions */}
      <MetricCard
        label="Positions"
        value={formatCount(activePositions)}
        icon={<PositionsIcon size={16} color={tokens.colors.textMuted} />}
      />

      {/* 6. Total Trades */}
      <MetricCard
        label="Total Trades"
        value={formatCount(totalTrades)}
        icon={<TradesIcon size={16} color={tokens.colors.textMuted} />}
      />
    </div>
  );
}
