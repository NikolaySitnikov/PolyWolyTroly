/**
 * useWhales Hook Tests
 *
 * TDD: RED phase - Tests for the hook that fetches whale data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWhales } from './useWhales';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api');

describe('useWhales Hook', () => {
  const mockWalletsResponse = {
    wallets: [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        first_seen_at: '2026-01-01T00:00:00.000Z',
        first_deposit_amount: '50000',
        first_deposit_tx: '0xabc',
        total_deposited: '150000',
        deposit_count: 5,
        is_notified: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        first_seen_at: '2026-01-02T00:00:00.000Z',
        first_deposit_amount: '25000',
        first_deposit_tx: '0xdef',
        total_deposited: '75000',
        deposit_count: 3,
        is_notified: true,
        created_at: '2026-01-02T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      },
    ],
    total: 2,
    page: 1,
    limit: 20,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should return loading true initially', () => {
      vi.mocked(api.fetchWhales).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useWhales());

      expect(result.current.loading).toBe(true);
    });

    it('should return empty whales array initially', () => {
      vi.mocked(api.fetchWhales).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useWhales());

      expect(result.current.whales).toEqual([]);
    });

    it('should return null error initially', () => {
      vi.mocked(api.fetchWhales).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useWhales());

      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful Fetch', () => {
    it('should set loading to false after fetch completes', async () => {
      vi.mocked(api.fetchWhales).mockResolvedValueOnce(mockWalletsResponse);

      const { result } = renderHook(() => useWhales());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should transform API response to Whale objects', async () => {
      vi.mocked(api.fetchWhales).mockResolvedValueOnce(mockWalletsResponse);

      const { result } = renderHook(() => useWhales());

      await waitFor(() => {
        expect(result.current.whales).toHaveLength(2);
        expect(result.current.whales[0]).toEqual({
          address: '0x1234567890abcdef1234567890abcdef12345678',
          firstSeenAt: '2026-01-01T00:00:00.000Z',
          totalDeposited: 150000,
          depositCount: 5,
        });
      });
    });

    it('should return total count from API', async () => {
      vi.mocked(api.fetchWhales).mockResolvedValueOnce(mockWalletsResponse);

      const { result } = renderHook(() => useWhales());

      await waitFor(() => {
        expect(result.current.total).toBe(2);
      });
    });
  });

  describe('Failed Fetch', () => {
    it('should set error message on failure', async () => {
      vi.mocked(api.fetchWhales).mockRejectedValueOnce(
        new Error('Failed to fetch wallets: 500')
      );

      const { result } = renderHook(() => useWhales());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch wallets: 500');
      });
    });

    it('should set loading to false on failure', async () => {
      vi.mocked(api.fetchWhales).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useWhales());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Pagination', () => {
    it('should return current page', async () => {
      vi.mocked(api.fetchWhales).mockResolvedValueOnce(mockWalletsResponse);

      const { result } = renderHook(() => useWhales());

      await waitFor(() => {
        expect(result.current.page).toBe(1);
      });
    });

    it('should provide setPage function', async () => {
      vi.mocked(api.fetchWhales).mockResolvedValue(mockWalletsResponse);

      const { result } = renderHook(() => useWhales());

      await waitFor(() => {
        expect(typeof result.current.setPage).toBe('function');
      });
    });
  });

  describe('Refetch', () => {
    it('should provide a refetch function', async () => {
      vi.mocked(api.fetchWhales).mockResolvedValueOnce(mockWalletsResponse);

      const { result } = renderHook(() => useWhales());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
