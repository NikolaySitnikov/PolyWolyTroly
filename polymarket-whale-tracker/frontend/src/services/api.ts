/**
 * API Service
 *
 * Client for connecting to the PolyWolyTroly backend API.
 * Provides typed functions for fetching data from REST endpoints.
 */

export interface StatsResponse {
  whaleCount: number;
  totalVolume: number;
  alertsToday: number;
  newWhalesThisWeek: number;
}

export const api = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3002',
};

/**
 * Fetches dashboard statistics from the API.
 * @returns Promise resolving to stats data
 * @throws Error if the request fails
 */
export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch(`${api.baseUrl}/api/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.status}`);
  }

  return response.json();
}
