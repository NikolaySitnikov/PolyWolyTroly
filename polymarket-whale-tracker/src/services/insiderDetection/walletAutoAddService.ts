/**
 * Wallet Auto-Add Service
 *
 * Automatically adds wallets that trigger detection alerts to the whale database.
 * This ensures that any suspicious wallet is immediately tracked and enriched
 * with full trading data.
 *
 * Features:
 * - Auto-adds wallets to whale database when detection alerts are created
 * - Tags wallets with detection metadata (rule, severity, confidence)
 * - Fetches and stores historical deposit data
 * - Triggers enrichment to populate trading metrics
 * - Deduplication to prevent redundant additions
 */

import { db } from "../database.js";
import { historicalDeposits } from "../historicalDeposits.js";
import pino from "pino";
import type { DetectionAlert, AlertSeverity, DetectionRuleName } from "./types.js";

const logger = pino({ level: "info" });

// Configuration
const CONFIG = {
  // Minimum severity to auto-add wallet (LOW, MEDIUM, HIGH, CRITICAL)
  minSeverityToAdd: "MEDIUM" as AlertSeverity,
  // Minimum confidence score (0-1) to auto-add
  minConfidenceToAdd: 0.5,
  // Whether to add wallets from each rule type
  enabledRules: {
    FreshConcentratedDepthImpact: true,
    PreMoveAdvantage: true,
    CoordinatedCluster: true,
  } as Record<DetectionRuleName, boolean>,
};

// Severity ordering for comparison
const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// Track recent additions to prevent rapid duplicates
const recentAdditions = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Metrics
let metrics = {
  walletsAdded: 0,
  walletsSkipped: 0,
  walletsAlreadyExist: 0,
  enrichmentTriggered: 0,
  errors: 0,
};

/**
 * Wallet Auto-Add Service
 */
export const walletAutoAddService = {
  /**
   * Process a detection alert and add wallet to database if criteria met
   *
   * @param alert The detection alert that was created
   * @returns Object indicating whether wallet was added
   */
  async processAlert(alert: DetectionAlert): Promise<{
    added: boolean;
    reason: string;
    walletAddress: string;
  }> {
    const walletAddress = alert.walletAddress.toLowerCase();

    try {
      // Check if this is a test alert (skip test alerts)
      if (alert.title.includes("[TEST]")) {
        metrics.walletsSkipped++;
        return {
          added: false,
          reason: "Test alert - skipped",
          walletAddress,
        };
      }

      // Check severity threshold
      if (!this.meetsSeverityThreshold(alert.severity)) {
        metrics.walletsSkipped++;
        return {
          added: false,
          reason: `Severity ${alert.severity} below threshold ${CONFIG.minSeverityToAdd}`,
          walletAddress,
        };
      }

      // Check confidence threshold
      const confidenceScore = alert.confidenceScore ?? 0;
      if (confidenceScore < CONFIG.minConfidenceToAdd) {
        metrics.walletsSkipped++;
        return {
          added: false,
          reason: `Confidence ${confidenceScore.toFixed(2)} below threshold ${CONFIG.minConfidenceToAdd}`,
          walletAddress,
        };
      }

      // Check if rule is enabled for auto-add
      const ruleName = alert.detectionRule as DetectionRuleName;
      if (!CONFIG.enabledRules[ruleName]) {
        metrics.walletsSkipped++;
        return {
          added: false,
          reason: `Rule ${alert.detectionRule} not enabled for auto-add`,
          walletAddress,
        };
      }

      // Check deduplication (recent addition)
      const lastAddition = recentAdditions.get(walletAddress);
      if (lastAddition && Date.now() - lastAddition < DEDUP_WINDOW_MS) {
        metrics.walletsSkipped++;
        return {
          added: false,
          reason: "Recently added - deduplication",
          walletAddress,
        };
      }

      // Check if wallet already exists in whale database
      const existingWallet = await db.getWallet(walletAddress);
      if (existingWallet) {
        metrics.walletsAlreadyExist++;
        logger.debug({
          msg: "Wallet already exists in whale database",
          walletAddress,
          alertId: alert.id,
        });
        return {
          added: false,
          reason: "Wallet already exists in database",
          walletAddress,
        };
      }

      // Add wallet to database with historical deposits
      await this.addWalletToDatabase(walletAddress, alert);

      // Update deduplication tracking
      recentAdditions.set(walletAddress, Date.now());

      // Cleanup old dedup entries
      this.cleanupDedupEntries();

      metrics.walletsAdded++;

      logger.info({
        msg: "Wallet auto-added to whale database from detection alert",
        walletAddress,
        alertId: alert.id,
        rule: alert.detectionRule,
        severity: alert.severity,
        confidence: alert.confidenceScore,
      });

      return {
        added: true,
        reason: "Successfully added to whale database",
        walletAddress,
      };
    } catch (error) {
      metrics.errors++;
      logger.error({
        msg: "Error auto-adding wallet to database",
        walletAddress,
        alertId: alert.id,
        error,
      });

      return {
        added: false,
        reason: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        walletAddress,
      };
    }
  },

  /**
   * Add wallet to database with historical deposit data
   * Marks wallet source as 'detection' to distinguish from deposit-tracking wallets
   */
  async addWalletToDatabase(
    walletAddress: string,
    alert: DetectionAlert
  ): Promise<void> {
    // Fetch historical deposits from blockchain
    const deposits = await historicalDeposits.getHistoricalDeposits(walletAddress);

    if (deposits.length > 0) {
      // Use createWalletWithHistory for wallets with deposit history
      // Pass 'detection' as source to mark this wallet as added via insider detection
      await db.createWalletWithHistory(walletAddress, deposits, 'detection');

      logger.debug({
        msg: "Created wallet with historical deposits (source: detection)",
        walletAddress,
        depositCount: deposits.length,
        totalDeposited: deposits.reduce((sum, d) => sum + d.amount, 0),
      });
    } else {
      // For wallets without deposits (e.g., funded differently), create minimal entry
      // Pass 'detection' as source to mark this wallet as added via insider detection
      await db.createWallet(walletAddress, 0, `detection_${alert.id}`, 'detection');

      logger.debug({
        msg: "Created wallet without deposit history (source: detection)",
        walletAddress,
        alertId: alert.id,
      });
    }

    metrics.enrichmentTriggered++;
  },

  /**
   * Check if alert severity meets the minimum threshold
   */
  meetsSeverityThreshold(severity: AlertSeverity): boolean {
    return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[CONFIG.minSeverityToAdd];
  },

  /**
   * Clean up old deduplication entries
   */
  cleanupDedupEntries(): void {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [address, timestamp] of recentAdditions.entries()) {
      if (timestamp < cutoff) {
        recentAdditions.delete(address);
      }
    }
  },

  /**
   * Get current configuration
   */
  getConfig(): typeof CONFIG {
    return { ...CONFIG };
  },

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<typeof CONFIG>): void {
    if (updates.minSeverityToAdd !== undefined) {
      CONFIG.minSeverityToAdd = updates.minSeverityToAdd;
    }
    if (updates.minConfidenceToAdd !== undefined) {
      CONFIG.minConfidenceToAdd = updates.minConfidenceToAdd;
    }
    if (updates.enabledRules !== undefined) {
      Object.assign(CONFIG.enabledRules, updates.enabledRules);
    }

    logger.info({
      msg: "Wallet auto-add config updated",
      config: CONFIG,
    });
  },

  /**
   * Get metrics
   */
  getMetrics(): typeof metrics {
    return { ...metrics };
  },

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    metrics = {
      walletsAdded: 0,
      walletsSkipped: 0,
      walletsAlreadyExist: 0,
      enrichmentTriggered: 0,
      errors: 0,
    };
  },
};
