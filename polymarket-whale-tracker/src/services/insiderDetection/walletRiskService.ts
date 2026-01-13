/**
 * Wallet Risk Assessment Service
 *
 * Calculates comprehensive risk profiles for wallets by combining:
 * - Wallet age (first seen timestamp)
 * - Funding analysis (source type, timing, amount)
 * - Activity patterns (concentration, volume, trade frequency)
 * - Alert history (existing alerts for the wallet)
 *
 * Risk scoring uses weighted contributions from each factor.
 */

import { detectionDb } from "./detectionDatabase.js";
import { detectionCache } from "./detectionCache.js";
import { fundingAnalyzer } from "./fundingAnalyzer.js";
import { walletActivityIndex } from "./walletActivityIndex.js";
import { loadConfig } from "./config.js";
import type {
  WalletRiskProfile,
  RiskLevel,
  AlertSeverity,
  DetectionAlert,
} from "./types.js";

// Risk score weights (total = 100)
const RISK_WEIGHTS = {
  walletAge: 25,
  funding: 30,
  activity: 25,
  alerts: 20,
};

// Cache TTL for risk profiles: 5 minutes
const RISK_PROFILE_CACHE_TTL = 5 * 60;

/**
 * Calculate risk level from score
 */
function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "LOW";
  return "UNKNOWN";
}

/**
 * Calculate risk contribution from wallet age
 */
async function calculateAgeRisk(
  walletAddress: string
): Promise<WalletRiskProfile["walletAge"]> {
  const config = await loadConfig();
  const { high: highDays, medium: mediumDays } = config.wallet_age_days;

  // Get first trade timestamp from activity
  const activities = await walletActivityIndex.getWalletActivity(walletAddress);

  let firstSeenAt: Date | null = null;
  for (const activity of activities) {
    if (activity.firstTradeAt) {
      if (!firstSeenAt || activity.firstTradeAt < firstSeenAt) {
        firstSeenAt = activity.firstTradeAt;
      }
    }
  }

  if (!firstSeenAt) {
    return {
      firstSeenAt: null,
      ageDays: null,
      isNew: true,
      riskContribution: RISK_WEIGHTS.walletAge, // Unknown = max risk
    };
  }

  const ageDays = Math.floor(
    (Date.now() - firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  let riskContribution = 0;

  if (ageDays < highDays) {
    // Very new wallet: full weight
    riskContribution = RISK_WEIGHTS.walletAge;
  } else if (ageDays < mediumDays) {
    // Somewhat new: scaled weight
    const ratio = 1 - (ageDays - highDays) / (mediumDays - highDays);
    riskContribution = RISK_WEIGHTS.walletAge * ratio * 0.7; // Max 70% at medium
  }
  // Older wallets: 0 contribution

  return {
    firstSeenAt,
    ageDays,
    isNew: ageDays < mediumDays,
    riskContribution: Math.round(riskContribution * 10) / 10,
  };
}

/**
 * Calculate risk contribution from funding patterns
 */
async function calculateFundingRisk(
  walletAddress: string
): Promise<WalletRiskProfile["funding"]> {
  const config = await loadConfig();
  const { high: highHours, medium: mediumHours } = config.trade_timing_hours;

  const profile = await fundingAnalyzer.getFundingProfile(walletAddress);

  let riskContribution = 0;

  // Factor 1: Recently funded (low hours before first trade = suspicious)
  if (profile.hoursBeforeFirstTrade !== undefined && profile.hoursBeforeFirstTrade !== null) {
    const hours = profile.hoursBeforeFirstTrade;
    if (hours < highHours) {
      // Funded right before trading: very suspicious
      riskContribution += RISK_WEIGHTS.funding * 0.5;
    } else if (hours < mediumHours) {
      // Funded somewhat recently: moderately suspicious
      const ratio = 1 - (hours - highHours) / (mediumHours - highHours);
      riskContribution += RISK_WEIGHTS.funding * 0.5 * ratio * 0.7;
    }
  }

  // Factor 2: Unknown/EOA source (CEX is lower risk, unknown is higher)
  const primaryType = profile.primarySourceType;
  if (primaryType === "unknown" || primaryType === "eoa") {
    riskContribution += RISK_WEIGHTS.funding * 0.3;
  } else if (primaryType === "bridge") {
    riskContribution += RISK_WEIGHTS.funding * 0.15;
  }
  // CEX funding is considered normal/low risk

  // Factor 3: Large funding amount relative to activity
  if (profile.totalFunded > 10000) {
    riskContribution += RISK_WEIGHTS.funding * 0.2;
  } else if (profile.totalFunded > 5000) {
    riskContribution += RISK_WEIGHTS.funding * 0.1;
  }

  return {
    totalFunded: profile.totalFunded,
    sourceCount: profile.sources.length,
    primarySourceType: profile.primarySourceType || null,
    primarySourceLabel: profile.primarySourceLabel || null,
    hoursBeforeFirstTrade: profile.hoursBeforeFirstTrade ?? null,
    isRecentlyFunded:
      profile.hoursBeforeFirstTrade !== undefined &&
      profile.hoursBeforeFirstTrade !== null &&
      profile.hoursBeforeFirstTrade < mediumHours,
    riskContribution: Math.min(
      RISK_WEIGHTS.funding,
      Math.round(riskContribution * 10) / 10
    ),
  };
}

/**
 * Calculate risk contribution from activity patterns
 */
async function calculateActivityRisk(
  walletAddress: string
): Promise<WalletRiskProfile["activity"]> {
  const config = await loadConfig();
  const { wallet_level: concentrationThreshold } = config.concentration_pct;

  const concentration =
    await walletActivityIndex.getWalletConcentration(walletAddress);
  const activities = await walletActivityIndex.getWalletActivity(walletAddress);

  const totalVolume = concentration.totalVolume;
  const tradeCount = activities.reduce((sum, a) => sum + a.tradeCount, 0);
  const marketCount = concentration.marketCount;

  let riskContribution = 0;

  // Factor 1: High concentration in single market
  const topMarketShare = concentration.topMarket?.volumeShare || 0;
  if (topMarketShare >= concentrationThreshold) {
    riskContribution += RISK_WEIGHTS.activity * 0.6;
  } else if (topMarketShare >= concentrationThreshold * 0.7) {
    const ratio =
      (topMarketShare - concentrationThreshold * 0.7) /
      (concentrationThreshold * 0.3);
    riskContribution += RISK_WEIGHTS.activity * 0.6 * ratio;
  }

  // Factor 2: Single-market activity (only trades in one market)
  if (marketCount === 1 && tradeCount > 0) {
    riskContribution += RISK_WEIGHTS.activity * 0.25;
  }

  // Factor 3: Large single trade (high volume with low trade count)
  if (tradeCount > 0 && totalVolume / tradeCount > 5000) {
    riskContribution += RISK_WEIGHTS.activity * 0.15;
  }

  return {
    totalVolume,
    tradeCount,
    marketCount,
    topMarket: concentration.topMarket,
    isHighlyConcentrated: topMarketShare >= concentrationThreshold,
    riskContribution: Math.min(
      RISK_WEIGHTS.activity,
      Math.round(riskContribution * 10) / 10
    ),
  };
}

/**
 * Calculate risk contribution from alert history
 */
async function calculateAlertRisk(
  walletAddress: string
): Promise<WalletRiskProfile["alerts"]> {
  const alerts = await detectionDb.getAlerts(
    { walletAddress },
    { page: 1, limit: 100, sortBy: "detected_at", sortDir: "desc" }
  );

  const bySeverity: Record<AlertSeverity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const alert of alerts.data) {
    bySeverity[alert.severity]++;
  }

  let riskContribution = 0;

  // Weight alerts by severity
  riskContribution += bySeverity.CRITICAL * 10;
  riskContribution += bySeverity.HIGH * 5;
  riskContribution += bySeverity.MEDIUM * 2;
  riskContribution += bySeverity.LOW * 0.5;

  // Cap at max weight
  riskContribution = Math.min(RISK_WEIGHTS.alerts, riskContribution);

  return {
    total: alerts.total,
    bySeverity,
    recent: alerts.data.slice(0, 5), // Last 5 alerts
    riskContribution: Math.round(riskContribution * 10) / 10,
  };
}

/**
 * Calculate comprehensive risk profile for a wallet
 */
export async function calculateWalletRiskProfile(
  walletAddress: string,
  options?: { forceRefresh?: boolean }
): Promise<WalletRiskProfile> {
  const address = walletAddress.toLowerCase();

  // Check cache first (unless force refresh)
  if (!options?.forceRefresh) {
    const cached = await detectionCache.getWalletRiskProfile(address);
    if (cached) {
      return cached;
    }
  }

  // Calculate all risk components in parallel
  const [walletAge, funding, activity, alerts] = await Promise.all([
    calculateAgeRisk(address),
    calculateFundingRisk(address),
    calculateActivityRisk(address),
    calculateAlertRisk(address),
  ]);

  // Calculate total risk score
  const riskScore = Math.min(
    100,
    Math.round(
      (walletAge?.riskContribution || 0) +
        (funding?.riskContribution || 0) +
        (activity?.riskContribution || 0) +
        (alerts?.riskContribution || 0)
    )
  );

  // Determine risk factors
  const riskFactors: string[] = [];

  if (walletAge?.isNew) {
    riskFactors.push(
      `New wallet (${walletAge.ageDays !== null ? walletAge.ageDays + " days old" : "unknown age"})`
    );
  }

  if (funding?.isRecentlyFunded) {
    riskFactors.push(
      `Recently funded (${funding.hoursBeforeFirstTrade}h before first trade)`
    );
  }

  if (funding?.primarySourceType === "unknown") {
    riskFactors.push("Unknown funding source");
  } else if (funding?.primarySourceType === "eoa") {
    riskFactors.push("Funded from EOA wallet");
  }

  if (activity?.isHighlyConcentrated) {
    riskFactors.push(
      `High concentration (${activity.topMarket?.volumeShare.toFixed(1)}% in single market)`
    );
  }

  if (activity?.marketCount === 1 && (activity?.tradeCount || 0) > 0) {
    riskFactors.push("Single-market activity only");
  }

  if ((alerts?.total || 0) > 0) {
    riskFactors.push(`${alerts?.total} existing alert(s)`);
  }

  const profile: WalletRiskProfile = {
    walletAddress: address,
    riskLevel: scoreToRiskLevel(riskScore),
    riskScore,
    walletAge,
    funding,
    activity,
    alerts,
    riskFactors,
    assessedAt: new Date(),
  };

  // Cache the result
  await detectionCache.setWalletRiskProfile(
    address,
    profile,
    RISK_PROFILE_CACHE_TTL
  );

  return profile;
}

/**
 * Wallet Risk Service
 */
export const walletRiskService = {
  /**
   * Get risk profile for a wallet
   */
  getRiskProfile: calculateWalletRiskProfile,

  /**
   * Get risk level only (faster, for list views)
   */
  async getRiskLevel(walletAddress: string): Promise<RiskLevel> {
    const profile = await calculateWalletRiskProfile(walletAddress);
    return profile.riskLevel;
  },

  /**
   * Check if wallet meets risk threshold
   */
  async isHighRisk(walletAddress: string): Promise<boolean> {
    const profile = await calculateWalletRiskProfile(walletAddress);
    return profile.riskLevel === "CRITICAL" || profile.riskLevel === "HIGH";
  },

  /**
   * Invalidate cached risk profile
   */
  async invalidateProfile(walletAddress: string): Promise<void> {
    await detectionCache.invalidateWalletRiskProfile(walletAddress.toLowerCase());
  },
};
