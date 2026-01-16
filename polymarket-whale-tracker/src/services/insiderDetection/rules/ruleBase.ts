/**
 * Base class for Detection Rules
 *
 * Provides common functionality for all detection rules:
 * - Configuration loading from database
 * - Threshold management
 * - Alert creation helpers
 * - Confidence score utilities
 */

import { detectionDb } from "../detectionDatabase.js";
import { detectionCache } from "../detectionCache.js";
import type {
  DetectionRuleName,
  DetectionRuleConfig,
  RuleResult,
  RuleEvaluationContext,
  AlertSeverity,
  DetectionAlert,
} from "../types.js";
import type { DetectionRule } from "./types.js";
import { confidenceToSeverity } from "./types.js";

// Cache TTL for rule config: 5 minutes
const RULE_CONFIG_CACHE_TTL = 5 * 60;

/**
 * Abstract base class for detection rules
 *
 * Subclasses must implement:
 * - evaluate(): The core detection logic
 * - getDefaultThresholds(): Default threshold values for the rule
 */
export abstract class BaseDetectionRule implements DetectionRule {
  abstract name: DetectionRuleName;
  abstract description: string;

  protected _enabled: boolean = false; // Default to OFF - user must explicitly enable
  protected _thresholds: Record<string, number> = {};

  /**
   * Get default thresholds for this rule
   * Subclasses must implement this to provide their default values
   */
  protected abstract getDefaultThresholds(): Record<string, number>;

  /**
   * Evaluate the rule against given context
   * Subclasses must implement this with their detection logic
   */
  abstract evaluate(context: RuleEvaluationContext): Promise<RuleResult>;

  /**
   * Check if the rule is currently enabled
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Load rule configuration from database/cache
   */
  protected async loadConfig(): Promise<DetectionRuleConfig | null> {
    // Check cache first
    const cached = await detectionCache.getRuleConfig(this.name);
    if (cached) {
      this._enabled = cached.enabled;
      this._thresholds = cached.thresholds;
      return cached;
    }

    // Load from database
    const config = await detectionDb.getRuleConfig(this.name);
    if (config) {
      this._enabled = config.enabled;
      this._thresholds = config.thresholds;
      await detectionCache.setRuleConfig(this.name, config);
      return config;
    }

    // Use defaults if no config exists
    this._thresholds = this.getDefaultThresholds();
    return null;
  }

  /**
   * Get current thresholds for this rule
   * Loads from database if not cached
   */
  async getThresholds(): Promise<Record<string, number>> {
    await this.loadConfig();
    return { ...this._thresholds };
  }

  /**
   * Update thresholds for this rule
   */
  async setThresholds(thresholds: Record<string, number>): Promise<void> {
    await detectionDb.updateRuleConfig(this.name, { thresholds });

    // Invalidate cache
    await detectionCache.invalidateRuleConfig(this.name);

    // Update local state
    this._thresholds = thresholds;
  }

  /**
   * Enable or disable the rule
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.loadConfig();

    await detectionDb.updateRuleConfig(this.name, { enabled });

    await detectionCache.invalidateRuleConfig(this.name);
    this._enabled = enabled;
  }

  /**
   * Get a specific threshold value, falling back to default
   */
  protected getThreshold(key: string): number {
    if (key in this._thresholds) {
      return this._thresholds[key];
    }
    const defaults = this.getDefaultThresholds();
    return defaults[key] ?? 0;
  }

  /**
   * Create a RuleResult with triggered = false
   * Use this for early exits when rule conditions are not met
   */
  protected notTriggered(
    triggerValues: Record<string, unknown> = {},
    thresholdValues: Record<string, unknown> = {}
  ): RuleResult {
    return {
      ruleName: this.name,
      triggered: false,
      confidence: 0,
      triggerValues,
      thresholdValues: thresholdValues || this._thresholds,
    };
  }

  /**
   * Create a RuleResult with triggered = true
   */
  protected triggered(
    confidence: number,
    triggerValues: Record<string, unknown>,
    options?: {
      title?: string;
      description?: string;
      relatedWallets?: string[];
      relatedTxHashes?: string[];
    }
  ): RuleResult {
    const severity = confidenceToSeverity(confidence);

    return {
      ruleName: this.name,
      triggered: true,
      confidence,
      severity,
      triggerValues,
      thresholdValues: { ...this._thresholds },
      title: options?.title,
      description: options?.description,
      relatedWallets: options?.relatedWallets,
      relatedTxHashes: options?.relatedTxHashes,
    };
  }

  /**
   * Create an alert from a rule result
   */
  async createAlert(
    result: RuleResult,
    context: RuleEvaluationContext
  ): Promise<DetectionAlert | null> {
    if (!result.triggered || !result.severity) {
      return null;
    }

    // Determine alert type based on rule name
    let alertType: 'timing' | 'size' | 'pattern' | 'cluster' | 'funding';
    switch (this.name) {
      case 'FreshConcentratedDepthImpact':
        alertType = 'pattern';
        break;
      case 'PreMoveAdvantage':
        alertType = 'timing';
        break;
      case 'CoordinatedCluster':
        alertType = 'cluster';
        break;
      default:
        alertType = 'pattern';
    }

    const alert: Omit<DetectionAlert, 'id'> = {
      alertType,
      severity: result.severity,
      confidenceScore: result.confidence,
      walletAddress: context.walletAddress,
      conditionId: context.conditionId,
      detectionRule: this.name,
      triggerValues: result.triggerValues,
      thresholdValues: result.thresholdValues,
      title: result.title || `${this.name} Alert`,
      description: result.description || this.description,
      relatedTxHashes: result.relatedTxHashes || (context.txHash ? [context.txHash] : undefined),
      relatedWallets: result.relatedWallets,
      status: 'new',
      detectedAt: new Date(),
    };

    const alertId = await detectionDb.createAlert(alert);

    return {
      ...alert,
      id: alertId,
    };
  }

  /**
   * Check for existing alert to avoid duplicates
   * Returns true if a similar alert already exists
   */
  protected async hasExistingAlert(
    walletAddress: string,
    conditionId: string | undefined,
    lookbackHours: number = 24
  ): Promise<boolean> {
    const fromDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const alerts = await detectionDb.getAlerts(
      {
        walletAddress,
        conditionId,
        fromDate,
      },
      { page: 1, limit: 1 }
    );

    return alerts.data.some(alert => alert.detectionRule === this.name);
  }
}
