/**
 * API Server Tests
 *
 * TDD: RED phase - Tests for the Express REST API.
 * Tests all endpoints before implementation.
 *
 * Step 5 (Fixed): Now mocks database for proper testing.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

// Mock the database module before importing the server
vi.mock("../services/database.js", () => ({
  db: {
    getStats: vi.fn(),
    getAllWallets: vi.fn(),
    getWallet: vi.fn(),
    getRecentDeposits: vi.fn(),
  },
}));

// Import after mocking
import { createApp } from "./server.js";
import { db } from "../services/database.js";

describe("API Server", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/health");
      expect(response.status).toBe(200);
    });

    it("should return status ok", async () => {
      const response = await request(app).get("/api/health");
      expect(response.body).toHaveProperty("status", "ok");
    });

    it("should return current timestamp", async () => {
      const response = await request(app).get("/api/health");
      expect(response.body).toHaveProperty("timestamp");
      expect(typeof response.body.timestamp).toBe("string");
    });
  });

  describe("GET /api/stats", () => {
    const mockStats = {
      whaleCount: 42,
      totalVolume: 15750000,
      alertsToday: 12,
      newWhalesThisWeek: 5,
    };

    beforeEach(() => {
      vi.mocked(db.getStats).mockResolvedValue(mockStats);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.status).toBe(200);
    });

    it("should return whale count", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.body).toHaveProperty("whaleCount");
      expect(typeof response.body.whaleCount).toBe("number");
    });

    it("should return total volume", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.body).toHaveProperty("totalVolume");
      expect(typeof response.body.totalVolume).toBe("number");
    });

    it("should return alerts today count", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.body).toHaveProperty("alertsToday");
      expect(typeof response.body.alertsToday).toBe("number");
    });

    it("should return new whales this week count", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.body).toHaveProperty("newWhalesThisWeek");
      expect(typeof response.body.newWhalesThisWeek).toBe("number");
    });

    it("should call db.getStats", async () => {
      await request(app).get("/api/stats");
      expect(db.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/wallets", () => {
    const mockWalletsResult = {
      wallets: [
        { address: "0x1234", total_deposited: 50000, deposit_count: 5 },
        { address: "0xabcd", total_deposited: 30000, deposit_count: 3 },
      ],
      total: 10,
      page: 1,
      limit: 20,
    };

    beforeEach(() => {
      vi.mocked(db.getAllWallets).mockResolvedValue(mockWalletsResult);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/wallets");
      expect(response.status).toBe(200);
    });

    it("should return an array of wallets", async () => {
      const response = await request(app).get("/api/wallets");
      expect(Array.isArray(response.body.wallets)).toBe(true);
    });

    it("should return pagination info", async () => {
      const response = await request(app).get("/api/wallets");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
    });

    it("should respect limit parameter", async () => {
      vi.mocked(db.getAllWallets).mockResolvedValue({ ...mockWalletsResult, limit: 5 });
      const response = await request(app).get("/api/wallets?limit=5");
      expect(response.body.limit).toBe(5);
      expect(db.getAllWallets).toHaveBeenCalledWith(1, 5);
    });

    it("should respect page parameter", async () => {
      vi.mocked(db.getAllWallets).mockResolvedValue({ ...mockWalletsResult, page: 2 });
      const response = await request(app).get("/api/wallets?page=2");
      expect(response.body.page).toBe(2);
      expect(db.getAllWallets).toHaveBeenCalledWith(2, 20);
    });
  });

  describe("GET /api/wallets/:address", () => {
    const mockWallet = {
      address: "0x1234567890123456789012345678901234567890",
      total_deposited: 50000,
      deposit_count: 5,
      first_seen_at: new Date(),
    };

    it("should return 200 OK for valid address when wallet exists", async () => {
      vi.mocked(db.getWallet).mockResolvedValue(mockWallet);
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890"
      );
      expect(response.status).toBe(200);
    });

    it("should return 404 when wallet not found", async () => {
      vi.mocked(db.getWallet).mockResolvedValue(null);
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890"
      );
      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid address format", async () => {
      const response = await request(app).get("/api/wallets/invalid-address");
      expect(response.status).toBe(400);
    });

    it("should return wallet data with required fields when found", async () => {
      vi.mocked(db.getWallet).mockResolvedValue(mockWallet);
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890"
      );
      expect(response.body).toHaveProperty("address");
      expect(response.body).toHaveProperty("total_deposited");
      expect(response.body).toHaveProperty("deposit_count");
    });
  });

  describe("GET /api/deposits", () => {
    const mockDepositsResult = {
      deposits: [
        { id: 1, wallet_address: "0x1234", amount: 50000, created_at: new Date() },
        { id: 2, wallet_address: "0xabcd", amount: 25000, created_at: new Date(Date.now() - 1000) },
      ],
      total: 100,
      page: 1,
      limit: 20,
    };

    beforeEach(() => {
      vi.mocked(db.getRecentDeposits).mockResolvedValue(mockDepositsResult);
    });

    it("should return 200 OK", async () => {
      const response = await request(app).get("/api/deposits");
      expect(response.status).toBe(200);
    });

    it("should return an array of deposits", async () => {
      const response = await request(app).get("/api/deposits");
      expect(Array.isArray(response.body.deposits)).toBe(true);
    });

    it("should return pagination info", async () => {
      const response = await request(app).get("/api/deposits");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
    });

    it("should support filtering by wallet address", async () => {
      const response = await request(app).get(
        "/api/deposits?wallet=0x1234567890123456789012345678901234567890"
      );
      expect(response.status).toBe(200);
      expect(db.getRecentDeposits).toHaveBeenCalledWith(
        1,
        20,
        "0x1234567890123456789012345678901234567890"
      );
    });

    it("should return deposits sorted by timestamp descending", async () => {
      const response = await request(app).get("/api/deposits");
      const deposits = response.body.deposits;
      if (deposits.length >= 2) {
        const timestamps = deposits.map((d: any) => new Date(d.created_at).getTime());
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
        }
      }
    });
  });

  describe("CORS", () => {
    it("should include CORS headers", async () => {
      const response = await request(app)
        .get("/api/health")
        .set("Origin", "http://localhost:5173");
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/api/unknown-route");
      expect(response.status).toBe(404);
    });

    it("should return JSON error for 404", async () => {
      const response = await request(app).get("/api/unknown-route");
      expect(response.body).toHaveProperty("error");
    });

    it("should return 500 when database throws error", async () => {
      vi.mocked(db.getStats).mockRejectedValue(new Error("Database connection failed"));
      const response = await request(app).get("/api/stats");
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });
});
