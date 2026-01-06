/**
 * Base Icon Component
 *
 * Provides consistent sizing, colouring, and accessibility for all custom icons.
 * Based on DESIGN_SYSTEM.md specifications.
 *
 * @see ../../../../Design docs/DESIGN_SYSTEM.md
 */

import { type CSSProperties, type ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export interface IconProps {
  /** Icon size in pixels (default: 18) */
  size?: number;
  /** Icon colour - defaults to currentColor for inheritance */
  color?: string;
  /** Additional className */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Accessible label (required for standalone icons) */
  'aria-label'?: string;
  /** If true, icon is decorative and hidden from screen readers */
  'aria-hidden'?: boolean;
}

export interface IconWrapperProps extends IconProps {
  children: ReactNode;
  viewBox?: string;
}

/**
 * Base Icon wrapper component
 * Provides consistent sizing, colouring, and accessibility
 */
export function IconWrapper({
  size = 18,
  color = 'currentColor',
  className,
  style,
  children,
  viewBox = '0 0 18 18',
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = !ariaLabel,
}: IconWrapperProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        flexShrink: 0,
        transition: `color ${tokens.animation.durationFast} ease, filter ${tokens.animation.durationFast} ease`,
        ...style,
      }}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      role={ariaLabel ? 'img' : undefined}
    >
      {children}
    </svg>
  );
}

/**
 * Icon style presets for common states
 */
export const iconStyles = {
  // Default muted state
  muted: {
    color: tokens.colors.textMuted,
  },

  // Secondary state
  secondary: {
    color: tokens.colors.textSecondary,
  },

  // Active/highlighted state with glow
  active: {
    color: tokens.colors.cyan,
    filter: `drop-shadow(0 0 8px ${tokens.colors.cyanGlow})`,
  },

  // Profit state (for positive indicators)
  profit: {
    color: tokens.colors.profit,
    filter: `drop-shadow(0 0 8px ${tokens.colors.profitGlow})`,
  },

  // Alert/notification state
  alert: {
    color: tokens.colors.magenta,
    filter: `drop-shadow(0 0 8px ${tokens.colors.magentaGlow})`,
  },
} as const;

export type IconStylePreset = keyof typeof iconStyles;
