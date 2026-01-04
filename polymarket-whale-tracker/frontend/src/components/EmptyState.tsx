/**
 * EmptyState Component
 *
 * Reusable empty state component for displaying when no data is available.
 * Provides consistent styling and behavior across the application.
 *
 * Variants:
 * - default: Standard empty state with centered icon and message
 * - search: For no search results (includes filter context)
 * - waiting: For live data that hasn't arrived yet
 *
 * Sizes:
 * - compact: Smaller padding, used in lists/tables
 * - default: Standard padding for card contexts
 * - large: Extra padding for full-page states
 */

import { tokens } from '../styles/tokens';

type EmptyStateVariant = 'default' | 'search' | 'waiting';
type EmptyStateSize = 'compact' | 'default' | 'large';

interface EmptyStateProps {
  /** Emoji or icon to display */
  icon: string;
  /** Main message to display */
  message: string;
  /** Optional title above the message */
  title?: string;
  /** Visual variant */
  variant?: EmptyStateVariant;
  /** Size variant for different contexts */
  size?: EmptyStateSize;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action button callback */
  onAction?: () => void;
}

const sizeStyles: Record<EmptyStateSize, { padding: string; iconSize: string; titleSize: string; messageSize: string }> = {
  compact: {
    padding: '24px 16px',
    iconSize: '24px',
    titleSize: '14px',
    messageSize: '13px',
  },
  default: {
    padding: '48px 20px',
    iconSize: '32px',
    titleSize: '16px',
    messageSize: '14px',
  },
  large: {
    padding: '64px 24px',
    iconSize: '48px',
    titleSize: '18px',
    messageSize: '15px',
  },
};

export function EmptyState({
  icon,
  message,
  title,
  variant = 'default',
  size = 'default',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      data-testid="empty-state"
      style={{
        padding: styles.padding,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: styles.iconSize,
          opacity: 0.5,
          animation: variant === 'waiting' ? 'pulse 2s infinite' : undefined,
        }}
      >
        {icon}
      </div>

      {/* Title (optional) */}
      {title && (
        <div
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: styles.titleSize,
            fontWeight: 600,
            color: tokens.colors.textPrimary,
          }}
        >
          {title}
        </div>
      )}

      {/* Message */}
      <div
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: styles.messageSize,
          color: tokens.colors.textMuted,
          maxWidth: '300px',
          lineHeight: 1.5,
        }}
      >
        {message}
      </div>

      {/* Action Button (optional) */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '8px',
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            fontWeight: 500,
            color: tokens.colors.cyan,
            background: 'transparent',
            border: `1px solid ${tokens.colors.cyan}`,
            borderRadius: tokens.radius.md,
            padding: '8px 16px',
            cursor: 'pointer',
            transition: `all ${tokens.animation.durationFast} ease`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = tokens.colors.cyanGlow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
