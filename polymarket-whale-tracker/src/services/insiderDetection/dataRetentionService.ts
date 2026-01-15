/**
 * Data Retention Service
 *
 * Automatically cleans up old data to keep the database bounded.
 * This is the correct approach to storage optimization - we need ALL
 * transfers for cluster detection and wallet activity, but we don't
 * need them forever.
 *
 * Retention policies (optimized for ~500MB-1GB total storage):
 * - ctf_transfers: 14 days (sufficient for cluster detection)
 * - depth_snapshots: 3 days (on-demand mode, rarely stored)
 * - price_history: 14 days (for MTM calculations)
 * - wallet_activity: 30 days (wallet profiles)
 *
 * Usage:
 * - Run as daily cron job: npx tsx src/services/insiderDetection/dataRetentionService.ts
 * - Or call cleanup() programmatically
 *
 * Cron setup (add to crontab -e):
 *   0 3 * * * cd /path/to/polymarket-whale-tracker && npx tsx src/services/insiderDetection/dataRetentionService.ts >> /var/log/polywoly-retention.log 2>&1
 */

import "dotenv/config";
import pg from "pg";
import pino from "pino";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const logger = pino({ level: "info" });

// Retention periods in days (optimized for low storage)
const RETENTION_POLICIES = {
  ctf_transfers: 14, // 14 days for cluster detection lookback
  depth_snapshots: 3, // Minimal - on-demand mode rarely stores
  price_history: 14, // 14 days for MTM calculations
  wallet_activity: 30, // 30 days for wallet profiles
};

interface CleanupResult {
  table: string;
  deletedRows: number;
  retentionDays: number;
  error?: string;
}

/**
 * Clean up old data from a single table
 */
async function cleanupTable(
  tableName: string,
  timestampColumn: string,
  retentionDays: number
): Promise<CleanupResult> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await pool.query(
      `DELETE FROM ${tableName} WHERE ${timestampColumn} < $1`,
      [cutoffDate]
    );

    const deletedRows = result.rowCount || 0;

    logger.info({
      msg: `Cleaned up ${tableName}`,
      deletedRows,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
    });

    return {
      table: tableName,
      deletedRows,
      retentionDays,
    };
  } catch (error) {
    logger.error({
      msg: `Failed to clean up ${tableName}`,
      error,
    });

    return {
      table: tableName,
      deletedRows: 0,
      retentionDays,
      error: String(error),
    };
  }
}

/**
 * Run all cleanup tasks
 */
export async function cleanup(): Promise<CleanupResult[]> {
  logger.info({ msg: "Starting data retention cleanup..." });
  const startTime = Date.now();

  const results: CleanupResult[] = [];

  // ctf_transfers - uses block_timestamp
  results.push(
    await cleanupTable(
      "ctf_transfers",
      "block_timestamp",
      RETENTION_POLICIES.ctf_transfers
    )
  );

  // depth_snapshots - uses snapshot_at
  results.push(
    await cleanupTable(
      "depth_snapshots",
      "snapshot_at",
      RETENTION_POLICIES.depth_snapshots
    )
  );

  // price_history - uses recorded_at
  results.push(
    await cleanupTable(
      "price_history",
      "recorded_at",
      RETENTION_POLICIES.price_history
    )
  );

  // wallet_activity - uses updated_at
  results.push(
    await cleanupTable(
      "wallet_activity",
      "updated_at",
      RETENTION_POLICIES.wallet_activity
    )
  );

  const totalDeleted = results.reduce((sum, r) => sum + r.deletedRows, 0);
  const duration = (Date.now() - startTime) / 1000;

  logger.info({
    msg: "Data retention cleanup complete",
    totalDeleted,
    durationSeconds: duration.toFixed(2),
    results: results.map((r) => ({ table: r.table, deleted: r.deletedRows })),
  });

  return results;
}

/**
 * Get current table sizes for monitoring
 */
export async function getTableSizes(): Promise<
  Array<{ table: string; size: string; rows: number }>
> {
  const result = await pool.query(`
    SELECT
      tablename as table,
      pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size('public.' || tablename) DESC
  `);

  // Get row counts for key tables
  const tables = [];
  for (const row of result.rows) {
    let rows = 0;
    try {
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM ${row.table}`
      );
      rows = parseInt(countResult.rows[0].count);
    } catch {
      // Some tables might not exist or have issues
    }
    tables.push({
      table: row.table,
      size: row.size,
      rows,
    });
  }

  return tables;
}

// CLI entry point
async function main() {
  console.log("=".repeat(60));
  console.log("DATA RETENTION CLEANUP");
  console.log("=".repeat(60));
  console.log();

  // Show current sizes before cleanup
  console.log("Table sizes BEFORE cleanup:");
  const beforeSizes = await getTableSizes();
  for (const t of beforeSizes.slice(0, 10)) {
    console.log(`  ${t.table}: ${t.size} (${t.rows.toLocaleString()} rows)`);
  }
  console.log();

  // Show retention policies
  console.log("Retention policies:");
  for (const [table, days] of Object.entries(RETENTION_POLICIES)) {
    console.log(`  ${table}: ${days} days`);
  }
  console.log();

  // Run cleanup
  const results = await cleanup();

  // Show results
  console.log();
  console.log("Cleanup results:");
  for (const r of results) {
    const status = r.error ? "❌" : "✅";
    console.log(
      `  ${status} ${r.table}: ${r.deletedRows.toLocaleString()} rows deleted`
    );
  }
  console.log();

  // Show current sizes after cleanup
  console.log("Table sizes AFTER cleanup:");
  const afterSizes = await getTableSizes();
  for (const t of afterSizes.slice(0, 10)) {
    console.log(`  ${t.table}: ${t.size} (${t.rows.toLocaleString()} rows)`);
  }

  await pool.end();
  process.exit(0);
}

// Run if called directly
const isMainModule = process.argv[1]?.includes("dataRetentionService");
if (isMainModule) {
  main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
}

export const dataRetentionService = {
  cleanup,
  getTableSizes,
  RETENTION_POLICIES,
};
