import { useState, useCallback, useRef, useEffect } from 'react';
import type { ViewId } from '../types/navigation';

interface UseUnreadAlertCountResult {
  count: number;
  increment: (amount?: number) => void;
  clear: () => void;
}

/**
 * Manages unread alert count for navigation badges.
 * Prevents incrementing when user is already viewing alerts tab
 * or when the deposit amount is below the configured threshold.
 *
 * @param currentView - The currently active view/tab
 * @param minThreshold - Minimum amount to count as unread (0 or undefined = no filter)
 */
export function useUnreadAlertCount(
  currentView: ViewId,
  minThreshold?: number
): UseUnreadAlertCountResult {
  const [count, setCount] = useState(0);

  // Use refs to track values and avoid stale closures in callbacks
  const currentViewRef = useRef(currentView);
  const minThresholdRef = useRef(minThreshold);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    minThresholdRef.current = minThreshold;
  }, [minThreshold]);

  const increment = useCallback((amount?: number) => {
    // Don't increment if user is already viewing alerts
    if (currentViewRef.current === 'alerts') {
      return;
    }

    // Don't increment if amount is below threshold (when threshold is set)
    const threshold = minThresholdRef.current;
    if (threshold && threshold > 0 && amount !== undefined && amount < threshold) {
      return;
    }

    setCount((prev) => prev + 1);
  }, []);

  const clear = useCallback(() => {
    setCount(0);
  }, []);

  return { count, increment, clear };
}
