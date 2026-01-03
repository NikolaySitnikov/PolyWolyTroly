import { db } from "./database.js";
import { cache } from "./cache.js";
import { polymarketApi } from "./polymarketApi.js";

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
   * Ensure a wallet exists in the database (create if not)
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
   * Process a deposit and return whether it's from a new wallet
   */
  async processDeposit(
    address: string,
    amount: number,
    txHash: string,
    blockNumber: bigint
  ): Promise<{ isNew: boolean; depositId: number | null }> {
    const isNew = await this.isNewWallet(address);

    // Always ensure wallet exists in DB before recording deposit
    // (wallet might exist in Polymarket history but not our DB)
    await this.ensureWalletExists(address, amount, txHash);

    const depositId = await db.recordDeposit(txHash, address, amount, blockNumber);

    return { isNew, depositId };
  },
};
