/**
 * PnlIcon Component
 *
 * Chart with arrow icon representing P&L (Profit & Loss).
 * Per TRADING_FEATURES_DESIGN_GUIDE.md Section 10.
 */

import type { CSSProperties } from 'react';

export interface PnlIconProps {
  /** Icon size in pixels */
  size?: number;
  /** Icon color (defaults to currentColor) */
  color?: string;
  /** Optional CSS class */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

export function PnlIcon({
  size = 20,
  color = 'currentColor',
  className,
  style,
}: PnlIconProps) {
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
      {/* Chart line going up */}
      <polyline
        points="3,17 9,11 13,15 21,7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow head */}
      <polyline
        points="17,7 21,7 21,11"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
