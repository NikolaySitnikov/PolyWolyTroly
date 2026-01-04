/**
 * WhaleTable Component Tests
 *
 * TDD tests for the whale list/table component.
 * Desktop shows a table, mobile shows cards.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhaleTable } from './WhaleTable';
import type { Whale } from '../types/whale';

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
      expect(screen.getByText(/Total Deposited/)).toBeInTheDocument();
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

  describe('Sorting', () => {
    it('should have sortable column headers', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const totalDepositedHeader = screen.getByTestId('sort-totalDeposited');
      expect(totalDepositedHeader).toBeInTheDocument();
    });

    it('should sort by total deposited when header is clicked', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      // Default sort is by totalDeposited desc, so highest ($250K) should be first
      const rows = screen.getAllByTestId(/^whale-row-/);
      expect(rows[0]).toHaveAttribute(
        'data-testid',
        'whale-row-0x9876543210fedcba9876543210fedcba98765432'
      );
    });

    it('should toggle sort direction on second click', () => {
      render(
        <WhaleTable
          whales={mockWhales}
          isMobile={false}
          onWhaleClick={mockOnWhaleClick}
        />
      );
      const totalDepositedHeader = screen.getByTestId('sort-totalDeposited');

      // Click to toggle to ascending (lowest first)
      fireEvent.click(totalDepositedHeader);

      const rows = screen.getAllByTestId(/^whale-row-/);
      // After click, lowest should be first ($75K)
      expect(rows[0]).toHaveAttribute(
        'data-testid',
        'whale-row-0xabcdef1234567890abcdef1234567890abcdef12'
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
        'whale-row-0x9876543210fedcba9876543210fedcba98765432'
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
        'whale-card-0x9876543210fedcba9876543210fedcba98765432'
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
        'whale-card-0x9876543210fedcba9876543210fedcba98765432'
      );
      expect(firstCard).toHaveStyle({ cursor: 'pointer' });
    });
  });
});
