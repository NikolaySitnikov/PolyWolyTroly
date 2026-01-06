/**
 * AlertFeed Component
 *
 * Live feed of whale alerts (deposits).
 * Redesigned to match WhaleTable design patterns:
 * - Desktop: 4-column table (Wallet | Type | Amount | Time)
 * - Mobile: Card stack with unified card design
 *
 * Features:
 * - Sortable columns on desktop
 * - Search by wallet address
 * - Transaction type badges
 * - Unified time formatting
 * - Glass morphism sticky pagination on mobile
 *
 * @see ../styles/cardStyles.ts - Unified card patterns
 * @see ./WhaleTable.tsx - Reference design
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { tokens } from '../styles/tokens';
import { formatCardTime } from '../styles/cardStyles';
import { formatUSD } from '../utils/formatters';
import { Pagination } from './Pagination';
import { CopyableAddress } from './CopyableAddress';
import { useNewItemAnimation } from '../hooks/useNewItemAnimation';
import type { Alert, AlertType } from '../types/alert';
import { ALERT_TYPE_CONFIG } from '../types/alert';

/** Sort fields for alerts (type not sortable - all deposits are same type) */
export type AlertSortField = 'amount' | 'timestamp';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

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
  /** Current sort field (server-side sorting) */
  sortBy?: AlertSortField;
  /** Current sort direction (server-side sorting) */
  sortDir?: SortDirection;
  /** Callback when sort changes */
  onSortChange?: (field: AlertSortField, direction: SortDirection) => void;
}


/**
 * Transaction Type Badge Component
 * Displays the alert type with consistent styling
 */
function TransactionTypeBadge({ type, size = 'md' }: { type: AlertType; size?: 'sm' | 'md' }) {
  const config = ALERT_TYPE_CONFIG[type];
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '3px 8px' : '5px 12px',
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '999px',
        fontFamily: tokens.fonts.mono,
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 500,
        color: config.textColor,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: isSmall ? '10px' : '12px' }}>{config.emoji}</span>
      {config.label}
    </span>
  );
}

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

function formatThresholdUSD(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

function FilterPill({ threshold, onClick, compact = false }: FilterPillProps) {
  if (compact) {
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
        {formatThresholdUSD(threshold)}+
      </button>
    );
  }

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
        {formatThresholdUSD(threshold)}+
      </span>
    </button>
  );
}

const DEFAULT_ITEMS_PER_PAGE = 20;

export function AlertFeed({
  alerts,
  isMobile,
  onAlertClick,
  activeMinThreshold,
  onNavigateToSettings,
  currentPage = 1,
  totalPages,
  totalItems,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  onPageChange,
  sortBy = 'timestamp',
  sortDir = 'desc',
  onSortChange,
}: AlertFeedProps) {
  const [filter, setFilter] = useState('');
  const lastPointerSortRef = useRef<{ field: AlertSortField | null; at: number }>({
    field: null,
    at: 0,
  });

  // Track new items for animation
  const getAlertKey = useCallback((alert: Alert) => alert.id, []);
  const shouldAnimateAlert = useNewItemAnimation(alerts, getAlertKey);

  // Filter alerts by wallet address (client-side only, sorting is server-side)
  const filteredAlerts = useMemo(() => {
    if (!filter) return alerts;
    return alerts.filter((alert) =>
      alert.walletAddress.toLowerCase().includes(filter.toLowerCase())
    );
  }, [alerts, filter]);

  // Calculate pagination
  const actualTotal = totalItems ?? filteredAlerts.length;
  const actualTotalPages = totalPages ?? Math.ceil(actualTotal / itemsPerPage);

  // Handle column header click for sorting (delegates to parent)
  const handleSort = (field: AlertSortField) => {
    if (!onSortChange) return;
    const nextDir = sortBy === field ? (sortDir === 'desc' ? 'asc' : 'desc') : 'desc';
    onSortChange(field, nextDir);
  };

  const handleSortActivate = (field: AlertSortField, source: 'pointer' | 'click') => {
    if (source === 'click') {
      const { field: lastField, at } = lastPointerSortRef.current;
      if (lastField === field && Date.now() - at < 500) {
        return;
      }
    } else {
      lastPointerSortRef.current = { field, at: Date.now() };
    }
    handleSort(field);
  };

  // Empty state
  if (alerts.length === 0) {
    return (
      <div
        data-testid="alert-feed"
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: tokens.colors.surface,
        }}
      >
        <pre
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            lineHeight: 1.2,
            color: tokens.colors.cyan,
            textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
            margin: '0 0 24px 0',
          }}
        >
{`        .
       ":"
     ___:____     |"\\/"|
   ,'        \`.    \\  /
   |  -        \\___/  |
 ~^~^~^~^~^~^~^~^~^~^~^~^~`}
        </pre>
        <div
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: '24px',
            color: tokens.colors.textPrimary,
            marginBottom: '8px',
          }}
        >
          No alerts yet
        </div>
        <p
          style={{
            fontFamily: tokens.fonts.body,
            color: tokens.colors.textSecondary,
          }}
        >
          Waiting for whale activity...
        </p>
      </div>
    );
  }

  // No search results
  if (filteredAlerts.length === 0 && filter) {
    return (
      <div
        data-testid="alert-feed"
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: tokens.colors.surface,
        }}
      >
        {/* Search bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${tokens.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ color: tokens.colors.textMuted }}>🔍</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              maxWidth: '300px',
              flex: '0 1 300px',
            }}
          >
            <input
              type="text"
              placeholder="Search by address..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                color: tokens.colors.textPrimary,
                minWidth: 0,
              }}
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                aria-label="Clear search"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: tokens.colors.textMuted,
                  fontSize: '16px',
                  lineHeight: 1,
                  borderRadius: '4px',
                  transition: 'color 0.15s ease',
                  flexShrink: 0,
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
        </div>
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: tokens.colors.textSecondary,
          }}
        >
          No alerts found matching "{filter}"
        </div>
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div
        data-testid="alert-feed"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          paddingBottom: onPageChange && actualTotalPages > 1 ? '140px' : '0',
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
          {/* Title Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
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

            {/* Alert count badge */}
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
              {actualTotal.toLocaleString()}
            </span>
          </div>

          {/* Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              marginBottom: '12px',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <span style={{ color: tokens.colors.textMuted, fontSize: '16px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by address..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
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

          {/* Sort Pills */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              marginBottom: activeMinThreshold !== undefined && activeMinThreshold > 0 ? '12px' : '-4px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {[
              { field: 'amount' as AlertSortField, label: 'Amount', icon: '💰' },
              { field: 'timestamp' as AlertSortField, label: 'Time', icon: '⏰' },
            ].map((option) => {
              const isActive = sortBy === option.field;
              return (
                <button
                  key={option.field}
                  onPointerDown={() => handleSortActivate(option.field, 'pointer')}
                  onClick={() => handleSortActivate(option.field, 'click')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: isActive ? `${tokens.colors.cyan}20` : tokens.colors.surface,
                    border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
                    borderRadius: '20px',
                    fontFamily: tokens.fonts.body,
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
                    minHeight: '44px',
                    flexShrink: 0,
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{option.icon}</span>
                  <span>{option.label}</span>
                  {isActive && (
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>
                      {sortDir === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Filter Indicator */}
          {activeMinThreshold !== undefined && activeMinThreshold > 0 && (
            <FilterPill
              threshold={activeMinThreshold}
              onClick={onNavigateToSettings}
            />
          )}
        </div>

        {/* ===== ALERT CARDS ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredAlerts.map((alert) => {
            const isNew = shouldAnimateAlert(alert);

            return (
              <div
                key={alert.id}
                data-testid="alert-item"
                onClick={() => onAlertClick?.(alert)}
                style={{
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: '14px',
                  padding: '16px',
                  cursor: onAlertClick ? 'pointer' : 'default',
                  transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
                  animation: isNew ? 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onTouchStart={(e) => {
                  if (onAlertClick) {
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
                onMouseEnter={(e) => {
                  if (window.matchMedia('(hover: hover)').matches && onAlertClick) {
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
                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                      }}
                    >
                      💰
                    </div>
                    <CopyableAddress
                      address={alert.walletAddress}
                      fontSize="13px"
                    />
                  </div>
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

                {/* Stats Grid */}
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
                    <TransactionTypeBadge type={alert.type} size="md" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== STICKY PAGINATION ===== */}
        {onPageChange && actualTotalPages > 1 && (
          <div
            style={{
              position: 'fixed',
              bottom: '78px',
              left: '16px',
              right: '16px',
              zIndex: 100,

              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '14px 20px',

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
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
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
                  color: currentPage === 1 ? tokens.colors.muted : tokens.colors.textSecondary,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.4 : 1,
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
                    {currentPage}
                  </span>
                  {' '}of {actualTotalPages}
                </div>
                <div
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: '11px',
                    color: tokens.colors.textMuted,
                    marginTop: '2px',
                  }}
                >
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-
                  {Math.min(currentPage * itemsPerPage, actualTotal)} of {actualTotal.toLocaleString()}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === actualTotalPages}
                aria-label="Next page"
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: currentPage === actualTotalPages ? tokens.colors.surface : tokens.colors.cyan,
                  border: `1px solid ${currentPage === actualTotalPages ? tokens.colors.border : tokens.colors.cyan}`,
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: currentPage === actualTotalPages ? tokens.colors.muted : tokens.colors.void,
                  cursor: currentPage === actualTotalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === actualTotalPages ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: currentPage !== actualTotalPages ? `0 0 25px ${tokens.colors.cyanGlow}` : 'none',
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

  // Desktop table view
  return (
    <div
      data-testid="alert-feed"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: tokens.colors.surface,
        height: '722px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with search */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
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
          {activeMinThreshold !== undefined && activeMinThreshold > 0 && (
            <FilterPill
              threshold={activeMinThreshold}
              onClick={onNavigateToSettings}
              compact
            />
          )}
        </div>
        {/* Spacer */}
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
              minWidth: '120px',
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
        {/* Alert count badge */}
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
          {actualTotal.toLocaleString()} alerts
        </span>
      </div>

      {/* Scrollable table container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        <table role="table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <tr style={{ background: tokens.colors.void }}>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                  width: '35%',
                }}
              >
                Wallet
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                  width: '20%',
                }}
              >
                Type
              </th>
              <th
                data-testid="sort-amount"
                onClick={() => handleSort('amount')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: sortBy === 'amount' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  width: '25%',
                }}
              >
                Amount{' '}
                {sortBy === 'amount' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th
                data-testid="sort-timestamp"
                onClick={() => handleSort('timestamp')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: sortBy === 'timestamp' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  width: '20%',
                }}
              >
                Time{' '}
                {sortBy === 'timestamp' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert) => {
              const isNew = shouldAnimateAlert(alert);
              return (
                <tr
                  key={alert.id}
                  data-testid="alert-item"
                  onClick={() => onAlertClick?.(alert)}
                  style={{
                    borderBottom: `1px solid ${tokens.colors.border}`,
                    cursor: onAlertClick ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
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
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: `linear-gradient(135deg, ${tokens.colors.profit}30, ${tokens.colors.cyan}30)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                        }}
                      >
                        💰
                      </div>
                      <CopyableAddress
                        address={alert.walletAddress}
                        fontSize="11px"
                      />
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <TransactionTypeBadge type={alert.type} size="sm" />
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      fontFamily: tokens.fonts.mono,
                      fontSize: '13px',
                      color: tokens.colors.profit,
                      fontWeight: 500,
                    }}
                  >
                    +{formatUSD(alert.amount)}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      fontFamily: tokens.fonts.mono,
                      fontSize: '11px',
                      color: tokens.colors.textMuted,
                    }}
                  >
                    {formatCardTime(alert.timestamp)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && actualTotalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={actualTotalPages}
          totalItems={actualTotal}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          entityName="alerts"
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
