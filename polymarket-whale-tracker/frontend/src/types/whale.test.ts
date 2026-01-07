/**
 * Whale Types Tests
 *
 * TDD: Tests for whale type utilities and enhancements.
 */

import { describe, it, expect } from 'vitest';
import type {
  Whale,
  WhaleWithTrading,
  WhaleSortField,
  WhaleFilterOption,
} from './whale';
import {
  isWhaleWithTrading,
  getPnlForTimeWindow,
  WHALE_FILTER_OPTIONS,
  TRADING_SORT_FIELDS,
} from './whale';

describe('Whale Types', () => {
  describe('WhaleWithTrading interface', () => {
    it('should extend Whale with trading fields', () => {
      const whale: WhaleWithTrading = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        firstSeenAt: '2024-01-01T00:00:00Z',
        totalDeposited: 100000,
        depositCount: 5,
        // Trading fields
        pnl: 5000,
        pnl7d: 1000,
        pnl30d: 3000,
        winRate: 65.5,
        portfolioValue: 50000,
        totalTrades: 25,
        lastActivityAt: '2024-01-05T12:00:00Z',
        isLive: true,
      };

      expect(whale.pnl).toBe(5000);
      expect(whale.winRate).toBe(65.5);
      expect(whale.isLive).toBe(true);
    });
  });

  describe('isWhaleWithTrading', () => {
    it('should return true for whale with trading data', () => {
      const whale: WhaleWithTrading = {
        address: '0x123',
        firstSeenAt: '2024-01-01',
        totalDeposited: 100000,
        depositCount: 5,
        pnl: 5000,
        pnl7d: 1000,
        pnl30d: 3000,
        winRate: 65,
        portfolioValue: 50000,
        totalTrades: 25,
        lastActivityAt: '2024-01-05',
        isLive: true,
      };

      expect(isWhaleWithTrading(whale)).toBe(true);
    });

    it('should return false for basic whale without trading data', () => {
      const whale: Whale = {
        address: '0x123',
        firstSeenAt: '2024-01-01',
        totalDeposited: 100000,
        depositCount: 5,
      };

      expect(isWhaleWithTrading(whale)).toBe(false);
    });
  });

  describe('getPnlForTimeWindow', () => {
    const whale: WhaleWithTrading = {
      address: '0x123',
      firstSeenAt: '2024-01-01',
      totalDeposited: 100000,
      depositCount: 5,
      pnl: 5000,
      pnl7d: 1000,
      pnl30d: 3000,
      winRate: 65,
      portfolioValue: 50000,
      totalTrades: 25,
      lastActivityAt: null,
      isLive: false,
    };

    it('should return pnl7d for 7d window', () => {
      expect(getPnlForTimeWindow(whale, '7d')).toBe(1000);
    });

    it('should return pnl30d for 30d window', () => {
      expect(getPnlForTimeWindow(whale, '30d')).toBe(3000);
    });

    it('should return total pnl for all window', () => {
      expect(getPnlForTimeWindow(whale, 'all')).toBe(5000);
    });
  });

  describe('WHALE_FILTER_OPTIONS', () => {
    it('should have all required filter options', () => {
      const options: WhaleFilterOption[] = ['all', 'profitable', 'losing', 'live'];
      options.forEach(option => {
        expect(WHALE_FILTER_OPTIONS[option]).toBeDefined();
        expect(WHALE_FILTER_OPTIONS[option].label).toBeDefined();
      });
    });

    it('should have correct labels', () => {
      expect(WHALE_FILTER_OPTIONS.all.label).toBe('All');
      expect(WHALE_FILTER_OPTIONS.profitable.label).toBe('Profitable');
      expect(WHALE_FILTER_OPTIONS.losing.label).toBe('Losing');
      expect(WHALE_FILTER_OPTIONS.live.label).toBe('Live');
    });
  });

  describe('TRADING_SORT_FIELDS', () => {
    it('should include new trading sort fields', () => {
      const fields: WhaleSortField[] = ['pnl', 'winRate', 'portfolioValue', 'lastActivityAt'];
      fields.forEach(field => {
        expect(TRADING_SORT_FIELDS).toContain(field);
      });
    });

    it('should include original sort fields', () => {
      const fields: WhaleSortField[] = ['totalDeposited', 'depositCount', 'firstSeenAt'];
      fields.forEach(field => {
        expect(TRADING_SORT_FIELDS).toContain(field);
      });
    });
  });
});
