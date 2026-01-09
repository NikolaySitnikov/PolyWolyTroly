/**
 * Polymarket API Integration Tests
 *
 * These tests verify our API handling matches real Polymarket API responses.
 * Uses actual API response structures captured from live endpoints.
 *
 * Test wallet: bossoskil (0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b)
 * - Total Deposited: $386K
 * - P&L (All): -$2,279,319 (per Polymarket UI)
 * - Positions Value: $61.0k
 * - Predictions: 263
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * Real API response structure from /positions endpoint
 * Captured from: https://data-api.polymarket.com/positions?user=0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b&limit=1
 */
const REAL_POSITION_RESPONSE = {
  proxyWallet: "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b",
  asset: "74349183490079698227208217319859256216421371783649971257502006682057417382055",
  conditionId: "0x483b9ff3369a7871e88de7c0d6cb10cadb334fb6dcad766f439b9cb69e14e827",
  size: 2259693.9137,
  avgPrice: 0.2498,
  initialValue: 564546.1095,
  currentValue: 0,
  cashPnl: -564546.1095,
  percentPnl: -99.9999,
  totalBought: 2260789.8337,
  realizedPnl: 0,
  percentRealizedPnl: -100,
  curPrice: 0,
  redeemable: true,
  mergeable: false,
  title: "Eagles vs. Commanders",
  slug: "nfl-phi-was-2025-12-20",
  icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/nfl.png",
  eventId: "99225",
  eventSlug: "nfl-phi-was-2025-12-20",
  outcome: "Commanders",
  outcomeIndex: 1,
  oppositeOutcome: "Eagles",
  oppositeAsset: "113363077069015448538122512240711174749559162563733049209873259809066273054395",
  endDate: "2025-12-20",
  negativeRisk: false,
};

/**
 * Real API response structure from /value endpoint
 * Captured from: https://data-api.polymarket.com/value?user=0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b
 *
 * NOTE: Returns an ARRAY with single object containing {user, value}
 */
const REAL_VALUE_RESPONSE = [
  {
    user: "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b",
    value: 60950.986,
  },
];

/**
 * Real API response structure from /activity endpoint
 * Captured from: https://data-api.polymarket.com/activity?user=0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b&limit=1
 */
const REAL_ACTIVITY_RESPONSE = {
  proxyWallet: "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b",
  timestamp: 1767785767,
  conditionId: "0x370da1f085d5f67df302808151595ba639a1a6a03e276e0879b8b81e446e04dc",
  type: "REDEEM",
  size: 759496.949982,
  usdcSize: 759496.949982,
  transactionHash: "0x43b7015b708bd7da7931b3e0ac738e501daa343bc105710b6c34608ebd38fc89",
  price: 0,
  asset: "",
  side: "",
  outcomeIndex: 999,
  title: "Bruins vs. Kraken",
  slug: "nhl-bos-sea-2026-01-06",
  icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/nhl.png",
  eventSlug: "nhl-bos-sea-2026-01-06",
  outcome: "",
  name: "bossoskil",
  pseudonym: "Notable-Fantasy",
  bio: "",
  profileImage: "",
  profileImageOptimized: "",
};

/**
 * Real API response structure from /public-profile endpoint
 * Captured from: https://gamma-api.polymarket.com/public-profile?address=0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b
 */
const REAL_PROFILE_RESPONSE = {
  createdAt: "2025-10-10T17:25:18.646649Z",
  proxyWallet: "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b",
  displayUsernamePublic: true,
  pseudonym: "Notable-Fantasy",
  name: "bossoskil",
  users: [
    {
      id: "3501447",
      creator: false,
      mod: false,
    },
  ],
  verifiedBadge: false,
};

describe("polymarketApi - Real API Response Handling", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  describe("getValue - handles real /value API response", () => {
    it("should correctly parse array response with {user, value} object", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => REAL_VALUE_RESPONSE,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getValue(
        "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b"
      );

      // Real API returns array - we need to extract value
      expect(result).not.toBeNull();
      expect(result?.value).toBe(60950.986);
    });

    it("should handle empty array response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getValue(
        "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b"
      );

      expect(result).toBeNull();
    });
  });

  describe("getPositions - handles real /positions API response", () => {
    it("should correctly parse position with cashPnl field (not pnl)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [REAL_POSITION_RESPONSE],
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getPositions(
        "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b"
      );

      expect(result).toHaveLength(1);
      // Verify key fields from real API response
      expect(result[0].cashPnl).toBe(-564546.1095);
      expect(result[0].curPrice).toBe(0);
      expect(result[0].realizedPnl).toBe(0);
      expect(result[0].redeemable).toBe(true);
      expect(result[0].percentPnl).toBe(-99.9999);
    });
  });

  describe("getProfile - handles real /public-profile API response", () => {
    it("should correctly parse profile with proxyWallet field", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => REAL_PROFILE_RESPONSE,
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getProfile(
        "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b"
      );

      expect(result).not.toBeNull();
      expect(result?.name).toBe("bossoskil");
      expect(result?.pseudonym).toBe("Notable-Fantasy");
      expect(result?.proxyWallet).toBe("0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b");
    });
  });

  describe("calculateTradingMetrics - computes correct values from real data", () => {
    it("should calculate total P&L from activity (sold + redeemed - bought)", async () => {
      const { polymarketApi } = await import("./polymarketApi.js");

      // Positions for win rate and portfolio value calculation
      const positions = [
        { ...REAL_POSITION_RESPONSE, cashPnl: -564546.11, realizedPnl: 0, currentValue: 0 },
      ];
      // Activity drives P&L: P&L = (sold + redeemed) - bought
      const activity = [
        { type: "TRADE", side: "BUY", usdcSize: 1000000, timestamp: Date.now() / 1000 },
        { type: "TRADE", side: "SELL", usdcSize: 300000, timestamp: Date.now() / 1000 },
        { type: "REDEEM", usdcSize: 500000, timestamp: Date.now() / 1000 },
      ];

      const metrics = polymarketApi.calculateTradingMetrics(
        positions as any,
        activity as any,
        [],
        { value: 60950.986 } as any
      );

      // P&L = (sold + redeemed) - bought = (300000 + 500000) - 1000000 = -200000
      expect(metrics.pnl).toBeCloseTo(-200000, 0);
    });

    it("should use portfolio value from /value API response", async () => {
      const { polymarketApi } = await import("./polymarketApi.js");

      const positions = [REAL_POSITION_RESPONSE];
      const valueResponse = { value: 60950.986 };

      const metrics = polymarketApi.calculateTradingMetrics(
        positions as any,
        [],
        [],
        valueResponse as any
      );

      expect(metrics.portfolioValue).toBeCloseTo(60950.99, 0);
    });

    it("should calculate win rate from positions with positive cashPnl", async () => {
      const { polymarketApi } = await import("./polymarketApi.js");

      // 2 winning positions (cashPnl > 0), 3 losing positions (cashPnl <= 0)
      const positions = [
        { ...REAL_POSITION_RESPONSE, cashPnl: 1000 },  // Win
        { ...REAL_POSITION_RESPONSE, cashPnl: 500 },   // Win
        { ...REAL_POSITION_RESPONSE, cashPnl: -200 },  // Loss
        { ...REAL_POSITION_RESPONSE, cashPnl: -100 },  // Loss
        { ...REAL_POSITION_RESPONSE, cashPnl: 0 },     // Neutral (counts as not winning)
      ];

      const metrics = polymarketApi.calculateTradingMetrics(
        positions as any,
        [],
        [],
        null
      );

      // Win rate = 2 winning / 5 total = 40%
      expect(metrics.winRate).toBe(40);
    });

    it("should count active positions (curPrice > 0 or not redeemable)", async () => {
      const { polymarketApi } = await import("./polymarketApi.js");

      const positions = [
        { ...REAL_POSITION_RESPONSE, curPrice: 0.5, redeemable: false },  // Active
        { ...REAL_POSITION_RESPONSE, curPrice: 0.3, redeemable: false },  // Active
        { ...REAL_POSITION_RESPONSE, curPrice: 0, redeemable: true },     // Closed/resolved
        { ...REAL_POSITION_RESPONSE, curPrice: 0, redeemable: true },     // Closed/resolved
      ];

      const metrics = polymarketApi.calculateTradingMetrics(
        positions as any,
        [],
        [],
        null
      );

      expect(metrics.activePositions).toBe(2);
    });
  });

  describe("getWalletTradingData - returns correct combined data", () => {
    it("should return metrics with P&L from leaderboard API", async () => {
      // Use mockImplementation to handle the parallel fetch calls properly
      const mockResponses = {
        positions: [
          { ...REAL_POSITION_RESPONSE, cashPnl: -564546.11, realizedPnl: 0 },
        ],
        activity: [
          { ...REAL_ACTIVITY_RESPONSE, type: "TRADE", side: "BUY", usdcSize: 1000000 },
          { ...REAL_ACTIVITY_RESPONSE, type: "TRADE", side: "SELL", usdcSize: 200000 },
          { ...REAL_ACTIVITY_RESPONSE, type: "REDEEM", usdcSize: 100000 },
        ],
        trades: [],
        value: REAL_VALUE_RESPONSE,
        profile: REAL_PROFILE_RESPONSE,
        // Leaderboard API returns time-windowed P&L
        leaderboard: [
          {
            rank: "1",
            proxyWallet: "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b",
            userName: "bossoskil",
            pnl: -243000, // Matches Polymarket UI
            vol: 1500000,
          },
        ],
      };

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/v1/leaderboard")) {
          // Return appropriate P&L based on time period
          if (url.includes("timePeriod=WEEK")) {
            return { ok: true, json: async () => [{ ...mockResponses.leaderboard[0], pnl: -15000 }] };
          }
          if (url.includes("timePeriod=MONTH")) {
            return { ok: true, json: async () => [{ ...mockResponses.leaderboard[0], pnl: -80000 }] };
          }
          if (url.includes("timePeriod=ALL")) {
            return { ok: true, json: async () => mockResponses.leaderboard };
          }
          return { ok: true, json: async () => mockResponses.leaderboard };
        }
        if (url.includes("/positions")) {
          if (url.includes("offset=0") || !url.includes("offset")) {
            return { ok: true, json: async () => mockResponses.positions };
          }
          return { ok: true, json: async () => [] };
        }
        if (url.includes("/activity")) {
          if (url.includes("offset=0") || !url.includes("offset")) {
            return { ok: true, json: async () => mockResponses.activity };
          }
          return { ok: true, json: async () => [] };
        }
        if (url.includes("/trades")) {
          return { ok: true, json: async () => mockResponses.trades };
        }
        if (url.includes("/value")) {
          return { ok: true, json: async () => mockResponses.value };
        }
        if (url.includes("/public-profile")) {
          return { ok: true, json: async () => mockResponses.profile };
        }
        return { ok: false };
      });

      const { polymarketApi } = await import("./polymarketApi.js");
      const result = await polymarketApi.getWalletTradingData(
        "0x0d3b10b8eac8b089c6e4a695e65d8e044167c46b"
      );

      expect(result.profile?.name).toBe("bossoskil");
      expect(result.metrics.portfolioValue).toBeCloseTo(60950.99, 0);
      // P&L values come from leaderboard API
      expect(result.metrics.pnl).toBe(-243000); // All-time P&L
      expect(result.metrics.pnl7d).toBe(-15000); // 7d P&L
      expect(result.metrics.pnl30d).toBe(-80000); // 30d P&L
    });
  });
});
