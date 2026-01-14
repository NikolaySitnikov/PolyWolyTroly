/**
 * Rule-specific type definitions for the Detection Engine
 *
 * This file contains interfaces and types specific to individual detection rules.
 * General detection types are in ../types.ts
 */

import type {
  DetectionRuleName,
  RuleResult,
  RuleEvaluationContext,
  AlertSeverity,
  WalletActivity,
  DepthSnapshot,
  WalletCluster,
  ClusterSummary,
} from "../types.js";

// ============================================
// BASE RULE INTERFACE
// ============================================

/**
 * Base interface for all detection rules
 * Each rule must implement this interface
 */
export interface DetectionRule {
  /** Unique name identifying this rule */
  name: DetectionRuleName;

  /** Human-readable description */
  description: string;

  /** Whether the rule is currently enabled */
  enabled: boolean;

  /**
   * Evaluate the rule against given context
   * @returns RuleResult with triggered status and details
   */
  evaluate(context: RuleEvaluationContext): Promise<RuleResult>;

  /**
   * Get current thresholds for this rule
   */
  getThresholds(): Promise<Record<string, number>>;

  /**
   * Update thresholds for this rule
   */
  setThresholds(thresholds: Record<string, number>): Promise<void>;
}

// ============================================
// RULE #1: FRESH-CONCENTRATED-DEPTH IMPACT
// ============================================

export interface FreshConcentratedDepthContext extends RuleEvaluationContext {
  walletAddress: string;
  conditionId: string;
  tradeSize: number;
}

export interface FreshConcentratedDepthData {
  // Wallet data
  walletAgeDays: number | null;
  firstTradeAt: Date | null;

  // Activity data
  concentration: number;
  topMarketConditionId: string | null;
  totalVolume: number;
  marketCount: number;

  // Trade data
  tradeSizeUsd: number;
  depthRatio: number | null;
  depth2tickLiquidity: number | null;
}

export interface FreshConcentratedDepthResult extends RuleResult {
  ruleName: 'FreshConcentratedDepthImpact';
  triggerValues: {
    walletAgeDays: number | null;
    concentration: number;
    tradeSizeUsd: number;
    depthRatio: number | null;
  };
  thresholdValues: {
    maxWalletAgeDays: number;
    minConcentrationPct: number;
    minTradeSizeUsd: number;
    minDepthRatio: number;
  };
}

// ============================================
// RULE #2: PRE-MOVE ADVANTAGE
// ============================================

export interface PreMoveAdvantageContext extends RuleEvaluationContext {
  walletAddress: string;
  conditionId: string;
  entryPrice: number;
  tradeSize: number;
  timestamp: Date;
}

export interface PreMoveAdvantageData {
  // Trade data
  entryPrice: number;
  tradeSizeUsd: number;
  tradeTimestamp: Date;

  // Price movement data (calculated after lookback window)
  priceAfterLookback: number | null;
  mtmGain: number | null; // Mark-to-market gain as decimal (0.08 = 8%)

  // Volatility data
  volatility24h: number | null;
  volatility30dMedian: number | null;
  isVolatileRegime: boolean;
}

export interface PreMoveAdvantageResult extends RuleResult {
  ruleName: 'PreMoveAdvantage';
  triggerValues: {
    tradeSizeUsd: number;
    entryPrice: number;
    priceAfterLookback: number | null;
    mtmGainPct: number | null;
    isVolatileRegime: boolean;
  };
  thresholdValues: {
    minTradeSizeUsd: number;
    minMtmGainPct: number;
    lookbackHours: number;
    volMultiplier: number;
  };
}

// ============================================
// RULE #3: COORDINATED CLUSTER
// ============================================

export interface CoordinatedClusterContext extends RuleEvaluationContext {
  conditionId: string;
  timeWindowHours?: number;
}

export interface ClusterWalletInfo {
  address: string;
  ageDays: number | null;
  notionalUsd: number;
  side: 'YES' | 'NO' | null;
  tradeCount: number;
  firstTradeInWindow: Date | null;
}

export interface CoordinatedClusterData {
  // Cluster data
  clusterId: string;
  clusterSize: number;
  wallets: ClusterWalletInfo[];

  // Aggregate metrics
  totalNotionalUsd: number;
  medianAgeDays: number | null;
  allSameSide: boolean;
  dominantSide: 'YES' | 'NO' | null;

  // Relationship data
  relationshipTypes: string[];
  avgStrength: number;
}

export interface CoordinatedClusterResult extends RuleResult {
  ruleName: 'CoordinatedCluster';
  triggerValues: {
    clusterId: string;
    clusterSize: number;
    totalNotionalUsd: number;
    medianAgeDays: number | null;
    allSameSide: boolean;
    walletAddresses: string[];
  };
  thresholdValues: {
    minClusterSize: number;
    minTotalNotionalUsd: number;
    maxMedianAgeDays: number;
    timeWindowHours: number;
  };
}

// ============================================
// CONFIDENCE SCORE HELPERS
// ============================================

/**
 * Normalize a value to 0-1 range using linear scaling
 */
export function normalizeLinear(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

/**
 * Normalize a value to 0-1 range using log scaling (for heavy-tailed distributions)
 */
export function normalizeLog(value: number, min: number, max: number): number {
  if (value <= 0 || min <= 0) return 0;
  const logValue = Math.log(value);
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  return Math.max(0, Math.min(1, (logValue - logMin) / (logMax - logMin)));
}

/**
 * Inverse normalize (lower value = higher score)
 */
export function normalizeInverse(value: number, min: number, max: number): number {
  return 1 - normalizeLinear(value, min, max);
}

/**
 * Calculate weighted sum of normalized scores
 */
export function calculateWeightedScore(
  scores: { value: number; weight: number }[]
): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
  return Math.min(1, Math.max(0, weightedSum / totalWeight));
}

/**
 * Map confidence score to severity level
 */
export function confidenceToSeverity(confidence: number): AlertSeverity {
  if (confidence >= 0.85) return 'CRITICAL';
  if (confidence >= 0.70) return 'HIGH';
  if (confidence >= 0.50) return 'MEDIUM';
  return 'LOW';
}
