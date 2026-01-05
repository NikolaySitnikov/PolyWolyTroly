/**
 * AlertFeed Component
 *
 * Live feed of whale alerts (deposits).
 * Follows the design system from DESIGN_SYSTEM.md
 *
 * Enhanced mobile view with:
 * - Sticky header with live indicator and count badge
 * - Touch-optimized alert cards matching WhaleTable pattern
 * - Unified time formatting (formatCardTime)
 * - Consistent hover/touch interactions
 * - Glass morphism sticky pagination
 * - Active filter display
 *
 * @see ../Design docs/DESIGN_SYSTEM.md - AlertFeed section
 * @see ../styles/cardStyles.ts - Unified card patterns
 */

import { useState, useMemo, useCallback } from 'react';
import { tokens } from '../styles/tokens';
import { formatCardTime } from '../styles/cardStyles';
// LiveIndicator removed - redundant with page-level indicator in header
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';
import { useNewItemAnimation } from '../hooks/useNewItemAnimation';
import type { Alert } from '../types/alert';

interface AlertFeedProps {
  alerts: Alert[];
  isMobile: boolean;
  onAlertClick?: (alert: Alert) => void;
  /** Currently active minimum threshold (for display only - filtering done server-side) */
  activeMinThreshold?: number;
  /** Navigate to Settings tab (for threshold controls) */
  onNavigateToSettings?: () => void;
  /** Pagination props (optional - if not provided, no pagination) */
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Format a number as USD with K/M suffix
 */
function formatUSD(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Format wallet address with truncation (0x1234...7890)
 */
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Note: Using formatCardTime from cardStyles.ts for unified time formatting

// Note: AlertTypeBadge removed - redundant since all alerts are deposits
// The card design now uses a 2-column stats grid matching WhaleTable pattern

/**
 * Shared FilterPill Component
 *
 * Clickable pill that displays the active threshold filter.
 * Used in both mobile and desktop views to ensure consistent behavior.
 * Clicking navigates to Settings tab for threshold controls.
 */
interface FilterPillProps {
  threshold: number;
  onClick?: () => void;
  /** Compact mode for desktop header (no label, smaller padding) */
  compact?: boolean;
}

function FilterPill({ threshold, onClick, compact = false }: FilterPillProps) {
  if (compact) {
    // Desktop compact version - just the pill, no "Filtering:" label
    return (
      <button
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 8px',
          background: `${tokens.colors.cyan}15`,
          border: `1px solid ${tokens.colors.cyan}40`,
          borderRadius: '999px',
          fontSize: '11px',
          fontFamily: tokens.fonts.mono,
          fontWeight: 500,
          color: tokens.colors.cyan,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
        }}
        title="Click to adjust threshold in Settings"
      >
        {formatUSD(threshold)}+
      </button>
    );
  }

  // Mobile version - includes "Filtering:" label with larger pill
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '11px',
          color: tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Filtering:
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '5px 12px',
          background: `${tokens.colors.cyan}15`,
          border: `1px solid ${tokens.colors.cyan}50`,
          borderRadius: '999px',
          fontFamily: tokens.fonts.mono,
          fontSize: '12px',
          fontWeight: 600,
          color: tokens.colors.cyan,
          boxShadow: `0 0 15px ${tokens.colors.cyanGlow}`,
          transition: 'all 0.15s ease',
        }}
      >
        {formatUSD(threshold)}+
      </span>
    </button>
  );
}

/**
 * Mobile Alert Card Component
 * UNIFIED with WhaleTable card pattern
 *
 * Features:
 * - Same card structure as WhaleTable
 * - Hover glow effect (cyan border + translateY + boxShadow)
 * - Touch scale feedback
 * - 2-column stats grid
 * - Unified time format (formatCardTime)
 * - No arrow indicator (clickable is implied)
 */
function MobileAlertCard({
  alert,
  onClick,
  isNew,
}: {
  alert: Alert;
  onClick?: () => void;
  isNew: boolean;
}) {
  return (
    <div
      data-testid="alert-item"
      onClick={onClick}
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '14px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
        animation: isNew
          ? 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          : 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(0.98)';
          e.currentTarget.style.background = tokens.colors.surfaceHover;
        }
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = tokens.colors.surface;
      }}
      onAnimationEnd={(e) => {
        e.currentTarget.style.animation = 'none';
      }}
      // Hover glow effect (matches WhaleTable)
      onMouseEnter={(e) => {
        if (window.matchMedia('(hover: hover)').matches && onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = tokens.colors.cyan;
          e.currentTarget.style.boxShadow = `0 0 30px ${tokens.colors.cyanGlow}, inset 0 1px 0 ${tokens.colors.cyan}`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.background = tokens.colors.surface;
      }}
    >
      {/* Card Header - matches WhaleTable structure */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Icon - contextual (💰 for deposits) */}
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${tokens.colors.profit}25, ${tokens.colors.cyan}15)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: `0 0 20px ${tokens.colors.profitGlow}`,
              flexShrink: 0,
            }}
          >
            💰
          </div>

          {/* Address - same style as WhaleTable */}
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '13px',
              fontWeight: 500,
              color: tokens.colors.cyan,
              textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
            }}
          >
            {formatAddress(alert.walletAddress)}
          </div>
        </div>

        {/* Time pill - unified format (matches WhaleTable) */}
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.textMuted,
            padding: '4px 8px',
            background: `${tokens.colors.void}80`,
            borderRadius: '6px',
          }}
        >
          {formatCardTime(alert.timestamp)}
        </span>
      </div>

      {/* Stats Grid - matches WhaleTable 2-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
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
            Amount
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '17px',
              fontWeight: 600,
              color: tokens.colors.profit,
              textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
            }}
          >
            +{formatUSD(alert.amount)}
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
            Type
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '17px',
              fontWeight: 600,
              color: tokens.colors.textPrimary,
              textTransform: 'capitalize',
            }}
          >
            {alert.type}
          </div>
        </div>
      </div>

      {/* Arrow indicator removed - card is clickable, no redundant affordance */}
    </div>
  );
}

export function AlertFeed({
  alerts,
  isMobile,
  onAlertClick,
  activeMinThreshold,
  onNavigateToSettings,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 20,
  onPageChange,
}: AlertFeedProps) {
  const [filter, setFilter] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Track new items for animation (only animate truly new alerts, not on initial load)
  const getAlertKey = useCallback((alert: Alert) => alert.id, []);
  const shouldAnimateAlert = useNewItemAnimation(alerts, getAlertKey);

  // Filter alerts by wallet address only (min threshold applied server-side)
  const filteredAlerts = useMemo(() => {
    if (!filter) {
      return alerts;
    }
    return alerts.filter((alert) =>
      alert.walletAddress.toLowerCase().includes(filter.toLowerCase())
    );
  }, [alerts, filter]);

  // Calculate pagination values for mobile
  const startItem = totalItems === 0 ? 0 : ((currentPage ?? 1) - 1) * itemsPerPage + 1;
  const endItem = Math.min((currentPage ?? 1) * itemsPerPage, totalItems ?? 0);
  const hasPagination = onPageChange && (totalPages ?? 0) > 1;

  // =====================
  // MOBILE VIEW
  // =====================
  if (isMobile) {
    return (
      <div
        data-testid="alert-feed"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          // Padding for sticky pagination
          paddingBottom: hasPagination ? '140px' : '0',
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
            paddingBottom: '16px',
            marginLeft: '-16px',
            marginRight: '-16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          {/* Title Row - matches WhaleTable header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <span
                style={{
                  fontFamily: tokens.fonts.display,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: tokens.colors.textPrimary,
                }}
              >
                Alerts
              </span>
            </div>

            {/* Count badge only - no Live Indicator (redundant with page-level indicator) */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 12px',
                background: `${tokens.colors.cyan}15`,
                border: `1px solid ${tokens.colors.cyan}50`,
                borderRadius: '999px',
                fontFamily: tokens.fonts.mono,
                fontSize: '13px',
                fontWeight: 600,
                color: tokens.colors.cyan,
                boxShadow: `0 0 15px ${tokens.colors.cyanGlow}`,
              }}
            >
              {(totalItems ?? alerts.length).toLocaleString()}
            </span>
          </div>

          {/* Search Bar with focus glow */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: tokens.colors.surface,
              border: `1px solid ${searchFocused ? tokens.colors.cyan : tokens.colors.border}`,
              borderRadius: '12px',
              marginBottom: '12px',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              boxShadow: searchFocused ? `0 0 20px ${tokens.colors.cyanGlow}` : 'none',
            }}
          >
            <span style={{ color: tokens.colors.textMuted, fontSize: '16px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by address..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: tokens.fonts.body,
                fontSize: '15px',
                color: tokens.colors.textPrimary,
              }}
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                aria-label="Clear search"
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tokens.colors.surfaceHover,
                  border: 'none',
                  borderRadius: '8px',
                  color: tokens.colors.textMuted,
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Active Filter Indicator - Clickable to navigate to Settings */}
          {activeMinThreshold !== undefined && activeMinThreshold > 0 && (
            <FilterPill
              threshold={activeMinThreshold}
              onClick={onNavigateToSettings}
            />
          )}
        </div>

        {/* ===== ALERT CARDS ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredAlerts.length === 0 ? (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                background: tokens.colors.surface,
                borderRadius: '14px',
                border: `1px solid ${tokens.colors.border}`,
              }}
            >
              <div
                style={{
                  fontSize: '40px',
                  marginBottom: '16px',
                  opacity: 0.5,
                  animation: filter ? 'none' : 'pulse 2s infinite',
                }}
              >
                {filter ? '🔍' : '🐋'}
              </div>
              <div
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '15px',
                  color: tokens.colors.textSecondary,
                  marginBottom: '4px',
                }}
              >
                {filter ? `No alerts matching "${filter}"` : 'No alerts yet'}
              </div>
              <div
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '12px',
                  color: tokens.colors.textMuted,
                }}
              >
                {filter ? 'Try a different address' : 'Waiting for whale activity...'}
              </div>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <MobileAlertCard
                key={alert.id}
                alert={alert}
                onClick={onAlertClick ? () => onAlertClick(alert) : undefined}
                isNew={shouldAnimateAlert(alert)}
              />
            ))
          )}
        </div>

        {/* ===== STICKY GLASS PAGINATION ===== */}
        {hasPagination && (
          <div
            style={{
              position: 'fixed',
              bottom: '78px', // Above mobile nav
              left: '16px',
              right: '16px',
              zIndex: 100,

              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '14px 20px',

              // Glass morphism
              background: `${tokens.colors.surface}e8`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',

              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '16px',

              boxShadow: `
                0 -10px 40px ${tokens.colors.void}80,
                0 0 30px ${tokens.colors.cyanGlow}
              `,
            }}
          >
            {/* Navigation Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {/* Previous Button */}
              <button
                onClick={() => onPageChange!((currentPage ?? 1) - 1)}
                disabled={(currentPage ?? 1) === 1}
                aria-label="Previous page"
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: (currentPage ?? 1) === 1 ? tokens.colors.muted : tokens.colors.textSecondary,
                  cursor: (currentPage ?? 1) === 1 ? 'not-allowed' : 'pointer',
                  opacity: (currentPage ?? 1) === 1 ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                ‹
              </button>

              {/* Page Info */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: tokens.colors.textPrimary,
                  }}
                >
                  Page{' '}
                  <span
                    style={{
                      color: tokens.colors.cyan,
                      textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
                    }}
                  >
                    {currentPage ?? 1}
                  </span>
                  {' '}of {totalPages ?? 1}
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '11px',
                    color: tokens.colors.textMuted,
                    marginTop: '2px',
                  }}
                >
                  Showing {startItem}-{endItem} of {(totalItems ?? 0).toLocaleString()}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => onPageChange!((currentPage ?? 1) + 1)}
                disabled={(currentPage ?? 1) === (totalPages ?? 1)}
                aria-label="Next page"
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: (currentPage ?? 1) === (totalPages ?? 1) ? tokens.colors.surface : tokens.colors.cyan,
                  border: `1px solid ${(currentPage ?? 1) === (totalPages ?? 1) ? tokens.colors.border : tokens.colors.cyan}`,
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: (currentPage ?? 1) === (totalPages ?? 1) ? tokens.colors.muted : tokens.colors.void,
                  cursor: (currentPage ?? 1) === (totalPages ?? 1) ? 'not-allowed' : 'pointer',
                  opacity: (currentPage ?? 1) === (totalPages ?? 1) ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: (currentPage ?? 1) !== (totalPages ?? 1) ? `0 0 25px ${tokens.colors.cyanGlow}` : 'none',
                }}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =====================
  // DESKTOP VIEW
  // =====================
  return (
    <div
      data-testid="alert-feed"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        // Fixed height on desktop to match WhaleTable (including its pagination area)
        height: '722px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>⚡</span>
          <span
            style={{
              fontFamily: tokens.fonts.body,
              fontWeight: 600,
              fontSize: '14px',
              color: tokens.colors.textPrimary,
            }}
          >
            Live Feed
          </span>
          {/* Active filter indicator - Clickable to navigate to Settings */}
          {activeMinThreshold !== undefined && activeMinThreshold > 0 && (
            <FilterPill
              threshold={activeMinThreshold}
              onClick={onNavigateToSettings}
              compact
            />
          )}
        </div>
        {/* Spacer to push search and indicator to the right */}
        <div style={{ flex: 1 }} />
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: tokens.colors.void,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '8px',
            maxWidth: '250px',
            minWidth: '120px',
          }}
        >
          <span style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search address..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: tokens.fonts.body,
              fontSize: '13px',
              color: tokens.colors.textPrimary,
              minWidth: '80px',
            }}
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
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
        {/* Count badge - matches WhaleTable desktop header */}
        {/* No LiveIndicator here - redundant with page-level indicator */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: `${tokens.colors.cyan}15`,
            border: `1px solid ${tokens.colors.cyan}`,
            borderRadius: '999px',
            fontSize: '12px',
            fontFamily: tokens.fonts.mono,
            fontWeight: 500,
            color: tokens.colors.cyan,
          }}
        >
          {(totalItems ?? alerts.length).toLocaleString()} alerts
        </span>
      </div>

      {/* Alert List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon="🐋"
            message={
              filter
                ? `No alerts found matching "${filter}"`
                : 'No alerts yet - waiting for whale activity...'
            }
            variant={filter ? 'search' : 'waiting'}
          />
        ) : (
          filteredAlerts.map((alert) => {
            const isNew = shouldAnimateAlert(alert);
            return (
              <div
                key={alert.id}
                data-testid="alert-item"
                onClick={() => onAlertClick?.(alert)}
                style={{
                  padding: '14px 20px',
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: onAlertClick ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                  // Only animate new items
                  animation: isNew ? 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (onAlertClick) {
                    e.currentTarget.style.background = tokens.colors.surfaceHover;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${tokens.colors.profit}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  💰
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '2px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: tokens.fonts.mono,
                        fontSize: '13px',
                        color: tokens.colors.cyan,
                      }}
                    >
                      {formatAddress(alert.walletAddress)}
                    </span>
                    {/* Deposit badge - simplified from AlertTypeBadge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        background: `${tokens.colors.profit}15`,
                        border: `1px solid ${tokens.colors.profit}`,
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontFamily: tokens.fonts.mono,
                        fontWeight: 500,
                        color: tokens.colors.profit,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {alert.type}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: tokens.colors.textSecondary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatUSD(alert.amount)}
                  </div>
                </div>

                {/* Time - unified format */}
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: tokens.fonts.mono,
                    color: tokens.colors.textMuted,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {formatCardTime(alert.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination - only show when pagination props are provided */}
      {onPageChange && totalPages !== undefined && currentPage !== undefined && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems ?? 0}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          entityName="alerts"
        />
      )}
    </div>
  );
}
