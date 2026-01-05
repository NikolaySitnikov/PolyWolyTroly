/**
 * CopyableAddress Component
 *
 * Displays a wallet address with long-press to copy functionality.
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Long press on address: Copy to clipboard
 * - Haptic feedback on action
 * - Font: JetBrains Mono, cyan color
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md
 */

import React, { useState, useCallback, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { useLongPress } from '../hooks/useLongPress';

export interface CopyableAddressProps {
  /** The full wallet address */
  address: string;
  /** Whether to show the full address or shortened version */
  showFull?: boolean;
  /** Optional click handler (for navigation) */
  onClick?: () => void;
  /** Custom font size */
  fontSize?: string;
  /** Additional className */
  className?: string;
}

/**
 * Shorten an Ethereum address for display
 * Format: 0x1234...5678
 */
function shortenAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * CopyableAddress - Wallet address with long-press to copy
 *
 * Features:
 * - Long-press (500ms) to copy full address to clipboard
 * - Haptic feedback on mobile devices
 * - Visual feedback during press and after copy
 * - Optional click-to-navigate behavior
 *
 * @example
 * ```tsx
 * <CopyableAddress
 *   address="0x1234567890abcdef1234567890abcdef12345678"
 *   onClick={() => navigate(`/wallet/${address}`)}
 * />
 * ```
 */
export const CopyableAddress: React.FC<CopyableAddressProps> = ({
  address,
  showFull = false,
  onClick,
  fontSize = '13px',
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        // Fallback for mobile browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setCopyError(false);

      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopyError(true);
      setTimeout(() => {
        setCopyError(false);
      }, 2000);
    }
  }, [address]);

  const { handlers, isPressed, isLongPressed } = useLongPress(handleCopy, {
    threshold: 500,
  });

  const displayAddress = showFull ? address : shortenAddress(address);

  // Container style
  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: tokens.fonts.mono,
    fontSize,
    fontWeight: 400,
    color: tokens.colors.cyan,
    backgroundColor: `${tokens.colors.cyan}10`,
    padding: '4px 8px',
    borderRadius: tokens.radius.sm,
    cursor: onClick ? 'pointer' : 'default',
    transition: `all ${tokens.animation.durationFast} ease`,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    touchAction: 'manipulation',
    // Visual feedback during press
    transform: isPressed ? 'scale(0.97)' : 'scale(1)',
    opacity: isPressed ? 0.8 : 1,
    // Glow effect when long-pressed
    boxShadow: isLongPressed
      ? `0 0 20px ${tokens.colors.cyanGlow}`
      : 'none',
  };

  // Success/error indicator style
  const indicatorStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: tokens.fonts.body,
    fontSize: '11px',
    fontWeight: 500,
    animation: 'fadeIn 0.15s ease',
  };

  const handleClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent parent card click
    e.stopPropagation();
    // Only trigger click if it wasn't a long press
    if (!isLongPressed && onClick) {
      onClick();
    }
  };

  return (
    <span
      data-testid="copyable-address"
      className={className}
      style={containerStyle}
      role="button"
      aria-label={`${displayAddress}. Long press to copy full address.`}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
        // Ctrl/Cmd + C to copy
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          handleCopy();
        }
      }}
      {...handlers}
    >
      {/* Address text */}
      <span style={{
        textDecoration: copied ? 'none' : 'none',
        opacity: copied ? 0.7 : 1,
      }}>
        {displayAddress}
      </span>

      {/* Copy success indicator */}
      {copied && (
        <span style={{ ...indicatorStyle, color: tokens.colors.profit }}>
          ✓ Copied
        </span>
      )}

      {/* Copy error indicator */}
      {copyError && (
        <span style={{ ...indicatorStyle, color: tokens.colors.loss }}>
          ✗ Failed
        </span>
      )}

      {/* Long-press hint (shows when pressed but not yet copied) */}
      {isPressed && !copied && !isLongPressed && (
        <span
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '4px',
            padding: '4px 8px',
            background: tokens.colors.void,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.radius.sm,
            fontFamily: tokens.fonts.body,
            fontSize: '10px',
            color: tokens.colors.textMuted,
            whiteSpace: 'nowrap',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          Hold to copy...
        </span>
      )}
    </span>
  );
};

export default CopyableAddress;
