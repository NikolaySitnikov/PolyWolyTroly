/**
 * useProfile Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfile } from './useProfile';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  fetchTradingData: vi.fn(),
}));

const mockTradingDataWithProfile = {
  address: '0x1234567890abcdef',
  metrics: {
    pnl: 1000,
    pnl7d: 500,
    pnl30d: 750,
    winRate: 0.65,
    portfolioValue: 50000,
    activePositions: 5,
    totalTrades: 100,
    lastActivityAt: new Date().toISOString(),
    isLive: true,
  },
  positions: [],
  activity: [],
  profile: {
    address: '0x1234567890abcdef',
    name: 'CryptoWhale',
    pseudonym: 'whale_king',
    profileImage: 'https://example.com/avatar.png',
    profileImageOptimized: 'https://example.com/avatar-optimized.png',
    verified: true,
    twitterHandle: 'cryptowhale',
    bio: 'Professional trader',
  },
  fetchedAt: new Date().toISOString(),
};

const mockTradingDataWithoutProfile = {
  ...mockTradingDataWithProfile,
  profile: null,
};

describe('useProfile Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch profile for an address', async () => {
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingDataWithProfile);

    const { result } = renderHook(() => useProfile('0x1234'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).not.toBeNull();
    expect(result.current.profile?.name).toBe('CryptoWhale');
    expect(result.current.error).toBeNull();
  });

  it('should return null profile when address is undefined', async () => {
    const { result } = renderHook(() => useProfile(undefined));

    expect(result.current.profile).toBeNull();
    expect(result.current.hasProfile).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('should handle missing profile gracefully', async () => {
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingDataWithoutProfile);

    const { result } = renderHook(() => useProfile('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.hasProfile).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set hasProfile correctly', async () => {
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingDataWithProfile);

    const { result } = renderHook(() => useProfile('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasProfile).toBe(true);
  });

  it('should include all profile fields', async () => {
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingDataWithProfile);

    const { result } = renderHook(() => useProfile('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const profile = result.current.profile;
    expect(profile?.name).toBe('CryptoWhale');
    expect(profile?.pseudonym).toBe('whale_king');
    expect(profile?.profileImage).toBe('https://example.com/avatar.png');
    expect(profile?.verified).toBe(true);
    expect(profile?.twitterHandle).toBe('cryptowhale');
    expect(profile?.bio).toBe('Professional trader');
  });

  it('should handle fetch errors', async () => {
    vi.mocked(api.fetchTradingData).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useProfile('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.profile).toBeNull();
  });

  it('should refetch when refetch is called', async () => {
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingDataWithProfile);

    const { result } = renderHook(() => useProfile('0x1234'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.fetchTradingData).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(api.fetchTradingData).toHaveBeenCalledTimes(2);
    });
  });

  it('should not fetch when enabled is false', async () => {
    const { result } = renderHook(() =>
      useProfile('0x1234', { enabled: false })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.profile).toBeNull();
    expect(api.fetchTradingData).not.toHaveBeenCalled();
  });

  it('should update when address changes', async () => {
    vi.mocked(api.fetchTradingData).mockResolvedValue(mockTradingDataWithProfile);

    const { result, rerender } = renderHook(
      ({ address }) => useProfile(address),
      { initialProps: { address: '0x1234' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.fetchTradingData).toHaveBeenCalledTimes(1);

    rerender({ address: '0xabcd' });

    await waitFor(() => {
      expect(api.fetchTradingData).toHaveBeenCalledTimes(2);
    });
  });
});
