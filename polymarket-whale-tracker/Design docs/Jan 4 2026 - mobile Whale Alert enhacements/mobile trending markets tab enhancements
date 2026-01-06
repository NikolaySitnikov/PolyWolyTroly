# 📱 Mobile WalletProfile & TrendingMarkets — Enhanced Design Guidelines

Let me provide both components with the same level of polish we established for WhaleTable and AlertFeed.

---

# Part 1: WalletProfile Mobile Enhancement

## Current vs Enhanced Structure

```
CURRENT                              ENHANCED
┌─────────────────────┐              ┌─────────────────────────────────────┐
│ ← Back to Whales    │              │  ← Back              📋 Copy  ↗️    │ ← Sticky
│                     │              │  ──────────────────────────────────  │   Actions
│ 🐋 Whale Profile    │              │  🐋 0x1234...5678                    │
│ 0x1234...5678       │              │     $847.5K total · 23 deposits     │ ← Summary
│ [Copy] [Polygonscan]│              └─────────────────────────────────────┘
│─────────────────────│                                ↓
│ Stats (2x2 grid)    │              ┌─────────────────────────────────────┐
│─────────────────────│              │  ┌─────────┐ ┌─────────┐            │
│ Deposit History     │              │  │ $847.5K │ │   23    │            │ ← Stat
│ (basic list)        │              │  │ Total   │ │Deposits │            │   Cards
│                     │              │  └─────────┘ └─────────┘            │
│                     │              │  ┌─────────┐ ┌─────────┐            │
│                     │              │  │ $36.8K  │ │ Dec 15  │            │
│                     │              │  │ Average │ │1st Seen │            │
│                     │              │  └─────────┘ └─────────┘            │
│                     │              └─────────────────────────────────────┘
│                     │                                ↓
│                     │              ┌─────────────────────────────────────┐
│─────────────────────│              │  📜 Deposit History          23     │
│ Pagination          │              │  ┌─────────────────────────────┐    │
└─────────────────────┘              │  │ ↓ +$50,000        2h ago   │    │
                                     │  │   0x3f2a...bc91 ↗️          │    │
                                     │  └─────────────────────────────┘    │
                                     │                ...                  │
                                     └─────────────────────────────────────┘
                                                       ↓
                                     ┌─────────────────────────────────────┐
                                     │     ‹   Page 1 of 3   ›            │ ← Sticky
                                     │     Showing 1-10 of 23             │
                                     └─────────────────────────────────────┘
```

---

## Complete Enhanced WalletProfile.tsx

```tsx
/**
 * WalletProfile Component
 *
 * Displays detailed information about a single whale wallet.
 * 
 * Enhanced mobile view with:
 * - Sticky header with quick actions
 * - Compact stats grid
 * - Touch-optimized deposit cards
 * - Glass morphism sticky pagination
 *
 * @see Design docs/BRAND_GUIDELINES_EXTENDED.md
 */

import { useState } from 'react';
import { tokens } from '../styles/tokens';
import { GlowText } from './GlowText';
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

  if (diffSec < 60) return diffSec <= 1 ? 'just now' : `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
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
 * Format short date (no year)
 */
function formatShortDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate transaction hash
 */
function formatTxHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

/**
 * Shorten wallet address
 */
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Mobile Stat Card Component
 */
function MobileStatCard({
  label,
  value,
  icon,
  valueColor,
  glow,
}: {
  label: string;
  value: string;
  icon: string;
  valueColor?: string;
  glow?: string;
}) {
  return (
    <div
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            color: tokens.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '18px',
          fontWeight: 700,
          color: valueColor || tokens.colors.textPrimary,
          textShadow: glow ? `0 0 15px ${glow}` : 'none',
        }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Mobile Deposit Card Component
 */
function MobileDepositCard({
  deposit,
  index,
}: {
  deposit: WalletDeposit;
  index: number;
}) {
  return (
    <div
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: '14px 16px',
        animation: `fadeInUp 0.4s ${index * 0.05}s both cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      {/* Top Row: Amount + Time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Deposit Icon */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${tokens.colors.profit}25, ${tokens.colors.cyan}15)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              boxShadow: `0 0 15px ${tokens.colors.profitGlow}`,
            }}
          >
            ↓
          </div>
          {/* Amount */}
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '18px',
              fontWeight: 700,
              color: tokens.colors.profit,
              textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
            }}
          >
            +{formatUSD(deposit.amount)}
          </div>
        </div>

        {/* Timestamp */}
        <div
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.textMuted,
            padding: '4px 8px',
            background: `${tokens.colors.void}80`,
            borderRadius: '6px',
          }}
        >
          {formatRelativeTime(deposit.createdAt)}
        </div>
      </div>

      {/* Bottom Row: Transaction Link */}
      
        href={`https://polygonscan.com/tx/${deposit.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: tokens.colors.void,
          borderRadius: '8px',
          textDecoration: 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            color: tokens.colors.textSecondary,
          }}
        >
          {formatTxHash(deposit.txHash)}
        </span>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '11px',
            color: tokens.colors.cyan,
          }}
        >
          View ↗
        </span>
      </a>
    </div>
  );
}

/**
 * Copy Button with Feedback
 */
function CopyButton({ 
  text, 
  isMobile 
}: { 
  text: string; 
  isMobile: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  if (isMobile) {
    return (
      <button
        onClick={handleCopy}
        aria-label="Copy address"
        style={{
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: copied ? `${tokens.colors.profit}20` : tokens.colors.surface,
          border: `1px solid ${copied ? tokens.colors.profit : tokens.colors.border}`,
          borderRadius: '12px',
          fontSize: '18px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {copied ? '✓' : '📋'}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: copied ? `${tokens.colors.profit}20` : 'transparent',
        border: `1px solid ${copied ? tokens.colors.profit : tokens.colors.border}`,
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
  const startItem = depositsTotal === 0 ? 0 : (depositsPage - 1) * depositsPerPage + 1;
  const endItem = Math.min(depositsPage * depositsPerPage, depositsTotal);
  const avgDeposit = depositsTotal > 0 ? wallet.totalDeposited / depositsTotal : 0;

  // =====================
  // MOBILE VIEW
  // =====================
  if (isMobile) {
    return (
      <div
        data-testid="wallet-profile"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          paddingBottom: totalPages > 1 ? '140px' : '0',
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
          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            {/* Back Button */}
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '10px',
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                color: tokens.colors.textSecondary,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ← Back
            </button>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <CopyButton text={wallet.address} isMobile />
              
                href={`https://polygonscan.com/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tokens.colors.cyan,
                  border: `1px solid ${tokens.colors.cyan}`,
                  borderRadius: '12px',
                  fontSize: '18px',
                  textDecoration: 'none',
                  boxShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
                }}
              >
                ↗
              </a>
            </div>
          </div>

          {/* Wallet Identity */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${tokens.colors.cyan}30, ${tokens.colors.magenta}30)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: `0 0 25px ${tokens.colors.cyanGlow}`,
              }}
            >
              🐋
            </div>
            <div>
              <div
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: tokens.colors.cyan,
                  textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
                  marginBottom: '4px',
                }}
              >
                {shortenAddress(wallet.address)}
              </div>
              <div
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '12px',
                  color: tokens.colors.textMuted,
                }}
              >
                {formatUSD(wallet.totalDeposited)} total · {depositsTotal} deposits
              </div>
            </div>
          </div>
        </div>

        {/* ===== STATS GRID ===== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <MobileStatCard
            icon="💰"
            label="Total Deposited"
            value={formatUSD(wallet.totalDeposited)}
            valueColor={tokens.colors.profit}
            glow={tokens.colors.profitGlow}
          />
          <MobileStatCard
            icon="📊"
            label="Deposits"
            value={depositsTotal.toString()}
          />
          <MobileStatCard
            icon="📈"
            label="Avg. Deposit"
            value={formatUSD(avgDeposit)}
          />
          <MobileStatCard
            icon="📅"
            label="First Seen"
            value={formatShortDate(wallet.firstSeenAt)}
          />
        </div>

        {/* ===== DEPOSIT HISTORY ===== */}
        <div style={{ marginBottom: '16px' }}>
          {/* Section Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📜</span>
              <span
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '16px',
                  fontWeight: 600,
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
                padding: '4px 10px',
                background: tokens.colors.surface,
                borderRadius: '8px',
              }}
            >
              {depositsTotal} total
            </span>
          </div>

          {/* Deposit Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {depositsLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: tokens.colors.surface,
                    border: `1px solid ${tokens.colors.border}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    height: '100px',
                    animation: 'pulse 2s infinite',
                  }}
                />
              ))
            ) : deposits.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: tokens.colors.surface,
                  borderRadius: '12px',
                  border: `1px solid ${tokens.colors.border}`,
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>
                  📭
                </div>
                <div style={{ color: tokens.colors.textMuted }}>
                  No deposits found
                </div>
              </div>
            ) : (
              deposits.map((deposit, index) => (
                <MobileDepositCard
                  key={deposit.id}
                  deposit={deposit}
                  index={index}
                />
              ))
            )}
          </div>
        </div>

        {/* ===== STICKY PAGINATION ===== */}
        {totalPages > 1 && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <button
                onClick={() => onDepositsPageChange(depositsPage - 1)}
                disabled={depositsPage === 1}
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
                  color: depositsPage === 1 ? tokens.colors.muted : tokens.colors.textSecondary,
                  cursor: depositsPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: depositsPage === 1 ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                ‹
              </button>

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
                    {depositsPage}
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
                  Showing {startItem}-{endItem} of {depositsTotal}
                </div>
              </div>

              <button
                onClick={() => onDepositsPageChange(depositsPage + 1)}
                disabled={depositsPage === totalPages}
                aria-label="Next page"
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: depositsPage === totalPages ? tokens.colors.surface : tokens.colors.cyan,
                  border: `1px solid ${depositsPage === totalPages ? tokens.colors.border : tokens.colors.cyan}`,
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: depositsPage === totalPages ? tokens.colors.muted : tokens.colors.void,
                  cursor: depositsPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: depositsPage === totalPages ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: depositsPage !== totalPages ? `0 0 25px ${tokens.colors.cyanGlow}` : 'none',
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
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
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
                  fontSize: '24px',
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
                fontSize: '14px',
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <CopyButton text={wallet.address} isMobile={false} />
            
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
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>💰</span>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '11px',
                color: tokens.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Total Deposited
            </span>
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '24px',
              fontWeight: 600,
              color: tokens.colors.profit,
              textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
            }}
          >
            {formatUSD(wallet.totalDeposited)}
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>📊</span>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '11px',
                color: tokens.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Deposit Count
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
            {depositsTotal}
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>📈</span>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '11px',
                color: tokens.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Avg. Deposit
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
            {formatUSD(avgDeposit)}
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>📅</span>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '11px',
                color: tokens.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              First Seen
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
            {formatDate(wallet.firstSeenAt)}
          </div>
        </div>
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

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderTop: `1px solid ${tokens.colors.border}`,
            }}
          >
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '12px',
                color: tokens.colors.textMuted,
              }}
            >
              Showing {startItem}-{endItem} of {depositsTotal} deposits
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onDepositsPageChange(depositsPage - 1)}
                disabled={depositsPage === 1}
                style={{
                  padding: '8px 14px',
                  background: depositsPage === 1 ? 'transparent' : tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: '8px',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '14px',
                  color: depositsPage === 1 ? tokens.colors.muted : tokens.colors.textSecondary,
                  cursor: depositsPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: depositsPage === 1 ? 0.5 : 1,
                }}
              >
                ‹ Prev
              </button>
              <button
                onClick={() => onDepositsPageChange(depositsPage + 1)}
                disabled={depositsPage === totalPages}
                style={{
                  padding: '8px 14px',
                  background: depositsPage === totalPages ? 'transparent' : tokens.colors.cyan,
                  border: `1px solid ${depositsPage === totalPages ? tokens.colors.border : tokens.colors.cyan}`,
                  borderRadius: '8px',
                  fontFamily: tokens.fonts.mono,
                  fontSize: '14px',
                  color: depositsPage === totalPages ? tokens.colors.muted : tokens.colors.void,
                  cursor: depositsPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: depositsPage === totalPages ? 0.5 : 1,
                }}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

# Part 2: TrendingMarkets Mobile Enhancement

## Current vs Enhanced Structure

```
CURRENT                              ENHANCED
┌─────────────────────┐              ┌─────────────────────────────────────┐
│ 🔥 Trending Markets │              │  🔥 Trending Markets      View all →│ ← Header
│─────────────────────│              └─────────────────────────────────────┘
│ [Card] [Card]       │                                ↓
│ [Card] [Card]       │              ┌─────────────────────────────────────┐
│ (vertical grid)     │              │  ← Swipe horizontally →             │
└─────────────────────┘              │  ┌────────────┐ ┌────────────┐      │
                                     │  │ 🏛️ POLITICS│ │ ₿ CRYPTO  │      │
                                     │  │            │ │            │      │
                                     │  │ Will Trump │ │ BTC $100K? │      │
                                     │  │ win 2024?  │ │            │      │
                                     │  │            │ │            │      │
                                     │  │ ████░ 62%  │ │ ███░░ 45%  │      │
                                     │  │            │ │            │      │
                                     │  │ $1.2M 24h  │ │ $890K 24h  │      │
                                     │  └────────────┘ └────────────┘      │
                                     │                                     │
                                     │  ● ○ ○ ○  (scroll indicators)       │
                                     └─────────────────────────────────────┘
```

---

## Complete Enhanced TrendingMarkets.tsx

```tsx
/**
 * TrendingMarkets Component
 *
 * Displays trending prediction markets from Polymarket.
 * 
 * Enhanced mobile view with:
 * - Horizontal scrolling cards
 * - Larger touch targets
 * - Scroll position indicators
 * - Category tags
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { useRef, useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { EmptyState } from './EmptyState';
import type { TrendingMarketResponse } from '../services/api';

interface TrendingMarketsProps {
  markets: TrendingMarketResponse[];
  loading: boolean;
  error: string | null;
  isMobile: boolean;
  onRetry?: () => void;
}

/**
 * Format a number as USD with K/M suffix
 */
function formatVolume(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Get Polymarket URL for a market
 */
function getMarketUrl(eventSlug: string): string {
  return `https://polymarket.com/event/${eventSlug}`;
}

/**
 * Infer category from market question (simplified)
 */
type MarketCategory = 'politics' | 'crypto' | 'sports' | 'finance' | 'tech' | 'entertainment' | 'other';

function inferCategory(question: string): MarketCategory {
  const q = question.toLowerCase();
  if (/trump|biden|election|president|congress|senate|vote|democrat|republican/i.test(q)) return 'politics';
  if (/bitcoin|btc|ethereum|eth|crypto|defi|token|blockchain/i.test(q)) return 'crypto';
  if (/nfl|nba|mlb|world cup|championship|playoff|game|match/i.test(q)) return 'sports';
  if (/stock|fed|rate|inflation|gdp|earnings|ipo|market/i.test(q)) return 'finance';
  if (/apple|google|microsoft|ai|gpt|launch|iphone/i.test(q)) return 'tech';
  if (/oscar|grammy|movie|film|album|award|netflix/i.test(q)) return 'entertainment';
  return 'other';
}

const CATEGORY_CONFIG: Record<MarketCategory, { icon: string; label: string; color: string }> = {
  politics: { icon: '🏛️', label: 'Politics', color: '#ff6b35' },
  crypto: { icon: '₿', label: 'Crypto', color: '#f7931a' },
  sports: { icon: '⚽', label: 'Sports', color: '#22c55e' },
  finance: { icon: '📈', label: 'Finance', color: '#3b82f6' },
  tech: { icon: '💻', label: 'Tech', color: '#a855f7' },
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#ec4899' },
  other: { icon: '📌', label: 'Other', color: '#6b7280' },
};

/**
 * Category Tag Component
 */
function CategoryTag({ category }: { category: MarketCategory }) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: `${config.color}15`,
        border: `1px solid ${config.color}40`,
        borderRadius: '4px',
        fontFamily: tokens.fonts.mono,
        fontSize: '10px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: config.color,
      }}
    >
      <span style={{ fontSize: '11px' }}>{config.icon}</span>
      {config.label}
    </span>
  );
}

/**
 * Mobile Market Card Component
 */
function MobileMarketCard({
  market,
  index,
}: {
  market: TrendingMarketResponse;
  index: number;
}) {
  const yesPercent = Math.round(market.yesPrice * 100);
  const category = inferCategory(market.question);

  return (
    
      href={getMarketUrl(market.eventSlug)}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="market-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        width: '280px',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '16px',
        padding: '16px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        animation: `fadeInUp 0.4s ${index * 0.1}s both cubic-bezier(0.16, 1, 0.3, 1)`,
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
    >
      {/* Category Tag */}
      <div style={{ marginBottom: '12px' }}>
        <CategoryTag category={category} />
      </div>

      {/* Market Question */}
      <div
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: '15px',
          fontWeight: 600,
          color: tokens.colors.textPrimary,
          marginBottom: '16px',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '63px', // 3 lines
        }}
      >
        {market.question}
      </div>

      {/* Probability Bar */}
      <div style={{ marginBottom: '14px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
            }}
          >
            Yes
          </span>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
            }}
          >
            No
          </span>
        </div>
        <div
          style={{
            position: 'relative',
            height: '10px',
            background: `${tokens.colors.loss}30`,
            borderRadius: '5px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${yesPercent}%`,
              background: `linear-gradient(90deg, ${tokens.colors.profit}, ${tokens.colors.cyan})`,
              borderRadius: '5px',
              transition: 'width 0.3s ease',
              boxShadow: `0 0 10px ${tokens.colors.profitGlow}`,
            }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: `1px solid ${tokens.colors.border}`,
        }}
      >
        {/* Yes Probability */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '24px',
              fontWeight: 700,
              color: tokens.colors.profit,
              textShadow: `0 0 15px ${tokens.colors.profitGlow}`,
            }}
          >
            {yesPercent}%
          </span>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
            }}
          >
            Yes
          </span>
        </div>

        {/* 24h Volume */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '14px',
              fontWeight: 600,
              color: tokens.colors.textPrimary,
            }}
          >
            {formatVolume(market.volume24hr)}
          </span>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
            }}
          >
            24h volume
          </span>
        </div>
      </div>
    </a>
  );
}

/**
 * Desktop Market Card Component
 */
function DesktopMarketCard({
  market,
  index,
}: {
  market: TrendingMarketResponse;
  index: number;
}) {
  const yesPercent = Math.round(market.yesPrice * 100);
  const category = inferCategory(market.question);

  return (
    
      href={getMarketUrl(market.eventSlug)}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="market-card"
      style={{
        display: 'block',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: '16px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        animation: `fadeInUp 0.4s ${index * 0.05}s both cubic-bezier(0.16, 1, 0.3, 1)`,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.cyan;
        e.currentTarget.style.boxShadow = tokens.shadows.cardHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Category Tag */}
      <div style={{ marginBottom: '10px' }}>
        <CategoryTag category={category} />
      </div>

      {/* Market question */}
      <div
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: '14px',
          fontWeight: 500,
          color: tokens.colors.textPrimary,
          marginBottom: '12px',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '40px',
        }}
      >
        {market.question}
      </div>

      {/* Probability bar */}
      <div
        style={{
          position: 'relative',
          height: '8px',
          background: `${tokens.colors.loss}40`,
          borderRadius: '4px',
          marginBottom: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${yesPercent}%`,
            background: `linear-gradient(90deg, ${tokens.colors.profit}, ${tokens.colors.cyan})`,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '18px',
              fontWeight: 700,
              color: tokens.colors.profit,
            }}
          >
            {yesPercent}%
          </span>
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '11px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
            }}
          >
            Yes
          </span>
        </div>

        <div
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            color: tokens.colors.textSecondary,
          }}
        >
          {formatVolume(market.volume24hr)} 24h
        </div>
      </div>
    </a>
  );
}

/**
 * Loading Skeleton
 */
function LoadingSkeleton({ count, isMobile }: { count: number; isMobile: boolean }) {
  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: '280px',
              height: '220px',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '16px',
              animation: 'pulse 2s infinite',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '16px',
            animation: 'pulse 2s infinite',
          }}
        >
          <div
            style={{
              height: '16px',
              background: tokens.colors.border,
              borderRadius: '4px',
              marginBottom: '8px',
              width: '80%',
            }}
          />
          <div
            style={{
              height: '16px',
              background: tokens.colors.border,
              borderRadius: '4px',
              marginBottom: '12px',
              width: '60%',
            }}
          />
          <div
            style={{
              height: '8px',
              background: tokens.colors.border,
              borderRadius: '4px',
              marginBottom: '12px',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                height: '18px',
                width: '60px',
                background: tokens.colors.border,
                borderRadius: '4px',
              }}
            />
            <div
              style={{
                height: '14px',
                width: '80px',
                background: tokens.colors.border,
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Scroll Indicator Dots
 */
function ScrollIndicator({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        marginTop: '12px',
      }}
    >
      {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
        <div
          key={i}
          style={{
            width: current === i ? '16px' : '6px',
            height: '6px',
            borderRadius: '3px',
            background: current === i ? tokens.colors.cyan : tokens.colors.border,
            transition: 'all 0.2s ease',
            boxShadow: current === i ? `0 0 10px ${tokens.colors.cyanGlow}` : 'none',
          }}
        />
      ))}
      {total > 5 && (
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            color: tokens.colors.textMuted,
            marginLeft: '4px',
          }}
        >
          +{total - 5}
        </span>
      )}
    </div>
  );
}

export function TrendingMarkets({
  markets,
  loading,
  error,
  isMobile,
  onRetry,
}: TrendingMarketsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);

  // Track scroll position for indicator
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const scrollLeft = scrollRef.current.scrollLeft;
        const cardWidth = 292; // 280px card + 12px gap
        const index = Math.round(scrollLeft / cardWidth);
        setScrollIndex(index);
      }
    };

    const el = scrollRef.current;
    if (el && isMobile) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [isMobile]);

  // =====================
  // MOBILE VIEW
  // =====================
  if (isMobile) {
    return (
      <div data-testid="trending-markets">
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔥</span>
            <span
              style={{
                fontFamily: tokens.fonts.display,
                fontWeight: 700,
                fontSize: '18px',
                color: tokens.colors.textPrimary,
              }}
            >
              Trending Markets
            </span>
          </div>
          
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: tokens.fonts.mono,
              fontSize: '12px',
              color: tokens.colors.cyan,
              textDecoration: 'none',
              padding: '6px 10px',
              background: `${tokens.colors.cyan}10`,
              borderRadius: '8px',
            }}
          >
            View all →
          </a>
        </div>

        {/* Loading State */}
        {loading && <LoadingSkeleton count={3} isMobile />}

        {/* Error State */}
        {error && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '16px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📊</div>
            <div
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                color: tokens.colors.textMuted,
                marginBottom: '16px',
              }}
            >
              Failed to load markets
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '10px 20px',
                  background: tokens.colors.cyan,
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: tokens.fonts.body,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: tokens.colors.void,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && markets.length === 0 && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '16px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📈</div>
            <div style={{ color: tokens.colors.textMuted }}>
              No trending markets available
            </div>
          </div>
        )}

        {/* Horizontal Scroll Cards */}
        {!loading && !error && markets.length > 0 && (
          <>
            <div
              ref={scrollRef}
              style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                // Extend to edges for full-bleed scroll
                marginLeft: '-16px',
                marginRight: '-16px',
                paddingLeft: '16px',
                paddingRight: '16px',
              }}
            >
              {markets.map((market, index) => (
                <div
                  key={market.id}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <MobileMarketCard market={market} index={index} />
                </div>
              ))}
            </div>

            {/* Scroll Indicators */}
            {markets.length > 1 && (
              <ScrollIndicator total={markets.length} current={scrollIndex} />
            )}
          </>
        )}
      </div>
    );
  }

  // =====================
  // DESKTOP VIEW
  // =====================
  return (
    <div data-testid="trending-markets">
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>🔥</span>
          <span
            style={{
              fontFamily: tokens.fonts.body,
              fontWeight: 600,
              fontSize: '16px',
              color: tokens.colors.textPrimary,
            }}
          >
            Trending Markets
          </span>
        </div>
        
          href="https://polymarket.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            color: tokens.colors.textMuted,
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.cyan;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.textMuted;
          }}
        >
          View all →
        </a>
      </div>

      {/* Market cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        {loading ? (
          <LoadingSkeleton count={4} isMobile={false} />
        ) : error ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '48px 20px',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📊</div>
            <div
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                color: tokens.colors.textMuted,
                marginBottom: '16px',
              }}
            >
              Failed to load trending markets: {error}
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: tokens.colors.cyan,
                  background: 'transparent',
                  border: `1px solid ${tokens.colors.cyan}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = tokens.colors.cyanGlow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Retry
              </button>
            )}
          </div>
        ) : markets.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
            }}
          >
            <EmptyState icon="📈" message="No trending markets available" />
          </div>
        ) : (
          markets.map((market, index) => (
            <DesktopMarketCard key={market.id} market={market} index={index} />
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Summary: Mobile Enhancement Patterns

| Pattern | WhaleTable | AlertFeed | WalletProfile | TrendingMarkets |
|---------|------------|-----------|---------------|-----------------|
| **Sticky Header** | ✅ Gradient | ✅ Gradient | ✅ Gradient + Actions | ✅ Title + Link |
| **Title Style** | 🐋 Whales + badge | ⚡ Live Alerts + indicator | 🐋 Address + summary | 🔥 Trending |
| **Content Layout** | Card stack | Card stack | Stats grid + card stack | Horizontal scroll |
| **Touch Feedback** | Scale + bg | Scale + bg | Scale + bg | Scale + bg |
| **Sticky Pagination** | ✅ Glass | ✅ Glass | ✅ Glass | N/A (scroll) |
| **Empty State** | Whale ASCII | Animated whale | 📭 Message | 📈 Message |
| **Scroll Indicator** | N/A | N/A | N/A | ✅ Dots |

---

## CSS Animations to Ensure in globals.css

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Hide scrollbar utility */
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
```

---

This gives you a complete, cohesive mobile experience across all four main views! The design language is consistent:

- **Sticky headers** with gradient fade
- **Glass morphism pagination** fixed above mobile nav
- **Touch feedback** with scale transforms
- **Glowing accents** on key values
- **Consistent typography** and spacing
