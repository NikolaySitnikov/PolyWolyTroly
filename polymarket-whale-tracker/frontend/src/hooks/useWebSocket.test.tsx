/**
 * useWebSocket Hook Tests
 *
 * TDD: RED phase - Tests for WebSocket connection that receives instant updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  readyState: number = 0; // CONNECTING

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 0);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  // Helper to simulate receiving a message
  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  // Helper to simulate error
  simulateError() {
    this.onerror?.(new Event('error'));
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Connection', () => {
    it('should connect to WebSocket server on mount', async () => {
      renderHook(() => useWebSocket('ws://localhost:3002'));

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBe(1);
        expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3002');
      });
    });

    it('should return connected true when WebSocket opens', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3002'));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });

    it('should close WebSocket on unmount', async () => {
      const { unmount } = renderHook(() => useWebSocket('ws://localhost:3002'));

      await waitFor(() => {
        expect(MockWebSocket.instances[0].readyState).toBe(1);
      });

      unmount();

      expect(MockWebSocket.instances[0].readyState).toBe(3);
    });
  });

  describe('Message Handling', () => {
    it('should call onStats when stats_update message received', async () => {
      const onStats = vi.fn();
      renderHook(() => useWebSocket('ws://localhost:3002', { onStats }));

      await waitFor(() => {
        expect(MockWebSocket.instances[0].readyState).toBe(1);
      });

      act(() => {
        MockWebSocket.instances[0].simulateMessage({
          type: 'stats_update',
          data: { whaleCount: 50, totalVolume: 2000000, alertsToday: 15, newWhalesToday: 8 }
        });
      });

      expect(onStats).toHaveBeenCalledWith({
        whaleCount: 50,
        totalVolume: 2000000,
        alertsToday: 15,
        newWhalesToday: 8
      });
    });

    it('should call onDeposit when new_deposit message received', async () => {
      const onDeposit = vi.fn();
      renderHook(() => useWebSocket('ws://localhost:3002', { onDeposit }));

      await waitFor(() => {
        expect(MockWebSocket.instances[0].readyState).toBe(1);
      });

      const depositData = {
        walletAddress: '0x1234',
        amount: 50000,
        txHash: '0xabc',
        isNewWallet: true
      };

      act(() => {
        MockWebSocket.instances[0].simulateMessage({
          type: 'new_deposit',
          data: depositData
        });
      });

      expect(onDeposit).toHaveBeenCalledWith(depositData);
    });

    it('should ignore unknown message types', async () => {
      const onStats = vi.fn();
      const onDeposit = vi.fn();
      renderHook(() => useWebSocket('ws://localhost:3002', { onStats, onDeposit }));

      await waitFor(() => {
        expect(MockWebSocket.instances[0].readyState).toBe(1);
      });

      act(() => {
        MockWebSocket.instances[0].simulateMessage({
          type: 'unknown_type',
          data: {}
        });
      });

      expect(onStats).not.toHaveBeenCalled();
      expect(onDeposit).not.toHaveBeenCalled();
    });
  });

  describe('Reconnection', () => {
    it('should set connected to false on close', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3002'));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      act(() => {
        MockWebSocket.instances[0].close();
      });

      expect(result.current.connected).toBe(false);
    });
  });
});
