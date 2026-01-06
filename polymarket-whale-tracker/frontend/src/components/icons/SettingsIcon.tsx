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
      <circle cx="9" cy="9" r="3" />
      <path d="M9 1V4 M17 9H14 M9 17V14 M1 9H4 M14.65 3.35L12.5 5.5 M14.65 14.65L12.5 12.5 M3.35 14.65L5.5 12.5 M3.35 3.35L5.5 5.5" />
    </IconWrapper>
  );
}
