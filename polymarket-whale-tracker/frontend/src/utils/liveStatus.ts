/**
 * Live Status Utilities
 *
 * Functions for determining if a whale is "live" (active within last 24h)
 * and formatting last activity timestamps.
 */

const LIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if a whale is considered "live" (active in last 24h)
 */
export function isWhaleLive(lastActivityAt: string | null | undefined): boolean {
  if (!lastActivityAt) return false;

  const lastActivity = new Date(lastActivityAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();

  return diffMs < LIVE_THRESHOLD_MS;
}

/**
 * Format last activity timestamp as human-readable relative time
 * Examples: "2h ago", "45m ago", "3d ago", "just now"
 */
export function formatLastActivity(lastActivityAt: string | null | undefined): string {
  if (!lastActivityAt) return 'Unknown';

  const lastActivity = new Date(lastActivityAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();

  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return diffSec <= 5 ? 'just now' : `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks}w ago`;
  }

  // More than a month ago
  return lastActivity.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get tooltip text for LiveBadge
 * Example: "Active 2h ago on Polymarket"
 */
export function getLiveTooltip(lastActivityAt: string | null | undefined): string {
  if (!lastActivityAt) return 'No recent activity';

  const relativeTime = formatLastActivity(lastActivityAt);
  const isLive = isWhaleLive(lastActivityAt);

  if (isLive) {
    return `Active ${relativeTime} on Polymarket`;
  }
  return `Last seen ${relativeTime}`;
}
