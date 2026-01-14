/**
 * useWallet Hook
 *
 * Fetches and manages data for a single wallet profile.
 * Includes wallet info and paginated deposit history.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWallet, fetchDeposits, type WalletApiResponse, type DepositApiResponse } from '../services/api';
import type { WalletSource } from '../types/whale';

export interface WalletData {
  address: string;
  firstSeenAt: string;
  totalDeposited: number;
  depositCount: number;
  source?: WalletSource;
}

export interface WalletDeposit {
  id: string;
  amount: number;
  txHash: string;
  createdAt: string;
}

interface UseWalletResult {
  wallet: WalletData | null;
  deposits: WalletDeposit[];
  loading: boolean;
  error: string | null;
  depositsLoading: boolean;
  depositsTotal: number;
  depositsPage: number;
  setDepositsPage: (page: number) => void;
  refetch: () => void;
}

/**
 * Transform API wallet response to frontend format
 */
function transformWallet(raw: WalletApiResponse): WalletData {
  return {
    address: raw.address,
    firstSeenAt: raw.first_seen_at,
    totalDeposited: parseFloat(raw.total_deposited),
    depositCount: raw.deposit_count,
    source: raw.source,
  };
}

/**
 * Transform API deposit response to frontend format
 */
function transformDeposit(raw: DepositApiResponse): WalletDeposit {
  return {
    id: raw.id,
    amount: parseFloat(raw.amount),
    txHash: raw.tx_hash,
    createdAt: raw.created_at,
  };
}

export function useWallet(address: string | null, depositsPerPage = 10): UseWalletResult {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [deposits, setDeposits] = useState<WalletDeposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [depositsTotal, setDepositsTotal] = useState(0);
  const [depositsPage, setDepositsPage] = useState(1);

  // Track if we have ever loaded a wallet (for seamless navigation)
  const hasLoadedRef = useRef(false);
  // Track if we're in an error state (for showing loading on retry)
  const hasErrorRef = useRef(false);

  const loadWallet = useCallback(async () => {
    if (!address) {
      setWallet(null);
      setDeposits([]);
      setError(null);
      hasLoadedRef.current = false;
      hasErrorRef.current = false;
      return;
    }

    // Only show loading state on first load or when recovering from error
    // This enables seamless transitions when navigating between whales
    // but ensures proper loading state when retrying after failures
    if (!hasLoadedRef.current || hasErrorRef.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const walletData = await fetchWallet(address);
      setWallet(transformWallet(walletData));
      hasLoadedRef.current = true;
      hasErrorRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
      hasErrorRef.current = true;
      // Only clear wallet on initial load error
      if (!hasLoadedRef.current) {
        setWallet(null);
      }
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Track if we've loaded deposits before (to avoid showing loading on page change)
  const hasLoadedDepositsRef = useRef(false);

  const loadDeposits = useCallback(async () => {
    if (!address) {
      setDeposits([]);
      hasLoadedDepositsRef.current = false;
      return;
    }

    // Only show loading state on first load - keep old data visible during pagination
    if (!hasLoadedDepositsRef.current) {
      setDepositsLoading(true);
    }

    try {
      const result = await fetchDeposits(depositsPage, depositsPerPage, address);
      setDeposits(result.deposits.map(transformDeposit));
      setDepositsTotal(result.total);
      hasLoadedDepositsRef.current = true;
    } catch (err) {
      console.error('Failed to load deposits:', err);
    } finally {
      setDepositsLoading(false);
    }
  }, [address, depositsPage, depositsPerPage]);

  // Load wallet on address change
  useEffect(() => {
    loadWallet();
    setDepositsPage(1); // Reset to first page when address changes
    hasLoadedDepositsRef.current = false; // Reset deposits loaded state
  }, [loadWallet]);

  // Load deposits when address or page changes
  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  const refetch = useCallback(() => {
    loadWallet();
    loadDeposits();
  }, [loadWallet, loadDeposits]);

  return {
    wallet,
    deposits,
    loading,
    error,
    depositsLoading,
    depositsTotal,
    depositsPage,
    setDepositsPage,
    refetch,
  };
}
