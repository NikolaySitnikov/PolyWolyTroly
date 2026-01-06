/**
 * Dashboard Icon Component
 *
 * Grid-based dashboard icon for navigation.
 * Used in: Navigation tabs, section headers
 */

import { IconWrapper, type IconProps } from './Icon';

/**
 * Dashboard grid icon
 * Used in: Navigation, section headers
 */
export function DashboardIcon(props: IconProps) {
  return (
    <IconWrapper {...props}>
      <path d="M2 5V3a1 1 0 0 1 1-1h2m8 0h2a1 1 0 0 1 1 1v2m0 8v2a1 1 0 0 1-1 1h-2m-8 0H3a1 1 0 0 1-1-1v-2M2 9h3l2-5 2 10 2-5h3" />
    </IconWrapper>
  );
}
