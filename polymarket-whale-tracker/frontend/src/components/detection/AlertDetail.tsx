/**
 * AlertDetail Component
 *
 * Detailed view of a single detection alert.
 * Shows all alert information, trigger values, and related data.
 */

import { useState } from 'react';
import { tokens } from '../../styles/tokens';
import { CopyableAddress } from '../CopyableAddress';
import { Button } from '../Button';
import {
  type DetectionAlert,
  type AlertStatus,
  ALERT_SEVERITY_COLORS,
  ALERT_TYPE_LABELS,
  ALERT_STATUS_LABELS,
} from '../../types/detection';

interface AlertDetailProps {
  alert: DetectionAlert;
  isMobile: boolean;
  onClose: () => void;
  onWalletClick?: (address: string) => void;
  onUpdateStatus: (id: number, status: AlertStatus, notes?: string) => Promise<void>;
}

export function AlertDetail({
  alert,
  isMobile,
  onClose,
  onWalletClick,
  onUpdateStatus,
}: AlertDetailProps) {
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState(alert.notes || '');
  const severityColor = ALERT_SEVERITY_COLORS[alert.severity];

  const handleStatusUpdate = async (newStatus: AlertStatus) => {
    setUpdating(true);
    try {
      await onUpdateStatus(alert.id, newStatus, notes);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div
      data-testid="alert-detail"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header with severity indicator */}
      <div
        style={{
          background: `${severityColor}10`,
          borderBottom: `1px solid ${tokens.colors.border}`,
          padding: tokens.spacing[4],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: tokens.spacing[3],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
            {/* Severity badge */}
            <span
              style={{
                padding: `4px ${tokens.spacing[3]}`,
                background: severityColor,
                borderRadius: '4px',
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.xs,
                fontWeight: 700,
                color: tokens.colors.void,
                textTransform: 'uppercase',
              }}
            >
              {alert.severity}
            </span>

            {/* Type badge */}
            <span
              style={{
                padding: `4px ${tokens.spacing[3]}`,
                background: tokens.colors.void,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '4px',
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.xs,
                color: tokens.colors.textSecondary,
                textTransform: 'uppercase',
              }}
            >
              {ALERT_TYPE_LABELS[alert.alertType]}
            </span>

            {/* Status badge */}
            <span
              style={{
                padding: `4px ${tokens.spacing[3]}`,
                background:
                  alert.status === 'confirmed'
                    ? tokens.colors.profit
                    : alert.status === 'dismissed'
                    ? tokens.colors.textMuted
                    : alert.status === 'investigating'
                    ? tokens.colors.magenta
                    : tokens.colors.cyan,
                borderRadius: '4px',
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.xs,
                fontWeight: 600,
                color: tokens.colors.void,
                textTransform: 'uppercase',
              }}
            >
              {ALERT_STATUS_LABELS[alert.status]}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.colors.textMuted,
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
              padding: tokens.spacing[2],
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <h2
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: isMobile ? tokens.fontSizes.lg : tokens.fontSizes.xl,
            fontWeight: 700,
            color: tokens.colors.textPrimary,
            marginTop: tokens.spacing[3],
            marginBottom: 0,
          }}
        >
          {alert.title}
        </h2>
      </div>

      {/* Content */}
      <div style={{ padding: tokens.spacing[4] }}>
        {/* Description */}
        {alert.description && (
          <div style={{ marginBottom: tokens.spacing[4] }}>
            <h3 style={sectionTitleStyle}>Description</h3>
            <p
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: tokens.fontSizes.base,
                color: tokens.colors.textSecondary,
                lineHeight: 1.6,
              }}
            >
              {alert.description}
            </p>
          </div>
        )}

        {/* Detection details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: tokens.spacing[4],
            marginBottom: tokens.spacing[4],
          }}
        >
          {/* Wallet */}
          <InfoBlock label="Wallet Address">
            <div
              onClick={() => onWalletClick?.(alert.walletAddress)}
              style={{ cursor: onWalletClick ? 'pointer' : 'default' }}
            >
              <CopyableAddress address={alert.walletAddress} showFull={!isMobile} />
            </div>
          </InfoBlock>

          {/* Detection Rule */}
          <InfoBlock label="Detection Rule">
            <span style={monoValueStyle}>{alert.detectionRule}</span>
          </InfoBlock>

          {/* Detected At */}
          <InfoBlock label="Detected At">
            <span style={monoValueStyle}>{formatDate(alert.detectedAt)}</span>
          </InfoBlock>

          {/* Confidence Score */}
          {alert.confidenceScore !== undefined && (
            <InfoBlock label="Confidence Score">
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                <div
                  style={{
                    flex: 1,
                    height: '8px',
                    background: tokens.colors.void,
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${alert.confidenceScore}%`,
                      height: '100%',
                      background:
                        alert.confidenceScore >= 80
                          ? tokens.colors.loss
                          : alert.confidenceScore >= 60
                          ? ALERT_SEVERITY_COLORS.HIGH
                          : tokens.colors.cyan,
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <span
                  style={{
                    ...monoValueStyle,
                    color:
                      alert.confidenceScore >= 80
                        ? tokens.colors.loss
                        : tokens.colors.textPrimary,
                  }}
                >
                  {alert.confidenceScore}%
                </span>
              </div>
            </InfoBlock>
          )}

          {/* Market ID */}
          {alert.conditionId && (
            <InfoBlock label="Market ID">
              <span style={monoValueStyle}>
                {alert.conditionId.slice(0, 20)}...
              </span>
            </InfoBlock>
          )}
        </div>

        {/* Trigger Values */}
        {alert.triggerValues && Object.keys(alert.triggerValues).length > 0 && (
          <div style={{ marginBottom: tokens.spacing[4] }}>
            <h3 style={sectionTitleStyle}>Trigger Values</h3>
            <div
              style={{
                background: tokens.colors.void,
                borderRadius: '8px',
                padding: tokens.spacing[3],
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.sm,
              }}
            >
              {Object.entries(alert.triggerValues).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: `${tokens.spacing[1]} 0`,
                    borderBottom: `1px solid ${tokens.colors.border}`,
                  }}
                >
                  <span style={{ color: tokens.colors.textSecondary }}>{key}</span>
                  <span style={{ color: tokens.colors.cyan }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Threshold Values */}
        {alert.thresholdValues && Object.keys(alert.thresholdValues).length > 0 && (
          <div style={{ marginBottom: tokens.spacing[4] }}>
            <h3 style={sectionTitleStyle}>Threshold Values</h3>
            <div
              style={{
                background: tokens.colors.void,
                borderRadius: '8px',
                padding: tokens.spacing[3],
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.sm,
              }}
            >
              {Object.entries(alert.thresholdValues).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: `${tokens.spacing[1]} 0`,
                    borderBottom: `1px solid ${tokens.colors.border}`,
                  }}
                >
                  <span style={{ color: tokens.colors.textSecondary }}>{key}</span>
                  <span style={{ color: tokens.colors.textPrimary }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Wallets */}
        {alert.relatedWallets && alert.relatedWallets.length > 0 && (
          <div style={{ marginBottom: tokens.spacing[4] }}>
            <h3 style={sectionTitleStyle}>Related Wallets</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
              {alert.relatedWallets.map((wallet) => (
                <div
                  key={wallet}
                  onClick={() => onWalletClick?.(wallet)}
                  style={{ cursor: onWalletClick ? 'pointer' : 'default' }}
                >
                  <CopyableAddress address={wallet} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Transactions */}
        {alert.relatedTxHashes && alert.relatedTxHashes.length > 0 && (
          <div style={{ marginBottom: tokens.spacing[4] }}>
            <h3 style={sectionTitleStyle}>Related Transactions</h3>
            <div
              style={{
                background: tokens.colors.void,
                borderRadius: '8px',
                padding: tokens.spacing[3],
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.xs,
                maxHeight: '150px',
                overflow: 'auto',
              }}
            >
              {alert.relatedTxHashes.map((tx) => (
                <a
                  key={tx}
                  href={`https://polygonscan.com/tx/${tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    color: tokens.colors.cyan,
                    textDecoration: 'none',
                    padding: `${tokens.spacing[1]} 0`,
                    borderBottom: `1px solid ${tokens.colors.border}`,
                  }}
                >
                  {tx.slice(0, 20)}...{tx.slice(-8)}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: tokens.spacing[4] }}>
          <h3 style={sectionTitleStyle}>Review Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this alert..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: tokens.spacing[3],
              background: tokens.colors.void,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.sm,
              color: tokens.colors.textPrimary,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Status Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: tokens.spacing[3],
            paddingTop: tokens.spacing[4],
            borderTop: `1px solid ${tokens.colors.border}`,
          }}
        >
          {alert.status !== 'investigating' && (
            <Button
              onClick={() => handleStatusUpdate('investigating')}
              disabled={updating}
              variant="secondary"
            >
              Mark Investigating
            </Button>
          )}
          {alert.status !== 'confirmed' && (
            <Button
              onClick={() => handleStatusUpdate('confirmed')}
              disabled={updating}
              variant="primary"
            >
              Confirm Suspicious
            </Button>
          )}
          {alert.status !== 'dismissed' && (
            <Button
              onClick={() => handleStatusUpdate('dismissed')}
              disabled={updating}
              variant="ghost"
            >
              Dismiss
            </Button>
          )}
        </div>

        {/* Review timestamp */}
        {alert.reviewedAt && (
          <div
            style={{
              marginTop: tokens.spacing[3],
              fontFamily: tokens.fonts.mono,
              fontSize: tokens.fontSizes.xs,
              color: tokens.colors.textMuted,
            }}
          >
            Last reviewed: {formatDate(alert.reviewedAt)}
            {alert.reviewedBy && ` by ${alert.reviewedBy}`}
          </div>
        )}
      </div>
    </div>
  );
}

const sectionTitleStyle = {
  fontFamily: tokens.fonts.mono,
  fontSize: tokens.fontSizes.xs,
  fontWeight: 600,
  color: tokens.colors.textMuted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  marginBottom: tokens.spacing[2],
};

const monoValueStyle = {
  fontFamily: tokens.fonts.mono,
  fontSize: tokens.fontSizes.sm,
  color: tokens.colors.textPrimary,
};

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span style={sectionTitleStyle}>{label}</span>
      <div style={{ marginTop: tokens.spacing[1] }}>{children}</div>
    </div>
  );
}
