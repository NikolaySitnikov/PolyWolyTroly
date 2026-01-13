/**
 * useWalletRisk Hook
 *
 * React hook for fetching wallet risk profile from the detection system.
 * Handles loading, error, and data states with automatic fetch on address change.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWalletRisk } from '../services/api';
import type { WalletRiskProfile } from '../types/detection';

interface UseWalletRiskResult {
  profile: WalletRiskProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWalletRisk(address: string | null): UseWalletRiskResult {
  const [profile, setProfile] = useState<WalletRiskProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (!address) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (isInitialLoad.current) {
      setLoading(true);
    }

    try {
      const data = await fetchWalletRisk(address);
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProfile(null);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [address]);

  useEffect(() => {
    isInitialLoad.current = true;
    fetchData();
  }, [fetchData]);

  return {
    profile,
    loading,
    error,
    refetch: fetchData,
  };
}
