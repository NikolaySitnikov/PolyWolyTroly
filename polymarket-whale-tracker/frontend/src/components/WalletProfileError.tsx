/**
 * WalletProfileError Component
 *
 * Error state for wallet profile view.
 * Displays confused whale mascot with error message and navigation options.
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md - Whale Mascot Specifications
 */

import { tokens } from '../styles/tokens';
import { WhaleAnimation } from './WhaleAnimation';

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
        data-testid="back-button"
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

      {/* Error card with confused whale */}
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: isMobile ? '24px 16px' : '32px',
          textAlign: 'center',
        }}
      >
        {/* Confused whale mascot */}
        <WhaleAnimation
          state="error"
          title="This whale slipped away..."
          subtitle="We couldn't find the wallet you're looking for"
        />

        {/* Technical error message */}
        <p
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes.xs,
            color: tokens.colors.loss,
            marginBottom: '24px',
            padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
            background: `${tokens.colors.loss}15`,
            border: `1px solid ${tokens.colors.loss}40`,
            borderRadius: tokens.radius.sm,
            maxWidth: '400px',
            margin: '0 auto 24px auto',
          }}
        >
          {error}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: `1px solid ${tokens.colors.cyan}`,
              borderRadius: '8px',
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              fontWeight: 600,
              color: tokens.colors.cyan,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Browse Whales
          </button>
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
    </div>
  );
}
