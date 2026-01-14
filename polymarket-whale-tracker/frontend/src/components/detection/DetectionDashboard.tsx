/**
 * DetectionDashboard Component
 *
 * Main dashboard view for the Insider Trading Detection System.
 * Displays detection statistics and recent alerts.
 */

import { tokens } from '../../styles/tokens';
import { GlowText } from '../GlowText';
import { StatCard } from '../StatCard';
import { Skeleton } from '../Skeleton';
import { DetectionIcon, AlertsIcon } from '../icons';
import { useDetectionStats } from '../../hooks/useDetectionStats';
import { useDetectionAlerts } from '../../hooks/useDetectionAlerts';
import { useDetectionRules } from '../../hooks/useDetectionRules';
import { DetectionAlertList } from './DetectionAlertList';
import { RuleCardList } from './RuleCard';
import {
  ALERT_SEVERITY_COLORS,
  ALERT_TYPE_LABELS,
  type DetectionAlert,
  type DetectionRuleName,
} from '../../types/detection';

interface DetectionDashboardProps {
  isMobile: boolean;
  onAlertClick?: (alert: DetectionAlert) => void;
  onWalletClick?: (address: string) => void;
}

export function DetectionDashboard({
  isMobile,
  onAlertClick,
  onWalletClick,
}: DetectionDashboardProps) {
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDetectionStats();
  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
    total: totalAlerts,
    page,
    totalPages,
    setPage,
    filters,
    setSeverityFilter,
    setStatusFilter,
    setTypeFilter,
    refetch: refetchAlerts,
    updateStatus,
  } = useDetectionAlerts(10);

  const {
    rules,
    loading: rulesLoading,
    toggleRule,
    updating: updatingRule,
  } = useDetectionRules();

  const handleRetry = () => {
    refetchStats();
    refetchAlerts();
  };

  const handleToggleRule = async (ruleName: DetectionRuleName, enabled: boolean) => {
    await toggleRule(ruleName, enabled);
  };

  // Loading state
  if (statsLoading && !stats) {
    return (
      <div data-testid="detection-dashboard-loading">
        {/* Header skeleton */}
        <div style={{ marginBottom: tokens.spacing[6] }}>
          <Skeleton width="280px" height="36px" style={{ marginBottom: tokens.spacing[2] }} />
          <Skeleton width="200px" height="18px" />
        </div>

        {/* Stats grid skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: tokens.spacing[6],
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="120px" style={{ borderRadius: '12px' }} />
          ))}
        </div>

        {/* Alert list skeleton */}
        <Skeleton width="180px" height="24px" style={{ marginBottom: tokens.spacing[4] }} />
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            height="80px"
            style={{ borderRadius: '8px', marginBottom: tokens.spacing[3] }}
          />
        ))}
      </div>
    );
  }

  // Error state
  if (statsError) {
    return (
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.loss}`,
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: tokens.spacing[4] }}>
          <DetectionIcon size={48} color={tokens.colors.loss} />
        </div>
        <p style={{ color: tokens.colors.loss, marginBottom: tokens.spacing[4] }}>
          {statsError}
        </p>
        <button
          onClick={handleRetry}
          style={{
            padding: '10px 24px',
            background: tokens.colors.cyan,
            border: 'none',
            borderRadius: '8px',
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            fontWeight: 600,
            color: tokens.colors.void,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div data-testid="detection-dashboard">
      {/* Hero section */}
      <div
        style={{
          marginBottom: '32px',
          textAlign: isMobile ? 'center' : 'left',
        }}
      >
        <h1
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: isMobile ? '28px' : '36px',
            fontWeight: 800,
            color: tokens.colors.textPrimary,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          Insider <GlowText>Detection</GlowText>
        </h1>
        <p
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: '15px',
            color: tokens.colors.textSecondary,
            margin: 0,
          }}
        >
          Monitoring {stats?.walletsTracked || 0} wallets across {stats?.activeMarkets || 0} active markets
        </p>
      </div>

      {/* Stats grid */}
      <div
        data-testid="detection-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: tokens.spacing[6],
        }}
      >
        <StatCard
          label="Alerts Today"
          value={String(stats?.alertsToday || 0)}
          numericValue={stats?.alertsToday || 0}
          icon={AlertsIcon}
          accentColor="magenta"
          delay={0}
        />
        <StatCard
          label="Total Alerts"
          value={String(stats?.alertsTotal || 0)}
          numericValue={stats?.alertsTotal || 0}
          icon={DetectionIcon}
          accentColor="purple"
          delay={50}
        />
        <StatCard
          label="Critical"
          value={String(stats?.alertsBySeverity?.CRITICAL || 0)}
          numericValue={stats?.alertsBySeverity?.CRITICAL || 0}
          icon={() => (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: ALERT_SEVERITY_COLORS.CRITICAL,
                boxShadow: `0 0 12px ${ALERT_SEVERITY_COLORS.CRITICAL}`,
              }}
            />
          )}
          accentColor="loss"
          delay={100}
        />
        <StatCard
          label="High Risk"
          value={String(stats?.alertsBySeverity?.HIGH || 0)}
          numericValue={stats?.alertsBySeverity?.HIGH || 0}
          icon={() => (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: ALERT_SEVERITY_COLORS.HIGH,
                boxShadow: `0 0 12px ${ALERT_SEVERITY_COLORS.HIGH}`,
              }}
            />
          )}
          accentColor="magenta"
          delay={150}
        />
      </div>

      {/* Alert type breakdown */}
      {stats?.alertsByType && (
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: tokens.spacing[4],
            marginBottom: tokens.spacing[6],
          }}
        >
          <h3
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: tokens.fontSizes.sm,
              fontWeight: 600,
              color: tokens.colors.textSecondary,
              marginBottom: tokens.spacing[3],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Alerts by Type
          </h3>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: tokens.spacing[3],
            }}
          >
            {Object.entries(stats.alertsByType).map(([type, count]) => (
              <div
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                  padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                  background: tokens.colors.void,
                  borderRadius: '6px',
                  border: `1px solid ${tokens.colors.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: tokens.fontSizes.sm,
                    color: tokens.colors.textSecondary,
                  }}
                >
                  {ALERT_TYPE_LABELS[type as keyof typeof ALERT_TYPE_LABELS] || type}
                </span>
                <span
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: tokens.fontSizes.sm,
                    fontWeight: 600,
                    color: tokens.colors.cyan,
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detection Rules section */}
      <div style={{ marginBottom: tokens.spacing[6] }}>
        <h2
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: isMobile ? tokens.fontSizes.xl : tokens.fontSizes['2xl'],
            fontWeight: 700,
            color: tokens.colors.textPrimary,
            marginBottom: tokens.spacing[4],
          }}
        >
          Detection <GlowText>Rules</GlowText>
        </h2>

        {rulesLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: tokens.spacing[4],
            }}
          >
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                height="200px"
                style={{ borderRadius: '12px' }}
              />
            ))}
          </div>
        ) : rules.length > 0 ? (
          <RuleCardList
            rules={rules}
            isMobile={isMobile}
            onToggle={handleToggleRule}
            updatingRule={updatingRule}
          />
        ) : (
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              padding: tokens.spacing[4],
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: tokens.fontSizes.sm,
                color: tokens.colors.textMuted,
                margin: 0,
              }}
            >
              No detection rules configured
            </p>
          </div>
        )}
      </div>

      {/* Recent alerts section */}
      <div>
        <h2
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: isMobile ? tokens.fontSizes.xl : tokens.fontSizes['2xl'],
            fontWeight: 700,
            color: tokens.colors.textPrimary,
            marginBottom: tokens.spacing[4],
          }}
        >
          Recent <GlowText>Alerts</GlowText>
        </h2>

        <DetectionAlertList
          alerts={alerts}
          loading={alertsLoading}
          error={alertsError}
          isMobile={isMobile}
          page={page}
          totalPages={totalPages}
          total={totalAlerts}
          onPageChange={setPage}
          filters={filters}
          onSeverityFilter={setSeverityFilter}
          onStatusFilter={setStatusFilter}
          onTypeFilter={setTypeFilter}
          onAlertClick={onAlertClick}
          onWalletClick={onWalletClick}
          onUpdateStatus={updateStatus}
          onRetry={refetchAlerts}
        />
      </div>
    </div>
  );
}
