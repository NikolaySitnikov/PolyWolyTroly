/**
 * Toast Component
 *
 * Individual toast notification with 4 variants:
 * - info (cyan border) - General information
 * - success (green border) - Positive events like deposits
 * - warning (yellow border) - Caution states
 * - error (red border) - Error messages
 *
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Animation: Slide in from right (desktop) / top (mobile)
 * - Auto-dismiss after 5 seconds
 * - Accessible via ARIA live regions
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md
 */

import { tokens } from '../styles/tokens';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Main message content */
  message: string;
  /** Toast variant determining color scheme */
  variant: ToastVariant;
  /** Optional title above the message */
  title?: string;
  /** Callback when toast is dismissed */
  onDismiss: (id: string) => void;
  /** Whether toast is in exit animation state */
  isExiting?: boolean;
  /** Whether we're in mobile layout */
  isMobile?: boolean;
}

/**
 * Get variant-specific styling
 */
function getVariantStyles(variant: ToastVariant) {
  const variantConfig = {
    info: {
      borderColor: tokens.colors.cyan,
      glowColor: tokens.colors.cyanGlow,
      icon: '💡',
      iconColor: tokens.colors.cyan,
    },
    success: {
      borderColor: tokens.colors.profit,
      glowColor: tokens.colors.profitGlow,
      icon: '🐋',
      iconColor: tokens.colors.profit,
    },
    warning: {
      borderColor: tokens.colors.warning,
      glowColor: 'rgba(255, 170, 0, 0.2)',
      icon: '⚠️',
      iconColor: tokens.colors.warning,
    },
    error: {
      borderColor: tokens.colors.loss,
      glowColor: tokens.colors.lossGlow,
      icon: '❌',
      iconColor: tokens.colors.loss,
    },
  };

  return variantConfig[variant];
}

export function Toast({
  id,
  message,
  variant,
  title,
  onDismiss,
  isExiting = false,
  isMobile = false,
}: ToastProps) {
  const styles = getVariantStyles(variant);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      data-testid={`toast-${id}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: tokens.spacing[3],
        padding: tokens.spacing[4],
        background: tokens.colors.surface,
        border: `1px solid ${styles.borderColor}`,
        borderLeft: `3px solid ${styles.borderColor}`,
        borderRadius: tokens.radius.lg,
        boxShadow: `
          0 0 20px ${styles.glowColor},
          0 4px 20px rgba(0, 0, 0, 0.4)
        `,
        minWidth: isMobile ? 'calc(100vw - 32px)' : '320px',
        maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
        animation: isExiting
          ? `toastSlideOut ${tokens.animation.durationNormal} ${tokens.animation.easeOutExpo} forwards`
          : `toastSlideIn ${tokens.animation.durationNormal} ${tokens.animation.easeOutExpo}`,
        pointerEvents: 'auto',
      }}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: '20px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {styles.icon}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.sm,
              fontWeight: tokens.fontWeights.semibold,
              color: tokens.colors.textPrimary,
              marginBottom: tokens.spacing[1],
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: tokens.fontSizes.sm,
            color: title ? tokens.colors.textSecondary : tokens.colors.textPrimary,
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {message}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          padding: 0,
          background: 'transparent',
          border: 'none',
          borderRadius: tokens.radius.sm,
          color: tokens.colors.textMuted,
          cursor: 'pointer',
          flexShrink: 0,
          transition: `all ${tokens.animation.durationFast}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = tokens.colors.textPrimary;
          e.currentTarget.style.background = tokens.colors.surfaceHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = tokens.colors.textMuted;
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1L13 13M1 13L13 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
