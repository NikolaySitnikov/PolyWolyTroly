/**
 * ToastContext Tests
 *
 * Tests for the toast notification context and hook.
 * Verifies:
 * - Adding toasts with different variants
 * - Auto-dismiss after 5 seconds
 * - Maximum 3 toasts visible (stacking)
 * - Manual dismiss functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

// Test component to interact with toast context
function TestComponent() {
  const { toasts, addToast, dismissToast } = useToast();

  return (
    <div>
      <button
        onClick={() => addToast({ message: 'Info toast', variant: 'info' })}
        data-testid="add-info"
      >
        Add Info
      </button>
      <button
        onClick={() => addToast({ message: 'Success toast', variant: 'success' })}
        data-testid="add-success"
      >
        Add Success
      </button>
      <button
        onClick={() => addToast({ message: 'Warning toast', variant: 'warning' })}
        data-testid="add-warning"
      >
        Add Warning
      </button>
      <button
        onClick={() => addToast({ message: 'Error toast', variant: 'error' })}
        data-testid="add-error"
      >
        Add Error
      </button>
      <button
        onClick={() => addToast({ message: 'With title', variant: 'info', title: 'Title' })}
        data-testid="add-with-title"
      >
        Add With Title
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
      {toasts.map((toast) => (
        <div key={toast.id} data-testid={`toast-${toast.id}`}>
          {toast.message}
          <button onClick={() => dismissToast(toast.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides toast context to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('adds an info toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('add-info').click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    expect(screen.getByText('Info toast')).toBeInTheDocument();
  });

  it('adds toasts with different variants', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('add-info').click();
      screen.getByTestId('add-success').click();
      screen.getByTestId('add-warning').click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
  });

  it('limits visible toasts to maximum 3', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('add-info').click();
      screen.getByTestId('add-success').click();
      screen.getByTestId('add-warning').click();
      screen.getByTestId('add-error').click(); // 4th toast
    });

    // Should still only show 3
    expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
  });

  it('auto-dismisses toast after 5 seconds', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('add-info').click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    // Fast-forward 5 seconds (auto-dismiss timer)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Fast-forward 250ms more (exit animation duration)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Toast should now be removed
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('manually dismisses a toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('add-info').click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    act(() => {
      screen.getByText('Dismiss').click();
    });

    // Wait for exit animation (250ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('adds toast with title', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('add-with-title').click();
    });

    expect(screen.getByText('With title')).toBeInTheDocument();
  });

  it('throws error when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });
});
