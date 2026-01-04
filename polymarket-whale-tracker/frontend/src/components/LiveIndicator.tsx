/**
 * LiveIndicator Component
 *
 * Pulsing live status indicator showing real-time connection.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { tokens } from '../styles/tokens';

export function LiveIndicator() {
  return (
    <span
      data-testid="live-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontFamily: tokens.fonts.mono,
        color: tokens.colors.profit,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}
    >
      <span
        data-testid="live-dot"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: tokens.colors.profit,
          boxShadow: `0 0 10px ${tokens.colors.profit}`,
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      LIVE
    </span>
  );
}
