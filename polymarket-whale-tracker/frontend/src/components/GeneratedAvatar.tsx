/**
 * GeneratedAvatar Component
 *
 * Displays a user avatar with gradient background and initials fallback.
 * If imageUrl is provided, shows the actual avatar image.
 * Otherwise, generates a deterministic gradient from the address hash
 * and displays initials.
 *
 * Per TRADING_FEATURES_DESIGN_GUIDE.md Section 5.
 */

import type { CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import {
  getAvatarGradient,
  getAvatarInitials,
  getAvatarUrl,
  type UserProfile,
} from '../types/profile';

export interface GeneratedAvatarProps {
  /** Wallet address (used for gradient generation) */
  address: string;
  /** Optional profile with avatar URL */
  profile?: UserProfile | null;
  /** Avatar size in pixels */
  size?: number;
  /** Optional username for initials (overrides profile) */
  username?: string;
}

export function GeneratedAvatar({
  address,
  profile,
  size = 64,
  username,
}: GeneratedAvatarProps) {
  const avatarUrl = getAvatarUrl(profile);
  const gradient = getAvatarGradient(address);
  const displayName = username || profile?.name || profile?.pseudonym;
  const initials = getAvatarInitials(displayName, address);

  const containerStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '16px',
    background: `linear-gradient(135deg, ${gradient.from}40, ${gradient.to}40)`,
    border: `2px solid ${tokens.colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.35,
    fontFamily: tokens.fonts.mono,
    fontWeight: 700,
    color: tokens.colors.textPrimary,
    boxShadow: `0 0 30px ${tokens.colors.cyanGlow}`,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const imageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  return (
    <div style={containerStyle} aria-label={`Avatar for ${address}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          style={imageStyle}
          onError={(e) => {
            // On image load error, hide the image to show initials
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}
