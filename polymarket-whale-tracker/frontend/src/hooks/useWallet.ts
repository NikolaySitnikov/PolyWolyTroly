/**
 * useWallet Hook
 *
 * Fetches and manages data for a single wallet profile.
 * Includes wallet info and paginated deposit history.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWallet, fetchDeposits, type WalletApiResponse, type DepositApiResponse } from '../services/api';

export interface WalletData {
  address: string;
  firstSeenAt: string;
  totalDeposited: number;
  depositCount: number;
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

  const loadWallet = useCallback(async () => {
    if (!address) {
      setWallet(null);
      setDeposits([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walletData = await fetchWallet(address);
      setWallet(transformWallet(walletData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  const loadDeposits = useCallback(async () => {
    if (!address) {
      setDeposits([]);
      return;
    }

    setDepositsLoading(true);

    try {
      const result = await fetchDeposits(depositsPage, depositsPerPage, address);
      setDeposits(result.deposits.map(transformDeposit));
      setDepositsTotal(result.total);
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
