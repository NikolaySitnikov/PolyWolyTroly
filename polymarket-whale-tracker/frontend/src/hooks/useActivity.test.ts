/**
 * useActivity Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useActivity } from './useActivity';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  fetchTradingData: vi.fn(),
}));

const mockTradingData = {
  address: '0x1234567890abcdef',
  metrics: {
    pnl: 1000,
    pnl7d: 500,
    pnl30d: 750,
    winRate: 0.65,
    portfolioValue: 50000,
    activePositions: 5,
    totalTrades: 100,
    lastActivityAt: new Date().toISOString(),
    isLive: true,
  },
  positions: [],
  activity: [
    {
      proxyWallet: '0x1234',
      timestamp: Date.now() - 1000 * 60 * 5, // 5 min ago
      type: 'trade_buy',
      conditionId: '0xabc1',
      title: 'Will BTC hit $100k?',
      slug: 'btc-100k',
      side: 'buy',
      outcome: 'YES',
      size: 100,
      usdcSize: 45,
      price: 0.45,
    },
    {
      proxyWallet: '0x1234',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 min ago
      type: 'trade_sell',
      conditionId: '0xabc2',
      title: 'Will ETH flip BTC?',
      slug: 'eth-flip-btc',
      side: 'sell',
      outcome: 'NO',
      size: 50,
      usdcSize: 25,
      price: 0.50,
    },
    {
      proxyWallet: '0x1234',
      timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
      type: 'usdc_deposit',
      usdcSize: 1000,
    },
    {
      proxyWallet: '0x1234',
      timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
      type: 'usdc_withdrawal',
      usdcSize: 500,
    },
  ],
  profile: null,
  fetchedAt: new Date().toISOString(),
};

describe('useActivity Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingData);
  });

  it('should fetch activity for an address', async () => {
    const { result } = renderHook(() => useActivity('0x1234'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('should return empty activity when address is undefined', async () => {
    const { result } = renderHook(() => useActivity(undefined));

    expect(result.current.activities).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should transform activities correctly', async () => {
    const { result } = renderHook(() => useActivity('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const activity = result.current.activities[0];
    expect(activity).toHaveProperty('normalizedType');
    expect(activity).toHaveProperty('config');
    expect(activity.config).toHaveProperty('icon');
    expect(activity.config).toHaveProperty('color');
  });

  it('should sort activities by timestamp (newest first)', async () => {
    const { result } = renderHook(() => useActivity('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const timestamps = result.current.allActivities.map((a) => a.timestamp);
    const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sortedTimestamps);
  });

  it('should filter activities by type', async () => {
    const { result } = renderHook(() => useActivity('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Filter to trades only
    act(() => {
      result.current.setFilter('trades');
    });

    expect(result.current.allActivities.every((a) =>
      ['buy', 'sell'].includes(a.normalizedType)
    )).toBe(true);
  });

  it('should filter to buys only', async () => {
    const { result } = renderHook(() => useActivity('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('buys');
    });

    expect(result.current.allActivities.every((a) => a.normalizedType === 'buy')).toBe(true);
  });

  it('should filter to sells only', async () => {
    const { result } = renderHook(() => useActivity('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('sells');
    });

    expect(result.current.allActivities.every((a) => a.normalizedType === 'sell')).toBe(true);
  });

  it('should paginate activities correctly', async () => {
    const { result } = renderHook(() =>
      useActivity('0x1234', { pageSize: 2 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities.length).toBe(2);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.hasMore).toBe(true);
  });

  it('should support load more pattern', async () => {
    const { result } = renderHook(() =>
      useActivity('0x1234', { pageSize: 2 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.loadedCount).toBe(2);

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.loadedCount).toBe(4);
  });

  it('should reset page when filter changes', async () => {
    const { result } = renderHook(() =>
      useActivity('0x1234', { pageSize: 2 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);

    act(() => {
      result.current.setFilter('buys');
    });

    expect(result.current.page).toBe(1);
  });

  it('should handle fetch errors', async () => {
    vi.mocked(api.fetchTradingData).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useActivity('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.activities).toEqual([]);
  });

  it('should not fetch when enabled is false', async () => {
    const { result } = renderHook(() =>
      useActivity('0x1234', { enabled: false })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.activities).toEqual([]);
    expect(api.fetchTradingData).not.toHaveBeenCalled();
  });
});
