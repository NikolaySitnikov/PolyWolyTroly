/**
 * WhaleOfTheDay Component Tests
 *
 * @see ./WhaleOfTheDay.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhaleOfTheDay } from './WhaleOfTheDay';

// Mock the useWhaleOfTheDay hook
vi.mock('../hooks/useWhaleOfTheDay', () => ({
  useWhaleOfTheDay: vi.fn(),
}));

import { useWhaleOfTheDay } from '../hooks/useWhaleOfTheDay';

const mockTopWhale = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  totalToday: 800000, // $800K
  depositCount: 2,
  largestDeposit: 500000, // $500K
};

describe('WhaleOfTheDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders the component when topWhale exists', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      expect(screen.getByTestId('whale-of-the-day')).toBeInTheDocument();
    });

    it('renders loading skeleton when loading', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: null,
        loading: true,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      expect(screen.getByTestId('whale-of-the-day-loading')).toBeInTheDocument();
    });

    it('renders nothing when no whale found and not loading', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: null,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      expect(screen.queryByTestId('whale-of-the-day')).not.toBeInTheDocument();
      expect(screen.queryByTestId('whale-of-the-day-loading')).not.toBeInTheDocument();
    });

    it('displays total deposited today in micro view', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      expect(screen.getByText('$800K')).toBeInTheDocument();
    });

    it('shows crown emoji', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      expect(screen.getByText('👑')).toBeInTheDocument();
    });
  });

  describe('expand/collapse behavior', () => {
    it('starts in collapsed state', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');
      expect(badge).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands on click', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.click(badge);
      expect(badge).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses on second click', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.click(badge);
      expect(badge).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(badge);
      expect(badge).toHaveAttribute('aria-expanded', 'false');
    });

    it('shows wallet address when expanded', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.click(badge);
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    });

    it('shows deposit count when expanded', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.click(badge);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows largest deposit when expanded', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.click(badge);
      expect(screen.getByText('$500K')).toBeInTheDocument();
    });

    it('shows View Profile button when expanded', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.click(badge);
      expect(screen.getByText('View Profile →')).toBeInTheDocument();
    });

    it('shows close button when expanded', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.click(badge);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('closes when close button is clicked', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.click(badge);
      expect(badge).toHaveAttribute('aria-expanded', 'true');

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      expect(badge).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('interactions', () => {
    it('calls onViewProfile when View Profile button is clicked', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      const onViewProfile = vi.fn();
      render(<WhaleOfTheDay isMobile={false} onViewProfile={onViewProfile} />);

      const badge = screen.getByTestId('whale-of-the-day');

      // First expand
      fireEvent.click(badge);
      expect(onViewProfile).not.toHaveBeenCalled();

      // Click View Profile button
      const viewProfileButton = screen.getByText('View Profile →');
      fireEvent.click(viewProfileButton);
      expect(onViewProfile).toHaveBeenCalledWith(
        '0x1234567890abcdef1234567890abcdef12345678'
      );
    });

    it('expands on Enter key', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.keyDown(badge, { key: 'Enter' });
      expect(badge).toHaveAttribute('aria-expanded', 'true');
    });

    it('expands on Space key', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');

      fireEvent.keyDown(badge, { key: ' ' });
      expect(badge).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('responsive behavior', () => {
    it('renders in mobile layout', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={true} />);
      expect(screen.getByTestId('whale-of-the-day')).toBeInTheDocument();
    });

    it('renders in desktop layout', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      expect(screen.getByTestId('whale-of-the-day')).toBeInTheDocument();
    });
  });

  describe('formatting', () => {
    it('formats millions correctly', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: { ...mockTopWhale, totalToday: 2500000 },
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      expect(screen.getByText('$2.5M')).toBeInTheDocument();
    });

    it('formats thousands correctly', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: { ...mockTopWhale, totalToday: 250000 },
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      expect(screen.getByText('$250K')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has button role', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');
      expect(badge).toHaveAttribute('role', 'button');
    });

    it('is focusable', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');
      expect(badge).toHaveAttribute('tabIndex', '0');
    });

    it('has descriptive aria-label', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');
      expect(badge.getAttribute('aria-label')).toContain('Whale of the Day');
      expect(badge.getAttribute('aria-label')).toContain('$800K');
    });

    it('has aria-expanded attribute', () => {
      vi.mocked(useWhaleOfTheDay).mockReturnValue({
        topWhale: mockTopWhale,
        loading: false,
        refetch: vi.fn(),
      });

      render(<WhaleOfTheDay isMobile={false} />);
      const badge = screen.getByTestId('whale-of-the-day');
      expect(badge).toHaveAttribute('aria-expanded');
    });
  });
});
