/**
 * CTF Event Listener
 *
 * Listens for ERC-1155 TransferSingle and TransferBatch events
 * on the Polymarket CTF Exchange contract to track outcome token movements.
 *
 * Key design decisions:
 * - Follows same pattern as blockchain.ts for consistency
 * - Uses polling mode (WebSocket subscription not supported by all RPC providers)
 * - Deduplicates events using Redis cache
 * - Stores transfers in ctf_transfers table for analysis
 * - Health monitoring with heartbeat checks
 * - Integrates with detection engine for real-time insider trading detection
 */

import {
  createPublicClient,
  webSocket,
  http,
  type Log,
  decodeEventLog,
  type Address,
} from "viem";
import { polygon } from "viem/chains";
import { config } from "../../config/index.js";
import { CONTRACTS, ERC1155_ABI, ZERO_ADDRESS } from "../../utils/constants.js";
import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import { walletActivityIndex } from "./walletActivityIndex.js";
import type { CtfTransfer, DetectionEngineResult } from "./types.js";
import pino from "pino";

const logger = pino({ level: "info" });

// Configuration
const MAX_CONSECUTIVE_ERRORS = 5;
const RESTART_DELAY_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_STALE_MS = 60000;
const POLLING_INTERVAL_MS = 3000; // 3 seconds for CTF events

// Viem clients
const wsClient = createPublicClient({
  chain: polygon,
  transport: webSocket(config.alchemy.wssUrl, {
    reconnect: {
      attempts: 10,
      delay: 1000,
    },
  }),
});

const httpClient = createPublicClient({
  chain: polygon,
  transport: http(config.alchemy.httpUrl),
});

// Health tracking state
let isRunning = false;
let lastEventTime: Date | null = null;
let lastHeartbeatTime: Date | null = null;
let listenerHealthy = false;
let listenerStartTime: Date | null = null;
let consecutiveErrors = 0;
let currentUnwatchSingle: (() => void) | null = null;
let currentUnwatchBatch: (() => void) | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

// Stats tracking
let transfersProcessed = 0;
let transfersSkippedDuplicate = 0;

// Detection engine integration state - default to OFF, user must explicitly enable
let detectionEnabled = false;
let detectionQueue: Array<Omit<CtfTransfer, "id">> = [];
const MAX_DETECTION_QUEUE_SIZE = 10000;
let detectionEvaluationsProcessed = 0;
let detectionAlertsTriggered = 0;

export interface CtfListenerHealthStatus {
  isRunning: boolean;
  lastEventTime: Date | null;
  lastHeartbeatTime: Date | null;
  healthy: boolean;
  startTime: Date | null;
  consecutiveErrors: number;
  transfersProcessed: number;
  transfersSkippedDuplicate: number;
  // Detection engine integration stats
  detectionEnabled: boolean;
  detectionQueueLength: number;
  detectionEvaluationsProcessed: number;
  detectionAlertsTriggered: number;
}

/**
 * Look up the real market condition ID from a token ID
 *
 * IMPORTANT: Polymarket token IDs are NOT the same as condition IDs!
 * Token IDs are derived from condition IDs via a complex hash function and cannot
 * be reverse-engineered. We must look up the mapping in our markets database.
 *
 * Returns the condition ID and outcome (YES/NO), or null if not found.
 */
async function lookupMarketByTokenId(tokenIdBigInt: bigint): Promise<{
  conditionId: string;
  outcome: 'YES' | 'NO';
} | null> {
  const tokenIdStr = tokenIdBigInt.toString();

  try {
    // First check our database
    const result = await detectionDb.getMarketByTokenId(tokenIdStr);
    if (result) {
      return {
        conditionId: result.market.conditionId,
        outcome: result.outcome,
      };
    }

    // Not in database - try on-demand lookup from Gamma API
    // This handles closed/resolved markets that aren't in our regular sync
    const { marketMetadataService } = await import("./marketMetadataService.js");
    const market = await marketMetadataService.lookupAndStoreMarketByTokenId(tokenIdStr);

    if (market) {
      // Now check which outcome this token is (YES or NO)
      const resultAfterLookup = await detectionDb.getMarketByTokenId(tokenIdStr);
      if (resultAfterLookup) {
        return {
          conditionId: resultAfterLookup.market.conditionId,
          outcome: resultAfterLookup.outcome,
        };
      }
    }

    // Still not found - this token may be from a very old market or multi-outcome market
    logger.debug({
      msg: "Could not find market for token ID (not in DB, not in Gamma API)",
      tokenId: tokenIdStr.substring(0, 20) + "...",
    });
    return null;
  } catch (error) {
    logger.error({
      msg: "Error looking up market by token ID",
      tokenId: tokenIdStr.substring(0, 20) + "...",
      error,
    });
    return null;
  }
}

/**
 * Classify transfer type based on from/to addresses
 */
function classifyTransfer(from: string, to: string): "mint" | "burn" | "transfer" {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  if (fromLower === ZERO_ADDRESS.toLowerCase()) {
    return "mint";
  }
  if (toLower === ZERO_ADDRESS.toLowerCase()) {
    return "burn";
  }
  return "transfer";
}

/**
 * Process a single TransferSingle event
 */
async function processTransferSingle(log: Log): Promise<void> {
  try {
    if (!log.transactionHash || log.blockNumber === null) {
      return;
    }

    // Decode the event
    const decoded = decodeEventLog({
      abi: ERC1155_ABI,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName !== "TransferSingle") {
      return;
    }

    const { from, to, id, value } = decoded.args as {
      operator: Address;
      from: Address;
      to: Address;
      id: bigint;
      value: bigint;
    };

    // Create unique key for deduplication
    const logIndex = log.logIndex ?? 0;
    const dedupKey = `${log.transactionHash}:${logIndex}`;

    // Check if already processed
    const alreadyProcessed = await detectionCache.isCtfTransferProcessed(dedupKey);
    if (alreadyProcessed) {
      transfersSkippedDuplicate++;
      return;
    }

    // Acquire lock
    const lockAcquired = await detectionCache.acquireCtfTransferLock(dedupKey);
    if (!lockAcquired) {
      return;
    }

    // Get block timestamp
    let blockTimestamp: Date | undefined;
    try {
      const block = await httpClient.getBlock({ blockNumber: log.blockNumber });
      blockTimestamp = new Date(Number(block.timestamp) * 1000);
    } catch (err) {
      logger.warn({ msg: "Failed to get block timestamp", error: err });
    }

    const transferType = classifyTransfer(from, to);

    // Skip mints and burns for now - focus on wallet-to-wallet transfers
    // Mints/burns are market-making operations
    if (transferType !== "transfer") {
      await detectionCache.markCtfTransferProcessed(dedupKey);
      return;
    }

    // Look up the real market condition ID from the token ID
    // This is critical for accurate price lookups and trade size calculations
    const marketLookup = await lookupMarketByTokenId(id);
    const conditionId = marketLookup?.conditionId;
    const outcome = marketLookup?.outcome;

    if (!conditionId) {
      logger.debug({
        msg: "Unknown market for token - skipping detection evaluation",
        tokenId: id.toString().substring(0, 20) + "...",
        txHash: log.transactionHash,
      });
      // Still record the transfer but with null conditionId
    }

    // Create transfer record
    const transfer: Omit<CtfTransfer, "id"> = {
      txHash: log.transactionHash,
      fromAddress: from,
      toAddress: to,
      tokenId: id.toString(),
      amount: value,
      conditionId,
      outcome,
      blockNumber: Number(log.blockNumber),
      blockTimestamp,
      logIndex,
    };

    // Store in database
    await detectionDb.recordCtfTransfer(transfer);
    transfersProcessed++;

    // Update wallet activity index for both parties
    try {
      await walletActivityIndex.processTransfer(transfer);
    } catch (err) {
      logger.warn({ msg: "Failed to update wallet activity", error: err });
    }

    // Trigger detection evaluation (async, non-blocking)
    // This evaluates the transfer against all detection rules
    if (detectionEnabled) {
      ctfEventListener._evaluateTransfer(transfer).catch((err) => {
        logger.warn({ msg: "Detection evaluation failed", error: err, txHash: transfer.txHash });
      });
    }

    // Mark as processed
    await detectionCache.markCtfTransferProcessed(dedupKey);

    logger.debug({
      msg: "CTF TransferSingle processed",
      from,
      to,
      tokenId: id.toString(),
      amount: value.toString(),
    });
  } catch (error) {
    logger.error({ msg: "Error processing TransferSingle", error });
    throw error;
  }
}

/**
 * Process a TransferBatch event (multiple tokens in one tx)
 */
async function processTransferBatch(log: Log): Promise<void> {
  try {
    if (!log.transactionHash || log.blockNumber === null) {
      return;
    }

    // Decode the event
    const decoded = decodeEventLog({
      abi: ERC1155_ABI,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName !== "TransferBatch") {
      return;
    }

    const { from, to, ids, values } = decoded.args as {
      operator: Address;
      from: Address;
      to: Address;
      ids: bigint[];
      values: bigint[];
    };

    // Get block timestamp once for all transfers
    let blockTimestamp: Date | undefined;
    try {
      const block = await httpClient.getBlock({ blockNumber: log.blockNumber });
      blockTimestamp = new Date(Number(block.timestamp) * 1000);
    } catch (err) {
      logger.warn({ msg: "Failed to get block timestamp", error: err });
    }

    // Process each transfer in the batch
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const value = values[i];
      const logIndex = (log.logIndex ?? 0) + i; // Synthetic index for batch items

      const dedupKey = `${log.transactionHash}:${log.logIndex ?? 0}:${i}`;

      // Check if already processed
      const alreadyProcessed = await detectionCache.isCtfTransferProcessed(dedupKey);
      if (alreadyProcessed) {
        transfersSkippedDuplicate++;
        continue;
      }

      // Acquire lock
      const lockAcquired = await detectionCache.acquireCtfTransferLock(dedupKey);
      if (!lockAcquired) {
        continue;
      }

      const transferType = classifyTransfer(from, to);

      // Skip mints and burns
      if (transferType !== "transfer") {
        await detectionCache.markCtfTransferProcessed(dedupKey);
        continue;
      }

      // Look up the real market condition ID from the token ID
      const marketLookup = await lookupMarketByTokenId(id);
      const conditionId = marketLookup?.conditionId;
      const outcome = marketLookup?.outcome;

      const transfer: Omit<CtfTransfer, "id"> = {
        txHash: log.transactionHash,
        fromAddress: from,
        toAddress: to,
        tokenId: id.toString(),
        amount: value,
        conditionId,
        outcome,
        blockNumber: Number(log.blockNumber),
        blockTimestamp,
        logIndex,
      };

      await detectionDb.recordCtfTransfer(transfer);
      transfersProcessed++;

      // Update wallet activity index for both parties
      try {
        await walletActivityIndex.processTransfer(transfer);
      } catch (err) {
        logger.warn({ msg: "Failed to update wallet activity in batch", error: err });
      }

      // Trigger detection evaluation (async, non-blocking)
      if (detectionEnabled) {
        ctfEventListener._evaluateTransfer(transfer).catch((err) => {
          logger.warn({ msg: "Detection evaluation failed in batch", error: err, txHash: transfer.txHash });
        });
      }

      await detectionCache.markCtfTransferProcessed(dedupKey);
    }

    logger.debug({
      msg: "CTF TransferBatch processed",
      from,
      to,
      count: ids.length,
    });
  } catch (error) {
    logger.error({ msg: "Error processing TransferBatch", error });
    throw error;
  }
}

export const ctfEventListener = {
  /**
   * Get listener health status
   */
  getHealthStatus(): CtfListenerHealthStatus {
    const heartbeatFresh = lastHeartbeatTime
      ? Date.now() - lastHeartbeatTime.getTime() < HEARTBEAT_STALE_MS
      : false;
    const isHealthy = isRunning && listenerHealthy && heartbeatFresh;

    return {
      isRunning,
      lastEventTime,
      lastHeartbeatTime,
      healthy: isHealthy,
      startTime: listenerStartTime,
      consecutiveErrors,
      transfersProcessed,
      transfersSkippedDuplicate,
      // Detection engine integration stats
      detectionEnabled,
      detectionQueueLength: detectionQueue.length,
      detectionEvaluationsProcessed,
      detectionAlertsTriggered,
    };
  },

  /**
   * Heartbeat check - verifies RPC connection
   */
  async _heartbeat(): Promise<void> {
    try {
      const blockNumber = await httpClient.getBlockNumber();
      lastHeartbeatTime = new Date();
      logger.debug({ msg: "CTF Listener heartbeat OK", blockNumber: blockNumber.toString() });
    } catch (error) {
      logger.warn({ msg: "CTF Listener heartbeat failed", error });
    }
  },

  /**
   * Start heartbeat interval
   */
  _startHeartbeat(): void {
    this._heartbeat();
    heartbeatInterval = setInterval(() => {
      this._heartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  },

  /**
   * Stop heartbeat interval
   */
  _stopHeartbeat(): void {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  },

  /**
   * Set up TransferSingle event watcher
   */
  _setupTransferSingleWatcher(): () => void {
    return wsClient.watchContractEvent({
      address: CONTRACTS.CTF_EXCHANGE as `0x${string}`,
      abi: ERC1155_ABI,
      eventName: "TransferSingle",
      poll: true,
      pollingInterval: POLLING_INTERVAL_MS,
      onLogs: async (logs) => {
        lastEventTime = new Date();
        listenerHealthy = true;
        consecutiveErrors = 0;

        for (const log of logs) {
          try {
            await processTransferSingle(log);
          } catch (error) {
            logger.error({ msg: "Error in TransferSingle handler", error });
          }
        }
      },
      onError: (error) => {
        consecutiveErrors++;
        logger.error({
          msg: `CTF TransferSingle polling error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`,
          error,
        });

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          logger.warn({ msg: "Too many CTF listener errors, restarting..." });
          this._restartListener();
        }
      },
    });
  },

  /**
   * Set up TransferBatch event watcher
   */
  _setupTransferBatchWatcher(): () => void {
    return wsClient.watchContractEvent({
      address: CONTRACTS.CTF_EXCHANGE as `0x${string}`,
      abi: ERC1155_ABI,
      eventName: "TransferBatch",
      poll: true,
      pollingInterval: POLLING_INTERVAL_MS,
      onLogs: async (logs) => {
        lastEventTime = new Date();
        listenerHealthy = true;
        consecutiveErrors = 0;

        for (const log of logs) {
          try {
            await processTransferBatch(log);
          } catch (error) {
            logger.error({ msg: "Error in TransferBatch handler", error });
          }
        }
      },
      onError: (error) => {
        consecutiveErrors++;
        logger.error({
          msg: `CTF TransferBatch polling error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`,
          error,
        });

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          logger.warn({ msg: "Too many CTF listener errors, restarting..." });
          this._restartListener();
        }
      },
    });
  },

  /**
   * Restart listener after errors
   */
  _restartListener(): void {
    // Stop current watchers
    if (currentUnwatchSingle) {
      currentUnwatchSingle();
      currentUnwatchSingle = null;
    }
    if (currentUnwatchBatch) {
      currentUnwatchBatch();
      currentUnwatchBatch = null;
    }

    consecutiveErrors = 0;
    listenerHealthy = false;

    setTimeout(() => {
      logger.info({ msg: "Restarting CTF event listener..." });
      currentUnwatchSingle = this._setupTransferSingleWatcher();
      currentUnwatchBatch = this._setupTransferBatchWatcher();
      listenerHealthy = true;
      logger.info({ msg: "CTF event listener restarted successfully" });
    }, RESTART_DELAY_MS);
  },

  /**
   * Start listening for CTF transfer events
   */
  async startListening(): Promise<void> {
    if (isRunning) {
      logger.warn({ msg: "CTF listener already running" });
      return;
    }

    isRunning = true;
    listenerStartTime = new Date();
    listenerHealthy = true;
    consecutiveErrors = 0;
    transfersProcessed = 0;
    transfersSkippedDuplicate = 0;

    logger.info({ msg: "🚀 Starting CTF event listener..." });
    logger.info({
      msg: `📊 Watching CTF Exchange: ${CONTRACTS.CTF_EXCHANGE}`,
    });

    // Start heartbeat
    this._startHeartbeat();

    // Set up event watchers
    currentUnwatchSingle = this._setupTransferSingleWatcher();
    currentUnwatchBatch = this._setupTransferBatchWatcher();

    logger.info({ msg: "✅ CTF event listener started - watching for ERC-1155 transfers" });
  },

  /**
   * Stop listening
   */
  async stopListening(): Promise<void> {
    logger.info({ msg: "Stopping CTF event listener..." });

    isRunning = false;
    listenerHealthy = false;
    this._stopHeartbeat();

    if (currentUnwatchSingle) {
      currentUnwatchSingle();
      currentUnwatchSingle = null;
    }
    if (currentUnwatchBatch) {
      currentUnwatchBatch();
      currentUnwatchBatch = null;
    }

    logger.info({
      msg: "CTF event listener stopped",
      transfersProcessed,
      transfersSkippedDuplicate,
    });
  },

  /**
   * Get current block number (for testing)
   */
  async getCurrentBlock(): Promise<bigint> {
    return await httpClient.getBlockNumber();
  },

  // ============================================
  // DETECTION ENGINE INTEGRATION
  // ============================================

  /**
   * Enable or disable detection engine evaluation for transfers
   */
  setDetectionEnabled(enabled: boolean): void {
    detectionEnabled = enabled;
    logger.info({
      msg: `Detection engine ${enabled ? "enabled" : "disabled"}`,
    });
  },

  /**
   * Check if detection is enabled
   */
  isDetectionEnabled(): boolean {
    return detectionEnabled;
  },

  /**
   * Evaluate a transfer through the detection engine
   * This is async and non-blocking - errors are caught and logged
   * Also broadcasts Rule #1 evaluation details for live mode
   */
  async _evaluateTransfer(transfer: Omit<CtfTransfer, "id">): Promise<DetectionEngineResult | null> {
    if (!detectionEnabled) {
      return null;
    }

    try {
      // Lazy import to avoid circular dependencies
      const { detectionEngine } = await import("./detectionEngine.js");
      const { broadcastRule1Evaluation } = await import("../../api/websocket.js");
      const { freshConcentratedDepthRule } = await import("./rules/freshConcentratedDepth.js");
      const { walletActivityIndex } = await import("./walletActivityIndex.js");
      const { marketDepthService } = await import("./marketDepthService.js");
      const { marketMetadataService } = await import("./marketMetadataService.js");

      // Build a full transfer object for the engine
      const fullTransfer: CtfTransfer = {
        id: 0, // Not stored yet
        ...transfer,
      };

      const result = await detectionEngine.evaluateTrade(fullTransfer);

      if (result.evaluated) {
        detectionEvaluationsProcessed++;

        if (result.alertsCreated.length > 0) {
          detectionAlertsTriggered += result.alertsCreated.length;
          logger.info({
            msg: "Detection engine triggered alerts",
            alertCount: result.alertsCreated.length,
            walletAddress: transfer.toAddress,
            conditionId: transfer.conditionId,
          });
        }
      }

      // Broadcast detailed Rule #1 evaluation for live mode
      // This runs in parallel and doesn't affect the main detection flow
      try {
        const walletAddress = transfer.toAddress.toLowerCase();
        const conditionId = transfer.conditionId;

        // Get Rule #1 thresholds
        const thresholds = await freshConcentratedDepthRule.getThresholds();
        const maxAgeDays = thresholds.max_wallet_age_days;
        const minConcentration = thresholds.min_concentration_pct;
        const minTradeSize = thresholds.min_trade_size_usd;
        const minDepthRatio = thresholds.min_depth_ratio;

        // Calculate trade size in USD (similar to detectionEngine.estimateTradeSize)
        const shares = Number(transfer.amount) / 1e6;
        let tradeSizeUsd = 0;

        if (conditionId) {
          try {
            const clobResponse = await fetch(`https://clob.polymarket.com/markets/${conditionId}`);
            if (clobResponse.ok) {
              const clobData = await clobResponse.json() as { tokens?: Array<{ outcome: string; price: number }> };
              if (clobData.tokens && clobData.tokens.length >= 2) {
                const yesToken = clobData.tokens.find(t => t.outcome === 'Yes');
                const noToken = clobData.tokens.find(t => t.outcome === 'No');
                let price = transfer.outcome === 'YES' ? (yesToken?.price ?? 0) : (noToken?.price ?? 0);
                if (price >= 0 && price <= 1) {
                  tradeSizeUsd = shares * price;
                }
              }
            }
          } catch {
            // Fallback: use shares as rough USD estimate
            tradeSizeUsd = shares * 0.5;
          }
        }

        // Get wallet age and concentration
        const activities = await walletActivityIndex.getWalletActivity(walletAddress);
        const concentration = await walletActivityIndex.getWalletConcentration(walletAddress);

        let walletAgeDays: number | null = null;
        for (const activity of activities) {
          if (activity.firstTradeAt) {
            const firstAt = activity.firstTradeAt;
            const ageDays = Math.floor((Date.now() - firstAt.getTime()) / (1000 * 60 * 60 * 24));
            if (walletAgeDays === null || ageDays < walletAgeDays) {
              walletAgeDays = ageDays;
            }
          }
        }

        const concentrationPct = concentration.topMarket?.volumeShare || 0;

        // Get depth ratio
        let depthRatio: number | null = null;
        if (conditionId && tradeSizeUsd > 0) {
          depthRatio = await marketDepthService.calculateDepthRatio(conditionId, tradeSizeUsd, 2);
        }

        // Get market question
        let marketQuestion: string | undefined;
        if (conditionId) {
          const market = await marketMetadataService.getMarket(conditionId);
          marketQuestion = market?.question;
        }

        // Evaluate checks
        const checks = {
          tradeSize: {
            passed: tradeSizeUsd >= minTradeSize,
            value: tradeSizeUsd,
            threshold: minTradeSize,
          },
          walletAge: {
            passed: walletAgeDays === null || walletAgeDays <= maxAgeDays,
            value: walletAgeDays,
            threshold: maxAgeDays,
          },
          concentration: {
            passed: concentrationPct >= minConcentration,
            value: concentrationPct,
            threshold: minConcentration,
          },
          depthRatio: {
            passed: depthRatio !== null && depthRatio >= minDepthRatio,
            value: depthRatio,
            threshold: minDepthRatio,
          },
        };

        const allPassed = checks.tradeSize.passed &&
          checks.walletAge.passed &&
          checks.concentration.passed &&
          checks.depthRatio.passed;

        // Determine reason for not triggering
        let reason = '';
        if (!allPassed) {
          if (!checks.tradeSize.passed) {
            reason = 'Trade size below threshold';
          } else if (!checks.walletAge.passed) {
            reason = 'Wallet too old';
          } else if (!checks.concentration.passed) {
            reason = 'Concentration too low';
          } else if (!checks.depthRatio.passed) {
            reason = depthRatio === null ? 'No depth data' : 'Depth ratio too low';
          }
        }

        // Find Rule #1 result from detection engine
        const rule1Result = result.rulesTriggered.find(r => r.ruleName === 'FreshConcentratedDepthImpact');

        broadcastRule1Evaluation({
          txHash: transfer.txHash,
          walletAddress,
          conditionId: conditionId || null,
          tokenId: transfer.tokenId,
          amount: transfer.amount.toString(),
          outcome: transfer.outcome,
          blockNumber: transfer.blockNumber,
          timestamp: transfer.blockTimestamp?.toISOString() || new Date().toISOString(),
          tradeSizeUsd,
          marketQuestion,
          evaluated: result.evaluated,
          triggered: rule1Result?.triggered || false,
          checks,
          confidence: rule1Result?.confidence,
          severity: rule1Result?.severity,
          alertId: result.alertsCreated[0],
          reason: allPassed ? undefined : reason,
        });
      } catch (broadcastError) {
        // Don't fail main detection if broadcast fails
        logger.debug({ msg: "Failed to broadcast Rule #1 evaluation", error: broadcastError });
      }

      return result;
    } catch (error) {
      logger.error({
        msg: "Error in detection engine evaluation",
        error,
        walletAddress: transfer.toAddress,
        conditionId: transfer.conditionId,
      });
      return null;
    }
  },

  /**
   * Queue a transfer for async detection processing
   */
  queueForDetection(transfer: Omit<CtfTransfer, "id">): void {
    if (!detectionEnabled) {
      return;
    }

    // Prevent queue from growing unbounded
    if (detectionQueue.length >= MAX_DETECTION_QUEUE_SIZE) {
      logger.warn({
        msg: "Detection queue full, dropping oldest transfers",
        queueSize: detectionQueue.length,
      });
      // Drop oldest 10%
      detectionQueue = detectionQueue.slice(Math.floor(MAX_DETECTION_QUEUE_SIZE * 0.1));
    }

    detectionQueue.push(transfer);
  },

  /**
   * Get the current detection queue length
   */
  getDetectionQueueLength(): number {
    return detectionQueue.length;
  },

  /**
   * Process queued transfers through detection engine
   * @param limit Maximum number of transfers to process
   * @returns Number of transfers processed
   */
  async processDetectionQueue(limit: number = 100): Promise<number> {
    if (!detectionEnabled || detectionQueue.length === 0) {
      return 0;
    }

    const toProcess = detectionQueue.splice(0, limit);
    let processed = 0;

    for (const transfer of toProcess) {
      try {
        await this._evaluateTransfer(transfer);
        processed++;
      } catch (error) {
        logger.error({
          msg: "Error processing queued transfer",
          error,
          txHash: transfer.txHash,
        });
      }
    }

    return processed;
  },

  /**
   * Batch evaluate a list of historical transfers
   * Useful for catch-up processing or historical analysis
   */
  async batchEvaluateTransfers(
    transfers: Array<Omit<CtfTransfer, "id">>
  ): Promise<{
    processed: number;
    triggered: number;
    errors: number;
  }> {
    let processed = 0;
    let triggered = 0;
    let errors = 0;

    // Lazy import to avoid circular dependencies
    const { detectionEngine } = await import("./detectionEngine.js");

    for (const transfer of transfers) {
      try {
        const fullTransfer: CtfTransfer = {
          id: 0,
          ...transfer,
        };

        const result = await detectionEngine.evaluateTrade(fullTransfer);

        if (result.evaluated) {
          processed++;
          detectionEvaluationsProcessed++;

          if (result.rulesTriggered.some((r) => r.triggered)) {
            triggered++;
          }

          if (result.alertsCreated.length > 0) {
            detectionAlertsTriggered += result.alertsCreated.length;
          }
        }
      } catch (error) {
        errors++;
        logger.error({
          msg: "Error in batch evaluation",
          error,
          txHash: transfer.txHash,
        });
      }
    }

    logger.info({
      msg: "Batch evaluation complete",
      processed,
      triggered,
      errors,
    });

    return { processed, triggered, errors };
  },

  /**
   * Reset detection stats (for testing)
   */
  _resetDetectionStats(): void {
    detectionEvaluationsProcessed = 0;
    detectionAlertsTriggered = 0;
    detectionQueue = [];
    detectionEnabled = false;
  },
};
