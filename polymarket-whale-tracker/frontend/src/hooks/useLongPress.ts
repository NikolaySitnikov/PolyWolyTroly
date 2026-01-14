/**
 * useLongPress Hook
 *
 * Detects long-press gesture on touch and mouse devices.
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Long press on address: Copy to clipboard
 * - Threshold: configurable (default 500ms)
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md
 */

import { useState, useCallback, useRef } from 'react';

export interface UseLongPressOptions {
  /** Time in ms before long press is triggered (default: 500ms) */
  threshold?: number;
  /** Whether to prevent default touch behavior */
  preventDefault?: boolean;
}

export interface UseLongPressResult {
  /** Event handlers to spread onto the target element */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
  };
  /** Whether the element is currently being pressed */
  isPressed: boolean;
  /** Whether the long press threshold has been reached */
  isLongPressed: boolean;
  /** Whether a long press occurred in the most recent interaction (persists until next press) */
  wasLongPressed: () => boolean;
}

/**
 * Hook to detect long-press gestures
 *
 * @param callback - Function to call when long press is detected
 * @param options - Configuration options
 * @returns Event handlers and state
 *
 * @example
 * ```tsx
 * const { handlers, isPressed } = useLongPress(() => {
 *   navigator.clipboard.writeText(address);
 *   // Trigger haptic feedback if available
 *   if ('vibrate' in navigator) {
 *     navigator.vibrate(50);
 *   }
 * });
 *
 * return <div {...handlers}>0x1234...5678</div>;
 * ```
 */
export function useLongPress(
  callback: () => void,
  options: UseLongPressOptions = {}
): UseLongPressResult {
  const { threshold = 500, preventDefault = false } = options;

  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressedRef = useRef(false);
  // Track if a long press occurred in the current interaction (persists through release -> click)
  const wasLongPressedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startPress = useCallback(
    (e?: React.TouchEvent | React.MouseEvent) => {
      if (preventDefault && e) {
        e.preventDefault();
      }

      isPressedRef.current = true;
      wasLongPressedRef.current = false; // Reset at start of new interaction
      setIsPressed(true);
      setIsLongPressed(false);

      timeoutRef.current = setTimeout(() => {
        if (isPressedRef.current) {
          wasLongPressedRef.current = true; // Mark that long press occurred
          setIsLongPressed(true);
          callback();
        }
      }, threshold);
    },
    [callback, threshold, preventDefault]
  );

  const endPress = useCallback(() => {
    isPressedRef.current = false;
    setIsPressed(false);
    setIsLongPressed(false);
    clearTimer();
  }, [clearTimer]);

  const cancelPress = useCallback(() => {
    isPressedRef.current = false;
    setIsPressed(false);
    setIsLongPressed(false);
    clearTimer();
  }, [clearTimer]);

  const handlers: UseLongPressResult['handlers'] = {
    onTouchStart: (e: React.TouchEvent) => {
      // Don't prevent default - allow scrolling to work
      // Don't stop propagation on start - allow parent to handle if needed
      startPress(e);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      // Stop propagation only if we completed a long press
      // to prevent parent click handlers from firing
      if (isLongPressed) {
        e.stopPropagation();
        e.preventDefault();
      }
      endPress();
    },
    onTouchMove: (_e: React.TouchEvent) => cancelPress(),
    onMouseDown: (e: React.MouseEvent) => {
      e.stopPropagation();
      startPress(e);
    },
    onMouseUp: (e: React.MouseEvent) => {
      e.stopPropagation();
      endPress();
    },
    onMouseLeave: (_e: React.MouseEvent) => cancelPress(),
  };

  // Function to check if the most recent interaction was a long press
  // This is used by click handlers to determine if they should fire
  const wasLongPressed = useCallback(() => {
    const result = wasLongPressedRef.current;
    // Reset after reading to prepare for next interaction
    // Use a small delay to ensure click handler has time to read the value
    setTimeout(() => {
      wasLongPressedRef.current = false;
    }, 0);
    return result;
  }, []);

  return {
    handlers,
    isPressed,
    isLongPressed,
    wasLongPressed,
  };
}

export default useLongPress;
