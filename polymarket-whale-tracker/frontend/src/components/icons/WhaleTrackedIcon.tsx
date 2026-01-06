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
      {/* 
        Mini ASCII Whale 
        Mimicking:
          .
        __|__
       |  o  |
      */}

      {/* Spout (.) */}
      <circle cx="12" cy="7" r="1" fill="currentColor" />

      {/* Back (___|___) */}
      <path
        d="M6,10 H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
      <path
        d="M12,10 V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />

      {/* Body (| o |) */}
      <path
        d="M6,10 V16 H18 V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        fill="none"
      />

      {/* Eye (o) */}
      <circle cx="10" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />

      {/* Tail (\ /) */}
      <path
        d="M18,12 L21,10 M18,14 L21,16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />

      {/* Tracking signals ( ) ) ) */}
      <path
        d="M20,6 C21,6 22,7 22,8"
        stroke="var(--cyan)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M22,4 C24,4 25,6 25,8"
        stroke="var(--cyan)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
        transform="translate(-1, 0)"
      />

    </IconWrapper>
  );
}
