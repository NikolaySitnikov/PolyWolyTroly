/**
 * Position Types Tests
 *
 * TDD: Tests for position type utilities and conversions.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeCategory,
  toPosition,
  getCategoryConfig,
  sortPositions,
  CATEGORY_CONFIGS,
  type Position,
  type MarketCategory,
} from './position';
import type { PolymarketPosition } from './polymarket';

describe('Position Types', () => {
  describe('normalizeCategory', () => {
    it('should normalize politics categories', () => {
      expect(normalizeCategory('politics')).toBe('politics');
      expect(normalizeCategory('Politics')).toBe('politics');
      expect(normalizeCategory('election')).toBe('politics');
      expect(normalizeCategory('government')).toBe('politics');
    });

    it('should normalize crypto categories', () => {
      expect(normalizeCategory('crypto')).toBe('crypto');
      expect(normalizeCategory('bitcoin')).toBe('crypto');
      expect(normalizeCategory('ethereum')).toBe('crypto');
    });

    it('should normalize sports categories', () => {
      expect(normalizeCategory('sports')).toBe('sports');
      expect(normalizeCategory('nfl')).toBe('sports');
      expect(normalizeCategory('nba')).toBe('sports');
      expect(normalizeCategory('soccer')).toBe('sports');
    });

    it('should normalize finance categories', () => {
      expect(normalizeCategory('finance')).toBe('finance');
      expect(normalizeCategory('stock')).toBe('finance');
      expect(normalizeCategory('market')).toBe('finance');
    });

    it('should normalize tech categories', () => {
      expect(normalizeCategory('tech')).toBe('tech');
      expect(normalizeCategory('ai')).toBe('tech');
      expect(normalizeCategory('software')).toBe('tech');
    });

    it('should normalize entertainment categories', () => {
      expect(normalizeCategory('entertainment')).toBe('entertainment');
      expect(normalizeCategory('movie')).toBe('entertainment');
      expect(normalizeCategory('music')).toBe('entertainment');
    });

    it('should normalize science categories', () => {
      expect(normalizeCategory('science')).toBe('science');
      expect(normalizeCategory('research')).toBe('science');
      expect(normalizeCategory('space')).toBe('science');
    });

    it('should return other for unrecognized categories', () => {
      expect(normalizeCategory('random')).toBe('other');
      expect(normalizeCategory('')).toBe('other');
      expect(normalizeCategory(undefined)).toBe('other');
    });
  });

  describe('CATEGORY_CONFIGS', () => {
    it('should have config for all categories', () => {
      const categories: MarketCategory[] = [
        'politics', 'crypto', 'sports', 'finance',
        'tech', 'entertainment', 'science', 'other'
      ];

      categories.forEach(category => {
        const config = CATEGORY_CONFIGS[category];
        expect(config).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.icon).toBeDefined();
      });
    });

    it('should have unique colors for each category', () => {
      const colors = Object.values(CATEGORY_CONFIGS).map(c => c.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('toPosition', () => {
    // Mock using actual Polymarket API field names
    const mockRawPosition: PolymarketPosition = {
      proxyWallet: '0x123',
      asset: 'asset123',
      conditionId: 'cond123',
      size: 100,
      avgPrice: 0.4,
      initialValue: 40,
      currentValue: 60,
      cashPnl: 20,
      percentPnl: 50,
      totalBought: 100,
      realizedPnl: 0,
      percentRealizedPnl: 0,
      curPrice: 0.6, // Active position has non-zero price
      redeemable: false,
      mergeable: false,
      title: 'Will Trump win the 2024 election?',
      slug: 'will-x-happen',
      icon: '',
      eventId: 'event123',
      eventSlug: 'x-event',
      outcome: 'Yes',
      outcomeIndex: 0,
      oppositeOutcome: 'No',
      oppositeAsset: 'asset456',
      endDate: '2024-12-31T00:00:00Z',
      negativeRisk: false,
    };

    it('should convert raw position to Position with YES outcome', () => {
      const position = toPosition(mockRawPosition);

      expect(position.normalizedOutcome).toBe('YES');
      expect(position.status).toBe('active');
      expect(position.normalizedCategory).toBe('politics');
    });

    it('should convert raw position to Position with NO outcome', () => {
      const raw = { ...mockRawPosition, outcome: 'No' };
      const position = toPosition(raw);

      expect(position.normalizedOutcome).toBe('NO');
    });

    it('should set status to active for active positions', () => {
      const position = toPosition(mockRawPosition);
      expect(position.status).toBe('active');
    });

    it('should set status to resolved for inactive positions (redeemable with future end date)', () => {
      // Use a future end date to get "resolved" status (not "expired")
      const raw = { ...mockRawPosition, curPrice: 0, redeemable: true, endDate: '2099-12-31T00:00:00Z' };
      const position = toPosition(raw);
      expect(position.status).toBe('resolved');
    });

    it('should set status to expired for inactive positions with past end date', () => {
      const raw = {
        ...mockRawPosition,
        curPrice: 0,
        redeemable: true,
        endDate: '2020-01-01T00:00:00Z',
      };
      const position = toPosition(raw);
      expect(position.status).toBe('expired');
    });

    it('should map API fields to aliased fields', () => {
      const position = toPosition(mockRawPosition);

      expect(position.conditionId).toBe('cond123');
      expect(position.title).toBe('Will Trump win the 2024 election?');
      // Aliased fields from raw API
      expect(position.pnl).toBe(20); // from cashPnl
      expect(position.currentPrice).toBe(0.6); // from curPrice
      expect(position.pnlPercent).toBe(50); // from percentPnl
      expect(position.isActive).toBe(true); // computed from curPrice > 0 && !redeemable
      expect(position.category).toBe('Politics'); // extracted from title
    });
  });

  describe('getCategoryConfig', () => {
    it('should return correct config for each category', () => {
      expect(getCategoryConfig('politics')).toBe(CATEGORY_CONFIGS.politics);
      expect(getCategoryConfig('crypto')).toBe(CATEGORY_CONFIGS.crypto);
      expect(getCategoryConfig('other')).toBe(CATEGORY_CONFIGS.other);
    });
  });

  describe('sortPositions', () => {
    const createPosition = (pnl: number, currentValue: number, size: number): Position => ({
      // PolymarketPosition base fields
      proxyWallet: '0x123',
      asset: 'asset',
      conditionId: `cond-${pnl}`,
      size,
      avgPrice: 0.5,
      initialValue: 50,
      currentValue,
      cashPnl: pnl,
      percentPnl: 10,
      totalBought: 100,
      realizedPnl: 0,
      percentRealizedPnl: 0,
      curPrice: 0.6,
      redeemable: false,
      mergeable: false,
      title: 'Test',
      slug: 'test',
      icon: '',
      eventId: 'event123',
      eventSlug: 'test-event',
      outcome: 'Yes',
      outcomeIndex: 0,
      oppositeOutcome: 'No',
      oppositeAsset: 'asset456',
      endDate: '2024-12-31T00:00:00Z',
      negativeRisk: false,
      // Position enhanced fields
      normalizedOutcome: 'YES',
      status: 'active',
      normalizedCategory: 'other',
      // Aliased fields
      currentPrice: 0.6,
      pnl,
      pnlPercent: 10,
      isActive: true,
      category: 'Other',
    });

    const positions: Position[] = [
      createPosition(100, 500, 50),
      createPosition(-50, 200, 100),
      createPosition(200, 300, 25),
    ];

    it('should sort by pnl descending by default', () => {
      const result = sortPositions(positions, 'pnl');
      expect(result[0].pnl).toBe(200);
      expect(result[1].pnl).toBe(100);
      expect(result[2].pnl).toBe(-50);
    });

    it('should sort by pnl ascending', () => {
      const result = sortPositions(positions, 'pnl', 'asc');
      expect(result[0].pnl).toBe(-50);
      expect(result[1].pnl).toBe(100);
      expect(result[2].pnl).toBe(200);
    });

    it('should sort by currentValue', () => {
      const result = sortPositions(positions, 'currentValue');
      expect(result[0].currentValue).toBe(500);
      expect(result[1].currentValue).toBe(300);
      expect(result[2].currentValue).toBe(200);
    });

    it('should sort by size', () => {
      const result = sortPositions(positions, 'size');
      expect(result[0].size).toBe(100);
      expect(result[1].size).toBe(50);
      expect(result[2].size).toBe(25);
    });

    it('should not mutate original array', () => {
      const original = [...positions];
      sortPositions(positions, 'pnl');
      expect(positions).toEqual(original);
    });
  });
});
