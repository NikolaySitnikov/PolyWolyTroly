/**
 * useMobile Hook
 *
 * Custom hook for detecting mobile viewport.
 * Based on DESIGN_SYSTEM.md breakpoint of 768px.
 *
 * @param breakpoint - Custom breakpoint (default: 768)
 * @returns boolean - true if viewport is below breakpoint
 */

import { useState, useEffect } from 'react';

export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Initial check (SSR-safe)
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);

  return isMobile;
}
