/**
 * Alerts Icon Component
 *
 * Geometric lightning bolt icon for alerts.
 * Used in: KPI cards (24px)
 */

import { IconWrapper, type IconProps } from './Icon';

export function AlertsIcon(props: IconProps) {
  return (
    <IconWrapper {...props} viewBox="0 0 24 24">
      <path
        d="M13,2 L4,14 H11 L9,22 L18,10 H11 L13,2 Z"
        fill="currentColor"
        stroke="none"
      />
    </IconWrapper>
  );
}
