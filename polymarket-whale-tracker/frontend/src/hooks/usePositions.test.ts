/**
 * usePositions Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePositions } from './usePositions';
import * as api from '../services/api';
import { mockTradingDataResponse, mockPolymarketPosition, mockTradingMetrics } from '../test/mockFactories';

// Mock the API module
vi.mock('../services/api', () => ({
  fetchTradingData: vi.fn(),
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
    lastActivityAt: new Date().toISOString(),
    isLive: true,
  }),
  positions: [
    mockPolymarketPosition({
      conditionId: '0xabc1',
      asset: 'token1',
      outcomeIndex: 0,
      outcome: 'YES',
      title: 'Will BTC hit $100k?',
      slug: 'btc-100k',
      eventSlug: 'btc-100k-event',
      size: 1000,
      avgPrice: 0.45,
      curPrice: 0.55,
      initialValue: 450,
      currentValue: 550,
      cashPnl: 100,
      percentPnl: 22.2,
    }),
    mockPolymarketPosition({
      conditionId: '0xabc2',
      asset: 'token2',
      outcomeIndex: 1,
      outcome: 'NO',
      title: 'Will ETH flip BTC?',
      slug: 'eth-flip-btc',
      eventSlug: 'eth-flip-btc-event',
      size: 500,
      avgPrice: 0.30,
      curPrice: 0.25,
      initialValue: 150,
      currentValue: 125,
      cashPnl: -25,
      percentPnl: -16.7,
    }),
    mockPolymarketPosition({
      conditionId: '0xabc3',
      asset: 'token3',
      outcomeIndex: 0,
      outcome: 'YES',
      title: 'Resolved market',
      slug: 'resolved-market',
      eventSlug: 'resolved-market-event',
      size: 200,
      avgPrice: 0.50,
      curPrice: 1.00,
      initialValue: 100,
      currentValue: 200,
      cashPnl: 100,
      percentPnl: 100,
      redeemable: true,
    }),
  ],
  activity: [],
  profile: null,
});

describe('usePositions Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingData);
  });

  it('should fetch positions for an address', async () => {
    const { result } = renderHook(() => usePositions('0x1234'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.positions.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('should return empty positions when address is undefined', async () => {
    const { result } = renderHook(() => usePositions(undefined));

    expect(result.current.positions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should transform positions correctly', async () => {
    const { result } = renderHook(() => usePositions('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const position = result.current.positions[0];
    expect(position).toHaveProperty('normalizedOutcome');
    expect(position).toHaveProperty('status');
    expect(position).toHaveProperty('normalizedCategory');
  });

  it('should filter active only positions', async () => {
    const { result } = renderHook(() =>
      usePositions('0x1234', { activeOnly: true })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should only have 2 active positions (not the resolved one)
    expect(result.current.total).toBe(2);
    expect(result.current.positions.every((p) => p.status === 'active')).toBe(true);
  });

  it('should paginate positions correctly', async () => {
    const { result } = renderHook(() =>
      usePositions('0x1234', { pageSize: 2 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.positions.length).toBe(2);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.hasMore).toBe(true);

    // Go to page 2
    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.positions.length).toBe(1);
    expect(result.current.hasMore).toBe(false);
  });

  it('should sort positions by pnl by default', async () => {
    const { result } = renderHook(() => usePositions('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Default sort is pnl desc (highest first)
    const pnlValues = result.current.allPositions.map((p) => p.pnl);
    const sortedPnl = [...pnlValues].sort((a, b) => b - a);
    expect(pnlValues).toEqual(sortedPnl);
  });

  it('should allow changing sort field', async () => {
    const { result } = renderHook(() => usePositions('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSortBy('currentValue');
    });

    const values = result.current.allPositions.map((p) => p.currentValue);
    const sortedValues = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sortedValues);
  });

  it('should handle fetch errors', async () => {
    vi.mocked(api.fetchTradingData).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => usePositions('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.positions).toEqual([]);
  });

  it('should reset page when address changes', async () => {
    const { result, rerender } = renderHook(
      ({ address }) => usePositions(address, { pageSize: 2 }),
      { initialProps: { address: '0x1234' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);

    // Change address
    rerender({ address: '0xabcd' });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
    });
  });

  it('should not fetch when enabled is false', async () => {
    const { result } = renderHook(() =>
      usePositions('0x1234', { enabled: false })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.positions).toEqual([]);
    expect(api.fetchTradingData).not.toHaveBeenCalled();
  });
});
