/**
 * EmptyState Component Tests
 *
 * Tests for the reusable empty state component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  describe('Basic Rendering', () => {
    it('should render with icon and message', () => {
      render(<EmptyState icon="🐋" message="No whales tracked yet" />);

      expect(screen.getByText('🐋')).toBeInTheDocument();
      expect(screen.getByText('No whales tracked yet')).toBeInTheDocument();
    });

    it('should render with title when provided', () => {
      render(
        <EmptyState
          icon="📊"
          title="No Data"
          message="Start tracking to see data here"
        />
      );

      expect(screen.getByText('No Data')).toBeInTheDocument();
      expect(screen.getByText('Start tracking to see data here')).toBeInTheDocument();
    });

    it('should have testid for testing', () => {
      render(<EmptyState icon="🔍" message="No results" />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('should render action button when provided', () => {
      const onAction = vi.fn();

      render(
        <EmptyState
          icon="🔄"
          message="Failed to load"
          actionLabel="Retry"
          onAction={onAction}
        />
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call onAction when button is clicked', () => {
      const onAction = vi.fn();

      render(
        <EmptyState
          icon="🔄"
          message="Failed to load"
          actionLabel="Retry"
          onAction={onAction}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('should not render action button when onAction is not provided', () => {
      render(<EmptyState icon="📭" message="No messages" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<EmptyState icon="📋" message="Empty list" variant="default" />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('should render search variant with filter info', () => {
      render(
        <EmptyState
          icon="🔍"
          message='No results found for "test"'
          variant="search"
        />
      );

      expect(screen.getByText(/No results found for/)).toBeInTheDocument();
    });

    it('should render waiting variant', () => {
      render(
        <EmptyState
          icon="⏳"
          message="Waiting for activity..."
          variant="waiting"
        />
      );

      expect(screen.getByText('Waiting for activity...')).toBeInTheDocument();
    });
  });

  describe('Sizing', () => {
    it('should render compact size', () => {
      render(<EmptyState icon="📭" message="No items" size="compact" />);

      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
    });

    it('should render default size', () => {
      render(<EmptyState icon="📭" message="No items" size="default" />);

      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
    });

    it('should render large size', () => {
      render(<EmptyState icon="📭" message="No items" size="large" />);

      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
    });
  });
});
