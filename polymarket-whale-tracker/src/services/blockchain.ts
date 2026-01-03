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

const logger = pino({ level: "info" });

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

// Track if we're currently running
let isRunning = false;

export const blockchain = {
  /**
   * Process a single transfer event
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

      console.log(`💰 Deposit detected: $${amount.toLocaleString()} from ${from}`);

      // Process the deposit
      const { isNew, depositId } = await walletTracker.processDeposit(
        from,
        amount,
        log.transactionHash,
        log.blockNumber
      );

      // TEST MODE: Notify for ALL deposits >= threshold
      if (depositId) {
        console.log(`🚨 Sending alert for $${amount.toLocaleString()} deposit!`);

        await notifications.sendTelegramAlert({
          walletAddress: from,
          amount,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          isNewWallet: isNew,
          depositId,
        });
      }

      // Update last processed block
      await cache.setLastBlock(log.blockNumber);
    } catch (error) {
      logger.error({ msg: "Error processing transfer", error });
    }
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
    console.log("🚀 Starting Polymarket whale tracker...");

    // Watch for USDC transfers TO Polymarket Exchange
    const unwatch = wsClient.watchContractEvent({
      address: CONTRACTS.USDC as `0x${string}`,
      abi: ERC20_TRANSFER_ABI,
      eventName: "Transfer",
      args: {
        to: CONTRACTS.POLYMARKET_EXCHANGE as `0x${string}`,
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          await this.processTransferEvent(log);
        }
      },
      onError: (error) => {
        console.error("WebSocket error:", error);
      },
    });

    console.log("✅ Now listening for USDC transfers to Polymarket");
    console.log(`📊 Minimum deposit threshold: $${config.app.minDepositAmount.toLocaleString()}`);

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down...");
      isRunning = false;
      unwatch();
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
