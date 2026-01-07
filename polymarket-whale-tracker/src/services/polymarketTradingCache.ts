/**
 * Polymarket Trading Data Cache
 *
 * TDD: GREEN phase - Implementation to make tests pass.
 * Caching layer for Polymarket trading data using Redis.
 */

import Redis from "ioredis";
import { config } from "../config/index.js";
import type { WalletTradingData } from "../types/polymarket.js";
import { polymarketApi } from "./polymarketApi.js";

const redis = new (Redis as any)(config.redis.url);

// Cache TTL: 5 minutes for trading data
const TRADING_DATA_TTL = 5 * 60;

// Cache key prefixes
const CACHE_PREFIX = {
  tradingData: "pm:trading:",
  profile: "pm:profile:",
} as const;

export const tradingCache = {
  /**
   * Get cached trading data for a wallet
   */
  async getTradingData(address: string): Promise<WalletTradingData | null> {
    try {
      const key = `${CACHE_PREFIX.tradingData}${address.toLowerCase()}`;
      const cached = await redis.get(key);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as WalletTradingData;
    } catch (error) {
      console.error("Error reading trading data from cache:", error);
      return null;
    }
  },

  /**
   * Cache trading data for a wallet
   */
  async setTradingData(address: string, data: WalletTradingData): Promise<void> {
    try {
      const key = `${CACHE_PREFIX.tradingData}${address.toLowerCase()}`;
      await redis.setex(key, TRADING_DATA_TTL, JSON.stringify(data));
    } catch (error) {
      console.error("Error writing trading data to cache:", error);
    }
  },

  /**
   * Get trading data with cache-through pattern
   */
  async getOrFetchTradingData(
    address: string,
    forceRefresh: boolean = false
  ): Promise<WalletTradingData> {
    const normalizedAddress = address.toLowerCase();

    if (!forceRefresh) {
      const cached = await this.getTradingData(normalizedAddress);
      if (cached) {
        return cached;
      }
    }

    const freshData = await polymarketApi.getWalletTradingData(normalizedAddress);
    await this.setTradingData(normalizedAddress, freshData);

    return freshData;
  },

  /**
   * Invalidate cached trading data for a wallet
   */
  async invalidateTradingData(address: string): Promise<void> {
    try {
      const key = `${CACHE_PREFIX.tradingData}${address.toLowerCase()}`;
      await redis.del(key);
    } catch (error) {
      console.error("Error invalidating trading data cache:", error);
    }
  },

  /**
   * Batch invalidate trading data for multiple wallets
   */
  async invalidateMultiple(addresses: string[]): Promise<void> {
    try {
      if (addresses.length === 0) return;

      const keys = addresses.map(
        (addr) => `${CACHE_PREFIX.tradingData}${addr.toLowerCase()}`
      );
      await redis.del(...keys);
    } catch (error) {
      console.error("Error batch invalidating trading data cache:", error);
    }
  },

  /**
   * Get cache stats for monitoring
   */
  async getCacheStats(): Promise<{
    tradingDataKeys: number;
    profileKeys: number;
  }> {
    try {
      const tradingDataKeys = await redis.keys(`${CACHE_PREFIX.tradingData}*`);
      const profileKeys = await redis.keys(`${CACHE_PREFIX.profile}*`);

      return {
        tradingDataKeys: tradingDataKeys.length,
        profileKeys: profileKeys.length,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return {
        tradingDataKeys: 0,
        profileKeys: 0,
      };
    }
  },

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await redis.quit();
  },
};

export default tradingCache;
