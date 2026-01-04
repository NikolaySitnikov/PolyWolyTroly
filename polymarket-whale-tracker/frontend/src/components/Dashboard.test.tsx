/**
 * Dashboard Component Tests
 *
 * TDD: RED phase - Tests for the main dashboard view.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';

describe('Dashboard Component', () => {
  const mockStats = {
    whaleCount: 42,
    totalVolume: 15750000,
    alertsToday: 12,
    newWhalesThisWeek: 5,
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('should display the hero title', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      expect(screen.getByText(/Whale Intelligence/)).toBeInTheDocument();
      expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
    });

    it('should display subtitle with whale count', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      expect(screen.getByText(/Tracking.*42.*whales/i)).toBeInTheDocument();
    });
  });

  describe('StatCards', () => {
    it('should display 4 stat cards', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      const statCards = screen.getAllByTestId('stat-card');
      expect(statCards.length).toBe(4);
    });

    it('should display whales tracked stat', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      expect(screen.getByText('Whales Tracked')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display total volume stat', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      expect(screen.getByText('Total Volume')).toBeInTheDocument();
      // $15.75M formatted
      expect(screen.getByText('$15.75M')).toBeInTheDocument();
    });

    it('should display alerts today stat', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      expect(screen.getByText('Alerts Today')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display new whales stat', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      expect(screen.getByText('New This Week')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should use 4-column grid on desktop', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      const statsGrid = screen.getByTestId('stats-grid');
      expect(statsGrid.style.gridTemplateColumns).toContain('repeat(4');
    });

    it('should use 2-column grid on mobile', () => {
      render(<Dashboard stats={mockStats} isMobile={true} />);
      const statsGrid = screen.getByTestId('stats-grid');
      expect(statsGrid.style.gridTemplateColumns).toContain('1fr 1fr');
    });

    it('should center hero text on mobile', () => {
      render(<Dashboard stats={mockStats} isMobile={true} />);
      const hero = screen.getByTestId('dashboard-hero');
      expect(hero.style.textAlign).toBe('center');
    });

    it('should left-align hero text on desktop', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      const hero = screen.getByTestId('dashboard-hero');
      expect(hero.style.textAlign).toBe('left');
    });
  });

  describe('Styling', () => {
    it('should have proper spacing between sections', () => {
      render(<Dashboard stats={mockStats} isMobile={false} />);
      const hero = screen.getByTestId('dashboard-hero');
      expect(hero.style.marginBottom).toBe('32px');
    });
  });
});
