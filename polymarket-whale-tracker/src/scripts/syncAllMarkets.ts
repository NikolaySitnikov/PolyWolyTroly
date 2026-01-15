/**
 * Sync ALL markets from Gamma API (including closed/resolved)
 *
 * This is needed to populate our markets table with historical markets
 * so we can resolve NULL condition_ids in ctf_transfers.
 *
 * WARNING: This is slow - fetches ALL markets from Gamma API
 *
 * Usage: npx tsx src/scripts/syncAllMarkets.ts
 */

import 'dotenv/config';

async function main() {
  console.log('='.repeat(60));
  console.log('FULL MARKET SYNC');
  console.log('='.repeat(60));
  console.log();
  console.log('WARNING: This will take a while...');
  console.log();

  // Import dynamically to ensure dotenv is loaded first
  const { marketMetadataService } = await import('../services/insiderDetection/marketMetadataService.js');

  const startTime = Date.now();
  const count = await marketMetadataService.syncAllMarkets();
  const duration = (Date.now() - startTime) / 1000;

  console.log();
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Synced ${count} markets in ${duration.toFixed(1)} seconds`);
  console.log();
  console.log('Next step: Run backfillConditionIds.ts to populate ctf_transfers');
}

main().catch(console.error);
