/**
 * Mock Data Factories for Tests
 *
 * Provides functions to create properly typed mock data for testing.
 * All factories return objects matching the actual API response types.
 */

import type { PolymarketPosition, PolymarketActivity, PolymarketUserProfile, TradingMetrics } from '../types/polymarket';
import type { Position } from '../types/position';
import type { TradingDataResponse, StatsResponse } from '../services/api';

/**
 * Create a mock PolymarketPosition with default values
 */
export function mockPolymarketPosition(overrides: Partial<PolymarketPosition> = {}): PolymarketPosition {
  return {
    proxyWallet: '0x1234567890abcdef1234567890abcdef12345678',
    asset: '0xasset123',
    conditionId: 'condition-123',
    size: 100,
    avgPrice: 0.65,
    initialValue: 65,
    currentValue: 75,
    cashPnl: 10,
    percentPnl: 15.38,
    totalBought: 100,
    realizedPnl: 0,
    percentRealizedPnl: 0,
    curPrice: 0.75,
    redeemable: false,
    mergeable: false,
    title: 'Will Trump win the 2024 election?',
    slug: 'trump-2024',
    icon: '',
    eventId: 'event-123',
    eventSlug: 'trump-2024-election',
    outcome: 'Yes',
    outcomeIndex: 0,
    oppositeOutcome: 'No',
    oppositeAsset: '0xopposite',
    endDate: '2024-11-05T00:00:00Z',
    negativeRisk: false,
    ...overrides,
  };
}

/**
 * Create a mock Position (extended PolymarketPosition) with default values
 */
export function mockPosition(overrides: Partial<Position> = {}): Position {
  const base = mockPolymarketPosition(overrides);
  return {
    ...base,
    normalizedOutcome: base.outcome?.toUpperCase() === 'YES' ? 'YES' : 'NO',
    status: 'active',
    normalizedCategory: 'politics',
    currentPrice: base.curPrice,
    pnl: base.cashPnl,
    pnlPercent: base.percentPnl,
    isActive: base.curPrice > 0 && !base.redeemable,
    category: 'Politics',
    ...overrides,
  };
}

/**
 * Create a mock PolymarketActivity with default values
 */
export function mockPolymarketActivity(overrides: Partial<PolymarketActivity> = {}): PolymarketActivity {
  return {
    proxyWallet: '0x1234567890abcdef1234567890abcdef12345678',
    timestamp: Date.now() / 1000,
    type: 'trade',
    conditionId: 'condition-123',
    title: 'Will Trump win?',
    slug: 'trump-2024',
    side: 'BUY',
    outcome: 'Yes',
    size: 100,
    usdcSize: 65,
    price: 0.65,
    transactionHash: '0xtxhash123',
    fee: 0.1,
    ...overrides,
  };
}

/**
 * Create a mock PolymarketUserProfile with default values
 */
export function mockPolymarketProfile(overrides: Partial<PolymarketUserProfile> = {}): PolymarketUserProfile {
  return {
    createdAt: '2024-01-01T00:00:00Z',
    proxyWallet: '0x1234567890abcdef1234567890abcdef12345678',
    displayUsernamePublic: true,
    pseudonym: 'whale_trader',
    name: 'Whale Trader',
    users: [],
    verifiedBadge: false,
    profileImage: 'https://example.com/avatar.png',
    profileImageOptimized: 'https://example.com/avatar-small.png',
    bio: 'Trading whale',
    ...overrides,
  };
}

/**
 * Create mock TradingMetrics with default values
 */
export function mockTradingMetrics(overrides: Partial<TradingMetrics> = {}): TradingMetrics {
  return {
    pnl: 5000,
    pnl7d: 1000,
    pnl30d: 3000,
    winRate: 65.5,
    portfolioValue: 50000,
    activePositions: 10,
    totalTrades: 25,
    lastActivityAt: '2024-01-05T12:00:00Z',
    isLive: true,
    ...overrides,
  };
}

/**
 * Create a mock TradingDataResponse with default values
 */
export function mockTradingDataResponse(overrides: Partial<TradingDataResponse> = {}): TradingDataResponse {
  return {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    metrics: mockTradingMetrics(overrides.metrics),
    positions: overrides.positions ?? [mockPolymarketPosition()],
    activity: overrides.activity ?? [mockPolymarketActivity()],
    profile: overrides.profile !== undefined ? overrides.profile : mockPolymarketProfile(),
    fetchedAt: '2024-01-05T12:30:00Z',
    ...overrides,
  };
}

/**
 * Create a mock StatsResponse with default values
 */
export function mockStatsResponse(overrides: Partial<StatsResponse> = {}): StatsResponse {
  return {
    whaleCount: 42,
    whaleCountTrend: 5,
    totalVolume: 15750000,
    totalVolumeTrend: 1250000,
    alertsToday: 12,
    newWhalesToday: 5,
    ...overrides,
  };
}
