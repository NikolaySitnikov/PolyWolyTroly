/**
 * useHover Hook
 *
 * Reusable hook for managing hover state on interactive elements.
 * Provides consistent hover behavior across all buttons and interactive components.
 *
 * Features:
 * - Tracks hover state with isHovered boolean
 * - Provides stable hoverProps for spreading onto elements
 * - Supports disabled state (won't track hover when disabled)
 * - Optional callbacks for hover start/end
 *
 * Usage:
 * ```tsx
 * const { isHovered, hoverProps } = useHover();
 *
 * <button
 *   {...hoverProps}
 *   style={{
 *     background: isHovered ? 'blue' : 'transparent',
 *   }}
 * >
 *   Hover me
 * </button>
 * ```
 *
 * With disabled state:
 * ```tsx
 * const { isHovered, hoverProps } = useHover({ disabled: isButtonDisabled });
 * ```
 */

import { useState, useCallback, useMemo } from 'react';

interface UseHoverOptions {
  /** When true, hover state won't be tracked */
  disabled?: boolean;
  /** Callback when hover starts */
  onHoverStart?: () => void;
  /** Callback when hover ends */
  onHoverEnd?: () => void;
}

interface HoverProps {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface UseHoverReturn {
  /** Current hover state */
  isHovered: boolean;
  /** Props to spread on the target element */
  hoverProps: HoverProps;
}

export function useHover(options: UseHoverOptions = {}): UseHoverReturn {
  const { disabled = false, onHoverStart, onHoverEnd } = options;
  const [isHovered, setIsHovered] = useState(false);

  const onMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
      onHoverStart?.();
    }
  }, [disabled, onHoverStart]);

  const onMouseLeave = useCallback(() => {
    if (!disabled) {
      setIsHovered(false);
      onHoverEnd?.();
    }
  }, [disabled, onHoverEnd]);

  const hoverProps = useMemo(
    () => ({
      onMouseEnter,
      onMouseLeave,
    }),
    [onMouseEnter, onMouseLeave]
  );

  return {
    isHovered: disabled ? false : isHovered,
    hoverProps,
  };
}
