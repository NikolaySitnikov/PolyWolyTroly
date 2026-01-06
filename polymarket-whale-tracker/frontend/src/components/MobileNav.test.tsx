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
import { MOBILE_NAV_ITEMS, isIconComponent } from '../types/navigation';

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
        // For string icons, check by text; for component icons, check by SVG
        if (!isIconComponent(item.icon)) {
          expect(screen.getByText(item.icon)).toBeInTheDocument();
        }
      });
      // Component icons render as SVGs - verify at least one SVG is present for Dashboard
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
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

    it('should set aria-current page for active navigation item', () => {
      render(<MobileNav {...defaultProps} currentView="whales" />);

      const whalesButton = screen.getByRole('button', { name: /Whales/ });
      expect(whalesButton).toHaveAttribute('aria-current', 'page');
    });

    it('should not set aria-current for inactive items', () => {
      render(<MobileNav {...defaultProps} currentView="dashboard" />);

      const whalesButton = screen.getByRole('button', { name: /Whales/ });
      expect(whalesButton).not.toHaveAttribute('aria-current');
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

    it('should have safe area padding for notched devices', () => {
      render(<MobileNav {...defaultProps} />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({ paddingBottom: 'env(safe-area-inset-bottom, 0px)' });
    });

    it('should have a border top', () => {
      render(<MobileNav {...defaultProps} />);
      const nav = screen.getByRole('navigation');
      expect(nav.style.borderTop).toContain('solid');
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
