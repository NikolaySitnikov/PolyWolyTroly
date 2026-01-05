/**
 * Navigation Types
 *
 * Type definitions for navigation state and views.
 */

/**
 * Available navigation views in the application
 * 'wallet' is a dynamic view that displays a specific wallet profile
 */
export type ViewId = 'dashboard' | 'whales' | 'alerts' | 'settings' | 'wallet';

/**
 * Navigation item configuration
 */
export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
}

/**
 * Standard navigation items for the app
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'whales', label: 'Whales', icon: '🐋' },
  { id: 'alerts', label: 'Alerts', icon: '⚡' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

/**
 * Mobile-specific navigation items (may have different labels)
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'whales', label: 'Whales', icon: '🐋' },
  { id: 'alerts', label: 'Alerts', icon: '⚡' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];
