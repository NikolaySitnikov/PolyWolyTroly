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
}: WalletProfileProps) {
  const totalPages = Math.ceil(depositsTotal / depositsPerPage);

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
          marginBottom: '24px',
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '28px' }}>🐋</span>
              <h1
                style={{
                  fontFamily: tokens.fonts.display,
                  fontSize: isMobile ? '20px' : '24px',
                  fontWeight: 700,
                  color: tokens.colors.textPrimary,
                  margin: 0,
                }}
              >
                <GlowText>Whale Profile</GlowText>
              </h1>
            </div>
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
        <StatCard label="Deposit Count" value={wallet.depositCount.toString()} icon="📊" />
        <StatCard
          label="Avg. Deposit"
          value={formatUSD(wallet.totalDeposited / wallet.depositCount)}
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
