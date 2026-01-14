/**
 * Rule #1: Fresh-Concentrated-Depth Impact Detection
 *
 * Detects suspicious trading patterns where:
 * 1. Wallet is newly created (< N days old)
 * 2. Wallet activity is highly concentrated in one market (>= N% of volume)
 * 3. Trade size is significant (>= $N)
 * 4. Trade represents a large portion of available liquidity (depth ratio >= N)
 *
 * All four conditions must be met for the rule to trigger.
 *
 * Confidence scoring weights:
 * - 30% wallet age (younger = higher)
 * - 25% concentration (higher = higher)
 * - 25% depth ratio (higher = higher)
 * - 20% trade size (larger = higher)
 */

import { BaseDetectionRule } from "./ruleBase.js";
import { walletActivityIndex } from "../walletActivityIndex.js";
import { marketDepthService } from "../marketDepthService.js";
import { marketMetadataService } from "../marketMetadataService.js";
import type {
  DetectionRuleName,
  RuleEvaluationContext,
  RuleResult,
  FreshConcentratedDepthThresholds,
} from "../types.js";
import type { FreshConcentratedDepthData, FreshConcentratedDepthResult } from "./types.js";
import {
  normalizeInverse,
  normalizeLinear,
  normalizeLog,
  calculateWeightedScore,
} from "./types.js";

// Default thresholds for Rule #1
const DEFAULT_THRESHOLDS: FreshConcentratedDepthThresholds = {
  max_wallet_age_days: 14,
  min_concentration_pct: 85,
  min_trade_size_usd: 3000,
  min_depth_ratio: 3.0,
};

// Confidence score weights
const WEIGHTS = {
  walletAge: 0.30,
  concentration: 0.25,
  depthRatio: 0.25,
  tradeSize: 0.20,
};

// Normalization ranges
const NORM_RANGES = {
  walletAge: { min: 1, max: 30 },       // 1-30 days, younger = higher score
  concentration: { min: 50, max: 100 }, // 50-100%, higher = higher score
  depthRatio: { min: 1, max: 10 },      // 1-10x, higher = higher score
  tradeSize: { min: 1000, max: 50000 }, // $1k-$50k, larger = higher score (log scale)
};

/**
 * Fresh-Concentrated-Depth Impact Detection Rule
 */
export class FreshConcentratedDepthRule extends BaseDetectionRule {
  name: DetectionRuleName = 'FreshConcentratedDepthImpact';
  description = 'Detects new wallets with high concentration making impactful trades';

  protected getDefaultThresholds(): Record<string, number> {
    return { ...DEFAULT_THRESHOLDS };
  }

  /**
   * Gather all data needed for rule evaluation
   */
  private async gatherData(
    walletAddress: string,
    conditionId: string,
    tradeSizeUsd: number
  ): Promise<FreshConcentratedDepthData> {
    // Get wallet activity and concentration
    const activities = await walletActivityIndex.getWalletActivity(walletAddress);
    const concentration = await walletActivityIndex.getWalletConcentration(walletAddress);

    // Find first trade timestamp across all markets
    let firstTradeAt: Date | null = null;
    for (const activity of activities) {
      if (activity.firstTradeAt) {
        if (!firstTradeAt || activity.firstTradeAt < firstTradeAt) {
          firstTradeAt = activity.firstTradeAt;
        }
      }
    }

    // Calculate wallet age in days
    let walletAgeDays: number | null = null;
    if (firstTradeAt) {
      walletAgeDays = Math.floor(
        (Date.now() - firstTradeAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Get depth ratio for this market
    const depthRatio = await marketDepthService.calculateDepthRatio(
      conditionId,
      tradeSizeUsd,
      2 // Use 2-tick depth
    );

    // Get liquidity info
    const liquidity = await marketDepthService.getLiquidityAtTick(conditionId, 2);

    return {
      walletAgeDays,
      firstTradeAt,
      concentration: concentration.topMarket?.volumeShare || 0,
      topMarketConditionId: concentration.topMarket?.conditionId || null,
      totalVolume: concentration.totalVolume,
      marketCount: concentration.marketCount,
      tradeSizeUsd,
      depthRatio,
      depth2tickLiquidity: liquidity?.total || null,
    };
  }

  /**
   * Calculate confidence score based on how far beyond thresholds the values are
   */
  private calculateConfidence(data: FreshConcentratedDepthData): number {
    const scores: { value: number; weight: number }[] = [];

    // Wallet age: younger = higher confidence (inverse normalization)
    if (data.walletAgeDays !== null) {
      const ageScore = normalizeInverse(
        data.walletAgeDays,
        NORM_RANGES.walletAge.min,
        NORM_RANGES.walletAge.max
      );
      scores.push({ value: ageScore, weight: WEIGHTS.walletAge });
    } else {
      // Unknown age = maximum risk
      scores.push({ value: 1.0, weight: WEIGHTS.walletAge });
    }

    // Concentration: higher = higher confidence
    const concentrationScore = normalizeLinear(
      data.concentration,
      NORM_RANGES.concentration.min,
      NORM_RANGES.concentration.max
    );
    scores.push({ value: concentrationScore, weight: WEIGHTS.concentration });

    // Depth ratio: higher = higher confidence (log scale for heavy-tailed distribution)
    if (data.depthRatio !== null) {
      const depthScore = normalizeLog(
        data.depthRatio,
        NORM_RANGES.depthRatio.min,
        NORM_RANGES.depthRatio.max
      );
      scores.push({ value: depthScore, weight: WEIGHTS.depthRatio });
    } else {
      // No depth data = moderate risk
      scores.push({ value: 0.5, weight: WEIGHTS.depthRatio });
    }

    // Trade size: larger = higher confidence (log scale)
    const sizeScore = normalizeLog(
      data.tradeSizeUsd,
      NORM_RANGES.tradeSize.min,
      NORM_RANGES.tradeSize.max
    );
    scores.push({ value: sizeScore, weight: WEIGHTS.tradeSize });

    return calculateWeightedScore(scores);
  }

  /**
   * Generate human-readable description of the alert
   */
  private generateDescription(
    data: FreshConcentratedDepthData,
    conditionId: string,
    marketQuestion?: string
  ): string {
    const parts: string[] = [];

    if (data.walletAgeDays !== null) {
      parts.push(`${data.walletAgeDays}-day-old wallet`);
    } else {
      parts.push('New wallet with unknown age');
    }

    parts.push(`with ${data.concentration.toFixed(1)}% concentration`);
    parts.push(`made $${data.tradeSizeUsd.toLocaleString()} trade`);

    if (data.depthRatio !== null) {
      parts.push(`representing ${data.depthRatio.toFixed(1)}x available liquidity`);
    }

    if (marketQuestion) {
      parts.push(`in market: "${marketQuestion.slice(0, 100)}${marketQuestion.length > 100 ? '...' : ''}"`);
    }

    return parts.join(' ');
  }

  /**
   * Evaluate the rule against a trade context
   */
  async evaluate(context: RuleEvaluationContext): Promise<RuleResult> {
    // Load configuration
    await this.loadConfig();

    // Validate required context
    if (!context.walletAddress) {
      return this.notTriggered({ error: 'Missing wallet address' });
    }

    if (!context.conditionId) {
      return this.notTriggered({ error: 'Missing condition ID' });
    }

    if (!context.tradeSize || context.tradeSize <= 0) {
      return this.notTriggered({ error: 'Missing or invalid trade size' });
    }

    // Check if rule is enabled
    if (!this._enabled) {
      return this.notTriggered({ disabled: true });
    }

    const walletAddress = context.walletAddress.toLowerCase();
    const conditionId = context.conditionId;
    const tradeSizeUsd = context.tradeSize;

    // Get thresholds
    const maxAgeDays = this.getThreshold('max_wallet_age_days');
    const minConcentration = this.getThreshold('min_concentration_pct');
    const minTradeSize = this.getThreshold('min_trade_size_usd');
    const minDepthRatio = this.getThreshold('min_depth_ratio');

    const thresholdValues = {
      maxWalletAgeDays: maxAgeDays,
      minConcentrationPct: minConcentration,
      minTradeSizeUsd: minTradeSize,
      minDepthRatio: minDepthRatio,
    };

    // Check trade size threshold first (quick exit)
    if (tradeSizeUsd < minTradeSize) {
      return this.notTriggered(
        { tradeSizeUsd, reason: 'Below minimum trade size' },
        thresholdValues
      );
    }

    // Gather all data
    const data = await this.gatherData(walletAddress, conditionId, tradeSizeUsd);

    const triggerValues = {
      walletAgeDays: data.walletAgeDays,
      concentration: data.concentration,
      tradeSizeUsd: data.tradeSizeUsd,
      depthRatio: data.depthRatio,
    };

    // Check wallet age threshold
    // If wallet age is unknown, treat as new (passes threshold)
    const passesAgeCheck = data.walletAgeDays === null || data.walletAgeDays <= maxAgeDays;
    if (!passesAgeCheck) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Wallet too old' },
        thresholdValues
      );
    }

    // Check concentration threshold
    if (data.concentration < minConcentration) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Concentration too low' },
        thresholdValues
      );
    }

    // Check depth ratio threshold
    // If depth ratio is null (no liquidity data), skip this check
    if (data.depthRatio !== null && data.depthRatio < minDepthRatio) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Depth ratio too low' },
        thresholdValues
      );
    }

    // All conditions met - check for existing alert to avoid duplicates
    const hasExisting = await this.hasExistingAlert(walletAddress, conditionId, 24);
    if (hasExisting) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Alert already exists' },
        thresholdValues
      );
    }

    // Calculate confidence score
    const confidence = this.calculateConfidence(data);

    // Get market info for description
    const market = await marketMetadataService.getMarket(conditionId);
    const description = this.generateDescription(data, conditionId, market?.question);

    // Create triggered result
    const result = this.triggered(
      confidence,
      triggerValues,
      {
        title: `Fresh wallet with concentrated large trade detected`,
        description,
        relatedTxHashes: context.txHash ? [context.txHash] : undefined,
      }
    ) as FreshConcentratedDepthResult;

    // Add type-specific fields
    result.thresholdValues = thresholdValues;

    return result;
  }
}

// Export singleton instance
export const freshConcentratedDepthRule = new FreshConcentratedDepthRule();
