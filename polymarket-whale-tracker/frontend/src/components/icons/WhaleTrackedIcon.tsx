/**
 * Whale Tracked Icon Component
 *
 * Whale silhouette with tracking ping indicator.
 * Used in: KPI cards (24px)
 */

import { IconWrapper, type IconProps } from './Icon';

/**
 * Whale with tracking ping icon
 * Used in: KPI cards, stats displays
 */
export function WhaleTrackedIcon(props: IconProps) {
  return (
    <IconWrapper {...props} viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="20" cy="5" r="3.25" />
        <circle cx="20" cy="5" r="1.25" fill="currentColor" stroke="none" />
      </g>
      <path
        fill="currentColor"
        stroke="none"
        d="M2,13 C2,7.5 7,3.5 14,4.5 C18,5 20.5,7.5 21.5,10 L23,8 V16 L21.5,14 C20,16 17.5,18.5 12.5,19.5 C7,20.5 2,18.5 2,13 Z"
      />
    </IconWrapper>
  );
}
