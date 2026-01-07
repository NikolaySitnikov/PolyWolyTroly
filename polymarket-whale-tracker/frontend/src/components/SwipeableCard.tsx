/**
 * SwipeableCard Component
 *
 * A wrapper component that adds swipe gesture support to cards.
 * Used for mobile interactions like follow/hide on whale cards.
 *
 * Per DESIGN_IMPLEMENTATION_ROADMAP.md:
 * - Swipe right: follow whale
 * - Swipe left: hide whale
 *
 * Features:
 * - Touch gesture detection with threshold
 * - Visual feedback during swipe (card follows finger)
 * - Background hint reveals as card is swiped
 * - Snap back animation if swipe is cancelled
 * - Respects vertical scroll (ignores vertical gestures)
 *
 * @see ../styles/tokens.ts - Design tokens
 */

import { useState, useRef, type ReactNode, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';

interface SwipeableCardProps {
  children: ReactNode;
  /** Called when user swipes left past threshold */
  onSwipeLeft: () => void;
  /** Called when user swipes right past threshold */
  onSwipeRight: () => void;
  /** Optional click handler (for tap without swipe) */
  onClick?: () => void;
  /** Hint text shown when swiping left */
  leftHint?: string;
  /** Hint text shown when swiping right */
  rightHint?: string;
  /** Swipe distance threshold in pixels (default: 80) */
  threshold?: number;
  /** Additional styles for the card container */
  style?: CSSProperties;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onClick,
  leftHint = 'Hide',
  rightHint = 'Follow',
  threshold = 80,
  style,
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const hasMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    isHorizontalSwipeRef.current = null;
    hasMoved.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipeRef.current === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Need at least 10px movement to determine direction
      if (absX > 10 || absY > 10) {
        isHorizontalSwipeRef.current = absX > absY;
        // Mark as moved for ANY significant movement (prevents click on scroll)
        hasMoved.current = true;
      }
    }

    // Only handle horizontal swipes (update visual position)
    if (isHorizontalSwipeRef.current === true) {
      currentXRef.current = touch.clientX;
      setOffsetX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    const finalOffset = currentXRef.current - startXRef.current;

    // Check if swipe exceeded threshold
    if (finalOffset > threshold) {
      onSwipeRight();
    } else if (finalOffset < -threshold) {
      onSwipeLeft();
    } else if (!hasMoved.current && onClick) {
      // Tap without movement - trigger click
      onClick();
    }

    // Reset state
    setOffsetX(0);
    setIsSwiping(false);
    isHorizontalSwipeRef.current = null;
    hasMoved.current = false;
  };

  // Calculate hint visibility based on swipe progress
  const swipeProgress = Math.min(Math.abs(offsetX) / threshold, 1);
  const isSwipingRight = offsetX > 0;
  const isSwipingLeft = offsetX < 0;

  /**
   * Handle mouse clicks (for desktop/Playwright testing).
   * Touch devices use handleTouchEnd instead.
   */
  const handleClick = () => {
    // Only trigger if we haven't been swiping (no touch movement)
    // This prevents double-triggering on touch devices
    if (!isSwiping && onClick) {
      onClick();
    }
  };

  return (
    <div
      data-testid="swipeable-card"
      style={{
        position: 'relative',
        // Use clip-path instead of overflow:hidden to allow hover effects
        // while still clipping the swipe background hints
        overflow: 'visible',
        borderRadius: '14px',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background hints (revealed during swipe) - clipped to card bounds */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          pointerEvents: 'none',
          overflow: 'hidden',
          borderRadius: '14px',
        }}
      >
        {/* Right hint (Follow) - shown when swiping right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            opacity: isSwipingRight ? swipeProgress : 0,
            transform: `translateX(${isSwipingRight ? 0 : -20}px) scale(${0.8 + swipeProgress * 0.2})`,
            transition: isSwiping ? 'none' : 'all 0.2s ease',
          }}
        >
          {/* Icon container with brand-aligned glow */}
          <span
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `${tokens.colors.profit}15`,
              border: `2px solid ${tokens.colors.profit}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 ${12 + swipeProgress * 12}px ${tokens.colors.profitGlow}`,
            }}
          >
            {/* Checkmark icon (Phosphor-style) */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={tokens.colors.profit}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '13px',
              fontWeight: 600,
              color: tokens.colors.profit,
              letterSpacing: '0.02em',
              textShadow: `0 0 10px ${tokens.colors.profitGlow}`,
            }}
          >
            {rightHint}
          </span>
        </div>

        {/* Left hint (Hide) - shown when swiping left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            opacity: isSwipingLeft ? swipeProgress : 0,
            transform: `translateX(${isSwipingLeft ? 0 : 20}px) scale(${0.8 + swipeProgress * 0.2})`,
            transition: isSwiping ? 'none' : 'all 0.2s ease',
          }}
        >
          <span
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '13px',
              fontWeight: 600,
              color: tokens.colors.loss,
              letterSpacing: '0.02em',
              textShadow: `0 0 10px ${tokens.colors.lossGlow}`,
            }}
          >
            {leftHint}
          </span>
          {/* Icon container with brand-aligned glow */}
          <span
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `${tokens.colors.loss}15`,
              border: `2px solid ${tokens.colors.loss}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 ${12 + swipeProgress * 12}px ${tokens.colors.lossGlow}`,
            }}
          >
            {/* X icon (Phosphor-style) */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={tokens.colors.loss}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
        </div>
      </div>

      {/* Card content (moves with swipe) */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          background: tokens.colors.surface,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
