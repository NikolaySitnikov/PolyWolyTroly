/**
 * Type definitions for the Insider Trading Detection System
 */

// ============================================
// MARKET TYPES
// ============================================

export interface Market {
  conditionId: string;
  question: string;
  slug: string;
  description?: string;
  category?: string;
  outcomeYesTokenId?: string;
  outcomeNoTokenId?: string;
  resolutionTime?: Date;
  resolvedAt?: Date;
  resolutionOutcome?: 'YES' | 'NO' | 'DRAW' | 'CANCELLED';
  volume24h: number;
  volumeTotal: number;
  liquidity: number;
  firstSeenAt: Date;
  lastUpdatedAt: Date;
}

export interface MarketRow {
  condition_id: string;
  question: string;
  slug: string;
  description: string | null;
  category: string | null;
  outcome_yes_token_id: string | null;
  outcome_no_token_id: string | null;
  resolution_time: Date | null;
  resolved_at: Date | null;
  resolution_outcome: string | null;
  volume_24h: string;
  volume_total: string;
  liquidity: string;
  first_seen_at: Date;
  last_updated_at: Date;
  created_at: Date;
}

// ============================================
// DEPTH SNAPSHOT TYPES
// ============================================

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface DepthSnapshot {
  id?: number;
  conditionId: string;
  snapshotAt: Date;
  depth2tick?: OrderBookLevel[];
  depth5tick?: OrderBookLevel[];
  depth10tick?: OrderBookLevel[];
  bidLiquidity2tick?: number;
  askLiquidity2tick?: number;
  bidLiquidity5tick?: number;
  askLiquidity5tick?: number;
  midPrice?: number;
  spread?: number;
  medianLiquidity30d?: number;
}

export interface DepthSnapshotRow {
  id: number;
  condition_id: string;
  snapshot_at: Date;
  depth_2tick: OrderBookLevel[] | null;
  depth_5tick: OrderBookLevel[] | null;
  depth_10tick: OrderBookLevel[] | null;
  bid_liquidity_2tick: string | null;
  ask_liquidity_2tick: string | null;
  bid_liquidity_5tick: string | null;
  ask_liquidity_5tick: string | null;
  mid_price: string | null;
  spread: string | null;
  median_liquidity_30d: string | null;
  created_at: Date;
}

// ============================================
// WALLET ACTIVITY TYPES
// ============================================

export interface WalletActivity {
  walletAddress: string;
  conditionId: string;
  firstTradeAt?: Date;
  lastTradeAt?: Date;
  totalVolume: number;
  tradeCount: number;
  netPosition: number;
  avgEntryPrice?: number;
  realizedPnl: number;
  volumeShareOfWallet?: number;
}

export interface WalletActivityRow {
  wallet_address: string;
  condition_id: string;
  first_trade_at: Date | null;
  last_trade_at: Date | null;
  total_volume: string;
  trade_count: number;
  net_position: string;
  avg_entry_price: string | null;
  realized_pnl: string;
  volume_share_of_wallet: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// FUNDING SOURCE TYPES
// ============================================

export type FundingSourceType = 'cex' | 'bridge' | 'contract' | 'eoa' | 'unknown';

export interface WalletFundingSource {
  id?: number;
  walletAddress: string;
  sourceAddress: string;
  sourceType?: FundingSourceType;
  sourceLabel?: string;
  txHash: string;
  amount: number;
  tokenAddress?: string;
  blockNumber?: number;
  fundedAt?: Date;
  isFirstFunding: boolean;
  hoursBeforeFirstTrade?: number;
}

export interface WalletFundingSourceRow {
  id: number;
  wallet_address: string;
  source_address: string;
  source_type: string | null;
  source_label: string | null;
  tx_hash: string;
  amount: string;
  token_address: string | null;
  block_number: string | null;
  funded_at: Date | null;
  is_first_funding: boolean;
  hours_before_first_trade: number | null;
  created_at: Date;
}

// ============================================
// CTF TRANSFER TYPES
// ============================================

export interface CtfTransfer {
  id?: number;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  tokenId: string;
  amount: bigint;
  conditionId?: string;
  outcome?: 'YES' | 'NO';
  blockNumber: number;
  blockTimestamp?: Date;
  logIndex?: number;
}

export interface CtfTransferRow {
  id: number;
  tx_hash: string;
  from_address: string;
  to_address: string;
  token_id: string;
  amount: string;
  condition_id: string | null;
  outcome: string | null;
  block_number: string;
  block_timestamp: Date | null;
  log_index: number | null;
  created_at: Date;
}

// ============================================
// DETECTION ALERT TYPES
// ============================================

export type AlertType = 'timing' | 'size' | 'pattern' | 'cluster' | 'funding';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'new' | 'investigating' | 'confirmed' | 'dismissed';

export interface DetectionAlert {
  id?: number;
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
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
  detectedAt: Date;
}

export interface DetectionAlertRow {
  id: number;
  alert_type: string;
  severity: string;
  confidence_score: string | null;
  wallet_address: string;
  condition_id: string | null;
  detection_rule: string;
  trigger_values: Record<string, unknown> | null;
  threshold_values: Record<string, unknown> | null;
  title: string;
  description: string | null;
  related_tx_hashes: string[] | null;
  related_wallets: string[] | null;
  status: string;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  notes: string | null;
  detected_at: Date;
  created_at: Date;
}

// ============================================
// DETECTION CONFIG TYPES
// ============================================

export interface WalletAgeConfig {
  high: number;   // Days threshold for HIGH alert (default: 14)
  medium: number; // Days threshold for MEDIUM alert (default: 30)
}

export interface FundingAmountConfig {
  absolute_min: number;      // Minimum USD amount (default: 3000)
  market_volume_pct: number; // % of market 24h volume (default: 5)
}

export interface TradeTimingConfig {
  high: number;   // Hours threshold for HIGH alert (default: 2)
  medium: number; // Hours threshold for MEDIUM alert (default: 24)
}

export interface EntryOddsConfig {
  threshold: number;    // Entry odds % threshold (default: 15)
  price_move_1h: number; // Price move % in 1h (default: 8)
}

export interface ConcentrationConfig {
  wallet_level: number;  // % concentration at wallet level (default: 85)
  cluster_level: number; // % concentration at cluster level (default: 70)
}

export interface DetectionConfig {
  wallet_age_days: WalletAgeConfig;
  funding_amount: FundingAmountConfig;
  trade_timing_hours: TradeTimingConfig;
  entry_odds_pct: EntryOddsConfig;
  concentration_pct: ConcentrationConfig;
}

export interface DetectionConfigRow {
  id: number;
  config_key: string;
  config_value: unknown;
  description: string | null;
  updated_at: Date;
  updated_by: string | null;
}

// ============================================
// QUERY & FILTER TYPES
// ============================================

export interface AlertFilters {
  status?: AlertStatus | AlertStatus[];
  severity?: AlertSeverity | AlertSeverity[];
  alertType?: AlertType | AlertType[];
  walletAddress?: string;
  conditionId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
