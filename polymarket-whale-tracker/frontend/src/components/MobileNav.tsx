/**
 * MobileNav Component
 *
 * Bottom navigation bar for mobile devices.
 *
 * Enhanced with:
 * - Glass morphism background
 * - Active state glow effects
 * - Badge notifications
 * - Safe area padding for notched devices
 * - Haptic-style touch feedback
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { tokens } from '../styles/tokens';
import { MOBILE_NAV_ITEMS, isIconComponent } from '../types/navigation';
import type { ViewId, NavItem } from '../types/navigation';
import { iconStyles } from './icons';

interface MobileNavProps {
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
  /** Number of new whales detected (shown on whales tab) */
  whaleCount?: number;
  /** Number of unread alerts (shown on alerts tab) */
  alertCount?: number;
  /** Whether there are new settings/updates available */
  hasSettingsNotification?: boolean;
}

/**
 * Format badge count (99+ for large numbers)
 */
function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return count.toString();
}

/**
 * Individual Nav Item Component
 */
function NavItem({
  item,
  isActive,
  badgeCount,
  hasDot,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  badgeCount?: number;
  hasDot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        flex: 1,
        padding: '8px 4px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Icon Container with Glow */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '32px',
          borderRadius: '12px',
          background: isActive ? `${tokens.colors.cyan}15` : 'transparent',
          transition: 'all 0.2s ease',
          boxShadow: isActive ? `0 0 20px ${tokens.colors.cyanGlow}` : 'none',
        }}
      >
        {/* Icon */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            filter: isActive ? 'none' : 'grayscale(30%)',
            opacity: isActive ? 1 : 0.7,
            transition: 'all 0.2s ease',
          }}
        >
          {isIconComponent(item.icon) ? (
            <item.icon
              size={22}
              style={isActive ? iconStyles.active : iconStyles.secondary}
            />
          ) : (
            item.icon
          )}
        </span>

        {/* Badge Count */}
        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '2px',
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
            {formatBadgeCount(badgeCount)}
          </span>
        )}

        {/* Notification Dot (for settings) */}
        {hasDot && (
          <span
            style={{
              position: 'absolute',
              top: '0',
              right: '8px',
              width: '8px',
              height: '8px',
              background: tokens.colors.cyan,
              borderRadius: '50%',
              boxShadow: `0 0 8px ${tokens.colors.cyanGlow}`,
            }}
          />
        )}
      </div>

      {/* Label */}
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '10px',
          fontWeight: isActive ? 600 : 400,
          color: isActive ? tokens.colors.cyan : tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          transition: 'all 0.2s ease',
          textShadow: isActive ? `0 0 10px ${tokens.colors.cyanGlow}` : 'none',
        }}
      >
        {item.label}
      </span>

      {/* Active Indicator Dot */}
      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: isActive ? tokens.colors.cyan : 'transparent',
          boxShadow: isActive ? `0 0 8px ${tokens.colors.cyanGlow}` : 'none',
          transition: 'all 0.2s ease',
        }}
      />
    </button>
  );
}

export function MobileNav({
  currentView,
  onNavigate,
  whaleCount,
  alertCount,
  hasSettingsNotification,
}: MobileNavProps) {
  return (
    <nav
      data-testid="mobile-nav"
      role="navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,

        // Glass morphism
        background: `${tokens.colors.surface}e8`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',

        // Border
        borderTop: `1px solid ${tokens.colors.border}`,

        // Shadow
        boxShadow: `
          0 -4px 30px ${tokens.colors.void}60,
          0 0 1px ${tokens.colors.border}
        `,

        // Safe area for notched devices
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '60px',
          maxWidth: '500px',
          margin: '0 auto',
          padding: '0 8px',
        }}
      >
        {MOBILE_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={currentView === item.id}
            badgeCount={
              item.id === 'whales'
                ? whaleCount
                : item.id === 'alerts'
                  ? alertCount
                  : undefined
            }
            hasDot={item.id === 'settings' ? hasSettingsNotification : undefined}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>
    </nav>
  );
}
