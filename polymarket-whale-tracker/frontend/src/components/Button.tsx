/**
 * Button Component
 *
 * Reusable button component with micro-interactions per DESIGN_SYSTEM.md.
 *
 * Micro-interactions:
 * - Hover: Scale up slightly (1.02), glow effect, lift (-2px)
 * - Click: Scale down (0.98), quick flash
 * - Disabled: Reduced opacity, no interactions
 *
 * @see ../../../Design docs/DESIGN_SYSTEM.md - Micro-interactions section
 */

import { useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { tokens } from '../styles/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  /** Button content */
  children: ReactNode;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Whether button takes full width */
  fullWidth?: boolean;
  /** Loading state - shows spinner and disables button */
  loading?: boolean;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

/**
 * Size configurations
 */
const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: tokens.radius.sm,
  },
  md: {
    padding: '10px 20px',
    fontSize: '14px',
    borderRadius: tokens.radius.md,
  },
  lg: {
    padding: '14px 28px',
    fontSize: '16px',
    borderRadius: tokens.radius.lg,
  },
};

/**
 * Variant configurations
 */
const VARIANT_STYLES: Record<ButtonVariant, {
  base: React.CSSProperties;
  hover: React.CSSProperties;
  glow: string;
}> = {
  primary: {
    base: {
      background: tokens.colors.cyan,
      border: 'none',
      color: tokens.colors.void,
    },
    hover: {
      background: tokens.colors.cyan,
      filter: 'brightness(1.1)',
    },
    glow: tokens.colors.cyanGlow,
  },
  secondary: {
    base: {
      background: 'transparent',
      border: `1px solid ${tokens.colors.cyan}`,
      color: tokens.colors.cyan,
    },
    hover: {
      background: `${tokens.colors.cyan}15`,
    },
    glow: tokens.colors.cyanGlow,
  },
  ghost: {
    base: {
      background: 'transparent',
      border: '1px solid transparent',
      color: tokens.colors.textSecondary,
    },
    hover: {
      background: tokens.colors.surface,
      color: tokens.colors.textPrimary,
    },
    glow: 'transparent',
  },
  danger: {
    base: {
      background: tokens.colors.loss,
      border: 'none',
      color: tokens.colors.textPrimary,
    },
    hover: {
      background: tokens.colors.loss,
      filter: 'brightness(1.1)',
    },
    glow: tokens.colors.lossGlow,
  },
};

/**
 * Loading spinner component
 */
function Spinner() {
  return (
    <span
      data-testid="button-spinner"
      style={{
        display: 'inline-block',
        width: '14px',
        height: '14px',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginRight: '8px',
      }}
    />
  );
}

/**
 * Button Component
 *
 * A fully-styled button with micro-interactions.
 *
 * @example
 * ```tsx
 * <Button onClick={handleClick}>Click me</Button>
 * <Button variant="secondary" size="lg">Large Secondary</Button>
 * <Button variant="danger" loading>Deleting...</Button>
 * ```
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  style,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isDisabled = disabled || loading;
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      setIsHovered(true);
    }
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    setIsPressed(false);
    onMouseLeave?.(e);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      setIsPressed(true);
    }
    onMouseDown?.(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(false);
    onMouseUp?.(e);
  };

  // Compute transform based on state
  let transform = '';
  if (isPressed) {
    transform = 'scale(0.98)';
  } else if (isHovered && !isDisabled) {
    transform = 'translateY(-2px) scale(1.02)';
  }

  // Compute box shadow based on state
  let boxShadow = `0 0 20px ${variantStyle.glow}`;
  if (isHovered && !isDisabled) {
    boxShadow = `0 0 30px ${variantStyle.glow}, 0 4px 15px rgba(0,0,0,0.3)`;
  }

  return (
    <button
      {...props}
      disabled={isDisabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        // Base styles
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: tokens.fonts.body,
        fontWeight: tokens.fontWeights.semibold,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: `all ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',

        // Size styles
        ...sizeStyle,

        // Variant base styles
        ...variantStyle.base,

        // Full width
        width: fullWidth ? '100%' : 'auto',

        // Hover styles (applied via state)
        ...(isHovered && !isDisabled ? variantStyle.hover : {}),

        // Dynamic styles
        transform,
        boxShadow: variant === 'ghost' ? 'none' : boxShadow,

        // Disabled state
        opacity: isDisabled ? 0.5 : 1,

        // Custom styles override
        ...style,
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export default Button;
