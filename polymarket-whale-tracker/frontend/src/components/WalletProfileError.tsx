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
import { Button } from './Button';

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
      <div style={{ marginBottom: '24px' }}>
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          data-testid="back-button"
        >
          ← Back to Whales
        </Button>
      </div>

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
          <Button onClick={onBack} variant="secondary" size="md">
            Browse Whales
          </Button>
          <Button onClick={onRetry} variant="primary" size="md">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
