/**
 * AlertFeedSkeleton Component
 *
 * Skeleton loading state for the AlertFeed component.
 * Shapes match actual alert card/row content for smooth transition.
 *
 * Per DESIGN_SYSTEM.md: "Skeleton screens with shimmer"
 *
 * @see ./AlertFeed.tsx - Actual component this skeleton represents
 * @see ./Skeleton.tsx - Base skeleton components
 */

import { tokens } from '../styles/tokens';

interface AlertFeedSkeletonProps {
  /** Whether to show mobile card view or desktop list view */
  isMobile: boolean;
  /** Number of skeleton items to show */
  count?: number;
}

/**
 * Skeleton card for mobile alert view
 */
function SkeletonAlertCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      data-testid="skeleton-alert-card"
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
      {/* Header row - icon + address + time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Icon placeholder */}
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
        {/* Stat 1 - Amount */}
        <div>
          <div
            style={{
              width: '60px',
              height: '10px',
              borderRadius: '4px',
              background: tokens.colors.border,
              marginBottom: '6px',
            }}
          />
          <div
            style={{
              width: '80px',
              height: '18px',
              borderRadius: '4px',
              background: tokens.colors.border,
            }}
          />
        </div>
        {/* Stat 2 - Type */}
        <div>
          <div
            style={{
              width: '40px',
              height: '10px',
              borderRadius: '4px',
              background: tokens.colors.border,
              marginBottom: '6px',
            }}
          />
          <div
            style={{
              width: '50px',
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

/**
 * Skeleton row for desktop alert feed
 */
function SkeletonAlertRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      data-testid="skeleton-alert-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderBottom: `1px solid ${tokens.colors.border}`,
        animation: `shimmer 1.5s infinite`,
        animationDelay: `${delay}ms`,
        backgroundImage: `linear-gradient(90deg, transparent 0%, ${tokens.colors.border}10 50%, transparent 100%)`,
        backgroundSize: '200% 100%',
      }}
    >
      {/* Icon placeholder */}
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}
        >
          {/* Address placeholder */}
          <div
            style={{
              width: '100px',
              height: '12px',
              borderRadius: '4px',
              background: tokens.colors.border,
            }}
          />
          {/* Badge placeholder */}
          <div
            style={{
              width: '50px',
              height: '18px',
              borderRadius: '4px',
              background: tokens.colors.border,
            }}
          />
        </div>
        {/* Amount placeholder */}
        <div
          style={{
            width: '70px',
            height: '14px',
            borderRadius: '4px',
            background: tokens.colors.border,
          }}
        />
      </div>

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

/**
 * AlertFeedSkeleton Component
 *
 * Full skeleton loading state for the alert feed.
 * Matches the structure of AlertFeed for both mobile and desktop.
 */
export function AlertFeedSkeleton({ isMobile, count = 5 }: AlertFeedSkeletonProps) {
  // Mobile card view
  if (isMobile) {
    return (
      <div
        data-testid="alert-feed-skeleton"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }}
      >
        {/* Sticky header skeleton */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: `linear-gradient(180deg, ${tokens.colors.void} 0%, ${tokens.colors.void}f0 85%, transparent 100%)`,
            paddingTop: '4px',
            paddingBottom: '16px',
            marginLeft: '-16px',
            marginRight: '-16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          {/* Title Row placeholder */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: tokens.colors.border,
                }}
              />
              <div
                style={{
                  width: '60px',
                  height: '20px',
                  borderRadius: '4px',
                  background: tokens.colors.border,
                }}
              />
            </div>
            <div
              style={{
                width: '60px',
                height: '28px',
                borderRadius: '999px',
                background: tokens.colors.border,
              }}
            />
          </div>

          {/* Filter pill placeholder */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '12px',
                borderRadius: '4px',
                background: tokens.colors.border,
              }}
            />
            <div
              style={{
                width: '80px',
                height: '28px',
                borderRadius: '999px',
                background: tokens.colors.border,
              }}
            />
          </div>

          {/* Search bar placeholder */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '16px',
                borderRadius: '4px',
                background: tokens.colors.border,
              }}
            />
          </div>
        </div>

        {/* Card skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonAlertCard key={i} delay={i * 100} />
          ))}
        </div>
      </div>
    );
  }

  // Desktop list view
  return (
    <div
      data-testid="alert-feed-skeleton"
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        height: '722px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with search */}
      <div
        data-testid="skeleton-feed-header"
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: tokens.colors.border,
            }}
          />
          <div
            style={{
              width: '70px',
              height: '16px',
              borderRadius: '4px',
              background: tokens.colors.border,
            }}
          />
          {/* Filter pill placeholder */}
          <div
            style={{
              width: '60px',
              height: '20px',
              borderRadius: '999px',
              background: tokens.colors.border,
            }}
          />
        </div>
        <div style={{ flex: 1 }} />
        {/* Search placeholder */}
        <div
          style={{
            width: '200px',
            height: '36px',
            borderRadius: '8px',
            background: tokens.colors.void,
            border: `1px solid ${tokens.colors.border}`,
          }}
        />
        {/* Live indicator placeholder */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: tokens.colors.border,
            }}
          />
          <div
            style={{
              width: '30px',
              height: '12px',
              borderRadius: '4px',
              background: tokens.colors.border,
            }}
          />
        </div>
      </div>

      {/* List rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonAlertRow key={i} delay={i * 50} />
        ))}
      </div>
    </div>
  );
}

export default AlertFeedSkeleton;
