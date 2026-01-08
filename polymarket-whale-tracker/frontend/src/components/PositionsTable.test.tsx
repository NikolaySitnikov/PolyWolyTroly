/**
 * PositionsTable Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PositionsTable } from './PositionsTable';
import type { Position } from '../types/position';

describe('PositionsTable', () => {
  const mockPositions: Position[] = [
    {
      conditionId: 'cond1',
      asset: 'asset1',
      outcomeIndex: 0,
      outcome: 'Yes',
      title: 'Will Trump win the 2024 election?',
      slug: 'will-trump-win',
      eventSlug: 'trump-2024',
      size: 1000,
      avgPrice: 0.42,
      currentPrice: 0.58,
      initialValue: 420,
      currentValue: 580,
      pnl: 160,
      pnlPercent: 38.1,
      isActive: true,
      category: 'Politics',
      endDate: '2024-11-05T00:00:00Z',
      normalizedOutcome: 'YES',
      status: 'active',
      normalizedCategory: 'politics',
    },
    {
      conditionId: 'cond2',
      asset: 'asset2',
      outcomeIndex: 1,
      outcome: 'No',
      title: 'Will BTC hit $100K by end of 2024?',
      slug: 'btc-100k',
      eventSlug: 'btc-price-2024',
      size: 800,
      avgPrice: 0.65,
      currentPrice: 0.52,
      initialValue: 520,
      currentValue: 416,
      pnl: -104,
      pnlPercent: -20,
      isActive: true,
      category: 'Crypto',
      endDate: '2024-12-31T00:00:00Z',
      normalizedOutcome: 'NO',
      status: 'active',
      normalizedCategory: 'crypto',
    },
    {
      conditionId: 'cond3',
      asset: 'asset3',
      outcomeIndex: 0,
      outcome: 'Yes',
      title: 'Will the Fed cut rates in March 2024?',
      slug: 'fed-rates',
      eventSlug: 'fed-march-2024',
      size: 500,
      avgPrice: 0.3,
      currentPrice: 0.45,
      initialValue: 150,
      currentValue: 225,
      pnl: 75,
      pnlPercent: 50,
      isActive: false,
      category: 'Finance',
      endDate: '2024-03-20T00:00:00Z',
      normalizedOutcome: 'YES',
      status: 'resolved',
      normalizedCategory: 'finance',
    },
  ];

  it('renders positions table', () => {
    render(<PositionsTable positions={mockPositions} />);

    expect(screen.getByTestId('positions-table')).toBeInTheDocument();
  });

  it('displays all position titles', () => {
    render(<PositionsTable positions={mockPositions} />);

    expect(screen.getByText('Will Trump win the 2024 election?')).toBeInTheDocument();
    expect(screen.getByText('Will BTC hit $100K by end of 2024?')).toBeInTheDocument();
    expect(screen.getByText('Will the Fed cut rates in March 2024?')).toBeInTheDocument();
  });

  it('displays column headers', () => {
    render(<PositionsTable positions={mockPositions} />);

    expect(screen.getByText('Market')).toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Avg')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('P&L')).toBeInTheDocument();
  });

  it('displays outcomes (YES/NO)', () => {
    render(<PositionsTable positions={mockPositions} />);

    expect(screen.getAllByText('YES')).toHaveLength(2);
    expect(screen.getByText('NO')).toBeInTheDocument();
  });

  it('displays formatted prices', () => {
    render(<PositionsTable positions={mockPositions} />);

    expect(screen.getByText('42¢')).toBeInTheDocument();
    expect(screen.getByText('58¢')).toBeInTheDocument();
  });

  it('displays formatted P&L', () => {
    render(<PositionsTable positions={mockPositions} />);

    expect(screen.getByText('+$160')).toBeInTheDocument();
    expect(screen.getByText('-$104')).toBeInTheDocument();
  });

  it('displays empty state when no positions', () => {
    render(<PositionsTable positions={[]} />);

    expect(screen.getByTestId('positions-table-empty')).toBeInTheDocument();
    expect(screen.getByText('No positions found')).toBeInTheDocument();
  });

  it('calls onPositionClick when row is clicked', () => {
    const onClick = vi.fn();
    render(<PositionsTable positions={mockPositions} onPositionClick={onClick} />);

    fireEvent.click(screen.getByTestId('position-row-cond1'));

    expect(onClick).toHaveBeenCalledWith(mockPositions[0]);
  });

  it('sorts positions by P&L by default (desc)', () => {
    render(<PositionsTable positions={mockPositions} />);

    const rows = screen.getAllByTestId(/position-row-/);
    // Default sort by P&L desc: cond1 (+160) > cond3 (+75) > cond2 (-104)
    expect(rows[0]).toHaveAttribute('data-testid', 'position-row-cond1');
    expect(rows[1]).toHaveAttribute('data-testid', 'position-row-cond3');
    expect(rows[2]).toHaveAttribute('data-testid', 'position-row-cond2');
  });

  it('toggles sort direction when clicking same column', () => {
    render(<PositionsTable positions={mockPositions} />);

    // Click P&L header to toggle to asc
    fireEvent.click(screen.getByText('P&L'));

    const rows = screen.getAllByTestId(/position-row-/);
    // After toggle to asc: cond2 (-104) < cond3 (+75) < cond1 (+160)
    expect(rows[0]).toHaveAttribute('data-testid', 'position-row-cond2');
    expect(rows[1]).toHaveAttribute('data-testid', 'position-row-cond3');
    expect(rows[2]).toHaveAttribute('data-testid', 'position-row-cond1');
  });

  it('sorts by size when clicking Size header', () => {
    render(<PositionsTable positions={mockPositions} />);

    fireEvent.click(screen.getByText('Size'));

    const rows = screen.getAllByTestId(/position-row-/);
    // Sort by currentValue desc: cond1 (580) > cond2 (416) > cond3 (225)
    expect(rows[0]).toHaveAttribute('data-testid', 'position-row-cond1');
    expect(rows[1]).toHaveAttribute('data-testid', 'position-row-cond2');
    expect(rows[2]).toHaveAttribute('data-testid', 'position-row-cond3');
  });

  it('displays category tags', () => {
    render(<PositionsTable positions={mockPositions} />);

    expect(screen.getByTestId('category-tag-politics')).toBeInTheDocument();
    expect(screen.getByTestId('category-tag-crypto')).toBeInTheDocument();
    expect(screen.getByTestId('category-tag-finance')).toBeInTheDocument();
  });

  it('shows pagination when positions exceed items per page', () => {
    const manyPositions = Array.from({ length: 15 }, (_, i) => ({
      ...mockPositions[0],
      conditionId: `cond${i}`,
      title: `Market ${i}`,
    }));

    render(<PositionsTable positions={manyPositions} itemsPerPage={10} />);

    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByText('1-10')).toBeInTheDocument();
  });

  it('does not show pagination when positions are less than items per page', () => {
    render(<PositionsTable positions={mockPositions} itemsPerPage={10} />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('displays loading skeleton when loading', () => {
    render(<PositionsTable positions={[]} loading />);

    expect(screen.getByTestId('positions-table')).toBeInTheDocument();
    // Skeleton rows are rendered
  });
});
