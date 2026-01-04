/**
 * InlineLoading Component
 *
 * Lightweight loading indicator for inline contexts.
 * Used when a full skeleton loader is overkill.
 *
 * Features:
 * - Animated pulsing icon
 * - Optional card container
 * - Consistent styling with design system
 */

import { tokens } from '../styles/tokens';

interface InlineLoadingProps {
  /** Emoji or icon to display with pulse animation */
  icon: string;
  /** Loading message to display */
  message: string;
  /** If true, renders without card container */
  naked?: boolean;
}

export function InlineLoading({ icon, message, naked = false }: InlineLoadingProps) {
  const content = (
    <>
      <div
        style={{
          fontSize: '32px',
          marginBottom: tokens.spacing[4],
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: '14px',
          color: tokens.colors.textSecondary,
          margin: 0,
        }}
      >
        {message}
      </p>
    </>
  );

  if (naked) {
    return (
      <div
        data-testid="inline-loading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: tokens.spacing[8],
          textAlign: 'center',
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      data-testid="inline-loading"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing[8],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      {content}
    </div>
  );
}
