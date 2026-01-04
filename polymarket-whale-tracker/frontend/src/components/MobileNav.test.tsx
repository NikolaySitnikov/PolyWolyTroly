/**
 * MobileNav Component Tests
 *
 * TDD: RED phase - Tests for the mobile bottom navigation.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileNav } from './MobileNav';
import { MOBILE_NAV_ITEMS } from '../types/navigation';

describe('MobileNav Component', () => {
  const defaultProps = {
    currentView: 'dashboard' as const,
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<MobileNav {...defaultProps} />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render all mobile navigation items', () => {
      render(<MobileNav {...defaultProps} />);

      MOBILE_NAV_ITEMS.forEach((item) => {
        expect(screen.getByRole('button', { name: new RegExp(item.label) })).toBeInTheDocument();
      });
    });

    it('should display icons for each nav item', () => {
      render(<MobileNav {...defaultProps} />);

      MOBILE_NAV_ITEMS.forEach((item) => {
        expect(screen.getByText(item.icon)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should call onNavigate when nav item is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileNav {...defaultProps} />);

      const whalesButton = screen.getByRole('button', { name: /Whales/ });
      await user.click(whalesButton);

      expect(defaultProps.onNavigate).toHaveBeenCalledWith('whales');
    });

    it('should highlight the active navigation item with cyan color', () => {
      render(<MobileNav {...defaultProps} currentView="whales" />);

      const whalesButton = screen.getByRole('button', { name: /Whales/ });
      expect(whalesButton).toHaveStyle({ color: '#00fff0' });
    });

    it('should use muted color for inactive items', () => {
      render(<MobileNav {...defaultProps} currentView="dashboard" />);

      const whalesButton = screen.getByRole('button', { name: /Whales/ });
      expect(whalesButton).toHaveStyle({ color: '#555566' });
    });
  });

  describe('Styling', () => {
    it('should be fixed at the bottom of the page', () => {
      render(<MobileNav {...defaultProps} />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({ position: 'fixed', bottom: '0' });
    });

    it('should have blur backdrop effect', () => {
      render(<MobileNav {...defaultProps} />);
      const nav = screen.getByRole('navigation');
      // backdropFilter is set via inline style (jsdom doesn't compute it)
      expect(nav.style.backdropFilter).toBe('blur(20px)');
    });

    it('should have high z-index', () => {
      render(<MobileNav {...defaultProps} />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({ zIndex: '1000' });
    });

    it('should have 70px height', () => {
      render(<MobileNav {...defaultProps} />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({ height: '70px' });
    });

    it('should distribute items evenly with space-around', () => {
      render(<MobileNav {...defaultProps} />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({ justifyContent: 'space-around' });
    });
  });

  describe('Layout', () => {
    it('should stack icon and label vertically', () => {
      render(<MobileNav {...defaultProps} />);
      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        expect(button).toHaveStyle({ flexDirection: 'column' });
      });
    });
  });
});
