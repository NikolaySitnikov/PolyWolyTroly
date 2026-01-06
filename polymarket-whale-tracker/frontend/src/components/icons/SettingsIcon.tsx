/**
 * Settings Icon Component
 *
 * Gear/cog icon for settings.
 * Used in: Navigation tabs, section headers
 */

import { IconWrapper, type IconProps } from './Icon';

/**
 * Settings gear icon
 * Used in: Navigation, Settings tab
 */
export function SettingsIcon(props: IconProps) {
  return (
    <IconWrapper {...props} viewBox="0 0 18 18">
      {/* 
        Technical Hex Nut
        Matched to "Hacker Terminal" aesthetic
      */}

      {/* Hexagon Body */}
      <path
        d="M9,2 L15.06,5.5 L15.06,12.5 L9,16 L2.94,12.5 L2.94,5.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Circle (Screw Hole) */}
      <circle cx="9" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* Technical Markings (Top/Bottom) */}
      <path d="M9,2 V4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9,14 V16" stroke="currentColor" strokeWidth="1.5" />
    </IconWrapper>
  );
}

