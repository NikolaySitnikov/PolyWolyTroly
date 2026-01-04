import Redis from "ioredis";
import { config } from "../config/index.js";

const redis = new (Redis as any)(config.redis.url);

// TTL: 30 days in seconds
const WALLET_TTL = 30 * 24 * 60 * 60;

// TTL: 7 days for processed transactions
const TX_PROCESSED_TTL = 7 * 24 * 60 * 60;

// TTL: 60 seconds for transaction lock (prevents race conditions)
const TX_LOCK_TTL = 60;

export const cache = {
  // Mark wallet as seen in cache
  async markWalletSeen(address: string): Promise<void> {
    await redis.setex(
      `wallet:${address.toLowerCase()}`,
      WALLET_TTL,
      Date.now().toString()
    );
  },

  // Check if wallet is in cache
  async isWalletSeen(address: string): Promise<boolean> {
    const result = await redis.exists(`wallet:${address.toLowerCase()}`);
    return result === 1;
  },

  // Store last processed block
  async setLastBlock(blockNumber: bigint): Promise<void> {
    await redis.set("last_processed_block", blockNumber.toString());
  },

  // Get last processed block
  async getLastBlock(): Promise<bigint | null> {
    const block = await redis.get("last_processed_block");
    return block ? BigInt(block) : null;
  },

  // Close connection
  async close(): Promise<void> {
    await redis.quit();
  },

  // Acquire a distributed lock for a transaction (prevents duplicate processing)
  // Returns true if lock acquired, false if another process already has the lock
  async acquireTransactionLock(txHash: string): Promise<boolean> {
    const result = await redis.set(
      `tx_lock:${txHash.toLowerCase()}`,
      Date.now().toString(),
      "EX",
      TX_LOCK_TTL,
      "NX"
    );
    return result === "OK";
  },

  // Check if a transaction has been fully processed (notification sent)
  async isTransactionProcessed(txHash: string): Promise<boolean> {
    const result = await redis.exists(`tx_processed:${txHash.toLowerCase()}`);
    return result === 1;
  },

  // Mark a transaction as fully processed (after notification sent)
  async markTransactionProcessed(txHash: string): Promise<void> {
    await redis.setex(
      `tx_processed:${txHash.toLowerCase()}`,
      TX_PROCESSED_TTL,
      Date.now().toString()
    );
  },
};
