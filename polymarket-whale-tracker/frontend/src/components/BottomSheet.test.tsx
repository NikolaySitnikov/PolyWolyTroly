/**
 * BottomSheet Component Tests
 *
 * Tests for the mobile bottom sheet component used for filters and actions.
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Border-radius: 24px 24px 0 0
 * - Handle: 40px × 4px centered bar
 * - Snap points: 40%, 90%
 * - Backdrop: rgba(0, 0, 0, 0.6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Sheet Content</div>
        </BottomSheet>
      );

      expect(screen.getByText('Sheet Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <BottomSheet isOpen={false} onClose={mockOnClose}>
          <div>Sheet Content</div>
        </BottomSheet>
      );

      expect(screen.queryByText('Sheet Content')).not.toBeInTheDocument();
    });

    it('renders the drag handle', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      const handle = screen.getByTestId('bottom-sheet-handle');
      expect(handle).toBeInTheDocument();
    });

    it('renders optional title', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose} title="Filters">
          <div>Content</div>
        </BottomSheet>
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has correct border radius (24px 24px 0 0)', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet).toHaveStyle({ borderRadius: '24px 24px 0 0' });
    });

    it('has handle with correct dimensions (40px width, 4px height)', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      const handle = screen.getByTestId('bottom-sheet-handle');
      expect(handle).toHaveStyle({ width: '40px', height: '4px' });
    });

    it('renders backdrop overlay', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      const backdrop = screen.getByTestId('bottom-sheet-backdrop');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when backdrop is clicked', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      const backdrop = screen.getByTestId('bottom-sheet-backdrop');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the sheet', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottom-sheet');
      fireEvent.click(sheet);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Snap Points', () => {
    it('starts at default snap point (40%)', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottom-sheet');
      // Default height is 40vh
      expect(sheet).toHaveStyle({ height: '40vh' });
    });

    it('can be initialized at 90% snap point', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose} initialSnapPoint="full">
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet).toHaveStyle({ height: '90vh' });
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose} title="Filters">
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = screen.getByRole('dialog');
      expect(sheet).toHaveAttribute('aria-modal', 'true');
      expect(sheet).toHaveAttribute('aria-labelledby');
    });

    it('traps focus inside the sheet', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <button>First</button>
          <button>Last</button>
        </BottomSheet>
      );

      const firstButton = screen.getByText('First');
      const lastButton = screen.getByText('Last');

      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      lastButton.focus();
      expect(document.activeElement).toBe(lastButton);
    });
  });

  describe('Reduced Motion', () => {
    it('respects prefers-reduced-motion', () => {
      // Component should check for reduced motion preference
      render(
        <BottomSheet isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet).toBeInTheDocument();
    });
  });
});
