/**
 * CategoryTag Component
 *
 * Visual tag for market categorization.
 * Displays category icon and label with category-specific colors.
 *
 * @see Design docs/CATEGORY TAGS.md
 */

import { tokens } from '../styles/tokens';

export type MarketCategory =
  | 'politics'
  | 'crypto'
  | 'sports'
  | 'finance'
  | 'tech'
  | 'entertainment'
  | 'science'
  | 'world'
  | 'other';

type TagSize = 'small' | 'default' | 'large';

interface CategoryTagProps {
  /** Market category to display */
  category: MarketCategory;
  /** Tag size variant */
  size?: TagSize;
  /** If true, shows as selected/active */
  active?: boolean;
  /** If provided, tag is clickable */
  onClick?: () => void;
  /** Hide the icon, show only text */
  hideIcon?: boolean;
}

/** Category configuration with icon, label, and color */
const CATEGORY_CONFIG: Record<MarketCategory, { icon: string; label: string; color: string }> = {
  politics: { icon: '🏛️', label: 'Politics', color: '#ff6b35' },
  crypto: { icon: '₿', label: 'Crypto', color: '#f7931a' },
  sports: { icon: '⚽', label: 'Sports', color: '#22c55e' },
  finance: { icon: '📈', label: 'Finance', color: '#3b82f6' },
  tech: { icon: '💻', label: 'Tech', color: '#a855f7' },
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#ec4899' },
  science: { icon: '🔬', label: 'Science', color: '#06b6d4' },
  world: { icon: '🌍', label: 'World', color: '#64748b' },
  other: { icon: '📌', label: 'Other', color: '#6b7280' },
};

/** Size configuration for different tag variants */
const SIZE_CONFIG: Record<TagSize, {
  height: string;
  padding: string;
  fontSize: string;
  iconSize: string;
  gap: string;
}> = {
  small: { height: '20px', padding: '0 8px', fontSize: '10px', iconSize: '11px', gap: '3px' },
  default: { height: '26px', padding: '0 12px', fontSize: '12px', iconSize: '13px', gap: '5px' },
  large: { height: '32px', padding: '0 16px', fontSize: '13px', iconSize: '15px', gap: '6px' },
};

/**
 * CategoryTag component for displaying market category labels.
 */
export function CategoryTag({
  category,
  size = 'small',
  active = false,
  onClick,
  hideIcon = false,
}: CategoryTagProps) {
  const config = CATEGORY_CONFIG[category];
  const sizeConfig = SIZE_CONFIG[size];
  const isClickable = !!onClick;

  return (
    <span
      data-testid={`category-tag-${category}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        height: sizeConfig.height,
        padding: sizeConfig.padding,

        background: active ? config.color : `${config.color}15`,
        border: `1px solid ${active ? config.color : `${config.color}40`}`,
        borderRadius: '4px',

        fontFamily: tokens.fonts.mono,
        fontSize: sizeConfig.fontSize,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: active ? tokens.colors.void : config.color,

        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        userSelect: 'none',

        ...(active && {
          boxShadow: `0 0 15px ${config.color}40`,
        }),
      }}
      onMouseEnter={(e) => {
        if (!active && isClickable) {
          e.currentTarget.style.background = `${config.color}25`;
          e.currentTarget.style.borderColor = `${config.color}60`;
          e.currentTarget.style.boxShadow = `0 0 10px ${config.color}20`;
        }
      }}
      onMouseLeave={(e) => {
        if (!active && isClickable) {
          e.currentTarget.style.background = `${config.color}15`;
          e.currentTarget.style.borderColor = `${config.color}40`;
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {!hideIcon && (
        <span style={{ fontSize: sizeConfig.iconSize, lineHeight: 1 }}>
          {config.icon}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Helper to infer category from market question using keyword matching.
 * Used as fallback when category is not provided by the API.
 *
 * @param question - Market question text
 * @returns Inferred category
 */
export function inferCategory(question: string): MarketCategory {
  const q = question.toLowerCase();

  if (/trump|biden|election|president|congress|senate|governor|vote|democrat|republican/i.test(q)) {
    return 'politics';
  }
  if (/bitcoin|btc|ethereum|eth|crypto|defi|token|blockchain|solana/i.test(q)) {
    return 'crypto';
  }
  if (/nfl|nba|mlb|world cup|championship|playoff|game|match|team|player/i.test(q)) {
    return 'sports';
  }
  if (/stock|fed|rate|inflation|gdp|earnings|ipo|market|s&p|nasdaq/i.test(q)) {
    return 'finance';
  }
  if (/apple|google|microsoft|ai|gpt|launch|iphone|android|startup/i.test(q)) {
    return 'tech';
  }
  if (/oscar|grammy|movie|film|album|award|netflix|disney|celebrity/i.test(q)) {
    return 'entertainment';
  }
  if (/nasa|space|climate|research|study|vaccine|species|discovery/i.test(q)) {
    return 'science';
  }
  if (/war|treaty|country|nation|international|un|nato|summit/i.test(q)) {
    return 'world';
  }

  return 'other';
}
