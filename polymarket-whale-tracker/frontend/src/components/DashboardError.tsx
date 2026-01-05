/**
 * DashboardError Component
 *
 * Error state for the dashboard with retry functionality.
 * Displays confused whale mascot with error message and retry button.
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md - Whale Mascot Specifications
 */

import { tokens } from '../styles/tokens';
import { WhaleAnimation } from './WhaleAnimation';

interface DashboardErrorProps {
  error: string;
  onRetry: () => void;
  isMobile: boolean;
}

export function DashboardError({ error, onRetry, isMobile }: DashboardErrorProps) {
  return (
    <div
      data-testid="dashboard-error"
      style={{
        textAlign: 'center',
        padding: isMobile ? tokens.spacing[6] : tokens.spacing[10],
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      {/* Confused whale mascot */}
      <WhaleAnimation
        state="error"
        title="Lost signal..."
        subtitle="Something went wrong while tracking whales"
      />

      {/* Error message */}
      <p
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.sm,
          color: tokens.colors.loss,
          marginBottom: tokens.spacing[6],
          padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
          background: `${tokens.colors.loss}15`,
          border: `1px solid ${tokens.colors.loss}40`,
          borderRadius: tokens.radius.md,
          wordBreak: 'break-word',
        }}
      >
        {error}
      </p>

      {/* Retry button */}
      <button
        onClick={onRetry}
        style={{
          padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
          background: tokens.colors.cyan,
          border: 'none',
          borderRadius: tokens.radius.md,
          fontFamily: tokens.fonts.body,
          fontSize: tokens.fontSizes.sm,
          fontWeight: tokens.fontWeights.semibold,
          color: tokens.colors.void,
          cursor: 'pointer',
          boxShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = `0 0 30px ${tokens.colors.cyanGlow}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 0 20px ${tokens.colors.cyanGlow}`;
        }}
      >
        Retry
      </button>

      {/* Helpful hint */}
      <p
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: tokens.fontSizes.xs,
          color: tokens.colors.textMuted,
          marginTop: tokens.spacing[4],
        }}
      >
        Make sure the API server is running on port 3002
      </p>
    </div>
  );
}
