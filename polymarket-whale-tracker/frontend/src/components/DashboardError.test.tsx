/**
 * DashboardError Component Tests
 *
 * TDD: Tests for the error state of the dashboard.
 * Now includes confused whale mascot.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardError } from './DashboardError';

describe('DashboardError Component', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct test id', () => {
      render(
        <DashboardError error="Test error" onRetry={mockOnRetry} isMobile={false} />
      );
      expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
    });

    it('should display confused whale mascot', () => {
      render(
        <DashboardError error="Test error" onRetry={mockOnRetry} isMobile={false} />
      );
      expect(screen.getByTestId('whale-animation')).toBeInTheDocument();
    });

    it('should display playful error title', () => {
      render(
        <DashboardError error="Test error" onRetry={mockOnRetry} isMobile={false} />
      );
      expect(screen.getByText('Lost signal...')).toBeInTheDocument();
    });

    it('should display the error message', () => {
      render(
        <DashboardError
          error="Failed to fetch stats: 500"
          onRetry={mockOnRetry}
          isMobile={false}
        />
      );
      expect(screen.getByText(/Failed to fetch stats: 500/i)).toBeInTheDocument();
    });

    it('should display a retry button', () => {
      render(
        <DashboardError error="Test error" onRetry={mockOnRetry} isMobile={false} />
      );
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onRetry when retry button is clicked', () => {
      render(
        <DashboardError error="Test error" onRetry={mockOnRetry} isMobile={false} />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('should center content on mobile', () => {
      render(
        <DashboardError error="Test error" onRetry={mockOnRetry} isMobile={true} />
      );
      const container = screen.getByTestId('dashboard-error');
      expect(container.style.textAlign).toBe('center');
    });
  });
});
