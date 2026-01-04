/**
 * Formatting Utilities
 *
 * Helper functions for formatting currency, percentages, and other values.
 */

/**
 * Format a number as USD with appropriate abbreviations.
 * - Values >= 1M: $X.XXM
 * - Values >= 1K: $X.XK
 * - Values < 1K: $X
 */
export function formatUSD(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Format a number as a percentage with sign.
 */
export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

/**
 * Shorten an Ethereum address for display.
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
