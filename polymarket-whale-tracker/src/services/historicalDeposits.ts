/**
 * Historical Deposits Service
 *
 * Fetches historical USDC deposit data from the blockchain via RPC.
 * Uses an archive node for historical queries (required for eth_getLogs on old blocks).
 */

import { createPublicClient, http, formatUnits, parseAbiItem } from "viem";
import { polygon } from "viem/chains";
import { config } from "../config/index.js";
import { CONTRACTS, USDC_DECIMALS } from "../utils/constants.js";

// Archive RPC endpoint for historical queries
// PublicNode prunes history, so we need an archive node
// Set ARCHIVE_RPC_URL env var to use a dedicated archive node (e.g., Alchemy)
const ARCHIVE_RPC_URL = process.env.ARCHIVE_RPC_URL || config.alchemy.httpUrl;

// Create HTTP client for historical queries
const httpClient = createPublicClient({
  chain: polygon,
  transport: http(ARCHIVE_RPC_URL),
});

// ERC20 Transfer event signature
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// Polymarket Exchange deployed around block 35M (mid 2022)
// We start from here to avoid wasting time on empty blocks
const POLYMARKET_START_BLOCK = 35000000n;

// Maximum blocks to query at once (public RPCs have limits)
// We use a smaller range for compatibility with rate-limited endpoints
const MAX_BLOCK_RANGE = 2000n;

/**
 * Parsed deposit from blockchain logs
 */
export interface HistoricalDeposit {
  txHash: string;
  amount: number;
  blockNumber: bigint;
  timestamp: number;
}

export const historicalDeposits = {
  /**
   * Fetch all historical USDC deposits to Polymarket for a wallet.
   * Returns deposits sorted by block number ascending (oldest first).
   */
  async getHistoricalDeposits(
    walletAddress: string
  ): Promise<HistoricalDeposit[]> {
    try {
      const address = walletAddress.toLowerCase() as `0x${string}`;
      const polymarketExchange = CONTRACTS.POLYMARKET_EXCHANGE.toLowerCase() as `0x${string}`;
      const usdcContract = CONTRACTS.USDC as `0x${string}`;

      // Get current block
      const currentBlock = await httpClient.getBlockNumber();

      // Collect all logs across block ranges
      const allLogs: any[] = [];
      let fromBlock = POLYMARKET_START_BLOCK;

      while (fromBlock < currentBlock) {
        const toBlock = fromBlock + MAX_BLOCK_RANGE > currentBlock
          ? currentBlock
          : fromBlock + MAX_BLOCK_RANGE;

        try {
          const logs = await httpClient.getLogs({
            address: usdcContract,
            event: TRANSFER_EVENT,
            args: {
              from: address,
              to: polymarketExchange,
            },
            fromBlock,
            toBlock,
          });

          allLogs.push(...logs);
        } catch (error: any) {
          const errorMsg = error.message || error.details || "";

          // Check for pruned/archive errors
          if (errorMsg.includes("pruned") || errorMsg.includes("archive")) {
            console.error(
              "Historical data has been pruned. Set ARCHIVE_RPC_URL to an archive node (e.g., Alchemy)."
            );
            return [];
          }

          // Some RPCs have stricter limits, try smaller ranges
          if (errorMsg.includes("range") || errorMsg.includes("limit") || errorMsg.includes("exceed")) {
            console.warn(`Block range too large, skipping ${fromBlock}-${toBlock}`);
          } else {
            throw error;
          }
        }

        fromBlock = toBlock + 1n;
      }

      if (allLogs.length === 0) {
        return [];
      }

      // Get block timestamps for all unique blocks
      const uniqueBlocks = [...new Set(allLogs.map((log) => log.blockNumber))];
      const blockTimestamps = new Map<bigint, number>();

      // Batch fetch block timestamps (limit concurrency to avoid rate limits)
      const BATCH_SIZE = 10;
      for (let i = 0; i < uniqueBlocks.length; i += BATCH_SIZE) {
        const batch = uniqueBlocks.slice(i, i + BATCH_SIZE);
        const blocks = await Promise.all(
          batch.map((blockNum) => httpClient.getBlock({ blockNumber: blockNum }))
        );
        blocks.forEach((block) => {
          blockTimestamps.set(block.number, Number(block.timestamp));
        });
      }

      // Parse logs into deposits
      const deposits: HistoricalDeposit[] = allLogs.map((log) => ({
        txHash: log.transactionHash,
        amount: parseFloat(formatUnits(log.args.value || 0n, USDC_DECIMALS)),
        blockNumber: log.blockNumber,
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
      }));

      // Sort by block number ascending (oldest first)
      deposits.sort((a, b) => Number(a.blockNumber - b.blockNumber));

      return deposits;
    } catch (error) {
      console.error("Error fetching historical deposits:", error);
      return [];
    }
  },

  /**
   * Calculate total deposited amount from a list of deposits.
   */
  calculateTotalDeposited(deposits: HistoricalDeposit[]): number {
    return deposits.reduce((sum, d) => sum + d.amount, 0);
  },

  /**
   * Get information about the first deposit.
   */
  getFirstDepositInfo(
    deposits: HistoricalDeposit[]
  ): { txHash: string; amount: number; timestamp: number } | null {
    if (deposits.length === 0) {
      return null;
    }
    const first = deposits[0];
    return {
      txHash: first.txHash,
      amount: first.amount,
      timestamp: first.timestamp,
    };
  },
};
