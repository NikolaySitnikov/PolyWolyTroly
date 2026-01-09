/**
 * WalletProfile Component
 *
 * Displays detailed information about a single whale wallet.
 * Layout per BRAND_GUIDELINES_EXTENDED.md:
 * - Header with wallet address and actions
 * - Trading metrics grid (6 columns on desktop, 2x3 on mobile)
 * - P&L time window toggle
 * - Deposit history with pagination
 *
 * @see Design docs/BRAND_GUIDELINES_EXTENDED.md
 * @see Design docs/TRADING_FEATURES_DESIGN_GUIDE.md
 */

import { useState, useMemo } from 'react';
import { tokens } from '../styles/tokens';
import { Pagination } from './Pagination';
import { WalletProfileHeader } from './WalletProfileHeader';
import { TradingMetricsGrid } from './TradingMetricsGrid';
import { TradingMetricsGridSkeleton } from './TradingMetricsGridSkeleton';
import { PnlToggle } from './PnlToggle';
import { ProfileTabs, type ProfileTabId } from './ProfileTabs';
import { PositionsTable } from './PositionsTable';
import { PositionCard } from './PositionCard';
import { ClosedPositionCard } from './ClosedPositionCard';
import { usePolymarketTrading } from '../hooks/usePolymarketTrading';
import { useClosedPositions } from '../hooks/useClosedPositions';
import type { WalletData, WalletDeposit } from '../hooks/useWallet';
import type { PnlTimeWindow } from '../types/polymarket';

interface WalletProfileProps {
  wallet: WalletData;
  deposits: WalletDeposit[];
  depositsLoading: boolean;
  depositsTotal: number;
  depositsPage: number;
  depositsPerPage: number;
  onDepositsPageChange: (page: number) => void;
  onBack: () => void;
  isMobile: boolean;
  /** Current whale's position in the full sorted list (1-indexed) */
  currentWhalePosition?: number;
  /** Total number of whales in the database */
  totalWhalesCount?: number;
  /** Callback when navigating to a whale (1-indexed position) */
  onWhaleNavigate?: (position: number) => void;
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
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return diffSec <= 1 ? 'just now' : `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  return `${diffDay}d ago`;
}

/**
 * Truncate transaction hash
 */
function formatTxHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export function WalletProfile({
  wallet,
  deposits,
  depositsLoading,
  depositsTotal,
  depositsPage,
  depositsPerPage,
  onDepositsPageChange,
  onBack,
  isMobile,
  currentWhalePosition,
  totalWhalesCount,
  onWhaleNavigate,
}: WalletProfileProps) {
  const totalPages = Math.ceil(depositsTotal / depositsPerPage);

  // P&L time window state
  const [pnlTimeWindow, setPnlTimeWindow] = useState<PnlTimeWindow>('7d');

  // Active tab state
  const [activeTab, setActiveTab] = useState<ProfileTabId>('positions');

  // Position search filter
  const [positionSearchFilter, setPositionSearchFilter] = useState('');

  // Position status filter: 'active' | 'redeemable' | 'all' | 'closed'
  // - Active: curPrice > 0, market still live
  // - Redeemable: curPrice = 0, market resolved, can claim winnings
  // - All: both active and redeemable positions
  // - Closed: historical fully settled positions (from separate API)
  const [positionStatusFilter, setPositionStatusFilter] = useState<'active' | 'redeemable' | 'all' | 'closed'>('all');

  // Clear search when switching wallets
  // Note: This effect would need useEffect, but for simplicity we rely on component remount

  // Fetch trading data (profile, live status, positions, etc.)
  const { profile, isLive, metrics, positions, getPnl, loading: tradingLoading, error: tradingError, refetch: refetchTrading, totalPositionsCount } = usePolymarketTrading(wallet.address);

  // Fetch closed/historical positions (only when 'closed' filter is active)
  const {
    positions: closedPositions,
    loading: closedLoading,
    error: closedError,
    hasMore: closedHasMore,
    loadMore: loadMoreClosed,
    page: closedPage,
    setPage: setClosedPage,
  } = useClosedPositions(wallet.address, {
    enabled: positionStatusFilter === 'closed',
    pageSize: 25,
  });

  // Filter positions by status (active/redeemable) and search term
  // Active: curPrice > 0 (market still live, can trade)
  // Redeemable: redeemable === true (market resolved, can claim winnings)
  const filteredPositions = useMemo(() => {
    let result = positions;

    // First filter by status
    if (positionStatusFilter === 'active') {
      // Active positions: market still live (curPrice > 0, not redeemable)
      result = result.filter((p) => p.curPrice > 0 && !p.redeemable);
    } else if (positionStatusFilter === 'redeemable') {
      // Redeemable positions: market resolved, waiting to claim (redeemable = true)
      result = result.filter((p) => p.redeemable);
    }
    // 'all' shows everything

    // Then filter by search term
    if (positionSearchFilter.trim()) {
      const searchLower = positionSearchFilter.toLowerCase().trim();
      result = result.filter((position) =>
        position.title.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [positions, positionStatusFilter, positionSearchFilter]);

  // Filter closed positions by search term
  const filteredClosedPositions = useMemo(() => {
    if (!positionSearchFilter.trim()) {
      return closedPositions;
    }
    const searchLower = positionSearchFilter.toLowerCase().trim();
    return closedPositions.filter((position) =>
      position.title.toLowerCase().includes(searchLower)
    );
  }, [closedPositions, positionSearchFilter]);

  // Count active and redeemable positions for filter badges
  const activePositionsInList = useMemo(() =>
    positions.filter((p) => p.curPrice > 0 && !p.redeemable).length,
    [positions]
  );
  const redeemablePositionsInList = useMemo(() =>
    positions.filter((p) => p.redeemable).length,
    [positions]
  );

  // Determine if trading metrics are in a loading state (no data yet)
  const isMetricsLoading = tradingLoading && metrics === null;
  // Determine if there was an error fetching metrics
  const hasMetricsError = tradingError !== null && metrics === null;

  // Check if navigation is available
  const hasNavigation =
    currentWhalePosition !== undefined &&
    totalWhalesCount !== undefined &&
    totalWhalesCount > 1 &&
    onWhaleNavigate !== undefined;

  // Navigation uses 1-indexed positions
  const canGoPrev = currentWhalePosition !== undefined && currentWhalePosition > 1;
  const canGoNext = currentWhalePosition !== undefined && totalWhalesCount !== undefined && currentWhalePosition < totalWhalesCount;

  return (
    <div
      data-testid="wallet-profile"
      style={{
        // Add padding at bottom for sticky pagination on mobile
        paddingBottom: isMobile && hasNavigation ? '140px' : '0',
      }}
    >
      {/* Navigation Bar - Back button + Whale navigation (desktop) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        {/* Left side: Back button + Whale Profile title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Back button */}
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              color: tokens.colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            ← Back to Whales
          </button>

          {/* Whale Profile title - always show next to Back button */}
          <span
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: isMobile ? '16px' : '20px',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                color: tokens.colors.cyan,
                textShadow: `0 0 20px ${tokens.colors.cyan}40, 0 0 40px ${tokens.colors.cyan}20`,
              }}
            >
              Whale
            </span>{' '}
            <span style={{ color: tokens.colors.textPrimary }}>Profile</span>
          </span>
        </div>

        {/* Desktop Whale Navigation - compact prev/next with counter */}
        {hasNavigation && !isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '10px',
            }}
          >
            {/* Previous Button */}
            <button
              onClick={() => onWhaleNavigate!(currentWhalePosition! - 1)}
              disabled={!canGoPrev}
              aria-label="Previous whale (← arrow key)"
              title="Previous whale (←)"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                color: !canGoPrev ? tokens.colors.muted : tokens.colors.textSecondary,
                cursor: !canGoPrev ? 'not-allowed' : 'pointer',
                opacity: !canGoPrev ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (canGoPrev) {
                  e.currentTarget.style.background = tokens.colors.surfaceHover;
                  e.currentTarget.style.color = tokens.colors.cyan;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = !canGoPrev ? tokens.colors.muted : tokens.colors.textSecondary;
              }}
            >
              ‹
            </button>

            {/* Whale Counter */}
            <div
              style={{
                padding: '0 12px',
                fontFamily: tokens.fonts.mono,
                fontSize: '13px',
                color: tokens.colors.textSecondary,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: tokens.colors.cyan, fontWeight: 600 }}>
                {currentWhalePosition}
              </span>
              <span style={{ color: tokens.colors.textMuted, margin: '0 4px' }}>/</span>
              <span>{totalWhalesCount?.toLocaleString()}</span>
            </div>

            {/* Next Button */}
            <button
              onClick={() => onWhaleNavigate!(currentWhalePosition! + 1)}
              disabled={!canGoNext}
              aria-label="Next whale (→ arrow key)"
              title="Next whale (→)"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                color: !canGoNext ? tokens.colors.muted : tokens.colors.textSecondary,
                cursor: !canGoNext ? 'not-allowed' : 'pointer',
                opacity: !canGoNext ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (canGoNext) {
                  e.currentTarget.style.background = tokens.colors.surfaceHover;
                  e.currentTarget.style.color = tokens.colors.cyan;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = !canGoNext ? tokens.colors.muted : tokens.colors.textSecondary;
              }}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Wallet Header */}
      <div style={{ marginBottom: '24px' }}>
        <WalletProfileHeader
          address={wallet.address}
          profile={profile}
          isLive={isLive}
          lastActivityAt={metrics?.lastActivityAt}
          isMobile={isMobile}
        />
      </div>

      {/* Trading Metrics Grid */}
      <div style={{ marginBottom: '24px' }}>
        {/* P&L Time Window Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
            marginBottom: '12px',
          }}
        >
          <PnlToggle
            value={pnlTimeWindow}
            onChange={setPnlTimeWindow}
            size={isMobile ? 'sm' : 'md'}
          />
        </div>

        {/* Metrics Grid - Show skeleton while loading, error with retry, or data */}
        {isMetricsLoading ? (
          <TradingMetricsGridSkeleton isMobile={isMobile} />
        ) : hasMetricsError ? (
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.loss}40`,
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '24px',
                marginBottom: '12px',
              }}
            >
              ⚠️
            </div>
            <div
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                color: tokens.colors.textSecondary,
                marginBottom: '16px',
              }}
            >
              {tradingError || 'Failed to load trading metrics'}
            </div>
            <button
              onClick={refetchTrading}
              disabled={tradingLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: tokens.colors.cyan,
                border: 'none',
                borderRadius: '8px',
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                fontWeight: 600,
                color: tokens.colors.void,
                cursor: tradingLoading ? 'wait' : 'pointer',
                opacity: tradingLoading ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {tradingLoading ? 'Retrying...' : '↻ Retry'}
            </button>
          </div>
        ) : (
          <TradingMetricsGrid
            totalDeposited={wallet.totalDeposited}
            pnl={getPnl(pnlTimeWindow)}
            winRate={metrics?.winRate ?? null}
            portfolioValue={metrics?.portfolioValue ?? null}
            activePositions={metrics?.activePositions ?? null}
            totalTrades={metrics?.totalTrades ?? null}
            pnlTimeWindow={pnlTimeWindow}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Tabbed Content: Positions | Activity | Deposits */}
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {/* Tab Navigation */}
        <ProfileTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          counts={{
            positions: totalPositionsCount,
            deposits: depositsTotal,
          }}
          isMobile={isMobile}
          searchFilter={positionSearchFilter}
          onSearchChange={setPositionSearchFilter}
          searchPlaceholder="Search positions..."
          searchVisibleOnTabs={['positions']}
        />

        {/* Tab Content */}
        <div
          role="tabpanel"
          style={{
            // Minimum height prevents layout jump when switching tabs
            minHeight: '300px',
          }}
        >
          {/* Positions Tab */}
          {activeTab === 'positions' && (
            <>
              {/* Position Status Filter - Active/Closed toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: isMobile ? '12px 16px' : '12px 20px',
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  background: tokens.colors.void,
                }}
              >
                {/* Active filter button */}
                <button
                  type="button"
                  onClick={() => setPositionStatusFilter('active')}
                  data-testid="position-filter-active"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: positionStatusFilter === 'active' ? `${tokens.colors.textSecondary}15` : 'transparent',
                    border: `1px solid ${positionStatusFilter === 'active' ? tokens.colors.textSecondary : tokens.colors.border}`,
                    borderRadius: '8px',
                    fontFamily: tokens.fonts.body,
                    fontSize: '13px',
                    fontWeight: positionStatusFilter === 'active' ? 600 : 500,
                    color: positionStatusFilter === 'active' ? tokens.colors.textPrimary : tokens.colors.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Active
                  <span
                    style={{
                      fontFamily: tokens.fonts.mono,
                      fontSize: '11px',
                      opacity: 0.8,
                    }}
                  >
                    ({activePositionsInList})
                  </span>
                </button>

                {/* Redeemable filter button */}
                <button
                  type="button"
                  onClick={() => setPositionStatusFilter('redeemable')}
                  data-testid="position-filter-redeemable"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: positionStatusFilter === 'redeemable' ? `${tokens.colors.textSecondary}15` : 'transparent',
                    border: `1px solid ${positionStatusFilter === 'redeemable' ? tokens.colors.textSecondary : tokens.colors.border}`,
                    borderRadius: '8px',
                    fontFamily: tokens.fonts.body,
                    fontSize: '13px',
                    fontWeight: positionStatusFilter === 'redeemable' ? 600 : 500,
                    color: positionStatusFilter === 'redeemable' ? tokens.colors.textPrimary : tokens.colors.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Redeemable
                  <span
                    style={{
                      fontFamily: tokens.fonts.mono,
                      fontSize: '11px',
                      opacity: 0.8,
                    }}
                  >
                    ({redeemablePositionsInList})
                  </span>
                </button>

                {/* All filter button */}
                <button
                  type="button"
                  onClick={() => setPositionStatusFilter('all')}
                  data-testid="position-filter-all"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: positionStatusFilter === 'all' ? `${tokens.colors.textSecondary}15` : 'transparent',
                    border: `1px solid ${positionStatusFilter === 'all' ? tokens.colors.textSecondary : tokens.colors.border}`,
                    borderRadius: '8px',
                    fontFamily: tokens.fonts.body,
                    fontSize: '13px',
                    fontWeight: positionStatusFilter === 'all' ? 600 : 500,
                    color: positionStatusFilter === 'all' ? tokens.colors.textPrimary : tokens.colors.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  All
                  <span
                    style={{
                      fontFamily: tokens.fonts.mono,
                      fontSize: '11px',
                      opacity: 0.8,
                    }}
                  >
                    ({totalPositionsCount})
                  </span>
                </button>

                {/* Divider */}
                <div
                  style={{
                    width: '1px',
                    height: '20px',
                    background: tokens.colors.border,
                    margin: '0 4px',
                  }}
                />

                {/* Closed/Historical filter button */}
                <button
                  type="button"
                  onClick={() => setPositionStatusFilter('closed')}
                  data-testid="position-filter-closed"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: positionStatusFilter === 'closed' ? `${tokens.colors.textMuted}20` : 'transparent',
                    border: `1px solid ${positionStatusFilter === 'closed' ? tokens.colors.textMuted : tokens.colors.border}`,
                    borderRadius: '8px',
                    fontFamily: tokens.fonts.body,
                    fontSize: '13px',
                    fontWeight: positionStatusFilter === 'closed' ? 600 : 500,
                    color: positionStatusFilter === 'closed' ? tokens.colors.textSecondary : tokens.colors.textMuted,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Closed
                </button>
              </div>

              {/* Positions content - stable container prevents layout shift when switching filters */}
              <div style={{ minHeight: '200px' }}>
                {/* Closed positions view */}
                {positionStatusFilter === 'closed' ? (
                  <div style={{ padding: isMobile ? '16px' : '0' }}>
                  {closedLoading && closedPositions.length === 0 ? (
                    <div
                      style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: tokens.colors.textMuted,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '24px',
                          marginBottom: '12px',
                          animation: 'pulse 2s ease-in-out infinite',
                        }}
                      >
                        📜
                      </div>
                      Loading closed positions...
                    </div>
                  ) : closedError ? (
                    <div
                      style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: tokens.colors.textMuted,
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
                      <div
                        style={{
                          fontFamily: tokens.fonts.display,
                          fontSize: '18px',
                          color: tokens.colors.textPrimary,
                          marginBottom: '8px',
                        }}
                      >
                        Error loading closed positions
                      </div>
                      <p style={{ margin: 0 }}>{closedError}</p>
                    </div>
                  ) : closedPositions.length === 0 ? (
                    <div
                      style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: tokens.colors.textMuted,
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>📜</div>
                      <div
                        style={{
                          fontFamily: tokens.fonts.display,
                          fontSize: '18px',
                          color: tokens.colors.textPrimary,
                          marginBottom: '8px',
                        }}
                      >
                        No closed positions
                      </div>
                      <p style={{ margin: 0 }}>This whale hasn't closed any positions yet</p>
                    </div>
                  ) : filteredClosedPositions.length === 0 && positionSearchFilter ? (
                    /* No matching closed positions */
                    <div
                      style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: tokens.colors.textMuted,
                        fontFamily: tokens.fonts.body,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 500,
                          marginBottom: '8px',
                        }}
                      >
                        No matching positions
                      </div>
                      <p style={{ margin: 0 }}>No closed positions match "{positionSearchFilter}"</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop: Table header for closed positions */}
                      {!isMobile && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 20px',
                            borderBottom: `1px solid ${tokens.colors.border}`,
                            background: tokens.colors.void,
                          }}
                        >
                          <div
                            style={{
                              width: '48px',
                              flexShrink: 0,
                              fontFamily: tokens.fonts.mono,
                              fontSize: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: tokens.colors.textMuted,
                            }}
                          >
                            Result
                          </div>
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontFamily: tokens.fonts.mono,
                              fontSize: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: tokens.colors.textMuted,
                            }}
                          >
                            Market
                          </div>
                          <div
                            style={{
                              width: '80px',
                              textAlign: 'center',
                              flexShrink: 0,
                              fontFamily: tokens.fonts.mono,
                              fontSize: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: tokens.colors.textMuted,
                            }}
                          >
                            Position
                          </div>
                          <div
                            style={{
                              width: '90px',
                              textAlign: 'right',
                              flexShrink: 0,
                              fontFamily: tokens.fonts.mono,
                              fontSize: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: tokens.colors.textMuted,
                            }}
                          >
                            Invested
                          </div>
                          <div
                            style={{
                              width: '90px',
                              textAlign: 'right',
                              flexShrink: 0,
                              fontFamily: tokens.fonts.mono,
                              fontSize: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: tokens.colors.textMuted,
                            }}
                          >
                            P&L
                          </div>
                          <div
                            style={{
                              width: '80px',
                              textAlign: 'right',
                              flexShrink: 0,
                              fontFamily: tokens.fonts.mono,
                              fontSize: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: tokens.colors.textMuted,
                            }}
                          >
                            When
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '0' }}>
                        {filteredClosedPositions.map((position) => (
                          <ClosedPositionCard
                            key={`${position.conditionId}-${position.timestamp}`}
                            position={position}
                            isMobile={isMobile}
                            onClick={() => {
                              window.open(`https://polymarket.com/event/${position.eventSlug}`, '_blank');
                            }}
                          />
                        ))}
                      </div>
                      {/* Load More button for closed positions */}
                      {closedHasMore && (
                        <div
                          style={{
                            padding: '16px 20px',
                            display: 'flex',
                            justifyContent: 'center',
                            borderTop: `1px solid ${tokens.colors.border}`,
                          }}
                        >
                          <button
                            onClick={loadMoreClosed}
                            disabled={closedLoading}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 24px',
                              background: tokens.colors.surface,
                              border: `1px solid ${tokens.colors.border}`,
                              borderRadius: '8px',
                              fontFamily: tokens.fonts.body,
                              fontSize: '14px',
                              fontWeight: 500,
                              color: tokens.colors.textSecondary,
                              cursor: closedLoading ? 'wait' : 'pointer',
                              opacity: closedLoading ? 0.7 : 1,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {closedLoading ? 'Loading...' : 'Load More'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : isMobile ? (
                /* Mobile: Card list for active/redeemable/all */
                <div style={{ padding: '16px' }}>
                  {tradingLoading && positions.length === 0 ? (
                    <div
                      style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: tokens.colors.textMuted,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '24px',
                          marginBottom: '12px',
                          animation: 'pulse 2s ease-in-out infinite',
                        }}
                      >
                        📊
                      </div>
                      Loading positions...
                    </div>
                  ) : positions.length === 0 ? (
                    <div
                      style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: tokens.colors.textMuted,
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
                      <div
                        style={{
                          fontFamily: tokens.fonts.display,
                          fontSize: '18px',
                          color: tokens.colors.textPrimary,
                          marginBottom: '8px',
                        }}
                      >
                        No positions found
                      </div>
                      <p style={{ margin: 0 }}>This whale hasn't opened any positions yet</p>
                    </div>
                  ) : filteredPositions.length === 0 && positionSearchFilter ? (
                    <div
                      style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: tokens.colors.textMuted,
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔍</div>
                      <div
                        style={{
                          fontFamily: tokens.fonts.display,
                          fontSize: '18px',
                          color: tokens.colors.textPrimary,
                          marginBottom: '8px',
                        }}
                      >
                        No matching positions
                      </div>
                      <p style={{ margin: 0 }}>No positions match "{positionSearchFilter}"</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredPositions.map((position) => (
                        <PositionCard
                          key={position.conditionId}
                          position={position}
                          onClick={() => {
                            window.open(`https://polymarket.com/event/${position.eventSlug}`, '_blank');
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop: Table for active/redeemable/all */
                <div style={{ padding: '0' }}>
                  <PositionsTable
                    positions={filteredPositions}
                    loading={tradingLoading && positions.length === 0}
                    onPositionClick={(position) => {
                      window.open(`https://polymarket.com/event/${position.eventSlug}`, '_blank');
                    }}
                  />
                </div>
              )}
              </div>
            </>
          )}

          {/* Activity Tab - Placeholder for Step 8 */}
          {activeTab === 'activity' && (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                color: tokens.colors.textMuted,
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>📜</div>
              <div
                style={{
                  fontFamily: tokens.fonts.display,
                  fontSize: '18px',
                  color: tokens.colors.textPrimary,
                  marginBottom: '8px',
                }}
              >
                Activity Coming Soon
              </div>
              <p style={{ margin: 0 }}>Trading activity history will be available in a future update</p>
            </div>
          )}

          {/* Deposits Tab */}
          {activeTab === 'deposits' && (
            <>
              {/* Deposit List */}
              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                {depositsLoading ? (
                  <div
                    style={{
                      padding: '48px 20px',
                      textAlign: 'center',
                      color: tokens.colors.textMuted,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '24px',
                        marginBottom: '12px',
                        animation: 'pulse 2s ease-in-out infinite',
                      }}
                    >
                      💰
                    </div>
                    Loading deposits...
                  </div>
                ) : deposits.length === 0 ? (
                  <div
                    style={{
                      padding: '48px 20px',
                      textAlign: 'center',
                      color: tokens.colors.textMuted,
                    }}
                  >
                    No deposits found
                  </div>
                ) : (
                  deposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      style={{
                        padding: '14px 20px',
                        borderBottom: `1px solid ${tokens.colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: `${tokens.colors.profit}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          flexShrink: 0,
                        }}
                      >
                        ↓
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: tokens.fonts.mono,
                              fontSize: '16px',
                              fontWeight: 600,
                              color: tokens.colors.profit,
                            }}
                          >
                            +{formatUSD(deposit.amount)}
                          </span>
                        </div>
                        <a
                          href={`https://polygonscan.com/tx/${deposit.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: tokens.fonts.mono,
                            fontSize: '11px',
                            color: tokens.colors.textMuted,
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = tokens.colors.cyan;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = tokens.colors.textMuted;
                          }}
                        >
                          {formatTxHash(deposit.txHash)} ↗
                        </a>
                      </div>

                      {/* Time */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: tokens.fonts.mono,
                          color: tokens.colors.textMuted,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {formatRelativeTime(deposit.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={depositsPage}
                  totalPages={totalPages}
                  totalItems={depositsTotal}
                  itemsPerPage={depositsPerPage}
                  onPageChange={onDepositsPageChange}
                  entityName="deposits"
                  isMobile={isMobile}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Whale Navigation - sticky mobile pagination matching WhaleTable style */}
      {hasNavigation && isMobile && (
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
              onClick={() => onWhaleNavigate!(currentWhalePosition! - 1)}
              disabled={!canGoPrev}
              aria-label="Previous whale"
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
                color: !canGoPrev ? tokens.colors.muted : tokens.colors.textSecondary,
                cursor: !canGoPrev ? 'not-allowed' : 'pointer',
                opacity: !canGoPrev ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (canGoPrev) {
                  e.currentTarget.style.background = tokens.colors.surfaceHover;
                  e.currentTarget.style.borderColor = tokens.colors.cyan;
                  e.currentTarget.style.color = tokens.colors.cyan;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = tokens.colors.surface;
                e.currentTarget.style.borderColor = tokens.colors.border;
                e.currentTarget.style.color = !canGoPrev ? tokens.colors.muted : tokens.colors.textSecondary;
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
                Whale{' '}
                <span
                  style={{
                    color: tokens.colors.cyan,
                    textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
                  }}
                >
                  {currentWhalePosition}
                </span>
                {' '}of {totalWhalesCount?.toLocaleString()}
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={() => onWhaleNavigate!(currentWhalePosition! + 1)}
              disabled={!canGoNext}
              aria-label="Next whale"
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
                color: !canGoNext ? tokens.colors.muted : tokens.colors.textSecondary,
                cursor: !canGoNext ? 'not-allowed' : 'pointer',
                opacity: !canGoNext ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (canGoNext) {
                  e.currentTarget.style.background = tokens.colors.surfaceHover;
                  e.currentTarget.style.borderColor = tokens.colors.cyan;
                  e.currentTarget.style.color = tokens.colors.cyan;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = tokens.colors.surface;
                e.currentTarget.style.borderColor = tokens.colors.border;
                e.currentTarget.style.color = !canGoNext ? tokens.colors.muted : tokens.colors.textSecondary;
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
