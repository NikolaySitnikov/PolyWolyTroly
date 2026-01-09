/**
 * Position Types (Frontend)
 *
 * Enhanced position interface for display in wallet profiles.
 * Extends the base Polymarket position with UI-specific properties.
 */

import type { PolymarketPosition } from './polymarket';
import { inferCategory as inferCategoryFromTitle } from '../components/CategoryTag';

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
    // Fall back to comprehensive title-based inference from CategoryTag
    // This uses the full team databases for accurate detection
    normalizedCategory = inferCategoryFromTitle(raw.title);
    category = normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1);
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

// Note: extractCategory has been replaced by inferCategoryFromTitle from CategoryTag.tsx
// which uses comprehensive team databases for accurate sports detection

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
