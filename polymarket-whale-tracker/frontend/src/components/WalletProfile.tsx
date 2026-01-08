/**
 * WalletProfile Component
 *
 * Displays detailed information about a single whale wallet.
 * Layout per BRAND_GUIDELINES_EXTENDED.md:
 * - Header with wallet address and actions
 * - Stats grid (4 columns on desktop)
 * - Deposit history with pagination
 *
 * @see Design docs/BRAND_GUIDELINES_EXTENDED.md
 */

import { tokens } from '../styles/tokens';
import { Pagination } from './Pagination';
import { WalletProfileHeader } from './WalletProfileHeader';
import { usePolymarketTrading } from '../hooks/usePolymarketTrading';
import type { WalletData, WalletDeposit } from '../hooks/useWallet';

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
 * Format date as readable string
 */
function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Truncate transaction hash
 */
function formatTxHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

/**
 * Total Deposited SVG icon (stacked coins)
 * Uses profit green per brand guidelines (deposits = green)
 */
function TotalDepositedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: tokens.colors.profit }}>
      <ellipse cx="12" cy="7" rx="8" ry="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 10.5c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 15.5c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/**
 * Deposit Count SVG icon (horizontal lines)
 * Uses cyan per brand guidelines (data highlights)
 */
function DepositCountIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: tokens.colors.cyan }}>
      <line x1="5" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="5" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/**
 * Average Deposit SVG icon (coin with average/equals sign)
 * Uses purple per brand guidelines (tertiary accent)
 */
function AvgDepositIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: tokens.colors.purple }}>
      {/* Outer coin circle */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
      {/* Equals sign representing average */}
      <line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/**
 * First Seen SVG icon (calendar with pin)
 * Uses magenta per brand guidelines (secondary accent)
 */
function FirstSeenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: tokens.colors.magenta }}>
      {/* Calendar body */}
      <rect x="3" y="6" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      {/* Calendar hooks */}
      <line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Header line */}
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5"/>
      {/* Pin/marker dot for "first" */}
      <circle cx="12" cy="15" r="2" fill="currentColor"/>
    </svg>
  );
}

/**
 * Stats card component
 */
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string | React.ReactNode;
}) {
  return (
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
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center', color: tokens.colors.textMuted }}>{icon}</span>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '24px',
          fontWeight: 600,
          color: tokens.colors.textPrimary,
        }}
      >
        {value}
      </div>
    </div>
  );
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

  // Fetch trading data (profile, live status, etc.)
  const { profile, isLive, metrics } = usePolymarketTrading(wallet.address);

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
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.cyan;
              e.currentTarget.style.color = tokens.colors.cyan;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.border;
              e.currentTarget.style.color = tokens.colors.textSecondary;
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

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard label="Total Deposited" value={formatUSD(wallet.totalDeposited)} icon={<TotalDepositedIcon />} />
        <StatCard label="Deposit Count" value={depositsTotal.toString()} icon={<DepositCountIcon />} />
        <StatCard
          label="Avg. Deposit"
          value={formatUSD(depositsTotal > 0 ? wallet.totalDeposited / depositsTotal : 0)}
          icon={<AvgDepositIcon />}
        />
        <StatCard label="First Seen" value={formatDate(wallet.firstSeenAt)} icon={<FirstSeenIcon />} />
      </div>

      {/* Deposit History */}
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>📜</span>
            <span
              style={{
                fontFamily: tokens.fonts.body,
                fontWeight: 600,
                fontSize: '14px',
                color: tokens.colors.textPrimary,
              }}
            >
              Deposit History
            </span>
          </div>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '12px',
              color: tokens.colors.textMuted,
            }}
          >
            {depositsTotal} total
          </span>
        </div>

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
