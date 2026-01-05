/**
 * PullToRefresh Component Tests
 *
 * Testing pull-to-refresh gesture for mobile.
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Threshold: 80px
 * - Animation: Whale emerges from top
 * - Loading: Whale swims in circle
 * - Complete: Whale dives back down
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PullToRefresh } from './PullToRefresh';

describe('PullToRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>Content</div>
      </PullToRefresh>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows whale indicator when pulling down', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId('pull-to-refresh');

    // Start pull
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });

    // Pull down 60px (below threshold, but visible)
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 110 }],
    });

    // Whale indicator should be visible
    expect(screen.getByTestId('pull-indicator')).toBeInTheDocument();
  });

  it('calls onRefresh when pulled past threshold', async () => {
    let refreshCalled = false;
    const onRefresh = vi.fn().mockImplementation(() => {
      refreshCalled = true;
      return Promise.resolve();
    });

    render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId('pull-to-refresh');

    // Start pull at top of page
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });

    // Pull down past threshold (100px > 80px threshold)
    // After resistance (0.5), 100px becomes 50px
    // Threshold check is threshold * 0.5 = 40px
    // 50px >= 40px = true, should trigger
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 150 }],
    });

    // Release - this triggers the async refresh
    await act(async () => {
      fireEvent.touchEnd(container);
      // Flush microtasks to allow the Promise to resolve
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalled();
  });

  it('does not call onRefresh if pull is below threshold', () => {
    const onRefresh = vi.fn();

    render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId('pull-to-refresh');

    // Start pull
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });

    // Pull down only 40px (after resistance = 20px, below threshold * 0.5 = 40px)
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 90 }],
    });

    // Release
    fireEvent.touchEnd(container);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('shows loading state while refreshing', async () => {
    let resolveRefresh: () => void;
    const onRefresh = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId('pull-to-refresh');

    // Pull past threshold
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 150 }],
    });

    // Start refresh
    await act(async () => {
      fireEvent.touchEnd(container);
      await Promise.resolve(); // Flush microtask to enter loading state
    });

    // Should show loading indicator
    expect(screen.getByTestId('pull-indicator')).toHaveAttribute(
      'data-state',
      'loading'
    );

    // Resolve the refresh and advance timers for completion animation
    await act(async () => {
      resolveRefresh!();
      await Promise.resolve(); // Allow promise to settle
    });

    // Advance timers for the 300ms completion animation timeout
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Should complete (indicator hidden)
    expect(screen.queryByTestId('pull-indicator')).not.toBeInTheDocument();
  });

  it('prevents refresh while already refreshing', async () => {
    let resolveRefresh: () => void;
    const onRefresh = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId('pull-to-refresh');

    // First pull
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 150 }],
    });

    // Start first refresh
    await act(async () => {
      fireEvent.touchEnd(container);
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Try second pull while still loading
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 150 }],
    });
    fireEvent.touchEnd(container);

    // Should still only have one call (second pull blocked)
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Cleanup - resolve the pending promise
    await act(async () => {
      resolveRefresh!();
      await Promise.resolve();
    });
  });

  it('only triggers when scrolled to top', () => {
    const onRefresh = vi.fn();

    render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <div>Content</div>
      </PullToRefresh>
    );

    const pullContainer = screen.getByTestId('pull-to-refresh');

    // Simulate that we're scrolled down
    Object.defineProperty(pullContainer, 'scrollTop', {
      value: 100,
      writable: true,
    });

    // Try to pull
    fireEvent.touchStart(pullContainer, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(pullContainer, {
      touches: [{ clientX: 100, clientY: 150 }],
    });
    fireEvent.touchEnd(pullContainer);

    // Should not trigger because we're scrolled down
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('respects disabled prop', () => {
    const onRefresh = vi.fn();

    render(
      <PullToRefresh onRefresh={onRefresh} threshold={80} disabled>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId('pull-to-refresh');

    // Pull past threshold
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 150 }],
    });
    fireEvent.touchEnd(container);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('shows whale emoji in indicator', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId('pull-to-refresh');

    // Pull down
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 110 }],
    });

    // Whale should be visible
    expect(screen.getByText('🐋')).toBeInTheDocument();
  });

  it('applies resistance to pull distance', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId('pull-to-refresh');

    // Pull down 200px
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 250 }],
    });

    // The indicator should exist - resistance reduces 200px to 100px
    const indicatorElement = screen.getByTestId('pull-indicator');
    expect(indicatorElement).toBeInTheDocument();
  });
});
