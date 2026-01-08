/**
 * PortfolioIcon Component
 *
 * Wallet/briefcase icon representing Portfolio Value.
 */

import type { CSSProperties } from 'react';

export interface PortfolioIconProps {
  /** Icon size in pixels */
  size?: number;
  /** Icon color (defaults to currentColor) */
  color?: string;
  /** Optional CSS class */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

export function PortfolioIcon({
  size = 20,
  color = 'currentColor',
  className,
  style,
}: PortfolioIconProps) {
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
      {/* Briefcase body */}
      <rect
        x="2"
        y="7"
        width="20"
        height="14"
        rx="2"
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Handle */}
      <path
        d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Center clasp */}
      <line
        x1="12"
        y1="11"
        x2="12"
        y2="15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
