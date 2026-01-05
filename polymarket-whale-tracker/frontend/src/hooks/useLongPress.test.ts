/**
 * useLongPress Hook Tests
 *
 * Tests for the long-press gesture hook used for copy-to-clipboard on mobile.
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Long press on address: Copy to clipboard
 * - Haptic feedback on action
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from './useLongPress';

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls callback after long press threshold', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback, { threshold: 500 }));

    // Start press
    act(() => {
      result.current.handlers.onTouchStart({ preventDefault: vi.fn() } as any);
    });

    // Advance time just past threshold
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not call callback if released before threshold', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback, { threshold: 500 }));

    // Start press
    act(() => {
      result.current.handlers.onTouchStart({ preventDefault: vi.fn() } as any);
    });

    // Release before threshold
    act(() => {
      vi.advanceTimersByTime(300);
      result.current.handlers.onTouchEnd({} as any);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('cancels on touch move (prevents accidental long press during scroll)', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback, { threshold: 500 }));

    // Start press
    act(() => {
      result.current.handlers.onTouchStart({ preventDefault: vi.fn() } as any);
    });

    // Move finger (simulate scroll)
    act(() => {
      vi.advanceTimersByTime(200);
      result.current.handlers.onTouchMove?.({} as any);
    });

    // Even after threshold, should not trigger
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('uses default threshold of 500ms', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback));

    act(() => {
      result.current.handlers.onTouchStart({ preventDefault: vi.fn() } as any);
    });

    // Just before default threshold
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(callback).not.toHaveBeenCalled();

    // At default threshold
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('sets isPressed to true during press', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback));

    expect(result.current.isPressed).toBe(false);

    act(() => {
      result.current.handlers.onTouchStart({ preventDefault: vi.fn() } as any);
    });

    expect(result.current.isPressed).toBe(true);

    act(() => {
      result.current.handlers.onTouchEnd({} as any);
    });

    expect(result.current.isPressed).toBe(false);
  });

  it('sets isLongPressed to true after threshold', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback, { threshold: 500 }));

    expect(result.current.isLongPressed).toBe(false);

    act(() => {
      result.current.handlers.onTouchStart({ preventDefault: vi.fn() } as any);
    });

    expect(result.current.isLongPressed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isLongPressed).toBe(true);
  });

  it('supports mouse events for testing', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback, { threshold: 500 }));

    // Start press with mouse
    act(() => {
      result.current.handlers.onMouseDown({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
    });

    // Advance past threshold
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels on mouse leave', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback, { threshold: 500 }));

    act(() => {
      result.current.handlers.onMouseDown({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
    });

    act(() => {
      vi.advanceTimersByTime(200);
      result.current.handlers.onMouseLeave({} as any);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
