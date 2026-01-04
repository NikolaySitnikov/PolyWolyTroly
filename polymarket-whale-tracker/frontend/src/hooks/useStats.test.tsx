/**
 * useStats Hook Tests
 *
 * TDD: RED phase - Tests for the hook that fetches and manages stats data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStats } from './useStats';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api');

describe('useStats Hook', () => {
  const mockStats: api.StatsResponse = {
    whaleCount: 42,
    whaleCountTrend: 20,
    totalVolume: 15750000,
    totalVolumeTrend: 8.62,
    alertsToday: 12,
    newWhalesThisWeek: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should return loading true initially', () => {
      vi.mocked(api.fetchStats).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useStats());

      expect(result.current.loading).toBe(true);
    });

    it('should return null data initially', () => {
      vi.mocked(api.fetchStats).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useStats());

      expect(result.current.data).toBeNull();
    });

    it('should return null error initially', () => {
      vi.mocked(api.fetchStats).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useStats());

      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful Fetch', () => {
    it('should set loading to false after fetch completes', async () => {
      vi.mocked(api.fetchStats).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set data after successful fetch', async () => {
      vi.mocked(api.fetchStats).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useStats());

      await waitFor(() => {
        expect(result.current.data).toEqual(mockStats);
      });
    });

    it('should keep error null after successful fetch', async () => {
      vi.mocked(api.fetchStats).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Failed Fetch', () => {
    it('should set error message on failure', async () => {
      vi.mocked(api.fetchStats).mockRejectedValueOnce(
        new Error('Failed to fetch stats: 500')
      );

      const { result } = renderHook(() => useStats());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch stats: 500');
      });
    });

    it('should set loading to false on failure', async () => {
      vi.mocked(api.fetchStats).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should keep data null on failure', async () => {
      vi.mocked(api.fetchStats).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('Refetch', () => {
    it('should provide a refetch function', async () => {
      vi.mocked(api.fetchStats).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch data when refetch is called', async () => {
      vi.mocked(api.fetchStats).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear mock to track new calls
      vi.mocked(api.fetchStats).mockClear();
      vi.mocked(api.fetchStats).mockResolvedValueOnce({
        ...mockStats,
        whaleCount: 50,
        whaleCountTrend: 25,
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(api.fetchStats).toHaveBeenCalledTimes(1);
      });
    });
  });
});
