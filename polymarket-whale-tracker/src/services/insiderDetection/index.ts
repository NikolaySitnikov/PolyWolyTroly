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
