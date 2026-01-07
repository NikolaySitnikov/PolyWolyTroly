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
}

/**
 * Convert raw Polymarket position to UI Position
 */
export function toPosition(raw: PolymarketPosition): Position {
  const normalizedOutcome: PositionOutcome =
    raw.outcome?.toUpperCase() === 'YES' ? 'YES' : 'NO';

  let status: PositionStatus = 'active';
  if (!raw.isActive) {
    status = raw.endDate && new Date(raw.endDate) < new Date() ? 'expired' : 'resolved';
  }

  const normalizedCategory = normalizeCategory(raw.category);

  return {
    ...raw,
    normalizedOutcome,
    status,
    normalizedCategory,
  };
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
