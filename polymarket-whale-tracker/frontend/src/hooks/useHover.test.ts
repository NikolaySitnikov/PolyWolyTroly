/**
 * useHover Hook Tests
 *
 * Tests for the reusable hover state management hook.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHover } from './useHover';

describe('useHover Hook', () => {
  describe('Basic Functionality', () => {
    it('should return isHovered as false initially', () => {
      const { result } = renderHook(() => useHover());

      expect(result.current.isHovered).toBe(false);
    });

    it('should return event handlers', () => {
      const { result } = renderHook(() => useHover());

      expect(result.current.hoverProps).toBeDefined();
      expect(typeof result.current.hoverProps.onMouseEnter).toBe('function');
      expect(typeof result.current.hoverProps.onMouseLeave).toBe('function');
    });

    it('should set isHovered to true on mouse enter', () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });

    it('should set isHovered to false on mouse leave', () => {
      const { result } = renderHook(() => useHover());

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);

      act(() => {
        result.current.hoverProps.onMouseLeave();
      });

      expect(result.current.isHovered).toBe(false);
    });
  });

  describe('Disabled State', () => {
    it('should not set isHovered when disabled', () => {
      const { result } = renderHook(() => useHover({ disabled: true }));

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(false);
    });

    it('should respond to hover when not disabled', () => {
      const { result, rerender } = renderHook(
        ({ disabled }) => useHover({ disabled }),
        { initialProps: { disabled: true } }
      );

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(false);

      // Re-enable and try again
      rerender({ disabled: false });

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });
  });

  describe('Callbacks', () => {
    it('should call onHoverStart when mouse enters', () => {
      const onHoverStart = vi.fn();
      const { result } = renderHook(() => useHover({ onHoverStart }));

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(onHoverStart).toHaveBeenCalledTimes(1);
    });

    it('should call onHoverEnd when mouse leaves', () => {
      const onHoverEnd = vi.fn();
      const { result } = renderHook(() => useHover({ onHoverEnd }));

      act(() => {
        result.current.hoverProps.onMouseEnter();
        result.current.hoverProps.onMouseLeave();
      });

      expect(onHoverEnd).toHaveBeenCalledTimes(1);
    });

    it('should not call callbacks when disabled', () => {
      const onHoverStart = vi.fn();
      const onHoverEnd = vi.fn();
      const { result } = renderHook(() =>
        useHover({ disabled: true, onHoverStart, onHoverEnd })
      );

      act(() => {
        result.current.hoverProps.onMouseEnter();
        result.current.hoverProps.onMouseLeave();
      });

      expect(onHoverStart).not.toHaveBeenCalled();
      expect(onHoverEnd).not.toHaveBeenCalled();
    });
  });

  describe('Stable References', () => {
    it('should return stable hoverProps reference', () => {
      const { result, rerender } = renderHook(() => useHover());
      const firstProps = result.current.hoverProps;

      rerender();
      const secondProps = result.current.hoverProps;

      expect(firstProps).toBe(secondProps);
    });
  });
});
