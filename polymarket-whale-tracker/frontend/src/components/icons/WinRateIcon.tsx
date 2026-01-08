/**
 * WinRateIcon Component
 *
 * Target/bullseye icon representing Win Rate.
 * Per TRADING_FEATURES_DESIGN_GUIDE.md Section 10.
 */

import type { CSSProperties } from 'react';

export interface WinRateIconProps {
  /** Icon size in pixels */
  size?: number;
  /** Icon color (defaults to currentColor) */
  color?: string;
  /** Optional CSS class */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

export function WinRateIcon({
  size = 20,
  color = 'currentColor',
  className,
  style,
}: WinRateIconProps) {
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
      {/* Outer circle */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Middle circle */}
      <circle
        cx="12"
        cy="12"
        r="6"
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Center dot (bullseye) */}
      <circle
        cx="12"
        cy="12"
        r="2"
        fill={color}
      />
    </svg>
  );
}
