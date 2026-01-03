import { describe, it, expect, beforeEach, vi } from "vitest";

const mockLogNotification = vi.fn();
const mockFetch = vi.fn();

// Mock the database module
vi.mock("./database.js", () => ({
  db: {
    logNotification: mockLogNotification,
  },
}));

// Mock the config module
vi.mock("../config/index.js", () => ({
  config: {
    telegram: {
      botToken: "test-bot-token",
      chatId: "test-chat-id",
    },
  },
}));

describe("notifications service", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockLogNotification.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  describe("sendTelegramAlert", () => {
    const baseAlert = {
      walletAddress: "0x1234567890AbCdEf1234567890AbCdEf12345678",
      amount: 50000,
      txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      blockNumber: BigInt(12345678),
      isNewWallet: true,
      depositId: 1,
    };

    it("should send a telegram message with correct parameters", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert(baseAlert);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bottest-bot-token/sendMessage",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should include wallet address in the message", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert(baseAlert);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.text).toContain(baseAlert.walletAddress);
    });

    it("should include amount formatted with commas", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert(baseAlert);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.text).toContain("50,000");
    });

    it("should include polygonscan links", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert(baseAlert);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.text).toContain(`https://polygonscan.com/tx/${baseAlert.txHash}`);
      expect(body.text).toContain(`https://polygonscan.com/address/${baseAlert.walletAddress}`);
    });

    it("should use NEW WHALE emoji for new wallets", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert({ ...baseAlert, isNewWallet: true });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.text).toContain("🚨 NEW WHALE");
      expect(body.text).toContain("FIRST TIME DEPOSIT");
    });

    it("should use WHALE DEPOSIT emoji for returning wallets", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert({ ...baseAlert, isNewWallet: false });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.text).toContain("🐋 WHALE DEPOSIT");
      expect(body.text).toContain("Returning user");
    });

    it("should send with Markdown parse mode", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert(baseAlert);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.parse_mode).toBe("Markdown");
      expect(body.chat_id).toBe("test-chat-id");
      expect(body.disable_web_page_preview).toBe(true);
    });

    it("should return true on successful send", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      const result = await notifications.sendTelegramAlert(baseAlert);

      expect(result).toBe(true);
    });

    it("should return false when telegram API returns ok: false", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: false, description: "Bad Request" }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      const result = await notifications.sendTelegramAlert(baseAlert);

      expect(result).toBe(false);
    });

    it("should log successful notification to database", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert(baseAlert);

      expect(mockLogNotification).toHaveBeenCalledWith(
        baseAlert.walletAddress,
        baseAlert.depositId,
        "telegram",
        expect.any(String),
        true,
        undefined
      );
    });

    it("should log failed notification with error to database", async () => {
      const errorResponse = { ok: false, description: "Bad Request" };
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(errorResponse),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert(baseAlert);

      expect(mockLogNotification).toHaveBeenCalledWith(
        baseAlert.walletAddress,
        baseAlert.depositId,
        "telegram",
        expect.any(String),
        false,
        JSON.stringify(errorResponse)
      );
    });

    it("should return false and log error on fetch exception", async () => {
      const error = new Error("Network error");
      mockFetch.mockRejectedValue(error);
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      const result = await notifications.sendTelegramAlert(baseAlert);

      expect(result).toBe(false);
      expect(mockLogNotification).toHaveBeenCalledWith(
        baseAlert.walletAddress,
        baseAlert.depositId,
        "telegram",
        expect.any(String),
        false,
        "Network error"
      );
    });

    it("should include timestamp in the message", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });
      mockLogNotification.mockResolvedValue(undefined);

      const { notifications } = await import("./notifications.js");
      await notifications.sendTelegramAlert(baseAlert);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // Check that the message contains a timestamp (locale format)
      expect(body.text).toMatch(/⏰ Time: /);
    });
  });
});
