/**
 * StatCard Component Tests
 *
 * TDD: RED phase - Tests for the statistics card component.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard Component', () => {
  const defaultProps = {
    label: 'Whales Tracked',
    value: '42',
    icon: '🐋',
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByTestId('stat-card')).toBeInTheDocument();
    });

    it('should display the label', () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByText('Whales Tracked')).toBeInTheDocument();
    });

    it('should display the value', () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display the icon', () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByText('🐋')).toBeInTheDocument();
    });
  });

  describe('Optional Props', () => {
    it('should display subValue when provided', () => {
      render(<StatCard {...defaultProps} subValue="24 deposits" />);
      expect(screen.getByText('24 deposits')).toBeInTheDocument();
    });

    it('should display positive trend with up arrow', () => {
      render(<StatCard {...defaultProps} trend={12.5} />);
      expect(screen.getByText(/↑/)).toBeInTheDocument();
      expect(screen.getByText(/12.5%/)).toBeInTheDocument();
    });

    it('should display negative trend with down arrow', () => {
      render(<StatCard {...defaultProps} trend={-8.3} />);
      expect(screen.getByText(/↓/)).toBeInTheDocument();
      expect(screen.getByText(/8.3%/)).toBeInTheDocument();
    });

    it('should not display trend when not provided', () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
      expect(screen.queryByText(/↓/)).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have surface background color', () => {
      render(<StatCard {...defaultProps} />);
      const card = screen.getByTestId('stat-card');
      expect(card.style.background).toBe('rgb(18, 18, 26)');
    });

    it('should have border', () => {
      render(<StatCard {...defaultProps} />);
      const card = screen.getByTestId('stat-card');
      expect(card.style.border).toContain('1px solid');
    });

    it('should have rounded corners', () => {
      render(<StatCard {...defaultProps} />);
      const card = screen.getByTestId('stat-card');
      expect(card.style.borderRadius).toBe('12px');
    });
  });

  describe('Accent Colors', () => {
    it('should use cyan accent by default', () => {
      render(<StatCard {...defaultProps} />);
      const accent = screen.getByTestId('stat-card-accent');
      expect(accent.style.background).toContain('rgb(0, 255, 240)');
    });

    it('should use magenta accent when specified', () => {
      render(<StatCard {...defaultProps} accentColor="magenta" />);
      const accent = screen.getByTestId('stat-card-accent');
      expect(accent.style.background).toContain('rgb(255, 45, 146)');
    });

    it('should use profit color for positive trends', () => {
      render(<StatCard {...defaultProps} trend={10} />);
      const trendElement = screen.getByTestId('stat-card-trend');
      expect(trendElement.style.color).toBe('rgb(0, 255, 136)');
    });

    it('should use loss color for negative trends', () => {
      render(<StatCard {...defaultProps} trend={-10} />);
      const trendElement = screen.getByTestId('stat-card-trend');
      expect(trendElement.style.color).toBe('rgb(255, 51, 102)');
    });
  });

  describe('Typography', () => {
    it('should use uppercase for label', () => {
      render(<StatCard {...defaultProps} />);
      const label = screen.getByText('Whales Tracked');
      expect(label.style.textTransform).toBe('uppercase');
    });

    it('should use Exo 2 font for value', () => {
      render(<StatCard {...defaultProps} />);
      const value = screen.getByTestId('stat-card-value');
      expect(value.style.fontFamily).toContain('Exo 2');
    });
  });
});
