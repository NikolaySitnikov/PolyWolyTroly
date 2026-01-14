/**
 * Detection Rules Module
 *
 * Exports all detection rule implementations and types.
 * Rules are implemented in Phase 1.4-1.6.
 */

// Rule types and interfaces
export * from "./types.js";

// Base class for rules
export { BaseDetectionRule } from "./ruleBase.js";

// Rule implementations
export { FreshConcentratedDepthRule, freshConcentratedDepthRule } from "./freshConcentratedDepth.js";
export { PreMoveAdvantageRule, preMoveAdvantageRule } from "./preMoveAdvantage.js";
// export { coordinatedClusterRule } from "./coordinatedCluster.js";
