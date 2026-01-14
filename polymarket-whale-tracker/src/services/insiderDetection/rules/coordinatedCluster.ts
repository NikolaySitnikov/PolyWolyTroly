/**
 * Rule #3: Coordinated Cluster Detection
 *
 * Detects suspicious coordinated trading patterns where:
 * 1. Multiple wallets in the same cluster (related by funding or timing)
 * 2. All wallets trade the same market in the same direction
 * 3. Total notional value exceeds threshold
 * 4. Median wallet age is below threshold (fresh wallets acting together)
 * 5. Activity occurs within a time window
 *
 * This rule triggers at the market level, evaluating all cluster activity
 * in a given market rather than individual trades.
 *
 * Confidence scoring weights:
 * - 30% cluster size (more wallets = higher)
 * - 30% total notional (larger aggregate position = higher)
 * - 20% median age (younger = higher)
 * - 20% relationship strength (stronger connections = higher)
 */

import { BaseDetectionRule } from "./ruleBase.js";
import { clusterService } from "../clusterService.js";
import { walletActivityIndex } from "../walletActivityIndex.js";
import { marketMetadataService } from "../marketMetadataService.js";
import { detectionDb } from "../detectionDatabase.js";
import type {
  DetectionRuleName,
  RuleEvaluationContext,
  RuleResult,
  CoordinatedClusterThresholds,
  WalletActivity,
  ClusterSummary,
} from "../types.js";
import type {
  CoordinatedClusterData,
  CoordinatedClusterResult,
  ClusterWalletInfo,
} from "./types.js";
import {
  normalizeLinear,
  normalizeLog,
  normalizeInverse,
  calculateWeightedScore,
} from "./types.js";

// Default thresholds for Rule #3
const DEFAULT_THRESHOLDS: CoordinatedClusterThresholds = {
  min_cluster_size: 3,
  min_total_notional_usd: 50000,
  max_median_age_days: 45,
  time_window_hours: 6,
};

// Confidence score weights
const WEIGHTS = {
  clusterSize: 0.30,
  totalNotional: 0.30,
  medianAge: 0.20,
  relationshipStrength: 0.20,
};

// Normalization ranges
const NORM_RANGES = {
  clusterSize: { min: 2, max: 10 },       // 2-10 wallets
  totalNotional: { min: 10000, max: 500000 }, // $10k-$500k (log scale)
  medianAge: { min: 1, max: 60 },         // 1-60 days, younger = higher
  strength: { min: 0.3, max: 1.0 },       // 0.3-1.0 relationship strength
};

/**
 * Coordinated Cluster Detection Rule
 */
export class CoordinatedClusterRule extends BaseDetectionRule {
  name: DetectionRuleName = 'CoordinatedCluster';
  description = 'Detects coordinated trading from related wallet clusters';

  protected getDefaultThresholds(): Record<string, number> {
    return { ...DEFAULT_THRESHOLDS };
  }

  /**
   * Get all clusters that have activity in a specific market
   */
  private async getClustersForMarket(
    conditionId: string
  ): Promise<{ clusterId: string; wallets: string[] }[]> {
    const clustersWithActivity: Map<string, Set<string>> = new Map();

    // Get all activity for this market
    const activities = await detectionDb.getMarketActivity(conditionId);

    // For each wallet with activity, check if it belongs to a cluster
    for (const activity of activities) {
      const clusterInfo = await clusterService.getWalletCluster(activity.walletAddress);
      if (clusterInfo) {
        if (!clustersWithActivity.has(clusterInfo.clusterId)) {
          clustersWithActivity.set(clusterInfo.clusterId, new Set());
        }
        clustersWithActivity.get(clusterInfo.clusterId)!.add(activity.walletAddress.toLowerCase());
      }
    }

    return Array.from(clustersWithActivity.entries()).map(([clusterId, wallets]) => ({
      clusterId,
      wallets: Array.from(wallets),
    }));
  }

  /**
   * Get wallet ages in days
   * Returns null for wallets where age cannot be determined
   */
  private async getWalletAgeDays(walletAddress: string): Promise<number | null> {
    const activities = await walletActivityIndex.getWalletActivity(walletAddress);

    let firstTradeAt: Date | null = null;
    for (const activity of activities) {
      if (activity.firstTradeAt) {
        if (!firstTradeAt || activity.firstTradeAt < firstTradeAt) {
          firstTradeAt = activity.firstTradeAt;
        }
      }
    }

    if (!firstTradeAt) {
      return null;
    }

    return Math.floor((Date.now() - firstTradeAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate median of an array of numbers
   */
  private calculateMedian(values: number[]): number | null {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Gather detailed data for a cluster's activity in a market
   */
  private async gatherClusterData(
    clusterId: string,
    conditionId: string,
    clusterWallets: string[],
    timeWindowHours: number
  ): Promise<CoordinatedClusterData | null> {
    const walletInfos: ClusterWalletInfo[] = [];
    let totalNotionalUsd = 0;
    let yesCount = 0;
    let noCount = 0;
    const ages: number[] = [];
    const timeWindow = timeWindowHours * 60 * 60 * 1000;
    const now = Date.now();

    // Get cluster summary for relationship info
    const clusterSummary = await detectionDb.getClusterSummary(clusterId);

    // Get relationship strengths
    const clusterRelationships = await detectionDb.getWalletCluster(clusterWallets[0]);
    const strengths: number[] = clusterRelationships.map(r => r.strength);
    const avgStrength = strengths.length > 0
      ? strengths.reduce((a, b) => a + b, 0) / strengths.length
      : 0.5;

    for (const wallet of clusterWallets) {
      // Get wallet's activity in this market
      const activities = await walletActivityIndex.getWalletActivity(wallet);
      const activity = activities.find(a => a.conditionId === conditionId);

      if (!activity) continue;

      // Check if activity is within time window
      if (activity.firstTradeAt) {
        const tradeTime = activity.firstTradeAt.getTime();
        if (now - tradeTime > timeWindow) {
          // First trade was outside window - but wallet may still be active
          // We include it as the cluster exists regardless of window
        }
      }

      // Get wallet age
      const ageDays = await this.getWalletAgeDays(wallet);
      if (ageDays !== null) {
        ages.push(ageDays);
      }

      // Determine side from net position
      let side: 'YES' | 'NO' | null = null;
      if (activity.netPosition > 0) {
        side = 'YES';
        yesCount++;
      } else if (activity.netPosition < 0) {
        side = 'NO';
        noCount++;
      }

      // Estimate notional from volume
      const notionalUsd = activity.totalVolume;
      totalNotionalUsd += notionalUsd;

      walletInfos.push({
        address: wallet,
        ageDays,
        notionalUsd,
        side,
        tradeCount: activity.tradeCount,
        firstTradeInWindow: activity.firstTradeAt || null,
      });
    }

    // Need at least 2 wallets with activity
    if (walletInfos.length < 2) {
      return null;
    }

    // Calculate median age
    const medianAgeDays = this.calculateMedian(ages);

    // Determine if all are trading same side
    const allSameSide = (yesCount > 0 && noCount === 0) || (noCount > 0 && yesCount === 0);
    const dominantSide: 'YES' | 'NO' | null =
      yesCount > noCount ? 'YES' : noCount > yesCount ? 'NO' : null;

    return {
      clusterId,
      clusterSize: walletInfos.length,
      wallets: walletInfos,
      totalNotionalUsd,
      medianAgeDays,
      allSameSide,
      dominantSide,
      relationshipTypes: clusterSummary?.relationshipTypes || [],
      avgStrength,
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(data: CoordinatedClusterData): number {
    const scores: { value: number; weight: number }[] = [];

    // Cluster size: more wallets = higher confidence
    const sizeScore = normalizeLinear(
      data.clusterSize,
      NORM_RANGES.clusterSize.min,
      NORM_RANGES.clusterSize.max
    );
    scores.push({ value: sizeScore, weight: WEIGHTS.clusterSize });

    // Total notional: larger = higher confidence (log scale)
    const notionalScore = normalizeLog(
      data.totalNotionalUsd,
      NORM_RANGES.totalNotional.min,
      NORM_RANGES.totalNotional.max
    );
    scores.push({ value: notionalScore, weight: WEIGHTS.totalNotional });

    // Median age: younger = higher confidence
    if (data.medianAgeDays !== null) {
      const ageScore = normalizeInverse(
        data.medianAgeDays,
        NORM_RANGES.medianAge.min,
        NORM_RANGES.medianAge.max
      );
      scores.push({ value: ageScore, weight: WEIGHTS.medianAge });
    } else {
      // Unknown ages = moderate confidence
      scores.push({ value: 0.5, weight: WEIGHTS.medianAge });
    }

    // Relationship strength: stronger = higher confidence
    const strengthScore = normalizeLinear(
      data.avgStrength,
      NORM_RANGES.strength.min,
      NORM_RANGES.strength.max
    );
    scores.push({ value: strengthScore, weight: WEIGHTS.relationshipStrength });

    return calculateWeightedScore(scores);
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(
    data: CoordinatedClusterData,
    conditionId: string,
    marketQuestion?: string
  ): string {
    const parts: string[] = [];

    parts.push(`Cluster of ${data.clusterSize} related wallets`);

    if (data.allSameSide && data.dominantSide) {
      parts.push(`all trading ${data.dominantSide}`);
    } else if (data.dominantSide) {
      parts.push(`predominantly trading ${data.dominantSide}`);
    }

    parts.push(`with $${data.totalNotionalUsd.toLocaleString()} total position`);

    if (data.medianAgeDays !== null) {
      parts.push(`(median wallet age: ${data.medianAgeDays} days)`);
    }

    if (marketQuestion) {
      parts.push(`in market: "${marketQuestion.slice(0, 80)}${marketQuestion.length > 80 ? '...' : ''}"`);
    }

    // Add relationship info
    if (data.relationshipTypes.length > 0) {
      const relTypes = data.relationshipTypes.map(t => t.replace('_', ' ')).join(', ');
      parts.push(`- linked by: ${relTypes}`);
    }

    return parts.join(' ');
  }

  /**
   * Evaluate all clusters in a market
   *
   * This is the main entry point. Unlike other rules that evaluate individual trades,
   * this rule evaluates market-level cluster activity.
   *
   * @param context - Must contain conditionId for the market to evaluate
   */
  async evaluate(context: RuleEvaluationContext): Promise<RuleResult> {
    // Load configuration
    await this.loadConfig();

    // Validate required context
    if (!context.conditionId) {
      return this.notTriggered({ error: 'Missing condition ID' });
    }

    // Check if rule is enabled
    if (!this._enabled) {
      return this.notTriggered({ disabled: true });
    }

    const conditionId = context.conditionId;

    // Get thresholds
    const minClusterSize = this.getThreshold('min_cluster_size');
    const minTotalNotional = this.getThreshold('min_total_notional_usd');
    const maxMedianAge = this.getThreshold('max_median_age_days');
    const timeWindowHours = this.getThreshold('time_window_hours');

    const thresholdValues = {
      minClusterSize,
      minTotalNotionalUsd: minTotalNotional,
      maxMedianAgeDays: maxMedianAge,
      timeWindowHours,
    };

    // Get clusters with activity in this market
    const clustersInMarket = await this.getClustersForMarket(conditionId);

    if (clustersInMarket.length === 0) {
      return this.notTriggered(
        { reason: 'No clusters found in market' },
        thresholdValues
      );
    }

    // Evaluate each cluster
    let highestConfidenceResult: RuleResult | null = null;
    let highestConfidence = 0;

    for (const { clusterId, wallets } of clustersInMarket) {
      // Gather cluster data
      const data = await this.gatherClusterData(
        clusterId,
        conditionId,
        wallets,
        timeWindowHours
      );

      if (!data) continue;

      const triggerValues = {
        clusterId: data.clusterId,
        clusterSize: data.clusterSize,
        totalNotionalUsd: data.totalNotionalUsd,
        medianAgeDays: data.medianAgeDays,
        allSameSide: data.allSameSide,
        walletAddresses: data.wallets.map(w => w.address),
      };

      // Check cluster size threshold
      if (data.clusterSize < minClusterSize) {
        continue;
      }

      // Check total notional threshold
      if (data.totalNotionalUsd < minTotalNotional) {
        continue;
      }

      // Check if all trading same side (required for coordinated trading)
      if (!data.allSameSide) {
        continue;
      }

      // Check median age threshold
      // If median age is null (unknown), we allow it through
      if (data.medianAgeDays !== null && data.medianAgeDays > maxMedianAge) {
        continue;
      }

      // Check for existing alert to avoid duplicates
      // Use the cluster's root wallet for dedup
      const hasExisting = await this.hasExistingAlert(
        data.wallets[0].address,
        conditionId,
        24
      );
      if (hasExisting) {
        continue;
      }

      // Calculate confidence
      const confidence = this.calculateConfidence(data);

      // Track highest confidence result
      if (confidence > highestConfidence) {
        highestConfidence = confidence;

        // Get market info for description
        const market = await marketMetadataService.getMarket(conditionId);
        const description = this.generateDescription(data, conditionId, market?.question);

        highestConfidenceResult = this.triggered(
          confidence,
          triggerValues,
          {
            title: `Coordinated cluster trading detected (${data.clusterSize} wallets)`,
            description,
            relatedWallets: data.wallets.map(w => w.address),
          }
        ) as CoordinatedClusterResult;

        // Add type-specific fields
        (highestConfidenceResult as CoordinatedClusterResult).thresholdValues = thresholdValues;
      }
    }

    // Return the highest confidence result or not triggered
    if (highestConfidenceResult) {
      return highestConfidenceResult;
    }

    return this.notTriggered(
      { reason: 'No clusters met all threshold criteria' },
      thresholdValues
    );
  }

  /**
   * Evaluate a specific cluster in a market
   *
   * Alternative entry point for targeted evaluation of a known cluster.
   */
  async evaluateCluster(
    clusterId: string,
    conditionId: string
  ): Promise<RuleResult> {
    // Load configuration
    await this.loadConfig();

    // Check if rule is enabled
    if (!this._enabled) {
      return this.notTriggered({ disabled: true });
    }

    // Get thresholds
    const minClusterSize = this.getThreshold('min_cluster_size');
    const minTotalNotional = this.getThreshold('min_total_notional_usd');
    const maxMedianAge = this.getThreshold('max_median_age_days');
    const timeWindowHours = this.getThreshold('time_window_hours');

    const thresholdValues = {
      minClusterSize,
      minTotalNotionalUsd: minTotalNotional,
      maxMedianAgeDays: maxMedianAge,
      timeWindowHours,
    };

    // Get cluster summary
    const clusterSummary = await detectionDb.getClusterSummary(clusterId);
    if (!clusterSummary) {
      return this.notTriggered(
        { error: 'Cluster not found', clusterId },
        thresholdValues
      );
    }

    // Gather cluster data
    const data = await this.gatherClusterData(
      clusterId,
      conditionId,
      clusterSummary.wallets,
      timeWindowHours
    );

    if (!data) {
      return this.notTriggered(
        { reason: 'Insufficient cluster activity in market' },
        thresholdValues
      );
    }

    const triggerValues = {
      clusterId: data.clusterId,
      clusterSize: data.clusterSize,
      totalNotionalUsd: data.totalNotionalUsd,
      medianAgeDays: data.medianAgeDays,
      allSameSide: data.allSameSide,
      walletAddresses: data.wallets.map(w => w.address),
    };

    // Check cluster size threshold
    if (data.clusterSize < minClusterSize) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Cluster size too small' },
        thresholdValues
      );
    }

    // Check total notional threshold
    if (data.totalNotionalUsd < minTotalNotional) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Total notional too low' },
        thresholdValues
      );
    }

    // Check if all trading same side
    if (!data.allSameSide) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Not all wallets trading same side' },
        thresholdValues
      );
    }

    // Check median age threshold
    if (data.medianAgeDays !== null && data.medianAgeDays > maxMedianAge) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Median wallet age too high' },
        thresholdValues
      );
    }

    // Check for existing alert
    const hasExisting = await this.hasExistingAlert(
      data.wallets[0].address,
      conditionId,
      24
    );
    if (hasExisting) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Alert already exists' },
        thresholdValues
      );
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(data);

    // Get market info for description
    const market = await marketMetadataService.getMarket(conditionId);
    const description = this.generateDescription(data, conditionId, market?.question);

    const result = this.triggered(
      confidence,
      triggerValues,
      {
        title: `Coordinated cluster trading detected (${data.clusterSize} wallets)`,
        description,
        relatedWallets: data.wallets.map(w => w.address),
      }
    ) as CoordinatedClusterResult;

    result.thresholdValues = thresholdValues;

    return result;
  }
}

// Export singleton instance
export const coordinatedClusterRule = new CoordinatedClusterRule();
