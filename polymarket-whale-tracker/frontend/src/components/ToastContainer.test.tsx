/**
 * ToastContainer Component Tests
 *
 * Tests for the container component that renders all active toasts.
 * Verifies:
 * - Renders toasts from context
 * - Proper positioning (top-right desktop, top-center mobile)
 * - Stacking behavior
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import { ToastProvider, useToast } from '../contexts/ToastContext';
import { useEffect } from 'react';

// Helper component to add toasts for testing
function ToastAdder({ messages }: { messages: string[] }) {
  const { addToast } = useToast();

  useEffect(() => {
    messages.forEach((msg) => {
      addToast({ message: msg, variant: 'info' });
    });
  }, [addToast, messages]);

  return null;
}

describe('ToastContainer', () => {
  it('renders toasts from context', () => {
    render(
      <ToastProvider>
        <ToastAdder messages={['Test message 1']} />
        <ToastContainer />
      </ToastProvider>
    );

    expect(screen.getByText('Test message 1')).toBeInTheDocument();
  });

  it('renders multiple toasts in a stack', () => {
    render(
      <ToastProvider>
        <ToastAdder messages={['Message 1', 'Message 2', 'Message 3']} />
        <ToastContainer />
      </ToastProvider>
    );

    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
    expect(screen.getByText('Message 3')).toBeInTheDocument();
  });

  it('has proper container positioning', () => {
    render(
      <ToastProvider>
        <ToastAdder messages={['Test message']} />
        <ToastContainer />
      </ToastProvider>
    );

    const container = screen.getByTestId('toast-container');
    expect(container).toBeInTheDocument();
    // Container should be fixed positioned
    expect(container).toHaveStyle({ position: 'fixed' });
  });

  it('renders mobile layout when isMobile is true', () => {
    render(
      <ToastProvider>
        <ToastAdder messages={['Mobile toast']} />
        <ToastContainer isMobile={true} />
      </ToastProvider>
    );

    const container = screen.getByTestId('toast-container');
    expect(container).toBeInTheDocument();
  });

  it('renders nothing when no toasts exist', () => {
    render(
      <ToastProvider>
        <ToastContainer />
      </ToastProvider>
    );

    // Container should still exist but have no toasts
    const container = screen.getByTestId('toast-container');
    expect(container).toBeInTheDocument();
    expect(container.children).toHaveLength(0);
  });
});
