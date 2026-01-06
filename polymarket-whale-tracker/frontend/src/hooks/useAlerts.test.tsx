/**
 * useAlerts Hook Tests
 *
 * TDD: RED phase - Writing tests for the alerts hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAlerts } from './useAlerts';

// Mock the API
vi.mock('../services/api', () => ({
  fetchDeposits: vi.fn(),
}));

import { fetchDeposits } from '../services/api';

describe('useAlerts', () => {
  const mockDeposits = {
    deposits: [
      {
        id: '1',
        wallet_address: '0x1234567890123456789012345678901234567890',
        amount: '50000',
        tx_hash: '0xabc123',
        created_at: '2024-01-15T10:30:00Z',
      },
      {
        id: '2',
        wallet_address: '0x0987654321098765432109876543210987654321',
        amount: '25000',
        tx_hash: '0xdef456',
        created_at: '2024-01-15T10:25:00Z',
      },
    ],
    total: 100,
    page: 1,
    limit: 50,
  };

  beforeEach(() => {
    vi.mocked(fetchDeposits).mockResolvedValue(mockDeposits);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useAlerts());
    expect(result.current.loading).toBe(true);
  });

  it('should fetch deposits on mount', async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Called with page, limit, walletAddress (undefined), minAmount (undefined), sortBy, sortDir
    expect(fetchDeposits).toHaveBeenCalledWith(1, 20, undefined, undefined, 'created_at', 'desc');
  });

  it('should transform deposits to alerts', async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.alerts[0]).toEqual({
      id: '0xabc123',
      type: 'deposit',
      walletAddress: '0x1234567890123456789012345678901234567890',
      amount: 50000,
      timestamp: '2024-01-15T10:30:00Z',
      txHash: '0xabc123',
    });
  });

  it('should handle API errors', async () => {
    vi.mocked(fetchDeposits).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.alerts).toHaveLength(0);
  });

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Reset mock and call refetch
    vi.mocked(fetchDeposits).mockClear();
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(fetchDeposits).toHaveBeenCalledTimes(1);
    });
  });

  it('should add new alert without triggering loading state', async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.alerts.length;

    // Add a new alert via WebSocket simulation
    act(() => {
      result.current.addAlert({
        id: '0xnew789',
        type: 'deposit',
        walletAddress: '0xnewwallet',
        amount: 75000,
        timestamp: new Date().toISOString(),
        txHash: '0xnew789',
      });
    });

    // Should have one more alert
    expect(result.current.alerts).toHaveLength(initialCount + 1);
    // New alert should be first (most recent)
    expect(result.current.alerts[0].id).toBe('0xnew789');
    // Should not be loading
    expect(result.current.loading).toBe(false);
  });

  it('should not add duplicate alerts', async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.alerts.length;

    // Try to add an alert with existing ID
    act(() => {
      result.current.addAlert({
        id: '0xabc123', // Same as first mock deposit
        type: 'deposit',
        walletAddress: '0x1234567890123456789012345678901234567890',
        amount: 50000,
        timestamp: '2024-01-15T10:30:00Z',
        txHash: '0xabc123',
      });
    });

    // Count should be the same
    expect(result.current.alerts).toHaveLength(initialCount);
  });

  it('should return total count from API', async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.total).toBe(100);
  });
});
