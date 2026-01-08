/**
 * TradesIcon Component
 *
 * Exchange arrows icon representing total trades.
 * Per TRADING_FEATURES_DESIGN_GUIDE.md Section 10.
 */

import type { CSSProperties } from 'react';

export interface TradesIconProps {
  /** Icon size in pixels */
  size?: number;
  /** Icon color (defaults to currentColor) */
  color?: string;
  /** Optional CSS class */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

export function TradesIcon({
  size = 20,
  color = 'currentColor',
  className,
  style,
}: TradesIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Left arrow */}
      <path
        d="M7 10L3 14L7 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 14H16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Right arrow */}
      <path
        d="M17 6L21 10L17 14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 10H8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
