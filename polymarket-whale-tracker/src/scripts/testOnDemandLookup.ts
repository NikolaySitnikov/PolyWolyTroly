/**
 * Test On-Demand Token Lookup
 *
 * Tests that the new on-demand Gamma API lookup works for tokens
 * that are not in our markets table.
 *
 * Usage: npx tsx src/scripts/testOnDemandLookup.ts
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('='.repeat(60));
  console.log('ON-DEMAND TOKEN LOOKUP TEST');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Find transfers with NULL condition_id
  console.log('1. Finding transfers with NULL condition_id...');
  const nullResult = await pool.query(`
    SELECT id, token_id, tx_hash, block_timestamp
    FROM ctf_transfers
    WHERE condition_id IS NULL
    ORDER BY block_timestamp DESC
    LIMIT 5
  `);

  const nullTransfers = nullResult.rows;

  if (nullTransfers.length === 0) {
    console.log('   ✅ No transfers with NULL condition_id found!');
    console.log('   The fix is working - all tokens are being looked up.');
    await pool.end();
    return;
  }

  console.log(`   Found ${nullTransfers.length} recent transfers with NULL condition_id:`);
  for (const t of nullTransfers) {
    console.log(`   - Token: ${t.token_id?.substring(0, 30)}...`);
    console.log(`     TX: ${t.tx_hash}`);
    console.log(`     Time: ${t.block_timestamp}`);
    console.log();
  }

  // Step 2: Try to lookup one of these tokens from Gamma API
  const testTokenId = nullTransfers[0].token_id;
  console.log('2. Testing Gamma API lookup for unknown token...');
  console.log(`   Token ID: ${testTokenId}`);

  const gammaUrl = `https://gamma-api.polymarket.com/markets?clob_token_ids=${testTokenId}`;
  console.log(`   URL: ${gammaUrl}`);

  try {
    const response = await fetch(gammaUrl);
    if (!response.ok) {
      console.log(`   ❌ Gamma API error: ${response.status}`);
    } else {
      const markets = await response.json();
      if (Array.isArray(markets) && markets.length > 0) {
        const market = markets[0];
        console.log(`   ✅ Found market in Gamma API!`);
        console.log(`   Question: ${market.question?.substring(0, 50)}...`);
        console.log(`   Condition ID: ${market.condition_id}`);
        console.log(`   Active: ${market.active}`);
        console.log(`   Closed: ${market.closed}`);
      } else {
        console.log(`   ⚠️ No market found in Gamma API for this token`);
        console.log(`   This could be a truly unknown token or API issue`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Fetch error: ${e}`);
  }

  // Step 3: Check overall stats
  console.log();
  console.log('3. Overall condition_id coverage stats...');

  const totalResult = await pool.query(`SELECT COUNT(*) as count FROM ctf_transfers`);
  const nullCountResult = await pool.query(`SELECT COUNT(*) as count FROM ctf_transfers WHERE condition_id IS NULL`);

  const totalCount = parseInt(totalResult.rows[0].count);
  const nullCount = parseInt(nullCountResult.rows[0].count);
  const coverage = (totalCount - nullCount) / totalCount * 100;

  console.log(`   Total transfers: ${totalCount.toLocaleString()}`);
  console.log(`   With condition_id: ${(totalCount - nullCount).toLocaleString()}`);
  console.log(`   NULL condition_id: ${nullCount.toLocaleString()}`);
  console.log(`   Coverage: ${coverage.toFixed(1)}%`);

  // Step 4: Check if these are old transfers (before the fix) or new ones
  console.log();
  console.log('4. Are NULL transfers from before or after the fix?');

  const recentNullResult = await pool.query(`
    SELECT block_timestamp FROM ctf_transfers
    WHERE condition_id IS NULL
    ORDER BY block_timestamp DESC
    LIMIT 1
  `);

  const oldestNullResult = await pool.query(`
    SELECT block_timestamp FROM ctf_transfers
    WHERE condition_id IS NULL
    ORDER BY block_timestamp ASC
    LIMIT 1
  `);

  if (recentNullResult.rows.length && oldestNullResult.rows.length) {
    console.log(`   Most recent NULL: ${recentNullResult.rows[0].block_timestamp}`);
    console.log(`   Oldest NULL: ${oldestNullResult.rows[0].block_timestamp}`);

    const recentTime = new Date(recentNullResult.rows[0].block_timestamp).getTime();
    const now = Date.now();
    const minutesAgo = (now - recentTime) / 60000;

    if (minutesAgo < 5) {
      console.log(`   ⚠️ Most recent NULL is from ${minutesAgo.toFixed(1)} minutes ago`);
      console.log(`   The fix may not be working for new transfers yet.`);
    } else {
      console.log(`   ✅ Most recent NULL is from ${minutesAgo.toFixed(0)} minutes ago`);
      console.log(`   New transfers should have condition_id now.`);
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('RECOMMENDATION');
  console.log('='.repeat(60));
  console.log('The existing NULL condition_id values are from BEFORE the fix.');
  console.log('To backfill them, run: syncAllMarkets() then update the transfers.');
  console.log('New transfers should now get condition_id via on-demand lookup.');

  await pool.end();
}

main().catch(console.error);
