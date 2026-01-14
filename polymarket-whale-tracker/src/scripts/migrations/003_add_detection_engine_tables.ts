/**
 * Migration: Add Detection Engine Tables
 *
 * Creates the database infrastructure for Phase 1 detection rules:
 * - price_history: Track token prices for MTM calculations
 * - wallet_clusters: Store computed wallet relationships
 * - detection_rule_config: Per-rule configuration and thresholds
 *
 * Run with: npx tsx src/scripts/migrations/003_add_detection_engine_tables.ts
 */

import pg from "pg";
import { config } from "../../config/index.js";

const { Pool } = pg;

export async function migrate() {
  const pool = new Pool({ connectionString: config.database.url });

  const migration = `
    -- ============================================
    -- 1. PRICE_HISTORY TABLE
    -- Track token prices for MTM calculations
    -- ============================================
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      condition_id VARCHAR(66) NOT NULL,
      token_id VARCHAR(100) NOT NULL,
      price DECIMAL(10,6) NOT NULL,
      source VARCHAR(50) DEFAULT 'clob',
      recorded_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(condition_id, recorded_at)
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_condition_time
      ON price_history(condition_id, recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_price_history_time
      ON price_history(recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_price_history_token
      ON price_history(token_id);

    -- ============================================
    -- 2. WALLET_CLUSTERS TABLE
    -- Store computed wallet relationships
    -- ============================================
    CREATE TABLE IF NOT EXISTS wallet_clusters (
      id SERIAL PRIMARY KEY,
      cluster_id UUID NOT NULL,
      wallet_address VARCHAR(42) NOT NULL,
      relationship_type VARCHAR(50) NOT NULL,
      related_wallet VARCHAR(42),
      evidence JSONB,
      strength DECIMAL(5,2) DEFAULT 1.0,
      discovered_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(wallet_address, related_wallet, relationship_type)
    );

    CREATE INDEX IF NOT EXISTS idx_wallet_clusters_cluster
      ON wallet_clusters(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_clusters_wallet
      ON wallet_clusters(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_wallet_clusters_related
      ON wallet_clusters(related_wallet);
    CREATE INDEX IF NOT EXISTS idx_wallet_clusters_type
      ON wallet_clusters(relationship_type);

    -- ============================================
    -- 3. DETECTION_RULE_CONFIG TABLE
    -- Per-rule configuration and thresholds
    -- ============================================
    CREATE TABLE IF NOT EXISTS detection_rule_config (
      rule_name VARCHAR(100) PRIMARY KEY,
      enabled BOOLEAN DEFAULT TRUE,
      thresholds JSONB NOT NULL,
      description TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Seed default rule configurations
    INSERT INTO detection_rule_config (rule_name, enabled, thresholds, description) VALUES
      ('FreshConcentratedDepthImpact', true, '{
        "max_wallet_age_days": 14,
        "min_concentration_pct": 85,
        "min_trade_size_usd": 3000,
        "min_depth_ratio": 3.0
      }', 'Detects new wallets with high concentration making impactful trades'),

      ('PreMoveAdvantage', true, '{
        "min_trade_size_usd": 3000,
        "min_mtm_gain_pct": 8,
        "lookback_hours": 1,
        "vol_multiplier": 1.5
      }', 'Detects trades that gain significant value within lookback window'),

      ('CoordinatedCluster', true, '{
        "min_cluster_size": 3,
        "min_total_notional_usd": 50000,
        "max_median_age_days": 45,
        "time_window_hours": 6
      }', 'Detects coordinated trading from related wallets')
    ON CONFLICT (rule_name) DO NOTHING;

    -- ============================================
    -- 4. PENDING_MTM_EVALUATIONS TABLE
    -- Track trades awaiting MTM re-evaluation
    -- ============================================
    CREATE TABLE IF NOT EXISTS pending_mtm_evaluations (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      condition_id VARCHAR(66) NOT NULL,
      trade_timestamp TIMESTAMPTZ NOT NULL,
      entry_price DECIMAL(10,6) NOT NULL,
      trade_size_usd DECIMAL(20,2) NOT NULL,
      tx_hash VARCHAR(66),
      evaluate_at TIMESTAMPTZ NOT NULL,
      evaluated BOOLEAN DEFAULT FALSE,
      evaluation_result JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pending_mtm_evaluate_at
      ON pending_mtm_evaluations(evaluate_at) WHERE evaluated = FALSE;
    CREATE INDEX IF NOT EXISTS idx_pending_mtm_wallet
      ON pending_mtm_evaluations(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_pending_mtm_condition
      ON pending_mtm_evaluations(condition_id);
  `;

  try {
    console.log("Running migration: 003_add_detection_engine_tables...");
    await pool.query(migration);
    console.log("✅ Migration completed successfully!");
    console.log("   Created tables: price_history, wallet_clusters,");
    console.log("                   detection_rule_config, pending_mtm_evaluations");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
migrate();
