/**
 * Skeleton Loading Components
 *
 * Reusable skeleton loading components for content placeholders.
 * Per DESIGN_SYSTEM.md: "Skeleton screens with shimmer"
 *
 * Features:
 * - Shimmer animation (1.5s infinite)
 * - Shape variants matching actual content
 * - Staggered animation delays for visual flow
 *
 * @see ../styles/globals.css - shimmer keyframe animation
 */

import { tokens } from '../styles/tokens';

interface SkeletonProps {
  /** Width of the skeleton (e.g., '100px', '50%') */
  width?: string;
  /** Height of the skeleton (e.g., '20px', '100%') */
  height?: string;
  /** Border radius */
  borderRadius?: string;
  /** Animation delay for staggered effect */
  delay?: number;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Data test id */
  'data-testid'?: string;
}

/**
 * Base Skeleton component
 *
 * A simple animated placeholder that can be customized with any dimensions.
 *
 * @example
 * ```tsx
 * <Skeleton width="100px" height="20px" />
 * <Skeleton width="100%" height="40px" borderRadius="8px" />
 * ```
 */
export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = '4px',
  delay = 0,
  style,
  'data-testid': testId,
}: SkeletonProps) {
  return (
    <div
      data-testid={testId}
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${tokens.colors.surface} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.surface} 100%)`,
        backgroundSize: '200% 100%',
        animation: `shimmer 1.5s infinite`,
        animationDelay: `${delay}ms`,
        ...style,
      }}
    />
  );
}

interface SkeletonTextProps {
  /** Width of the text placeholder */
  width?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Animation delay */
  delay?: number;
  /** Data test id */
  'data-testid'?: string;
}

const TEXT_SIZES = {
  sm: '12px',
  md: '14px',
  lg: '18px',
};

/**
 * SkeletonText component
 *
 * A text-shaped skeleton placeholder.
 *
 * @example
 * ```tsx
 * <SkeletonText width="80%" />
 * <SkeletonText size="lg" width="60%" />
 * ```
 */
export function SkeletonText({
  width = '100%',
  size = 'md',
  delay = 0,
  'data-testid': testId,
}: SkeletonTextProps) {
  return (
    <Skeleton
      width={width}
      height={TEXT_SIZES[size]}
      borderRadius="4px"
      delay={delay}
      data-testid={testId}
    />
  );
}

interface SkeletonCardProps {
  /** Animation delay */
  delay?: number;
  /** Data test id */
  'data-testid'?: string;
}

/**
 * SkeletonCard component
 *
 * A card-shaped skeleton matching the whale/alert card structure.
 * Includes avatar placeholder, text lines, and stats.
 *
 * @example
 * ```tsx
 * <SkeletonCard />
 * <SkeletonCard delay={100} />
 * ```
 */
export function SkeletonCard({ delay = 0, 'data-testid': testId }: SkeletonCardProps) {
  return (
    <div
      data-testid={testId}
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '14px',
        padding: '16px',
        animation: `shimmer 1.5s infinite`,
        animationDelay: `${delay}ms`,
        backgroundImage: `linear-gradient(90deg, ${tokens.colors.surface} 0%, ${tokens.colors.border}20 50%, ${tokens.colors.surface} 100%)`,
        backgroundSize: '200% 100%',
      }}
    >
      {/* Header row - avatar + address + time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Avatar placeholder */}
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: tokens.colors.border,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Address placeholder */}
            <div
              style={{
                width: '110px',
                height: '14px',
                borderRadius: '4px',
                background: tokens.colors.border,
              }}
            />
            {/* Badge placeholder */}
            <div
              style={{
                width: '60px',
                height: '12px',
                borderRadius: '4px',
                background: tokens.colors.border,
              }}
            />
          </div>
        </div>
        {/* Time placeholder */}
        <div
          style={{
            width: '50px',
            height: '20px',
            borderRadius: '6px',
            background: tokens.colors.border,
          }}
        />
      </div>

      {/* Stats grid - 2 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        {/* Stat 1 */}
        <div>
          <div
            style={{
              width: '80px',
              height: '10px',
              borderRadius: '4px',
              background: tokens.colors.border,
              marginBottom: '6px',
            }}
          />
          <div
            style={{
              width: '70px',
              height: '18px',
              borderRadius: '4px',
              background: tokens.colors.border,
            }}
          />
        </div>
        {/* Stat 2 */}
        <div>
          <div
            style={{
              width: '50px',
              height: '10px',
              borderRadius: '4px',
              background: tokens.colors.border,
              marginBottom: '6px',
            }}
          />
          <div
            style={{
              width: '40px',
              height: '18px',
              borderRadius: '4px',
              background: tokens.colors.border,
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface SkeletonRowProps {
  /** Animation delay */
  delay?: number;
  /** Data test id */
  'data-testid'?: string;
}

/**
 * SkeletonRow component
 *
 * A table row-shaped skeleton for desktop table views.
 * Matches the whale/alert table row structure.
 *
 * @example
 * ```tsx
 * <SkeletonRow />
 * <SkeletonRow delay={50} />
 * ```
 */
export function SkeletonRow({ delay = 0, 'data-testid': testId }: SkeletonRowProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderBottom: `1px solid ${tokens.colors.border}`,
        animation: `shimmer 1.5s infinite`,
        animationDelay: `${delay}ms`,
        backgroundImage: `linear-gradient(90deg, transparent 0%, ${tokens.colors.border}10 50%, transparent 100%)`,
        backgroundSize: '200% 100%',
      }}
    >
      {/* Avatar placeholder */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: tokens.colors.border,
          flexShrink: 0,
        }}
      />

      {/* Content column - address + badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: '130px',
            height: '14px',
            borderRadius: '4px',
            background: tokens.colors.border,
            marginBottom: '4px',
          }}
        />
        <div
          style={{
            width: '60px',
            height: '10px',
            borderRadius: '4px',
            background: tokens.colors.border,
          }}
        />
      </div>

      {/* Value column */}
      <div
        style={{
          width: '80px',
          height: '14px',
          borderRadius: '4px',
          background: tokens.colors.border,
        }}
      />

      {/* Count column */}
      <div
        style={{
          width: '40px',
          height: '14px',
          borderRadius: '4px',
          background: tokens.colors.border,
        }}
      />

      {/* Time column */}
      <div
        style={{
          width: '60px',
          height: '12px',
          borderRadius: '4px',
          background: tokens.colors.border,
        }}
      />
    </div>
  );
}

export default Skeleton;
