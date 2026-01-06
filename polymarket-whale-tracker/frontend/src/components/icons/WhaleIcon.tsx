/**
 * Whale Icon Component
 *
 * Stylized whale silhouette icon for navigation.
 * Used in: Navigation tabs, section headers, KPI cards
 */

import { IconWrapper, type IconProps } from './Icon';

/**
 * Whale silhouette icon
 * Used in: Navigation, Whale tab, KPI cards
 */
export function WhaleIcon(props: IconProps) {
  return (
    <IconWrapper {...props} viewBox="0 0 18 18">
      <path
        fill="currentColor"
        stroke="none"
        d="M1.5,9 C1.5,3.5 8,1 14,6 L17,4 L15.5,9 L17,14 L14,12 C9,16 2.5,15 1.5,9 Z"
      />
    </IconWrapper>
  );
}
