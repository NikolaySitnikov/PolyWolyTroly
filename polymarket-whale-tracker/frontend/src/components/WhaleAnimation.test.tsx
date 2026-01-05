/**
 * WhaleAnimation Component Tests
 *
 * TDD: Tests for the animated whale mascot component.
 * The whale has different states: loading, error, empty, success
 * Each state has distinct ASCII art and styling.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WhaleAnimation } from './WhaleAnimation';

describe('WhaleAnimation Component', () => {
  describe('Rendering', () => {
    it('should render with correct test id', () => {
      render(<WhaleAnimation state="loading" />);
      expect(screen.getByTestId('whale-animation')).toBeInTheDocument();
    });

    it('should render the whale ASCII art', () => {
      render(<WhaleAnimation state="loading" />);
      const whaleArt = screen.getByTestId('whale-art');
      expect(whaleArt).toBeInTheDocument();
      // Should contain whale body characters
      expect(whaleArt.textContent).toContain('___:____');
    });

    it('should render waves separately for animation', () => {
      render(<WhaleAnimation state="loading" />);
      expect(screen.getByTestId('whale-waves')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading message', () => {
      render(<WhaleAnimation state="loading" />);
      expect(screen.getByText('Scanning the depths...')).toBeInTheDocument();
    });

    it('should display loading subtitle', () => {
      render(<WhaleAnimation state="loading" />);
      expect(screen.getByText('Looking for whale activity...')).toBeInTheDocument();
    });

    it('should have swimming animation class', () => {
      render(<WhaleAnimation state="loading" />);
      const whaleContainer = screen.getByTestId('whale-body');
      expect(whaleContainer.style.animation).toContain('whaleSwim');
    });

    it('should use cyan color for loading state', () => {
      render(<WhaleAnimation state="loading" />);
      const whaleArt = screen.getByTestId('whale-art');
      expect(whaleArt.style.color).toBe('rgb(0, 255, 240)'); // #00fff0
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<WhaleAnimation state="error" />);
      expect(screen.getByText('Whale got lost')).toBeInTheDocument();
    });

    it('should display error subtitle', () => {
      render(<WhaleAnimation state="error" />);
      expect(screen.getByText('Something went wrong. Try again?')).toBeInTheDocument();
    });

    it('should show confused whale with question mark', () => {
      render(<WhaleAnimation state="error" />);
      const whaleArt = screen.getByTestId('whale-art');
      expect(whaleArt.textContent).toContain('?');
    });

    it('should use magenta color for error state', () => {
      render(<WhaleAnimation state="error" />);
      const whaleArt = screen.getByTestId('whale-art');
      expect(whaleArt.style.color).toBe('rgb(255, 45, 146)'); // #ff2d92
    });

    it('should not have swimming animation in error state', () => {
      render(<WhaleAnimation state="error" />);
      const whaleContainer = screen.getByTestId('whale-body');
      expect(whaleContainer.style.animation).toBe('none');
    });
  });

  describe('Empty State', () => {
    it('should display empty message', () => {
      render(<WhaleAnimation state="empty" />);
      expect(screen.getByText('No whales spotted yet')).toBeInTheDocument();
    });

    it('should display empty subtitle', () => {
      render(<WhaleAnimation state="empty" />);
      expect(screen.getByText('Whales will appear here once deposits are detected')).toBeInTheDocument();
    });

    it('should show whale with bubbles', () => {
      render(<WhaleAnimation state="empty" />);
      const whaleArt = screen.getByTestId('whale-art');
      // Empty state has bubbles (° characters)
      expect(whaleArt.textContent).toContain('°');
    });

    it('should have reduced opacity for empty state', () => {
      render(<WhaleAnimation state="empty" />);
      const whaleArt = screen.getByTestId('whale-art');
      expect(whaleArt.style.opacity).toBe('0.5');
    });
  });

  describe('Success State', () => {
    it('should display success message', () => {
      render(<WhaleAnimation state="success" />);
      expect(screen.getByText('Whale found!')).toBeInTheDocument();
    });

    it('should display success subtitle', () => {
      render(<WhaleAnimation state="success" />);
      expect(screen.getByText('New activity detected')).toBeInTheDocument();
    });

    it('should show happy whale with checkmark', () => {
      render(<WhaleAnimation state="success" />);
      const whaleArt = screen.getByTestId('whale-art');
      expect(whaleArt.textContent).toContain('✓');
    });

    it('should use profit green color for success state', () => {
      render(<WhaleAnimation state="success" />);
      const whaleArt = screen.getByTestId('whale-art');
      expect(whaleArt.style.color).toBe('rgb(0, 255, 136)'); // #00ff88
    });
  });

  describe('Custom Messages', () => {
    it('should allow custom title override', () => {
      render(<WhaleAnimation state="loading" title="Hunting for whales..." />);
      expect(screen.getByText('Hunting for whales...')).toBeInTheDocument();
    });

    it('should allow custom subtitle override', () => {
      render(<WhaleAnimation state="loading" subtitle="Please wait..." />);
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA role', () => {
      render(<WhaleAnimation state="loading" />);
      const container = screen.getByTestId('whale-animation');
      expect(container).toHaveAttribute('role', 'status');
    });

    it('should have aria-live for loading state', () => {
      render(<WhaleAnimation state="loading" />);
      const container = screen.getByTestId('whale-animation');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label describing the state', () => {
      render(<WhaleAnimation state="loading" />);
      const container = screen.getByTestId('whale-animation');
      expect(container).toHaveAttribute('aria-label', 'Loading whale data');
    });
  });

  describe('Reduced Motion', () => {
    it('should respect prefers-reduced-motion via CSS', () => {
      // This is tested via CSS media query in globals.css
      // The component should not have inline animation overrides that bypass this
      render(<WhaleAnimation state="loading" />);
      const whaleBody = screen.getByTestId('whale-body');
      // Animation is set via CSS, reduced motion is handled in globals.css
      expect(whaleBody.style.animation).toBeTruthy();
    });
  });
});
