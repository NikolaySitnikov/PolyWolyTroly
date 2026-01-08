/**
 * PositionsIcon Component
 *
 * Stacked layers icon representing active positions.
 */

import type { CSSProperties } from 'react';

export interface PositionsIconProps {
  /** Icon size in pixels */
  size?: number;
  /** Icon color (defaults to currentColor) */
  color?: string;
  /** Optional CSS class */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

export function PositionsIcon({
  size = 20,
  color = 'currentColor',
  className,
  style,
}: PositionsIconProps) {
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
      {/* Top layer */}
      <path
        d="M12 2L2 7l10 5 10-5-10-5z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Middle layer */}
      <path
        d="M2 12l10 5 10-5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom layer */}
      <path
        d="M2 17l10 5 10-5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
