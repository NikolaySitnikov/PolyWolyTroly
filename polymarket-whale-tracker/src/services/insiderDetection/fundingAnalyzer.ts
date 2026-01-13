/**
 * Funding Analyzer Service for Insider Trading Detection
 *
 * Analyzes wallet funding sources to detect suspicious patterns:
 * - Fresh wallets funded right before trading
 * - Wallets funded from known CEXs vs bridges vs other wallets
 * - Clusters of wallets funded from the same source
 *
 * Uses Alchemy's Asset Transfers API for efficient 1-hop back analysis.
 *
 * Key responsibilities:
 * - Fetch incoming transfers to a wallet (1-hop funding sources)
 * - Label source addresses (CEX, bridge, contract, EOA)
 * - Calculate timing metrics (hours before first trade)
 * - Store funding analysis results in database and cache
 */

import { createPublicClient, http, formatUnits } from "viem";
import { polygon } from "viem/chains";
import { config } from "../../config/index.js";
import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import { CONTRACTS, USDC_DECIMALS } from "../../utils/constants.js";
import type { WalletFundingSource, FundingSourceType } from "./types.js";
import pino from "pino";

const logger = pino({ level: "info" });

// Alchemy HTTP client
const httpClient = createPublicClient({
  chain: polygon,
  transport: http(config.alchemy.httpUrl),
});

// Rate limiting configuration
const RATE_LIMIT_DELAY_MS = 200; // 5 requests per second
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Cache TTL for funding analysis: 30 minutes
const FUNDING_ANALYSIS_CACHE_TTL = 30 * 60;

// Minimum transfer amount to consider as funding (in USD)
const MIN_FUNDING_AMOUNT_USD = 10;

// Known CEX hot wallet addresses on Polygon
// These are well-known addresses that fund user withdrawals
const KNOWN_CEX_ADDRESSES: Record<string, string> = {
  // Binance
  "0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245": "Binance",
  "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance",
  "0x28c6c06298d514db089934071355e5743bf21d60": "Binance Hot Wallet",
  // Coinbase
  "0x503828976d22510aad0339f595a7d5e95bf7b4e1": "Coinbase",
  "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": "Coinbase",
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": "Coinbase Commerce",
  // Kraken
  "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": "Kraken",
  // OKX
  "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": "OKX",
  "0x98ec059dc3adfbdd63429454aeb0c990fba4a128": "OKX",
  // Bybit
  "0x1db92e2eebc8e0c075a02bea49a2935bcd2dfcf4": "Bybit",
  "0xee5b5b923ffceb16327e59c03f42cf71e9e47c3d": "Bybit",
  // KuCoin
  "0xf16e9b0d03470827a95cdfd0cb8a8a3b46969b91": "KuCoin",
  // Crypto.com
  "0x6262998ced04146fa42253a5c0af90ca02dfd2a3": "Crypto.com",
  // Gate.io
  "0x0d0707963952f2fba59dd06f2b425ace40b492fe": "Gate.io",
  // Huobi
  "0x18709e89bd403f470088abdacebe86cc60dda12e": "Huobi",
  // FTX (defunct but still recognized)
  "0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2": "FTX",
};

// Known bridge addresses on Polygon
const KNOWN_BRIDGE_ADDRESSES: Record<string, string> = {
  // Polygon Bridge
  "0xa0c68c638235ee32657e8f720a23cec1bfc77c77": "Polygon Bridge",
  "0x8484ef722627bf18ca5ae6bcf031c23e6e922b30": "Polygon zkEVM Bridge",
  // Multichain (formerly AnySwap)
  "0xe95fd76cf16008c12ff3b3a937cb16cd9cc20284": "Multichain Bridge",
  // Hop Protocol
  "0x884d1aa15f9957e1aead0c1914c1de6f1e3d8f93": "Hop Protocol",
  // Across Protocol
  "0x69b5c72837769ef1e7c164abc6515dcff217f920": "Across Protocol",
  // Synapse Bridge
  "0x8f5bbb2bb8c2ee94639e55d5f41de9b4839c1280": "Synapse Bridge",
  // Stargate
  "0x45a01e4e04f14f7a4a6702c74187c5f6222033cd": "Stargate Finance",
  "0x1205f31718499dbf1fca446663b532ef87481fe1": "Stargate",
  // Celer Bridge
  "0x5427fefa711eff984124bfbb1ab6fbf5e3da1820": "Celer cBridge",
  // Connext
  "0x11984dc4465481512eb5b777e44061c158cf2259": "Connext",
  // Socket
  "0x3a23f943181408eac424116af7b7790c94cb97a5": "Socket Bridge",
};

// Known contract types that are notable
const KNOWN_CONTRACTS: Record<string, string> = {
  // Polymarket contracts
  [CONTRACTS.POLYMARKET_EXCHANGE.toLowerCase()]: "Polymarket Exchange",
  [CONTRACTS.CTF_EXCHANGE.toLowerCase()]: "Polymarket CTF Exchange",
  [CONTRACTS.USDC.toLowerCase()]: "USDC",
  // DEX routers
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap Router",
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3 Router",
  "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff": "QuickSwap Router",
  "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506": "SushiSwap Router",
  // Lending protocols
  "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf": "Aave Lending Pool",
  "0x794a61358d6845594f94dc1db02a252b5b4814ad": "Aave V3 Pool",
};

/**
 * Classify an address based on known labels
 */
function classifyAddress(address: string): { type: FundingSourceType; label?: string } {
  const normalizedAddress = address.toLowerCase();

  // Check CEXs
  if (KNOWN_CEX_ADDRESSES[normalizedAddress]) {
    return { type: "cex", label: KNOWN_CEX_ADDRESSES[normalizedAddress] };
  }

  // Check bridges
  if (KNOWN_BRIDGE_ADDRESSES[normalizedAddress]) {
    return { type: "bridge", label: KNOWN_BRIDGE_ADDRESSES[normalizedAddress] };
  }

  // Check known contracts
  if (KNOWN_CONTRACTS[normalizedAddress]) {
    return { type: "contract", label: KNOWN_CONTRACTS[normalizedAddress] };
  }

  return { type: "unknown" };
}

/**
 * Check if an address is a contract by checking its bytecode
 */
async function isContract(address: string): Promise<boolean> {
  try {
    const bytecode = await httpClient.getBytecode({
      address: address as `0x${string}`,
    });
    return bytecode !== undefined && bytecode !== "0x";
  } catch {
    return false;
  }
}

/**
 * Classify an address, including checking if it's a contract
 */
async function classifyAddressWithContractCheck(
  address: string
): Promise<{ type: FundingSourceType; label?: string }> {
  // First check known addresses
  const known = classifyAddress(address);
  if (known.type !== "unknown") {
    return known;
  }

  // Check if it's a contract
  const isContractAddress = await isContract(address);
  if (isContractAddress) {
    return { type: "contract" };
  }

  // Otherwise it's an EOA (externally owned account)
  return { type: "eoa" };
}

/**
 * Extract API key from Alchemy HTTP URL
 */
function getAlchemyApiKey(): string | null {
  const url = config.alchemy.httpUrl;
  const match = url.match(/\/v2\/([^/]+)$/);
  return match ? match[1] : null;
}

/**
 * Fetch asset transfers using Alchemy API
 * Alchemy's alchemy_getAssetTransfers is much more efficient than scanning logs
 */
async function fetchAssetTransfers(
  toAddress: string,
  fromBlock?: string,
  toBlock?: string
): Promise<{
  transfers: Array<{
    from: string;
    to: string;
    asset: string;
    value: number;
    hash: string;
    blockNum: string;
    metadata?: { blockTimestamp?: string };
  }>;
}> {
  const apiKey = getAlchemyApiKey();
  if (!apiKey) {
    throw new Error("Could not extract Alchemy API key from URL");
  }

  const baseUrl = config.alchemy.httpUrl.replace(`/v2/${apiKey}`, "");

  const response = await fetch(`${baseUrl}/v2/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromBlock: fromBlock || "0x0",
          toBlock: toBlock || "latest",
          toAddress: toAddress,
          category: ["erc20", "external"], // USDC (ERC20) and native MATIC
          withMetadata: true,
          maxCount: "0x3e8", // 1000 transfers max
          order: "asc", // Oldest first
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Alchemy RPC error: ${data.error.message}`);
  }

  return { transfers: data.result?.transfers || [] };
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for API calls
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logger.warn({
        msg: `Retry attempt ${attempt + 1}/${retries} failed`,
        error: lastError.message,
      });
    }
  }

  throw lastError;
}

/**
 * Funding Analyzer Service
 */
export const fundingAnalyzer = {
  /**
   * Analyze funding sources for a wallet
   * Returns all incoming transfers that funded the wallet
   */
  async analyzeFundingSources(
    walletAddress: string,
    options?: {
      forceRefresh?: boolean;
      minAmount?: number;
    }
  ): Promise<{
    sources: WalletFundingSource[];
    totalFunded: number;
    firstFundingAt?: Date;
    primarySourceType?: FundingSourceType;
    hoursBeforeFirstTrade?: number;
  }> {
    const address = walletAddress.toLowerCase();
    const minAmount = options?.minAmount ?? MIN_FUNDING_AMOUNT_USD;

    // Check cache first (unless force refresh)
    if (!options?.forceRefresh) {
      const cached = await detectionCache.getFundingAnalysis(address);
      if (cached) {
        return {
          ...cached,
          firstFundingAt: cached.firstFundingAt
            ? new Date(cached.firstFundingAt)
            : undefined,
        };
      }
    }

    // Check database
    const existingSources = await detectionDb.getWalletFunding(address);
    if (existingSources.length > 0 && !options?.forceRefresh) {
      const result = this._summarizeFundingSources(existingSources);
      await this._cacheAnalysis(address, result);
      return result;
    }

    // Fetch from Alchemy API
    logger.info({ msg: `Analyzing funding sources for ${address}` });

    const sources: WalletFundingSource[] = [];
    let totalFunded = 0;
    let firstFundingAt: Date | undefined;

    try {
      // Rate limit
      await sleep(RATE_LIMIT_DELAY_MS);

      const { transfers } = await withRetry(() => fetchAssetTransfers(address));

      // Filter for USDC and significant native token transfers
      const fundingTransfers = transfers.filter((t) => {
        // Include USDC transfers
        if (t.asset === "USDC" && t.value >= minAmount) {
          return true;
        }
        // Include significant MATIC transfers (for gas funding)
        if (t.asset === "MATIC" && t.value >= 0.1) {
          return true;
        }
        return false;
      });

      // Process each transfer
      for (const transfer of fundingTransfers) {
        // Rate limit contract checks
        await sleep(50);

        // Classify the source address
        const { type, label } = await classifyAddressWithContractCheck(transfer.from);

        // Parse block number
        const blockNumber = parseInt(transfer.blockNum, 16);

        // Parse timestamp
        const timestamp = transfer.metadata?.blockTimestamp
          ? new Date(transfer.metadata.blockTimestamp)
          : undefined;

        // Determine if this is the first funding
        const isFirst = sources.length === 0;

        if (isFirst && timestamp) {
          firstFundingAt = timestamp;
        }

        const source: WalletFundingSource = {
          walletAddress: address,
          sourceAddress: transfer.from.toLowerCase(),
          sourceType: type,
          sourceLabel: label,
          txHash: transfer.hash,
          amount: transfer.value,
          tokenAddress:
            transfer.asset === "USDC" ? CONTRACTS.USDC : undefined,
          blockNumber,
          fundedAt: timestamp,
          isFirstFunding: isFirst,
        };

        sources.push(source);
        totalFunded += transfer.value;

        // Store in database
        await detectionDb.recordFundingSource(source);
      }

      logger.info({
        msg: `Found ${sources.length} funding sources for ${address}`,
        totalFunded,
      });
    } catch (error) {
      logger.error({
        msg: `Error analyzing funding for ${address}`,
        error: (error as Error).message,
      });
    }

    // Build result
    const result = this._summarizeFundingSources(sources);

    // Cache the result
    await this._cacheAnalysis(address, result);

    return result;
  },

  /**
   * Update funding sources with hours before first trade
   * Call this after we know the wallet's first trade time
   */
  async updateTimingMetrics(
    walletAddress: string,
    firstTradeAt: Date
  ): Promise<void> {
    const sources = await detectionDb.getWalletFunding(walletAddress);

    for (const source of sources) {
      if (source.fundedAt && !source.hoursBeforeFirstTrade) {
        const hoursBefore = Math.floor(
          (firstTradeAt.getTime() - source.fundedAt.getTime()) / (1000 * 60 * 60)
        );

        // Update in database
        await detectionDb.recordFundingSource({
          ...source,
          hoursBeforeFirstTrade: hoursBefore,
        });
      }
    }

    // Invalidate cache
    await detectionCache.deleteFundingAnalysis(walletAddress);
  },

  /**
   * Find all wallets funded by the same source
   * Useful for detecting coordinated wallet clusters
   */
  async findWalletsWithSameFunder(
    sourceAddress: string
  ): Promise<string[]> {
    return detectionDb.getWalletsWithSameFunder(sourceAddress);
  },

  /**
   * Check if a wallet was recently funded (within N hours)
   */
  async isRecentlyFunded(
    walletAddress: string,
    hoursThreshold: number = 24
  ): Promise<{
    isRecent: boolean;
    hoursAgo?: number;
    fundingSource?: WalletFundingSource;
  }> {
    const sources = await detectionDb.getWalletFunding(walletAddress);

    if (sources.length === 0) {
      return { isRecent: false };
    }

    // Find the first funding
    const firstFunding = sources.find((s) => s.isFirstFunding) || sources[0];

    if (!firstFunding.fundedAt) {
      return { isRecent: false };
    }

    const hoursAgo = Math.floor(
      (Date.now() - firstFunding.fundedAt.getTime()) / (1000 * 60 * 60)
    );

    return {
      isRecent: hoursAgo <= hoursThreshold,
      hoursAgo,
      fundingSource: firstFunding,
    };
  },

  /**
   * Get funding analysis for display in UI
   */
  async getFundingProfile(walletAddress: string): Promise<{
    sources: WalletFundingSource[];
    totalFunded: number;
    firstFundingAt?: Date;
    primarySourceType?: FundingSourceType;
    primarySourceLabel?: string;
    hoursBeforeFirstTrade?: number;
    relatedWallets: string[];
  }> {
    const analysis = await this.analyzeFundingSources(walletAddress);

    // Find related wallets (funded from same source)
    let relatedWallets: string[] = [];
    if (analysis.sources.length > 0) {
      const primarySource = analysis.sources.find((s) => s.isFirstFunding);
      if (primarySource) {
        relatedWallets = await this.findWalletsWithSameFunder(
          primarySource.sourceAddress
        );
        // Remove the wallet itself
        relatedWallets = relatedWallets.filter(
          (w) => w.toLowerCase() !== walletAddress.toLowerCase()
        );
      }
    }

    return {
      ...analysis,
      primarySourceLabel: analysis.sources[0]?.sourceLabel,
      hoursBeforeFirstTrade: analysis.sources[0]?.hoursBeforeFirstTrade,
      relatedWallets,
    };
  },

  /**
   * Internal: Summarize funding sources into an analysis result
   */
  _summarizeFundingSources(sources: WalletFundingSource[]): {
    sources: WalletFundingSource[];
    totalFunded: number;
    firstFundingAt?: Date;
    primarySourceType?: FundingSourceType;
    hoursBeforeFirstTrade?: number;
  } {
    if (sources.length === 0) {
      return { sources, totalFunded: 0 };
    }

    const totalFunded = sources.reduce((sum, s) => sum + s.amount, 0);
    const firstSource = sources.find((s) => s.isFirstFunding) || sources[0];

    // Count source types to determine primary
    const typeCounts: Record<string, number> = {};
    for (const source of sources) {
      const type = source.sourceType || "unknown";
      typeCounts[type] = (typeCounts[type] || 0) + source.amount;
    }

    // Find the type with highest volume
    let primaryType: FundingSourceType = "unknown";
    let maxVolume = 0;
    for (const [type, volume] of Object.entries(typeCounts)) {
      if (volume > maxVolume) {
        maxVolume = volume;
        primaryType = type as FundingSourceType;
      }
    }

    return {
      sources,
      totalFunded,
      firstFundingAt: firstSource.fundedAt,
      primarySourceType: primaryType,
      hoursBeforeFirstTrade: firstSource.hoursBeforeFirstTrade,
    };
  },

  /**
   * Internal: Cache funding analysis
   */
  async _cacheAnalysis(
    walletAddress: string,
    analysis: {
      sources: WalletFundingSource[];
      totalFunded: number;
      firstFundingAt?: Date;
      hoursBeforeFirstTrade?: number;
    }
  ): Promise<void> {
    await detectionCache.setFundingAnalysis(walletAddress, analysis);
  },

  /**
   * Invalidate cached funding analysis for a wallet
   */
  async invalidateCache(walletAddress: string): Promise<void> {
    await detectionCache.deleteFundingAnalysis(walletAddress);
  },
};
