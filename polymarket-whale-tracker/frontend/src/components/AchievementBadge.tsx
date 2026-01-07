/**
 * AchievementBadge Component
 *
 * Displays achievement badges for whale wallets.
 * Per DESIGN_IMPLEMENTATION_ROADMAP.md:
 * - 🥇 top depositor
 * - 🔥 hot streak
 * - 🆕 first-timer
 *
 * @see ../../../Design docs/DESIGN_IMPLEMENTATION_ROADMAP.md
 */

import React, { type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import { Tooltip } from './Tooltip';

/** Available achievement badge types */
export type AchievementType =
  | 'top-depositor'  // 🥇 Highest total deposits
  | 'hot-streak'     // 🔥 Multiple deposits in short timeframe
  | 'first-timer'    // 🆕 First deposit ever detected
  | 'whale'          // 🐋 $250K+ in deposits
  | 'mega-whale'     // 🐋💎 $1M+ in deposits
  | 'active'         // ⚡ Recent activity
  | 'consistent';    // 📈 Regular depositor

/** Badge size variants */
export type BadgeSize = 'sm' | 'md' | 'lg';

/** Configuration for each achievement type */
interface AchievementConfig {
  emoji: string;
  label: string;
  description: string;
  bgColor: string;
  glowColor: string;
}

const ACHIEVEMENT_CONFIG: Record<AchievementType, AchievementConfig> = {
  'top-depositor': {
    emoji: '🥇',
    label: 'Top Depositor',
    description: 'Top 3 highest deposits on Polymarket',
    bgColor: 'rgba(255, 215, 0, 0.2)',
    glowColor: 'rgba(255, 215, 0, 0.4)',
  },
  'hot-streak': {
    emoji: '🔥',
    label: 'Hot Streak',
    description: '3+ deposits since first seen (<48h ago)',
    bgColor: 'rgba(255, 87, 34, 0.2)',
    glowColor: 'rgba(255, 87, 34, 0.4)',
  },
  'first-timer': {
    emoji: '🆕',
    label: 'First Timer',
    description: 'Recently started depositing',
    bgColor: `${tokens.colors.cyan}20`,
    glowColor: tokens.colors.cyanGlow,
  },
  'whale': {
    emoji: '🐋',
    label: 'Whale',
    description: '$250K+ in total deposits',
    bgColor: `${tokens.colors.cyan}15`,
    glowColor: tokens.colors.cyanGlow,
  },
  'mega-whale': {
    emoji: '🐋',
    label: 'Mega Whale',
    description: '$1M+ in total deposits',
    bgColor: `${tokens.colors.magenta}20`,
    glowColor: tokens.colors.magentaGlow,
  },
  'active': {
    emoji: '⚡',
    label: 'Active',
    description: 'Deposited in the last hour',
    bgColor: `${tokens.colors.profit}20`,
    glowColor: tokens.colors.profitGlow,
  },
  'consistent': {
    emoji: '📈',
    label: 'Consistent',
    description: 'Regular deposit pattern',
    bgColor: `${tokens.colors.purple}20`,
    glowColor: 'rgba(168, 85, 247, 0.3)',
  },
};

const SIZE_CONFIG: Record<BadgeSize, { size: string; fontSize: string }> = {
  sm: { size: '20px', fontSize: '10px' },
  md: { size: '28px', fontSize: '14px' },
  lg: { size: '36px', fontSize: '18px' },
};

export interface AchievementBadgeProps {
  /** Type of achievement to display */
  type: AchievementType;
  /** Size of the badge */
  size?: BadgeSize;
  /** Optional rank number to display */
  rank?: number;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
}

/**
 * AchievementBadge - Single achievement badge
 *
 * Displays an emoji badge with glow effect and optional rank number.
 *
 * @example
 * ```tsx
 * <AchievementBadge type="top-depositor" rank={1} />
 * <AchievementBadge type="hot-streak" size="lg" />
 * ```
 */
export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  type,
  size = 'md',
  rank,
  showTooltip = true,
}) => {
  const config = ACHIEVEMENT_CONFIG[type];
  const sizeConfig = SIZE_CONFIG[size];

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: sizeConfig.size,
    height: sizeConfig.size,
    borderRadius: tokens.radius.full,
    backgroundColor: config.bgColor,
    fontSize: sizeConfig.fontSize,
    boxShadow: `0 0 12px ${config.glowColor}`,
    transition: `all ${tokens.animation.durationFast} ease`,
    cursor: 'pointer',
  };

  const rankStyle: CSSProperties = {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    padding: '1px 4px',
    backgroundColor: tokens.colors.void,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.sm,
    fontFamily: tokens.fonts.mono,
    fontSize: '9px',
    fontWeight: 600,
    color: tokens.colors.textPrimary,
  };

  const badge = (
    <span
      data-testid={`achievement-badge-${type}`}
      style={badgeStyle}
      aria-label={`${config.label}: ${config.description}`}
    >
      <span>{config.emoji}</span>
      {rank !== undefined && (
        <span style={rankStyle}>#{rank}</span>
      )}
    </span>
  );

  if (showTooltip) {
    return (
      <Tooltip
        content={
          <div>
            <div style={{ fontWeight: 600, color: tokens.colors.textPrimary, marginBottom: '4px' }}>
              {config.label}
            </div>
            <div>{config.description}</div>
          </div>
        }
        placement="top"
      >
        {badge}
      </Tooltip>
    );
  }

  return badge;
};

export interface AchievementBadgesProps {
  /** List of achievements to display */
  achievements: AchievementType[];
  /** Size of badges */
  size?: BadgeSize;
  /** Maximum number of badges to show (rest hidden with +N) */
  maxVisible?: number;
}

/**
 * AchievementBadges - Multiple achievement badges in a row
 *
 * Displays multiple badges with optional overflow handling.
 *
 * @example
 * ```tsx
 * <AchievementBadges
 *   achievements={['top-depositor', 'hot-streak', 'whale']}
 *   maxVisible={2}
 * />
 * ```
 */
export const AchievementBadges: React.FC<AchievementBadgesProps> = ({
  achievements,
  size = 'sm',
  maxVisible,
}) => {
  const visibleAchievements = maxVisible
    ? achievements.slice(0, maxVisible)
    : achievements;
  const overflowCount = maxVisible
    ? Math.max(0, achievements.length - maxVisible)
    : 0;

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  };

  const overflowStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: SIZE_CONFIG[size].size,
    height: SIZE_CONFIG[size].size,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.surfaceHover,
    border: `1px solid ${tokens.colors.border}`,
    fontFamily: tokens.fonts.mono,
    fontSize: '10px',
    fontWeight: 500,
    color: tokens.colors.textMuted,
  };

  return (
    <span data-testid="achievement-badges" style={containerStyle}>
      {visibleAchievements.map((type) => (
        <AchievementBadge key={type} type={type} size={size} />
      ))}
      {overflowCount > 0 && (
        <span style={overflowStyle}>+{overflowCount}</span>
      )}
    </span>
  );
};

/**
 * Utility function to determine achievements based on whale data
 *
 * @param whale - Whale data object
 * @param allWhales - All whales for ranking comparison
 * @returns Array of achievement types
 */
export function getWhaleAchievements(
  whale: {
    address: string;
    totalDeposited: number;
    depositCount: number;
    firstSeenAt: string;
  },
  allWhales?: Array<{ address: string; totalDeposited: number }>
): AchievementType[] {
  const achievements: AchievementType[] = [];
  const now = new Date();
  const firstSeen = new Date(whale.firstSeenAt);
  const hoursSinceFirstSeen = (now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60);

  // First-timer: first seen within 24 hours
  if (hoursSinceFirstSeen < 24) {
    achievements.push('first-timer');
  }

  // Whale tier based on total deposited
  // Mega Whale: $1M+, Whale: $250K+
  if (whale.totalDeposited >= 1000000) {
    achievements.push('mega-whale');
  } else if (whale.totalDeposited >= 250000) {
    achievements.push('whale');
  }

  // Hot streak: 3+ deposits in a short time (approximation)
  if (whale.depositCount >= 3 && hoursSinceFirstSeen < 48) {
    achievements.push('hot-streak');
  }

  // Top depositor: check if this whale is in top 3
  if (allWhales && allWhales.length > 0) {
    const sortedWhales = [...allWhales].sort((a, b) => b.totalDeposited - a.totalDeposited);
    const rank = sortedWhales.findIndex((w) => w.address === whale.address);
    if (rank >= 0 && rank < 3) {
      achievements.push('top-depositor');
    }
  }

  return achievements;
}

export default AchievementBadge;
