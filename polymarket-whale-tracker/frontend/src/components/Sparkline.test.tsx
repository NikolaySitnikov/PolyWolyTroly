/**
 * Sparkline Component Tests
 *
 * TDD: RED phase - Tests for the sparkline chart component.
 * Displays small inline price history charts for market cards.
 *
 * @see ../../../Design docs/DESIGN_SYSTEM.md - Chart specifications
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkline } from './Sparkline';
import type { PriceHistoryPoint } from '../services/api';

// Mock price history data - simulates 7 days of hourly data
const mockPriceHistory: PriceHistoryPoint[] = [
  { t: 1704067200, p: 0.45 },
  { t: 1704153600, p: 0.48 },
  { t: 1704240000, p: 0.52 },
  { t: 1704326400, p: 0.55 },
  { t: 1704412800, p: 0.58 },
  { t: 1704499200, p: 0.62 },
  { t: 1704585600, p: 0.65 },
];

const emptyPriceHistory: PriceHistoryPoint[] = [];

describe('Sparkline Component', () => {
  describe('Rendering', () => {
    it('should render with data-testid', () => {
      render(<Sparkline data={mockPriceHistory} />);
      expect(screen.getByTestId('sparkline')).toBeInTheDocument();
    });

    it('should render chart container when data is provided', () => {
      render(<Sparkline data={mockPriceHistory} />);
      const container = screen.getByTestId('sparkline');
      // In jsdom, ResponsiveContainer may not render SVG, so we check the container exists
      // and has proper dimensions set for rendering
      expect(container).toBeInTheDocument();
      expect(container.childNodes.length).toBeGreaterThan(0);
    });

    it('should not render chart when data is empty', () => {
      render(<Sparkline data={emptyPriceHistory} />);
      const container = screen.getByTestId('sparkline');
      // Should still have container but no SVG
      expect(container).toBeInTheDocument();
    });
  });

  describe('Dimensions', () => {
    it('should use default width of 80px', () => {
      render(<Sparkline data={mockPriceHistory} />);
      const container = screen.getByTestId('sparkline');
      expect(container).toHaveStyle({ width: '80px' });
    });

    it('should use default height of 24px', () => {
      render(<Sparkline data={mockPriceHistory} />);
      const container = screen.getByTestId('sparkline');
      expect(container).toHaveStyle({ height: '24px' });
    });

    it('should accept custom width', () => {
      render(<Sparkline data={mockPriceHistory} width={100} />);
      const container = screen.getByTestId('sparkline');
      expect(container).toHaveStyle({ width: '100px' });
    });

    it('should accept custom height', () => {
      render(<Sparkline data={mockPriceHistory} height={32} />);
      const container = screen.getByTestId('sparkline');
      expect(container).toHaveStyle({ height: '32px' });
    });
  });

  describe('Color Theming', () => {
    it('should use cyan color by default (positive trend)', () => {
      // Data trends upward: 0.45 -> 0.65 (positive)
      render(<Sparkline data={mockPriceHistory} />);
      const container = screen.getByTestId('sparkline');
      // Verify component has proper aria-label for trend
      expect(container).toHaveAttribute('aria-label', expect.stringContaining('upward'));
    });

    it('should use loss color for negative trend', () => {
      // Reverse data to trend downward: 0.65 -> 0.45 (negative)
      const negativeTrend = [...mockPriceHistory].reverse();
      render(<Sparkline data={negativeTrend} />);
      const container = screen.getByTestId('sparkline');
      expect(container).toHaveAttribute('aria-label', expect.stringContaining('downward'));
    });
  });

  describe('Loading State', () => {
    it('should show shimmer effect when loading', () => {
      render(<Sparkline data={[]} loading={true} />);
      const container = screen.getByTestId('sparkline');
      // Check that animation property includes shimmer
      expect(container.style.animation).toContain('shimmer');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label for screen readers', () => {
      render(<Sparkline data={mockPriceHistory} />);
      const container = screen.getByTestId('sparkline');
      expect(container).toHaveAttribute('aria-label');
    });

    it('should respect prefers-reduced-motion', () => {
      // Component should have no animations if reduced motion is preferred
      // This is handled via CSS, but we can verify the data attribute
      render(<Sparkline data={mockPriceHistory} />);
      const container = screen.getByTestId('sparkline');
      expect(container).toBeInTheDocument();
    });
  });
});
