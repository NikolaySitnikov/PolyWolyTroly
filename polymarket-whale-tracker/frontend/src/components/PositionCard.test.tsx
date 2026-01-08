/**
 * PositionCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PositionCard } from './PositionCard';
import { mockPosition } from '../test/mockFactories';

describe('PositionCard', () => {
  const testPosition = mockPosition({
    conditionId: 'cond123',
    asset: 'asset123',
    outcomeIndex: 0,
    outcome: 'Yes',
    title: 'Will Trump win the 2024 election?',
    slug: 'will-trump-win',
    eventSlug: 'trump-2024',
    size: 1000,
    avgPrice: 0.42,
    curPrice: 0.58,
    currentPrice: 0.58,
    initialValue: 420,
    currentValue: 580,
    cashPnl: 160,
    pnl: 160,
    percentPnl: 38.1,
    pnlPercent: 38.1,
    isActive: true,
    category: 'Politics',
    endDate: '2024-11-05T00:00:00Z',
    normalizedOutcome: 'YES',
    status: 'active',
    normalizedCategory: 'politics',
  });

  it('renders position card with market title', () => {
    render(<PositionCard position={testPosition} />);

    expect(screen.getByText('Will Trump win the 2024 election?')).toBeInTheDocument();
  });

  it('displays category tag', () => {
    render(<PositionCard position={testPosition} />);

    expect(screen.getByTestId('category-tag-politics')).toBeInTheDocument();
  });

  it('displays active status badge', () => {
    render(<PositionCard position={testPosition} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays resolved status badge for resolved positions', () => {
    const resolvedPosition = { ...testPosition, status: 'resolved' as const };
    render(<PositionCard position={resolvedPosition} />);

    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('displays outcome (YES/NO)', () => {
    render(<PositionCard position={testPosition} />);

    expect(screen.getByText('YES')).toBeInTheDocument();
  });

  it('displays NO outcome for NO positions', () => {
    const noPosition = { ...testPosition, normalizedOutcome: 'NO' as const };
    render(<PositionCard position={noPosition} />);

    expect(screen.getByText('NO')).toBeInTheDocument();
  });

  it('displays average price', () => {
    render(<PositionCard position={testPosition} />);

    expect(screen.getByText('42¢')).toBeInTheDocument();
  });

  it('displays current price', () => {
    render(<PositionCard position={testPosition} />);

    expect(screen.getByText('58¢')).toBeInTheDocument();
  });

  it('displays positive P&L with + prefix', () => {
    render(<PositionCard position={testPosition} />);

    expect(screen.getByText('+$160')).toBeInTheDocument();
  });

  it('displays negative P&L with - prefix', () => {
    const losingPosition = { ...testPosition, pnl: -250 };
    render(<PositionCard position={losingPosition} />);

    expect(screen.getByText('-$250')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<PositionCard position={testPosition} />);

    expect(screen.getByText('$580')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PositionCard position={testPosition} onClick={onClick} />);

    const card = screen.getByTestId('position-card-cond123');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has button role when onClick is provided', () => {
    const onClick = vi.fn();
    render(<PositionCard position={testPosition} onClick={onClick} />);

    const card = screen.getByTestId('position-card-cond123');
    expect(card).toHaveAttribute('role', 'button');
  });

  it('does not have button role when onClick is not provided', () => {
    render(<PositionCard position={testPosition} />);

    const card = screen.getByTestId('position-card-cond123');
    expect(card).not.toHaveAttribute('role');
  });

  it('handles keyboard navigation when onClick is provided', () => {
    const onClick = vi.fn();
    render(<PositionCard position={testPosition} onClick={onClick} />);

    const card = screen.getByTestId('position-card-cond123');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('includes Polymarket link', () => {
    render(<PositionCard position={testPosition} />);

    const link = screen.getByRole('link', { name: /view on polymarket/i });
    expect(link).toHaveAttribute('href', 'https://polymarket.com/event/trump-2024');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('formats large USD values with K suffix', () => {
    const largePosition = { ...testPosition, currentValue: 12500, pnl: 3800 };
    render(<PositionCard position={largePosition} />);

    expect(screen.getByText('$12.5K')).toBeInTheDocument();
    expect(screen.getByText('+$3.8K')).toBeInTheDocument();
  });

  it('formats million USD values with M suffix', () => {
    const millionPosition = { ...testPosition, currentValue: 1500000, pnl: 250000 };
    render(<PositionCard position={millionPosition} />);

    expect(screen.getByText('$1.50M')).toBeInTheDocument();
    expect(screen.getByText('+$250.0K')).toBeInTheDocument();
  });
});
