/**
 * DashboardError Component
 *
 * Error state for the dashboard with retry functionality.
 * Displays a user-friendly error message and retry button.
 */

import { tokens } from '../styles/tokens';

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
      {/* Error icon */}
      <div
        style={{
          fontSize: '64px',
          marginBottom: tokens.spacing[4],
          filter: 'drop-shadow(0 0 20px rgba(255, 51, 102, 0.5))',
        }}
      >
        ⚠
      </div>

      {/* Error title */}
      <h2
        style={{
          fontFamily: tokens.fonts.display,
          fontSize: isMobile ? tokens.fontSizes['xl'] : tokens.fontSizes['2xl'],
          fontWeight: tokens.fontWeights.bold,
          color: tokens.colors.textPrimary,
          marginBottom: tokens.spacing[3],
        }}
      >
        Something went wrong
      </h2>

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
