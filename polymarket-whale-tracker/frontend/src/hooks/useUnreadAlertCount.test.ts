/**
 * useUnreadAlertCount Hook Tests
 *
 * TDD: Tests for unread alert count badge behavior.
 * Bug: Badge shows unread count even when user is on Alerts tab.
 * Expected: Should NOT increment count when currentView is 'alerts'.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnreadAlertCount } from './useUnreadAlertCount';
import type { ViewId } from '../types/navigation';

describe('useUnreadAlertCount Hook', () => {
  describe('incrementing unread count', () => {
    it('should increment count when not on alerts tab', () => {
      const { result } = renderHook(() => useUnreadAlertCount('dashboard'));

      act(() => {
        result.current.increment();
      });

      expect(result.current.count).toBe(1);
    });

    it('should NOT increment count when on alerts tab', () => {
      const { result } = renderHook(() => useUnreadAlertCount('alerts'));

      act(() => {
        result.current.increment();
      });

      expect(result.current.count).toBe(0);
    });

    it('should increment multiple times when not on alerts tab', () => {
      const { result } = renderHook(() => useUnreadAlertCount('whales'));

      act(() => {
        result.current.increment();
        result.current.increment();
        result.current.increment();
      });

      expect(result.current.count).toBe(3);
    });
  });

  describe('clearing unread count', () => {
    it('should clear count to zero', () => {
      const { result } = renderHook(() => useUnreadAlertCount('dashboard'));

      act(() => {
        result.current.increment();
        result.current.increment();
      });

      expect(result.current.count).toBe(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.count).toBe(0);
    });
  });

  describe('view changes', () => {
    it('should respect current view when incrementing after view change', () => {
      const { result, rerender } = renderHook(
        ({ view }: { view: ViewId }) => useUnreadAlertCount(view),
        { initialProps: { view: 'dashboard' as ViewId } }
      );

      // Increment while on dashboard - should work
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(1);

      // Change to alerts tab
      rerender({ view: 'alerts' as ViewId });

      // Increment while on alerts - should NOT increment
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(1); // Still 1, not 2

      // Change back to dashboard
      rerender({ view: 'dashboard' as ViewId });

      // Increment while on dashboard again - should work
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(2);
    });
  });

  describe('amount threshold filtering', () => {
    it('should increment when amount meets threshold', () => {
      const { result } = renderHook(() =>
        useUnreadAlertCount('dashboard', 10000)
      );

      act(() => {
        result.current.increment(15000); // Above threshold
      });

      expect(result.current.count).toBe(1);
    });

    it('should NOT increment when amount is below threshold', () => {
      const { result } = renderHook(() =>
        useUnreadAlertCount('dashboard', 10000)
      );

      act(() => {
        result.current.increment(4000); // Below threshold
      });

      expect(result.current.count).toBe(0);
    });

    it('should increment when amount equals threshold exactly', () => {
      const { result } = renderHook(() =>
        useUnreadAlertCount('dashboard', 10000)
      );

      act(() => {
        result.current.increment(10000); // Exactly at threshold
      });

      expect(result.current.count).toBe(1);
    });

    it('should always increment when threshold is 0 (disabled)', () => {
      const { result } = renderHook(() =>
        useUnreadAlertCount('dashboard', 0)
      );

      act(() => {
        result.current.increment(100); // Small amount
      });

      expect(result.current.count).toBe(1);
    });

    it('should always increment when threshold is undefined', () => {
      const { result } = renderHook(() =>
        useUnreadAlertCount('dashboard', undefined)
      );

      act(() => {
        result.current.increment(100);
      });

      expect(result.current.count).toBe(1);
    });

    it('should respect both view AND threshold constraints', () => {
      const { result } = renderHook(() =>
        useUnreadAlertCount('alerts', 10000)
      );

      // On alerts tab with amount above threshold - still should NOT increment
      act(() => {
        result.current.increment(50000);
      });

      expect(result.current.count).toBe(0);
    });

    it('should update threshold when it changes', () => {
      const { result, rerender } = renderHook(
        ({ view, threshold }: { view: ViewId; threshold?: number }) =>
          useUnreadAlertCount(view, threshold),
        { initialProps: { view: 'dashboard' as ViewId, threshold: 10000 } }
      );

      // Amount below initial threshold - should NOT increment
      act(() => {
        result.current.increment(5000);
      });
      expect(result.current.count).toBe(0);

      // Lower the threshold
      rerender({ view: 'dashboard' as ViewId, threshold: 1000 });

      // Same amount now above new threshold - should increment
      act(() => {
        result.current.increment(5000);
      });
      expect(result.current.count).toBe(1);
    });
  });
});
