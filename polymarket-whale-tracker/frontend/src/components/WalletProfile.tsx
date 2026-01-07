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

import { useState } from 'react';
import { tokens } from '../styles/tokens';
import { GlowText } from './GlowText';
import { Pagination } from './Pagination';
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
  /** Navigation between whales */
  currentWhaleIndex?: number;
  totalWhales?: number;
  /** Total whales in database (for display, may differ from navigable whales) */
  totalWhalesInDb?: number;
  onNavigatePrevWhale?: () => void;
  onNavigateNextWhale?: () => void;
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
 * Stats card component
 */
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
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
        <span style={{ fontSize: '16px' }}>{icon}</span>
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

/**
 * Navigation button for prev/next whale
 */
function NavButton({
  direction,
  disabled,
  onClick,
  isMobile,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
  isMobile: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isPrev = direction === 'prev';
  const arrow = isPrev ? '‹' : '›';
  const label = isPrev ? 'Previous' : 'Next';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`${label} whale`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minWidth: isMobile ? '44px' : '100px',
        height: isMobile ? '44px' : '40px',
        padding: isMobile ? '0' : '0 16px',
        background: disabled
          ? 'transparent'
          : isHovered
          ? tokens.colors.cyan
          : 'transparent',
        border: `1px solid ${disabled ? tokens.colors.border : isHovered ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: tokens.radius.md,
        fontFamily: tokens.fonts.body,
        fontSize: '14px',
        fontWeight: 500,
        color: disabled
          ? tokens.colors.muted
          : isHovered
          ? tokens.colors.void
          : tokens.colors.textSecondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `all ${tokens.animation.durationFast} ease`,
        boxShadow: isHovered && !disabled ? `0 0 20px ${tokens.colors.cyanGlow}` : 'none',
        transform: isHovered && !disabled
          ? isPrev
            ? 'translateX(-2px)'
            : 'translateX(2px)'
          : 'translateX(0)',
      }}
    >
      {isPrev && (
        <span
          style={{
            fontSize: '18px',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {arrow}
        </span>
      )}
      {!isMobile && <span>{label}</span>}
      {!isPrev && (
        <span
          style={{
            fontSize: '18px',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {arrow}
        </span>
      )}
    </button>
  );
}

/**
 * Whale navigation controls
 */
function WhaleNavigation({
  currentIndex,
  total,
  displayTotal,
  onPrev,
  onNext,
  isMobile,
}: {
  currentIndex: number;
  total: number;
  /** Total to display (may be larger than navigable total) */
  displayTotal?: number;
  onPrev: () => void;
  onNext: () => void;
  isMobile: boolean;
}) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  const shownTotal = displayTotal ?? total;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? '12px' : '16px',
        padding: '16px',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radius.lg,
        marginBottom: '24px',
      }}
    >
      <NavButton
        direction="prev"
        disabled={isFirst}
        onClick={onPrev}
        isMobile={isMobile}
      />

      {/* Page indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: isMobile ? '8px 12px' : '8px 16px',
          background: `${tokens.colors.cyan}10`,
          borderRadius: tokens.radius.md,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: isMobile ? '12px' : '13px',
            color: tokens.colors.textPrimary,
          }}
        >
          <span style={{ color: tokens.colors.cyan, fontWeight: 600 }}>
            {currentIndex + 1}
          </span>
          <span style={{ color: tokens.colors.textMuted, margin: '0 6px' }}>of</span>
          <span style={{ fontWeight: 500 }}>{shownTotal.toLocaleString()}</span>
        </span>
      </div>

      <NavButton
        direction="next"
        disabled={isLast}
        onClick={onNext}
        isMobile={isMobile}
      />
    </div>
  );
}

/**
 * Copy button that shows feedback
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Copy address"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: isHovered ? tokens.colors.surfaceHover : 'transparent',
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '6px',
        fontFamily: tokens.fonts.mono,
        fontSize: '12px',
        color: copied ? tokens.colors.profit : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
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
  currentWhaleIndex,
  totalWhales,
  totalWhalesInDb,
  onNavigatePrevWhale,
  onNavigateNextWhale,
}: WalletProfileProps) {
  const totalPages = Math.ceil(depositsTotal / depositsPerPage);

  // Check if navigation is available - show if we have index and total, even for first/last whale
  const hasNavigation =
    currentWhaleIndex !== undefined &&
    totalWhales !== undefined &&
    totalWhales > 1;

  return (
    <div data-testid="wallet-profile">
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          marginBottom: '16px',
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

      {/* Whale Navigation */}
      {hasNavigation && (
        <WhaleNavigation
          currentIndex={currentWhaleIndex}
          total={totalWhales}
          displayTotal={totalWhalesInDb}
          onPrev={onNavigatePrevWhale ?? (() => {})}
          onNext={onNavigateNextWhale ?? (() => {})}
          isMobile={isMobile}
        />
      )}

      {/* Wallet Header */}
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: isMobile ? '20px' : '24px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: 700,
                color: tokens.colors.textPrimary,
                margin: 0,
                marginBottom: '8px',
              }}
            >
              <GlowText>Whale</GlowText> Profile
            </h1>
            <div
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: isMobile ? '12px' : '14px',
                color: tokens.colors.cyan,
                background: `${tokens.colors.cyan}10`,
                padding: '8px 12px',
                borderRadius: '8px',
                wordBreak: 'break-all',
              }}
            >
              {wallet.address}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <CopyButton text={wallet.address} />
            <a
              href={`https://polygonscan.com/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: tokens.colors.cyan,
                border: 'none',
                borderRadius: '6px',
                fontFamily: tokens.fonts.body,
                fontSize: '12px',
                fontWeight: 600,
                color: tokens.colors.void,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              View on Polygonscan ↗
            </a>
          </div>
        </div>
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
        <StatCard label="Total Deposited" value={formatUSD(wallet.totalDeposited)} icon="💰" />
        <StatCard label="Deposit Count" value={depositsTotal.toString()} icon="📊" />
        <StatCard
          label="Avg. Deposit"
          value={formatUSD(depositsTotal > 0 ? wallet.totalDeposited / depositsTotal : 0)}
          icon="📈"
        />
        <StatCard label="First Seen" value={formatDate(wallet.firstSeenAt)} icon="📅" />
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
            deposits.map((deposit, index) => (
              <div
                key={deposit.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  animation: `fadeInUp 0.4s ${index * 0.05}s both cubic-bezier(0.16, 1, 0.3, 1)`,
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
    </div>
  );
}
