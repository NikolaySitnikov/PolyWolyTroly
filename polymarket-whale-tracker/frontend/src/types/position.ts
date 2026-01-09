/**
 * Position Types (Frontend)
 *
 * Enhanced position interface for display in wallet profiles.
 * Extends the base Polymarket position with UI-specific properties.
 */

import type { PolymarketPosition } from './polymarket';

/**
 * Position outcome type
 */
export type PositionOutcome = 'YES' | 'NO';

/**
 * Position status
 * - active: Market is live, position can still be traded
 * - redeemable: Market resolved, position can be redeemed for winnings
 */
export type PositionStatus = 'active' | 'redeemable';

/**
 * Market category for visual styling
 */
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

/**
 * Category display configuration for UI
 */
export interface CategoryConfig {
  label: string;
  color: string;
  icon: string;
}

/**
 * Category configurations for display
 */
export const CATEGORY_CONFIGS: Record<MarketCategory, CategoryConfig> = {
  politics: { label: 'Politics', color: '#ff6b35', icon: '🏛️' },
  crypto: { label: 'Crypto', color: '#f7931a', icon: '₿' },
  sports: { label: 'Sports', color: '#22c55e', icon: '⚽' },
  finance: { label: 'Finance', color: '#3b82f6', icon: '📈' },
  tech: { label: 'Tech', color: '#a855f7', icon: '💻' },
  entertainment: { label: 'Entertainment', color: '#ec4899', icon: '🎬' },
  science: { label: 'Science', color: '#06b6d4', icon: '🔬' },
  world: { label: 'World', color: '#64748b', icon: '🌍' },
  other: { label: 'Other', color: '#6b7280', icon: '📊' },
} as const;

/**
 * Enhanced position for UI display
 * Adds computed properties and UI helpers
 */
export interface Position extends PolymarketPosition {
  /** Normalized outcome (YES/NO) */
  normalizedOutcome: PositionOutcome;
  /** Current status */
  status: PositionStatus;
  /** Normalized category */
  normalizedCategory: MarketCategory;
  /** Price history for sparkline (optional) */
  priceHistory?: number[];
  // Aliased fields for component compatibility
  /** Current price (alias for curPrice) */
  currentPrice: number;
  /** P&L (alias for cashPnl) */
  pnl: number;
  /** P&L percent (alias for percentPnl) */
  pnlPercent: number;
  /** Whether position is active (computed from curPrice/redeemable) */
  isActive: boolean;
  /** Market category (extracted from title) */
  category: string;
}

/**
 * Convert raw Polymarket position to UI Position
 */
export function toPosition(raw: PolymarketPosition): Position {
  const normalizedOutcome: PositionOutcome =
    raw.outcome?.toUpperCase() === 'YES' ? 'YES' : 'NO';

  // Position is active if it's not redeemable (market still live)
  // Position is redeemable if the market has resolved and can be claimed
  const isActive = !raw.redeemable;
  const status: PositionStatus = raw.redeemable ? 'redeemable' : 'active';

  // Determine category: use sportsMarketType if available (from Gamma API enrichment),
  // otherwise fall back to title-based extraction
  let category: string;
  let normalizedCategory: MarketCategory;

  if (raw.sportsMarketType) {
    // If sportsMarketType is present, it's definitely a sports market
    category = 'Sports';
    normalizedCategory = 'sports';
  } else {
    // Fall back to title-based extraction
    category = extractCategory(raw.title);
    normalizedCategory = normalizeCategory(category);
  }

  return {
    ...raw,
    normalizedOutcome,
    status,
    normalizedCategory,
    // Aliased fields for component compatibility
    currentPrice: raw.curPrice,
    pnl: raw.cashPnl,
    pnlPercent: raw.percentPnl,
    isActive,
    category,
  };
}

/**
 * Extract category from market title using heuristics.
 * Uses comprehensive pattern matching to detect sports betting markets.
 */
function extractCategory(title: string): string {
  if (!title) return 'other';
  const lower = title.toLowerCase();

  // Politics - elections, politicians, government
  if (/trump|biden|election|president|congress|senate|governor|vote|democrat|republican|nominee|cabinet|administration/i.test(lower)) {
    return 'Politics';
  }

  // Crypto - cryptocurrencies and blockchain
  if (/bitcoin|btc|ethereum|eth\b|crypto|defi|blockchain|solana|altcoin/i.test(lower)) {
    return 'Crypto';
  }

  // Sports - comprehensive detection for betting markets
  // Includes: leagues, teams, betting patterns (vs., O/U, Spread), game outcomes
  if (/nfl|nba|mlb|nhl|mls|ufc|pga|atp|wta|epl|world cup|championship|playoff|game\b|match|team|player|finals|super bowl|premier league|la liga|bundesliga|serie a|ligue 1|champions league/i.test(lower)) {
    return 'Sports';
  }
  // Sports betting patterns: "vs." matchups, over/under, spreads, win predictions
  if (/\bvs\.?\b|\bversus\b|\bo\/u\b|over\/under|spread|\bwin on\b|\bwin\s+\d|moneyline/i.test(lower)) {
    return 'Sports';
  }
  // Sports team names (NBA, NFL, Soccer, etc.)
  if (/mavericks|jazz|lakers|celtics|warriors|bulls|heat|nets|knicks|76ers|suns|bucks|nuggets|clippers|rockets|spurs|pistons|pacers|hawks|hornets|wizards|magic|raptors|grizzlies|pelicans|kings|thunder|timberwolves|blazers|cavaliers/i.test(lower)) {
    return 'Sports';
  }
  if (/cowboys|eagles|chiefs|49ers|patriots|packers|bills|ravens|bengals|dolphins|lions|jets|broncos|chargers|raiders|steelers|saints|buccaneers|panthers|falcons|vikings|seahawks|cardinals|commanders|bears|browns|texans|colts|jaguars|titans/i.test(lower)) {
    return 'Sports';
  }
  if (/arsenal|chelsea|liverpool|manchester|tottenham|barcelona|real madrid|juventus|bayern|psg|inter milan|ac milan|dortmund|atletico/i.test(lower)) {
    return 'Sports';
  }
  // Generic sports keywords
  if (/soccer|football|basketball|baseball|hockey|tennis|golf|boxing|mma|cricket|rugby|racing|formula|nascar/i.test(lower)) {
    return 'Sports';
  }

  // Finance - markets, rates, economic indicators
  if (/stock|fed\b|interest rate|inflation|gdp|earnings|ipo|s&p|nasdaq|dow|treasury|bond|bps/i.test(lower)) {
    return 'Finance';
  }

  // Tech - companies, products, AI
  if (/openai|apple|google|microsoft|ai\b|gpt|iphone|android|startup|meta|amazon|tesla/i.test(lower)) {
    return 'Tech';
  }

  // Entertainment - shows, movies, music, awards
  if (/movie|oscar|grammy|emmy|golden globe|film|album|award|netflix|disney|celebrity|season|episode/i.test(lower)) {
    return 'Entertainment';
  }

  // Science - research, space, health
  if (/nasa|spacex|space|climate|research|study|vaccine|species|discovery|mars|moon|rocket/i.test(lower)) {
    return 'Science';
  }

  // World - geopolitics, conflicts, international affairs
  if (/war|treaty|country|nation|international|un\b|nato|summit|invade|military|venezuela|ukraine|russia|china\b|iran|israel/i.test(lower)) {
    return 'World';
  }

  return 'Other';
}

/**
 * Normalize category string to MarketCategory
 */
export function normalizeCategory(category?: string): MarketCategory {
  if (!category) return 'other';

  const lower = category.toLowerCase();

  if (lower.includes('politic') || lower.includes('election') || lower.includes('government')) {
    return 'politics';
  }
  if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('ethereum')) {
    return 'crypto';
  }
  if (lower.includes('sport') || lower.includes('nfl') || lower.includes('nba') || lower.includes('soccer')) {
    return 'sports';
  }
  if (lower.includes('finance') || lower.includes('stock') || lower.includes('market')) {
    return 'finance';
  }
  // Check entertainment BEFORE tech (entertainment contains 'ai')
  if (lower.includes('entertainment') || lower.includes('movie') || lower.includes('music')) {
    return 'entertainment';
  }
  // Use word boundary-like checks for 'ai' to avoid false positives
  if (lower.includes('tech') || lower === 'ai' || lower.includes(' ai') || lower.includes('ai ') || lower.includes('software')) {
    return 'tech';
  }
  if (lower.includes('science') || lower.includes('research') || lower.includes('space')) {
    return 'science';
  }
  if (lower.includes('world') || lower.includes('international') || lower.includes('geopolitic')) {
    return 'world';
  }

  return 'other';
}

/**
 * Get category config for display
 */
export function getCategoryConfig(category: MarketCategory): CategoryConfig {
  return CATEGORY_CONFIGS[category];
}

/**
 * Sort positions by various criteria
 */
export type PositionSortField = 'pnl' | 'currentValue' | 'size' | 'title';

/**
 * Sort positions array
 */
export function sortPositions(
  positions: Position[],
  field: PositionSortField,
  direction: 'asc' | 'desc' = 'desc'
): Position[] {
  const sorted = [...positions].sort((a, b) => {
    // Handle title sorting (alphabetical)
    // For title: desc (↓) = A to Z, asc (↑) = Z to A
    if (field === 'title') {
      const aTitle = a.title?.toLowerCase() || '';
      const bTitle = b.title?.toLowerCase() || '';
      const comparison = aTitle.localeCompare(bTitle);
      return direction === 'desc' ? comparison : -comparison;
    }

    // Numeric sorting for other fields
    let aVal: number;
    let bVal: number;

    switch (field) {
      case 'pnl':
        aVal = a.pnl;
        bVal = b.pnl;
        break;
      case 'currentValue':
        aVal = a.currentValue;
        bVal = b.currentValue;
        break;
      case 'size':
        aVal = a.size;
        bVal = b.size;
        break;
      default:
        aVal = a.pnl;
        bVal = b.pnl;
    }

    return direction === 'desc' ? bVal - aVal : aVal - bVal;
  });

  return sorted;
}
