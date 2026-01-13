/**
 * Database operations for the Insider Trading Detection System
 *
 * Provides CRUD operations for all detection-related tables:
 * - markets, depth_snapshots, wallet_activity
 * - wallet_funding_sources, ctf_transfers
 * - detection_alerts, detection_config
 */

import pg from "pg";
import { config } from "../../config/index.js";
import type {
  Market,
  MarketRow,
  DepthSnapshot,
  DepthSnapshotRow,
  WalletActivity,
  WalletActivityRow,
  WalletFundingSource,
  WalletFundingSourceRow,
  CtfTransfer,
  CtfTransferRow,
  DetectionAlert,
  DetectionAlertRow,
  DetectionConfigRow,
  AlertFilters,
  PaginationParams,
  PaginatedResult,
  DetectionStats,
  AlertType,
  AlertSeverity,
  AlertStatus,
} from "./types.js";

const { Pool } = pg;

// Use a separate pool for detection to avoid affecting whale tracker
const pool = new Pool({ connectionString: config.database.url });

// ============================================
// ROW TO MODEL CONVERTERS
// ============================================

function marketRowToModel(row: MarketRow): Market {
  return {
    conditionId: row.condition_id,
    question: row.question,
    slug: row.slug,
    description: row.description || undefined,
    category: row.category || undefined,
    outcomeYesTokenId: row.outcome_yes_token_id || undefined,
    outcomeNoTokenId: row.outcome_no_token_id || undefined,
    resolutionTime: row.resolution_time || undefined,
    resolvedAt: row.resolved_at || undefined,
    resolutionOutcome: row.resolution_outcome as Market['resolutionOutcome'],
    volume24h: parseFloat(row.volume_24h) || 0,
    volumeTotal: parseFloat(row.volume_total) || 0,
    liquidity: parseFloat(row.liquidity) || 0,
    firstSeenAt: row.first_seen_at,
    lastUpdatedAt: row.last_updated_at,
  };
}

function depthSnapshotRowToModel(row: DepthSnapshotRow): DepthSnapshot {
  return {
    id: row.id,
    conditionId: row.condition_id,
    snapshotAt: row.snapshot_at,
    depth2tick: row.depth_2tick || undefined,
    depth5tick: row.depth_5tick || undefined,
    depth10tick: row.depth_10tick || undefined,
    bidLiquidity2tick: row.bid_liquidity_2tick ? parseFloat(row.bid_liquidity_2tick) : undefined,
    askLiquidity2tick: row.ask_liquidity_2tick ? parseFloat(row.ask_liquidity_2tick) : undefined,
    bidLiquidity5tick: row.bid_liquidity_5tick ? parseFloat(row.bid_liquidity_5tick) : undefined,
    askLiquidity5tick: row.ask_liquidity_5tick ? parseFloat(row.ask_liquidity_5tick) : undefined,
    midPrice: row.mid_price ? parseFloat(row.mid_price) : undefined,
    spread: row.spread ? parseFloat(row.spread) : undefined,
    medianLiquidity30d: row.median_liquidity_30d ? parseFloat(row.median_liquidity_30d) : undefined,
  };
}

function walletActivityRowToModel(row: WalletActivityRow): WalletActivity {
  return {
    walletAddress: row.wallet_address,
    conditionId: row.condition_id,
    firstTradeAt: row.first_trade_at || undefined,
    lastTradeAt: row.last_trade_at || undefined,
    totalVolume: parseFloat(row.total_volume) || 0,
    tradeCount: row.trade_count,
    netPosition: parseFloat(row.net_position) || 0,
    avgEntryPrice: row.avg_entry_price ? parseFloat(row.avg_entry_price) : undefined,
    realizedPnl: parseFloat(row.realized_pnl) || 0,
    volumeShareOfWallet: row.volume_share_of_wallet ? parseFloat(row.volume_share_of_wallet) : undefined,
  };
}

function fundingSourceRowToModel(row: WalletFundingSourceRow): WalletFundingSource {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    sourceAddress: row.source_address,
    sourceType: row.source_type as WalletFundingSource['sourceType'],
    sourceLabel: row.source_label || undefined,
    txHash: row.tx_hash,
    amount: parseFloat(row.amount) || 0,
    tokenAddress: row.token_address || undefined,
    blockNumber: row.block_number ? parseInt(row.block_number) : undefined,
    fundedAt: row.funded_at || undefined,
    isFirstFunding: row.is_first_funding,
    hoursBeforeFirstTrade: row.hours_before_first_trade || undefined,
  };
}

function ctfTransferRowToModel(row: CtfTransferRow): CtfTransfer {
  return {
    id: row.id,
    txHash: row.tx_hash,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    tokenId: row.token_id,
    amount: BigInt(row.amount),
    conditionId: row.condition_id || undefined,
    outcome: row.outcome as CtfTransfer['outcome'],
    blockNumber: parseInt(row.block_number),
    blockTimestamp: row.block_timestamp || undefined,
    logIndex: row.log_index || undefined,
  };
}

function alertRowToModel(row: DetectionAlertRow): DetectionAlert {
  return {
    id: row.id,
    alertType: row.alert_type as AlertType,
    severity: row.severity as AlertSeverity,
    confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
    walletAddress: row.wallet_address,
    conditionId: row.condition_id || undefined,
    detectionRule: row.detection_rule,
    triggerValues: row.trigger_values || undefined,
    thresholdValues: row.threshold_values || undefined,
    title: row.title,
    description: row.description || undefined,
    relatedTxHashes: row.related_tx_hashes || undefined,
    relatedWallets: row.related_wallets || undefined,
    status: row.status as AlertStatus,
    reviewedAt: row.reviewed_at || undefined,
    reviewedBy: row.reviewed_by || undefined,
    notes: row.notes || undefined,
    detectedAt: row.detected_at,
  };
}

// ============================================
// DATABASE OPERATIONS
// ============================================

export const detectionDb = {
  // ----------------------------------------
  // MARKETS
  // ----------------------------------------

  async upsertMarket(market: Omit<Market, 'firstSeenAt' | 'lastUpdatedAt'>): Promise<void> {
    await pool.query(
      `INSERT INTO markets (
        condition_id, question, slug, description, category,
        outcome_yes_token_id, outcome_no_token_id,
        resolution_time, resolved_at, resolution_outcome,
        volume_24h, volume_total, liquidity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (condition_id) DO UPDATE SET
        question = EXCLUDED.question,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        outcome_yes_token_id = EXCLUDED.outcome_yes_token_id,
        outcome_no_token_id = EXCLUDED.outcome_no_token_id,
        resolution_time = EXCLUDED.resolution_time,
        resolved_at = EXCLUDED.resolved_at,
        resolution_outcome = EXCLUDED.resolution_outcome,
        volume_24h = EXCLUDED.volume_24h,
        volume_total = EXCLUDED.volume_total,
        liquidity = EXCLUDED.liquidity,
        last_updated_at = NOW()`,
      [
        market.conditionId,
        market.question,
        market.slug,
        market.description || null,
        market.category || null,
        market.outcomeYesTokenId || null,
        market.outcomeNoTokenId || null,
        market.resolutionTime || null,
        market.resolvedAt || null,
        market.resolutionOutcome || null,
        market.volume24h,
        market.volumeTotal,
        market.liquidity,
      ]
    );
  },

  async getMarket(conditionId: string): Promise<Market | null> {
    const result = await pool.query<MarketRow>(
      "SELECT * FROM markets WHERE condition_id = $1",
      [conditionId]
    );
    return result.rows[0] ? marketRowToModel(result.rows[0]) : null;
  },

  async getMarketsNearResolution(hours: number): Promise<Market[]> {
    const result = await pool.query<MarketRow>(
      `SELECT * FROM markets
       WHERE resolution_time IS NOT NULL
         AND resolved_at IS NULL
         AND resolution_time <= NOW() + INTERVAL '${hours} hours'
         AND resolution_time > NOW()
       ORDER BY resolution_time ASC`
    );
    return result.rows.map(marketRowToModel);
  },

  async getActiveMarkets(): Promise<Market[]> {
    const result = await pool.query<MarketRow>(
      `SELECT * FROM markets
       WHERE resolved_at IS NULL
       ORDER BY volume_24h DESC`
    );
    return result.rows.map(marketRowToModel);
  },

  // ----------------------------------------
  // DEPTH SNAPSHOTS
  // ----------------------------------------

  async insertDepthSnapshot(snapshot: Omit<DepthSnapshot, 'id'>): Promise<number> {
    const result = await pool.query(
      `INSERT INTO depth_snapshots (
        condition_id, snapshot_at,
        depth_2tick, depth_5tick, depth_10tick,
        bid_liquidity_2tick, ask_liquidity_2tick,
        bid_liquidity_5tick, ask_liquidity_5tick,
        mid_price, spread, median_liquidity_30d
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        snapshot.conditionId,
        snapshot.snapshotAt,
        snapshot.depth2tick ? JSON.stringify(snapshot.depth2tick) : null,
        snapshot.depth5tick ? JSON.stringify(snapshot.depth5tick) : null,
        snapshot.depth10tick ? JSON.stringify(snapshot.depth10tick) : null,
        snapshot.bidLiquidity2tick || null,
        snapshot.askLiquidity2tick || null,
        snapshot.bidLiquidity5tick || null,
        snapshot.askLiquidity5tick || null,
        snapshot.midPrice || null,
        snapshot.spread || null,
        snapshot.medianLiquidity30d || null,
      ]
    );
    return result.rows[0].id;
  },

  async getRecentSnapshots(conditionId: string, hours: number): Promise<DepthSnapshot[]> {
    const result = await pool.query<DepthSnapshotRow>(
      `SELECT * FROM depth_snapshots
       WHERE condition_id = $1
         AND snapshot_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY snapshot_at DESC`,
      [conditionId]
    );
    return result.rows.map(depthSnapshotRowToModel);
  },

  async getLatestSnapshot(conditionId: string): Promise<DepthSnapshot | null> {
    const result = await pool.query<DepthSnapshotRow>(
      `SELECT * FROM depth_snapshots
       WHERE condition_id = $1
       ORDER BY snapshot_at DESC
       LIMIT 1`,
      [conditionId]
    );
    return result.rows[0] ? depthSnapshotRowToModel(result.rows[0]) : null;
  },

  // ----------------------------------------
  // WALLET ACTIVITY
  // ----------------------------------------

  async upsertWalletActivity(activity: WalletActivity): Promise<void> {
    await pool.query(
      `INSERT INTO wallet_activity (
        wallet_address, condition_id,
        first_trade_at, last_trade_at,
        total_volume, trade_count, net_position,
        avg_entry_price, realized_pnl, volume_share_of_wallet
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (wallet_address, condition_id) DO UPDATE SET
        first_trade_at = COALESCE(wallet_activity.first_trade_at, EXCLUDED.first_trade_at),
        last_trade_at = GREATEST(wallet_activity.last_trade_at, EXCLUDED.last_trade_at),
        total_volume = EXCLUDED.total_volume,
        trade_count = EXCLUDED.trade_count,
        net_position = EXCLUDED.net_position,
        avg_entry_price = EXCLUDED.avg_entry_price,
        realized_pnl = EXCLUDED.realized_pnl,
        volume_share_of_wallet = EXCLUDED.volume_share_of_wallet,
        updated_at = NOW()`,
      [
        activity.walletAddress.toLowerCase(),
        activity.conditionId,
        activity.firstTradeAt || null,
        activity.lastTradeAt || null,
        activity.totalVolume,
        activity.tradeCount,
        activity.netPosition,
        activity.avgEntryPrice || null,
        activity.realizedPnl,
        activity.volumeShareOfWallet || null,
      ]
    );
  },

  async getWalletActivity(walletAddress: string): Promise<WalletActivity[]> {
    const result = await pool.query<WalletActivityRow>(
      `SELECT * FROM wallet_activity
       WHERE wallet_address = $1
       ORDER BY total_volume DESC`,
      [walletAddress.toLowerCase()]
    );
    return result.rows.map(walletActivityRowToModel);
  },

  async getMarketActivity(conditionId: string): Promise<WalletActivity[]> {
    const result = await pool.query<WalletActivityRow>(
      `SELECT * FROM wallet_activity
       WHERE condition_id = $1
       ORDER BY total_volume DESC`,
      [conditionId]
    );
    return result.rows.map(walletActivityRowToModel);
  },

  async getWalletConcentration(walletAddress: string): Promise<{
    topMarket: { conditionId: string; volumeShare: number } | null;
    totalVolume: number;
    marketCount: number;
  }> {
    const result = await pool.query(
      `SELECT
        condition_id,
        total_volume,
        SUM(total_volume) OVER () as wallet_total,
        COUNT(*) OVER () as market_count
       FROM wallet_activity
       WHERE wallet_address = $1
       ORDER BY total_volume DESC
       LIMIT 1`,
      [walletAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return { topMarket: null, totalVolume: 0, marketCount: 0 };
    }

    const row = result.rows[0];
    const walletTotal = parseFloat(row.wallet_total) || 0;
    const topVolume = parseFloat(row.total_volume) || 0;

    return {
      topMarket: {
        conditionId: row.condition_id,
        volumeShare: walletTotal > 0 ? (topVolume / walletTotal) * 100 : 0,
      },
      totalVolume: walletTotal,
      marketCount: parseInt(row.market_count) || 0,
    };
  },

  // ----------------------------------------
  // WALLET FUNDING SOURCES
  // ----------------------------------------

  async recordFundingSource(source: Omit<WalletFundingSource, 'id'>): Promise<number | null> {
    try {
      const result = await pool.query(
        `INSERT INTO wallet_funding_sources (
          wallet_address, source_address, source_type, source_label,
          tx_hash, amount, token_address, block_number, funded_at,
          is_first_funding, hours_before_first_trade
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (wallet_address, tx_hash) DO NOTHING
        RETURNING id`,
        [
          source.walletAddress.toLowerCase(),
          source.sourceAddress.toLowerCase(),
          source.sourceType || null,
          source.sourceLabel || null,
          source.txHash,
          source.amount,
          source.tokenAddress || null,
          source.blockNumber || null,
          source.fundedAt || null,
          source.isFirstFunding,
          source.hoursBeforeFirstTrade || null,
        ]
      );
      return result.rows[0]?.id || null;
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") return null; // Duplicate
      throw error;
    }
  },

  async getWalletFunding(walletAddress: string): Promise<WalletFundingSource[]> {
    const result = await pool.query<WalletFundingSourceRow>(
      `SELECT * FROM wallet_funding_sources
       WHERE wallet_address = $1
       ORDER BY funded_at ASC`,
      [walletAddress.toLowerCase()]
    );
    return result.rows.map(fundingSourceRowToModel);
  },

  async getWalletsWithSameFunder(sourceAddress: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT wallet_address FROM wallet_funding_sources
       WHERE source_address = $1`,
      [sourceAddress.toLowerCase()]
    );
    return result.rows.map(r => r.wallet_address);
  },

  // ----------------------------------------
  // CTF TRANSFERS
  // ----------------------------------------

  async recordCtfTransfer(transfer: Omit<CtfTransfer, 'id'>): Promise<number | null> {
    try {
      const result = await pool.query(
        `INSERT INTO ctf_transfers (
          tx_hash, from_address, to_address, token_id, amount,
          condition_id, outcome, block_number, block_timestamp, log_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tx_hash, log_index) DO NOTHING
        RETURNING id`,
        [
          transfer.txHash,
          transfer.fromAddress.toLowerCase(),
          transfer.toAddress.toLowerCase(),
          transfer.tokenId,
          transfer.amount.toString(),
          transfer.conditionId || null,
          transfer.outcome || null,
          transfer.blockNumber,
          transfer.blockTimestamp || null,
          transfer.logIndex || null,
        ]
      );
      return result.rows[0]?.id || null;
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") return null; // Duplicate
      throw error;
    }
  },

  async getWalletTransfers(walletAddress: string): Promise<CtfTransfer[]> {
    const result = await pool.query<CtfTransferRow>(
      `SELECT * FROM ctf_transfers
       WHERE from_address = $1 OR to_address = $1
       ORDER BY block_number DESC`,
      [walletAddress.toLowerCase()]
    );
    return result.rows.map(ctfTransferRowToModel);
  },

  async getMarketTransfers(conditionId: string): Promise<CtfTransfer[]> {
    const result = await pool.query<CtfTransferRow>(
      `SELECT * FROM ctf_transfers
       WHERE condition_id = $1
       ORDER BY block_number DESC`,
      [conditionId]
    );
    return result.rows.map(ctfTransferRowToModel);
  },

  // ----------------------------------------
  // DETECTION ALERTS
  // ----------------------------------------

  async createAlert(alert: Omit<DetectionAlert, 'id' | 'detectedAt'>): Promise<number> {
    const result = await pool.query(
      `INSERT INTO detection_alerts (
        alert_type, severity, confidence_score,
        wallet_address, condition_id, detection_rule,
        trigger_values, threshold_values,
        title, description,
        related_tx_hashes, related_wallets,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        alert.alertType,
        alert.severity,
        alert.confidenceScore || null,
        alert.walletAddress.toLowerCase(),
        alert.conditionId || null,
        alert.detectionRule,
        alert.triggerValues ? JSON.stringify(alert.triggerValues) : null,
        alert.thresholdValues ? JSON.stringify(alert.thresholdValues) : null,
        alert.title,
        alert.description || null,
        alert.relatedTxHashes || null,
        alert.relatedWallets || null,
        alert.status,
      ]
    );
    return result.rows[0].id;
  },

  async getAlert(id: number): Promise<DetectionAlert | null> {
    const result = await pool.query<DetectionAlertRow>(
      "SELECT * FROM detection_alerts WHERE id = $1",
      [id]
    );
    return result.rows[0] ? alertRowToModel(result.rows[0]) : null;
  },

  async getAlerts(
    filters: AlertFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<DetectionAlert>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(statuses);
      paramIndex++;
    }

    if (filters.severity) {
      const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
      conditions.push(`severity = ANY($${paramIndex})`);
      params.push(severities);
      paramIndex++;
    }

    if (filters.alertType) {
      const types = Array.isArray(filters.alertType) ? filters.alertType : [filters.alertType];
      conditions.push(`alert_type = ANY($${paramIndex})`);
      params.push(types);
      paramIndex++;
    }

    if (filters.walletAddress) {
      conditions.push(`wallet_address = $${paramIndex}`);
      params.push(filters.walletAddress.toLowerCase());
      paramIndex++;
    }

    if (filters.conditionId) {
      conditions.push(`condition_id = $${paramIndex}`);
      params.push(filters.conditionId);
      paramIndex++;
    }

    if (filters.fromDate) {
      conditions.push(`detected_at >= $${paramIndex}`);
      params.push(filters.fromDate);
      paramIndex++;
    }

    if (filters.toDate) {
      conditions.push(`detected_at <= $${paramIndex}`);
      params.push(filters.toDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Sorting
    const validSortFields = ['detected_at', 'severity', 'confidence_score', 'status'];
    const sortBy = validSortFields.includes(pagination.sortBy || '') ? pagination.sortBy : 'detected_at';
    const sortDir = pagination.sortDir === 'asc' ? 'ASC' : 'DESC';

    // Pagination
    const offset = (pagination.page - 1) * pagination.limit;
    params.push(pagination.limit, offset);

    // Execute queries
    const dataQuery = `
      SELECT * FROM detection_alerts
      ${whereClause}
      ORDER BY ${sortBy} ${sortDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) as count FROM detection_alerts ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query<DetectionAlertRow>(dataQuery, params),
      pool.query(countQuery, params.slice(0, -2)), // Exclude limit/offset for count
    ]);

    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    return {
      data: dataResult.rows.map(alertRowToModel),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  },

  async updateAlertStatus(
    id: number,
    status: AlertStatus,
    reviewedBy?: string,
    notes?: string
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE detection_alerts SET
        status = $2,
        reviewed_at = NOW(),
        reviewed_by = COALESCE($3, reviewed_by),
        notes = COALESCE($4, notes)
      WHERE id = $1`,
      [id, status, reviewedBy || null, notes || null]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // ----------------------------------------
  // DETECTION CONFIG
  // ----------------------------------------

  async getConfig<T>(key: string): Promise<T | null> {
    const result = await pool.query<DetectionConfigRow>(
      "SELECT config_value FROM detection_config WHERE config_key = $1",
      [key]
    );
    return result.rows[0]?.config_value as T ?? null;
  },

  async getAllConfig(): Promise<Record<string, unknown>> {
    const result = await pool.query<DetectionConfigRow>(
      "SELECT config_key, config_value FROM detection_config"
    );
    const configMap: Record<string, unknown> = {};
    for (const row of result.rows) {
      configMap[row.config_key] = row.config_value;
    }
    return configMap;
  },

  async updateConfig(key: string, value: unknown, updatedBy?: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE detection_config SET
        config_value = $2,
        updated_at = NOW(),
        updated_by = $3
      WHERE config_key = $1`,
      [key, JSON.stringify(value), updatedBy || null]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // ----------------------------------------
  // STATS
  // ----------------------------------------

  async getStats(): Promise<DetectionStats> {
    const [
      alertsTodayResult,
      alertsTotalResult,
      alertsByTypeResult,
      alertsBySeverityResult,
      activeMarketsResult,
      walletsTrackedResult,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM detection_alerts WHERE detected_at >= NOW() - INTERVAL '24 hours'"),
      pool.query("SELECT COUNT(*) as count FROM detection_alerts"),
      pool.query("SELECT alert_type, COUNT(*) as count FROM detection_alerts GROUP BY alert_type"),
      pool.query("SELECT severity, COUNT(*) as count FROM detection_alerts GROUP BY severity"),
      pool.query("SELECT COUNT(*) as count FROM markets WHERE resolved_at IS NULL"),
      pool.query("SELECT COUNT(DISTINCT wallet_address) as count FROM wallet_activity"),
    ]);

    const alertsByType: Record<AlertType, number> = {
      timing: 0, size: 0, pattern: 0, cluster: 0, funding: 0,
    };
    for (const row of alertsByTypeResult.rows) {
      alertsByType[row.alert_type as AlertType] = parseInt(row.count);
    }

    const alertsBySeverity: Record<AlertSeverity, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0,
    };
    for (const row of alertsBySeverityResult.rows) {
      alertsBySeverity[row.severity as AlertSeverity] = parseInt(row.count);
    }

    return {
      alertsToday: parseInt(alertsTodayResult.rows[0]?.count || "0"),
      alertsTotal: parseInt(alertsTotalResult.rows[0]?.count || "0"),
      alertsByType,
      alertsBySeverity,
      activeMarkets: parseInt(activeMarketsResult.rows[0]?.count || "0"),
      walletsTracked: parseInt(walletsTrackedResult.rows[0]?.count || "0"),
    };
  },

  // ----------------------------------------
  // CLEANUP
  // ----------------------------------------

  async close(): Promise<void> {
    await pool.end();
  },
};
