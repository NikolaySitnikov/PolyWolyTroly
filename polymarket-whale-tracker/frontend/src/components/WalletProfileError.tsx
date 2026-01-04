/**
 * WalletProfileError Component
 *
 * Error state for wallet profile view.
 */

import { tokens } from '../styles/tokens';

interface WalletProfileErrorProps {
  error: string;
  onBack: () => void;
  onRetry: () => void;
  isMobile: boolean;
}

export function WalletProfileError({ error, onBack, onRetry, isMobile }: WalletProfileErrorProps) {
  return (
    <div data-testid="wallet-profile-error">
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          marginBottom: '24px',
          background: 'transparent',
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '8px',
          fontFamily: tokens.fonts.body,
          fontSize: '14px',
          color: tokens.colors.textSecondary,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = tokens.colors.cyan;
          e.currentTarget.style.color = tokens.colors.cyan;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = tokens.colors.border;
          e.currentTarget.style.color = tokens.colors.textSecondary;
        }}
      >
        ← Back to Whales
      </button>

      {/* Error card */}
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.loss}`,
          borderRadius: '12px',
          padding: isMobile ? '32px 20px' : '48px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}
        >
          🐋
        </div>
        <h2
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: 700,
            color: tokens.colors.textPrimary,
            marginBottom: '12px',
          }}
        >
          Whale Not Found
        </h2>
        <p
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            color: tokens.colors.loss,
            marginBottom: '24px',
          }}
        >
          {error}
        </p>
        <button
          onClick={onRetry}
          style={{
            padding: '12px 24px',
            background: tokens.colors.cyan,
            border: 'none',
            borderRadius: '8px',
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            fontWeight: 600,
            color: tokens.colors.void,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
