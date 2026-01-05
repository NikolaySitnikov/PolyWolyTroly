/**
 * useNewItemAnimation Hook
 *
 * Tracks which items are "new" (not yet seen) for animation purposes.
 * Returns a function to check if an item should animate.
 *
 * Key behavior:
 * - On initial render, all items are considered "seen" (no animation)
 * - When new items appear, only those animate
 * - Uses a Set for O(1) lookup performance
 */

import { useRef, useEffect, useCallback } from 'react';

interface UseNewItemAnimationOptions {
  /** Animation duration in ms - items are marked as "seen" after this */
  animationDuration?: number;
}

/**
 * Hook to track which items are new for animation purposes.
 *
 * @param items - Array of items with unique IDs
 * @param getKey - Function to extract unique key from item
 * @param options - Configuration options
 * @returns Function that returns true if item should animate (is new)
 */
export function useNewItemAnimation<T>(
  items: T[],
  getKey: (item: T) => string,
  options: UseNewItemAnimationOptions = {}
): (item: T) => boolean {
  const { animationDuration = 400 } = options;

  // Track all keys we've seen
  const seenKeysRef = useRef<Set<string>>(new Set());
  // Track if this is the first render
  const isFirstRenderRef = useRef(true);
  // Track keys that are currently animating
  const animatingKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentKeys = new Set(items.map(getKey));

    if (isFirstRenderRef.current) {
      // First render: mark all current items as seen (no animation)
      seenKeysRef.current = currentKeys;
      isFirstRenderRef.current = false;
    } else {
      // Find truly new keys (not seen before)
      const newKeys: string[] = [];
      currentKeys.forEach((key) => {
        if (!seenKeysRef.current.has(key)) {
          newKeys.push(key);
          animatingKeysRef.current.add(key);
        }
      });

      // Update seen keys
      seenKeysRef.current = currentKeys;

      // Clear animating status after animation completes
      if (newKeys.length > 0) {
        setTimeout(() => {
          newKeys.forEach((key) => animatingKeysRef.current.delete(key));
        }, animationDuration);
      }
    }
  }, [items, getKey, animationDuration]);

  // Check if an item should animate
  const shouldAnimate = useCallback(
    (item: T): boolean => {
      const key = getKey(item);
      return animatingKeysRef.current.has(key);
    },
    [getKey]
  );

  return shouldAnimate;
}
