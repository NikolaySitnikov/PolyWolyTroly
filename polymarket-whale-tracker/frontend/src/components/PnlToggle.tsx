/**
 * PnlToggle Component
 *
 * Pill toggle for selecting P&L time window (7d | 30d | All).
 * Used in WalletProfile and potentially WhaleTable for time-windowed analysis.
 *
 * Per TRADING_FEATURES_DESIGN_GUIDE.md Section 4.
 */

import { type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';
import type { PnlTimeWindow } from '../types/polymarket';

export interface PnlToggleProps {
  /** Current selected time window */
  value: PnlTimeWindow;
  /** Callback when time window changes */
  onChange: (value: PnlTimeWindow) => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Custom class name */
  className?: string;
}

const TIME_WINDOWS: { value: PnlTimeWindow; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'ALL' },
];

const SIZE_CONFIG = {
  sm: {
    padding: '4px 10px',
    fontSize: '10px',
    containerPadding: '2px',
    gap: '3px',
  },
  md: {
    padding: '6px 12px',
    fontSize: '11px',
    containerPadding: '3px',
    gap: '4px',
  },
} as const;

export function PnlToggle({
  value,
  onChange,
  size = 'md',
  className,
}: PnlToggleProps) {
  const config = SIZE_CONFIG[size];

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    gap: config.gap,
    padding: config.containerPadding,
    background: tokens.colors.void,
    borderRadius: '8px',
    border: `1px solid ${tokens.colors.border}`,
  };

  const buttonStyle = (isActive: boolean): CSSProperties => ({
    padding: config.padding,
    background: isActive ? `${tokens.colors.cyan}20` : 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontFamily: tokens.fonts.mono,
    fontSize: config.fontSize,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? tokens.colors.cyan : tokens.colors.textMuted,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.05em',
  });

  return (
    <div style={containerStyle} className={className} role="group" aria-label="P&L time window">
      {TIME_WINDOWS.map(({ value: windowValue, label }) => {
        const isActive = value === windowValue;
        return (
          <button
            key={windowValue}
            onClick={() => onChange(windowValue)}
            style={buttonStyle(isActive)}
            aria-pressed={isActive}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = tokens.colors.textSecondary;
                e.currentTarget.style.background = tokens.colors.surfaceHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = tokens.colors.textMuted;
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
