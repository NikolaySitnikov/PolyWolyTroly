/**
 * Profile Types (Frontend)
 *
 * User profile interface and avatar utilities.
 * Used for displaying Polymarket Gamma API profile data.
 */

import type { PolymarketUserProfile } from './polymarket';

/**
 * Re-export the base profile type with a simpler name
 */
export type UserProfile = PolymarketUserProfile;

/**
 * Avatar gradient definition
 */
export interface AvatarGradient {
  from: string;
  to: string;
}

/**
 * Predefined avatar gradients based on design system
 */
export const AVATAR_GRADIENTS: AvatarGradient[] = [
  { from: '#00fff0', to: '#ff2d92' }, // cyan → magenta
  { from: '#a855f7', to: '#00fff0' }, // purple → cyan
  { from: '#ff2d92', to: '#ffaa00' }, // magenta → warning
  { from: '#00ff88', to: '#00fff0' }, // profit → cyan
  { from: '#00fff0', to: '#a855f7' }, // cyan → purple
  { from: '#ffaa00', to: '#ff2d92' }, // warning → magenta
] as const;

/**
 * Get display name from profile with fallback to truncated address
 */
export function getDisplayName(
  profile?: UserProfile | null,
  address?: string
): string {
  if (profile?.name) {
    return profile.name;
  }
  if (profile?.pseudonym) {
    return profile.pseudonym;
  }
  if (profile?.address) {
    return truncateAddress(profile.address);
  }
  if (address) {
    return truncateAddress(address);
  }
  return '';
}

/**
 * Truncate Ethereum address for display
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Generate a deterministic gradient based on wallet address
 */
export function getAvatarGradient(address: string): AvatarGradient {
  // Use first 6 chars after 0x to determine gradient
  const normalized = address.toLowerCase();
  const hash = normalized.startsWith('0x') ? normalized.slice(2, 8) : normalized.slice(0, 6);
  const num = parseInt(hash, 16) || 0;

  return AVATAR_GRADIENTS[num % AVATAR_GRADIENTS.length];
}

/**
 * Get initials from username or address for avatar placeholder
 */
export function getAvatarInitials(username?: string, address?: string): string {
  if (username) {
    // Split by common separators
    const words = username.split(/[\s_\-]+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    // Single word - take first two chars
    return username.slice(0, 2).toUpperCase();
  }

  if (address) {
    // Take first 2 chars after 0x
    const start = address.startsWith('0x') ? 2 : 0;
    return address.slice(start, start + 2).toUpperCase();
  }

  return '🐋';
}

/**
 * Check if a profile has a custom avatar
 */
export function hasCustomAvatar(profile?: UserProfile | null): boolean {
  return !!profile?.avatarUrl;
}

/**
 * Get avatar URL or null
 */
export function getAvatarUrl(profile?: UserProfile | null): string | null {
  return profile?.avatarUrl || null;
}
