/**
 * usePolymarketTrading Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePolymarketTrading } from './usePolymarketTrading';
import * as api from '../services/api';
import { mockTradingDataResponse, mockPolymarketPosition, mockPolymarketActivity, mockPolymarketProfile, mockTradingMetrics } from '../test/mockFactories';

// Mock the API module
vi.mock('../services/api', () => ({
  fetchTradingData: vi.fn(),
  getWebSocketUrl: vi.fn(() => 'ws://localhost:3002'),
}));

const mockTradingData = mockTradingDataResponse({
  address: '0x1234567890abcdef',
  metrics: mockTradingMetrics({
    pnl: 1000,
    pnl7d: 500,
    pnl30d: 750,
    winRate: 0.65,
    portfolioValue: 50000,
    activePositions: 5,
    totalTrades: 100,
    isLive: true,
  }),
  positions: [
    mockPolymarketPosition({
      conditionId: '0xabc1',
      title: 'Will BTC hit $100k?',
      slug: 'btc-100k',
      eventSlug: 'btc-100k-event',
      outcome: 'Yes',
      cashPnl: 100,
      percentPnl: 22.2,
    }),
    mockPolymarketPosition({
      conditionId: '0xabc2',
      title: 'Resolved market',
      slug: 'resolved',
      eventSlug: 'resolved-event',
      outcome: 'No',
      cashPnl: 350,
      percentPnl: 233,
      curPrice: 1.0,
      redeemable: true,
    }),
  ],
  activity: [
    mockPolymarketActivity({
      type: 'trade_buy',
      conditionId: '0xabc1',
      title: 'Will BTC hit $100k?',
      slug: 'btc-100k',
    }),
  ],
  profile: mockPolymarketProfile({
    name: 'CryptoWhale',
    pseudonym: 'whale_king',
    twitterHandle: 'cryptowhale',
    verifiedBadge: true,
  }),
});

describe('usePolymarketTrading Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingData);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch all trading data for an address', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).not.toBeNull();
    expect(result.current.positions.length).toBeGreaterThan(0);
    expect(result.current.activity.length).toBeGreaterThan(0);
    expect(result.current.profile).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return empty data when address is undefined', async () => {
    const { result } = renderHook(() => usePolymarketTrading(undefined));

    expect(result.current.metrics).toBeNull();
    expect(result.current.positions).toEqual([]);
    expect(result.current.activity).toEqual([]);
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should return trading metrics', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics?.pnl).toBe(1000);
    expect(result.current.metrics?.pnl7d).toBe(500);
    expect(result.current.metrics?.pnl30d).toBe(750);
    expect(result.current.metrics?.winRate).toBe(0.65);
    expect(result.current.metrics?.portfolioValue).toBe(50000);
  });

  it('should get P&L for different time windows', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getPnl('7d')).toBe(500);
    expect(result.current.getPnl('30d')).toBe(750);
    expect(result.current.getPnl('all')).toBe(1000);
  });

  it('should return isLive status', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isLive).toBe(true);
  });

  it('should count active positions correctly', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activePositionsCount).toBe(1);
    expect(result.current.totalPositionsCount).toBe(2);
  });

  it('should transform positions and activities', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Positions should be transformed
    expect(result.current.positions[0]).toHaveProperty('normalizedOutcome');
    expect(result.current.positions[0]).toHaveProperty('status');
    expect(result.current.positions[0]).toHaveProperty('normalizedCategory');

    // Activities should be transformed
    expect(result.current.activity[0]).toHaveProperty('normalizedType');
    expect(result.current.activity[0]).toHaveProperty('config');
  });

  it('should include fetchedAt timestamp', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fetchedAt).not.toBeNull();
  });

  it('should handle fetch errors', async () => {
    vi.useRealTimers();
    vi.mocked(api.fetchTradingData).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.metrics).toBeNull();
  });

  it('should refetch when refetch is called', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePolymarketTrading('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = vi.mocked(api.fetchTradingData).mock.calls.length;

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(api.fetchTradingData).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  it('should not fetch when enabled is false', async () => {
    const { result } = renderHook(() =>
      usePolymarketTrading('0x1234', { enabled: false })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.metrics).toBeNull();
    expect(api.fetchTradingData).not.toHaveBeenCalled();
  });

  it('should support refetch interval', async () => {
    renderHook(() =>
      usePolymarketTrading('0x1234', { refetchInterval: 5000 })
    );

    // Wait for initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const initialCallCount = vi.mocked(api.fetchTradingData).mock.calls.length;

    // Advance time by 5 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(api.fetchTradingData).toHaveBeenCalledTimes(initialCallCount + 1);

    // Advance time by another 5 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(api.fetchTradingData).toHaveBeenCalledTimes(initialCallCount + 2);
  });

  it('should clean up interval on unmount', async () => {
    const { unmount } = renderHook(() =>
      usePolymarketTrading('0x1234', { refetchInterval: 5000 })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const callCountBeforeUnmount = vi.mocked(api.fetchTradingData).mock.calls.length;

    unmount();

    // Advance time - should not trigger more fetches
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(api.fetchTradingData).toHaveBeenCalledTimes(callCountBeforeUnmount);
  });
});
