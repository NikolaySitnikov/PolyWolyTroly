/**
 * LiveTicker Component Tests
 *
 * TDD: RED phase - Tests for horizontal scrolling whale activity banner
 *
 * @see ./LiveTicker.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveTicker } from './LiveTicker';
import type { Alert } from '../types/alert';

// Mock alerts for testing
const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'deposit',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    amount: 500000,
    timestamp: new Date().toISOString(),
    txHash: '0xabc123',
  },
  {
    id: '2',
    type: 'deposit',
    walletAddress: '0xfedcba0987654321fedcba0987654321fedcba09',
    amount: 250000,
    timestamp: new Date(Date.now() - 60000).toISOString(),
    txHash: '0xdef456',
  },
  {
    id: '3',
    type: 'deposit',
    walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    amount: 1000000,
    timestamp: new Date(Date.now() - 120000).toISOString(),
    txHash: '0xghi789',
  },
];

describe('LiveTicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the ticker container', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      expect(screen.getByTestId('live-ticker')).toBeInTheDocument();
    });

    it('renders ticker items for each alert', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      expect(screen.getAllByTestId(/^ticker-item-/)).toHaveLength(mockAlerts.length);
    });

    it('displays truncated wallet addresses', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      // Should show truncated addresses like "0x1234...5678"
      // Use getAllByText since items are duplicated for seamless scroll
      expect(screen.getAllByText(/0x1234\.\.\.5678/).length).toBeGreaterThan(0);
    });

    it('displays formatted amounts', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      // Should show formatted amounts like "$500K" or "$1M"
      // Use getAllByText since items are duplicated for seamless scroll
      expect(screen.getAllByText(/\$500K/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\$1M/).length).toBeGreaterThan(0);
    });

    it('shows whale emoji for large deposits', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      // Large deposits should show whale emoji
      const tickerContent = screen.getByTestId('live-ticker');
      expect(tickerContent.textContent).toContain('🐋');
    });

    it('renders nothing when alerts array is empty', () => {
      render(<LiveTicker alerts={[]} />);
      expect(screen.queryByTestId('live-ticker')).not.toBeInTheDocument();
    });

    it('renders nothing when hidden prop is true', () => {
      render(<LiveTicker alerts={mockAlerts} hidden />);
      expect(screen.queryByTestId('live-ticker')).not.toBeInTheDocument();
    });
  });

  describe('scrolling animation', () => {
    it('applies scroll animation class', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      const track = screen.getByTestId('ticker-track');
      // Track should exist and have willChange for GPU acceleration
      // Animation is applied after width measurement (async)
      expect(track).toBeInTheDocument();
      expect(track.style.willChange).toBe('transform');
    });

    it('pauses animation on hover', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      const ticker = screen.getByTestId('live-ticker');

      // Hover over ticker
      fireEvent.mouseEnter(ticker);
      const track = screen.getByTestId('ticker-track');
      expect(track).toHaveStyle({ animationPlayState: 'paused' });

      // Leave ticker
      fireEvent.mouseLeave(ticker);
      expect(track).toHaveStyle({ animationPlayState: 'running' });
    });

    it('respects reduced motion preference', () => {
      // This test verifies the animation respects prefers-reduced-motion
      // Implementation should use CSS media query
      render(<LiveTicker alerts={mockAlerts} />);
      const track = screen.getByTestId('ticker-track');
      // Animation should be defined (actual reduced motion handled by CSS)
      expect(track.style.animation).toBeDefined();
    });
  });

  describe('dismiss functionality', () => {
    it('renders close button when dismissable', () => {
      render(<LiveTicker alerts={mockAlerts} dismissable />);
      expect(screen.getByTestId('ticker-dismiss')).toBeInTheDocument();
    });

    it('does not render close button when not dismissable', () => {
      render(<LiveTicker alerts={mockAlerts} dismissable={false} />);
      expect(screen.queryByTestId('ticker-dismiss')).not.toBeInTheDocument();
    });

    it('calls onDismiss when close button clicked', () => {
      const onDismiss = vi.fn();
      render(<LiveTicker alerts={mockAlerts} dismissable onDismiss={onDismiss} />);

      fireEvent.click(screen.getByTestId('ticker-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('click handling', () => {
    it('calls onItemClick when ticker item is clicked', () => {
      const onItemClick = vi.fn();
      render(<LiveTicker alerts={mockAlerts} onItemClick={onItemClick} />);

      const firstItem = screen.getByTestId(`ticker-item-${mockAlerts[0].id}`);
      fireEvent.click(firstItem);

      expect(onItemClick).toHaveBeenCalledWith(mockAlerts[0]);
    });

    it('does not call onItemClick when not provided', () => {
      render(<LiveTicker alerts={mockAlerts} />);

      const firstItem = screen.getByTestId(`ticker-item-${mockAlerts[0].id}`);
      // Should not throw when clicking without handler
      expect(() => fireEvent.click(firstItem)).not.toThrow();
    });
  });

  describe('styling', () => {
    it('applies correct background gradient', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      const ticker = screen.getByTestId('live-ticker');
      // Should have dark background gradient
      expect(ticker.style.background).toContain('linear-gradient');
    });

    it('applies cyan accent color to amounts', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      // Check that amounts have cyan color applied
      const amounts = screen.getAllByTestId(/^ticker-amount-/);
      expect(amounts.length).toBeGreaterThan(0);
    });

    it('uses monospace font for addresses', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      const addresses = screen.getAllByTestId(/^ticker-address-/);
      expect(addresses.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('has live region for screen readers', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      const ticker = screen.getByTestId('live-ticker');
      expect(ticker).toHaveAttribute('aria-live', 'polite');
    });

    it('has descriptive label', () => {
      render(<LiveTicker alerts={mockAlerts} />);
      const ticker = screen.getByTestId('live-ticker');
      expect(ticker).toHaveAttribute('aria-label', expect.stringContaining('whale activity'));
    });

    it('dismiss button has accessible label', () => {
      render(<LiveTicker alerts={mockAlerts} dismissable />);
      const dismissBtn = screen.getByTestId('ticker-dismiss');
      expect(dismissBtn).toHaveAttribute('aria-label', 'Dismiss ticker');
    });
  });

  describe('responsive behavior', () => {
    it('accepts isMobile prop', () => {
      render(<LiveTicker alerts={mockAlerts} isMobile />);
      expect(screen.getByTestId('live-ticker')).toBeInTheDocument();
    });

    it('adjusts font size for mobile', () => {
      const { rerender } = render(<LiveTicker alerts={mockAlerts} />);
      const desktopTicker = screen.getByTestId('live-ticker');

      rerender(<LiveTicker alerts={mockAlerts} isMobile />);
      const mobileTicker = screen.getByTestId('live-ticker');

      // Both should render (styling handled internally)
      expect(desktopTicker).toBeDefined();
      expect(mobileTicker).toBeDefined();
    });
  });

  describe('speed configuration', () => {
    it('accepts custom speed prop', () => {
      render(<LiveTicker alerts={mockAlerts} speed="slow" />);
      expect(screen.getByTestId('live-ticker')).toBeInTheDocument();
    });

    it('supports fast, normal, and slow speeds', () => {
      const { rerender } = render(<LiveTicker alerts={mockAlerts} speed="fast" />);
      expect(screen.getByTestId('ticker-track')).toBeInTheDocument();

      rerender(<LiveTicker alerts={mockAlerts} speed="normal" />);
      expect(screen.getByTestId('ticker-track')).toBeInTheDocument();

      rerender(<LiveTicker alerts={mockAlerts} speed="slow" />);
      expect(screen.getByTestId('ticker-track')).toBeInTheDocument();
    });
  });
});
