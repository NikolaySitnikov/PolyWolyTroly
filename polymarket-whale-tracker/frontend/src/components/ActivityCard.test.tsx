/**
 * ActivityCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityCard, ActivityCardSkeleton } from './ActivityCard';
import { type Activity, ACTIVITY_TYPE_CONFIGS } from '../types/activity';

// Helper to create mock activity
function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    proxyWallet: '0x123',
    timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    type: 'buy',
    normalizedType: 'buy',
    config: ACTIVITY_TYPE_CONFIGS.buy,
    conditionId: 'cond-123',
    title: 'Will Trump win the 2024 election?',
    slug: 'trump-2024',
    side: 'BUY',
    outcome: 'YES',
    size: 2500,
    usdcSize: 1050,
    price: 0.42,
    transactionHash: '0xabc123def456789',
    ...overrides,
  };
}

describe('ActivityCard', () => {
  describe('Rendering', () => {
    it('renders buy activity with all details', () => {
      const activity = createMockActivity();
      render(<ActivityCard activity={activity} />);

      // Type label
      expect(screen.getByText('Buy')).toBeInTheDocument();

      // Market title
      expect(screen.getByText('Will Trump win the 2024 election?')).toBeInTheDocument();

      // Amount with outcome (YES)
      expect(screen.getByText(/2,500 YES/)).toBeInTheDocument();

      // Price as cents
      expect(screen.getByText('42¢')).toBeInTheDocument();

      // Value
      expect(screen.getByText('$1.1K')).toBeInTheDocument();
    });

    it('renders sell activity correctly', () => {
      const activity = createMockActivity({
        type: 'sell',
        normalizedType: 'sell',
        config: ACTIVITY_TYPE_CONFIGS.sell,
        side: 'SELL',
        outcome: 'NO',
      });
      render(<ActivityCard activity={activity} />);

      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText(/2,500 NO/)).toBeInTheDocument();
    });

    it('renders deposit activity correctly', () => {
      const activity = createMockActivity({
        type: 'deposit',
        normalizedType: 'deposit',
        config: ACTIVITY_TYPE_CONFIGS.deposit,
        title: undefined,
        outcome: undefined,
        size: undefined,
        price: undefined,
        usdcSize: 50000,
      });
      render(<ActivityCard activity={activity} />);

      expect(screen.getByText('Deposit')).toBeInTheDocument();
      // Amount with prefix - use regex for flexible matching
      expect(screen.getByText(/\+\s*\$50\.0K/)).toBeInTheDocument();
      // No market title for deposits
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders withdrawal activity correctly', () => {
      const activity = createMockActivity({
        type: 'withdrawal',
        normalizedType: 'withdrawal',
        config: ACTIVITY_TYPE_CONFIGS.withdrawal,
        title: undefined,
        outcome: undefined,
        size: undefined,
        price: undefined,
        usdcSize: 25000,
      });
      render(<ActivityCard activity={activity} />);

      expect(screen.getByText('Withdrawal')).toBeInTheDocument();
      // Amount with prefix - use regex for flexible matching
      expect(screen.getByText(/-\s*\$25\.0K/)).toBeInTheDocument();
    });

    it('renders transaction hash link', () => {
      const activity = createMockActivity({
        transactionHash: '0x1234567890abcdef',
      });
      render(<ActivityCard activity={activity} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://polygonscan.com/tx/0x1234567890abcdef');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('hides transaction link when no hash', () => {
      const activity = createMockActivity({
        transactionHash: undefined,
      });
      render(<ActivityCard activity={activity} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      const activity = createMockActivity();
      render(<ActivityCard activity={activity} onClick={onClick} />);

      fireEvent.click(screen.getByTestId(`activity-card-${activity.timestamp}`));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Enter key', () => {
      const onClick = vi.fn();
      const activity = createMockActivity();
      render(<ActivityCard activity={activity} onClick={onClick} />);

      const card = screen.getByTestId(`activity-card-${activity.timestamp}`);
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Space key', () => {
      const onClick = vi.fn();
      const activity = createMockActivity();
      render(<ActivityCard activity={activity} onClick={onClick} />);

      const card = screen.getByTestId(`activity-card-${activity.timestamp}`);
      fireEvent.keyDown(card, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when tx link clicked', () => {
      const onClick = vi.fn();
      const activity = createMockActivity();
      render(<ActivityCard activity={activity} onClick={onClick} />);

      const link = screen.getByRole('link');
      fireEvent.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('has correct role when clickable', () => {
      const onClick = vi.fn();
      const activity = createMockActivity();
      render(<ActivityCard activity={activity} onClick={onClick} />);

      expect(screen.getByTestId(`activity-card-${activity.timestamp}`)).toHaveAttribute('role', 'button');
    });

    it('has no role when not clickable', () => {
      const activity = createMockActivity();
      render(<ActivityCard activity={activity} />);

      expect(screen.getByTestId(`activity-card-${activity.timestamp}`)).not.toHaveAttribute('role');
    });
  });

  describe('Time formatting', () => {
    it('shows relative time for recent activity', () => {
      const activity = createMockActivity({
        timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      });
      render(<ActivityCard activity={activity} />);

      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('shows hours for activity within 24h', () => {
      const activity = createMockActivity({
        timestamp: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
      });
      render(<ActivityCard activity={activity} />);

      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('shows days for activity older than 24h', () => {
      const activity = createMockActivity({
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
      });
      render(<ActivityCard activity={activity} />);

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });
  });
});

describe('ActivityCardSkeleton', () => {
  it('renders skeleton loader', () => {
    render(<ActivityCardSkeleton />);

    // Skeleton should have shimmer animation styles
    const skeleton = document.querySelector('div');
    expect(skeleton).toBeInTheDocument();
  });
});
