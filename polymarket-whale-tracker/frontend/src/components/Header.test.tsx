/**
 * Header Component Tests
 *
 * TDD: RED phase - Tests for the main header/navigation component.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';
import { NAV_ITEMS } from '../types/navigation';

describe('Header Component', () => {
  const defaultProps = {
    currentView: 'dashboard' as const,
    onNavigate: vi.fn(),
    isMobile: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should display the PolyWolyTroly brand name on desktop', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByText('PolyWolyTroly')).toBeInTheDocument();
    });

    it('should display whale logo', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByTestId('header-logo')).toBeInTheDocument();
    });

    it('should display "Whale Intelligence" tagline on desktop', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByText('Whale Intelligence')).toBeInTheDocument();
    });

    it('should hide brand name on mobile', () => {
      render(<Header {...defaultProps} isMobile={true} />);
      expect(screen.queryByText('PolyWolyTroly')).not.toBeInTheDocument();
    });

    it('should display LiveIndicator', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render all navigation items on desktop', () => {
      render(<Header {...defaultProps} />);

      NAV_ITEMS.forEach((item) => {
        // Use getAllByRole since Dashboard appears in both logo button and nav button
        const buttons = screen.getAllByRole('button', { name: new RegExp(item.label) });
        expect(buttons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should hide navigation items on mobile', () => {
      render(<Header {...defaultProps} isMobile={true} />);

      // Navigation buttons should not be present (the logo button is still present but that's for navigation)
      // Check specifically for the nav bar buttons (not the logo button)
      NAV_ITEMS.forEach((item) => {
        // On mobile, nav items are hidden - but the logo button "Go to Dashboard" exists
        // So we specifically look for buttons that match exact label text (not aria-label)
        const navButtons = screen.queryAllByRole('button', { name: new RegExp(`^${item.label}$`) });
        // Filter out the logo button which has "Go to Dashboard" aria-label
        const actualNavButtons = navButtons.filter(btn => btn.getAttribute('aria-label') !== 'Go to Dashboard');
        expect(actualNavButtons).toHaveLength(0);
      });
    });

    it('should call onNavigate when nav item is clicked', async () => {
      const user = userEvent.setup();
      render(<Header {...defaultProps} />);

      const whalesButton = screen.getByRole('button', { name: /Whales/ });
      await user.click(whalesButton);

      expect(defaultProps.onNavigate).toHaveBeenCalledWith('whales');
    });

    it('should highlight the active navigation item', () => {
      render(<Header {...defaultProps} currentView="whales" />);

      const whalesButton = screen.getByRole('button', { name: /Whales/ });
      // Active item should have cyan-tinted background (checking style attribute)
      expect(whalesButton.style.background).toContain('rgba');
    });
  });

  describe('Styling', () => {
    it('should be fixed at the top of the page', () => {
      render(<Header {...defaultProps} />);
      const header = screen.getByRole('banner');
      expect(header).toHaveStyle({ position: 'fixed', top: '0' });
    });

    it('should have blur backdrop effect', () => {
      render(<Header {...defaultProps} />);
      const header = screen.getByRole('banner');
      // backdropFilter is set via inline style (jsdom doesn't compute it)
      expect(header.style.backdropFilter).toBe('blur(20px)');
    });

    it('should have high z-index', () => {
      render(<Header {...defaultProps} />);
      const header = screen.getByRole('banner');
      expect(header).toHaveStyle({ zIndex: '1000' });
    });
  });

  describe('Connect Button', () => {
    it('should show Connect Telegram button on desktop', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Connect Telegram/i })).toBeInTheDocument();
    });

    it('should hide Connect Telegram button on mobile', () => {
      render(<Header {...defaultProps} isMobile={true} />);
      expect(screen.queryByRole('button', { name: /Connect Telegram/i })).not.toBeInTheDocument();
    });
  });
});
