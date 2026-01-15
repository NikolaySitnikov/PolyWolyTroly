/**
 * Backfill NULL condition_ids in ctf_transfers
 *
 * This script finds transfers with NULL condition_id and attempts to
 * populate them by looking up the token ID in our markets table.
 *
 * This is needed because:
 * 1. Transfers were recorded before we had the market in our DB
 * 2. Rate limiting prevented on-demand lookup at the time
 *
 * Usage: npx tsx src/scripts/backfillConditionIds.ts
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('='.repeat(60));
  console.log('BACKFILL NULL CONDITION_IDS');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Get count of NULL transfers
  const { rows: [{ count: nullCount }] } = await pool.query(
    'SELECT COUNT(*) as count FROM ctf_transfers WHERE condition_id IS NULL'
  );
  console.log(`Total transfers with NULL condition_id: ${parseInt(nullCount).toLocaleString()}`);

  // Step 2: Backfill from markets table (YES tokens)
  console.log();
  console.log('Backfilling from markets.outcome_yes_token_id...');
  const yesResult = await pool.query(`
    UPDATE ctf_transfers t
    SET condition_id = m.condition_id,
        outcome = 'YES'
    FROM markets m
    WHERE t.token_id = m.outcome_yes_token_id
      AND t.condition_id IS NULL
  `);
  console.log(`  Updated ${yesResult.rowCount} transfers with YES outcome`);

  // Step 3: Backfill from markets table (NO tokens)
  console.log();
  console.log('Backfilling from markets.outcome_no_token_id...');
  const noResult = await pool.query(`
    UPDATE ctf_transfers t
    SET condition_id = m.condition_id,
        outcome = 'NO'
    FROM markets m
    WHERE t.token_id = m.outcome_no_token_id
      AND t.condition_id IS NULL
  `);
  console.log(`  Updated ${noResult.rowCount} transfers with NO outcome`);

  // Step 4: Check remaining NULL count
  const { rows: [{ count: remainingNull }] } = await pool.query(
    'SELECT COUNT(*) as count FROM ctf_transfers WHERE condition_id IS NULL'
  );

  console.log();
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Before: ${parseInt(nullCount).toLocaleString()} NULL condition_ids`);
  console.log(`After: ${parseInt(remainingNull).toLocaleString()} NULL condition_ids`);
  console.log(`Fixed: ${parseInt(nullCount) - parseInt(remainingNull)} transfers`);

  const totalResult = await pool.query('SELECT COUNT(*) as count FROM ctf_transfers');
  const total = parseInt(totalResult.rows[0].count);
  const coverage = (total - parseInt(remainingNull)) / total * 100;
  console.log();
  console.log(`New coverage: ${coverage.toFixed(1)}%`);

  if (parseInt(remainingNull) > 0) {
    // Get sample of remaining NULL tokens
    const sample = await pool.query(`
      SELECT DISTINCT token_id
      FROM ctf_transfers
      WHERE condition_id IS NULL
      LIMIT 5
    `);

    if (sample.rows.length > 0) {
      console.log();
      console.log('Sample of remaining NULL tokens (may need market sync):');
      for (const row of sample.rows) {
        console.log(`  ${row.token_id.substring(0, 40)}...`);
      }
    }
  }

  await pool.end();
}

main().catch(console.error);
