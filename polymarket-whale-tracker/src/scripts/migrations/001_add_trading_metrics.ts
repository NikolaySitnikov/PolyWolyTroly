/**
 * Migration: Add Trading Metrics Columns
 *
 * Adds P&L, win rate, and activity tracking columns to the wallets table.
 * These columns are populated by the cache warmer and used for filtering/sorting.
 *
 * Run with: npx tsx src/scripts/migrations/001_add_trading_metrics.ts
 */

import pg from "pg";
import { config } from "../../config/index.js";

const { Pool } = pg;

export async function migrate() {
  const pool = new Pool({ connectionString: config.database.url });

  const migration = `
    -- Add trading metrics columns to wallets table
    -- These are cached from Polymarket API and refreshed periodically

    -- Profit and Loss metrics
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pnl DECIMAL(20, 2);
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pnl_7d DECIMAL(20, 2);
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pnl_30d DECIMAL(20, 2);

    -- Trading performance
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5, 2);
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS portfolio_value DECIMAL(20, 2);
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS total_trades INTEGER;

    -- Activity tracking
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;

    -- Timestamp for when trading data was last updated
    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS trading_data_updated_at TIMESTAMP WITH TIME ZONE;

    -- Indexes for filtering and sorting
    CREATE INDEX IF NOT EXISTS idx_wallets_pnl ON wallets(pnl) WHERE pnl IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_wallets_is_live ON wallets(is_live) WHERE is_live = TRUE;
    CREATE INDEX IF NOT EXISTS idx_wallets_trading_updated ON wallets(trading_data_updated_at);

    -- Composite indexes for common filter + sort combinations
    CREATE INDEX IF NOT EXISTS idx_wallets_pnl_deposited ON wallets(pnl, total_deposited DESC) WHERE pnl IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_wallets_live_deposited ON wallets(is_live, total_deposited DESC) WHERE is_live = TRUE;
  `;

  try {
    console.log("Running migration: 001_add_trading_metrics...");
    await pool.query(migration);
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
migrate();
