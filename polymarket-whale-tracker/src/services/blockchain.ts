import {
  createPublicClient,
  webSocket,
  http,
  formatUnits,
  type Log,
} from "viem";
import { polygon } from "viem/chains";
import { config } from "../config/index.js";
import { CONTRACTS, USDC_DECIMALS, ERC20_TRANSFER_ABI } from "../utils/constants.js";
import { walletTracker } from "./walletTracker.js";
import { notifications } from "./notifications.js";
import { cache } from "./cache.js";
import pino from "pino";

// Dynamic import to avoid circular dependency in tests
let broadcastDeposit: ((event: any) => Promise<void>) | null = null;
import("../api/websocket.js")
  .then((ws) => {
    broadcastDeposit = ws.broadcastDeposit;
  })
  .catch(() => {
    // WebSocket module not available (e.g., in tests)
  });

const logger = pino({ level: "info" });

// Configuration for robustness
const MAX_CONSECUTIVE_ERRORS = 5;
const RESTART_DELAY_MS = 2000;

// Create WebSocket client for real-time events
const wsClient = createPublicClient({
  chain: polygon,
  transport: webSocket(config.alchemy.wssUrl, {
    reconnect: {
      attempts: 10,
      delay: 1000,
    },
  }),
});

// Create HTTP client for one-off queries
const httpClient = createPublicClient({
  chain: polygon,
  transport: http(config.alchemy.httpUrl),
});

// Health tracking state
let isRunning = false;
let lastEventTime: Date | null = null;
let listenerHealthy = false;
let listenerStartTime: Date | null = null;
let consecutiveErrors = 0;
let currentUnwatch: (() => void) | null = null;

export const blockchain = {
  /**
   * Get listener health status for monitoring
   */
  getHealthStatus(): {
    isRunning: boolean;
    lastEventTime: Date | null;
    healthy: boolean;
    startTime: Date | null;
    consecutiveErrors: number;
  } {
    return {
      isRunning,
      lastEventTime,
      healthy: listenerHealthy,
      startTime: listenerStartTime,
      consecutiveErrors,
    };
  },

  /**
   * Process a single transfer event
   * Uses distributed locking to prevent duplicate processing across multiple instances
   */
  async processTransferEvent(log: Log): Promise<void> {
    try {
      // Decode the event
      const from = log.topics[1] ? `0x${log.topics[1].slice(26)}` : null;
      const to = log.topics[2] ? `0x${log.topics[2].slice(26)}` : null;
      const value = log.data ? BigInt(log.data) : 0n;

      if (!from || !to || !log.transactionHash || !log.blockNumber) {
        return;
      }

      // Convert amount to human-readable
      const amount = parseFloat(formatUnits(value, USDC_DECIMALS));

      // Filter: only process deposits >= minimum amount
      if (amount < config.app.minDepositAmount) {
        return;
      }

      // DEDUPLICATION: Check if this transaction was already fully processed
      const alreadyProcessed = await cache.isTransactionProcessed(log.transactionHash);
      if (alreadyProcessed) {
        return;
      }

      // DEDUPLICATION: Try to acquire distributed lock for this transaction
      // If another process is handling this transaction, skip it
      const lockAcquired = await cache.acquireTransactionLock(log.transactionHash);
      if (!lockAcquired) {
        return;
      }

      console.log(`💰 Deposit detected: $${amount.toLocaleString()} from ${from}`);

      // Process the deposit
      const { isNew, depositId } = await walletTracker.processDeposit(
        from,
        amount,
        log.transactionHash,
        log.blockNumber
      );

      // Send notification for all deposits >= threshold
      if (depositId) {
        console.log(`🚨 Sending alert for $${amount.toLocaleString()} deposit!`);

        // Broadcast to WebSocket clients instantly (if available)
        if (broadcastDeposit) {
          await broadcastDeposit({
            walletAddress: from,
            amount,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            isNewWallet: isNew,
            depositId,
          });
        }

        await notifications.sendTelegramAlert({
          walletAddress: from,
          amount,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          isNewWallet: isNew,
          depositId,
        });

        // DEDUPLICATION: Mark transaction as fully processed after successful notification
        await cache.markTransactionProcessed(log.transactionHash);
      }

      // Update last processed block
      await cache.setLastBlock(log.blockNumber);
    } catch (error) {
      logger.error({ msg: "Error processing transfer", error });
    }
  },

  /**
   * Internal method to set up the event watcher
   */
  _setupWatcher(): () => void {
    return wsClient.watchContractEvent({
      address: CONTRACTS.USDC as `0x${string}`,
      abi: ERC20_TRANSFER_ABI,
      eventName: "Transfer",
      args: {
        to: CONTRACTS.POLYMARKET_EXCHANGE as `0x${string}`,
      },
      poll: true,
      pollingInterval: 2000,
      onLogs: async (logs) => {
        // Update health status - receiving logs means we're healthy
        lastEventTime = new Date();
        listenerHealthy = true;
        consecutiveErrors = 0;

        for (const log of logs) {
          await this.processTransferEvent(log);
        }
      },
      onError: (error) => {
        consecutiveErrors++;
        console.error(`Polling error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

        // Auto-restart after too many consecutive errors
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.warn("🔄 Too many consecutive errors, restarting listener...");
          this._restartListener();
        }
      },
    });
  },

  /**
   * Restart the listener after errors
   */
  _restartListener(): void {
    // Stop current watcher
    if (currentUnwatch) {
      currentUnwatch();
      currentUnwatch = null;
    }

    // Reset state for restart
    consecutiveErrors = 0;
    listenerHealthy = false;

    // Restart after delay
    setTimeout(() => {
      console.log("🔄 Restarting blockchain listener...");
      currentUnwatch = this._setupWatcher();
      listenerHealthy = true;
      console.log("✅ Listener restarted successfully");
    }, RESTART_DELAY_MS);
  },

  /**
   * Start listening for Transfer events
   */
  async startListening(): Promise<void> {
    if (isRunning) {
      logger.warn("Listener already running");
      return;
    }

    isRunning = true;
    listenerStartTime = new Date();
    listenerHealthy = true;
    consecutiveErrors = 0;
    console.log("🚀 Starting Polymarket whale tracker...");

    // Watch for USDC transfers TO Polymarket Exchange
    // Note: PublicNode doesn't support eth_subscribe for logs, so we use polling
    currentUnwatch = this._setupWatcher();

    console.log("✅ Now listening for USDC transfers to Polymarket");
    console.log(`📊 Minimum deposit threshold: $${config.app.minDepositAmount.toLocaleString()}`);

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down...");
      isRunning = false;
      listenerHealthy = false;
      if (currentUnwatch) {
        currentUnwatch();
        currentUnwatch = null;
      }
      await cache.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  },

  /**
   * Get current block number (for testing)
   */
  async getCurrentBlock(): Promise<bigint> {
    return await httpClient.getBlockNumber();
  },
};
