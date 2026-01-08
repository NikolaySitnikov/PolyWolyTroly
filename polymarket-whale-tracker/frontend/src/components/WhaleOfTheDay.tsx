/**
 * WhaleOfTheDay Component
 *
 * Fixed-position floating trophy showcasing today's top whale.
 * Uses gold accent to stand out from cyan-focused data UI.
 *
 * States:
 * - Micro: Crown icon with subtle pulse (default)
 * - Hover: Crown + amount revealed
 * - Expanded: Full trophy card with stats
 *
 * Design Philosophy:
 * - Precious — Gold accent, not cyan (stands out from data-focused UI)
 * - Celebratory — Subtle animation suggests achievement
 * - Unobtrusive — Micro state is minimal, doesn't compete with main content
 * - Rewarding — Expanding feels like opening a treasure chest
 * - Consistent — Expanded state uses unified card patterns
 *
 * @see Design docs/Jan 4 2026 - WhaleOfTheDay — Design Guidelines
 */

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { GlowText } from './GlowText';
import { useWhaleOfTheDay } from '../hooks/useWhaleOfTheDay';

export interface WhaleOfTheDayProps {
  isMobile: boolean;
  onViewProfile?: (address: string) => void;
}

// Gold accent colors (unique to this component - trophy case)
const gold = {
  base: '#ffd700',
  glow: 'rgba(255, 215, 0, 0.25)',
  glowIntense: 'rgba(255, 215, 0, 0.4)',
  gradient: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)',
  dim: '#b8860b',
};

/** Format large USD amounts */
function formatUSD(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/** Truncate wallet address */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * WhaleOfTheDay - Floating trophy badge
 */
export function WhaleOfTheDay({ isMobile, onViewProfile }: WhaleOfTheDayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const { topWhale, loading } = useWhaleOfTheDay();
  const containerRef = useRef<HTMLDivElement>(null);

  // Entry animation trigger
  useEffect(() => {
    if (topWhale && !loading && !hasAnimatedIn) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => setHasAnimatedIn(true), 300);
      return () => clearTimeout(timer);
    }
  }, [topWhale, loading, hasAnimatedIn]);

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Close on escape
  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  // Auto-collapse hover state after dismissing expanded view (mobile fix)
  // On mobile, touch events set isHovered but don't unset it
  useEffect(() => {
    if (!isExpanded && isHovered) {
      // After collapsing, keep hover state briefly then reset to micro state
      const timer = setTimeout(() => {
        setIsHovered(false);
      }, 2000); // 2 seconds in hover state, then collapse to micro
      return () => clearTimeout(timer);
    }
  }, [isExpanded, isHovered]);

  // Don't render if no data
  if (!loading && !topWhale) return null;

  const handleToggleExpand = () => {
    if (!loading) setIsExpanded(!isExpanded);
  };

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (topWhale && onViewProfile) {
      onViewProfile(topWhale.address);
      setIsExpanded(false);
    }
  };

  // ==================
  // STYLES
  // ==================

  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: isMobile ? '90px' : '24px', // Above mobile nav + pagination
    right: isMobile ? '16px' : '24px',
    zIndex: 150, // Above sticky pagination (100)
    fontFamily: tokens.fonts.body,
    // Entry animation
    opacity: hasAnimatedIn || loading ? 1 : 0,
    transform: hasAnimatedIn || loading ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
    transition: 'opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  // Micro badge (collapsed state)
  const microBadgeStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isHovered ? '10px' : '0',
    padding: '12px',
    background: tokens.colors.surface,
    border: `1px solid ${isHovered ? gold.base : tokens.colors.border}`,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: `all 0.25s ${tokens.animation.easeOutExpo}`,
    boxShadow: isHovered
      ? `0 4px 24px ${gold.glow}, 0 0 0 1px ${gold.base}40`
      : `0 2px 12px rgba(0,0,0,0.3)`,
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
  };

  // Expanded card
  const expandedCardStyle: CSSProperties = {
    width: isMobile ? '280px' : '300px',
    background: tokens.colors.surface,
    border: `1px solid ${gold.base}`,
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: `
      0 8px 32px ${gold.glow},
      0 0 0 1px ${gold.base}40,
      inset 0 1px 0 rgba(255, 215, 0, 0.1)
    `,
    animation: 'expandIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  // Crown styles
  const crownStyle: CSSProperties = {
    fontSize: isExpanded ? '20px' : '22px',
    filter: `drop-shadow(0 0 ${isHovered || isExpanded ? '12px' : '8px'} ${gold.glow})`,
    animation: !isExpanded ? 'crownFloat 3s ease-in-out infinite' : 'none',
    transition: 'filter 0.2s ease',
  };

  // Amount in micro state (revealed on hover)
  const microAmountStyle: CSSProperties = {
    fontFamily: tokens.fonts.mono,
    fontSize: '14px',
    fontWeight: 700,
    color: tokens.colors.textPrimary,
    whiteSpace: 'nowrap',
    maxWidth: isHovered ? '100px' : '0',
    opacity: isHovered ? 1 : 0,
    overflow: 'hidden',
    transition: 'all 0.25s ease-out',
  };

  // ==================
  // LOADING STATE
  // ==================

  if (loading) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            ...microBadgeStyle,
            opacity: 0.5,
            cursor: 'default',
          }}
          data-testid="whale-of-the-day-loading"
        >
          <span style={{ ...crownStyle, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }}>
            👑
          </span>
        </div>
      </div>
    );
  }

  if (!topWhale) return null;

  // ==================
  // EXPANDED STATE
  // ==================

  if (isExpanded) {
    return (
      <div style={containerStyle} ref={containerRef}>
        <div
          data-testid="whale-of-the-day"
          style={expandedCardStyle}
          role="dialog"
          aria-expanded={true}
          aria-label="Whale of the Day details"
          onClick={handleToggleExpand}
        >
          {/* Header with gold gradient */}
          <div
            style={{
              background: `linear-gradient(135deg, ${gold.base}15 0%, ${gold.dim}10 100%)`,
              borderBottom: `1px solid ${tokens.colors.border}`,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={crownStyle}>👑</span>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: gold.base,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  textShadow: `0 0 20px ${gold.glow}`,
                }}
              >
                Whale of the Day
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: tokens.colors.void,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '8px',
                color: tokens.colors.textMuted,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.textMuted;
                e.currentTarget.style.color = tokens.colors.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border;
                e.currentTarget.style.color = tokens.colors.textMuted;
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Main content */}
          <div style={{ padding: '16px' }}>
            {/* Amount - hero treatment */}
            <div style={{ marginBottom: '4px' }}>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: isMobile ? '28px' : '32px',
                  fontWeight: 700,
                  color: tokens.colors.profit,
                  textShadow: `0 0 30px ${tokens.colors.profitGlow}`,
                }}
              >
                {formatUSD(topWhale.totalToday)}
              </span>
            </div>

            {/* Address */}
            <div
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '13px',
                color: tokens.colors.cyan,
                textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
                marginBottom: '16px',
              }}
            >
              {truncateAddress(topWhale.address)}
            </div>

            {/* Stats grid - matches card system */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                paddingTop: '16px',
                borderTop: `1px solid ${tokens.colors.border}`,
                marginBottom: '16px',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '10px',
                    color: tokens.colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '4px',
                  }}
                >
                  Deposits Today
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '17px',
                    fontWeight: 600,
                    color: tokens.colors.textPrimary,
                  }}
                >
                  {topWhale.depositCount}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '10px',
                    color: tokens.colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '4px',
                  }}
                >
                  Largest
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '17px',
                    fontWeight: 600,
                    color: tokens.colors.textPrimary,
                  }}
                >
                  {formatUSD(topWhale.largestDeposit)}
                </div>
              </div>
            </div>

            {/* View Profile Button - Gold gradient */}
            <button
              onClick={handleViewProfile}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: gold.gradient,
                border: 'none',
                borderRadius: '10px',
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                fontWeight: 600,
                color: tokens.colors.void,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: `0 4px 20px ${gold.glow}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 6px 24px ${gold.glowIntense}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 20px ${gold.glow}`;
              }}
            >
              View Profile →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================
  // MICRO STATE (default)
  // ==================

  return (
    <div style={containerStyle} ref={containerRef}>
      <div
        data-testid="whale-of-the-day"
        role="button"
        tabIndex={0}
        onClick={handleToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        // Touch feedback
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = isHovered ? 'translateY(-2px)' : 'translateY(0)';
        }}
        style={microBadgeStyle}
        aria-expanded={isExpanded}
        aria-label={`Whale of the Day: ${formatUSD(topWhale.totalToday)}. Click to expand.`}
      >
        {/* Crown with sparkles */}
        <div style={{ position: 'relative' }}>
          <span style={crownStyle} aria-hidden="true">
            👑
          </span>
          {/* Sparkle particles */}
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              fontSize: '8px',
              color: gold.base,
              opacity: 0.8,
              animation: 'sparkle 2s ease-in-out infinite',
            }}
          >
            ✦
          </span>
          <span
            style={{
              position: 'absolute',
              bottom: '0',
              left: '-6px',
              fontSize: '6px',
              color: gold.base,
              opacity: 0.6,
              animation: 'sparkle 2s ease-in-out infinite 0.5s',
            }}
          >
            ✦
          </span>
        </div>
        <span style={microAmountStyle}>
          <GlowText color="profit">{formatUSD(topWhale.totalToday)}</GlowText>
        </span>
      </div>
    </div>
  );
}

export default WhaleOfTheDay;
