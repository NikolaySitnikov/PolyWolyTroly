import { db } from "./database.js";
import { cache } from "./cache.js";
import { polymarketApi } from "./polymarketApi.js";
import { historicalDeposits } from "./historicalDeposits.js";

export const walletTracker = {
  /**
   * Determine if a wallet is "new" to Polymarket
   * A wallet is considered new if:
   * 1. Not in our Redis cache
   * 2. Not in our database
   * 3. Has no historical activity on Polymarket (via API)
   */
  async isNewWallet(address: string): Promise<boolean> {
    // First check Redis cache (fast path)
    const inCache = await cache.isWalletSeen(address);
    if (inCache) {
      return false;
    }

    // Check our database
    const inDb = await db.walletExists(address);
    if (inDb) {
      // Add to cache for future lookups
      await cache.markWalletSeen(address);
      return false;
    }

    // Check Polymarket API for historical activity
    const hasHistory = await polymarketApi.hasHistoricalActivity(address);
    if (hasHistory) {
      // Mark as seen so we don't hit the API again
      await cache.markWalletSeen(address);
      return false;
    }

    // Wallet is truly new to Polymarket!
    return true;
  },

  /**
   * Record a new wallet and its first deposit
   */
  async recordNewWallet(
    address: string,
    depositAmount: number,
    txHash: string
  ): Promise<void> {
    // Add to database
    await db.createWallet(address, depositAmount, txHash);

    // Add to cache
    await cache.markWalletSeen(address);
  },

  /**
   * Ensure a wallet exists in the database with full historical deposit data.
   * Fetches historical deposits from Polygonscan and bulk inserts them.
   */
  async ensureWalletExistsWithHistory(
    address: string,
    currentDepositAmount: number,
    currentTxHash: string
  ): Promise<void> {
    const exists = await db.walletExists(address);
    if (exists) {
      return;
    }

    // Fetch historical deposits from blockchain via RPC
    let deposits: Awaited<ReturnType<typeof historicalDeposits.getHistoricalDeposits>> = [];
    try {
      deposits = await historicalDeposits.getHistoricalDeposits(address);
    } catch (error) {
      console.error(`Failed to fetch historical deposits for ${address}:`, error);
      // Fall through to use empty array
    }

    if (deposits.length > 0) {
      // Use bulk insert with full history
      await db.createWalletWithHistory(address, deposits);
    } else {
      // Fallback: create wallet with just the current deposit
      await db.createWallet(address, currentDepositAmount, currentTxHash);
    }

    await cache.markWalletSeen(address);
  },

  /**
   * Ensure a wallet exists in the database (create if not)
   * @deprecated Use ensureWalletExistsWithHistory for new wallets
   */
  async ensureWalletExists(
    address: string,
    depositAmount: number,
    txHash: string
  ): Promise<void> {
    const exists = await db.walletExists(address);
    if (!exists) {
      await db.createWallet(address, depositAmount, txHash);
      await cache.markWalletSeen(address);
    }
  },

  /**
   * Process a deposit and return whether it's from a new wallet.
   * For new wallets, fetches and stores their complete deposit history.
   */
  async processDeposit(
    address: string,
    amount: number,
    txHash: string,
    blockNumber: bigint
  ): Promise<{ isNew: boolean; depositId: number | null }> {
    const isNew = await this.isNewWallet(address);

    // Ensure wallet exists in DB with full historical data
    // This fetches all past deposits from blockchain RPC for new wallets
    await this.ensureWalletExistsWithHistory(address, amount, txHash);

    // Record the current deposit (will be a no-op if already in historical data)
    const depositId = await db.recordDeposit(txHash, address, amount, blockNumber);

    return { isNew, depositId };
  },
};
