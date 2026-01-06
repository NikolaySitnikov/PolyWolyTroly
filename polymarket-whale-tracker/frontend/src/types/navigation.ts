/**
 * Navigation Types
 *
 * Type definitions for navigation state and views.
 */

import type { ComponentType } from 'react';
import type { IconProps } from '../components/icons';

/**
 * Available navigation views in the application
 * 'wallet' is a dynamic view that displays a specific wallet profile
 */
export type ViewId = 'dashboard' | 'whales' | 'alerts' | 'settings' | 'wallet';

/**
 * Icon can be either a string (emoji) or a React component
 */
export type NavIcon = string | ComponentType<IconProps>;

/**
 * Navigation item configuration
 */
export interface NavItem {
  id: ViewId;
  label: string;
  icon: NavIcon;
}

/**
 * Type guard to check if icon is a component
 */
export function isIconComponent(icon: NavIcon): icon is ComponentType<IconProps> {
  return typeof icon === 'function';
}

// Import icons - lazy to avoid circular dependencies
// Icons are imported where NAV_ITEMS is used, not here
import { DashboardIcon, WhaleIcon, AlertsIcon, SettingsIcon } from '../components/icons';

/**
 * Standard navigation items for the app
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'whales', label: 'Whales', icon: WhaleIcon },
  { id: 'alerts', label: 'Alerts', icon: AlertsIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

/**
 * Mobile-specific navigation items (may have different labels)
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: DashboardIcon },
  { id: 'whales', label: 'Whales', icon: WhaleIcon },
  { id: 'alerts', label: 'Alerts', icon: AlertsIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];
