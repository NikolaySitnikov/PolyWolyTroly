/**
 * DashboardLoading Component Tests
 *
 * TDD: Tests for the loading skeleton state of the dashboard.
 * Now includes animated whale mascot.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardLoading } from './DashboardLoading';

describe('DashboardLoading Component', () => {
  describe('Rendering', () => {
    it('should render with correct test id', () => {
      render(<DashboardLoading isMobile={false} />);
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('should display animated whale mascot', () => {
      render(<DashboardLoading isMobile={false} />);
      expect(screen.getByTestId('whale-animation')).toBeInTheDocument();
    });

    it('should display playful loading message', () => {
      render(<DashboardLoading isMobile={false} />);
      expect(screen.getByText('Scanning the depths...')).toBeInTheDocument();
    });

    it('should display 4 skeleton cards', () => {
      render(<DashboardLoading isMobile={false} />);
      const skeletonCards = screen.getAllByTestId('skeleton-card');
      expect(skeletonCards.length).toBe(4);
    });
  });

  describe('Layout', () => {
    it('should use 4-column grid on desktop', () => {
      render(<DashboardLoading isMobile={false} />);
      const grid = screen.getByTestId('skeleton-grid');
      expect(grid.style.gridTemplateColumns).toContain('repeat(4');
    });

    it('should use 2-column grid on mobile', () => {
      render(<DashboardLoading isMobile={true} />);
      const grid = screen.getByTestId('skeleton-grid');
      expect(grid.style.gridTemplateColumns).toContain('1fr 1fr');
    });
  });

  describe('Animation', () => {
    it('should have shimmer animation on skeleton cards', () => {
      render(<DashboardLoading isMobile={false} />);
      const skeletonCards = screen.getAllByTestId('skeleton-card');
      // Check that animation is applied
      expect(skeletonCards[0].style.animation).toContain('shimmer');
    });
  });
});
