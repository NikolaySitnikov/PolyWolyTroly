/**
 * Detection Engine
 *
 * The core orchestration service that runs all detection rules.
 * This engine:
 * - Loads and manages all detection rules
 * - Evaluates trades against applicable rules
 * - Handles alert deduplication
 * - Tracks metrics
 *
 * Entry points:
 * - evaluateTrade(): Called when a new CTF transfer is processed
 * - evaluateWallet(): Evaluate a wallet against all rules
 * - evaluateMarket(): Evaluate a market for cluster activity
 */

import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import { priceHistoryService } from "./priceHistoryService.js";
import { walletAutoAddService } from "./walletAutoAddService.js";
import { broadcastDetectionAlert } from "../../api/websocket.js";
import {
  freshConcentratedDepthRule,
  preMoveAdvantageRule,
  coordinatedClusterRule,
  type DetectionRule,
} from "./rules/index.js";
import type {
  DetectionRuleName,
  RuleEvaluationContext,
  RuleResult,
  DetectionEngineResult,
  DetectionAlert,
  CtfTransfer,
  AlertSeverity,
} from "./types.js";
import pino from "pino";

const logger = pino({ level: "info" });

// ============================================
// CONSTANTS
// ============================================

// Deduplication window: don't create duplicate alerts within this time
const DEDUP_WINDOW_HOURS = 24;

// Minimum interval between evaluations for the same wallet+market combo
const MIN_EVAL_INTERVAL_MS = 30 * 1000; // 30 seconds

// Rule priority (higher = run first, higher priority for conflicts)
const RULE_PRIORITY: Record<DetectionRuleName, number> = {
  FreshConcentratedDepthImpact: 1,
  PreMoveAdvantage: 2,
  CoordinatedCluster: 3,
};

// ============================================
// METRICS
// ============================================

interface EngineMetrics {
  evaluationsTotal: number;
  evaluationsSuccess: number;
  evaluationsError: number;
  rulesTriggered: Record<DetectionRuleName, number>;
  alertsCreated: number;
  lastEvaluationAt: Date | null;
}

// ============================================
// DETECTION ENGINE
// ============================================

class DetectionEngine {
  private rules: Map<DetectionRuleName, DetectionRule> = new Map();
  private initialized = false;
  private metrics: EngineMetrics = {
    evaluationsTotal: 0,
    evaluationsSuccess: 0,
    evaluationsError: 0,
    rulesTriggered: {
      FreshConcentratedDepthImpact: 0,
      PreMoveAdvantage: 0,
      CoordinatedCluster: 0,
    },
    alertsCreated: 0,
    lastEvaluationAt: null,
  };

  // Track recent evaluations to prevent rapid-fire
  private recentEvaluations: Map<string, number> = new Map();

  /**
   * Initialize the detection engine by loading all rules
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info({ msg: "Initializing detection engine..." });

    // Load all rules
    await this.loadRules();

    this.initialized = true;
    logger.info({
      msg: "Detection engine initialized",
      rulesLoaded: this.rules.size,
    });
  }

  /**
   * Load and configure all detection rules
   */
  async loadRules(): Promise<void> {
    // Register Rule #1: Fresh-Concentrated-Depth Impact
    this.rules.set("FreshConcentratedDepthImpact", freshConcentratedDepthRule);

    // Register Rule #2: Pre-Move Advantage
    this.rules.set("PreMoveAdvantage", preMoveAdvantageRule);

    // Register Rule #3: Coordinated Cluster
    this.rules.set("CoordinatedCluster", coordinatedClusterRule);

    // Load configurations from database for each rule
    for (const [name, rule] of this.rules.entries()) {
      try {
        await rule.getThresholds(); // This loads config from DB/cache
        logger.debug({
          msg: `Loaded rule: ${name}`,
          enabled: rule.enabled,
        });
      } catch (error) {
        logger.warn({
          msg: `Failed to load config for rule ${name}, using defaults`,
          error,
        });
      }
    }
  }

  /**
   * Get a specific rule by name
   */
  getRule(name: DetectionRuleName): DetectionRule | undefined {
    return this.rules.get(name);
  }

  /**
   * Get all rules sorted by priority (highest first)
   */
  getRulesByPriority(): DetectionRule[] {
    return Array.from(this.rules.values()).sort((a, b) => {
      return RULE_PRIORITY[b.name] - RULE_PRIORITY[a.name];
    });
  }

  /**
   * Get all enabled rules sorted by priority
   */
  getEnabledRules(): DetectionRule[] {
    return this.getRulesByPriority().filter((rule) => rule.enabled);
  }

  /**
   * Check if an evaluation should be throttled
   */
  private shouldThrottle(walletAddress: string, conditionId?: string): boolean {
    const key = `${walletAddress.toLowerCase()}:${conditionId || "all"}`;
    const lastEval = this.recentEvaluations.get(key);

    if (lastEval && Date.now() - lastEval < MIN_EVAL_INTERVAL_MS) {
      return true;
    }

    // Update last evaluation time
    this.recentEvaluations.set(key, Date.now());

    // Cleanup old entries periodically
    if (this.recentEvaluations.size > 10000) {
      const cutoff = Date.now() - MIN_EVAL_INTERVAL_MS * 2;
      for (const [k, v] of this.recentEvaluations.entries()) {
        if (v < cutoff) {
          this.recentEvaluations.delete(k);
        }
      }
    }

    return false;
  }

  /**
   * Evaluate a CTF transfer against all applicable rules
   *
   * This is the main entry point called from the CTF listener when a new
   * transfer is processed.
   *
   * @param transfer The CTF transfer to evaluate
   * @returns Detection engine result with triggered rules and created alerts
   */
  async evaluateTrade(transfer: CtfTransfer): Promise<DetectionEngineResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result: DetectionEngineResult = {
      evaluated: false,
      rulesTriggered: [],
      alertsCreated: [],
      errors: [],
    };

    // Validate transfer
    if (!transfer.toAddress || !transfer.conditionId) {
      return result;
    }

    const walletAddress = transfer.toAddress.toLowerCase();
    const conditionId = transfer.conditionId;

    // Check throttling
    if (this.shouldThrottle(walletAddress, conditionId)) {
      logger.debug({
        msg: "Evaluation throttled",
        walletAddress,
        conditionId,
      });
      return result;
    }

    this.metrics.evaluationsTotal++;

    try {
      // Build evaluation context from transfer
      const context: RuleEvaluationContext = {
        walletAddress,
        conditionId,
        tradeSize: await this.estimateTradeSize(transfer),
        txHash: transfer.txHash,
        timestamp: transfer.blockTimestamp || new Date(),
        // Entry price would need to be looked up from price history
        // For now we'll schedule it for later evaluation in Rule #2
      };

      // === Rule #1: Fresh-Concentrated-Depth Impact ===
      // Evaluate immediately if trade size meets threshold
      if (context.tradeSize && context.tradeSize > 0) {
        const rule1Result = await this.runRule(
          "FreshConcentratedDepthImpact",
          context
        );
        if (rule1Result) {
          result.rulesTriggered.push(rule1Result);
        }
      }

      // === Rule #2: Pre-Move Advantage ===
      // Schedule for delayed evaluation (can't evaluate MTM immediately)
      if (context.tradeSize && context.tradeSize > 0) {
        await this.schedulePreMoveEvaluation(transfer, context);
      }

      // === Rule #3: Coordinated Cluster ===
      // This is evaluated at the market level, not per-trade
      // We'll queue market evaluation to run periodically or on-demand
      // (Evaluated separately via evaluateMarket())

      // Create alerts for triggered rules
      for (const ruleResult of result.rulesTriggered) {
        if (ruleResult.triggered) {
          const alert = await this.createAlertFromResult(ruleResult, context);
          if (alert?.id) {
            result.alertsCreated.push(alert.id);
          }
        }
      }

      result.evaluated = true;
      this.metrics.evaluationsSuccess++;
      this.metrics.lastEvaluationAt = new Date();
    } catch (error) {
      this.metrics.evaluationsError++;
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      result.errors?.push(errorMsg);
      logger.error({
        msg: "Error evaluating trade",
        walletAddress,
        conditionId,
        error,
      });
    }

    return result;
  }

  /**
   * Evaluate a wallet against all applicable rules
   *
   * This can be called for manual evaluation of a specific wallet.
   *
   * @param walletAddress The wallet to evaluate
   * @param conditionId Optional: limit evaluation to specific market
   */
  async evaluateWallet(
    walletAddress: string,
    conditionId?: string
  ): Promise<DetectionEngineResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result: DetectionEngineResult = {
      evaluated: false,
      rulesTriggered: [],
      alertsCreated: [],
      errors: [],
    };

    const normalizedAddress = walletAddress.toLowerCase();

    // Check throttling
    if (this.shouldThrottle(normalizedAddress, conditionId)) {
      logger.debug({
        msg: "Wallet evaluation throttled",
        walletAddress: normalizedAddress,
      });
      return result;
    }

    this.metrics.evaluationsTotal++;

    try {
      // Build context
      const context: RuleEvaluationContext = {
        walletAddress: normalizedAddress,
        conditionId,
        timestamp: new Date(),
      };

      // For wallet-level evaluation, we need to get recent trades
      // and evaluate Rule #1 for each significant trade

      // Get recent wallet activity
      const activities = await detectionDb.getWalletActivity(normalizedAddress);

      // Filter to specified market if provided
      const targetActivities = conditionId
        ? activities.filter((a) => a.conditionId === conditionId)
        : activities;

      // Evaluate Rule #1 for recent significant positions
      for (const activity of targetActivities) {
        if (activity.totalVolume >= 3000) {
          // Min trade size threshold
          const activityContext: RuleEvaluationContext = {
            ...context,
            conditionId: activity.conditionId,
            tradeSize: activity.totalVolume,
          };

          const rule1Result = await this.runRule(
            "FreshConcentratedDepthImpact",
            activityContext
          );
          if (rule1Result?.triggered) {
            result.rulesTriggered.push(rule1Result);
          }
        }
      }

      // If we have a specific market, evaluate cluster activity
      if (conditionId) {
        const clusterContext: RuleEvaluationContext = {
          ...context,
          conditionId,
        };

        const rule3Result = await this.runRule(
          "CoordinatedCluster",
          clusterContext
        );
        if (rule3Result?.triggered) {
          result.rulesTriggered.push(rule3Result);
        }
      }

      // Create alerts for triggered rules
      for (const ruleResult of result.rulesTriggered) {
        if (ruleResult.triggered) {
          const alertContext: RuleEvaluationContext = {
            walletAddress: normalizedAddress,
            conditionId:
              (ruleResult.triggerValues as Record<string, unknown>)
                .conditionId as string || conditionId,
          };
          const alert = await this.createAlertFromResult(
            ruleResult,
            alertContext
          );
          if (alert?.id) {
            result.alertsCreated.push(alert.id);
          }
        }
      }

      result.evaluated = true;
      this.metrics.evaluationsSuccess++;
      this.metrics.lastEvaluationAt = new Date();
    } catch (error) {
      this.metrics.evaluationsError++;
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      result.errors?.push(errorMsg);
      logger.error({
        msg: "Error evaluating wallet",
        walletAddress,
        conditionId,
        error,
      });
    }

    return result;
  }

  /**
   * Evaluate a market for coordinated cluster activity
   *
   * @param conditionId The market condition ID to evaluate
   */
  async evaluateMarket(conditionId: string): Promise<DetectionEngineResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result: DetectionEngineResult = {
      evaluated: false,
      rulesTriggered: [],
      alertsCreated: [],
      errors: [],
    };

    this.metrics.evaluationsTotal++;

    try {
      const context: RuleEvaluationContext = {
        walletAddress: "", // Not applicable for market-level evaluation
        conditionId,
        timestamp: new Date(),
      };

      // Run Rule #3: Coordinated Cluster
      const rule3Result = await this.runRule("CoordinatedCluster", context);
      if (rule3Result?.triggered) {
        result.rulesTriggered.push(rule3Result);

        // Create alert with the first wallet from the cluster as the primary
        const alertContext: RuleEvaluationContext = {
          walletAddress: ((rule3Result.triggerValues as Record<string, unknown>)
            .walletAddresses as string[])?.[0] || "",
          conditionId,
        };

        const alert = await this.createAlertFromResult(rule3Result, alertContext);
        if (alert?.id) {
          result.alertsCreated.push(alert.id);
        }
      }

      result.evaluated = true;
      this.metrics.evaluationsSuccess++;
      this.metrics.lastEvaluationAt = new Date();
    } catch (error) {
      this.metrics.evaluationsError++;
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      result.errors?.push(errorMsg);
      logger.error({
        msg: "Error evaluating market for clusters",
        conditionId,
        error,
      });
    }

    return result;
  }

  /**
   * Run a specific rule against a context
   */
  private async runRule(
    ruleName: DetectionRuleName,
    context: RuleEvaluationContext
  ): Promise<RuleResult | null> {
    const rule = this.rules.get(ruleName);
    if (!rule || !rule.enabled) {
      return null;
    }

    try {
      const result = await rule.evaluate(context);

      if (result.triggered) {
        this.metrics.rulesTriggered[ruleName]++;
        logger.info({
          msg: `Rule triggered: ${ruleName}`,
          walletAddress: context.walletAddress,
          conditionId: context.conditionId,
          confidence: result.confidence,
          severity: result.severity,
        });
      }

      return result;
    } catch (error) {
      logger.error({
        msg: `Error running rule ${ruleName}`,
        error,
      });
      return null;
    }
  }

  /**
   * Schedule a trade for Pre-Move Advantage evaluation
   */
  private async schedulePreMoveEvaluation(
    transfer: CtfTransfer,
    context: RuleEvaluationContext
  ): Promise<void> {
    try {
      // Get current price as entry price
      const currentPrice = await priceHistoryService.getLatestPrice(
        transfer.conditionId!
      );

      if (!currentPrice) {
        logger.debug({
          msg: "No price data for Pre-Move scheduling",
          conditionId: transfer.conditionId,
        });
        return;
      }

      // Schedule pending evaluation
      await preMoveAdvantageRule.schedulePendingEvaluation(
        context.walletAddress,
        transfer.conditionId!,
        currentPrice.price,
        context.tradeSize || 0,
        transfer.blockTimestamp || new Date(),
        transfer.txHash
      );

      logger.debug({
        msg: "Scheduled Pre-Move evaluation",
        walletAddress: context.walletAddress,
        conditionId: transfer.conditionId,
        entryPrice: currentPrice.price,
      });
    } catch (error) {
      logger.warn({
        msg: "Failed to schedule Pre-Move evaluation",
        error,
      });
    }
  }

  /**
   * Estimate trade size in USD from a CTF transfer
   *
   * Polymarket shares are ERC-1155 tokens where:
   * - 1 share = 1 USDC on resolution if correct outcome
   * - Trade value in USD = shares * price_per_share
   * - Price is 0-1 representing the probability/price per share
   *
   * The amount in transfer is raw shares (no decimals adjustment needed for the trade value calculation).
   * However, ERC-1155 amounts from the contract may have decimals for precision.
   */
  private async estimateTradeSize(transfer: CtfTransfer): Promise<number> {
    // Get the share amount from the transfer
    // Polymarket outcome tokens use 1e6 decimals (like USDC)
    const shares = Number(transfer.amount) / 1e6;

    // If no conditionId, we can't look up price
    if (!transfer.conditionId) {
      logger.debug({
        msg: "No conditionId for trade size estimation, using shares only",
        shares,
        txHash: transfer.txHash,
      });
      // Return raw share count as fallback (will be inaccurate for high-priced outcomes)
      return shares;
    }

    try {
      // Get the latest price for this market
      const priceData = await priceHistoryService.getLatestPrice(transfer.conditionId);

      if (priceData) {
        // For YES outcomes, use the price directly
        // For NO outcomes, the price is (1 - YES price)
        let price = priceData.price;
        if (transfer.outcome === 'NO') {
          // NO tokens are priced as complement of YES price
          price = 1 - price;
        }

        // USD value = shares * price per share
        const usdValue = shares * price;

        logger.debug({
          msg: "Calculated trade size from price data",
          shares,
          price,
          outcome: transfer.outcome,
          usdValue,
          conditionId: transfer.conditionId,
        });

        return usdValue;
      }
    } catch (error) {
      logger.debug({
        msg: "Error fetching price for trade size estimation",
        conditionId: transfer.conditionId,
        error,
      });
    }

    // Fallback: Try fetching price directly from CLOB API
    try {
      const clobResponse = await fetch(`https://clob.polymarket.com/markets/${transfer.conditionId}`);
      if (clobResponse.ok) {
        const clobData = await clobResponse.json() as { tokens?: Array<{ outcome: string; price: number }> };
        if (clobData.tokens && clobData.tokens.length >= 2) {
          // Find the price for the correct outcome
          const yesToken = clobData.tokens.find(t => t.outcome === 'Yes');
          let price = yesToken?.price ?? 0.5;

          if (transfer.outcome === 'NO') {
            price = 1 - price;
          }

          const usdValue = shares * price;

          logger.debug({
            msg: "Calculated trade size from CLOB API fallback",
            shares,
            price,
            outcome: transfer.outcome,
            usdValue,
            conditionId: transfer.conditionId,
          });

          return usdValue;
        }
      }
    } catch (clobError) {
      logger.debug({
        msg: "CLOB API fallback failed",
        conditionId: transfer.conditionId,
        error: clobError,
      });
    }

    // Final fallback: no price data available at all
    // Return shares only (essentially assuming $1 per share) which is conservative
    // This is better than 50% because it at least preserves the relative magnitude
    logger.warn({
      msg: "No price data available - returning raw share count as fallback",
      shares,
      conditionId: transfer.conditionId,
      txHash: transfer.txHash,
    });
    return shares;
  }

  /**
   * Create an alert from a rule result
   * Handles deduplication
   */
  private async createAlertFromResult(
    result: RuleResult,
    context: RuleEvaluationContext
  ): Promise<DetectionAlert | null> {
    if (!result.triggered || !result.severity) {
      return null;
    }

    // Check for existing similar alert (deduplication)
    const hasDuplicate = await this.hasRecentDuplicateAlert(
      result.ruleName,
      context.walletAddress,
      context.conditionId
    );

    if (hasDuplicate) {
      logger.debug({
        msg: "Skipping duplicate alert",
        ruleName: result.ruleName,
        walletAddress: context.walletAddress,
        conditionId: context.conditionId,
      });
      return null;
    }

    // Get the rule to create the alert
    const rule = this.rules.get(result.ruleName);
    if (!rule) {
      return null;
    }

    // Use the rule's createAlert method (from BaseDetectionRule)
    const alert = await (rule as any).createAlert(result, context);

    if (alert) {
      this.metrics.alertsCreated++;
      logger.info({
        msg: "Alert created",
        alertId: alert.id,
        ruleName: result.ruleName,
        severity: result.severity,
        walletAddress: context.walletAddress,
      });

      // Broadcast to all connected WebSocket clients for instant UI updates
      try {
        broadcastDetectionAlert({
          id: alert.id,
          alertType: alert.alertType,
          severity: alert.severity,
          walletAddress: alert.walletAddress,
          conditionId: alert.conditionId,
          title: alert.title,
          description: alert.description,
          confidenceScore: alert.confidenceScore,
          detectedAt: alert.detectedAt.toISOString(),
        });
      } catch (broadcastError) {
        logger.warn({ msg: "Failed to broadcast detection alert", error: broadcastError });
      }

      // Auto-add wallet to whale database (non-blocking)
      // This ensures flagged wallets are immediately tracked and enriched
      walletAutoAddService.processAlert(alert).catch((autoAddError) => {
        logger.warn({
          msg: "Failed to auto-add wallet to database",
          walletAddress: alert.walletAddress,
          alertId: alert.id,
          error: autoAddError,
        });
      });
    }

    return alert;
  }

  /**
   * Check if a similar alert was recently created
   */
  private async hasRecentDuplicateAlert(
    ruleName: DetectionRuleName,
    walletAddress: string,
    conditionId?: string
  ): Promise<boolean> {
    const fromDate = new Date(
      Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000
    );

    const alerts = await detectionDb.getAlerts(
      {
        walletAddress,
        conditionId,
        fromDate,
      },
      { page: 1, limit: 10 }
    );

    return alerts.data.some((alert) => alert.detectionRule === ruleName);
  }

  /**
   * Process pending Pre-Move Advantage evaluations
   * Should be called periodically by a background job
   */
  async processPendingMtmEvaluations(limit: number = 100): Promise<{
    processed: number;
    triggered: number;
    errors: number;
  }> {
    return preMoveAdvantageRule.processPendingEvaluations(limit);
  }

  /**
   * Get engine metrics
   */
  getMetrics(): EngineMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      evaluationsTotal: 0,
      evaluationsSuccess: 0,
      evaluationsError: 0,
      rulesTriggered: {
        FreshConcentratedDepthImpact: 0,
        PreMoveAdvantage: 0,
        CoordinatedCluster: 0,
      },
      alertsCreated: 0,
      lastEvaluationAt: null,
    };
  }

  /**
   * Get engine health status
   */
  getHealthStatus(): {
    initialized: boolean;
    rulesLoaded: number;
    enabledRules: number;
    lastEvaluation: Date | null;
    metrics: EngineMetrics;
  } {
    return {
      initialized: this.initialized,
      rulesLoaded: this.rules.size,
      enabledRules: this.getEnabledRules().length,
      lastEvaluation: this.metrics.lastEvaluationAt,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Reload all rules (e.g., after config changes)
   */
  async reloadRules(): Promise<void> {
    this.rules.clear();
    await this.loadRules();
    logger.info({
      msg: "Detection rules reloaded",
      rulesLoaded: this.rules.size,
    });
  }

  /**
   * Enable or disable a specific rule
   */
  async setRuleEnabled(
    ruleName: DetectionRuleName,
    enabled: boolean
  ): Promise<void> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new Error(`Unknown rule: ${ruleName}`);
    }

    await (rule as any).setEnabled(enabled);
    logger.info({
      msg: `Rule ${enabled ? "enabled" : "disabled"}`,
      ruleName,
    });
  }

  /**
   * Update thresholds for a specific rule
   */
  async setRuleThresholds(
    ruleName: DetectionRuleName,
    thresholds: Record<string, number>
  ): Promise<void> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new Error(`Unknown rule: ${ruleName}`);
    }

    await rule.setThresholds(thresholds);
    logger.info({
      msg: "Rule thresholds updated",
      ruleName,
      thresholds,
    });
  }

  /**
   * Get rule configuration
   */
  async getRuleConfig(
    ruleName: DetectionRuleName
  ): Promise<{ enabled: boolean; thresholds: Record<string, number> } | null> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      return null;
    }

    const thresholds = await rule.getThresholds();
    return {
      enabled: rule.enabled,
      thresholds,
    };
  }

  /**
   * Get all rule configurations
   */
  async getAllRuleConfigs(): Promise<
    Array<{
      name: DetectionRuleName;
      description: string;
      enabled: boolean;
      thresholds: Record<string, number>;
      priority: number;
    }>
  > {
    const configs = [];

    for (const [name, rule] of this.rules.entries()) {
      const thresholds = await rule.getThresholds();
      configs.push({
        name,
        description: rule.description,
        enabled: rule.enabled,
        thresholds,
        priority: RULE_PRIORITY[name],
      });
    }

    // Sort by priority (highest first)
    return configs.sort((a, b) => b.priority - a.priority);
  }
}

// Export singleton instance
export const detectionEngine = new DetectionEngine();
