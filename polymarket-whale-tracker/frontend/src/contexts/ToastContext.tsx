/**
 * ToastContext
 *
 * Global toast notification state management.
 * Provides context for showing toast notifications throughout the app.
 *
 * Features:
 * - 4 variants: info, success, warning, error
 * - Auto-dismiss after 5 seconds
 * - Maximum 3 visible toasts (stacking)
 * - Exit animations before removal
 *
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Position: Top-right (desktop), Top-center (mobile)
 * - Duration: 5 seconds (auto-dismiss)
 * - Max stack: 3
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ToastVariant } from '../components/Toast';

/** Duration before auto-dismiss (in ms) */
const AUTO_DISMISS_DURATION = 5000;

/** Maximum number of visible toasts */
const MAX_VISIBLE_TOASTS = 3;

/** Duration of exit animation (in ms) */
const EXIT_ANIMATION_DURATION = 250;

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  isExiting?: boolean;
}

export interface AddToastOptions {
  message: string;
  variant: ToastVariant;
  title?: string;
  /** Custom duration in ms. Default is 5000ms. Set to 0 to disable auto-dismiss. */
  duration?: number;
}

interface ToastContextValue {
  /** Currently visible toasts */
  toasts: ToastData[];
  /** Add a new toast notification */
  addToast: (options: AddToastOptions) => string;
  /** Manually dismiss a toast by ID */
  dismissToast: (id: string) => void;
  /** Clear all toasts */
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Generate unique toast ID */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * Schedule auto-dismiss for a toast
   */
  const scheduleAutoDismiss = useCallback((id: string, duration: number) => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      // Start exit animation
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
      );

      // Remove after animation completes
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, EXIT_ANIMATION_DURATION);
    }, duration);

    timersRef.current.set(id, timer);
  }, []);

  /**
   * Add a new toast notification
   * Returns the toast ID
   */
  const addToast = useCallback(
    (options: AddToastOptions): string => {
      const id = generateId();
      const duration = options.duration ?? AUTO_DISMISS_DURATION;

      const newToast: ToastData = {
        id,
        message: options.message,
        variant: options.variant,
        title: options.title,
        isExiting: false,
      };

      setToasts((prev) => {
        // Add new toast at the end
        const updated = [...prev, newToast];
        // Keep only the last MAX_VISIBLE_TOASTS
        return updated.slice(-MAX_VISIBLE_TOASTS);
      });

      // Schedule auto-dismiss
      scheduleAutoDismiss(id, duration);

      return id;
    },
    [scheduleAutoDismiss]
  );

  /**
   * Manually dismiss a toast
   */
  const dismissToast = useCallback((id: string) => {
    // Clear any pending auto-dismiss timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    // Start exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );

    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_DURATION);
  }, []);

  /**
   * Clear all toasts immediately
   */
  const clearAllToasts = useCallback(() => {
    // Clear all timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    // Clear all toasts
    setToasts([]);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, dismissToast, clearAllToasts }}
    >
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast context
 * @throws Error if used outside ToastProvider
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
