/**
 * DetectionAlertList Component
 *
 * List of detection alerts with filtering, pagination, and status updates.
 */

import { tokens } from '../../styles/tokens';
import { Skeleton } from '../Skeleton';
import { Pagination } from '../Pagination';
import { CopyableAddress } from '../CopyableAddress';
import {
  type DetectionAlert,
  type AlertFilters,
  type AlertSeverity,
  type AlertStatus,
  type AlertType,
  ALERT_SEVERITY_COLORS,
  ALERT_TYPE_LABELS,
  ALERT_STATUS_LABELS,
} from '../../types/detection';

interface DetectionAlertListProps {
  alerts: DetectionAlert[];
  loading: boolean;
  error: string | null;
  isMobile: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  filters: AlertFilters;
  onSeverityFilter: (severity: AlertSeverity | AlertSeverity[] | undefined) => void;
  onStatusFilter: (status: AlertStatus | AlertStatus[] | undefined) => void;
  onTypeFilter: (type: AlertType | AlertType[] | undefined) => void;
  onAlertClick?: (alert: DetectionAlert) => void;
  onWalletClick?: (address: string) => void;
  onUpdateStatus: (id: number, status: AlertStatus, notes?: string) => Promise<void>;
  onRetry: () => void;
}

const SEVERITY_OPTIONS: AlertSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS: AlertStatus[] = ['new', 'investigating', 'confirmed', 'dismissed'];
const TYPE_OPTIONS: AlertType[] = ['timing', 'size', 'pattern', 'cluster', 'funding'];

function FilterPill({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
        background: active ? (color || tokens.colors.cyan) : 'transparent',
        border: `1px solid ${active ? (color || tokens.colors.cyan) : tokens.colors.border}`,
        borderRadius: '16px',
        fontFamily: tokens.fonts.mono,
        fontSize: tokens.fontSizes.xs,
        fontWeight: 500,
        color: active ? tokens.colors.void : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: `all ${tokens.animation.durationFast} ease`,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </button>
  );
}

function AlertCard({
  alert,
  isMobile,
  onAlertClick,
  onWalletClick,
  onUpdateStatus,
}: {
  alert: DetectionAlert;
  isMobile: boolean;
  onAlertClick?: (alert: DetectionAlert) => void;
  onWalletClick?: (address: string) => void;
  onUpdateStatus: (id: number, status: AlertStatus, notes?: string) => Promise<void>;
}) {
  const severityColor = ALERT_SEVERITY_COLORS[alert.severity];
  const relativeTime = getRelativeTime(alert.detectedAt);

  const handleStatusChange = async (newStatus: AlertStatus) => {
    try {
      await onUpdateStatus(alert.id, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div
      onClick={() => onAlertClick?.(alert)}
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '8px',
        padding: tokens.spacing[4],
        marginBottom: tokens.spacing[3],
        cursor: onAlertClick ? 'pointer' : 'default',
        transition: `all ${tokens.animation.durationFast} ease`,
        borderLeft: `4px solid ${severityColor}`,
      }}
      onMouseEnter={(e) => {
        if (onAlertClick) {
          e.currentTarget.style.borderColor = tokens.colors.cyan;
          e.currentTarget.style.borderLeftColor = severityColor;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.borderLeftColor = severityColor;
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: tokens.spacing[2],
          marginBottom: tokens.spacing[2],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
          {/* Severity badge */}
          <span
            style={{
              padding: `2px ${tokens.spacing[2]}`,
              background: `${severityColor}20`,
              border: `1px solid ${severityColor}`,
              borderRadius: '4px',
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              fontWeight: 600,
              color: severityColor,
              textTransform: 'uppercase',
            }}
          >
            {alert.severity}
          </span>

          {/* Type badge */}
          <span
            style={{
              padding: `2px ${tokens.spacing[2]}`,
              background: tokens.colors.void,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '4px',
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            {ALERT_TYPE_LABELS[alert.alertType]}
          </span>

          {/* Status badge */}
          <span
            style={{
              padding: `2px ${tokens.spacing[2]}`,
              background:
                alert.status === 'confirmed'
                  ? `${tokens.colors.profit}20`
                  : alert.status === 'dismissed'
                  ? `${tokens.colors.textMuted}20`
                  : tokens.colors.void,
              border: `1px solid ${
                alert.status === 'confirmed'
                  ? tokens.colors.profit
                  : alert.status === 'dismissed'
                  ? tokens.colors.textMuted
                  : tokens.colors.border
              }`,
              borderRadius: '4px',
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color:
                alert.status === 'confirmed'
                  ? tokens.colors.profit
                  : alert.status === 'dismissed'
                  ? tokens.colors.textMuted
                  : tokens.colors.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            {ALERT_STATUS_LABELS[alert.status]}
          </span>
        </div>

        {/* Timestamp */}
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.textMuted,
          }}
        >
          {relativeTime}
        </span>
      </div>

      {/* Title */}
      <h4
        style={{
          fontFamily: tokens.fonts.display,
          fontSize: tokens.fontSizes.base,
          fontWeight: 600,
          color: tokens.colors.textPrimary,
          marginBottom: tokens.spacing[2],
        }}
      >
        {alert.title}
      </h4>

      {/* Description */}
      {alert.description && (
        <p
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: tokens.fontSizes.sm,
            color: tokens.colors.textSecondary,
            marginBottom: tokens.spacing[3],
            lineHeight: 1.5,
          }}
        >
          {alert.description}
        </p>
      )}

      {/* Footer row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: tokens.spacing[2],
        }}
      >
        {/* Wallet address */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onWalletClick?.(alert.walletAddress);
          }}
          style={{ cursor: onWalletClick ? 'pointer' : 'default' }}
        >
          <CopyableAddress
            address={alert.walletAddress}
          />
        </div>

        {/* Quick status actions */}
        {alert.status === 'new' && (
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[2],
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleStatusChange('investigating')}
              style={{
                padding: `4px ${tokens.spacing[2]}`,
                background: 'transparent',
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '4px',
                fontFamily: tokens.fonts.mono,
                fontSize: '10px',
                color: tokens.colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              Investigate
            </button>
            <button
              onClick={() => handleStatusChange('dismissed')}
              style={{
                padding: `4px ${tokens.spacing[2]}`,
                background: 'transparent',
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '4px',
                fontFamily: tokens.fonts.mono,
                fontSize: '10px',
                color: tokens.colors.textMuted,
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Confidence score */}
      {alert.confidenceScore !== undefined && (
        <div
          style={{
            marginTop: tokens.spacing[3],
            padding: tokens.spacing[2],
            background: tokens.colors.void,
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: tokens.spacing[1],
            }}
          >
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.xs,
                color: tokens.colors.textMuted,
              }}
            >
              Confidence
            </span>
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.xs,
                fontWeight: 600,
                color: alert.confidenceScore >= 80 ? tokens.colors.loss : tokens.colors.textSecondary,
              }}
            >
              {alert.confidenceScore}%
            </span>
          </div>
          <div
            style={{
              height: '4px',
              background: tokens.colors.border,
              borderRadius: '2px',
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
                borderRadius: '2px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function DetectionAlertList({
  alerts,
  loading,
  error,
  isMobile,
  page,
  totalPages,
  total,
  onPageChange,
  filters,
  onSeverityFilter,
  onStatusFilter,
  onTypeFilter,
  onAlertClick,
  onWalletClick,
  onUpdateStatus,
  onRetry,
}: DetectionAlertListProps) {
  // Ensure alerts is always an array
  const safeAlerts = alerts || [];

  // Loading state
  if (loading && safeAlerts.length === 0) {
    return (
      <div>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            height="120px"
            style={{ borderRadius: '8px', marginBottom: tokens.spacing[3] }}
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.loss}`,
          borderRadius: '8px',
          padding: tokens.spacing[6],
          textAlign: 'center',
        }}
      >
        <p style={{ color: tokens.colors.loss, marginBottom: tokens.spacing[4] }}>
          {error}
        </p>
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            background: tokens.colors.cyan,
            border: 'none',
            borderRadius: '6px',
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            fontWeight: 600,
            color: tokens.colors.void,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const activeSeverity = filters.severity;
  const activeStatus = filters.status;
  const activeType = filters.alertType;

  return (
    <div data-testid="detection-alert-list">
      {/* Filters */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: tokens.spacing[4],
          marginBottom: tokens.spacing[4],
          padding: tokens.spacing[3],
          background: tokens.colors.surface,
          borderRadius: '8px',
          border: `1px solid ${tokens.colors.border}`,
        }}
      >
        {/* Severity filter */}
        <div>
          <span
            style={{
              display: 'block',
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
              marginBottom: tokens.spacing[2],
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Severity
          </span>
          <div style={{ display: 'flex', gap: tokens.spacing[1], flexWrap: 'wrap' }}>
            <FilterPill
              label="All"
              active={!activeSeverity}
              onClick={() => onSeverityFilter(undefined)}
            />
            {SEVERITY_OPTIONS.map((sev) => (
              <FilterPill
                key={sev}
                label={sev}
                active={activeSeverity === sev || (Array.isArray(activeSeverity) && activeSeverity.includes(sev))}
                onClick={() => onSeverityFilter(activeSeverity === sev ? undefined : sev)}
                color={ALERT_SEVERITY_COLORS[sev]}
              />
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div>
          <span
            style={{
              display: 'block',
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
              marginBottom: tokens.spacing[2],
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Status
          </span>
          <div style={{ display: 'flex', gap: tokens.spacing[1], flexWrap: 'wrap' }}>
            <FilterPill
              label="All"
              active={!activeStatus}
              onClick={() => onStatusFilter(undefined)}
            />
            {STATUS_OPTIONS.map((status) => (
              <FilterPill
                key={status}
                label={ALERT_STATUS_LABELS[status]}
                active={activeStatus === status || (Array.isArray(activeStatus) && activeStatus.includes(status))}
                onClick={() => onStatusFilter(activeStatus === status ? undefined : status)}
              />
            ))}
          </div>
        </div>

        {/* Type filter */}
        <div>
          <span
            style={{
              display: 'block',
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
              marginBottom: tokens.spacing[2],
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Type
          </span>
          <div style={{ display: 'flex', gap: tokens.spacing[1], flexWrap: 'wrap' }}>
            <FilterPill
              label="All"
              active={!activeType}
              onClick={() => onTypeFilter(undefined)}
            />
            {TYPE_OPTIONS.map((type) => (
              <FilterPill
                key={type}
                label={ALERT_TYPE_LABELS[type]}
                active={activeType === type || (Array.isArray(activeType) && activeType.includes(type))}
                onClick={() => onTypeFilter(activeType === type ? undefined : type)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Result count */}
      <div
        style={{
          marginBottom: tokens.spacing[3],
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.sm,
          color: tokens.colors.textMuted,
        }}
      >
        {total} alert{total !== 1 ? 's' : ''} found
      </div>

      {/* Alert cards */}
      {safeAlerts.length === 0 ? (
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '8px',
            padding: tokens.spacing[8],
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.base,
              color: tokens.colors.textSecondary,
            }}
          >
            No alerts match your filters
          </p>
        </div>
      ) : (
        safeAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            isMobile={isMobile}
            onAlertClick={onAlertClick}
            onWalletClick={onWalletClick}
            onUpdateStatus={onUpdateStatus}
          />
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: tokens.spacing[4] }}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={safeAlerts.length > 0 ? Math.ceil(total / totalPages) : 10}
            onPageChange={onPageChange}
            entityName="alerts"
            isMobile={isMobile}
          />
        </div>
      )}
    </div>
  );
}
