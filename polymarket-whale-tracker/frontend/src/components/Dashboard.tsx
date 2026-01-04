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

interface DashboardStats {
  whaleCount: number;
  totalVolume: number;
  alertsToday: number;
  newWhalesThisWeek: number;
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
          trend={12}
          icon="🐋"
          delay={0}
        />
        <StatCard
          label="Total Volume"
          value={formatUSD(stats.totalVolume)}
          trend={8.4}
          icon="📊"
          accentColor="magenta"
          delay={50}
        />
        <StatCard
          label="Alerts Today"
          value={stats.alertsToday.toString()}
          subValue="deposits & trades"
          icon="⚡"
          accentColor="purple"
          delay={100}
        />
        <StatCard
          label="New This Week"
          value={stats.newWhalesThisWeek.toString()}
          trend={5}
          icon="🆕"
          accentColor="profit"
          delay={150}
        />
      </div>
    </div>
  );
}
