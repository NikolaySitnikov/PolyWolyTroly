/**
 * useMobile Hook Tests
 *
 * TDD: RED phase - Tests for responsive mobile detection hook.
 * Based on DESIGN_SYSTEM.md breakpoint of 768px.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobile } from './useMobile';

describe('useMobile Hook', () => {
  // Store original window.innerWidth
  const originalInnerWidth = window.innerWidth;

  // Helper to mock window width
  const setWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
  };

  beforeEach(() => {
    // Reset to desktop width by default
    setWindowWidth(1024);
  });

  afterEach(() => {
    // Restore original width
    setWindowWidth(originalInnerWidth);
  });

  it('should return false for desktop widths (>= 768px)', () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('should return true for mobile widths (< 768px)', () => {
    setWindowWidth(767);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('should return false at exactly 768px (tablet threshold)', () => {
    setWindowWidth(768);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('should update when window is resized', () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      setWindowWidth(600);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useMobile());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('should accept custom breakpoint', () => {
    setWindowWidth(1000);
    const { result } = renderHook(() => useMobile(1024));
    expect(result.current).toBe(true);
  });
});
