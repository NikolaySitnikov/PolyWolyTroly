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
