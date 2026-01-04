/**
 * GlowText Component
 *
 * A text component with a glowing neon effect.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import type { ReactNode } from 'react';
import { tokens } from '../styles/tokens';

type GlowColor = 'cyan' | 'magenta' | 'profit' | 'loss';

interface GlowTextProps {
  children: ReactNode;
  color?: GlowColor;
}

const glowColors: Record<GlowColor, string> = {
  cyan: tokens.colors.cyan,
  magenta: tokens.colors.magenta,
  profit: tokens.colors.profit,
  loss: tokens.colors.loss,
};

export function GlowText({ children, color = 'cyan' }: GlowTextProps) {
  const glowColor = glowColors[color];

  return (
    <span
      style={{
        color: glowColor,
        textShadow: `0 0 20px ${glowColor}40, 0 0 40px ${glowColor}20`,
      }}
    >
      {children}
    </span>
  );
}
