/**
 * Rule #2: Pre-Move Advantage Detection
 *
 * Detects trades that gain significant value shortly after execution,
 * which may indicate the trader had advance knowledge of upcoming price movements.
 *
 * This rule requires delayed evaluation:
 * 1. When a trade occurs, schedule it for evaluation after lookback_hours
 * 2. At evaluation time, calculate MTM gain
 * 3. If MTM gain exceeds threshold (adjusted for volatility regime), trigger alert
 *
 * Confidence scoring weights:
 * - 40% MTM gain (higher gain = higher confidence)
 * - 25% trade size (larger = higher)
 * - 20% volatility regime (volatile = higher)
 * - 15% timing (closer to price move = higher)
 *
 * Key concepts:
 * - MTM (Mark-to-Market): Current value vs entry value
 * - Volatility regime: High volatility markets require higher MTM threshold
 * - Lookback window: Time after trade to evaluate (default: 1 hour)
 */

import { BaseDetectionRule } from "./ruleBase.js";
import { priceHistoryService } from "../priceHistoryService.js";
import { marketMetadataService } from "../marketMetadataService.js";
import { detectionDb } from "../detectionDatabase.js";
import type {
  DetectionRuleName,
  RuleEvaluationContext,
  RuleResult,
  PreMoveAdvantageThresholds,
  PendingMtmEvaluation,
} from "../types.js";
import type { PreMoveAdvantageData, PreMoveAdvantageResult } from "./types.js";
import {
  normalizeLinear,
  normalizeLog,
  calculateWeightedScore,
} from "./types.js";

// Default thresholds for Rule #2
const DEFAULT_THRESHOLDS: PreMoveAdvantageThresholds = {
  min_trade_size_usd: 3000,
  min_mtm_gain_pct: 8,
  lookback_hours: 1,
  vol_multiplier: 1.5,
};

// Confidence score weights
const WEIGHTS = {
  mtmGain: 0.40,
  tradeSize: 0.25,
  volatility: 0.20,
  timing: 0.15,
};

// Normalization ranges
const NORM_RANGES = {
  mtmGain: { min: 0.05, max: 0.50 },       // 5%-50% gain
  tradeSize: { min: 1000, max: 100000 },   // $1k-$100k
  volatility: { baseline: 0.3, volatile: 1.0 }, // volatile = higher score
  timing: { min: 0, max: 6 },              // 0-6 hours before move
};

/**
 * Pre-Move Advantage Detection Rule
 *
 * This rule is different from others because it requires delayed evaluation.
 * The workflow is:
 * 1. Trade occurs → schedulePendingEvaluation()
 * 2. After lookback_hours → processPendingEvaluations()
 * 3. If MTM gain threshold met → evaluate() returns triggered=true
 */
export class PreMoveAdvantageRule extends BaseDetectionRule {
  name: DetectionRuleName = 'PreMoveAdvantage';
  description = 'Detects trades that gain significant value within lookback window';

  protected getDefaultThresholds(): Record<string, number> {
    return { ...DEFAULT_THRESHOLDS };
  }

  /**
   * Schedule a trade for future MTM evaluation
   *
   * Called when a new trade is detected. Creates a pending evaluation
   * record that will be processed after the lookback window.
   *
   * @param walletAddress Trader's wallet address
   * @param conditionId Market condition ID
   * @param entryPrice Trade execution price
   * @param tradeSizeUsd Trade size in USD
   * @param tradeTimestamp Time of trade execution
   * @param txHash Transaction hash
   * @returns Pending evaluation ID
   */
  async schedulePendingEvaluation(
    walletAddress: string,
    conditionId: string,
    entryPrice: number,
    tradeSizeUsd: number,
    tradeTimestamp: Date,
    txHash?: string
  ): Promise<number | null> {
    await this.loadConfig();

    // Check if rule is enabled
    if (!this._enabled) {
      return null;
    }

    // Check minimum trade size
    const minTradeSize = this.getThreshold('min_trade_size_usd');
    if (tradeSizeUsd < minTradeSize) {
      return null;
    }

    // Calculate evaluation time
    const lookbackHours = this.getThreshold('lookback_hours');
    const evaluateAt = new Date(
      tradeTimestamp.getTime() + lookbackHours * 60 * 60 * 1000
    );

    // Create pending evaluation record
    const evaluation: Omit<PendingMtmEvaluation, 'id' | 'evaluated' | 'evaluationResult'> = {
      walletAddress: walletAddress.toLowerCase(),
      conditionId,
      tradeTimestamp,
      entryPrice,
      tradeSizeUsd,
      txHash,
      evaluateAt,
    };

    return detectionDb.createPendingMtmEvaluation(evaluation);
  }

  /**
   * Gather data needed for rule evaluation
   */
  private async gatherData(
    conditionId: string,
    entryPrice: number,
    tradeSizeUsd: number,
    tradeTimestamp: Date,
    lookbackHours: number,
    side: 'YES' | 'NO' = 'YES'
  ): Promise<PreMoveAdvantageData> {
    // Calculate MTM using priceHistoryService
    const mtmResult = await priceHistoryService.calculateMTM(
      conditionId,
      entryPrice,
      tradeTimestamp,
      lookbackHours,
      side
    );

    // Get volatility data
    const [volatility24h, volatility30d] = await Promise.all([
      priceHistoryService.getVolatility(conditionId, 24),
      priceHistoryService.getVolatility(conditionId, 24 * 30),
    ]);

    // Determine volatile regime
    const volMultiplier = this.getThreshold('vol_multiplier');
    const isVolatileRegime = await priceHistoryService.isVolatileRegime(
      conditionId,
      24,
      168, // 7 days
      volMultiplier
    );

    return {
      entryPrice,
      tradeSizeUsd,
      tradeTimestamp,
      priceAfterLookback: mtmResult?.priceAtEvaluation ?? null,
      mtmGain: mtmResult?.mtmGain ?? null,
      volatility24h,
      volatility30dMedian: volatility30d,
      isVolatileRegime,
    };
  }

  /**
   * Calculate confidence score based on how significant the trade advantage is
   */
  private calculateConfidence(data: PreMoveAdvantageData): number {
    const scores: { value: number; weight: number }[] = [];

    // MTM gain: higher = more suspicious
    if (data.mtmGain !== null) {
      const mtmScore = normalizeLinear(
        Math.abs(data.mtmGain),
        NORM_RANGES.mtmGain.min,
        NORM_RANGES.mtmGain.max
      );
      scores.push({ value: mtmScore, weight: WEIGHTS.mtmGain });
    } else {
      scores.push({ value: 0, weight: WEIGHTS.mtmGain });
    }

    // Trade size: larger trades = more suspicious
    const sizeScore = normalizeLog(
      data.tradeSizeUsd,
      NORM_RANGES.tradeSize.min,
      NORM_RANGES.tradeSize.max
    );
    scores.push({ value: sizeScore, weight: WEIGHTS.tradeSize });

    // Volatility regime: profitable trades in volatile markets = more suspicious
    const volScore = data.isVolatileRegime
      ? NORM_RANGES.volatility.volatile
      : NORM_RANGES.volatility.baseline;
    scores.push({ value: volScore, weight: WEIGHTS.volatility });

    // Timing score: we consider how quickly the gain was realized
    // For now, use a fixed moderate score since we evaluate at fixed lookback
    scores.push({ value: 0.5, weight: WEIGHTS.timing });

    return calculateWeightedScore(scores);
  }

  /**
   * Generate human-readable description of the alert
   */
  private generateDescription(
    data: PreMoveAdvantageData,
    conditionId: string,
    lookbackHours: number,
    marketQuestion?: string
  ): string {
    const parts: string[] = [];

    parts.push(`$${data.tradeSizeUsd.toLocaleString()} trade`);

    if (data.mtmGain !== null) {
      const gainPct = (data.mtmGain * 100).toFixed(1);
      parts.push(`gained ${gainPct}% within ${lookbackHours} hour${lookbackHours > 1 ? 's' : ''}`);
    }

    if (data.isVolatileRegime) {
      parts.push('(volatile market)');
    }

    if (marketQuestion) {
      parts.push(`in market: "${marketQuestion.slice(0, 80)}${marketQuestion.length > 80 ? '...' : ''}"`);
    }

    return parts.join(' ');
  }

  /**
   * Get the effective MTM threshold based on volatility regime
   *
   * In volatile markets, we expect larger swings, so we require
   * a higher MTM gain to trigger.
   */
  private getEffectiveMtmThreshold(isVolatile: boolean): number {
    const baseMtmPct = this.getThreshold('min_mtm_gain_pct');
    const volMultiplier = this.getThreshold('vol_multiplier');

    if (isVolatile) {
      return baseMtmPct * volMultiplier;
    }
    return baseMtmPct;
  }

  /**
   * Evaluate a trade for pre-move advantage
   *
   * This is the core evaluation logic. It's called:
   * 1. During processPendingEvaluations() for scheduled evaluations
   * 2. Can also be called directly for immediate evaluation if price data is available
   *
   * @param context Evaluation context with trade details
   * @returns RuleResult indicating if rule triggered
   */
  async evaluate(context: RuleEvaluationContext): Promise<RuleResult> {
    await this.loadConfig();

    // Validate required context
    if (!context.walletAddress) {
      return this.notTriggered({ error: 'Missing wallet address' });
    }

    if (!context.conditionId) {
      return this.notTriggered({ error: 'Missing condition ID' });
    }

    if (context.entryPrice === undefined || context.entryPrice <= 0) {
      return this.notTriggered({ error: 'Missing or invalid entry price' });
    }

    if (!context.tradeSize || context.tradeSize <= 0) {
      return this.notTriggered({ error: 'Missing or invalid trade size' });
    }

    if (!context.timestamp) {
      return this.notTriggered({ error: 'Missing trade timestamp' });
    }

    // Check if rule is enabled
    if (!this._enabled) {
      return this.notTriggered({ disabled: true });
    }

    const walletAddress = context.walletAddress.toLowerCase();
    const conditionId = context.conditionId;
    const entryPrice = context.entryPrice;
    const tradeSizeUsd = context.tradeSize;
    const tradeTimestamp = context.timestamp;
    const side = context.side ?? 'YES';

    // Get thresholds
    const minTradeSize = this.getThreshold('min_trade_size_usd');
    const minMtmGainPct = this.getThreshold('min_mtm_gain_pct');
    const lookbackHours = this.getThreshold('lookback_hours');
    const volMultiplier = this.getThreshold('vol_multiplier');

    const thresholdValues = {
      minTradeSizeUsd: minTradeSize,
      minMtmGainPct: minMtmGainPct,
      lookbackHours: lookbackHours,
      volMultiplier: volMultiplier,
    };

    // Check minimum trade size
    if (tradeSizeUsd < minTradeSize) {
      return this.notTriggered(
        { tradeSizeUsd, reason: 'Below minimum trade size' },
        thresholdValues
      );
    }

    // Gather price data
    const data = await this.gatherData(
      conditionId,
      entryPrice,
      tradeSizeUsd,
      tradeTimestamp,
      lookbackHours,
      side
    );

    const triggerValues = {
      tradeSizeUsd: data.tradeSizeUsd,
      entryPrice: data.entryPrice,
      priceAfterLookback: data.priceAfterLookback,
      mtmGainPct: data.mtmGain !== null ? data.mtmGain * 100 : null,
      isVolatileRegime: data.isVolatileRegime,
    };

    // Check if we have MTM data
    if (data.mtmGain === null) {
      return this.notTriggered(
        { ...triggerValues, reason: 'Price data unavailable for MTM calculation' },
        thresholdValues
      );
    }

    // Get effective threshold (adjusted for volatility)
    const effectiveThreshold = this.getEffectiveMtmThreshold(data.isVolatileRegime);
    const mtmGainPct = data.mtmGain * 100;

    // Check if MTM gain exceeds threshold
    if (mtmGainPct < effectiveThreshold) {
      return this.notTriggered(
        {
          ...triggerValues,
          effectiveThresholdPct: effectiveThreshold,
          reason: 'MTM gain below threshold',
        },
        thresholdValues
      );
    }

    // Check for existing alert to avoid duplicates
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
    const description = this.generateDescription(
      data,
      conditionId,
      lookbackHours,
      market?.question
    );

    // Create triggered result
    const result = this.triggered(
      confidence,
      triggerValues,
      {
        title: `Trade with suspicious ${mtmGainPct.toFixed(1)}% gain detected`,
        description,
        relatedTxHashes: context.txHash ? [context.txHash] : undefined,
      }
    ) as PreMoveAdvantageResult;

    // Add type-specific fields
    result.thresholdValues = thresholdValues;

    return result;
  }

  /**
   * Process pending MTM evaluations
   *
   * This is the scheduled job that runs periodically to evaluate
   * trades whose lookback window has elapsed.
   *
   * @param limit Maximum number of evaluations to process
   * @returns Number of evaluations processed and alerts created
   */
  async processPendingEvaluations(limit: number = 100): Promise<{
    processed: number;
    triggered: number;
    errors: number;
  }> {
    const results = {
      processed: 0,
      triggered: 0,
      errors: 0,
    };

    // Get pending evaluations that are ready
    const pending = await detectionDb.getPendingMtmEvaluations(limit);

    for (const evaluation of pending) {
      try {
        // Build evaluation context
        const context: RuleEvaluationContext = {
          walletAddress: evaluation.walletAddress,
          conditionId: evaluation.conditionId,
          entryPrice: evaluation.entryPrice,
          tradeSize: evaluation.tradeSizeUsd,
          timestamp: evaluation.tradeTimestamp,
          txHash: evaluation.txHash,
          side: 'YES', // Default to YES; could be stored in evaluation if needed
        };

        // Evaluate the trade
        const result = await this.evaluate(context);
        results.processed++;

        // Update evaluation record
        const evaluationResult: PendingMtmEvaluation['evaluationResult'] = {
          mtmGain: (result.triggerValues as Record<string, unknown>).mtmGainPct as number / 100 || 0,
          priceAtEvaluation: (result.triggerValues as Record<string, unknown>).priceAfterLookback as number || 0,
          alertCreated: result.triggered,
        };

        if (result.triggered) {
          // Create alert
          const alert = await this.createAlert(result, context);
          if (alert) {
            evaluationResult.alertId = alert.id;
            results.triggered++;
          }
        }

        // Mark evaluation as complete
        await detectionDb.markMtmEvaluationComplete(evaluation.id!, evaluationResult);
      } catch (error) {
        console.error(
          `[PreMoveAdvantage] Error processing evaluation ${evaluation.id}:`,
          error
        );
        results.errors++;
      }
    }

    return results;
  }

  /**
   * Clean up old completed evaluations
   *
   * @param olderThanDays Delete evaluations completed more than N days ago
   */
  async cleanupOldEvaluations(olderThanDays: number = 7): Promise<number> {
    return detectionDb.cleanupOldMtmEvaluations(olderThanDays);
  }
}

// Export singleton instance
export const preMoveAdvantageRule = new PreMoveAdvantageRule();
