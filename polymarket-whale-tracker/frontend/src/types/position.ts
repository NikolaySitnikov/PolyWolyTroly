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
 */
export type PositionStatus = 'active' | 'resolved' | 'expired';

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

  // Position is active if it has a non-zero price and is not redeemable
  const isActive = raw.curPrice > 0 && !raw.redeemable;

  let status: PositionStatus = 'active';
  if (!isActive) {
    status = raw.endDate && new Date(raw.endDate) < new Date() ? 'expired' : 'resolved';
  }

  // Extract category from title (basic heuristic)
  const category = extractCategory(raw.title);
  const normalizedCategory = normalizeCategory(category);

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
 * Extract category from market title using heuristics
 */
function extractCategory(title: string): string {
  if (!title) return 'other';
  const lower = title.toLowerCase();

  if (lower.includes('trump') || lower.includes('biden') || lower.includes('election') ||
      lower.includes('president') || lower.includes('congress') || lower.includes('senate')) {
    return 'Politics';
  }
  if (lower.includes('bitcoin') || lower.includes('btc') || lower.includes('ethereum') ||
      lower.includes('eth') || lower.includes('crypto')) {
    return 'Crypto';
  }
  if (lower.includes('nfl') || lower.includes('nba') || lower.includes('mlb') ||
      lower.includes('super bowl') || lower.includes('world cup') || lower.includes('champions')) {
    return 'Sports';
  }
  if (lower.includes('fed') || lower.includes('rate') || lower.includes('inflation') ||
      lower.includes('gdp') || lower.includes('stock') || lower.includes('s&p')) {
    return 'Finance';
  }
  if (lower.includes('openai') || lower.includes('apple') || lower.includes('google') ||
      lower.includes('microsoft') || lower.includes('ai ') || lower.includes(' ai')) {
    return 'Tech';
  }
  if (lower.includes('movie') || lower.includes('oscar') || lower.includes('grammy') ||
      lower.includes('emmy') || lower.includes('album')) {
    return 'Entertainment';
  }
  if (lower.includes('nasa') || lower.includes('spacex') || lower.includes('rocket') ||
      lower.includes('research') || lower.includes('discovery')) {
    return 'Science';
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
export type PositionSortField = 'pnl' | 'currentValue' | 'size' | 'updatedAt';

/**
 * Sort positions array
 */
export function sortPositions(
  positions: Position[],
  field: PositionSortField,
  direction: 'asc' | 'desc' = 'desc'
): Position[] {
  const sorted = [...positions].sort((a, b) => {
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
      case 'updatedAt':
        aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        break;
      default:
        aVal = a.pnl;
        bVal = b.pnl;
    }

    return direction === 'desc' ? bVal - aVal : aVal - bVal;
  });

  return sorted;
}
