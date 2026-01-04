/**
 * useApiConnectivity Hook Tests
 *
 * Tests for API connectivity monitoring with auto-retry behavior.
 * When API comes back online, registered callbacks should be invoked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiConnectivity, ApiConnectivityProvider } from './useApiConnectivity';
import * as api from '../services/api';
import type { ReactNode } from 'react';

// Mock the api module
vi.mock('../services/api', () => ({
  fetchHealth: vi.fn(),
}));

const mockFetchHealth = vi.mocked(api.fetchHealth);

// Wrapper component for the hook
const wrapper = ({ children }: { children: ReactNode }) => (
  <ApiConnectivityProvider>{children}</ApiConnectivityProvider>
);

const healthyResponse = {
  status: 'ok',
  timestamp: new Date().toISOString(),
  blockchain: {
    listening: true,
    healthy: true,
    lastHeartbeatTime: null,
    lastEventTime: null,
    startTime: null,
    consecutiveErrors: 0,
  },
};

describe('useApiConnectivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with isConnected=false and become connected after health check succeeds', async () => {
    mockFetchHealth.mockResolvedValue(healthyResponse);

    const { result } = renderHook(() => useApiConnectivity(), { wrapper });

    // Initially not connected
    expect(result.current.isConnected).toBe(false);

    // Wait for the health check to complete
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(mockFetchHealth).toHaveBeenCalled();
  });

  it('should set isConnected=false when API health check fails', async () => {
    mockFetchHealth.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApiConnectivity(), { wrapper });

    // Wait for health check to run
    await waitFor(() => {
      expect(mockFetchHealth).toHaveBeenCalled();
    });

    // Should remain disconnected
    expect(result.current.isConnected).toBe(false);
  });

  it('should invoke onReconnect callback when API recovers from disconnected state', async () => {
    const onReconnect = vi.fn();

    // Start with API down
    mockFetchHealth.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApiConnectivity(), { wrapper });

    // Register callback
    act(() => {
      result.current.onReconnect(onReconnect);
    });

    // Wait for initial failed check
    await waitFor(() => {
      expect(mockFetchHealth).toHaveBeenCalled();
    });
    expect(result.current.isConnected).toBe(false);
    expect(onReconnect).not.toHaveBeenCalled();

    // Now API recovers
    mockFetchHealth.mockResolvedValue(healthyResponse);

    // Wait for reconnection
    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 3000 }
    );

    // Callback should have been called
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('should NOT invoke onReconnect on initial connection', async () => {
    const onReconnect = vi.fn();

    // API is up from the start
    mockFetchHealth.mockResolvedValue(healthyResponse);

    const { result } = renderHook(() => useApiConnectivity(), { wrapper });

    act(() => {
      result.current.onReconnect(onReconnect);
    });

    // Wait for successful connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // This is initial connection, not reconnection - callback should NOT fire
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it('should support multiple onReconnect callbacks', async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    // Start down
    mockFetchHealth.mockRejectedValue(new Error('down'));

    const { result } = renderHook(() => useApiConnectivity(), { wrapper });

    act(() => {
      result.current.onReconnect(callback1);
      result.current.onReconnect(callback2);
    });

    // Wait for initial failed check
    await waitFor(() => {
      expect(mockFetchHealth).toHaveBeenCalled();
    });

    // API recovers
    mockFetchHealth.mockResolvedValue(healthyResponse);

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('should cleanup callback via returned function', async () => {
    const callback = vi.fn();

    mockFetchHealth.mockRejectedValue(new Error('down'));

    const { result } = renderHook(() => useApiConnectivity(), { wrapper });

    let cleanup: () => void;
    act(() => {
      cleanup = result.current.onReconnect(callback);
    });

    // Wait for initial failed check
    await waitFor(() => {
      expect(mockFetchHealth).toHaveBeenCalled();
    });

    // Cleanup the callback
    act(() => {
      cleanup();
    });

    // API recovers
    mockFetchHealth.mockResolvedValue(healthyResponse);

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 3000 }
    );

    // Callback should NOT have been called since it was cleaned up
    expect(callback).not.toHaveBeenCalled();
  });

  it('should trigger reconnect only when transitioning from disconnected to connected', async () => {
    const onReconnect = vi.fn();

    // API is up from the start
    mockFetchHealth.mockResolvedValue(healthyResponse);

    const { result } = renderHook(() => useApiConnectivity(), { wrapper });

    act(() => {
      result.current.onReconnect(onReconnect);
    });

    // Wait for initial connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Initial connection - no callback
    expect(onReconnect).not.toHaveBeenCalled();

    // Simulate disconnect
    mockFetchHealth.mockRejectedValue(new Error('down'));

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(false);
      },
      { timeout: 5000 }
    );

    // Simulate reconnect
    mockFetchHealth.mockResolvedValue(healthyResponse);

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 3000 }
    );

    // NOW it's a reconnection - callback should fire
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});
