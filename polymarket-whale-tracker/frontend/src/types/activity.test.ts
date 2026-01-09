/**
 * Activity Types Tests
 *
 * TDD: Tests for activity type utilities and conversions.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeActivityType,
  toActivity,
  getActivityConfig,
  filterActivities,
  sortActivitiesByTime,
  ACTIVITY_TYPE_CONFIGS,
  type Activity,
  type ActivityType,
} from './activity';
import type { PolymarketActivity } from './polymarket';

describe('Activity Types', () => {
  describe('normalizeActivityType', () => {
    it('should normalize deposit types', () => {
      expect(normalizeActivityType('deposit')).toBe('deposit');
      expect(normalizeActivityType('DEPOSIT')).toBe('deposit');
      expect(normalizeActivityType('usdc_deposit')).toBe('deposit');
    });

    it('should normalize withdrawal types', () => {
      expect(normalizeActivityType('withdrawal')).toBe('withdrawal');
      expect(normalizeActivityType('WITHDRAWAL')).toBe('withdrawal');
      expect(normalizeActivityType('usdc_withdrawal')).toBe('withdrawal');
    });

    it('should normalize buy types', () => {
      expect(normalizeActivityType('buy')).toBe('buy');
      expect(normalizeActivityType('trade_buy')).toBe('buy');
      expect(normalizeActivityType('market_buy')).toBe('buy');
    });

    it('should normalize sell types', () => {
      expect(normalizeActivityType('sell')).toBe('sell');
      expect(normalizeActivityType('trade_sell')).toBe('sell');
      expect(normalizeActivityType('market_sell')).toBe('sell');
    });

    it('should normalize redeem types', () => {
      expect(normalizeActivityType('redeem')).toBe('redeem');
      expect(normalizeActivityType('redemption')).toBe('redeem');
    });

    it('should normalize claim types', () => {
      expect(normalizeActivityType('claim')).toBe('claim');
      expect(normalizeActivityType('reward_claim')).toBe('claim');
    });

    it('should normalize transfer types', () => {
      expect(normalizeActivityType('transfer')).toBe('transfer');
    });

    it('should return unknown for unrecognized types', () => {
      expect(normalizeActivityType('random')).toBe('unknown');
      expect(normalizeActivityType('')).toBe('unknown');
      expect(normalizeActivityType(undefined)).toBe('unknown');
    });

    it('should normalize TRADE type based on side field', () => {
      expect(normalizeActivityType('TRADE', 'BUY')).toBe('buy');
      expect(normalizeActivityType('TRADE', 'SELL')).toBe('sell');
      expect(normalizeActivityType('trade', 'buy')).toBe('buy');
      expect(normalizeActivityType('trade', 'sell')).toBe('sell');
    });

    it('should return unknown for TRADE without valid side', () => {
      expect(normalizeActivityType('TRADE')).toBe('unknown');
      expect(normalizeActivityType('TRADE', '')).toBe('unknown');
      expect(normalizeActivityType('TRADE', 'invalid')).toBe('unknown');
    });
  });

  describe('ACTIVITY_TYPE_CONFIGS', () => {
    it('should have config for all activity types', () => {
      const types: ActivityType[] = [
        'deposit', 'withdrawal', 'buy', 'sell',
        'redeem', 'claim', 'transfer', 'unknown'
      ];

      types.forEach(type => {
        const config = ACTIVITY_TYPE_CONFIGS[type];
        expect(config).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.bgColor).toBeDefined();
      });
    });

    it('should have distinct colors for buy vs sell', () => {
      expect(ACTIVITY_TYPE_CONFIGS.buy.color).not.toBe(ACTIVITY_TYPE_CONFIGS.sell.color);
    });

    it('should have distinct colors for deposit vs withdrawal', () => {
      expect(ACTIVITY_TYPE_CONFIGS.deposit.color).not.toBe(ACTIVITY_TYPE_CONFIGS.withdrawal.color);
    });
  });

  describe('toActivity', () => {
    it('should convert raw Polymarket activity to Activity', () => {
      const raw: PolymarketActivity = {
        proxyWallet: '0x123',
        timestamp: 1704067200000, // Already in milliseconds
        type: 'buy',
        conditionId: 'cond123',
        title: 'Will X happen?',
        slug: 'will-x-happen',
        side: 'BUY',
        outcome: 'YES',
        size: 100,
        usdcSize: 50,
        price: 0.5,
        transactionHash: '0xabc',
        fee: 0.1,
      };

      const activity = toActivity(raw);

      expect(activity.normalizedType).toBe('buy');
      expect(activity.config).toBe(ACTIVITY_TYPE_CONFIGS.buy);
      expect(activity.proxyWallet).toBe('0x123');
      expect(activity.timestamp).toBe(1704067200000);
    });

    it('should convert timestamp from seconds to milliseconds', () => {
      const raw: PolymarketActivity = {
        proxyWallet: '0x123',
        timestamp: 1704067200, // Unix seconds
        type: 'buy',
        side: 'BUY',
      };

      const activity = toActivity(raw);

      // Should be converted to milliseconds
      expect(activity.timestamp).toBe(1704067200000);
    });

    it('should handle TRADE type with side field', () => {
      const raw: PolymarketActivity = {
        proxyWallet: '0x123',
        timestamp: 1704067200,
        type: 'TRADE',
        side: 'BUY',
      };

      const activity = toActivity(raw);

      expect(activity.normalizedType).toBe('buy');
      expect(activity.config).toBe(ACTIVITY_TYPE_CONFIGS.buy);
    });

    it('should handle unknown types gracefully', () => {
      const raw: PolymarketActivity = {
        proxyWallet: '0x123',
        timestamp: 1704067200,
        type: 'some_new_type',
      };

      const activity = toActivity(raw);

      expect(activity.normalizedType).toBe('unknown');
      expect(activity.config).toBe(ACTIVITY_TYPE_CONFIGS.unknown);
    });
  });

  describe('getActivityConfig', () => {
    it('should return correct config for each type', () => {
      expect(getActivityConfig('buy')).toBe(ACTIVITY_TYPE_CONFIGS.buy);
      expect(getActivityConfig('sell')).toBe(ACTIVITY_TYPE_CONFIGS.sell);
      expect(getActivityConfig('deposit')).toBe(ACTIVITY_TYPE_CONFIGS.deposit);
    });
  });

  describe('filterActivities', () => {
    const mockActivities: Activity[] = [
      { proxyWallet: '0x1', timestamp: 1, type: 'buy', normalizedType: 'buy', config: ACTIVITY_TYPE_CONFIGS.buy },
      { proxyWallet: '0x2', timestamp: 2, type: 'sell', normalizedType: 'sell', config: ACTIVITY_TYPE_CONFIGS.sell },
      { proxyWallet: '0x3', timestamp: 3, type: 'deposit', normalizedType: 'deposit', config: ACTIVITY_TYPE_CONFIGS.deposit },
      { proxyWallet: '0x4', timestamp: 4, type: 'withdrawal', normalizedType: 'withdrawal', config: ACTIVITY_TYPE_CONFIGS.withdrawal },
    ];

    it('should return all activities for "all" filter', () => {
      const result = filterActivities(mockActivities, 'all');
      expect(result).toHaveLength(4);
    });

    it('should filter to trades only', () => {
      const result = filterActivities(mockActivities, 'trades');
      expect(result).toHaveLength(2);
      expect(result.every(a => a.normalizedType === 'buy' || a.normalizedType === 'sell')).toBe(true);
    });

    it('should filter to deposits only', () => {
      const result = filterActivities(mockActivities, 'deposits');
      expect(result).toHaveLength(2);
      expect(result.every(a => a.normalizedType === 'deposit' || a.normalizedType === 'withdrawal')).toBe(true);
    });

    it('should filter to buys only', () => {
      const result = filterActivities(mockActivities, 'buys');
      expect(result).toHaveLength(1);
      expect(result[0].normalizedType).toBe('buy');
    });

    it('should filter to sells only', () => {
      const result = filterActivities(mockActivities, 'sells');
      expect(result).toHaveLength(1);
      expect(result[0].normalizedType).toBe('sell');
    });
  });

  describe('sortActivitiesByTime', () => {
    const mockActivities: Activity[] = [
      { proxyWallet: '0x1', timestamp: 100, type: 'buy', normalizedType: 'buy', config: ACTIVITY_TYPE_CONFIGS.buy },
      { proxyWallet: '0x2', timestamp: 300, type: 'sell', normalizedType: 'sell', config: ACTIVITY_TYPE_CONFIGS.sell },
      { proxyWallet: '0x3', timestamp: 200, type: 'deposit', normalizedType: 'deposit', config: ACTIVITY_TYPE_CONFIGS.deposit },
    ];

    it('should sort descending by default (most recent first)', () => {
      const result = sortActivitiesByTime(mockActivities);
      expect(result[0].timestamp).toBe(300);
      expect(result[1].timestamp).toBe(200);
      expect(result[2].timestamp).toBe(100);
    });

    it('should sort ascending when specified', () => {
      const result = sortActivitiesByTime(mockActivities, 'asc');
      expect(result[0].timestamp).toBe(100);
      expect(result[1].timestamp).toBe(200);
      expect(result[2].timestamp).toBe(300);
    });

    it('should not mutate original array', () => {
      const original = [...mockActivities];
      sortActivitiesByTime(mockActivities, 'desc');
      expect(mockActivities).toEqual(original);
    });
  });
});
