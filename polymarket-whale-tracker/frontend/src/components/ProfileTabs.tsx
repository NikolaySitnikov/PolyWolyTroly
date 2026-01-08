/**
 * ProfileTabs Component
 *
 * Tab navigation for wallet profile sections:
 * - Positions: Active trading positions
 * - Activity: Transaction history (future)
 * - Deposits: Deposit history (existing)
 *
 * @see Design docs/TRADING_FEATURES_DESIGN_GUIDE.md - Section 12
 */

import { useState } from 'react';
import { tokens } from '../styles/tokens';

/**
 * Available profile tab IDs
 */
export type ProfileTabId = 'positions' | 'activity' | 'deposits';

/**
 * Tab configuration
 */
interface ProfileTab {
  id: ProfileTabId;
  label: string;
  icon: string;
}

/**
 * Default tabs configuration
 */
export const PROFILE_TABS: ProfileTab[] = [
  { id: 'positions', label: 'Positions', icon: '📊' },
  { id: 'activity', label: 'Activity', icon: '📜' },
  { id: 'deposits', label: 'Deposits', icon: '💰' },
];

interface ProfileTabsProps {
  /** Currently active tab */
  activeTab: ProfileTabId;
  /** Callback when tab changes */
  onChange: (tab: ProfileTabId) => void;
  /** Optional counts to display next to tab labels */
  counts?: Partial<Record<ProfileTabId, number>>;
  /** Mobile layout */
  isMobile?: boolean;
  /** Optional search filter value */
  searchFilter?: string;
  /** Callback when search filter changes */
  onSearchChange?: (value: string) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Show search only on specific tabs */
  searchVisibleOnTabs?: ProfileTabId[];
}

/**
 * Tab button component
 */
function TabButton({
  tab,
  isActive,
  count,
  onClick,
  isMobile,
}: {
  tab: ProfileTab;
  isActive: boolean;
  count?: number;
  onClick: () => void;
  isMobile: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-selected={isActive}
      role="tab"
      data-testid={`profile-tab-${tab.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '6px' : '8px',
        padding: isMobile ? '10px 14px' : '12px 20px',
        background: isActive ? tokens.colors.surface : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${isActive ? tokens.colors.cyan : 'transparent'}`,
        fontFamily: tokens.fonts.body,
        fontSize: isMobile ? '13px' : '14px',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = tokens.colors.textPrimary;
          e.currentTarget.style.background = tokens.colors.surfaceHover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = tokens.colors.textSecondary;
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <span style={{ fontSize: isMobile ? '14px' : '16px' }}>{tab.icon}</span>
      <span>{tab.label}</span>
      {count !== undefined && count > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            padding: '0 6px',
            background: isActive ? `${tokens.colors.cyan}20` : tokens.colors.surface,
            border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
            borderRadius: '10px',
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            fontWeight: 600,
            color: isActive ? tokens.colors.cyan : tokens.colors.textMuted,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

/**
 * ProfileTabs - Tab navigation for wallet profile sections
 */
export function ProfileTabs({
  activeTab,
  onChange,
  counts,
  isMobile = false,
  searchFilter = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchVisibleOnTabs = ['positions'],
}: ProfileTabsProps) {
  const showSearch = onSearchChange && searchVisibleOnTabs.includes(activeTab);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Mobile layout: tabs row, then search row below
  if (isMobile) {
    return (
      <div data-testid="profile-tabs-container">
        {/* Tabs row */}
        <div
          role="tablist"
          aria-label="Profile sections"
          data-testid="profile-tabs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
            borderBottom: showSearch ? 'none' : `1px solid ${tokens.colors.border}`,
            background: tokens.colors.surface,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {PROFILE_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              count={counts?.[tab.id]}
              onClick={() => onChange(tab.id)}
              isMobile={isMobile}
            />
          ))}
        </div>
        {/* Mobile search bar below tabs */}
        {showSearch && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${tokens.colors.border}`,
              background: tokens.colors.surface,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: tokens.colors.void,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '10px',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <span style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>🔍</span>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchFilter}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: tokens.fonts.body,
                  fontSize: '14px',
                  color: tokens.colors.textPrimary,
                }}
              />
              {searchFilter && (
                <button
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  style={{
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: tokens.colors.surfaceHover,
                    border: 'none',
                    borderRadius: '6px',
                    color: tokens.colors.textMuted,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout: tabs on left, search on right in same row
  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      data-testid="profile-tabs"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        borderBottom: `1px solid ${tokens.colors.border}`,
        background: tokens.colors.surface,
        overflowX: 'auto',
        // Hide scrollbar but keep scroll functionality
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {PROFILE_TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          count={counts?.[tab.id]}
          onClick={() => onChange(tab.id)}
          isMobile={isMobile}
        />
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Desktop search input */}
      {showSearch && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            marginRight: '16px',
            background: tokens.colors.void,
            border: `1px solid ${isSearchFocused ? tokens.colors.cyan : tokens.colors.border}`,
            borderRadius: '8px',
            boxShadow: isSearchFocused ? `0 0 0 2px ${tokens.colors.cyanGlow}` : 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <span style={{ color: tokens.colors.textMuted, fontSize: '13px' }}>🔍</span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: tokens.fonts.body,
              fontSize: '13px',
              color: tokens.colors.textPrimary,
              minWidth: '140px',
              maxWidth: '200px',
            }}
          />
          {searchFilter && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px 6px',
                cursor: 'pointer',
                color: tokens.colors.textMuted,
                fontSize: '14px',
                lineHeight: 1,
                borderRadius: '4px',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = tokens.colors.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = tokens.colors.textMuted;
              }}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
