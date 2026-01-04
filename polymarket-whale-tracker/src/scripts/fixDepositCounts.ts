/**
 * Fix Deposit Counts Script
 *
 * The deposits table is the source of truth.
 * wallet.deposit_count = COUNT of deposits in deposits table
 * wallet.total_deposited = SUM of deposits in deposits table
 */

import pg from "pg";
import { config } from "../config/index.js";

const { Pool } = pg;

async function fixDepositCounts(): Promise<void> {
  const pool = new Pool({ connectionString: config.database.url });

  try {
    console.log("🔧 Fixing wallet deposit counts from deposits table...");

    // Fix: sync wallet stats with actual deposits table data
    const result = await pool.query(`
      UPDATE wallets
      SET
        deposit_count = subquery.actual_count,
        total_deposited = subquery.actual_total
      FROM (
        SELECT
          wallet_address,
          COUNT(*) as actual_count,
          SUM(amount) as actual_total
        FROM deposits
        GROUP BY wallet_address
      ) as subquery
      WHERE wallets.address = subquery.wallet_address
        AND (wallets.deposit_count != subquery.actual_count
             OR wallets.total_deposited != subquery.actual_total)
      RETURNING wallets.address, wallets.deposit_count, wallets.total_deposited
    `);

    console.log(`✅ Fixed ${result.rowCount} wallet(s)`);

  } catch (error) {
    console.error("❌ Error fixing deposit counts:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixDepositCounts()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
