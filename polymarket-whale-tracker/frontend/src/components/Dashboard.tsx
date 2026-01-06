/**
 * Dashboard Component
 *
 * The main dashboard view showing key statistics and metrics.
 * Based on DESIGN_SYSTEM.md specifications.
 *
 * Features:
 * - Hero section with title
 * - 4 StatCards showing key metrics
 * - Responsive layout (4 columns desktop, 2 columns mobile)
 */

import { tokens } from '../styles/tokens';
import { StatCard } from './StatCard';
import { GlowText } from './GlowText';
import { formatUSD } from '../utils/formatters';
import { WhaleTrackedIcon, VolumeIcon, AlertsIcon, NewWhaleIcon } from './icons';

interface DashboardStats {
  whaleCount: number;
  whaleCountTrend: number;
  totalVolume: number;
  totalVolumeTrend: number;
  alertsToday: number;
  newWhalesToday: number;
}

interface DashboardProps {
  stats: DashboardStats;
  isMobile: boolean;
}

export function Dashboard({ stats, isMobile }: DashboardProps) {
  return (
    <div data-testid="dashboard">
      {/* Hero section */}
      <div
        data-testid="dashboard-hero"
        style={{
          marginBottom: '32px',
          textAlign: isMobile ? 'center' : 'left',
        }}
      >
        <h1
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: isMobile ? '28px' : '36px',
            fontWeight: 800,
            color: tokens.colors.textPrimary,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          Whale Intelligence <GlowText>Dashboard</GlowText>
        </h1>
        <p
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: '15px',
            color: tokens.colors.textSecondary,
            margin: 0,
          }}
        >
          Tracking {stats.whaleCount} whales across Polymarket
        </p>
      </div>

      {/* Stats row */}
      <div
        data-testid="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          label="Whales Tracked"
          value={stats.whaleCount.toString()}
          numericValue={stats.whaleCount}
          trend={stats.whaleCountTrend}
          subValue="24h"
          icon={WhaleTrackedIcon}
          delay={0}
        />
        <StatCard
          label="Total Volume"
          value={formatUSD(stats.totalVolume)}
          numericValue={stats.totalVolume}
          trend={stats.totalVolumeTrend}
          subValue="24h"
          icon={VolumeIcon}
          accentColor="magenta"
          delay={50}
        />
        <StatCard
          label="Alerts Today"
          value={stats.alertsToday.toString()}
          numericValue={stats.alertsToday}
          subValue="deposits & trades"
          icon={AlertsIcon}
          accentColor="purple"
          delay={100}
        />
        <StatCard
          label="Whales Today"
          value={stats.newWhalesToday.toString()}
          numericValue={stats.newWhalesToday}
          subValue="wallets"
          icon={NewWhaleIcon}
          accentColor="profit"
          delay={150}
        />
      </div>
    </div>
  );
}
