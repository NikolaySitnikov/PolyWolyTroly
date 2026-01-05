/**
 * KeyboardShortcutsModal Component Tests
 *
 * Testing the keyboard shortcuts modal that appears when pressing "?"
 * Per DESIGN_IMPLEMENTATION_ROADMAP.md: Implement keyboard shortcuts modal (press ? to show)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

describe('KeyboardShortcutsModal', () => {
  it('renders when isOpen is true', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<KeyboardShortcutsModal isOpen={false} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays navigation shortcuts', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);

    // Check for navigation section
    expect(screen.getByText('Navigation')).toBeInTheDocument();

    // Check for some expected shortcuts
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Whales/i)).toBeInTheDocument();
    expect(screen.getByText(/Alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();
  });

  it('displays action shortcuts', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);

    // Check for actions section
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check for refresh shortcut
    expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside the modal', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    const modalContent = screen.getByRole('dialog');
    fireEvent.click(modalContent);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('shows the ? key hint', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);

    // The modal should have multiple ? keys (one in shortcuts list, one in footer hint)
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks.length).toBeGreaterThanOrEqual(2);

    // Footer hint text should be present
    expect(screen.getByText(/anywhere to show this menu/i)).toBeInTheDocument();
  });
});
