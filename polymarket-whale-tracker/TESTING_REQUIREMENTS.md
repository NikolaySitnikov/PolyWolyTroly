# Testing Requirements for PolyWolyTroly

This document defines mandatory testing requirements for all development work on this project. These requirements exist because of past issues where unit tests passed but real-world integrations failed.

## Core Principle

**Never assume external data formats or relationships. Always verify with real data first.**

---

## Mandatory Testing Checklist

Before marking any feature as complete, the following must be verified:

### 1. External API Integrations

For any code that interacts with external APIs (Polymarket CLOB, Gamma, Polygonscan, etc.):

- [ ] **Fetch real API responses** - Make actual API calls and log the response structure
- [ ] **Verify field names and types** - Don't assume field names match documentation
- [ ] **Test with edge cases** - What happens when data is missing, null, or malformed?
- [ ] **Document the actual response format** in comments or types

Example of what NOT to do:
```typescript
// BAD: Assumed tokenId could be used as conditionId
const conditionId = tokenId.toString(16);
```

Example of what TO do:
```typescript
// GOOD: Verified with real Polygonscan transaction that token IDs
// are NOT condition IDs. Must look up in markets table.
// Real example: Token ID 17995803... maps to condition 0xc4f9c5ce...
const marketLookup = await db.getMarketByTokenId(tokenId);
```

### 2. Blockchain Data

For any code that processes blockchain events:

- [ ] **Trace 2-3 real transactions end-to-end** before writing any code
- [ ] **Use Polygonscan to verify** your understanding of event data
- [ ] **Test with actual transaction hashes** from mainnet, not synthetic data
- [ ] **Verify numeric conversions** (wei/gwei, decimals, BigInt handling)

Required verification for this project:
```bash
# Example: Verify a CTF transfer event
# 1. Find a real transfer on Polygonscan
# 2. Decode the event data manually
# 3. Confirm your code produces the same values
```

### 3. Integration Tests with Real Data

Every major feature must have at least one integration test that:

- [ ] Uses a **real transaction hash** or **real API response**
- [ ] Verifies the **complete flow** from input to output
- [ ] Includes **assertions on actual values**, not just "did it run without error"

Example test structure:
```typescript
describe('CTF Transfer Processing - Real Data', () => {
  it('should correctly calculate trade size for known transaction', async () => {
    // Real transaction from Polygonscan
    const realTxHash = '0x9a4df7cb8205e01f0cde1c87bfa7e5d783bd4a14d44101b2bc51e...';

    // Known values from manual verification
    const expectedConditionId = '0xc4f9c5ce504fe71a5ab7a870b39ce0dd13d527e9656a270bfc55e2ed5d33b83a';
    const expectedShares = 57612.813286;
    const expectedPrice = 0.0005; // YES price at time of trade
    const expectedUsdValue = 28.81; // shares * price

    const result = await processTransfer(realTxHash);

    expect(result.conditionId).toBe(expectedConditionId);
    expect(result.usdValue).toBeCloseTo(expectedUsdValue, 1);
  });
});
```

### 4. Sanity Check Assertions

Add runtime sanity checks for values that should never occur:

```typescript
// Add warnings for suspicious values
if (tradeSizeUsd > 10000 && priceSource === 'fallback') {
  logger.warn({
    msg: 'Large trade using fallback price - verify accuracy',
    tradeSizeUsd,
    txHash,
    conditionId,
  });
}

// Fail fast on impossible values
if (price < 0 || price > 1) {
  throw new Error(`Invalid price ${price} for condition ${conditionId}`);
}
```

---

## Testing Workflow

### Before Starting Implementation

1. **Research the external system** - Read docs, but verify with real data
2. **Trace real examples manually** - Use Polygonscan, API explorers, etc.
3. **Document your findings** - Write down actual field names, relationships, edge cases
4. **Create test fixtures from real data** - Save actual API responses for tests

### During Implementation

1. **Log extensively during development** - Verify values match expectations
2. **Test against real endpoints** - Not just mocks
3. **Compare outputs to manual calculations** - Especially for financial values

### Before Marking Complete

1. **Run integration tests with real data**
2. **Manually verify at least one end-to-end flow**
3. **Check for sanity assertions** on critical values
4. **Document any assumptions** that couldn't be fully verified

---

## Known Gotchas in This Project

### Polymarket Token IDs vs Condition IDs

**CRITICAL**: ERC-1155 token IDs are NOT condition IDs!

- Token ID: `17995803542616038445492082801478540110557446957690828115634862604211622554070`
- Condition ID: `0xc4f9c5ce504fe71a5ab7a870b39ce0dd13d527e9656a270bfc55e2ed5d33b83a`

These are completely different values. Token IDs cannot be reverse-engineered to condition IDs. You must look up the mapping via:
1. Our `markets` table (outcome_yes_token_id, outcome_no_token_id columns)
2. Gamma API market metadata

### Price Data Sources

Prices can come from multiple sources with different formats:
- CLOB API: `{ tokens: [{ outcome: 'Yes', price: 0.45 }, { outcome: 'No', price: 0.55 }] }`
- Gamma API: Different structure
- Our price_history table: Stored as decimal

Always verify which source you're using and that the format matches.

### Decimal Handling

- USDC amounts from blockchain: 6 decimals (divide by 1e6)
- CTF share amounts: 6 decimals (divide by 1e6)
- Prices: Already normalized 0-1

### Multi-Outcome Markets

**KNOWN LIMITATION**: The database schema only supports YES/NO markets.

- Most markets (~97%) are binary YES/NO
- Multi-outcome markets (e.g., "Who will win the election?" with 3+ candidates) exist but are rare
- For multi-outcome markets, only the first 2 token IDs are stored (incorrectly labeled as YES/NO)
- Trades on 3rd+ outcomes will NOT be found by `getMarketByTokenId`

This is an accepted limitation given the rarity of multi-outcome markets.

### Price Recording Timing Latency

**IMPORTANT**: Entry prices may be up to 30 seconds stale.

- Prices are recorded every 30s during depth polling
- Trades can happen at any time between recordings
- The "entry price" used for MTM calculations is the most recent recorded price, not the actual trade price
- In volatile markets, 30 seconds can mean 1-5% price difference

This introduces some inaccuracy in MTM gain calculations.

### One-Sided Order Books (CRITICAL)

**CRITICAL BUG FIXED 2026-01-14**: One-sided order books cause incorrect price calculations.

When a market has no bids (e.g., YES trading at 0.05%), the old code defaulted to `0.5` (50%) for mid-price calculation. This caused a **1000x overestimation** of trade values:

- Actual YES price: 0.0005 (0.05%)
- Stored price: 0.50 (50%)
- 1,000,000 shares × 0.50 = **$500,000** (WRONG!)
- 1,000,000 shares × 0.0005 = **$500** (correct)

**The Fix**:
1. `marketDepthService.ts` - Never default to 0.5 for one-sided order books
2. `detectionEngine.ts` - Always fetch fresh price from CLOB API first (source of truth)
3. Return 0 for trade size if no reliable price found (fails threshold, no false positive)

**Lesson**: Always validate prices against the actual CLOB API. Cached prices may be corrupted by edge cases like one-sided order books.

### CEX/Bridge Address Lists

The hardcoded CEX and bridge addresses in `fundingAnalyzer.ts` may be incomplete:

- Binance has ~10+ hot wallets on Polygon, but only 3 are in our list
- New hot wallets are created periodically
- Missing addresses may cause false positives in cluster detection (treating CEX funding as shared funder)

Consider:
1. Using a third-party API for address labeling (e.g., Etherscan labels)
2. Periodically auditing and updating the address lists
3. Adding more conservative logic for high-volume funders

---

## Required Test Files

The following test files must exist and pass:

1. `src/services/insiderDetection/__tests__/ctfEventListener.integration.test.ts`
   - Tests with real transaction hashes
   - Verifies token ID → condition ID mapping

2. `src/services/insiderDetection/__tests__/detectionEngine.integration.test.ts`
   - Tests trade size calculation with known values
   - Verifies price lookups against real API

3. `src/services/insiderDetection/__tests__/marketMetadataService.integration.test.ts`
   - Tests Gamma API parsing with real responses
   - Verifies market data is stored correctly

---

## Enforcement

When reviewing code or implementing features:

1. **Ask "How was this tested with real data?"**
2. **Reject assumptions** - Require evidence from actual API calls or transactions
3. **Require integration tests** for any external system interaction
4. **Add sanity checks** for values that could indicate bugs

This document should be updated whenever a new "gotcha" is discovered.
