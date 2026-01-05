/**
 * ToastContainer Component
 *
 * Container component that renders all active toast notifications.
 * Uses ToastContext to get the current toasts.
 *
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Position: Top-right (desktop), Top-center (mobile)
 * - Max stack: 3 visible toasts
 * - Stacks vertically with gap
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md
 */

import { tokens } from '../styles/tokens';
import { useToast } from '../contexts/ToastContext';
import { Toast } from './Toast';
import { LAYOUT } from '../constants/layout';

interface ToastContainerProps {
  /** Whether we're in mobile layout */
  isMobile?: boolean;
}

export function ToastContainer({ isMobile = false }: ToastContainerProps) {
  const { toasts, dismissToast } = useToast();

  // Position below the header with some spacing
  const topPosition = isMobile
    ? `calc(${LAYOUT.header.mobile} + ${tokens.spacing[4]})`  // 60px + 16px = 76px
    : `calc(${LAYOUT.header.desktop} + ${tokens.spacing[4]})`; // 70px + 16px = 86px

  return (
    <div
      data-testid="toast-container"
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        zIndex: tokens.zIndex.notification,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[3],
        pointerEvents: 'none',
        top: topPosition,
        // Desktop: top-right
        // Mobile: top-center (full width)
        ...(isMobile
          ? {
              left: tokens.spacing[4],
              right: tokens.spacing[4],
              alignItems: 'center',
            }
          : {
              right: tokens.spacing[6],
              alignItems: 'flex-end',
            }),
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          title={toast.title}
          isExiting={toast.isExiting}
          isMobile={isMobile}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
}
