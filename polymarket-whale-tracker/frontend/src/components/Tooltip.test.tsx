/**
 * Tooltip Component Tests
 *
 * Testing the reusable tooltip component for hover explanations.
 * Per DESIGN_SYSTEM.md: Tooltips appear on hover with explanations
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders children without tooltip by default', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on mouse enter', async () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );

    // Get the wrapper span that has the event handlers
    const wrapper = screen.getByText('Hover me').closest('span');
    fireEvent.mouseEnter(wrapper!);

    // Fast-forward past delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Tooltip text')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hides tooltip on mouse leave', async () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );

    const wrapper = screen.getByText('Hover me').closest('span');
    fireEvent.mouseEnter(wrapper!);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper!);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows tooltip on focus for accessibility', async () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Tooltip text">
        <button>Focus me</button>
      </Tooltip>
    );

    const wrapper = screen.getByText('Focus me').closest('span');
    fireEvent.focus(wrapper!);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hides tooltip on blur', async () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Tooltip text">
        <button>Focus me</button>
      </Tooltip>
    );

    const wrapper = screen.getByText('Focus me').closest('span');
    fireEvent.focus(wrapper!);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    fireEvent.blur(wrapper!);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('supports custom delay', async () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Tooltip text" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const wrapper = screen.getByText('Hover me').closest('span');
    fireEvent.mouseEnter(wrapper!);

    // Should not show yet
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Should show after full delay
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('supports different placement positions', async () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <Tooltip content="Tooltip text" placement="top">
        <button>Hover me</button>
      </Tooltip>
    );

    let wrapper = screen.getByText('Hover me').closest('span');
    fireEvent.mouseEnter(wrapper!);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    let tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('data-placement', 'top');

    fireEvent.mouseLeave(wrapper!);

    rerender(
      <Tooltip content="Tooltip text" placement="bottom">
        <button>Hover me</button>
      </Tooltip>
    );

    wrapper = screen.getByText('Hover me').closest('span');
    fireEvent.mouseEnter(wrapper!);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('data-placement', 'bottom');

    vi.useRealTimers();
  });

  it('renders ReactNode content', async () => {
    vi.useFakeTimers();

    render(
      <Tooltip
        content={
          <div>
            <strong>Bold text</strong>
            <span>More info</span>
          </div>
        }
      >
        <button>Hover me</button>
      </Tooltip>
    );

    const wrapper = screen.getByText('Hover me').closest('span');
    fireEvent.mouseEnter(wrapper!);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('Bold text')).toBeInTheDocument();
    expect(screen.getByText('More info')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('cancels show if mouse leaves before delay completes', async () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Tooltip text" delay={300}>
        <button>Hover me</button>
      </Tooltip>
    );

    const wrapper = screen.getByText('Hover me').closest('span');
    fireEvent.mouseEnter(wrapper!);
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Leave before delay completes
    fireEvent.mouseLeave(wrapper!);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Tooltip should never appear
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('has proper ARIA attributes for accessibility', async () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Helpful information">
        <button>Info</button>
      </Tooltip>
    );

    const wrapper = screen.getByText('Info').closest('span');
    fireEvent.mouseEnter(wrapper!);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(wrapper).toHaveAttribute('aria-describedby', tooltip.id);

    vi.useRealTimers();
  });
});
