/**
 * WhaleTable Component
 *
 * Displays a list of tracked whale wallets.
 * Desktop: Table view with sortable columns in contained scrollable area
 * Mobile: Card stack view with pagination
 *
 * Design: Based on App.jsx reference and PAGINATION_GUIDELINES.md
 */

import { useState, useMemo } from 'react';
import { tokens } from '../styles/tokens';
import { formatUSD } from '../utils/formatters';
import { Pagination } from './Pagination';
import type { Whale, WhaleSortField, SortDirection } from '../types/whale';

interface WhaleTableProps {
  whales: Whale[];
  isMobile: boolean;
  onWhaleClick: (address: string) => void;
  /** Current page (1-indexed) */
  currentPage?: number;
  /** Items per page */
  itemsPerPage?: number;
  /** Total items in database (for pagination) */
  totalItems?: number;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
}

/**
 * Shorten an Ethereum address for display
 * Format: 0x1234...5678
 */
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a date as relative time or date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DEFAULT_ITEMS_PER_PAGE = 20;

export function WhaleTable({
  whales,
  isMobile,
  onWhaleClick,
  currentPage = 1,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  totalItems,
  onPageChange,
}: WhaleTableProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<WhaleSortField>('totalDeposited');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Filter and sort whales
  const sortedWhales = useMemo(() => {
    return [...whales]
      .filter((w) => w.address.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => {
        const mult = sortDir === 'desc' ? -1 : 1;
        switch (sortBy) {
          case 'totalDeposited':
            return (a.totalDeposited - b.totalDeposited) * mult;
          case 'depositCount':
            return (a.depositCount - b.depositCount) * mult;
          case 'firstSeenAt':
            return (new Date(a.firstSeenAt).getTime() - new Date(b.firstSeenAt).getTime()) * mult;
          default:
            return 0;
        }
      });
  }, [whales, filter, sortBy, sortDir]);

  // Calculate pagination
  const actualTotal = totalItems ?? sortedWhales.length;
  const totalPages = Math.ceil(actualTotal / itemsPerPage);

  // Handle column header click for sorting
  const handleSort = (field: WhaleSortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  // Empty state
  if (whales.length === 0) {
    return (
      <div
        data-testid="whale-table"
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
   |  O        \\___/  |
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
          No whales tracked yet
        </div>
        <p
          style={{
            fontFamily: tokens.fonts.body,
            color: tokens.colors.textSecondary,
          }}
        >
          Whales will appear here once deposits are detected
        </p>
      </div>
    );
  }

  // No search results
  if (sortedWhales.length === 0 && filter) {
    return (
      <div
        data-testid="whale-table"
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
          {/* Search input container - keeps clear button close to text */}
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
          No whales found matching "{filter}"
        </div>
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div
        data-testid="whale-table"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          // Add padding at bottom for sticky pagination
          paddingBottom: onPageChange && totalPages > 1 ? '140px' : '0',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🐋</span>
              <span
                style={{
                  fontFamily: tokens.fonts.display,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: tokens.colors.textPrimary,
                }}
              >
                Whales
              </span>
            </div>

            {/* Whale count badge */}
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
              marginBottom: '-4px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {[
              { field: 'totalDeposited' as WhaleSortField, label: 'Volume', icon: '💰' },
              { field: 'depositCount' as WhaleSortField, label: 'Count', icon: '📊' },
              { field: 'firstSeenAt' as WhaleSortField, label: 'Date', icon: '📅' },
            ].map((option) => {
              const isActive = sortBy === option.field;
              return (
                <button
                  key={option.field}
                  onClick={() => handleSort(option.field)}
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
        </div>

        {/* ===== WHALE CARDS ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedWhales.length === 0 && filter ? (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                background: tokens.colors.surface,
                borderRadius: '12px',
                border: `1px solid ${tokens.colors.border}`,
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🔍</div>
              <div style={{ color: tokens.colors.textSecondary }}>
                No whales found matching "{filter}"
              </div>
            </div>
          ) : (
            sortedWhales.map((whale, i) => (
              <div
                key={whale.address}
                data-testid={`whale-card-${whale.address}`}
                onClick={() => onWhaleClick(whale.address)}
                style={{
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: '14px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
                  animation: `fadeInUp 0.4s ${i * 0.04}s both cubic-bezier(0.16, 1, 0.3, 1)`,
                  WebkitTapHighlightColor: 'transparent',
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                  e.currentTarget.style.background = tokens.colors.surfaceHover;
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = tokens.colors.surface;
                }}
                onAnimationEnd={(e) => {
                  e.currentTarget.style.animation = 'none';
                }}
                onMouseEnter={(e) => {
                  if (window.matchMedia('(hover: hover)').matches) {
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
                        background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        boxShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
                      }}
                    >
                      🐋
                    </div>
                    <div
                      style={{
                        fontFamily: tokens.fonts.mono,
                        fontSize: '13px',
                        fontWeight: 500,
                        color: tokens.colors.cyan,
                        textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
                      }}
                    >
                      {shortenAddress(whale.address)}
                    </div>
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
                    {formatDate(whale.firstSeenAt)}
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
                      Total Deposited
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
                      {formatUSD(whale.totalDeposited)}
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
                      Deposits
                    </div>
                    <div
                      style={{
                        fontFamily: tokens.fonts.mono,
                        fontSize: '17px',
                        fontWeight: 600,
                        color: tokens.colors.textPrimary,
                      }}
                    >
                      {whale.depositCount}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ===== STICKY PAGINATION ===== */}
        {onPageChange && totalPages > 1 && (
          <div
            style={{
              position: 'fixed',
              bottom: '78px', // Above mobile nav (60px) + spacing
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
                  {' '}of {totalPages}
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
                disabled={currentPage === totalPages}
                aria-label="Next page"
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: currentPage === totalPages ? tokens.colors.surface : tokens.colors.cyan,
                  border: `1px solid ${currentPage === totalPages ? tokens.colors.border : tokens.colors.cyan}`,
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: currentPage === totalPages ? tokens.colors.muted : tokens.colors.void,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: currentPage !== totalPages ? `0 0 25px ${tokens.colors.cyanGlow}` : 'none',
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
      data-testid="whale-table"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: tokens.colors.surface,
        // Fixed height on desktop to match AlertFeed container
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
          <span style={{ fontSize: '16px' }}>🐋</span>
          <span
            style={{
              fontFamily: tokens.fonts.body,
              fontWeight: 600,
              fontSize: '14px',
              color: tokens.colors.textPrimary,
            }}
          >
            Whale Directory
          </span>
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
        {/* Whale count badge */}
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
          {actualTotal.toLocaleString()} whales
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
                data-testid="sort-totalDeposited"
                onClick={() => handleSort('totalDeposited')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: sortBy === 'totalDeposited' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  width: '25%',
                }}
              >
                Total Deposited {sortBy === 'totalDeposited' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th
                data-testid="sort-depositCount"
                onClick={() => handleSort('depositCount')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: sortBy === 'depositCount' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  width: '20%',
                }}
              >
                Deposits {sortBy === 'depositCount' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th
                data-testid="sort-firstSeenAt"
                onClick={() => handleSort('firstSeenAt')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '10px',
                  fontWeight: 500,
                  color: sortBy === 'firstSeenAt' ? tokens.colors.cyan : tokens.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  width: '20%',
                }}
              >
                First Seen {sortBy === 'firstSeenAt' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedWhales.map((whale, i) => (
              <tr
                key={whale.address}
                data-testid={`whale-row-${whale.address}`}
                onClick={() => onWhaleClick(whale.address)}
                style={{
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  animation: `fadeInUp 0.4s ${i * 0.03}s both cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = tokens.colors.surfaceHover;
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
                        background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                      }}
                    >
                      🐋
                    </div>
                    <div
                      style={{
                        fontFamily: tokens.fonts.mono,
                        fontSize: '11px',
                        color: tokens.colors.cyan,
                      }}
                    >
                      {shortenAddress(whale.address)}
                    </div>
                  </div>
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
                  {formatUSD(whale.totalDeposited)}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    fontFamily: tokens.fonts.mono,
                    fontSize: '13px',
                    color: tokens.colors.textPrimary,
                  }}
                >
                  {whale.depositCount}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    fontFamily: tokens.fonts.mono,
                    fontSize: '11px',
                    color: tokens.colors.textMuted,
                  }}
                >
                  {formatDate(whale.firstSeenAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={actualTotal}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          entityName="whales"
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
