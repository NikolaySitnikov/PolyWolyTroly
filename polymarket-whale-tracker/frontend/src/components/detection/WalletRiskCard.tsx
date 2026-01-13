/**
 * WalletRiskCard Component
 *
 * Displays wallet risk profile information from the detection system.
 * Shows risk score, contributing factors, and detailed breakdown.
 */

import { tokens } from '../../styles/tokens';
import { Skeleton } from '../Skeleton';
import { CopyableAddress } from '../CopyableAddress';
import { useWalletRisk } from '../../hooks/useWalletRisk';
import {
  type WalletRiskProfile,
  RISK_LEVEL_COLORS,
  FUNDING_SOURCE_LABELS,
} from '../../types/detection';

interface WalletRiskCardProps {
  address: string;
  isMobile: boolean;
  compact?: boolean;
  onViewDetails?: () => void;
}

function RiskMeter({ score, level }: { score: number; level: string }) {
  const color = RISK_LEVEL_COLORS[level as keyof typeof RISK_LEVEL_COLORS] || RISK_LEVEL_COLORS.UNKNOWN;

  return (
    <div style={{ marginBottom: tokens.spacing[3] }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing[2],
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Risk Score
        </span>
        <span
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: tokens.fontSizes['2xl'],
            fontWeight: 700,
            color,
          }}
        >
          {score}
        </span>
      </div>
      <div
        style={{
          height: '8px',
          background: tokens.colors.void,
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${tokens.colors.cyan}, ${color})`,
            borderRadius: '4px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: tokens.spacing[1],
          fontFamily: tokens.fonts.mono,
          fontSize: '10px',
          color: tokens.colors.textMuted,
        }}
      >
        <span>LOW</span>
        <span>MEDIUM</span>
        <span>HIGH</span>
        <span>CRITICAL</span>
      </div>
    </div>
  );
}

function ContributionBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={{ marginBottom: tokens.spacing[2] }}>
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
            color: tokens.colors.textSecondary,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            fontWeight: 600,
            color,
          }}
        >
          +{value}
        </span>
      </div>
      <div
        style={{
          height: '4px',
          background: tokens.colors.void,
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(value, 100)}%`,
            height: '100%',
            background: color,
            borderRadius: '2px',
          }}
        />
      </div>
    </div>
  );
}

function RiskFactorList({ factors }: { factors: string[] }) {
  if (factors.length === 0) return null;

  return (
    <div style={{ marginTop: tokens.spacing[4] }}>
      <h4
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.xs,
          fontWeight: 600,
          color: tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: tokens.spacing[2],
        }}
      >
        Risk Factors
      </h4>
      <ul
        style={{
          margin: 0,
          paddingLeft: tokens.spacing[4],
          listStyleType: 'disc',
        }}
      >
        {factors.map((factor, index) => (
          <li
            key={index}
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.sm,
              color: tokens.colors.textSecondary,
              marginBottom: tokens.spacing[1],
            }}
          >
            {factor}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileSection({
  profile,
  isMobile,
}: {
  profile: WalletRiskProfile;
  isMobile: boolean;
}) {
  const riskColor = RISK_LEVEL_COLORS[profile.riskLevel];

  return (
    <div>
      {/* Risk badge header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing[4],
        }}
      >
        <span
          style={{
            padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
            background: `${riskColor}20`,
            border: `2px solid ${riskColor}`,
            borderRadius: '6px',
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.sm,
            fontWeight: 700,
            color: riskColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {profile.riskLevel} RISK
        </span>
      </div>

      {/* Risk meter */}
      <RiskMeter score={profile.riskScore} level={profile.riskLevel} />

      {/* Risk contributions */}
      <div
        style={{
          marginTop: tokens.spacing[4],
          padding: tokens.spacing[3],
          background: tokens.colors.void,
          borderRadius: '8px',
        }}
      >
        <h4
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            fontWeight: 600,
            color: tokens.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: tokens.spacing[3],
          }}
        >
          Risk Breakdown
        </h4>

        {profile.walletAge && (
          <ContributionBar
            label="Wallet Age"
            value={profile.walletAge.riskContribution}
            color={profile.walletAge.isNew ? tokens.colors.loss : tokens.colors.cyan}
          />
        )}

        {profile.funding && (
          <ContributionBar
            label="Funding Source"
            value={profile.funding.riskContribution}
            color={profile.funding.isRecentlyFunded ? RISK_LEVEL_COLORS.HIGH : tokens.colors.cyan}
          />
        )}

        {profile.activity && (
          <ContributionBar
            label="Activity Pattern"
            value={profile.activity.riskContribution}
            color={profile.activity.isHighlyConcentrated ? RISK_LEVEL_COLORS.HIGH : tokens.colors.cyan}
          />
        )}

        {profile.alerts && (
          <ContributionBar
            label="Previous Alerts"
            value={profile.alerts.riskContribution}
            color={profile.alerts.total > 0 ? RISK_LEVEL_COLORS.MEDIUM : tokens.colors.cyan}
          />
        )}
      </div>

      {/* Details grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: tokens.spacing[4],
          marginTop: tokens.spacing[4],
        }}
      >
        {/* Wallet Age */}
        {profile.walletAge && (
          <DetailCard title="Wallet Age">
            <DetailRow
              label="Age"
              value={
                profile.walletAge.ageDays !== null
                  ? `${profile.walletAge.ageDays} days`
                  : 'Unknown'
              }
            />
            <DetailRow
              label="First Seen"
              value={
                profile.walletAge.firstSeenAt
                  ? new Date(profile.walletAge.firstSeenAt).toLocaleDateString()
                  : 'Unknown'
              }
            />
            <DetailRow
              label="New Wallet"
              value={profile.walletAge.isNew ? 'Yes' : 'No'}
              highlight={profile.walletAge.isNew}
            />
          </DetailCard>
        )}

        {/* Funding */}
        {profile.funding && (
          <DetailCard title="Funding">
            <DetailRow
              label="Total Funded"
              value={`$${profile.funding.totalFunded.toLocaleString()}`}
            />
            <DetailRow
              label="Source Type"
              value={
                profile.funding.primarySourceType
                  ? FUNDING_SOURCE_LABELS[profile.funding.primarySourceType]
                  : 'Unknown'
              }
            />
            <DetailRow
              label="Source Label"
              value={profile.funding.primarySourceLabel || 'Unknown'}
            />
            {profile.funding.hoursBeforeFirstTrade !== null && (
              <DetailRow
                label="Hours Before Trade"
                value={`${profile.funding.hoursBeforeFirstTrade}h`}
                highlight={profile.funding.hoursBeforeFirstTrade < 24}
              />
            )}
          </DetailCard>
        )}

        {/* Activity */}
        {profile.activity && (
          <DetailCard title="Activity">
            <DetailRow
              label="Total Volume"
              value={`$${profile.activity.totalVolume.toLocaleString()}`}
            />
            <DetailRow label="Trade Count" value={String(profile.activity.tradeCount)} />
            <DetailRow label="Markets" value={String(profile.activity.marketCount)} />
            {profile.activity.topMarket && (
              <DetailRow
                label="Top Market Share"
                value={`${(profile.activity.topMarket.volumeShare * 100).toFixed(1)}%`}
                highlight={profile.activity.topMarket.volumeShare > 0.5}
              />
            )}
          </DetailCard>
        )}

        {/* Alerts */}
        {profile.alerts && (
          <DetailCard title="Alerts">
            <DetailRow
              label="Total Alerts"
              value={String(profile.alerts.total)}
              highlight={profile.alerts.total > 0}
            />
            <DetailRow
              label="Critical"
              value={String(profile.alerts.bySeverity.CRITICAL || 0)}
              highlight={(profile.alerts.bySeverity.CRITICAL || 0) > 0}
            />
            <DetailRow
              label="High"
              value={String(profile.alerts.bySeverity.HIGH || 0)}
              highlight={(profile.alerts.bySeverity.HIGH || 0) > 0}
            />
          </DetailCard>
        )}
      </div>

      {/* Risk factors */}
      <RiskFactorList factors={profile.riskFactors} />
    </div>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: tokens.colors.void,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '8px',
        padding: tokens.spacing[3],
      }}
    >
      <h4
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.xs,
          fontWeight: 600,
          color: tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: tokens.spacing[2],
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: `${tokens.spacing[1]} 0`,
        borderBottom: `1px solid ${tokens.colors.border}`,
      }}
    >
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.xs,
          color: tokens.colors.textSecondary,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.xs,
          fontWeight: highlight ? 600 : 400,
          color: highlight ? tokens.colors.loss : tokens.colors.textPrimary,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function WalletRiskCard({
  address,
  isMobile,
  compact,
  onViewDetails,
}: WalletRiskCardProps) {
  const { profile, loading, error, refetch } = useWalletRisk(address);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: tokens.spacing[4],
        }}
      >
        <Skeleton width="100px" height="24px" style={{ marginBottom: tokens.spacing[3] }} />
        <Skeleton height="8px" style={{ marginBottom: tokens.spacing[2] }} />
        <Skeleton height="60px" style={{ borderRadius: '8px' }} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
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
            color: tokens.colors.textSecondary,
            marginBottom: tokens.spacing[3],
          }}
        >
          Unable to load risk profile
        </p>
        <button
          onClick={refetch}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '6px',
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // No profile
  if (!profile) {
    return (
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
          }}
        >
          No risk profile available
        </p>
      </div>
    );
  }

  // Compact view
  if (compact) {
    const riskColor = RISK_LEVEL_COLORS[profile.riskLevel];
    return (
      <div
        onClick={onViewDetails}
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '8px',
          padding: tokens.spacing[3],
          cursor: onViewDetails ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing[3],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: riskColor,
              boxShadow: `0 0 8px ${riskColor}`,
            }}
          />
          <span
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: tokens.fontSizes.sm,
              color: tokens.colors.textSecondary,
            }}
          >
            Risk Score
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
          <span
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: tokens.fontSizes.lg,
              fontWeight: 700,
              color: riskColor,
            }}
          >
            {profile.riskScore}
          </span>
          <span
            style={{
              padding: `2px ${tokens.spacing[2]}`,
              background: `${riskColor}20`,
              border: `1px solid ${riskColor}`,
              borderRadius: '4px',
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              fontWeight: 600,
              color: riskColor,
              textTransform: 'uppercase',
            }}
          >
            {profile.riskLevel}
          </span>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div
      data-testid="wallet-risk-card"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: tokens.spacing[4],
      }}
    >
      {/* Header with wallet address */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing[4],
        }}
      >
        <h3
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: tokens.fontSizes.lg,
            fontWeight: 600,
            color: tokens.colors.textPrimary,
            margin: 0,
          }}
        >
          Risk Profile
        </h3>
        <CopyableAddress address={address} />
      </div>

      <ProfileSection profile={profile} isMobile={isMobile} />
    </div>
  );
}
