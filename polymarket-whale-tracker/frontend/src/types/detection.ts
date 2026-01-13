/**
 * Detection Types
 *
 * Type definitions for the Insider Trading Detection System frontend.
 * Mirrors backend types from src/services/insiderDetection/types.ts
 */

// ============================================
// ALERT TYPES
// ============================================

export type AlertType = 'timing' | 'size' | 'pattern' | 'cluster' | 'funding';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'new' | 'investigating' | 'confirmed' | 'dismissed';

export interface DetectionAlert {
  id: number;
  alertType: AlertType;
  severity: AlertSeverity;
  confidenceScore?: number;
  walletAddress: string;
  conditionId?: string;
  detectionRule: string;
  triggerValues?: Record<string, unknown>;
  thresholdValues?: Record<string, unknown>;
  title: string;
  description?: string;
  relatedTxHashes?: string[];
  relatedWallets?: string[];
  status: AlertStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  detectedAt: string;
}

// ============================================
// STATS TYPES
// ============================================

export interface DetectionStats {
  alertsToday: number;
  alertsTotal: number;
  alertsByType: Record<AlertType, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  activeMarkets: number;
  walletsTracked: number;
}

// ============================================
// WALLET RISK TYPES
// ============================================

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type FundingSourceType = 'cex' | 'bridge' | 'contract' | 'eoa' | 'unknown';

export interface WalletRiskProfile {
  walletAddress: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100

  // Age analysis
  walletAge?: {
    firstSeenAt: string | null;
    ageDays: number | null;
    isNew: boolean;
    riskContribution: number;
  };

  // Funding analysis
  funding?: {
    totalFunded: number;
    sourceCount: number;
    primarySourceType: FundingSourceType | null;
    primarySourceLabel: string | null;
    hoursBeforeFirstTrade: number | null;
    isRecentlyFunded: boolean;
    riskContribution: number;
  };

  // Activity analysis
  activity?: {
    totalVolume: number;
    tradeCount: number;
    marketCount: number;
    topMarket: {
      conditionId: string;
      question?: string;
      volumeShare: number;
    } | null;
    isHighlyConcentrated: boolean;
    riskContribution: number;
  };

  // Alerts summary
  alerts?: {
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    recent: DetectionAlert[];
    riskContribution: number;
  };

  // Risk factors triggered
  riskFactors: string[];

  // Assessment timestamp
  assessedAt: string;
}

// ============================================
// MARKET TYPES
// ============================================

export interface DetectionMarket {
  conditionId: string;
  question: string;
  slug: string;
  category?: string;
  outcomeYesTokenId?: string;
  outcomeNoTokenId?: string;
  resolutionTime?: string;
  resolvedAt?: string;
  resolutionOutcome?: 'YES' | 'NO' | 'DRAW' | 'CANCELLED';
  volume24h: number;
  volumeTotal: number;
  liquidity: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
}

// ============================================
// CONFIG TYPES
// ============================================

export interface DetectionConfig {
  wallet_age_days: { high: number; medium: number };
  funding_amount: { absolute_min: number; market_volume_pct: number };
  trade_timing_hours: { high: number; medium: number };
  entry_odds_pct: { threshold: number; price_move_1h: number };
  concentration_pct: { wallet_level: number; cluster_level: number };
}

// ============================================
// FILTER TYPES
// ============================================

export interface AlertFilters {
  status?: AlertStatus | AlertStatus[];
  severity?: AlertSeverity | AlertSeverity[];
  alertType?: AlertType | AlertType[];
  walletAddress?: string;
  conditionId?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface DetectionStatsResponse {
  alertsToday: number;
  alertsTotal: number;
  alertsByType: Record<AlertType, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  activeMarkets: number;
  walletsTracked: number;
}

export interface DetectionAlertsResponse {
  alerts: DetectionAlert[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalletRiskResponse {
  profile: WalletRiskProfile;
}

// ============================================
// UI HELPERS
// ============================================

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  timing: 'Timing',
  size: 'Large Size',
  pattern: 'Pattern',
  cluster: 'Cluster',
  funding: 'Funding',
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  CRITICAL: '#FF3B30', // Red
  HIGH: '#FF9500',     // Orange
  MEDIUM: '#FFCC00',   // Yellow
  LOW: '#00E5FF',      // Cyan
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  CRITICAL: '#FF3B30', // Red
  HIGH: '#FF9500',     // Orange
  MEDIUM: '#FFCC00',   // Yellow
  LOW: '#00E5FF',      // Cyan
  UNKNOWN: '#6B7280',  // Gray
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  new: 'New',
  investigating: 'Investigating',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
};

export const FUNDING_SOURCE_LABELS: Record<FundingSourceType, string> = {
  cex: 'CEX',
  bridge: 'Bridge',
  contract: 'Contract',
  eoa: 'EOA',
  unknown: 'Unknown',
};
