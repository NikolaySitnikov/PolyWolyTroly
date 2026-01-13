/**
 * Migration: Add Insider Detection Tables
 *
 * Creates the database infrastructure for the insider trading detection system:
 * - markets: Market metadata and resolution tracking
 * - depth_snapshots: Order book depth snapshots
 * - wallet_activity: Per-market wallet activity index
 * - wallet_funding_sources: 1-hop funding source analysis
 * - ctf_transfers: ERC-1155 token movements
 * - detection_alerts: Suspicious pattern alerts
 * - detection_config: Configurable detection thresholds
 *
 * Run with: npx tsx src/scripts/migrations/002_add_insider_detection_tables.ts
 */

import pg from "pg";
import { config } from "../../config/index.js";

const { Pool } = pg;

export async function migrate() {
  const pool = new Pool({ connectionString: config.database.url });

  const migration = `
    -- ============================================
    -- 1. MARKETS TABLE
    -- Store market metadata for resolution tracking
    -- ============================================
    CREATE TABLE IF NOT EXISTS markets (
      condition_id VARCHAR(66) PRIMARY KEY,
      question TEXT NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      outcome_yes_token_id VARCHAR(100),
      outcome_no_token_id VARCHAR(100),
      resolution_time TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ,
      resolution_outcome VARCHAR(10),
      volume_24h DECIMAL(20,2) DEFAULT 0,
      volume_total DECIMAL(20,2) DEFAULT 0,
      liquidity DECIMAL(20,2) DEFAULT 0,
      first_seen_at TIMESTAMPTZ DEFAULT NOW(),
      last_updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_markets_slug ON markets(slug);
    CREATE INDEX IF NOT EXISTS idx_markets_resolution_time ON markets(resolution_time);
    CREATE INDEX IF NOT EXISTS idx_markets_resolved_at ON markets(resolved_at) WHERE resolved_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);

    -- ============================================
    -- 2. DEPTH_SNAPSHOTS TABLE
    -- Order book snapshots for liquidity analysis
    -- ============================================
    CREATE TABLE IF NOT EXISTS depth_snapshots (
      id SERIAL PRIMARY KEY,
      condition_id VARCHAR(66) NOT NULL REFERENCES markets(condition_id) ON DELETE CASCADE,
      snapshot_at TIMESTAMPTZ DEFAULT NOW(),
      depth_2tick JSONB,
      depth_5tick JSONB,
      depth_10tick JSONB,
      bid_liquidity_2tick DECIMAL(20,2),
      ask_liquidity_2tick DECIMAL(20,2),
      bid_liquidity_5tick DECIMAL(20,2),
      ask_liquidity_5tick DECIMAL(20,2),
      mid_price DECIMAL(10,6),
      spread DECIMAL(10,6),
      median_liquidity_30d DECIMAL(20,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_depth_condition_time ON depth_snapshots(condition_id, snapshot_at DESC);
    CREATE INDEX IF NOT EXISTS idx_depth_snapshot_time ON depth_snapshots(snapshot_at DESC);

    -- ============================================
    -- 3. WALLET_ACTIVITY TABLE
    -- Per-market wallet activity index
    -- ============================================
    CREATE TABLE IF NOT EXISTS wallet_activity (
      wallet_address VARCHAR(42) NOT NULL,
      condition_id VARCHAR(66) NOT NULL,
      first_trade_at TIMESTAMPTZ,
      last_trade_at TIMESTAMPTZ,
      total_volume DECIMAL(20,2) DEFAULT 0,
      trade_count INTEGER DEFAULT 0,
      net_position DECIMAL(20,6) DEFAULT 0,
      avg_entry_price DECIMAL(10,6),
      realized_pnl DECIMAL(20,2) DEFAULT 0,
      volume_share_of_wallet DECIMAL(10,4),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (wallet_address, condition_id)
    );

    CREATE INDEX IF NOT EXISTS idx_wallet_activity_wallet ON wallet_activity(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_wallet_activity_market ON wallet_activity(condition_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_activity_first_trade ON wallet_activity(first_trade_at);
    CREATE INDEX IF NOT EXISTS idx_wallet_activity_volume ON wallet_activity(total_volume DESC);

    -- ============================================
    -- 4. WALLET_FUNDING_SOURCES TABLE
    -- 1-hop funding source analysis
    -- ============================================
    CREATE TABLE IF NOT EXISTS wallet_funding_sources (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      source_address VARCHAR(42) NOT NULL,
      source_type VARCHAR(50),
      source_label VARCHAR(255),
      tx_hash VARCHAR(66) NOT NULL,
      amount DECIMAL(20,6) NOT NULL,
      token_address VARCHAR(42),
      block_number BIGINT,
      funded_at TIMESTAMPTZ,
      is_first_funding BOOLEAN DEFAULT FALSE,
      hours_before_first_trade INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(wallet_address, tx_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_funding_wallet ON wallet_funding_sources(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_funding_source ON wallet_funding_sources(source_address);
    CREATE INDEX IF NOT EXISTS idx_funding_source_type ON wallet_funding_sources(source_type);

    -- ============================================
    -- 5. CTF_TRANSFERS TABLE
    -- ERC-1155 token movements
    -- ============================================
    CREATE TABLE IF NOT EXISTS ctf_transfers (
      id SERIAL PRIMARY KEY,
      tx_hash VARCHAR(66) NOT NULL,
      from_address VARCHAR(42) NOT NULL,
      to_address VARCHAR(42) NOT NULL,
      token_id VARCHAR(100) NOT NULL,
      amount DECIMAL(30,0) NOT NULL,
      condition_id VARCHAR(66),
      outcome VARCHAR(10),
      block_number BIGINT NOT NULL,
      block_timestamp TIMESTAMPTZ,
      log_index INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tx_hash, log_index)
    );

    CREATE INDEX IF NOT EXISTS idx_ctf_from ON ctf_transfers(from_address);
    CREATE INDEX IF NOT EXISTS idx_ctf_to ON ctf_transfers(to_address);
    CREATE INDEX IF NOT EXISTS idx_ctf_token ON ctf_transfers(token_id);
    CREATE INDEX IF NOT EXISTS idx_ctf_condition ON ctf_transfers(condition_id);
    CREATE INDEX IF NOT EXISTS idx_ctf_block ON ctf_transfers(block_number DESC);

    -- ============================================
    -- 6. DETECTION_ALERTS TABLE
    -- Suspicious pattern alerts
    -- ============================================
    CREATE TABLE IF NOT EXISTS detection_alerts (
      id SERIAL PRIMARY KEY,
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      confidence_score DECIMAL(5,2),
      wallet_address VARCHAR(42) NOT NULL,
      condition_id VARCHAR(66),
      detection_rule VARCHAR(100) NOT NULL,
      trigger_values JSONB,
      threshold_values JSONB,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      related_tx_hashes TEXT[],
      related_wallets TEXT[],
      status VARCHAR(20) DEFAULT 'new',
      reviewed_at TIMESTAMPTZ,
      reviewed_by VARCHAR(100),
      notes TEXT,
      detected_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_status ON detection_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON detection_alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_wallet ON detection_alerts(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_alerts_market ON detection_alerts(condition_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_detected ON detection_alerts(detected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_type_severity ON detection_alerts(alert_type, severity);

    -- ============================================
    -- 7. DETECTION_CONFIG TABLE
    -- Configurable detection thresholds
    -- ============================================
    CREATE TABLE IF NOT EXISTS detection_config (
      id SERIAL PRIMARY KEY,
      config_key VARCHAR(100) UNIQUE NOT NULL,
      config_value JSONB NOT NULL,
      description TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by VARCHAR(100)
    );

    -- Seed default threshold configuration
    INSERT INTO detection_config (config_key, config_value, description) VALUES
      ('wallet_age_days', '{"high": 14, "medium": 30}',
       'Wallet age thresholds: <14 days = HIGH alert, <30 days = MEDIUM alert'),
      ('funding_amount', '{"absolute_min": 3000, "market_volume_pct": 5}',
       'Funding thresholds: >=3000 USD OR >=5% of market 24h volume'),
      ('trade_timing_hours', '{"high": 2, "medium": 24}',
       'Time from funding to trade: <2h = HIGH alert, <24h = MEDIUM alert'),
      ('entry_odds_pct', '{"threshold": 15, "price_move_1h": 8}',
       'Entry odds: <=15% OR price moved >8% in 1h'),
      ('concentration_pct', '{"wallet_level": 85, "cluster_level": 70}',
       'Position concentration: >=85% wallet level, >=70% cluster level')
    ON CONFLICT (config_key) DO NOTHING;
  `;

  try {
    console.log("Running migration: 002_add_insider_detection_tables...");
    await pool.query(migration);
    console.log("✅ Migration completed successfully!");
    console.log("   Created tables: markets, depth_snapshots, wallet_activity,");
    console.log("                   wallet_funding_sources, ctf_transfers,");
    console.log("                   detection_alerts, detection_config");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
migrate();
