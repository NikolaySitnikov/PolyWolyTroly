/**
 * useMobile Hook
 *
 * Custom hook for detecting mobile devices.
 * Uses a combination of:
 * 1. Touch capability (primary indicator)
 * 2. Viewport width as fallback for responsive layouts
 *
 * Based on DESIGN_SYSTEM.md breakpoint of 768px.
 *
 * @param breakpoint - Custom breakpoint for responsive layout (default: 768)
 * @returns boolean - true if on actual mobile device OR narrow viewport
 */

import { useState, useEffect } from 'react';

/** Check if device has touch as primary input (actual mobile device) */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for touch capability AND that it's primary (not just touchscreen laptop)
  return (
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Initial check (SSR-safe)
    if (typeof window === 'undefined') return false;

    // Actual mobile device takes priority
    if (isTouchDevice()) return true;

    // Fallback to viewport width for responsive layouts
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const checkMobile = () => {
      // Actual mobile device takes priority
      if (isTouchDevice()) {
        setIsMobile(true);
        return;
      }

      // Fallback to viewport width
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events (for responsive desktop layouts)
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);

  return isMobile;
}
