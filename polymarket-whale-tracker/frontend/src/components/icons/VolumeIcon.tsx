/**
 * Volume Icon Component
 *
 * Geometric bar chart icon representing trading volume.
 * Used in: KPI cards (24px)
 */

import { IconWrapper, type IconProps } from './Icon';

export function VolumeIcon(props: IconProps) {
  return (
    <IconWrapper {...props} viewBox="0 0 24 24">
      {/* Bars */}
      <path
        d="M18,20 V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12,20 V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6,20 V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Trend Line Overlay (Subtle) */}
      <path
        d="M4,12 L9,7 L14,12 L20,6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </IconWrapper>
  );
}
