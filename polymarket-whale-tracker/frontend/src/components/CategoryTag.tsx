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

/** Valid category values for validation */
export const VALID_CATEGORIES: MarketCategory[] = [
  'politics', 'crypto', 'sports', 'finance', 'tech',
  'entertainment', 'science', 'world', 'other'
];

/**
 * Map Polymarket API tag labels to our category system.
 * Polymarket uses tags like "Politics", "Sports", "Crypto", etc.
 * Returns null if no mapping found (caller should use inferCategory as fallback).
 *
 * @see https://docs.polymarket.com/api-reference/tags/list-tags
 */
export function mapApiCategory(apiCategory: string | undefined): MarketCategory | null {
  if (!apiCategory) return null;

  const normalized = apiCategory.toLowerCase().trim();

  // Direct matches to our categories
  if (VALID_CATEGORIES.includes(normalized as MarketCategory) && normalized !== 'other') {
    return normalized as MarketCategory;
  }

  // Map common Polymarket tags to our categories
  const tagMappings: Record<string, MarketCategory> = {
    // Politics
    'politics': 'politics',
    'elections': 'politics',
    'us politics': 'politics',
    'trump': 'politics',
    'biden': 'politics',
    'government': 'politics',

    // Crypto
    'crypto': 'crypto',
    'cryptocurrency': 'crypto',
    'bitcoin': 'crypto',
    'ethereum': 'crypto',
    'defi': 'crypto',

    // Sports
    'sports': 'sports',
    'nba': 'sports',
    'nfl': 'sports',
    'mlb': 'sports',
    'nhl': 'sports',
    'soccer': 'sports',
    'football': 'sports',
    'basketball': 'sports',
    'baseball': 'sports',
    'ufc': 'sports',
    'boxing': 'sports',
    'f1': 'sports',
    'formula 1': 'sports',
    'tennis': 'sports',
    'golf': 'sports',

    // Finance
    'finance': 'finance',
    'business': 'finance',
    'economics': 'finance',
    'fed': 'finance',
    'markets': 'finance',
    'stocks': 'finance',

    // Tech
    'tech': 'tech',
    'technology': 'tech',
    'ai': 'tech',
    'artificial intelligence': 'tech',

    // Entertainment
    'entertainment': 'entertainment',
    'pop culture': 'entertainment',
    'movies': 'entertainment',
    'music': 'entertainment',
    'tv': 'entertainment',
    'television': 'entertainment',
    'celebrities': 'entertainment',
    'awards': 'entertainment',

    // Science
    'science': 'science',
    'space': 'science',
    'weather': 'science',
    'health': 'science',
    'medicine': 'science',

    // World
    'world': 'world',
    'geopolitics': 'world',
    'international': 'world',
    'global': 'world',
    'war': 'world',
    'conflict': 'world',
  };

  return tagMappings[normalized] || null;
}

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

  // Politics - elections, politicians, government
  if (/trump|biden|election|president|congress|senate|governor|vote|democrat|republican|nominee|cabinet|administration/i.test(q)) {
    return 'politics';
  }
  // Crypto - cryptocurrencies and blockchain
  if (/bitcoin|btc|ethereum|eth|crypto|defi|blockchain|solana|altcoin/i.test(q)) {
    return 'crypto';
  }
  // Sports - leagues, teams, athletes, competitions
  if (/nfl|nba|mlb|nhl|world cup|championship|playoff|game|match|team|player|finals|super bowl|lakers|pacers|yankees|cowboys/i.test(q)) {
    return 'sports';
  }
  // Finance - markets, rates, economic indicators
  if (/stock|fed\b|interest rate|inflation|gdp|earnings|ipo|s&p|nasdaq|dow|treasury|bond|bps/i.test(q)) {
    return 'finance';
  }
  // Tech - companies, products, AI
  if (/apple|google|microsoft|ai\b|gpt|openai|iphone|android|startup|meta|amazon|tesla/i.test(q)) {
    return 'tech';
  }
  // Entertainment - shows, movies, music, awards
  if (/oscar|grammy|movie|film|album|award|netflix|disney|celebrity|stranger things|season|episode|emmy|golden globe/i.test(q)) {
    return 'entertainment';
  }
  // Science - research, space, health
  if (/nasa|space|climate|research|study|vaccine|species|discovery|spacex|mars|moon/i.test(q)) {
    return 'science';
  }
  // World - geopolitics, conflicts, international affairs
  if (/war|treaty|country|nation|international|un\b|nato|summit|invade|military|custody|venezuela|ukraine|russia|china|iran|israel/i.test(q)) {
    return 'world';
  }

  return 'other';
}
