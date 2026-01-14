/**
 * RuleCard Component
 *
 * Displays a detection rule with its configuration and status.
 * Allows toggling enabled state and viewing thresholds.
 */

import { tokens } from '../../styles/tokens';
import {
  type DetectionRuleConfig,
  type DetectionRuleName,
  RULE_NAME_LABELS,
  RULE_DESCRIPTIONS,
} from '../../types/detection';

interface RuleCardProps {
  rule: DetectionRuleConfig;
  isMobile: boolean;
  onToggle?: (ruleName: DetectionRuleName, enabled: boolean) => void;
  onViewDetails?: (ruleName: DetectionRuleName) => void;
  isUpdating?: boolean;
}

function PriorityBadge({ priority }: { priority: number }) {
  const colors = {
    1: tokens.colors.cyan,
    2: tokens.colors.purple,
    3: tokens.colors.magenta,
  };
  const color = colors[priority as keyof typeof colors] || tokens.colors.textMuted;

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
        letterSpacing: '0.05em',
      }}
    >
      P{priority}
    </span>
  );
}

function StatusToggle({
  enabled,
  onToggle,
  isUpdating,
}: {
  enabled: boolean;
  onToggle?: () => void;
  isUpdating?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isUpdating || !onToggle}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        background: enabled ? tokens.colors.cyan : tokens.colors.border,
        cursor: onToggle && !isUpdating ? 'pointer' : 'not-allowed',
        position: 'relative',
        transition: 'background 0.2s ease',
        opacity: isUpdating ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: enabled ? '22px' : '2px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: tokens.colors.textPrimary,
          transition: 'left 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function ThresholdRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        {label.replace(/_/g, ' ')}
      </span>
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.xs,
          fontWeight: 600,
          color: tokens.colors.cyan,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

export function RuleCard({
  rule,
  isMobile,
  onToggle,
  onViewDetails,
  isUpdating,
}: RuleCardProps) {
  const handleToggle = () => {
    if (onToggle) {
      onToggle(rule.name, !rule.enabled);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(rule.name);
    }
  };

  return (
    <div
      data-testid={`rule-card-${rule.name}`}
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: tokens.spacing[4],
        opacity: rule.enabled ? 1 : 0.7,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: tokens.spacing[3],
          marginBottom: tokens.spacing[3],
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
              marginBottom: tokens.spacing[1],
            }}
          >
            <h3
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: isMobile ? tokens.fontSizes.sm : tokens.fontSizes.base,
                fontWeight: 600,
                color: tokens.colors.textPrimary,
                margin: 0,
              }}
            >
              {RULE_NAME_LABELS[rule.name] || rule.name}
            </h3>
            <PriorityBadge priority={rule.priority} />
          </div>
          <p
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.xs,
              color: tokens.colors.textSecondary,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {RULE_DESCRIPTIONS[rule.name] || rule.description}
          </p>
        </div>

        <StatusToggle
          enabled={rule.enabled}
          onToggle={handleToggle}
          isUpdating={isUpdating}
        />
      </div>

      {/* Status indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[2],
          marginBottom: tokens.spacing[3],
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: rule.enabled ? tokens.colors.profit : tokens.colors.textMuted,
            boxShadow: rule.enabled
              ? `0 0 8px ${tokens.colors.profit}`
              : 'none',
          }}
        />
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            color: rule.enabled ? tokens.colors.profit : tokens.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {rule.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>

      {/* Thresholds */}
      <div
        style={{
          background: tokens.colors.void,
          borderRadius: '8px',
          padding: tokens.spacing[3],
        }}
      >
        <h4
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '10px',
            fontWeight: 600,
            color: tokens.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: tokens.spacing[2],
          }}
        >
          Thresholds
        </h4>
        {Object.entries(rule.thresholds).map(([key, value]) => (
          <ThresholdRow key={key} label={key} value={value} />
        ))}
      </div>

      {/* View details button */}
      {onViewDetails && (
        <button
          onClick={handleViewDetails}
          style={{
            width: '100%',
            padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
            marginTop: tokens.spacing[3],
            background: 'transparent',
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '6px',
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.textSecondary,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          View Details
        </button>
      )}
    </div>
  );
}

/**
 * RuleCardList - Displays multiple rule cards in a grid
 */
interface RuleCardListProps {
  rules: DetectionRuleConfig[];
  isMobile: boolean;
  onToggle?: (ruleName: DetectionRuleName, enabled: boolean) => void;
  onViewDetails?: (ruleName: DetectionRuleName) => void;
  updatingRule?: DetectionRuleName | null;
}

export function RuleCardList({
  rules,
  isMobile,
  onToggle,
  onViewDetails,
  updatingRule,
}: RuleCardListProps) {
  return (
    <div
      data-testid="rule-card-list"
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: tokens.spacing[4],
      }}
    >
      {rules.map((rule) => (
        <RuleCard
          key={rule.name}
          rule={rule}
          isMobile={isMobile}
          onToggle={onToggle}
          onViewDetails={onViewDetails}
          isUpdating={updatingRule === rule.name}
        />
      ))}
    </div>
  );
}
