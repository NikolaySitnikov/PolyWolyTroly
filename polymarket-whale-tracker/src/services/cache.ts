import Redis from "ioredis";
import { config } from "../config/index.js";

const redis = new Redis(config.redis.url);

// TTL: 30 days in seconds
const WALLET_TTL = 30 * 24 * 60 * 60;

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
};
