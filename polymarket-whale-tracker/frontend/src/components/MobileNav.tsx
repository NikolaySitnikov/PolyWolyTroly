/**
 * MobileNav Component
 *
 * Fixed bottom navigation for mobile devices.
 * Based on DESIGN_SYSTEM.md specifications.
 *
 * Features:
 * - Fixed at bottom with blur backdrop
 * - 4 navigation items with icons
 * - Active state with cyan color
 * - Safe area inset support
 */

import { tokens } from '../styles/tokens';
import { MOBILE_NAV_ITEMS } from '../types/navigation';
import type { ViewId } from '../types/navigation';

interface MobileNavProps {
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
}

export function MobileNav({ currentView, onNavigate }: MobileNavProps) {
  return (
    <nav
      role="navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: `${tokens.colors.void}ee`,
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 16px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 1000,
      }}
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: isActive ? tokens.colors.cyan : tokens.colors.textMuted,
              cursor: 'pointer',
              transition: `all ${tokens.animation.durationFast} ease`,
            }}
          >
            <span
              style={{
                fontSize: '22px',
                filter: isActive ? `drop-shadow(0 0 8px ${tokens.colors.cyan})` : 'none',
              }}
            >
              {item.icon}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: tokens.fonts.body,
                fontWeight: isActive ? tokens.fontWeights.semibold : tokens.fontWeights.normal,
                letterSpacing: '0.02em',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
