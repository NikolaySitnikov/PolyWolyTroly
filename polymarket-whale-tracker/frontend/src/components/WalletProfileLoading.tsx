/**
 * WalletProfileLoading Component
 *
 * Loading skeleton for wallet profile view.
 */

import { tokens } from '../styles/tokens';

interface WalletProfileLoadingProps {
  isMobile: boolean;
}

function SkeletonBox({
  width,
  height,
  style,
}: {
  width: string;
  height: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(90deg, ${tokens.colors.surface} 0%, ${tokens.colors.surfaceHover} 50%, ${tokens.colors.surface} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '6px',
        ...style,
      }}
    />
  );
}

export function WalletProfileLoading({ isMobile }: WalletProfileLoadingProps) {
  return (
    <div data-testid="wallet-profile-loading">
      {/* Back button skeleton */}
      <SkeletonBox width="140px" height="36px" style={{ marginBottom: '24px' }} />

      {/* Header skeleton */}
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: isMobile ? '20px' : '24px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <SkeletonBox width="28px" height="28px" />
              <SkeletonBox width="160px" height="28px" />
            </div>
            <SkeletonBox width={isMobile ? '100%' : '360px'} height="40px" />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <SkeletonBox width="80px" height="32px" />
            <SkeletonBox width="150px" height="32px" />
          </div>
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <SkeletonBox width="100px" height="14px" style={{ marginBottom: '12px' }} />
            <SkeletonBox width="80px" height="28px" />
          </div>
        ))}
      </div>

      {/* Deposit history skeleton */}
      <div
        style={{
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${tokens.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <SkeletonBox width="140px" height="20px" />
          <SkeletonBox width="60px" height="16px" />
        </div>

        {/* Items */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${tokens.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <SkeletonBox width="36px" height="36px" style={{ borderRadius: '8px' }} />
            <div style={{ flex: 1 }}>
              <SkeletonBox width="100px" height="18px" style={{ marginBottom: '6px' }} />
              <SkeletonBox width="160px" height="12px" />
            </div>
            <SkeletonBox width="50px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}
