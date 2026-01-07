/**
 * WalletProfileHeader Component
 *
 * Enhanced wallet profile header with avatar, username, live badge,
 * and action buttons. Per TRADING_FEATURES_DESIGN_GUIDE.md Section 5.
 *
 * Layout:
 * Desktop: Avatar | Username + Handle + Address + Actions | LiveBadge
 * Mobile: More compact vertical arrangement
 */

import { useState, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { GeneratedAvatar } from './GeneratedAvatar';
import { LiveBadge } from './LiveBadge';
import { GlowText } from './GlowText';
import {
  getDisplayName,
  hasHumanReadableName,
  type UserProfile,
} from '../types/profile';

export interface WalletProfileHeaderProps {
  /** Wallet address */
  address: string;
  /** User profile from Gamma API (optional) */
  profile?: UserProfile | null;
  /** Whether the whale is live (active in last 24h) */
  isLive: boolean;
  /** Last activity timestamp */
  lastActivityAt?: string | null;
  /** Mobile layout */
  isMobile: boolean;
}

/**
 * Copy button with feedback
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Copy address"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: isHovered ? tokens.colors.surfaceHover : 'transparent',
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '6px',
        fontFamily: tokens.fonts.mono,
        fontSize: '12px',
        color: copied ? tokens.colors.profit : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}

/**
 * Verified badge icon
 */
function VerifiedBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: tokens.colors.cyan,
        color: tokens.colors.void,
        fontSize: '10px',
        marginLeft: '4px',
      }}
      title="Verified on Polymarket"
    >
      ✓
    </span>
  );
}

export function WalletProfileHeader({
  address,
  profile,
  isLive,
  lastActivityAt,
  isMobile,
}: WalletProfileHeaderProps) {
  const displayName = getDisplayName(profile, address);
  const hasUsername = hasHumanReadableName(profile);
  const avatarSize = isMobile ? 48 : 64;

  const containerStyle: CSSProperties = {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '12px',
    padding: isMobile ? '20px' : '24px',
  };

  const contentStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: isMobile ? '16px' : '20px',
  };

  const infoContainerStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  };

  const titleRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  };

  const nameStyle: CSSProperties = {
    fontFamily: tokens.fonts.display,
    fontSize: isMobile ? '18px' : '20px',
    fontWeight: 700,
    color: tokens.colors.textPrimary,
    margin: 0,
  };

  const handleStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: '13px',
    color: tokens.colors.textSecondary,
  };

  const addressBoxStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: isMobile ? '11px' : '13px',
    color: tokens.colors.cyan,
    background: `${tokens.colors.cyan}10`,
    padding: '8px 12px',
    borderRadius: '8px',
    wordBreak: 'break-all',
    width: 'fit-content',
    maxWidth: '100%',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: isMobile ? '4px' : '0',
  };

  const polygonscanButtonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: tokens.colors.cyan,
    border: 'none',
    borderRadius: '6px',
    fontFamily: tokens.fonts.body,
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colors.void,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const twitterButtonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '6px',
    color: tokens.colors.textSecondary,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'all 0.15s ease',
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Avatar */}
        <GeneratedAvatar
          address={address}
          profile={profile}
          size={avatarSize}
        />

        {/* Info section */}
        <div style={infoContainerStyle}>
          {/* Title row: Name + LiveBadge */}
          <div style={titleRowStyle}>
            <h1 style={nameStyle}>
              {hasUsername ? (
                <>
                  {displayName}
                  {profile?.verified && <VerifiedBadge />}
                </>
              ) : (
                <>
                  <GlowText>Whale</GlowText> Profile
                </>
              )}
            </h1>
            <LiveBadge
              isLive={isLive}
              lastActivityAt={lastActivityAt}
              size="lg"
              showLabel
            />
          </div>

          {/* Twitter handle (if available) */}
          {profile?.twitterHandle && (
            <span style={handleStyle}>@{profile.twitterHandle}</span>
          )}

          {/* Address box - links to Polymarket profile */}
          <a
            href={`https://polymarket.com/profile/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={addressBoxStyle}
            title="View on Polymarket"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${tokens.colors.cyan}20`;
              e.currentTarget.style.boxShadow = `0 0 10px ${tokens.colors.cyanGlow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${tokens.colors.cyan}10`;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {address}
          </a>
        </div>

        {/* Actions (desktop: right side, mobile: below) */}
        <div style={actionsStyle}>
          <CopyButton text={address} />
          <a
            href={`https://polygonscan.com/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={polygonscanButtonStyle}
          >
            View on Polygonscan ↗
          </a>
          {profile?.twitterHandle && (
            <a
              href={`https://x.com/${profile.twitterHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              style={twitterButtonStyle}
              title={`@${profile.twitterHandle} on X`}
            >
              𝕏
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
