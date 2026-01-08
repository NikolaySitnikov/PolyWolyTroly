/**
 * TradingMetricsGrid Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TradingMetricsGrid } from './TradingMetricsGrid';

describe('TradingMetricsGrid', () => {
  const defaultProps = {
    totalDeposited: 125000,
    pnl: 47250,
    winRate: 68,
    portfolioValue: 89400,
    activePositions: 12,
    totalTrades: 156,
    pnlTimeWindow: '7d' as const,
    isMobile: false,
  };

  it('renders all 6 metric labels', () => {
    render(<TradingMetricsGrid {...defaultProps} />);

    expect(screen.getByText('Total Deposited')).toBeInTheDocument();
    expect(screen.getByText('P&L (7D)')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Predictions')).toBeInTheDocument();
  });

  it('formats total deposited correctly', () => {
    render(<TradingMetricsGrid {...defaultProps} />);
    expect(screen.getByText('$125.0K')).toBeInTheDocument();
  });

  it('formats positive P&L with + prefix', () => {
    render(<TradingMetricsGrid {...defaultProps} />);
    expect(screen.getByText('+$47.3K')).toBeInTheDocument();
  });

  it('formats negative P&L correctly', () => {
    render(<TradingMetricsGrid {...defaultProps} pnl={-12830} />);
    expect(screen.getByText('-$12.8K')).toBeInTheDocument();
  });

  it('formats zero P&L as $0', () => {
    render(<TradingMetricsGrid {...defaultProps} pnl={0} />);
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('formats win rate as percentage', () => {
    render(<TradingMetricsGrid {...defaultProps} />);
    expect(screen.getByText('68%')).toBeInTheDocument();
  });

  it('shows N/A for null win rate', () => {
    render(<TradingMetricsGrid {...defaultProps} winRate={null} />);
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('shows correct P&L label for 30d window', () => {
    render(<TradingMetricsGrid {...defaultProps} pnlTimeWindow="30d" />);
    expect(screen.getByText('P&L (30D)')).toBeInTheDocument();
  });

  it('shows correct P&L label for all time window', () => {
    render(<TradingMetricsGrid {...defaultProps} pnlTimeWindow="all" />);
    expect(screen.getByText('P&L (All)')).toBeInTheDocument();
  });

  it('formats positions and trades count', () => {
    render(<TradingMetricsGrid {...defaultProps} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument();
  });

  it('handles large values with M suffix', () => {
    render(<TradingMetricsGrid {...defaultProps} totalDeposited={2500000} />);
    expect(screen.getByText('$2.50M')).toBeInTheDocument();
  });
});
