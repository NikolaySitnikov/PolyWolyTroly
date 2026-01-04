/**
 * AlertFeed Component
 *
 * Live feed of whale alerts (deposits).
 * Follows the design system from DESIGN_SYSTEM.md
 *
 * @see ../Design docs/DESIGN_SYSTEM.md - AlertFeed section
 */

import { tokens } from '../styles/tokens';
import { LiveIndicator } from './LiveIndicator';
import type { Alert } from '../types/alert';

interface AlertFeedProps {
  alerts: Alert[];
  isMobile: boolean;
  onAlertClick?: (alert: Alert) => void;
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
 * Format timestamp as relative time (e.g., "5 min ago")
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
    return diffSec <= 1 ? 'just now' : `${diffSec} seconds ago`;
  }
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }
  if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  }
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

/**
 * Pill badge component for alert type
 */
function AlertTypeBadge({ type }: { type: Alert['type'] }) {
  // Using profit green for deposits as per design
  const styles = {
    deposit: {
      bg: `${tokens.colors.profit}15`,
      border: tokens.colors.profit,
      color: tokens.colors.profit,
    },
  };

  const style = styles[type];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '999px',
        fontSize: '12px',
        fontFamily: tokens.fonts.mono,
        fontWeight: 500,
        color: style.color,
      }}
    >
      {type}
    </span>
  );
}

export function AlertFeed({ alerts, isMobile, onAlertClick }: AlertFeedProps) {
  return (
    <div
      data-testid="alert-feed"
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
        </div>
        <LiveIndicator />
      </div>

      {/* Alert List */}
      <div
        style={{
          maxHeight: isMobile ? '400px' : '600px',
          overflowY: 'auto',
        }}
      >
        {alerts.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              color: tokens.colors.textMuted,
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🐋</div>
            No alerts yet - waiting for whale activity...
          </div>
        ) : (
          alerts.map((alert, index) => (
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
                animation: `fadeInUp 0.4s ${index * 0.08}s both cubic-bezier(0.16, 1, 0.3, 1)`,
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
                  <AlertTypeBadge type={alert.type} />
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
                {formatRelativeTime(alert.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
