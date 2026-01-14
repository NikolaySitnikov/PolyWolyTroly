/**
 * FilterPills Component Tests
 *
 * Tests for the whale filter pills component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPills } from './FilterPills';

describe('FilterPills Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all filter pills', () => {
      render(
        <FilterPills activeFilters={['all']} onChange={mockOnChange} />
      );
      expect(screen.getByTestId('filter-pill-all')).toBeInTheDocument();
      expect(screen.getByTestId('filter-pill-profitable')).toBeInTheDocument();
      expect(screen.getByTestId('filter-pill-losing')).toBeInTheDocument();
      expect(screen.getByTestId('filter-pill-live')).toBeInTheDocument();
    });

    it('should render filter labels correctly', () => {
      render(
        <FilterPills activeFilters={['all']} onChange={mockOnChange} />
      );
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Profitable')).toBeInTheDocument();
      expect(screen.getByText('Losing')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should highlight active filter', () => {
      render(
        <FilterPills activeFilters={['profitable']} onChange={mockOnChange} />
      );
      const profitableButton = screen.getByTestId('filter-pill-profitable');
      // Active filters have cyan background and border
      expect(profitableButton).toHaveStyle({ fontWeight: '600' });
    });

    it('should support multiple active filters', () => {
      render(
        <FilterPills activeFilters={['profitable', 'live']} onChange={mockOnChange} />
      );
      const profitableButton = screen.getByTestId('filter-pill-profitable');
      const liveButton = screen.getByTestId('filter-pill-live');
      // Both should be highlighted
      expect(profitableButton).toHaveStyle({ fontWeight: '600' });
      expect(liveButton).toHaveStyle({ fontWeight: '600' });
    });
  });

  describe('Filter Selection', () => {
    it('should call onChange when clicking a filter', () => {
      render(
        <FilterPills activeFilters={['all']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-profitable'));
      expect(mockOnChange).toHaveBeenCalledWith(['profitable']);
    });

    it('should clear other filters when clicking All', () => {
      render(
        <FilterPills activeFilters={['profitable', 'live']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-all'));
      expect(mockOnChange).toHaveBeenCalledWith(['all']);
    });

    it('should add filter when clicking inactive filter', () => {
      render(
        <FilterPills activeFilters={['profitable']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-live'));
      expect(mockOnChange).toHaveBeenCalledWith(['profitable', 'live']);
    });

    it('should remove filter when clicking active filter', () => {
      render(
        <FilterPills activeFilters={['profitable', 'live']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-profitable'));
      expect(mockOnChange).toHaveBeenCalledWith(['live']);
    });

    it('should default to All when removing last filter', () => {
      render(
        <FilterPills activeFilters={['profitable']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-profitable'));
      expect(mockOnChange).toHaveBeenCalledWith(['all']);
    });

    it('should remove All when selecting specific filter', () => {
      render(
        <FilterPills activeFilters={['all']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-losing'));
      expect(mockOnChange).toHaveBeenCalledWith(['losing']);
    });
  });

  describe('Filter Stacking', () => {
    it('should allow stacking Profitable + Live', () => {
      render(
        <FilterPills activeFilters={['profitable']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-live'));
      expect(mockOnChange).toHaveBeenCalledWith(['profitable', 'live']);
    });

    it('should allow stacking Losing + Live', () => {
      render(
        <FilterPills activeFilters={['losing']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-live'));
      expect(mockOnChange).toHaveBeenCalledWith(['losing', 'live']);
    });

    it('should make Profitable and Losing mutually exclusive', () => {
      // Clicking Losing while Profitable is active should replace it
      render(
        <FilterPills activeFilters={['profitable']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-losing'));
      expect(mockOnChange).toHaveBeenCalledWith(['losing']);
    });

    it('should make Losing and Profitable mutually exclusive', () => {
      // Clicking Profitable while Losing is active should replace it
      render(
        <FilterPills activeFilters={['losing']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-profitable'));
      expect(mockOnChange).toHaveBeenCalledWith(['profitable']);
    });

    it('should keep Live when switching between Profitable and Losing', () => {
      // Live can stack with either Profitable or Losing
      render(
        <FilterPills activeFilters={['profitable', 'live']} onChange={mockOnChange} />
      );
      fireEvent.click(screen.getByTestId('filter-pill-losing'));
      // Should replace profitable with losing, but keep live
      expect(mockOnChange).toHaveBeenCalledWith(['live', 'losing']);
    });
  });

  describe('Accessibility', () => {
    it('should have clickable buttons', () => {
      render(
        <FilterPills activeFilters={['all']} onChange={mockOnChange} />
      );
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
    });

    it('should have cursor pointer on all buttons', () => {
      render(
        <FilterPills activeFilters={['all']} onChange={mockOnChange} />
      );
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveStyle({ cursor: 'pointer' });
      });
    });
  });
});
