/**
 * useWalletCluster Hook
 *
 * React hook for fetching wallet cluster membership information.
 * Used to display cluster context in wallet detail views.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWalletCluster, fetchCluster } from '../services/api';
import type { ClusterSummary, ClusterRelationship, ClusterDetails } from '../types/detection';

interface UseWalletClusterResult {
  cluster: ClusterSummary | null;
  relationships: ClusterRelationship[];
  loading: boolean;
  error: string | null;
  notInCluster: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch cluster membership for a specific wallet
 */
export function useWalletCluster(walletAddress: string | null): UseWalletClusterResult {
  const [cluster, setCluster] = useState<ClusterSummary | null>(null);
  const [relationships, setRelationships] = useState<ClusterRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notInCluster, setNotInCluster] = useState(false);

  const fetchData = useCallback(async () => {
    if (!walletAddress) {
      setCluster(null);
      setRelationships([]);
      setLoading(false);
      setError(null);
      setNotInCluster(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotInCluster(false);

    try {
      const data = await fetchWalletCluster(walletAddress);
      // Convert WalletClusterResponse to ClusterSummary
      const clusterSummary: ClusterSummary = {
        clusterId: data.clusterId,
        wallets: data.wallets,
        walletCount: data.walletCount,
        avgStrength: data.avgStrength,
        dominantRelationship: data.dominantRelationship,
      };
      setCluster(clusterSummary);

      // Fetch detailed cluster info to get relationships
      try {
        const details = await fetchCluster(data.clusterId);
        setRelationships(details.relationships || []);
      } catch {
        // If we can't get details, just leave relationships empty
        setRelationships([]);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('not part of any cluster')) {
        setNotInCluster(true);
        setCluster(null);
        setRelationships([]);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    cluster,
    relationships,
    loading,
    error,
    notInCluster,
    refetch: fetchData,
  };
}

interface UseClusterDetailsResult {
  cluster: ClusterDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch detailed information about a specific cluster
 */
export function useClusterDetails(clusterId: string | null): UseClusterDetailsResult {
  const [cluster, setCluster] = useState<ClusterDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clusterId) {
      setCluster(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCluster(clusterId);
      setCluster(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    cluster,
    loading,
    error,
    refetch: fetchData,
  };
}
