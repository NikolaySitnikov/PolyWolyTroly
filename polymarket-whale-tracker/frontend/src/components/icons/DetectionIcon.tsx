/**
 * Detection Icon Component
 *
 * Shield with eye symbol representing insider detection/surveillance.
 * Used in: Navigation, Detection Dashboard
 */

import { IconWrapper, type IconProps } from './Icon';

export function DetectionIcon(props: IconProps) {
  return (
    <IconWrapper {...props} viewBox="0 0 24 24">
      {/* Shield outline */}
      <path
        d="M12 2L4 6V12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12V6L12 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Eye */}
      <ellipse
        cx="12"
        cy="11"
        rx="4"
        ry="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Pupil */}
      <circle
        cx="12"
        cy="11"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </IconWrapper>
  );
}
