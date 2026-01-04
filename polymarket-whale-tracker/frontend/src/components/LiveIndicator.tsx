/**
 * LiveIndicator Component
 *
 * Pulsing live status indicator showing real-time connection.
 * Shows health status with tooltip when blockchain listener has issues.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { useState, useEffect, useRef } from 'react';
import { tokens } from '../styles/tokens';
import { useHealth } from '../hooks/useHealth';

type HealthStatus = 'healthy' | 'degraded' | 'offline';

function getHealthStatus(blockchainHealthy: boolean, healthCheckOk: boolean): HealthStatus {
  if (!healthCheckOk) return 'offline';
  if (!blockchainHealthy) return 'degraded';
  return 'healthy';
}

function getStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return tokens.colors.profit;
    case 'degraded':
      return tokens.colors.warning;
    case 'offline':
      return tokens.colors.loss;
  }
}

function getStatusLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'LIVE';
    case 'degraded':
      return 'DEGRADED';
    case 'offline':
      return 'OFFLINE';
  }
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function LiveIndicator() {
  const { blockchainHealthy, lastEventTime, healthCheckOk } = useHealth();
  const [showTooltip, setShowTooltip] = useState(false);
  const [lastEventTimeAgo, setLastEventTimeAgo] = useState('');
  const containerRef = useRef<HTMLSpanElement>(null);

  const status = getHealthStatus(blockchainHealthy, healthCheckOk);
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  // Update time ago display every 10 seconds
  useEffect(() => {
    const updateTimeAgo = () => {
      setLastEventTimeAgo(formatTimeAgo(lastEventTime));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);
    return () => clearInterval(interval);
  }, [lastEventTime]);

  return (
    <span
      ref={containerRef}
      data-testid="live-indicator"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontFamily: tokens.fonts.mono,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        cursor: 'pointer',
      }}
    >
      <span
        data-testid="live-dot"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 10px ${color}`,
          animation: status === 'healthy' ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {label}

      {/* Tooltip */}
      {showTooltip && (
        <div
          data-testid="health-tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            minWidth: '240px',
            padding: tokens.spacing[4],
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.radius.lg,
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px ${status !== 'healthy' ? getStatusColor(status) + '33' : 'transparent'}`,
            zIndex: tokens.zIndex.tooltip,
            animation: 'fadeInUp 150ms ease-out',
          }}
        >
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              right: '16px',
              width: '12px',
              height: '12px',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRight: 'none',
              borderBottom: 'none',
              transform: 'rotate(45deg)',
            }}
          />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
              marginBottom: tokens.spacing[3],
              paddingBottom: tokens.spacing[3],
              borderBottom: `1px solid ${tokens.colors.border}`,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            />
            <span
              style={{
                fontFamily: tokens.fonts.body,
                fontWeight: tokens.fontWeights.semibold,
                fontSize: tokens.fontSizes.sm,
                color: tokens.colors.textPrimary,
              }}
            >
              Blockchain Listener
            </span>
          </div>

          {/* Status Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: tokens.fontSizes.xs,
                  color: tokens.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Status
              </span>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: tokens.fontSizes.xs,
                  color,
                  fontWeight: tokens.fontWeights.medium,
                }}
              >
                {status === 'healthy' ? 'Receiving deposits' : status === 'degraded' ? 'Not receiving' : 'Connection lost'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: tokens.fontSizes.xs,
                  color: tokens.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Last Event
              </span>
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: tokens.fontSizes.xs,
                  color: tokens.colors.textPrimary,
                }}
              >
                {lastEventTimeAgo}
              </span>
            </div>
          </div>

          {/* Warning message for non-healthy states */}
          {status !== 'healthy' && (
            <div
              style={{
                marginTop: tokens.spacing[3],
                padding: tokens.spacing[3],
                background: `${color}15`,
                border: `1px solid ${color}40`,
                borderRadius: tokens.radius.md,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: tokens.fonts.body,
                  fontSize: tokens.fontSizes.xs,
                  color: tokens.colors.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                {status === 'degraded'
                  ? 'The blockchain listener may have stopped. New deposits might not appear until the connection is restored.'
                  : 'Cannot reach the server. Please check your connection.'}
              </p>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
