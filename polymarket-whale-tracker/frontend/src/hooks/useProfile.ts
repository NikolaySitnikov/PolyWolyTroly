/**
 * useProfile Hook
 *
 * Fetches Polymarket Gamma API profile for a wallet address.
 * Handles missing profiles gracefully (returns null).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTradingData } from '../services/api';
import type { UserProfile } from '../types/profile';

interface UseProfileOptions {
  /** Auto-fetch on mount */
  enabled?: boolean;
}

interface UseProfileResult {
  /** User profile data (null if not found) */
  profile: UserProfile | null;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether the profile exists */
  hasProfile: boolean;
  /** Refetch profile */
  refetch: () => void;
}

export function useProfile(
  address: string | undefined,
  options: UseProfileOptions = {}
): UseProfileResult {
  const { enabled = true } = options;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedAddressRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!address || !enabled) {
      setProfile(null);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchTradingData(address);

      if (controller.signal.aborted) return;

      // Profile may be null if not found on Gamma API
      setProfile(data.profile);
      fetchedAddressRef.current = address;
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      // Don't treat missing profile as error
      if (err instanceof Error && err.message.includes('404')) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      setLoading(false);
    }
  }, [address, enabled]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    profile,
    loading,
    error,
    hasProfile: profile !== null,
    refetch: fetchData,
  };
}
