/**
 * Insider Trading Detection System
 *
 * This module provides the data infrastructure for detecting
 * suspicious trading patterns on Polymarket.
 */

// Types
export * from "./types.js";

// Database operations
export { detectionDb } from "./detectionDatabase.js";

// Cache layer
export { detectionCache } from "./detectionCache.js";

// Configuration
export {
  loadConfig,
  refreshConfig,
  updateConfig,
  getDefaultConfig,
  checkWalletAge,
  checkFundingAmount,
  checkTradeTiming,
  checkEntryOdds,
  checkConcentration,
  runAllChecks,
} from "./config.js";

// CTF Event Listener
export { ctfEventListener } from "./ctfEventListener.js";
export type { CtfListenerHealthStatus } from "./ctfEventListener.js";

// Market Metadata Service
export { marketMetadataService } from "./marketMetadataService.js";

// Market Depth Service
export { marketDepthService } from "./marketDepthService.js";

// Price History Service (Phase 1.2)
export { priceHistoryService } from "./priceHistoryService.js";

// Cluster Service (Phase 1.3)
export { clusterService } from "./clusterService.js";

// Wallet Activity Index
export { walletActivityIndex } from "./walletActivityIndex.js";

// Funding Analyzer
export { fundingAnalyzer } from "./fundingAnalyzer.js";

// Wallet Risk Service
export { walletRiskService } from "./walletRiskService.js";

// Detection Rules (Phase 1.4-1.6)
export * from "./rules/index.js";

// Detection Engine (Phase 1.7)
export { detectionEngine } from "./detectionEngine.js";

// Wallet Auto-Add Service
export { walletAutoAddService } from "./walletAutoAddService.js";
