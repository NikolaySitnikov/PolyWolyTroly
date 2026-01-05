/**
 * useNewItemAnimation Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNewItemAnimation } from './useNewItemAnimation';

interface TestItem {
  id: string;
  value: number;
}

describe('useNewItemAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const getKey = (item: TestItem) => item.id;

  it('should not animate items on initial render', () => {
    const items: TestItem[] = [
      { id: '1', value: 100 },
      { id: '2', value: 200 },
    ];

    const { result } = renderHook(() => useNewItemAnimation(items, getKey));

    expect(result.current(items[0])).toBe(false);
    expect(result.current(items[1])).toBe(false);
  });

  it('should animate new items added after initial render', () => {
    const initialItems: TestItem[] = [
      { id: '1', value: 100 },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useNewItemAnimation(items, getKey),
      { initialProps: { items: initialItems } }
    );

    // Initial render - no animation
    expect(result.current(initialItems[0])).toBe(false);

    // Add a new item
    const updatedItems: TestItem[] = [
      { id: 'new', value: 300 },
      { id: '1', value: 100 },
    ];
    rerender({ items: updatedItems });

    // New item should animate
    expect(result.current(updatedItems[0])).toBe(true);
    // Existing item should not animate
    expect(result.current(updatedItems[1])).toBe(false);
  });

  it('should stop animating after animation duration', () => {
    const initialItems: TestItem[] = [{ id: '1', value: 100 }];

    const { result, rerender } = renderHook(
      ({ items }) => useNewItemAnimation(items, getKey, { animationDuration: 400 }),
      { initialProps: { items: initialItems } }
    );

    // Add a new item
    const updatedItems: TestItem[] = [
      { id: 'new', value: 300 },
      { id: '1', value: 100 },
    ];
    rerender({ items: updatedItems });

    // Should animate immediately after adding
    expect(result.current(updatedItems[0])).toBe(true);

    // Fast-forward past animation duration
    vi.advanceTimersByTime(500);

    // Should no longer animate
    expect(result.current(updatedItems[0])).toBe(false);
  });

  it('should handle multiple new items', () => {
    const initialItems: TestItem[] = [{ id: '1', value: 100 }];

    const { result, rerender } = renderHook(
      ({ items }) => useNewItemAnimation(items, getKey),
      { initialProps: { items: initialItems } }
    );

    // Add multiple new items
    const updatedItems: TestItem[] = [
      { id: 'new1', value: 300 },
      { id: 'new2', value: 400 },
      { id: '1', value: 100 },
    ];
    rerender({ items: updatedItems });

    // Both new items should animate
    expect(result.current(updatedItems[0])).toBe(true);
    expect(result.current(updatedItems[1])).toBe(true);
    // Existing item should not
    expect(result.current(updatedItems[2])).toBe(false);
  });

  it('should not re-animate existing items when list changes', () => {
    const items1: TestItem[] = [
      { id: '1', value: 100 },
      { id: '2', value: 200 },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useNewItemAnimation(items, getKey),
      { initialProps: { items: items1 } }
    );

    // Add a new item
    const items2: TestItem[] = [
      { id: 'new', value: 300 },
      { id: '1', value: 100 },
      { id: '2', value: 200 },
    ];
    rerender({ items: items2 });

    // Wait for animation to complete
    vi.advanceTimersByTime(500);

    // Add another new item
    const items3: TestItem[] = [
      { id: 'new2', value: 400 },
      { id: 'new', value: 300 },
      { id: '1', value: 100 },
      { id: '2', value: 200 },
    ];
    rerender({ items: items3 });

    // Only the newest item should animate
    expect(result.current(items3[0])).toBe(true); // new2 - new
    expect(result.current(items3[1])).toBe(false); // new - already seen
    expect(result.current(items3[2])).toBe(false); // 1 - already seen
    expect(result.current(items3[3])).toBe(false); // 2 - already seen
  });

  it('should handle items being removed', () => {
    const items1: TestItem[] = [
      { id: '1', value: 100 },
      { id: '2', value: 200 },
      { id: '3', value: 300 },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useNewItemAnimation(items, getKey),
      { initialProps: { items: items1 } }
    );

    // Remove an item
    const items2: TestItem[] = [
      { id: '1', value: 100 },
      { id: '3', value: 300 },
    ];
    rerender({ items: items2 });

    // Remaining items should not animate
    expect(result.current(items2[0])).toBe(false);
    expect(result.current(items2[1])).toBe(false);
  });

  it('should handle empty initial list', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useNewItemAnimation(items, getKey),
      { initialProps: { items: [] as TestItem[] } }
    );

    // Add items to empty list
    const items: TestItem[] = [
      { id: '1', value: 100 },
      { id: '2', value: 200 },
    ];
    rerender({ items });

    // All items should animate since they're all new
    expect(result.current(items[0])).toBe(true);
    expect(result.current(items[1])).toBe(true);
  });
});
