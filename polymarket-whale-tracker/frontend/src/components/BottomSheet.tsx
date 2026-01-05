/**
 * BottomSheet Component
 *
 * Mobile-first bottom sheet for filters, details, and actions.
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Border-radius: 24px 24px 0 0
 * - Handle: 40px × 4px centered bar
 * - Snap points: 40%, 90%
 * - Backdrop: rgba(0, 0, 0, 0.6)
 *
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md
 */

import React, { useEffect, useCallback, useRef, useState, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';

export interface BottomSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet should close */
  onClose: () => void;
  /** Optional title displayed at top */
  title?: string;
  /** Content to render inside the sheet */
  children: React.ReactNode;
  /** Initial snap point: 'half' (40vh) or 'full' (90vh) */
  initialSnapPoint?: 'half' | 'full';
  /** Whether to show close button */
  showCloseButton?: boolean;
}

/**
 * BottomSheet - Mobile bottom sheet component
 *
 * Features:
 * - Draggable handle for snap points
 * - Backdrop click to close
 * - Escape key to close
 * - Smooth animations with reduced motion support
 * - Accessible with proper ARIA attributes
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  initialSnapPoint = 'half',
  showCloseButton = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [snapPoint, setSnapPoint] = useState<'half' | 'full'>(initialSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentTranslateY, setCurrentTranslateY] = useState(0);
  const titleId = useRef(`bottom-sheet-title-${Math.random().toString(36).slice(2)}`);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset snap point when closed
  useEffect(() => {
    if (!isOpen) {
      setSnapPoint(initialSnapPoint);
      setCurrentTranslateY(0);
    }
  }, [isOpen, initialSnapPoint]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY;

    // Only allow dragging down from full, or up from half
    if (snapPoint === 'full' && deltaY > 0) {
      setCurrentTranslateY(deltaY);
    } else if (snapPoint === 'half' && deltaY < 0) {
      setCurrentTranslateY(deltaY);
    } else if (snapPoint === 'half' && deltaY > 0) {
      // Allow closing by dragging down
      setCurrentTranslateY(deltaY);
    }
  }, [isDragging, dragStartY, snapPoint]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 100; // pixels

    if (currentTranslateY > threshold) {
      // Dragged down significantly
      if (snapPoint === 'full') {
        setSnapPoint('half');
      } else {
        onClose();
      }
    } else if (currentTranslateY < -threshold) {
      // Dragged up significantly
      if (snapPoint === 'half') {
        setSnapPoint('full');
      }
    }

    setCurrentTranslateY(0);
  }, [isDragging, currentTranslateY, snapPoint, onClose]);

  // Touch event handlers for the handle area
  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e);
  const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e);
  const handleTouchEnd = () => handleDragEnd();

  // Mouse event handlers (for testing)
  const handleMouseDown = (e: React.MouseEvent) => handleDragStart(e);
  const handleMouseMove = (e: React.MouseEvent) => handleDragMove(e);
  const handleMouseUp = () => handleDragEnd();

  if (!isOpen) return null;

  const height = snapPoint === 'half' ? '40vh' : '90vh';

  // Styles
  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: tokens.zIndex.modal,
    animation: 'fadeIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const sheetStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height,
    backgroundColor: tokens.colors.surface,
    borderRadius: '24px 24px 0 0',
    zIndex: tokens.zIndex.modal + 1,
    display: 'flex',
    flexDirection: 'column',
    transform: `translateY(${currentTranslateY}px)`,
    transition: isDragging ? 'none' : `height 300ms ${tokens.animation.easeOutExpo}, transform 300ms ${tokens.animation.easeOutExpo}`,
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
  };

  const handleAreaStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 16px 8px',
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  };

  const handleStyle: CSSProperties = {
    width: '40px',
    height: '4px',
    backgroundColor: tokens.colors.border,
    borderRadius: '2px',
    marginBottom: title ? '12px' : '0',
  };

  const titleStyle: CSSProperties = {
    fontFamily: tokens.fonts.display,
    fontSize: tokens.fontSizes.lg,
    fontWeight: tokens.fontWeights.bold,
    color: tokens.colors.textPrimary,
    margin: 0,
    width: '100%',
    textAlign: 'center',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px 16px',
    borderBottom: `1px solid ${tokens.colors.border}`,
  };

  const closeButtonStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colors.textSecondary,
    borderRadius: tokens.radius.md,
    transition: `all ${tokens.animation.durationFast} ease`,
    cursor: 'pointer',
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="bottom-sheet-backdrop"
        style={backdropStyle}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        data-testid="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Handle Area - draggable */}
        <div
          style={handleAreaStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div data-testid="bottom-sheet-handle" style={handleStyle} />
        </div>

        {/* Header with title and close */}
        {(title || showCloseButton) && (
          <div style={headerStyle}>
            <div style={{ width: showCloseButton ? '32px' : '0' }} />
            {title && (
              <h2 id={titleId.current} style={titleStyle}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                style={closeButtonStyle}
                aria-label="Close"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = tokens.colors.textPrimary;
                  e.currentTarget.style.backgroundColor = tokens.colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = tokens.colors.textSecondary;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div style={contentStyle}>
          {children}
        </div>
      </div>
    </>
  );
};

export default BottomSheet;
