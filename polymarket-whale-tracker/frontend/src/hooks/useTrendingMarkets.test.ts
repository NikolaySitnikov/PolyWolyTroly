/**
 * useTrendingMarkets Hook Tests
 *
 * Tests for the trending markets data fetching hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTrendingMarkets } from './useTrendingMarkets';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  fetchTrendingMarkets: vi.fn(),
}));

describe('useTrendingMarkets Hook', () => {
  const mockMarkets = [
    {
      id: 'market-1',
      question: 'Will BTC reach $100k?',
      slug: 'btc-100k',
      yesPrice: 0.65,
      noPrice: 0.35,
      volume24hr: 500000,
      liquidity: 100000,
      endDate: '2025-12-31T00:00:00Z',
      category: 'Crypto',
      active: true,
    },
    {
      id: 'market-2',
      question: 'Will ETH flip BTC?',
      slug: 'eth-flip-btc',
      yesPrice: 0.25,
      noPrice: 0.75,
      volume24hr: 300000,
      liquidity: 80000,
      endDate: '2025-06-30T00:00:00Z',
      category: 'Crypto',
      active: true,
    },
  ];

  const mockResponse = {
    markets: mockMarkets,
    updatedAt: '2025-01-04T12:00:00Z',
  };

  beforeEach(() => {
    vi.mocked(api.fetchTrendingMarkets).mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start with loading state and empty markets', () => {
    const { result } = renderHook(() => useTrendingMarkets());

    expect(result.current.loading).toBe(true);
    expect(result.current.markets).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch markets on mount', async () => {
    const { result } = renderHook(() => useTrendingMarkets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.fetchTrendingMarkets).toHaveBeenCalledWith(8);
    expect(result.current.markets).toHaveLength(2);
    expect(result.current.markets[0].question).toBe('Will BTC reach $100k?');
  });

  it('should use custom limit parameter', async () => {
    const { result } = renderHook(() => useTrendingMarkets(5));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.fetchTrendingMarkets).toHaveBeenCalledWith(5);
  });

  it('should set updatedAt timestamp after successful fetch', async () => {
    const { result } = renderHook(() => useTrendingMarkets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.updatedAt).toBe('2025-01-04T12:00:00Z');
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(api.fetchTrendingMarkets).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTrendingMarkets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.markets).toEqual([]);
  });

  it('should allow manual refetch', async () => {
    const { result } = renderHook(() => useTrendingMarkets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.fetchTrendingMarkets).toHaveBeenCalledTimes(1);

    // Trigger manual refetch
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(api.fetchTrendingMarkets).toHaveBeenCalledTimes(2);
    });
  });

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => useTrendingMarkets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should clear error state on successful refetch', async () => {
    // First call fails
    vi.mocked(api.fetchTrendingMarkets).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTrendingMarkets());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    // Second call succeeds
    vi.mocked(api.fetchTrendingMarkets).mockResolvedValueOnce(mockResponse);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.markets).toHaveLength(2);
    });
  });
});
