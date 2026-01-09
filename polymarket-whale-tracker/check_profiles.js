import fs from 'fs';

async function main() {
  // Get all wallets from API
  const response = await fetch('http://localhost:3002/api/wallets?validOnly=false&limit=1500');
  const data = await response.json();
  const wallets = data.wallets;

  console.log(`Checking ${wallets.length} wallets...`);

  const results = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const address = wallet.address;

    // Rate limit: 100ms between calls to be safe with Gamma API
    if (i > 0) await new Promise(r => setTimeout(r, 100));

    try {
      const profileRes = await fetch(`https://gamma-api.polymarket.com/public-profile?address=${address}`);
      const profileData = await profileRes.json();

      let profileStatus;
      if (profileData.error || profileData.type === 'not found error') {
        profileStatus = 'NO_PROFILE';
        invalidCount++;
      } else if (profileData.pseudonym || profileData.name) {
        const name = profileData.pseudonym || profileData.name || 'unnamed';
        profileStatus = `VALID: ${name}`;
        validCount++;
      } else {
        profileStatus = 'UNKNOWN';
        invalidCount++;
      }

      results.push({
        address,
        totalDeposited: wallet.total_deposited,
        depositCount: wallet.deposit_count,
        profileStatus
      });

      if ((i + 1) % 50 === 0) {
        console.log(`Progress: ${i + 1}/${wallets.length} (Valid: ${validCount}, Invalid: ${invalidCount})`);
      }
    } catch (err) {
      results.push({
        address,
        totalDeposited: wallet.total_deposited,
        depositCount: wallet.deposit_count,
        profileStatus: `ERROR: ${err.message}`
      });
      invalidCount++;
    }
  }

  // Write results to file
  const lines = results.map(r =>
    `${r.address} | $${r.totalDeposited} | ${r.depositCount} deposits | ${r.profileStatus}`
  );

  fs.writeFileSync('all_wallets_dump.txt', lines.join('\n'));

  console.log(`\nDone! Valid: ${validCount}, Invalid: ${invalidCount}`);
  console.log(`Results saved to all_wallets_dump.txt`);
}

main().catch(console.error);
