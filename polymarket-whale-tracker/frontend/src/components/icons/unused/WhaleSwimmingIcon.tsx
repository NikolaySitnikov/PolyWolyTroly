/**
 * Whale Swimming Icon Component (UNUSED - saved for future use)
 *
 * Elegant whale silhouette with tracking signal arcs.
 * A more organic whale shape swimming to the right.
 */

import { IconWrapper, type IconProps } from '../Icon';

/**
 * Whale swimming with tracking ping icon
 * Alternative design - more organic curved whale shape
 */
export function WhaleSwimmingIcon(props: IconProps) {
  return (
    <IconWrapper {...props} viewBox="0 0 24 24">
      {/* Whale body - smooth curved silhouette swimming right */}
      <path
        d="M2 14 C4 10, 8 9, 12 10 C14 10, 16 11, 17 13 C17 15, 15 16, 12 16 C8 16, 4 15, 2 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Tail fluke */}
      <path
        d="M2 14 C1 12, 0 11, 1 9 M2 14 C1 16, 0 17, 1 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Eye */}
      <circle cx="14" cy="12" r="1" fill="currentColor" />

      {/* Tracking signal arcs - emanating from whale */}
      <path
        d="M19 10 C20 11, 20 13, 19 14"
        stroke="var(--cyan)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M21 8 C23 10, 23 14, 21 16"
        stroke="var(--cyan)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </IconWrapper>
  );
}
