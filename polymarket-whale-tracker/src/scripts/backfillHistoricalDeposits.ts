/**
 * Backfill Historical Deposits Script
 *
 * Fetches historical deposit data from Polygonscan for all existing whales
 * and updates their deposit history in the database.
 *
 * This is a one-time migration script to populate historical data for
 * wallets that were added before the historical backfill feature.
 *
 * Usage:
 *   npx tsx src/scripts/backfillHistoricalDeposits.ts
 *   npx tsx src/scripts/backfillHistoricalDeposits.ts --dry-run
 */

import pg from "pg";
import { config } from "../config/index.js";
import { historicalDeposits as historicalDepositsService } from "../services/historicalDeposits.js";

const { Pool } = pg;

// Rate limiting to avoid hitting RPC limits
const DELAY_BETWEEN_WALLETS_MS = 500;
const BATCH_SIZE = 10;

interface WalletRow {
  address: string;
  total_deposited: number;
  deposit_count: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillHistoricalDeposits(dryRun = false): Promise<void> {
  const pool = new Pool({ connectionString: config.database.url });

  try {
    console.log("🐋 Starting historical deposits backfill...");
    console.log(dryRun ? "🔍 DRY RUN MODE - No changes will be made" : "");

    // Get all wallets
    const walletsResult = await pool.query<WalletRow>(
      "SELECT address, total_deposited, deposit_count FROM wallets ORDER BY total_deposited DESC"
    );
    const wallets = walletsResult.rows;

    console.log(`📊 Found ${wallets.length} wallets to process`);

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const wallet of wallets) {
      processed++;
      const progress = `[${processed}/${wallets.length}]`;

      try {
        // Fetch historical deposits from blockchain via RPC
        const deposits = await historicalDepositsService.getHistoricalDeposits(wallet.address);

        if (deposits.length === 0) {
          console.log(`${progress} ⏭️  ${wallet.address.slice(0, 10)}... - No deposits found`);
          skipped++;
          await sleep(DELAY_BETWEEN_WALLETS_MS);
          continue;
        }

        // Calculate new totals
        const newTotal = historicalDepositsService.calculateTotalDeposited(deposits);
        const newCount = deposits.length;
        const firstDeposit = historicalDepositsService.getFirstDepositInfo(deposits);

        // Check if update is needed
        const needsUpdate = newTotal !== wallet.total_deposited || newCount !== wallet.deposit_count;

        if (!needsUpdate) {
          console.log(
            `${progress} ✅ ${wallet.address.slice(0, 10)}... - Already up to date (${newCount} deposits, $${newTotal.toLocaleString()})`
          );
          skipped++;
          await sleep(DELAY_BETWEEN_WALLETS_MS);
          continue;
        }

        console.log(
          `${progress} 🔄 ${wallet.address.slice(0, 10)}... - Updating: ` +
            `${wallet.deposit_count}→${newCount} deposits, ` +
            `$${wallet.total_deposited.toLocaleString()}→$${newTotal.toLocaleString()}`
        );

        if (!dryRun) {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");

            // Update wallet totals and first_seen_at
            await client.query(
              `UPDATE wallets
               SET total_deposited = $1,
                   deposit_count = $2,
                   first_deposit_amount = $3,
                   first_deposit_tx = $4,
                   first_seen_at = $5,
                   updated_at = NOW()
               WHERE address = $6`,
              [
                newTotal,
                newCount,
                firstDeposit?.amount || wallet.total_deposited,
                firstDeposit?.txHash || null,
                firstDeposit ? new Date(firstDeposit.timestamp * 1000) : new Date(),
                wallet.address,
              ]
            );

            // Insert all historical deposits (ON CONFLICT to skip duplicates)
            if (deposits.length > 0) {
              const values: any[] = [];
              const valuePlaceholders: string[] = [];

              deposits.forEach((deposit, index) => {
                const offset = index * 4;
                valuePlaceholders.push(
                  `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`
                );
                values.push(
                  deposit.txHash,
                  wallet.address,
                  deposit.amount,
                  deposit.blockNumber.toString()
                );
              });

              await client.query(
                `INSERT INTO deposits (tx_hash, wallet_address, amount, block_number)
                 VALUES ${valuePlaceholders.join(", ")}
                 ON CONFLICT (tx_hash) DO NOTHING`,
                values
              );
            }

            await client.query("COMMIT");
            updated++;
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
        } else {
          updated++;
        }

        await sleep(DELAY_BETWEEN_WALLETS_MS);

        // Progress batch logging
        if (processed % BATCH_SIZE === 0) {
          console.log(`\n📈 Progress: ${processed}/${wallets.length} processed, ${updated} updated, ${skipped} skipped, ${errors} errors\n`);
        }
      } catch (error) {
        console.error(`${progress} ❌ ${wallet.address.slice(0, 10)}... - Error:`, error);
        errors++;
        await sleep(DELAY_BETWEEN_WALLETS_MS);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 BACKFILL SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total wallets processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (up to date): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log("=".repeat(60));

    if (dryRun) {
      console.log("\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.");
    }
  } catch (error) {
    console.error("❌ Fatal error during backfill:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Parse command line args
const dryRun = process.argv.includes("--dry-run");

backfillHistoricalDeposits(dryRun)
  .then(() => {
    console.log("\n✅ Backfill complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
