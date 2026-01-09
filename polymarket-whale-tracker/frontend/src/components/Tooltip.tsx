/**
 * Tooltip Component
 *
 * Reusable tooltip for hover explanations.
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Tooltips appear on hover with explanations
 * - Animation: fadeInUp 150ms ease-out
 *
 * Accessibility:
 * - Shows on hover (desktop) and focus (keyboard)
 * - Uses ARIA describedby for screen readers
 * - Respects prefers-reduced-motion
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { useState, useRef, useEffect, useId } from 'react';
import type { ReactNode, ReactElement, RefCallback } from 'react';
import { createPortal } from 'react-dom';
import { tokens } from '../styles/tokens';

type Placement = 'top' | 'bottom' | 'left' | 'right';
type TooltipVariant = 'default' | 'title';

interface TooltipProps {
  /** Content to display in the tooltip */
  content: ReactNode;
  /** Element that triggers the tooltip */
  children: ReactElement;
  /** Position of the tooltip relative to trigger */
  placement?: Placement;
  /** Delay in ms before showing tooltip */
  delay?: number;
  /** Variant for styling - 'title' has white text and larger font for readability */
  variant?: TooltipVariant;
}

/**
 * Calculate tooltip position based on trigger element and placement
 */
function calculatePosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: Placement
): { top: number; left: number } {
  const gap = 8; // Space between trigger and tooltip

  switch (placement) {
    case 'top':
      return {
        top: triggerRect.top - tooltipRect.height - gap,
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
      };
    case 'bottom':
      return {
        top: triggerRect.bottom + gap,
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
      };
    case 'left':
      return {
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.left - tooltipRect.width - gap,
      };
    case 'right':
      return {
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.right + gap,
      };
  }
}

/**
 * Ensure tooltip stays within viewport bounds
 */
function clampPosition(
  position: { top: number; left: number },
  tooltipRect: DOMRect
): { top: number; left: number } {
  const padding = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return {
    top: Math.max(padding, Math.min(position.top, viewportHeight - tooltipRect.height - padding)),
    left: Math.max(padding, Math.min(position.left, viewportWidth - tooltipRect.width - padding)),
  };
}

/**
 * Get arrow position styles based on placement
 */
function getArrowStyles(placement: Placement): React.CSSProperties {
  const arrowSize = 6;

  switch (placement) {
    case 'top':
      return {
        bottom: -arrowSize,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        borderTop: 'none',
        borderLeft: 'none',
      };
    case 'bottom':
      return {
        top: -arrowSize,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        borderBottom: 'none',
        borderRight: 'none',
      };
    case 'left':
      return {
        right: -arrowSize,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
        borderTop: 'none',
        borderLeft: 'none',
      };
    case 'right':
      return {
        left: -arrowSize,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
        borderBottom: 'none',
        borderRight: 'none',
      };
  }
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 150,
  variant = 'default',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const tooltipId = useId();

  // Show tooltip after delay
  const show = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  // Hide tooltip immediately
  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  // Calculate position when visible
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let pos = calculatePosition(triggerRect, tooltipRect, placement);
      pos = clampPosition(pos, tooltipRect);

      setPosition(pos);
    }
  }, [isVisible, placement]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Merge refs - handle both callback refs and object refs from child
  const setTriggerRef: RefCallback<HTMLElement> = (node) => {
    triggerRef.current = node;
    // Forward ref to child if it has one
    const childRef = (children as { ref?: React.Ref<HTMLElement> }).ref;
    if (typeof childRef === 'function') {
      childRef(node);
    } else if (childRef && typeof childRef === 'object') {
      (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  };

  // Wrap children in a span to add event handlers without cloneElement type issues
  return (
    <>
      <span
        ref={setTriggerRef as RefCallback<HTMLSpanElement>}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={isVisible ? tooltipId : undefined}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            data-placement={placement}
            style={{
              position: 'fixed',
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              zIndex: 9999, // Must be above everything including fixed headers
              maxWidth: variant === 'title' ? '400px' : '280px',
              padding: variant === 'title'
                ? `${tokens.spacing[3]} ${tokens.spacing[4]}`
                : `${tokens.spacing[2]} ${tokens.spacing[3]}`,
              background: tokens.colors.surface,
              border: `1px solid ${variant === 'title' ? tokens.colors.cyan + '40' : tokens.colors.border}`,
              borderRadius: tokens.radius.md,
              boxShadow: variant === 'title'
                ? `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px ${tokens.colors.cyan}20`
                : `0 4px 16px rgba(0, 0, 0, 0.4)`,
              fontFamily: tokens.fonts.body,
              fontSize: variant === 'title' ? tokens.fontSizes.sm : tokens.fontSizes.xs,
              fontWeight: variant === 'title' ? 500 : 400,
              color: variant === 'title' ? tokens.colors.textPrimary : tokens.colors.textSecondary,
              lineHeight: 1.4,
              pointerEvents: 'none',
              animation: 'fadeInUp 150ms ease-out',
              // Initially invisible until position is calculated
              opacity: position ? 1 : 0,
            }}
          >
            {/* Arrow */}
            <div
              style={{
                position: 'absolute',
                width: '12px',
                height: '12px',
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                ...getArrowStyles(placement),
              }}
            />
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
