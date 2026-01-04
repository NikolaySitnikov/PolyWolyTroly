/**
 * API Service Tests
 *
 * TDD: RED phase - Tests for the API client that connects to the backend.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, fetchStats, type StatsResponse } from './api';

describe('API Service', () => {
  const mockStats: StatsResponse = {
    whaleCount: 42,
    totalVolume: 15750000,
    alertsToday: 12,
    newWhalesThisWeek: 5,
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
});
