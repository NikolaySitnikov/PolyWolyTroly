/**
 * DashboardLoading Component
 *
 * Skeleton loading state for the dashboard.
 * Displays animated whale mascot and placeholder cards while data is being fetched.
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md - Whale Animation Sequences
 */

import { tokens } from '../styles/tokens';
import { WhaleAnimation } from './WhaleAnimation';

interface DashboardLoadingProps {
  isMobile: boolean;
}

export function DashboardLoading({ isMobile }: DashboardLoadingProps) {
  return (
    <div data-testid="dashboard-loading">
      {/* Animated whale mascot */}
      <WhaleAnimation
        state="loading"
        title="Scanning the depths..."
        subtitle="Looking for whale activity..."
      />

      {/* Skeleton cards grid */}
      <div
        data-testid="skeleton-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            data-testid="skeleton-card"
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.lg,
              padding: '20px',
              minHeight: '120px',
              animation: 'shimmer 1.5s infinite',
              animationDelay: `${i * 100}ms`,
              backgroundImage: `linear-gradient(90deg, ${tokens.colors.surface} 0%, ${tokens.colors.border}40 50%, ${tokens.colors.surface} 100%)`,
              backgroundSize: '200% 100%',
            }}
          >
            {/* Icon placeholder */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: tokens.radius.md,
                background: tokens.colors.border,
                marginBottom: '12px',
              }}
            />
            {/* Value placeholder */}
            <div
              style={{
                width: '60%',
                height: '28px',
                borderRadius: tokens.radius.sm,
                background: tokens.colors.border,
                marginBottom: '8px',
              }}
            />
            {/* Label placeholder */}
            <div
              style={{
                width: '80%',
                height: '14px',
                borderRadius: tokens.radius.sm,
                background: tokens.colors.border,
              }}
            />
          </div>
        ))}
      </div>

      {/* Keyframe animation - injected inline */}
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `}
      </style>
    </div>
  );
}
