/**
 * Migration: Add Wallet Source Column
 *
 * Adds a 'source' column to the wallets table to track how a wallet was added:
 * - 'deposit_tracking': Added via the standard deposit monitoring flow (default)
 * - 'detection': Added via the insider detection system when a suspicious alert was triggered
 *
 * Run with: npx tsx src/scripts/migrations/004_add_wallet_source.ts
 */

import pg from "pg";
import { config } from "../../config/index.js";

const { Pool } = pg;

export async function migrate() {
  const pool = new Pool({ connectionString: config.database.url });

  const migration = `
    -- Add source column to wallets table
    -- Tracks how the wallet was added to the database
    -- 'deposit_tracking' = standard deposit monitoring (default for existing wallets)
    -- 'detection' = added via insider detection system

    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'deposit_tracking';

    -- Index for filtering by source
    CREATE INDEX IF NOT EXISTS idx_wallets_source ON wallets(source);

    -- Add comment explaining the column
    COMMENT ON COLUMN wallets.source IS 'How the wallet was added: deposit_tracking (default) or detection (via insider alert)';
  `;

  try {
    console.log("Running migration: 004_add_wallet_source...");
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
