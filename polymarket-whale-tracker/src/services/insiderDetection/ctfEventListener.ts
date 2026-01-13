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
import type { CtfTransfer } from "./types.js";
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

export interface CtfListenerHealthStatus {
  isRunning: boolean;
  lastEventTime: Date | null;
  lastHeartbeatTime: Date | null;
  healthy: boolean;
  startTime: Date | null;
  consecutiveErrors: number;
  transfersProcessed: number;
  transfersSkippedDuplicate: number;
}

/**
 * Parse token ID to extract condition ID (first 32 bytes)
 * Polymarket token IDs encode: conditionId (32 bytes) + outcomeIndex (1 byte)
 */
function parseTokenId(tokenId: bigint): { conditionId: string; outcomeIndex: number } {
  // Token ID structure: conditionId is the full token ID
  // Outcome is determined by checking against market's YES/NO token IDs
  const conditionId = "0x" + tokenId.toString(16).padStart(64, "0");
  // Outcome index can be derived from market metadata later
  return { conditionId, outcomeIndex: 0 };
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

    // Parse token ID
    const { conditionId } = parseTokenId(id);
    const transferType = classifyTransfer(from, to);

    // Skip mints and burns for now - focus on wallet-to-wallet transfers
    // Mints/burns are market-making operations
    if (transferType !== "transfer") {
      await detectionCache.markCtfTransferProcessed(dedupKey);
      return;
    }

    // Create transfer record
    const transfer: Omit<CtfTransfer, "id"> = {
      txHash: log.transactionHash,
      fromAddress: from,
      toAddress: to,
      tokenId: id.toString(),
      amount: value,
      conditionId,
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

      const { conditionId } = parseTokenId(id);
      const transferType = classifyTransfer(from, to);

      // Skip mints and burns
      if (transferType !== "transfer") {
        await detectionCache.markCtfTransferProcessed(dedupKey);
        continue;
      }

      const transfer: Omit<CtfTransfer, "id"> = {
        txHash: log.transactionHash,
        fromAddress: from,
        toAddress: to,
        tokenId: id.toString(),
        amount: value,
        conditionId,
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
};
