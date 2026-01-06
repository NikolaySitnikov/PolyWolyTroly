/**
 * Alerts Icon Component
 *
 * Lightning bolt icon for alerts/notifications.
 * Used in: Navigation tabs, section headers
 */

import { IconWrapper, type IconProps } from './Icon';

/**
 * Lightning bolt alerts icon
 * Used in: Navigation, Alerts tab
 */
export function AlertsIcon(props: IconProps) {
  return (
    <IconWrapper {...props} viewBox="0 0 18 18">
      <polygon
        points="10 2 2 11 9 11 7 17 15 8 8 8 10 2"
        fill="currentColor"
        stroke="none"
      />
    </IconWrapper>
  );
}
