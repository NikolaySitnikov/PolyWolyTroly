import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("with all required env vars set", () => {
    beforeEach(() => {
      process.env.ALCHEMY_WSS_URL = "wss://polygon-mainnet.g.alchemy.com/v2/test";
      process.env.ALCHEMY_HTTP_URL = "https://polygon-mainnet.g.alchemy.com/v2/test";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
      process.env.TELEGRAM_CHAT_ID = "-100123456789";
    });

    it("should export alchemy config", async () => {
      const { config } = await import("./index.js");
      expect(config.alchemy.wssUrl).toBe("wss://polygon-mainnet.g.alchemy.com/v2/test");
      expect(config.alchemy.httpUrl).toBe("https://polygon-mainnet.g.alchemy.com/v2/test");
    });

    it("should export database config", async () => {
      const { config } = await import("./index.js");
      expect(config.database.url).toBe("postgresql://localhost:5432/test");
    });

    it("should export redis config", async () => {
      const { config } = await import("./index.js");
      expect(config.redis.url).toBe("redis://localhost:6379");
    });

    it("should export telegram config", async () => {
      const { config } = await import("./index.js");
      expect(config.telegram.botToken).toBe("123456:ABC-DEF");
      expect(config.telegram.chatId).toBe("-100123456789");
    });

    it("should use default minDepositAmount when not set", async () => {
      const { config } = await import("./index.js");
      expect(config.app.minDepositAmount).toBe(14500);
    });

    it("should use custom minDepositAmount when set", async () => {
      process.env.MIN_DEPOSIT_AMOUNT = "50000";
      const { config } = await import("./index.js");
      expect(config.app.minDepositAmount).toBe(50000);
    });

    it("should use default nodeEnv when not set", async () => {
      delete process.env.NODE_ENV;
      const { config } = await import("./index.js");
      expect(config.app.nodeEnv).toBe("development");
    });

    it("should use custom nodeEnv when set", async () => {
      process.env.NODE_ENV = "production";
      const { config } = await import("./index.js");
      expect(config.app.nodeEnv).toBe("production");
    });
  });

  describe("validation", () => {
    it("should throw error when ALCHEMY_WSS_URL is missing", async () => {
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
      process.env.TELEGRAM_CHAT_ID = "-100123456789";
      // ALCHEMY_WSS_URL not set

      await expect(import("./index.js")).rejects.toThrow(
        "Missing required environment variable: ALCHEMY_WSS_URL"
      );
    });

    it("should throw error when DATABASE_URL is missing", async () => {
      process.env.ALCHEMY_WSS_URL = "wss://polygon-mainnet.g.alchemy.com/v2/test";
      process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
      process.env.TELEGRAM_CHAT_ID = "-100123456789";
      // DATABASE_URL not set

      await expect(import("./index.js")).rejects.toThrow(
        "Missing required environment variable: DATABASE_URL"
      );
    });

    it("should throw error when TELEGRAM_BOT_TOKEN is missing", async () => {
      process.env.ALCHEMY_WSS_URL = "wss://polygon-mainnet.g.alchemy.com/v2/test";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TELEGRAM_CHAT_ID = "-100123456789";
      // TELEGRAM_BOT_TOKEN not set

      await expect(import("./index.js")).rejects.toThrow(
        "Missing required environment variable: TELEGRAM_BOT_TOKEN"
      );
    });

    it("should throw error when TELEGRAM_CHAT_ID is missing", async () => {
      process.env.ALCHEMY_WSS_URL = "wss://polygon-mainnet.g.alchemy.com/v2/test";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
      // TELEGRAM_CHAT_ID not set

      await expect(import("./index.js")).rejects.toThrow(
        "Missing required environment variable: TELEGRAM_CHAT_ID"
      );
    });
  });
});
