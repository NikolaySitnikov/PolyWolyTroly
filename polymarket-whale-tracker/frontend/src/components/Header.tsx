/**
 * Header Component
 *
 * Main header with logo, navigation, and live indicator.
 * Based on DESIGN_SYSTEM.md specifications.
 *
 * Features:
 * - Fixed position with blur backdrop
 * - Logo with whale emoji and brand name (tail flick on hover)
 * - Desktop navigation tabs
 * - Live indicator
 * - Connect Telegram button
 *
 * @see ../../../Design docs/DESIGN_SYSTEM.md - Whale Mascot section
 */

import { useState } from 'react';
import { tokens } from '../styles/tokens';
import { LiveIndicator } from './LiveIndicator';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
import { NAV_ITEMS } from '../types/navigation';
import type { ViewId } from '../types/navigation';

interface HeaderProps {
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
  isMobile: boolean;
  /** Number of unread alerts (shown on alerts tab) */
  alertCount?: number;
}

/**
 * Format badge count (99+ for large numbers)
 */
function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return count.toString();
}

export function Header({ currentView, onNavigate, isMobile, alertCount }: HeaderProps) {
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  return (
    <header
      role="banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: isMobile ? '60px' : '70px',
        background: `${tokens.colors.void}ee`,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 32px',
        zIndex: 1000,
      }}
    >
      {/* Logo Section */}
      <button
        onClick={() => onNavigate('dashboard')}
        onMouseEnter={() => setIsLogoHovered(true)}
        onMouseLeave={() => setIsLogoHovered(false)}
        aria-label="Go to Dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <div
          data-testid="header-logo"
          style={{
            width: isMobile ? '32px' : '40px',
            height: isMobile ? '32px' : '40px',
            background: `linear-gradient(135deg, ${tokens.colors.cyan} 0%, ${tokens.colors.magenta} 100%)`,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '18px' : '22px',
            boxShadow: isLogoHovered
              ? `0 0 40px ${tokens.colors.cyanGlow}`
              : `0 0 30px ${tokens.colors.cyanGlow}`,
            transition: `all ${tokens.animation.durationFast} ease`,
            transform: isLogoHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <span
            data-testid="header-whale-emoji"
            style={{
              display: 'inline-block',
              animation: isLogoHovered ? 'whaleTailFlick 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              filter: isLogoHovered ? 'drop-shadow(0 0 8px rgba(0, 255, 240, 0.8))' : 'none',
              transition: 'filter 0.15s ease',
            }}
          >
            🐋
          </span>
        </div>
        {!isMobile && (
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: tokens.fonts.display,
                fontWeight: tokens.fontWeights.extrabold,
                fontSize: '18px',
                color: tokens.colors.textPrimary,
                letterSpacing: '-0.02em',
              }}
            >
              PolyWolyTroly
            </div>
            <div
              style={{
                fontSize: '10px',
                color: tokens.colors.textMuted,
                fontFamily: tokens.fonts.mono,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Whale Intelligence
            </div>
          </div>
        )}
      </button>

      {/* Desktop Navigation */}
      {!isMobile && (
        <nav style={{ display: 'flex', gap: '8px' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            const showBadge = item.id === 'alerts' && alertCount !== undefined && alertCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: isActive ? `${tokens.colors.cyan}15` : 'transparent',
                  border: isActive
                    ? `1px solid ${tokens.colors.cyan}50`
                    : '1px solid transparent',
                  borderRadius: tokens.radius.md,
                  fontFamily: tokens.fonts.body,
                  fontSize: '14px',
                  fontWeight: tokens.fontWeights.medium,
                  color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
                  cursor: 'pointer',
                  transition: `all ${tokens.animation.durationFast} ease`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = tokens.colors.surface;
                    e.currentTarget.style.color = tokens.colors.textPrimary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = tokens.colors.textSecondary;
                  }
                }}
              >
                <span>{item.icon}</span>
                {item.label}
                {/* Alert Badge */}
                {showBadge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: tokens.colors.magenta,
                      borderRadius: '9px',
                      fontFamily: tokens.fonts.mono,
                      fontSize: '10px',
                      fontWeight: 700,
                      color: tokens.colors.textPrimary,
                      boxShadow: `0 0 10px ${tokens.colors.magentaGlow}`,
                      animation: 'pulse 2s infinite',
                    }}
                  >
                    {formatBadgeCount(alertCount)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Right Section: Live Status & Connect Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <LiveIndicator />
        {!isMobile && (
          <Tooltip content="Get whale alerts directly in Telegram" placement="bottom">
            <Button variant="primary" size="md">
              Connect Telegram
            </Button>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
