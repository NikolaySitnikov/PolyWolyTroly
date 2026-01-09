/**
 * ActivityHistoryTable Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ActivityHistoryTable } from './ActivityHistoryTable';
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

// Create a set of diverse activities for testing
function createMockActivities(): Activity[] {
  const now = Date.now();
  return [
    createMockActivity({
      timestamp: now - 1000 * 60 * 5, // 5 min ago
      normalizedType: 'buy',
      config: ACTIVITY_TYPE_CONFIGS.buy,
      usdcSize: 5000,
    }),
    createMockActivity({
      timestamp: now - 1000 * 60 * 60, // 1 hour ago
      normalizedType: 'sell',
      config: ACTIVITY_TYPE_CONFIGS.sell,
      side: 'SELL',
      outcome: 'NO',
      usdcSize: 3000,
    }),
    createMockActivity({
      timestamp: now - 1000 * 60 * 60 * 2, // 2 hours ago
      normalizedType: 'deposit',
      config: ACTIVITY_TYPE_CONFIGS.deposit,
      title: undefined,
      outcome: undefined,
      size: undefined,
      price: undefined,
      usdcSize: 50000,
      transactionHash: '0xdeposit123',
    }),
    createMockActivity({
      timestamp: now - 1000 * 60 * 60 * 24, // 1 day ago
      normalizedType: 'withdrawal',
      config: ACTIVITY_TYPE_CONFIGS.withdrawal,
      title: undefined,
      outcome: undefined,
      size: undefined,
      price: undefined,
      usdcSize: 10000,
      transactionHash: '0xwithdrawal456',
    }),
  ];
}

describe('ActivityHistoryTable', () => {
  describe('Rendering', () => {
    it('renders table with activities', () => {
      const activities = createMockActivities();
      render(<ActivityHistoryTable activities={activities} />);

      expect(screen.getByTestId('activity-history-table')).toBeInTheDocument();
      // Check table headers
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Market')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
    });

    it('renders filter pills', () => {
      const activities = createMockActivities();
      render(<ActivityHistoryTable activities={activities} />);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Deposits')).toBeInTheDocument();
      expect(screen.getByText('Trades')).toBeInTheDocument();
      expect(screen.getByText('Buys')).toBeInTheDocument();
      expect(screen.getByText('Sells')).toBeInTheDocument();
    });

    it('renders activity type badges correctly', () => {
      const activities = createMockActivities();
      render(<ActivityHistoryTable activities={activities} />);

      expect(screen.getByText('Buy')).toBeInTheDocument();
      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Deposit')).toBeInTheDocument();
      expect(screen.getByText('Withdrawal')).toBeInTheDocument();
    });

    it('renders empty state when no activities', () => {
      render(<ActivityHistoryTable activities={[]} />);

      expect(screen.getByTestId('activity-table-empty')).toBeInTheDocument();
      expect(screen.getByText('No activity found')).toBeInTheDocument();
      expect(screen.getByText('This whale has no transaction history yet')).toBeInTheDocument();
    });

    it('renders loading skeletons', () => {
      render(<ActivityHistoryTable activities={[]} loading />);

      // Table should still exist during loading
      expect(screen.getByTestId('activity-history-table')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('calls onFilterChange when filter is clicked', () => {
      const onFilterChange = vi.fn();
      const activities = createMockActivities();
      render(
        <ActivityHistoryTable
          activities={activities}
          filter="all"
          onFilterChange={onFilterChange}
        />
      );

      fireEvent.click(screen.getByText('Buys'));
      expect(onFilterChange).toHaveBeenCalledWith('buys');
    });

    it('shows correct empty message for filtered results', () => {
      render(
        <ActivityHistoryTable
          activities={[]}
          filter="buys"
        />
      );

      expect(screen.getByText(/no buys found/i)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts by time by default (most recent first)', () => {
      const activities = createMockActivities();
      render(<ActivityHistoryTable activities={activities} />);

      // The first row should be the most recent activity (5 min ago)
      const rows = screen.getAllByTestId(/activity-row-/);
      expect(rows.length).toBe(4);
    });

    it('toggles sort direction when clicking same header', () => {
      const activities = createMockActivities();
      render(<ActivityHistoryTable activities={activities} />);

      // Click Time header (already active with ↓)
      const timeHeader = screen.getByText('Time');

      // Initially sorted descending
      const initialHeaderCell = timeHeader.closest('th');
      expect(within(initialHeaderCell!).getByText('↓')).toBeInTheDocument();

      // Click to toggle direction
      fireEvent.click(timeHeader);

      // Should now show ascending indicator
      expect(within(initialHeaderCell!).getByText('↑')).toBeInTheDocument();
    });

    it('can sort by Value', () => {
      const activities = createMockActivities();
      render(<ActivityHistoryTable activities={activities} />);

      const valueHeader = screen.getByText('Value');
      fireEvent.click(valueHeader);

      // Should show sort indicator on Value
      const headerCell = valueHeader.closest('th');
      expect(within(headerCell!).getByText('↓')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows pagination when items exceed page size', () => {
      // Create more activities than default page size
      const activities = Array.from({ length: 25 }, (_, i) =>
        createMockActivity({
          timestamp: Date.now() - 1000 * 60 * i,
          transactionHash: `0x${i.toString().padStart(40, '0')}`,
        })
      );

      render(<ActivityHistoryTable activities={activities} itemsPerPage={10} />);

      // Should have pagination - check for next page button
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('does not show pagination for small activity lists', () => {
      const activities = createMockActivities(); // 4 items
      render(<ActivityHistoryTable activities={activities} itemsPerPage={10} />);

      // Should not have pagination buttons
      expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onActivityClick when row is clicked', () => {
      const onActivityClick = vi.fn();
      const activities = createMockActivities();
      render(
        <ActivityHistoryTable
          activities={activities}
          onActivityClick={onActivityClick}
        />
      );

      const rows = screen.getAllByTestId(/activity-row-/);
      fireEvent.click(rows[0]);
      expect(onActivityClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onActivityClick when tx link is clicked', () => {
      const onActivityClick = vi.fn();
      const activities = createMockActivities();
      render(
        <ActivityHistoryTable
          activities={activities}
          onActivityClick={onActivityClick}
        />
      );

      const links = screen.getAllByRole('link');
      fireEvent.click(links[0]);
      expect(onActivityClick).not.toHaveBeenCalled();
    });

    it('renders polygonscan links correctly', () => {
      const activities = [
        createMockActivity({ transactionHash: '0x1234567890abcdef' }),
      ];
      render(<ActivityHistoryTable activities={activities} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://polygonscan.com/tx/0x1234567890abcdef');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('Value formatting', () => {
    it('shows + prefix for deposits', () => {
      const activities = [
        createMockActivity({
          normalizedType: 'deposit',
          config: ACTIVITY_TYPE_CONFIGS.deposit,
          usdcSize: 50000,
          title: undefined,
        }),
      ];
      render(<ActivityHistoryTable activities={activities} />);

      // Should have + prefix for deposit value
      expect(screen.getByText(/\+\$50\.0K/)).toBeInTheDocument();
    });

    it('shows - prefix for withdrawals', () => {
      const activities = [
        createMockActivity({
          normalizedType: 'withdrawal',
          config: ACTIVITY_TYPE_CONFIGS.withdrawal,
          usdcSize: 25000,
          title: undefined,
        }),
      ];
      render(<ActivityHistoryTable activities={activities} />);

      // Should have - prefix for withdrawal value
      expect(screen.getByText(/-\$25\.0K/)).toBeInTheDocument();
    });

    it('shows price in cents for trades', () => {
      const activities = [
        createMockActivity({ price: 0.42 }),
      ];
      render(<ActivityHistoryTable activities={activities} />);

      expect(screen.getByText('42¢')).toBeInTheDocument();
    });

    it('shows dash for missing values', () => {
      const activities = [
        createMockActivity({
          normalizedType: 'deposit',
          config: ACTIVITY_TYPE_CONFIGS.deposit,
          price: undefined,
          size: undefined,
          title: undefined,
        }),
      ];
      render(<ActivityHistoryTable activities={activities} />);

      // Should show dashes for market and price columns
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });
});
