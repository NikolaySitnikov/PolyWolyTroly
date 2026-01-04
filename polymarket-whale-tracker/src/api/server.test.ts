/**
 * API Server Tests
 *
 * TDD: RED phase - Tests for the Express REST API.
 * Tests all endpoints before implementation.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "./server.js";
import type { Express } from "express";

describe("API Server", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
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
  });

  describe("GET /api/wallets", () => {
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
      const response = await request(app).get("/api/wallets?limit=5");
      expect(response.body.limit).toBe(5);
    });

    it("should respect page parameter", async () => {
      const response = await request(app).get("/api/wallets?page=2");
      expect(response.body.page).toBe(2);
    });
  });

  describe("GET /api/wallets/:address", () => {
    it("should return 200 OK for valid address", async () => {
      // Use a mock address - in real tests this would be seeded data
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890"
      );
      // Should return 200 or 404 depending on whether wallet exists
      expect([200, 404]).toContain(response.status);
    });

    it("should return 400 for invalid address format", async () => {
      const response = await request(app).get("/api/wallets/invalid-address");
      expect(response.status).toBe(400);
    });

    it("should return wallet data with required fields when found", async () => {
      const response = await request(app).get(
        "/api/wallets/0x1234567890123456789012345678901234567890"
      );
      if (response.status === 200) {
        expect(response.body).toHaveProperty("address");
        expect(response.body).toHaveProperty("totalDeposited");
        expect(response.body).toHaveProperty("depositCount");
      }
    });
  });

  describe("GET /api/deposits", () => {
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
    });

    it("should return deposits sorted by timestamp descending", async () => {
      const response = await request(app).get("/api/deposits");
      const deposits = response.body.deposits;
      if (deposits.length >= 2) {
        const timestamps = deposits.map((d: any) => new Date(d.createdAt).getTime());
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
  });
});
