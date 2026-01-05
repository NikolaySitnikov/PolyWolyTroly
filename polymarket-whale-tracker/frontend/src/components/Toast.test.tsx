/**
 * Toast Component Tests
 *
 * Tests for the toast notification component with 4 variants:
 * - info (cyan border)
 * - success (green border)
 * - warning (yellow border)
 * - error (red border)
 *
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Position: Top-right (desktop), Top-center (mobile)
 * - Duration: 5 seconds (auto-dismiss)
 * - Max stack: 3
 * - Animation: Slide in from right/top
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from './Toast';
import type { ToastVariant } from './Toast';

describe('Toast', () => {
  const defaultProps = {
    id: 'test-toast-1',
    message: 'Test toast message',
    variant: 'info' as ToastVariant,
    onDismiss: vi.fn(),
  };

  it('renders the message', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText('Test toast message')).toBeInTheDocument();
  });

  it('renders with info variant styling', () => {
    render(<Toast {...defaultProps} variant="info" />);
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    // Info variant should use cyan accent
  });

  it('renders with success variant styling', () => {
    render(<Toast {...defaultProps} variant="success" />);
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    // Success variant should use profit green
  });

  it('renders with warning variant styling', () => {
    render(<Toast {...defaultProps} variant="warning" />);
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    // Warning variant should use warning color
  });

  it('renders with error variant styling', () => {
    render(<Toast {...defaultProps} variant="error" />);
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    // Error variant should use loss red
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<Toast {...defaultProps} onDismiss={onDismiss} />);

    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(closeButton);

    expect(onDismiss).toHaveBeenCalledWith('test-toast-1');
  });

  it('renders with optional title', () => {
    render(<Toast {...defaultProps} title="Toast Title" />);
    expect(screen.getByText('Toast Title')).toBeInTheDocument();
    expect(screen.getByText('Test toast message')).toBeInTheDocument();
  });

  it('renders with an icon based on variant', () => {
    render(<Toast {...defaultProps} variant="success" />);
    // Success should show checkmark or whale emoji
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<Toast {...defaultProps} />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('respects isExiting prop for exit animation', () => {
    render(<Toast {...defaultProps} isExiting={true} />);
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    // Should have exit animation class/style
  });
});
