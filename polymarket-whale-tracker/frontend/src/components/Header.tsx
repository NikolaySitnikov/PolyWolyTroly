/**
 * Header Component
 *
 * Main header with logo, navigation, and live indicator.
 * Based on DESIGN_SYSTEM.md specifications.
 *
 * Features:
 * - Fixed position with blur backdrop
 * - Logo with whale emoji and brand name
 * - Desktop navigation tabs
 * - Live indicator
 * - Connect Telegram button
 */

import { tokens } from '../styles/tokens';
import { LiveIndicator } from './LiveIndicator';
import { NAV_ITEMS } from '../types/navigation';
import type { ViewId } from '../types/navigation';

interface HeaderProps {
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
  isMobile: boolean;
}

export function Header({ currentView, onNavigate, isMobile }: HeaderProps) {
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
            boxShadow: `0 0 30px ${tokens.colors.cyanGlow}`,
            transition: `transform ${tokens.animation.durationFast} ease`,
          }}
        >
          🐋
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
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                style={{
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
              </button>
            );
          })}
        </nav>
      )}

      {/* Right Section: Live Status & Connect Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <LiveIndicator />
        {!isMobile && (
          <button
            style={{
              padding: '10px 20px',
              background: tokens.colors.cyan,
              border: 'none',
              borderRadius: tokens.radius.md,
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              fontWeight: tokens.fontWeights.semibold,
              color: tokens.colors.void,
              cursor: 'pointer',
              boxShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
              transition: `all ${tokens.animation.durationFast} ease`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Connect Telegram
          </button>
        )}
      </div>
    </header>
  );
}
