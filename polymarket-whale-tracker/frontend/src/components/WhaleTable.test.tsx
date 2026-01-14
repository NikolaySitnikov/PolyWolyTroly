/**
 * WhaleTable Component Tests
 *
 * TDD tests for the whale list/table component.
 * Desktop shows a table, mobile shows cards.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhaleTable } from './WhaleTable';
import type { Whale, WhaleWithTrading } from '../types/whale';

describe('WhaleTable Component', () => {
  const mockWhales: Whale[] = [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      totalDeposited: 150000,
      depositCount: 5,
    },
    {
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      firstSeenAt: '2026-01-02T00:00:00.000Z',
      totalDeposited: 75000,
      depositCount: 3,
    },
    {
      address: '0x9876543210fedcba9876543210fedcba98765432',
      firstSeenAt: '2026-01-03T00:00:00.000Z',
      totalDeposited: 250000,
      depositCount: 10,
    },
  ];

  const mockOnWhaleClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      expect(screen.getByTestId('whale-table')).toBeInTheDocument();
    });

    it('should display all whales', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Should show 3 whale rows
      const rows = screen.getAllByTestId(/^whale-row-/);
      expect(rows).toHaveLength(3);
    });

    it('should display whale addresses in shortened format', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Should show shortened address like 0x1234...5678
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    });

    it('should display total deposited in USD format', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Should show $150K format
      expect(screen.getByText('$150.0K')).toBeInTheDocument();
    });

    it('should display deposit count', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Desktop Table View', () => {
    it('should show table headers on desktop', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      expect(screen.getByText('Wallet')).toBeInTheDocument();
      expect(screen.getByText(/Deposited/)).toBeInTheDocument();
      expect(screen.getByText('P&L')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText(/Deposits/)).toBeInTheDocument();
      expect(screen.getByText(/First Seen/)).toBeInTheDocument();
    });

    it('should render as table on desktop', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Mobile Card View', () => {
    it('should render as cards on mobile', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Should not have a table element
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      // Should have card elements
      const cards = screen.getAllByTestId(/^whale-card-/);
      expect(cards).toHaveLength(3);
    });

    it('should show whale info in cards on mobile', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Cards should still show the address
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onWhaleClick when a row is clicked', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const firstRow = screen.getByTestId(
        'whale-row-0x1234567890abcdef1234567890abcdef12345678'
      );
      fireEvent.click(firstRow);
      expect(mockOnWhaleClick).toHaveBeenCalledWith(
        '0x1234567890abcdef1234567890abcdef12345678'
      );
    });

    it('should call onWhaleClick when a card is clicked on mobile', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const firstCard = screen.getByTestId(
        'whale-card-0x1234567890abcdef1234567890abcdef12345678'
      );
      fireEvent.click(firstCard);
      expect(mockOnWhaleClick).toHaveBeenCalledWith(
        '0x1234567890abcdef1234567890abcdef12345678'
      );
    });
  });

  describe('Sorting (Server-Side)', () => {
    const mockOnSortChange = vi.fn();

    beforeEach(() => {
      mockOnSortChange.mockClear();
    });

    it('should have sortable column headers', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
          onSortChange={mockOnSortChange}
        />
      );
      const totalDepositedHeader = screen.getByTestId('sort-totalDeposited');
      expect(totalDepositedHeader).toBeInTheDocument();
    });

    it('should call onSortChange when header is clicked', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
          sortBy="totalDeposited"
          sortDir="desc"
          onSortChange={mockOnSortChange}
        />
      );
      const totalDepositedHeader = screen.getByTestId('sort-totalDeposited');
      fireEvent.click(totalDepositedHeader);

      // Should toggle from desc to asc for same field
      expect(mockOnSortChange).toHaveBeenCalledWith('totalDeposited', 'asc');
    });

    it('should toggle sort direction on second click of same column', () => {
      const { rerender } = render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
          sortBy="totalDeposited"
          sortDir="desc"
          onSortChange={mockOnSortChange}
        />
      );
      const totalDepositedHeader = screen.getByTestId('sort-totalDeposited');

      // Click to request toggle to ascending
      fireEvent.click(totalDepositedHeader);
      expect(mockOnSortChange).toHaveBeenCalledWith('totalDeposited', 'asc');

      // Simulate parent updating the sort state
      rerender(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
          sortBy="totalDeposited"
          sortDir="asc"
          onSortChange={mockOnSortChange}
        />
      );

      // Click again to request toggle back to descending
      fireEvent.click(totalDepositedHeader);
      expect(mockOnSortChange).toHaveBeenCalledWith('totalDeposited', 'desc');
    });

    it('should call onSortChange with desc when clicking a different column', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
          sortBy="totalDeposited"
          sortDir="desc"
          onSortChange={mockOnSortChange}
        />
      );
      const depositCountHeader = screen.getByTestId('sort-depositCount');
      fireEvent.click(depositCountHeader);

      // Should default to desc when switching to a different column
      expect(mockOnSortChange).toHaveBeenCalledWith('depositCount', 'desc');
    });

    it('should display rows in the order provided (server determines order)', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Rows should be in the exact order as mockWhales array
      const rows = screen.getAllByTestId(/^whale-row-/);
      expect(rows[0]).toHaveAttribute(
        'data-testid',
        'whale-row-0x1234567890abcdef1234567890abcdef12345678'
      );
      expect(rows[1]).toHaveAttribute(
        'data-testid',
        'whale-row-0xabcdef1234567890abcdef1234567890abcdef12'
      );
      expect(rows[2]).toHaveAttribute(
        'data-testid',
        'whale-row-0x9876543210fedcba9876543210fedcba98765432'
      );
    });
  });

  describe('Search', () => {
    it('should have a search input', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should filter whales by address when searching', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const searchInput = screen.getByPlaceholderText(/search/i);
      // Use '9876' which only appears in one address
      fireEvent.change(searchInput, { target: { value: '9876' } });

      // Should only show the whale with 9876 in address
      const rows = screen.getAllByTestId(/^whale-row-/);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveAttribute(
        'data-testid',
        'whale-row-0x9876543210fedcba9876543210fedcba98765432'
      );
    });

    it('should show no results message when search has no matches', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText(/no whales found/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no whales', () => {
      render(
        <WhaleTable
          whales={[]}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      expect(screen.getByText(/no whales/i)).toBeInTheDocument();
    });
  });

  describe('LiveBadge Display', () => {
    const mockWhalesWithTrading: WhaleWithTrading[] = [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        totalDeposited: 150000,
        depositCount: 5,
        pnl: 25000,
        pnl7d: 5000,
        pnl30d: 15000,
        winRate: 68,
        portfolioValue: 125000,
        totalTrades: 42,
        lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        isLive: true,
      },
      {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        firstSeenAt: '2026-01-02T00:00:00.000Z',
        totalDeposited: 75000,
        depositCount: 3,
        pnl: -5000,
        pnl7d: -2000,
        pnl30d: -3000,
        winRate: 35,
        portfolioValue: 50000,
        totalTrades: 20,
        lastActivityAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
        isLive: false,
      },
    ];

    it('should display LiveBadge for live whales on desktop', () => {
      render(
        <WhaleTable
          whales={mockWhalesWithTrading}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // LiveBadge should be present for the live whale
      const liveBadges = screen.getAllByLabelText(/Active.*ago on Polymarket/);
      expect(liveBadges).toHaveLength(1);
    });

    it('should display LiveBadge for live whales on mobile', () => {
      render(
        <WhaleTable
          whales={mockWhalesWithTrading}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // LiveBadge should be present for the live whale
      const liveBadges = screen.getAllByLabelText(/Active.*ago on Polymarket/);
      expect(liveBadges).toHaveLength(1);
    });

    it('should not display LiveBadge for non-live whales', () => {
      const nonLiveWhales: WhaleWithTrading[] = [
        {
          ...mockWhalesWithTrading[1],
          isLive: false,
        },
      ];
      render(
        <WhaleTable
          whales={nonLiveWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // No LiveBadge should be present
      const liveBadges = screen.queryAllByLabelText(/Active.*ago on Polymarket/);
      expect(liveBadges).toHaveLength(0);
    });

    it('should work with mixed Whale and WhaleWithTrading types', () => {
      const mixedWhales = [
        mockWhales[1], // Regular Whale without trading data (different address)
        mockWhalesWithTrading[0], // WhaleWithTrading that is live
      ];
      render(
        <WhaleTable
          whales={mixedWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Only one LiveBadge for the whale with trading data
      const liveBadges = screen.getAllByLabelText(/Active.*ago on Polymarket/);
      expect(liveBadges).toHaveLength(1);
    });
  });

  describe('Trading Stats Display', () => {
    const mockWhalesWithTrading: WhaleWithTrading[] = [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        totalDeposited: 150000,
        depositCount: 5,
        pnl: 25000,
        pnl7d: 5000,
        pnl30d: 15000,
        winRate: 68,
        portfolioValue: 125000,
        totalTrades: 42,
        lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isLive: true,
      },
      {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        firstSeenAt: '2026-01-02T00:00:00.000Z',
        totalDeposited: 75000,
        depositCount: 3,
        pnl: -5000,
        pnl7d: -2000,
        pnl30d: -3000,
        winRate: 35,
        portfolioValue: 50000,
        totalTrades: 20,
        lastActivityAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        isLive: false,
      },
    ];

    it('should display P&L for whales with trading data on desktop', () => {
      render(
        <WhaleTable
          whales={mockWhalesWithTrading}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Should show P&L values - +$25K for profitable whale
      expect(screen.getByText('+$25.0K')).toBeInTheDocument();
      // Should show negative P&L - -$5K for losing whale
      expect(screen.getByText('-$5.0K')).toBeInTheDocument();
    });

    it('should display Win Rate for whales with trading data on desktop', () => {
      render(
        <WhaleTable
          whales={mockWhalesWithTrading}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Should show win rates
      expect(screen.getByText('68%')).toBeInTheDocument();
      expect(screen.getByText('35%')).toBeInTheDocument();
    });

    it('should display P&L in mobile cards', () => {
      render(
        <WhaleTable
          whales={mockWhalesWithTrading}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Should show P&L values in cards
      expect(screen.getByText('+$25.0K')).toBeInTheDocument();
      expect(screen.getByText('-$5.0K')).toBeInTheDocument();
    });

    it('should display Win Rate in mobile cards', () => {
      render(
        <WhaleTable
          whales={mockWhalesWithTrading}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Should show win rates in cards
      expect(screen.getByText('68%')).toBeInTheDocument();
      expect(screen.getByText('35%')).toBeInTheDocument();
    });

    it('should show dash for whales without trading data', () => {
      const mixedWhales = [
        mockWhales[0], // Regular whale without trading data
      ];
      render(
        <WhaleTable
          whales={mixedWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // P&L and Win Rate columns should show dash when no trading data
      const dashCells = screen.getAllByText('—');
      expect(dashCells.length).toBeGreaterThanOrEqual(2); // At least P&L and Win Rate
    });

    it('should use profit color for positive P&L', () => {
      render(
        <WhaleTable
          whales={[mockWhalesWithTrading[0]]}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const pnlElement = screen.getByText('+$25.0K');
      // Check for profit color (green)
      expect(pnlElement).toHaveStyle({ color: 'rgb(0, 255, 136)' });
    });

    it('should use loss color for negative P&L', () => {
      render(
        <WhaleTable
          whales={[mockWhalesWithTrading[1]]}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const pnlElement = screen.getByText('-$5.0K');
      // Check for loss color (red)
      expect(pnlElement).toHaveStyle({ color: 'rgb(255, 51, 102)' });
    });
  });

  describe('Styling', () => {
    it('should have hover effect on rows', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const firstRow = screen.getByTestId(
        'whale-row-0x1234567890abcdef1234567890abcdef12345678'
      );
      expect(firstRow).toHaveStyle({ cursor: 'pointer' });
    });

    it('should use surface background color', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const container = screen.getByTestId('whale-table');
      // tokens.colors.surface = '#12121a' = rgb(18, 18, 26)
      expect(container).toHaveStyle({ backgroundColor: 'rgb(18, 18, 26)' });
    });

    it('should have transition property on mobile cards for hover effects', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const firstCard = screen.getByTestId(
        'whale-card-0x1234567890abcdef1234567890abcdef12345678'
      );
      expect(firstCard.style.transition).toContain('all');
    });

    it('should have cursor pointer on mobile cards', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const firstCard = screen.getByTestId(
        'whale-card-0x1234567890abcdef1234567890abcdef12345678'
      );
      expect(firstCard).toHaveStyle({ cursor: 'pointer' });
    });

    it('should have red left border on mobile cards for losing whales (negative P&L)', () => {
      // Create a whale with negative P&L
      const losingWhale: WhaleWithTrading = {
        address: '0xloser1234567890abcdef1234567890abcdef12',
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        totalDeposited: 100000,
        depositCount: 5,
        pnl: -15000, // Negative P&L = losing
        pnl7d: -5000,
        pnl30d: -10000,
        winRate: 30,
        portfolioValue: 85000,
        totalTrades: 20,
        lastActivityAt: '2026-01-05T10:00:00.000Z',
        isLive: true,
      };
      render(
        <WhaleTable
          whales={[losingWhale]}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const card = screen.getByTestId(
        'whale-card-0xloser1234567890abcdef1234567890abcdef12'
      );
      // Should have 3px red left border (tokens.colors.loss = #ff3366 = rgb(255, 51, 102))
      expect(card).toHaveStyle({ borderLeft: '3px solid rgb(255, 51, 102)' });
    });

    it('should have green left border on mobile cards for profitable whales (positive P&L)', () => {
      // Create a whale with positive P&L
      const profitableWhale: WhaleWithTrading = {
        address: '0xwinner123456789abcdef1234567890abcdef12',
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        totalDeposited: 100000,
        depositCount: 5,
        pnl: 25000, // Positive P&L = profitable
        pnl7d: 10000,
        pnl30d: 20000,
        winRate: 70,
        portfolioValue: 125000,
        totalTrades: 30,
        lastActivityAt: '2026-01-05T10:00:00.000Z',
        isLive: true,
      };
      render(
        <WhaleTable
          whales={[profitableWhale]}
          isMobile={true}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const card = screen.getByTestId(
        'whale-card-0xwinner123456789abcdef1234567890abcdef12'
      );
      // Should have 3px green left border (tokens.colors.profit = #00ff88 = rgb(0, 255, 136))
      expect(card).toHaveStyle({ borderLeft: '3px solid rgb(0, 255, 136)' });
    });
  });
});
