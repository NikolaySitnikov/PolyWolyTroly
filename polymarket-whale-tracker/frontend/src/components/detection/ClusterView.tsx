/**
 * ClusterView Component
 *
 * Displays wallet cluster information with related wallets and relationships.
 * Shows how wallets are connected through shared funders, timing, etc.
 */

import { tokens } from '../../styles/tokens';
import { Skeleton } from '../Skeleton';
import { CopyableAddress } from '../CopyableAddress';
import {
  type ClusterSummary,
  type ClusterRelationship,
  type ClusterRelationshipType,
  CLUSTER_RELATIONSHIP_LABELS,
} from '../../types/detection';

interface ClusterViewProps {
  cluster: ClusterSummary | null;
  relationships?: ClusterRelationship[];
  loading?: boolean;
  error?: string | null;
  notInCluster?: boolean;
  isMobile: boolean;
  onWalletClick?: (address: string) => void;
}

function RelationshipBadge({ type }: { type: ClusterRelationshipType }) {
  const colors: Record<ClusterRelationshipType, string> = {
    shared_funder: tokens.colors.cyan,
    shared_cashout: tokens.colors.magenta,
    timing_correlation: tokens.colors.purple,
  };

  const color = colors[type] || tokens.colors.textMuted;

  return (
    <span
      style={{
        padding: `2px ${tokens.spacing[2]}`,
        background: `${color}20`,
        border: `1px solid ${color}`,
        borderRadius: '4px',
        fontFamily: tokens.fonts.mono,
        fontSize: '10px',
        fontWeight: 600,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      {CLUSTER_RELATIONSHIP_LABELS[type] || type}
    </span>
  );
}

function StrengthMeter({ strength }: { strength: number }) {
  // 0-1 scale, show as percentage
  const pct = Math.round(strength * 100);
  const color =
    pct >= 80
      ? tokens.colors.loss
      : pct >= 60
      ? tokens.colors.profit
      : tokens.colors.cyan;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
      <div
        style={{
          width: '40px',
          height: '4px',
          background: tokens.colors.void,
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '2px',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '10px',
          color,
          fontWeight: 600,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

function WalletListItem({
  address,
  isHighlighted,
  onClick,
}: {
  address: string;
  isHighlighted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing[2],
        padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
        background: isHighlighted ? `${tokens.colors.cyan}15` : tokens.colors.void,
        border: `1px solid ${isHighlighted ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: '6px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isHighlighted ? tokens.colors.cyan : tokens.colors.textMuted,
          boxShadow: isHighlighted ? `0 0 8px ${tokens.colors.cyan}` : 'none',
        }}
      />
      <CopyableAddress address={address} />
    </div>
  );
}

function RelationshipListItem({
  relationship,
  onWallet1Click,
  onWallet2Click,
  isMobile,
}: {
  relationship: ClusterRelationship;
  onWallet1Click?: () => void;
  onWallet2Click?: () => void;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: tokens.spacing[2],
        padding: tokens.spacing[3],
        background: tokens.colors.void,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[2],
        }}
      >
        <div
          onClick={onWallet1Click}
          style={{ cursor: onWallet1Click ? 'pointer' : 'default' }}
        >
          <CopyableAddress address={relationship.wallet1} />
        </div>
        <span
          style={{
            color: tokens.colors.textMuted,
            fontSize: tokens.fontSizes.xs,
          }}
        >
          ↔
        </span>
        <div
          onClick={onWallet2Click}
          style={{ cursor: onWallet2Click ? 'pointer' : 'default' }}
        >
          <CopyableAddress address={relationship.wallet2} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[3],
          flexShrink: 0,
        }}
      >
        <RelationshipBadge type={relationship.type} />
        <StrengthMeter strength={relationship.strength} />
      </div>
    </div>
  );
}

export function ClusterView({
  cluster,
  relationships,
  loading,
  error,
  notInCluster,
  isMobile,
  onWalletClick,
}: ClusterViewProps) {
  // Loading state
  if (loading) {
    return (
      <div
        data-testid="cluster-view-loading"
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: tokens.spacing[4],
        }}
      >
        <Skeleton width="150px" height="24px" style={{ marginBottom: tokens.spacing[3] }} />
        <Skeleton height="60px" style={{ borderRadius: '8px', marginBottom: tokens.spacing[2] }} />
        <Skeleton height="40px" style={{ borderRadius: '6px' }} />
      </div>
    );
  }

  // Not in cluster state
  if (notInCluster) {
    return (
      <div
        data-testid="cluster-view-not-in-cluster"
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
          This wallet is not part of any detected cluster
        </p>
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
            color: tokens.colors.loss,
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  // No cluster
  if (!cluster) {
    return null;
  }

  return (
    <div
      data-testid="cluster-view"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: tokens.spacing[4],
      }}
    >
      {/* Header */}
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
          Wallet Cluster
        </h3>
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.textMuted,
          }}
        >
          {cluster.clusterId}
        </span>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: tokens.spacing[3],
          marginBottom: tokens.spacing[4],
        }}
      >
        <div
          style={{
            background: tokens.colors.void,
            borderRadius: '8px',
            padding: tokens.spacing[3],
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: tokens.fontSizes['2xl'],
              fontWeight: 700,
              color: tokens.colors.cyan,
            }}
          >
            {cluster.walletCount}
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Wallets
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.void,
            borderRadius: '8px',
            padding: tokens.spacing[3],
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: tokens.fontSizes['2xl'],
              fontWeight: 700,
              color: tokens.colors.purple,
            }}
          >
            {Math.round(cluster.avgStrength * 100)}%
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Avg Strength
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.void,
            borderRadius: '8px',
            padding: tokens.spacing[3],
            textAlign: 'center',
            gridColumn: isMobile ? 'span 2' : 'auto',
          }}
        >
          <RelationshipBadge type={cluster.dominantRelationship} />
          <div
            style={{
              fontFamily: tokens.fonts.mono,
              fontSize: '10px',
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginTop: tokens.spacing[1],
            }}
          >
            Primary Link
          </div>
        </div>
      </div>

      {/* Wallet list */}
      <div style={{ marginBottom: tokens.spacing[4] }}>
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
          Cluster Members
        </h4>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: tokens.spacing[2],
          }}
        >
          {cluster.wallets.map((address, index) => (
            <WalletListItem
              key={address}
              address={address}
              isHighlighted={index === 0} // Highlight first wallet
              onClick={onWalletClick ? () => onWalletClick(address) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Relationships */}
      {relationships && relationships.length > 0 && (
        <div>
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
            Relationships ({relationships.length})
          </h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing[2],
            }}
          >
            {relationships.slice(0, 5).map((rel, index) => (
              <RelationshipListItem
                key={`${rel.wallet1}-${rel.wallet2}-${index}`}
                relationship={rel}
                onWallet1Click={
                  onWalletClick ? () => onWalletClick(rel.wallet1) : undefined
                }
                onWallet2Click={
                  onWalletClick ? () => onWalletClick(rel.wallet2) : undefined
                }
                isMobile={isMobile}
              />
            ))}
            {relationships.length > 5 && (
              <p
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: tokens.fontSizes.xs,
                  color: tokens.colors.textMuted,
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                +{relationships.length - 5} more relationships
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact cluster badge for use in lists
 */
interface ClusterBadgeProps {
  walletCount: number;
  avgStrength: number;
  onClick?: () => void;
}

export function ClusterBadge({ walletCount, avgStrength, onClick }: ClusterBadgeProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing[2],
        padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
        background: `${tokens.colors.purple}20`,
        border: `1px solid ${tokens.colors.purple}`,
        borderRadius: '4px',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: tokens.fonts.mono,
        fontSize: '11px',
        color: tokens.colors.purple,
      }}
    >
      <span style={{ fontWeight: 600 }}>{walletCount}</span>
      <span style={{ color: tokens.colors.textMuted }}>wallets</span>
      <span style={{ fontWeight: 600 }}>{Math.round(avgStrength * 100)}%</span>
    </button>
  );
}
