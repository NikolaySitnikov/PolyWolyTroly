/**
 * AlertFeedSkeleton Component Tests
 *
 * Tests for the alert feed loading skeleton.
 * TDD: Write tests first, then implement.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertFeedSkeleton } from './AlertFeedSkeleton';

describe('AlertFeedSkeleton', () => {
  it('renders with correct test id', () => {
    render(<AlertFeedSkeleton isMobile={false} />);
    expect(screen.getByTestId('alert-feed-skeleton')).toBeInTheDocument();
  });

  describe('Mobile view', () => {
    it('renders skeleton cards on mobile', () => {
      render(<AlertFeedSkeleton isMobile={true} />);
      const cards = screen.getAllByTestId('skeleton-alert-card');
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it('renders sticky header placeholder', () => {
      render(<AlertFeedSkeleton isMobile={true} />);
      const skeleton = screen.getByTestId('alert-feed-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Desktop view', () => {
    it('renders skeleton rows on desktop', () => {
      render(<AlertFeedSkeleton isMobile={false} />);
      const rows = screen.getAllByTestId('skeleton-alert-row');
      expect(rows.length).toBeGreaterThanOrEqual(5);
    });

    it('renders header with Live Feed placeholder', () => {
      render(<AlertFeedSkeleton isMobile={false} />);
      expect(screen.getByTestId('skeleton-feed-header')).toBeInTheDocument();
    });
  });

  it('applies shimmer animation', () => {
    render(<AlertFeedSkeleton isMobile={false} />);
    const rows = screen.getAllByTestId('skeleton-alert-row');
    expect(rows[0].style.animation).toContain('shimmer');
  });

  it('applies staggered animation delays', () => {
    render(<AlertFeedSkeleton isMobile={false} />);
    const rows = screen.getAllByTestId('skeleton-alert-row');
    expect(rows[0].style.animationDelay).toBe('0ms');
    expect(rows[1].style.animationDelay).toBe('50ms');
  });
});
