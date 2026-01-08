/**
 * PnlToggle Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PnlToggle } from './PnlToggle';

describe('PnlToggle', () => {
  it('renders all three time window options', () => {
    const onChange = vi.fn();
    render(<PnlToggle value="7d" onChange={onChange} />);

    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
    expect(screen.getByText('ALL')).toBeInTheDocument();
  });

  it('marks the active option with aria-pressed', () => {
    const onChange = vi.fn();
    render(<PnlToggle value="30d" onChange={onChange} />);

    expect(screen.getByText('7D')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('30D')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ALL')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange when clicking a different option', () => {
    const onChange = vi.fn();
    render(<PnlToggle value="7d" onChange={onChange} />);

    fireEvent.click(screen.getByText('30D'));
    expect(onChange).toHaveBeenCalledWith('30d');

    fireEvent.click(screen.getByText('ALL'));
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('renders correctly with sm size', () => {
    const onChange = vi.fn();
    render(<PnlToggle value="all" onChange={onChange} size="sm" />);

    // Should still render all options
    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
    expect(screen.getByText('ALL')).toBeInTheDocument();
  });

  it('has correct group role for accessibility', () => {
    const onChange = vi.fn();
    render(<PnlToggle value="7d" onChange={onChange} />);

    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'P&L time window');
  });
});
