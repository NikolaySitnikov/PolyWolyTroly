/**
 * API Service Tests
 *
 * TDD: Tests for the API client that connects to the backend.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, fetchStats, fetchTradingData, type StatsResponse, type TradingDataResponse } from './api';

describe('API Service', () => {
  const mockStats: StatsResponse = {
    whaleCount: 42,
    totalVolume: 15750000,
    alertsToday: 12,
    newWhalesToday: 5,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('api object', () => {
    it('should have a baseUrl property', () => {
      expect(api.baseUrl).toBeDefined();
      expect(typeof api.baseUrl).toBe('string');
    });

    it('should have a valid baseUrl (localhost or configured)', () => {
      // baseUrl can be localhost:3002 or a configured VITE_API_URL
      expect(api.baseUrl).toMatch(/^https?:\/\/.+:\d+$/);
    });
  });

  describe('fetchStats', () => {
    it('should fetch stats from /api/stats endpoint', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      await fetchStats();

      expect(fetch).toHaveBeenCalledWith(`${api.baseUrl}/api/stats`);
    });

    it('should return stats data on success', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await fetchStats();

      expect(result).toEqual(mockStats);
    });

    it('should throw an error when response is not ok', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchStats()).rejects.toThrow('Failed to fetch stats: 500');
    });

    it('should throw an error when network fails', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(fetchStats()).rejects.toThrow('Network error');
    });
  });

  describe('fetchTradingData', () => {
    const mockTradingData: TradingDataResponse = {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      metrics: {
        pnl: 5000,
        pnl7d: 1000,
        pnl30d: 3000,
        winRate: 65.5,
        portfolioValue: 50000,
        activePositions: 10,
        totalTrades: 25,
        lastActivityAt: '2024-01-05T12:00:00Z',
        isLive: true,
      },
      positions: [],
      activity: [],
      profile: null,
      fetchedAt: '2024-01-05T12:30:00Z',
    };

    it('should fetch trading data from /api/wallets/:address/trading endpoint', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTradingData,
      });

      await fetchTradingData(address);

      expect(fetch).toHaveBeenCalledWith(`${api.baseUrl}/api/wallets/${address}/trading`);
    });

    it('should return trading data on success', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTradingData,
      });

      const result = await fetchTradingData(address);

      expect(result).toEqual(mockTradingData);
    });

    it('should throw an error when response is not ok', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(fetchTradingData(address)).rejects.toThrow('Failed to fetch trading data: 404');
    });

    it('should throw an error when network fails', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(fetchTradingData(address)).rejects.toThrow('Network error');
    });

    it('should normalize address to lowercase', async () => {
      const address = '0x1234ABCD1234ABCD1234ABCD1234ABCD1234ABCD';
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTradingData,
      });

      await fetchTradingData(address);

      expect(fetch).toHaveBeenCalledWith(
        `${api.baseUrl}/api/wallets/${address.toLowerCase()}/trading`
      );
    });
  });
});
