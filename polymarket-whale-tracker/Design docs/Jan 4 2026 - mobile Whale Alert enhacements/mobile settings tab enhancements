# 📱 MobileNav & Settings — Enhanced Mobile Design Guidelines

Completing the mobile experience with the bottom navigation and settings page enhancements.

---

# Part 1: MobileNav Bottom Navigation

## Current vs Enhanced Structure

```
CURRENT                              ENHANCED
┌─────────────────────┐              ┌─────────────────────────────────────┐
│ 🏠  🐋  ⚡  ⚙️      │              │                                     │
│ Home Whales Alerts  │              │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│      Settings       │              │  │ 🏠 │ │🐋  │ │ ⚡ │ │ ⚙️ │       │
└─────────────────────┘              │  │Home│ │ 23 │ │ 5  │ │Set │       │
                                     │  └────┘ └────┘ └────┘ └────┘       │
                                     │    ●                               │ ← Active dot
                                     └─────────────────────────────────────┘
                                       ↑ Glass blur + glow on active
```

---

## Complete Enhanced MobileNav.tsx

```tsx
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

export type NavTab = 'dashboard' | 'whales' | 'alerts' | 'settings';

interface MobileNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** Number of new whales detected (shown on whales tab) */
  whaleCount?: number;
  /** Number of unread alerts (shown on alerts tab) */
  alertCount?: number;
  /** Whether there are new settings/updates available */
  hasSettingsNotification?: boolean;
}

interface NavItemConfig {
  id: NavTab;
  icon: string;
  activeIcon: string;
  label: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', icon: '🏠', activeIcon: '🏠', label: 'Home' },
  { id: 'whales', icon: '🐋', activeIcon: '🐋', label: 'Whales' },
  { id: 'alerts', icon: '⚡', activeIcon: '⚡', label: 'Alerts' },
  { id: 'settings', icon: '⚙️', activeIcon: '⚙️', label: 'Settings' },
];

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
  item: NavItemConfig;
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
            fontSize: '22px',
            filter: isActive ? 'none' : 'grayscale(30%)',
            opacity: isActive ? 1 : 0.7,
            transition: 'all 0.2s ease',
          }}
        >
          {isActive ? item.activeIcon : item.icon}
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
  activeTab,
  onTabChange,
  whaleCount,
  alertCount,
  hasSettingsNotification,
}: MobileNavProps) {
  return (
    <nav
      data-testid="mobile-nav"
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
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            badgeCount={
              item.id === 'whales' ? whaleCount :
              item.id === 'alerts' ? alertCount :
              undefined
            }
            hasDot={item.id === 'settings' ? hasSettingsNotification : undefined}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>
    </nav>
  );
}
```

---

## MobileNav Visual Specifications

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│                    Glass Blur Background                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   🏠     │  │   🐋     │  │   ⚡     │  │   ⚙️     │     │
│  │  ═══     │  │   [23]   │  │   [5]    │  │   •      │     │
│  │  Home    │  │  Whales  │  │  Alerts  │  │ Settings │     │
│  │    •     │  │          │  │          │  │          │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│               ↑ Active glow                                  │
├─────────────────────────────────────────────────────────────┤
│                 Safe Area Padding                            │
└─────────────────────────────────────────────────────────────┘
```

### States

| State | Icon Container | Label | Indicator |
|-------|---------------|-------|-----------|
| **Default** | Transparent bg | `textMuted`, 400 weight | Hidden |
| **Active** | `cyan 15%` bg + 20px glow | `cyan`, 600 weight, text-shadow | 4px cyan dot |
| **With Badge** | + Magenta badge top-right | — | — |
| **With Dot** | + 8px cyan dot | — | — |

### Badge Specifications
- **Size:** 18px height, min-width 18px
- **Padding:** 0 5px (for multi-digit)
- **Font:** 10px mono, 700 weight
- **Color:** Magenta background, white text
- **Glow:** 10px magenta glow
- **Animation:** `pulse 2s infinite`
- **Max display:** "99+"

---

# Part 2: Settings Page Mobile Enhancement

## Current vs Enhanced Structure

```
CURRENT                              ENHANCED
┌─────────────────────┐              ┌─────────────────────────────────────┐
│ ⚙️ Settings         │              │  ⚙️ Settings                        │ ← Sticky
│─────────────────────│              └─────────────────────────────────────┘
│ Min Deposit         │                                ↓
│ [___________] $10K  │              ┌─────────────────────────────────────┐
│                     │              │  💰 ALERT THRESHOLDS                │
│ Refresh Interval    │              │  ┌─────────────────────────────┐    │
│ [___________] 30s   │              │  │ Minimum Deposit             │    │
│                     │              │  │ $10,000            [$10K]   │    │
│ [Save]              │              │  │ ════════════●═══════════    │    │
│                     │              │  │ $1K        $50K      $100K+ │    │
│                     │              │  └─────────────────────────────┘    │
│                     │              └─────────────────────────────────────┘
│                     │                                ↓
│                     │              ┌─────────────────────────────────────┐
│                     │              │  🔔 NOTIFICATIONS                   │
│                     │              │  ┌─────────────────────────────┐    │
│                     │              │  │ Telegram Alerts      [ON]   │    │
│                     │              │  │ Sound Effects        [OFF]  │    │
│                     │              │  │ Browser Push         [ON]   │    │
│                     │              │  └─────────────────────────────┘    │
│                     │              └─────────────────────────────────────┘
│                     │                                ↓
│                     │              ┌─────────────────────────────────────┐
│                     │              │  🎨 APPEARANCE                      │
│                     │              │  ┌─────────────────────────────┐    │
│                     │              │  │ Theme          [🌙 Dark]    │    │
│                     │              │  │ Compact Mode         [OFF]  │    │
│                     │              │  └─────────────────────────────┘    │
└─────────────────────┘              └─────────────────────────────────────┘
```

---

## Complete Enhanced Settings.tsx

```tsx
/**
 * Settings Component
 *
 * User preferences and configuration panel.
 * 
 * Enhanced mobile view with:
 * - Sticky header
 * - Grouped settings sections
 * - Custom toggle switches
 * - Slider controls with presets
 * - Visual feedback on changes
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { useState, useEffect, useCallback } from 'react';
import { tokens } from '../styles/tokens';

interface SettingsProps {
  isMobile: boolean;
  /** Initial minimum deposit threshold in USD */
  initialMinDeposit?: number;
  /** Initial refresh interval in seconds */
  initialRefreshInterval?: number;
  /** Callback when settings are saved */
  onSave?: (settings: SettingsData) => void;
}

interface SettingsData {
  minDeposit: number;
  refreshInterval: number;
  telegramAlerts: boolean;
  soundEffects: boolean;
  browserPush: boolean;
  theme: 'dark' | 'light' | 'system';
  compactMode: boolean;
}

/**
 * Format USD value with K/M suffix
 */
function formatUSD(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${Math.round(num / 1000)}K`;
  }
  return `$${num}`;
}

/**
 * Custom Toggle Switch Component
 */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        position: 'relative',
        width: '52px',
        height: '28px',
        borderRadius: '14px',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked
          ? `linear-gradient(135deg, ${tokens.colors.cyan}, ${tokens.colors.profit})`
          : tokens.colors.void,
        boxShadow: checked
          ? `0 0 20px ${tokens.colors.cyanGlow}, inset 0 0 0 1px ${tokens.colors.cyan}50`
          : `inset 0 0 0 1px ${tokens.colors.border}`,
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '26px' : '2px',
          width: '24px',
          height: '24px',
          borderRadius: '12px',
          background: tokens.colors.textPrimary,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  );
}

/**
 * Setting Row Component
 */
function SettingRow({
  icon,
  label,
  description,
  children,
  isMobile,
}: {
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '16px',
        padding: isMobile ? '16px' : '16px 20px',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
        <span style={{ fontSize: isMobile ? '18px' : '16px', marginTop: '2px' }}>{icon}</span>
        <div>
          <div
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: isMobile ? '15px' : '14px',
              fontWeight: 500,
              color: tokens.colors.textPrimary,
              marginBottom: description ? '4px' : 0,
            }}
          >
            {label}
          </div>
          {description && (
            <div
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: isMobile ? '13px' : '12px',
                color: tokens.colors.textMuted,
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>
      <div style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Section Header Component
 */
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
        marginTop: '8px',
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '11px',
          fontWeight: 600,
          color: tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </span>
    </div>
  );
}

/**
 * Preset Button Component
 */
function PresetButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        background: isActive ? `${tokens.colors.cyan}20` : tokens.colors.void,
        border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: '8px',
        fontFamily: tokens.fonts.mono,
        fontSize: '12px',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isActive ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
      }}
    >
      {label}
    </button>
  );
}

/**
 * Theme Selector Component
 */
function ThemeSelector({
  value,
  onChange,
  isMobile,
}: {
  value: 'dark' | 'light' | 'system';
  onChange: (value: 'dark' | 'light' | 'system') => void;
  isMobile: boolean;
}) {
  const options: { value: 'dark' | 'light' | 'system'; icon: string; label: string }[] = [
    { value: 'dark', icon: '🌙', label: 'Dark' },
    { value: 'light', icon: '☀️', label: 'Light' },
    { value: 'system', icon: '💻', label: 'System' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        width: isMobile ? '100%' : 'auto',
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            flex: isMobile ? 1 : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: isMobile ? '12px 16px' : '8px 14px',
            background: value === option.value ? `${tokens.colors.cyan}15` : tokens.colors.void,
            border: `1px solid ${value === option.value ? tokens.colors.cyan : tokens.colors.border}`,
            borderRadius: '10px',
            fontFamily: tokens.fonts.mono,
            fontSize: isMobile ? '13px' : '12px',
            fontWeight: value === option.value ? 600 : 400,
            color: value === option.value ? tokens.colors.cyan : tokens.colors.textSecondary,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: value === option.value ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
          }}
        >
          <span>{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Deposit Slider Component
 */
function DepositSlider({
  value,
  onChange,
  isMobile,
}: {
  value: number;
  onChange: (value: number) => void;
  isMobile: boolean;
}) {
  // Presets
  const presets = [1000, 5000, 10000, 25000, 50000, 100000];

  // Convert value to slider position (logarithmic scale)
  const minLog = Math.log(1000);
  const maxLog = Math.log(100000);
  const valueToSlider = (val: number) => ((Math.log(val) - minLog) / (maxLog - minLog)) * 100;
  const sliderToValue = (pos: number) => Math.exp(minLog + (pos / 100) * (maxLog - minLog));

  const sliderPosition = valueToSlider(value);

  return (
    <div style={{ width: '100%' }}>
      {/* Current Value Display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: isMobile ? '24px' : '20px',
            fontWeight: 700,
            color: tokens.colors.cyan,
            textShadow: `0 0 15px ${tokens.colors.cyanGlow}`,
          }}
        >
          {formatUSD(value)}
        </span>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.textMuted,
            padding: '4px 10px',
            background: tokens.colors.void,
            borderRadius: '6px',
          }}
        >
          minimum
        </span>
      </div>

      {/* Slider Track */}
      <div
        style={{
          position: 'relative',
          height: '8px',
          background: tokens.colors.void,
          borderRadius: '4px',
          marginBottom: '12px',
        }}
      >
        {/* Filled Track */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${sliderPosition}%`,
            background: `linear-gradient(90deg, ${tokens.colors.cyan}, ${tokens.colors.profit})`,
            borderRadius: '4px',
            boxShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
          }}
        />

        {/* Slider Input */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={(e) => {
            const newValue = sliderToValue(parseFloat(e.target.value));
            // Snap to nearest preset if close
            const closest = presets.reduce((prev, curr) =>
              Math.abs(curr - newValue) < Math.abs(prev - newValue) ? curr : prev
            );
            if (Math.abs(closest - newValue) / newValue < 0.1) {
              onChange(closest);
            } else {
              onChange(Math.round(newValue / 100) * 100);
            }
          }}
          style={{
            position: 'absolute',
            top: '-10px',
            left: 0,
            width: '100%',
            height: '28px',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />

        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${sliderPosition}%`,
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: tokens.colors.textPrimary,
            border: `3px solid ${tokens.colors.cyan}`,
            boxShadow: `0 0 15px ${tokens.colors.cyanGlow}, 0 2px 8px rgba(0,0,0,0.3)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Scale Labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontFamily: tokens.fonts.mono, fontSize: '10px', color: tokens.colors.textMuted }}>
          $1K
        </span>
        <span style={{ fontFamily: tokens.fonts.mono, fontSize: '10px', color: tokens.colors.textMuted }}>
          $10K
        </span>
        <span style={{ fontFamily: tokens.fonts.mono, fontSize: '10px', color: tokens.colors.textMuted }}>
          $100K
        </span>
      </div>

      {/* Preset Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {[1000, 5000, 10000, 25000, 50000].map((preset) => (
          <PresetButton
            key={preset}
            label={formatUSD(preset)}
            isActive={value === preset}
            onClick={() => onChange(preset)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Refresh Interval Selector
 */
function RefreshIntervalSelector({
  value,
  onChange,
  isMobile,
}: {
  value: number;
  onChange: (value: number) => void;
  isMobile: boolean;
}) {
  const options = [
    { value: 10, label: '10s' },
    { value: 30, label: '30s' },
    { value: 60, label: '1m' },
    { value: 120, label: '2m' },
    { value: 300, label: '5m' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        width: isMobile ? '100%' : 'auto',
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            flex: isMobile ? '1 1 auto' : 'none',
            minWidth: isMobile ? '60px' : 'auto',
            padding: isMobile ? '12px 16px' : '8px 14px',
            background: value === option.value ? `${tokens.colors.cyan}15` : tokens.colors.void,
            border: `1px solid ${value === option.value ? tokens.colors.cyan : tokens.colors.border}`,
            borderRadius: '10px',
            fontFamily: tokens.fonts.mono,
            fontSize: isMobile ? '14px' : '12px',
            fontWeight: value === option.value ? 600 : 400,
            color: value === option.value ? tokens.colors.cyan : tokens.colors.textSecondary,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: value === option.value ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Save Button Component
 */
function SaveButton({
  onClick,
  disabled,
  hasChanges,
  isMobile,
}: {
  onClick: () => void;
  disabled: boolean;
  hasChanges: boolean;
  isMobile: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || !hasChanges}
      style={{
        width: isMobile ? '100%' : 'auto',
        padding: isMobile ? '16px 32px' : '12px 24px',
        background: hasChanges
          ? `linear-gradient(135deg, ${tokens.colors.cyan}, ${tokens.colors.profit})`
          : tokens.colors.surface,
        border: hasChanges
          ? 'none'
          : `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        fontFamily: tokens.fonts.body,
        fontSize: isMobile ? '16px' : '14px',
        fontWeight: 600,
        color: hasChanges ? tokens.colors.void : tokens.colors.textMuted,
        cursor: hasChanges ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s ease',
        boxShadow: hasChanges
          ? `0 0 30px ${tokens.colors.cyanGlow}, 0 4px 20px rgba(0,0,0,0.3)`
          : 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {hasChanges ? '💾 Save Changes' : '✓ All Saved'}
    </button>
  );
}

export function Settings({
  isMobile,
  initialMinDeposit = 10000,
  initialRefreshInterval = 30,
  onSave,
}: SettingsProps) {
  // Settings state
  const [settings, setSettings] = useState<SettingsData>({
    minDeposit: initialMinDeposit,
    refreshInterval: initialRefreshInterval,
    telegramAlerts: true,
    soundEffects: false,
    browserPush: true,
    theme: 'dark',
    compactMode: false,
  });

  // Track if there are unsaved changes
  const [savedSettings, setSavedSettings] = useState<SettingsData>(settings);
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(settings);
    }
    setSavedSettings(settings);
  }, [settings, onSave]);

  // Update a single setting
  const updateSetting = <K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // =====================
  // MOBILE VIEW
  // =====================
  if (isMobile) {
    return (
      <div
        data-testid="settings"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          paddingBottom: '100px', // Space for save button
        }}
      >
        {/* ===== STICKY HEADER ===== */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: `linear-gradient(180deg, ${tokens.colors.void} 0%, ${tokens.colors.void}f0 85%, transparent 100%)`,
            paddingTop: '4px',
            paddingBottom: '20px',
            marginLeft: '-16px',
            marginRight: '-16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <h1
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: '22px',
                fontWeight: 700,
                color: tokens.colors.textPrimary,
                margin: 0,
              }}
            >
              Settings
            </h1>
          </div>
        </div>

        {/* ===== ALERT THRESHOLDS ===== */}
        <SectionHeader icon="💰" title="Alert Thresholds" />
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              color: tokens.colors.textSecondary,
              marginBottom: '16px',
            }}
          >
            Only show whale deposits above this amount
          </div>
          <DepositSlider
            value={settings.minDeposit}
            onChange={(value) => updateSetting('minDeposit', value)}
            isMobile
          />
        </div>

        {/* ===== DATA REFRESH ===== */}
        <SectionHeader icon="🔄" title="Data Refresh" />
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              color: tokens.colors.textSecondary,
              marginBottom: '16px',
            }}
          >
            How often to check for new whale activity
          </div>
          <RefreshIntervalSelector
            value={settings.refreshInterval}
            onChange={(value) => updateSetting('refreshInterval', value)}
            isMobile
          />
        </div>

        {/* ===== NOTIFICATIONS ===== */}
        <SectionHeader icon="🔔" title="Notifications" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '24px',
          }}
        >
          <SettingRow
            icon="📱"
            label="Telegram Alerts"
            description="Receive whale alerts via Telegram bot"
            isMobile
          >
            <Toggle
              checked={settings.telegramAlerts}
              onChange={(checked) => updateSetting('telegramAlerts', checked)}
            />
          </SettingRow>

          <SettingRow
            icon="🔊"
            label="Sound Effects"
            description="Play sound when new whale detected"
            isMobile
          >
            <Toggle
              checked={settings.soundEffects}
              onChange={(checked) => updateSetting('soundEffects', checked)}
            />
          </SettingRow>

          <SettingRow
            icon="🌐"
            label="Browser Push"
            description="Show browser notifications"
            isMobile
          >
            <Toggle
              checked={settings.browserPush}
              onChange={(checked) => updateSetting('browserPush', checked)}
            />
          </SettingRow>
        </div>

        {/* ===== APPEARANCE ===== */}
        <SectionHeader icon="🎨" title="Appearance" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '14px',
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <span style={{ fontSize: '18px' }}>🎨</span>
              <span
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '15px',
                  fontWeight: 500,
                  color: tokens.colors.textPrimary,
                }}
              >
                Theme
              </span>
            </div>
            <ThemeSelector
              value={settings.theme}
              onChange={(value) => updateSetting('theme', value)}
              isMobile
            />
          </div>

          <SettingRow
            icon="📐"
            label="Compact Mode"
            description="Reduce spacing for more data density"
            isMobile
          >
            <Toggle
              checked={settings.compactMode}
              onChange={(checked) => updateSetting('compactMode', checked)}
            />
          </SettingRow>
        </div>

        {/* ===== ABOUT ===== */}
        <SectionHeader icon="ℹ️" title="About" />
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '28px' }}>🐋</span>
            <div>
              <div
                style={{
                  fontFamily: tokens.fonts.display,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: tokens.colors.textPrimary,
                }}
              >
                PolyWolyTroly
              </div>
              <div
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '12px',
                  color: tokens.colors.textMuted,
                }}
              >
                v1.0.0 • Whale Intelligence
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '13px',
              color: tokens.colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            Track whale wallets on Polymarket. Follow smart money, discover high-conviction bets.
          </div>
        </div>

        {/* ===== FIXED SAVE BUTTON ===== */}
        <div
          style={{
            position: 'fixed',
            bottom: '78px', // Above mobile nav
            left: '16px',
            right: '16px',
            zIndex: 100,
          }}
        >
          <SaveButton
            onClick={handleSave}
            disabled={false}
            hasChanges={hasChanges}
            isMobile
          />
        </div>
      </div>
    );
  }

  // =====================
  // DESKTOP VIEW
  // =====================
  return (
    <div
      data-testid="settings"
      style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚙️</span>
          <h1
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: '24px',
              fontWeight: 700,
              color: tokens.colors.textPrimary,
              margin: 0,
            }}
          >
            Settings
          </h1>
        </div>
        <SaveButton
          onClick={handleSave}
          disabled={false}
          hasChanges={hasChanges}
          isMobile={false}
        />
      </div>

      {/* Settings Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Alert Thresholds */}
          <div>
            <SectionHeader icon="💰" title="Alert Thresholds" />
            <div
              style={{
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <DepositSlider
                value={settings.minDeposit}
                onChange={(value) => updateSetting('minDeposit', value)}
                isMobile={false}
              />
            </div>
          </div>

          {/* Data Refresh */}
          <div>
            <SectionHeader icon="🔄" title="Data Refresh" />
            <div
              style={{
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '13px',
                  color: tokens.colors.textSecondary,
                  marginBottom: '12px',
                }}
              >
                Poll interval for new whale activity
              </div>
              <RefreshIntervalSelector
                value={settings.refreshInterval}
                onChange={(value) => updateSetting('refreshInterval', value)}
                isMobile={false}
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Notifications */}
          <div>
            <SectionHeader icon="🔔" title="Notifications" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SettingRow
                icon="📱"
                label="Telegram Alerts"
                isMobile={false}
              >
                <Toggle
                  checked={settings.telegramAlerts}
                  onChange={(checked) => updateSetting('telegramAlerts', checked)}
                />
              </SettingRow>
              <SettingRow
                icon="🔊"
                label="Sound Effects"
                isMobile={false}
              >
                <Toggle
                  checked={settings.soundEffects}
                  onChange={(checked) => updateSetting('soundEffects', checked)}
                />
              </SettingRow>
              <SettingRow
                icon="🌐"
                label="Browser Push"
                isMobile={false}
              >
                <Toggle
                  checked={settings.browserPush}
                  onChange={(checked) => updateSetting('browserPush', checked)}
                />
              </SettingRow>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <SectionHeader icon="🎨" title="Appearance" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>🎨</span>
                    <span
                      style={{
                        fontFamily: tokens.fonts.body,
                        fontSize: '14px',
                        fontWeight: 500,
                        color: tokens.colors.textPrimary,
                      }}
                    >
                      Theme
                    </span>
                  </div>
                  <ThemeSelector
                    value={settings.theme}
                    onChange={(value) => updateSetting('theme', value)}
                    isMobile={false}
                  />
                </div>
              </div>
              <SettingRow
                icon="📐"
                label="Compact Mode"
                isMobile={false}
              >
                <Toggle
                  checked={settings.compactMode}
                  onChange={(checked) => updateSetting('compactMode', checked)}
                />
              </SettingRow>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div style={{ marginTop: '32px' }}>
        <SectionHeader icon="ℹ️" title="About" />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <span style={{ fontSize: '40px' }}>🐋</span>
          <div>
            <div
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: '18px',
                fontWeight: 700,
                color: tokens.colors.textPrimary,
                marginBottom: '4px',
              }}
            >
              PolyWolyTroly
            </div>
            <div
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '12px',
                color: tokens.colors.textMuted,
              }}
            >
              v1.0.0 • Whale Intelligence Platform for Polymarket
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Settings Visual Specifications

### Mobile Deposit Slider
```
┌─────────────────────────────────────────┐
│  $25,000                    [minimum]   │
│                                         │
│  ═══════════════●═══════════════════    │ ← Gradient track
│  $1K          $10K               $100K  │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌────┐│
│  │ $1K │ │ $5K │ │$10K │ │$25K │ │$50K││ ← Presets
│  └─────┘ └─────┘ └─────┘ └─────┘ └────┘│
└─────────────────────────────────────────┘
```

### Toggle Switch States
```
OFF:                          ON:
┌────────────────────┐        ┌────────────────────┐
│ ●────────────────  │        │  ────────────────● │
│ (void bg)          │        │ (cyan→green grad)  │
└────────────────────┘        └────────────────────┘
   ↑ Inset border                ↑ Outer glow
```

### Theme Selector
```
┌───────────┐ ┌───────────┐ ┌───────────┐
│  🌙 Dark  │ │  ☀️ Light │ │ 💻 System │
│  ═══════  │ │           │ │           │
└───────────┘ └───────────┘ └───────────┘
   ↑ Active: cyan border + glow + filled bg
```

---

## Summary: Complete Mobile Component Suite

| Component | Sticky Header | Content Style | Fixed Footer |
|-----------|--------------|---------------|--------------|
| **WhaleTable** | ✅ Search + Sort | Card stack | ✅ Pagination |
| **AlertFeed** | ✅ Search + Filter badge | Card stack | ✅ Pagination |
| **WalletProfile** | ✅ Back + Actions | Stats grid + cards | ✅ Pagination |
| **TrendingMarkets** | ✅ Title + Link | Horizontal scroll | N/A |
| **Settings** | ✅ Title | Grouped sections | ✅ Save button |
| **MobileNav** | N/A | N/A | ✅ Fixed bottom nav |

---

## Z-Index Stack

```
z-index: 1000  → MobileNav (bottom navigation)
z-index: 100   → Sticky pagination / Save button
z-index: 10    → Sticky headers
z-index: 1     → Content cards with hover
z-index: 0     → Background
```

---

## Safe Area Considerations

```css
/* MobileNav already handles this */
padding-bottom: env(safe-area-inset-bottom, 0px);

/* Content containers should account for nav height */
padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px) + 20px);
```

---

## Interaction Patterns

| Interaction | Visual Feedback |
|------------|-----------------|
| **Touch nav item** | Icon container bg + glow |
| **Touch card** | `scale(0.98)` + `surfaceHover` bg |
| **Touch toggle** | Instant state change + glow |
| **Touch preset button** | Border + glow transition |
| **Slide slider** | Track fills + thumb follows |
| **Save available** | Button gradient + glow pulse |

---

This completes the full mobile enhancement suite for PolyWolyTroly! You now have:

1. **WhaleTable** — Sticky header, sort pills, glass pagination
2. **AlertFeed** — Live indicator, search, filter badge, glass pagination
3. **WalletProfile** — Quick actions, stats grid, deposit cards, glass pagination
4. **TrendingMarkets** — Horizontal scroll, category tags, scroll indicators
5. **Settings** — Grouped sections, custom controls, fixed save button
6. **MobileNav** — Glass morphism, badges, active glow
