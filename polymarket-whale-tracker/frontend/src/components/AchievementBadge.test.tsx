/**
 * AchievementBadge Component Tests
 *
 * Tests for whale achievement badges display.
 * Per DESIGN_IMPLEMENTATION_ROADMAP.md:
 * - 🥇 top depositor
 * - 🔥 hot streak
 * - 🆕 first-timer
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementBadge, AchievementBadges, type AchievementType } from './AchievementBadge';

describe('AchievementBadge', () => {
  describe('Individual Badge Rendering', () => {
    it('renders top depositor badge', () => {
      render(<AchievementBadge type="top-depositor" />);
      const badge = screen.getByTestId('achievement-badge-top-depositor');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('🥇');
    });

    it('renders hot streak badge', () => {
      render(<AchievementBadge type="hot-streak" />);
      const badge = screen.getByTestId('achievement-badge-hot-streak');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('🔥');
    });

    it('renders first timer badge', () => {
      render(<AchievementBadge type="first-timer" />);
      const badge = screen.getByTestId('achievement-badge-first-timer');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('🆕');
    });

    it('renders whale badge', () => {
      render(<AchievementBadge type="whale" />);
      const badge = screen.getByTestId('achievement-badge-whale');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('🐋');
    });

    it('renders mega whale badge', () => {
      render(<AchievementBadge type="mega-whale" />);
      const badge = screen.getByTestId('achievement-badge-mega-whale');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('🐋');
    });
  });

  describe('Styling', () => {
    it('applies correct colors per badge type', () => {
      const { rerender } = render(<AchievementBadge type="top-depositor" />);
      let badge = screen.getByTestId('achievement-badge-top-depositor');
      // Gold color for top depositor
      expect(badge).toHaveStyle({ backgroundColor: expect.stringContaining('255') });

      rerender(<AchievementBadge type="hot-streak" />);
      badge = screen.getByTestId('achievement-badge-hot-streak');
      // Red/orange for hot streak
      expect(badge).toBeInTheDocument();
    });

    it('has accessible tooltip/aria-label', () => {
      render(<AchievementBadge type="top-depositor" />);
      const badge = screen.getByTestId('achievement-badge-top-depositor');
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Top'));
    });

    it('has correct size (small variant)', () => {
      render(<AchievementBadge type="top-depositor" size="sm" />);
      const badge = screen.getByTestId('achievement-badge-top-depositor');
      expect(badge).toHaveStyle({ width: '20px', height: '20px' });
    });

    it('has correct size (medium variant)', () => {
      render(<AchievementBadge type="top-depositor" size="md" />);
      const badge = screen.getByTestId('achievement-badge-top-depositor');
      expect(badge).toHaveStyle({ width: '28px', height: '28px' });
    });

    it('has correct size (large variant)', () => {
      render(<AchievementBadge type="top-depositor" size="lg" />);
      const badge = screen.getByTestId('achievement-badge-top-depositor');
      expect(badge).toHaveStyle({ width: '36px', height: '36px' });
    });
  });

  describe('Badge Ranks', () => {
    it('shows rank number when provided', () => {
      render(<AchievementBadge type="top-depositor" rank={1} />);
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    it('does not show rank when not provided', () => {
      render(<AchievementBadge type="top-depositor" />);
      expect(screen.queryByText(/#\d/)).not.toBeInTheDocument();
    });
  });
});

describe('AchievementBadges', () => {
  it('renders multiple badges', () => {
    const achievements: AchievementType[] = ['top-depositor', 'hot-streak'];
    render(<AchievementBadges achievements={achievements} />);

    expect(screen.getByTestId('achievement-badge-top-depositor')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-badge-hot-streak')).toBeInTheDocument();
  });

  it('renders empty when no achievements', () => {
    render(<AchievementBadges achievements={[]} />);
    const container = screen.getByTestId('achievement-badges');
    expect(container.children).toHaveLength(0);
  });

  it('limits displayed badges with maxVisible prop', () => {
    const achievements: AchievementType[] = ['top-depositor', 'hot-streak', 'first-timer', 'whale'];
    render(<AchievementBadges achievements={achievements} maxVisible={2} />);

    expect(screen.getByTestId('achievement-badge-top-depositor')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-badge-hot-streak')).toBeInTheDocument();
    expect(screen.queryByTestId('achievement-badge-first-timer')).not.toBeInTheDocument();
    // Should show "+2" overflow indicator
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('applies gap between badges', () => {
    const achievements: AchievementType[] = ['top-depositor', 'hot-streak'];
    render(<AchievementBadges achievements={achievements} />);
    const container = screen.getByTestId('achievement-badges');
    expect(container).toHaveStyle({ gap: '4px' });
  });
});
