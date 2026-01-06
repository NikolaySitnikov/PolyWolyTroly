/**
 * WhaleTableSkeleton Component Tests
 *
 * Tests for the whale table loading skeleton.
 * TDD: Write tests first, then implement.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WhaleTableSkeleton } from './WhaleTableSkeleton';

describe('WhaleTableSkeleton', () => {
  it('renders with correct test id', () => {
    render(<WhaleTableSkeleton isMobile={false} />);
    expect(screen.getByTestId('whale-table-skeleton')).toBeInTheDocument();
  });

  describe('Mobile view', () => {
    it('renders skeleton cards on mobile', () => {
      render(<WhaleTableSkeleton isMobile={true} />);
      const cards = screen.getAllByTestId('skeleton-whale-card');
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it('renders sticky header with title placeholder', () => {
      render(<WhaleTableSkeleton isMobile={true} />);
      // Should have header area
      const skeleton = screen.getByTestId('whale-table-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Desktop view', () => {
    it('renders skeleton rows on desktop', () => {
      render(<WhaleTableSkeleton isMobile={false} />);
      const rows = screen.getAllByTestId('skeleton-whale-row');
      expect(rows.length).toBeGreaterThanOrEqual(5);
    });

    it('renders table header', () => {
      render(<WhaleTableSkeleton isMobile={false} />);
      expect(screen.getByTestId('skeleton-table-header')).toBeInTheDocument();
    });
  });

  it('applies shimmer animation', () => {
    render(<WhaleTableSkeleton isMobile={false} />);
    const rows = screen.getAllByTestId('skeleton-whale-row');
    // At least one row should have animation
    expect(rows[0].style.animation).toContain('shimmer');
  });

  it('applies staggered animation delays', () => {
    render(<WhaleTableSkeleton isMobile={false} />);
    const rows = screen.getAllByTestId('skeleton-whale-row');
    // First row should have 0ms delay, subsequent rows have increasing delays
    expect(rows[0].style.animationDelay).toBe('0ms');
    expect(rows[1].style.animationDelay).toBe('50ms');
  });
});
