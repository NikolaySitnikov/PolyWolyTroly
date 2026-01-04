/**
 * PolyWolyTroly - Whale Intelligence Platform
 *
 * Main App component - the shell for the entire application.
 * Implements the cyberpunk terminal aesthetic from the design system.
 *
 * Step 5: Connected to real backend API with loading/error states.
 * Step 5b: Live updates via WebSocket - data updates instantly!
 * Step 6: Whale List/Table with search & sort.
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { useState } from 'react';
import './styles/globals.css';
import { tokens } from './styles/tokens';
import { useMobile } from './hooks/useMobile';
import { useStats } from './hooks/useStats';
import { useWhales } from './hooks/useWhales';
import { useWebSocket } from './hooks/useWebSocket';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import { DashboardLoading } from './components/DashboardLoading';
import { DashboardError } from './components/DashboardError';
import { WhaleTable } from './components/WhaleTable';
import { GlowText } from './components/GlowText';
import type { ViewId } from './types/navigation';

// WebSocket URL - same port as API
const WS_URL = 'ws://localhost:3002';

function App() {
  const isMobile = useMobile();
  const [currentView, setCurrentView] = useState<ViewId>('dashboard');
  const { data: stats, loading, error, refetch, updateStats } = useStats();
  const {
    whales,
    loading: whalesLoading,
    error: whalesError,
    refetch: refetchWhales,
  } = useWhales();

  // Connect to WebSocket for instant live updates
  const { connected } = useWebSocket(WS_URL, {
    onStats: updateStats,
    onDeposit: (deposit) => {
      console.log('New deposit:', deposit);
      // Refetch whales to get updated data
      refetchWhales();
    },
  });

  const handleNavigate = (view: ViewId) => {
    setCurrentView(view);
  };

  const handleWhaleClick = (address: string) => {
    console.log('Whale clicked:', address);
    // Future: navigate to wallet profile view
  };

  const renderDashboardContent = () => {
    if (loading) {
      return <DashboardLoading isMobile={isMobile} />;
    }

    if (error) {
      return <DashboardError error={error} onRetry={refetch} isMobile={isMobile} />;
    }

    if (stats) {
      return <Dashboard stats={stats} isMobile={isMobile} />;
    }

    return null;
  };

  const renderWhalesContent = () => {
    return (
      <div>
        {/* Page header */}
        <div style={{ marginBottom: tokens.spacing[6] }}>
          <h1
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: isMobile ? tokens.fontSizes['2xl'] : tokens.fontSizes['3xl'],
              fontWeight: tokens.fontWeights.extrabold,
              color: tokens.colors.textPrimary,
              marginBottom: tokens.spacing[2],
              letterSpacing: '-0.02em',
            }}
          >
            🐋 Tracked <GlowText>Whales</GlowText>
          </h1>
          <p
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.sm,
              color: tokens.colors.textSecondary,
            }}
          >
            Smart money wallets with significant Polymarket activity
          </p>
        </div>

        {/* Loading state */}
        {whalesLoading && (
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                marginBottom: tokens.spacing[4],
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              🐋
            </div>
            <p style={{ color: tokens.colors.textSecondary }}>Loading whales...</p>
          </div>
        )}

        {/* Error state */}
        {whalesError && (
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.loss}`,
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                marginBottom: tokens.spacing[4],
              }}
            >
              ⚠️
            </div>
            <p
              style={{
                color: tokens.colors.loss,
                marginBottom: tokens.spacing[4],
              }}
            >
              {whalesError}
            </p>
            <button
              onClick={refetchWhales}
              style={{
                padding: '10px 24px',
                background: tokens.colors.cyan,
                border: 'none',
                borderRadius: '8px',
                fontFamily: tokens.fonts.body,
                fontSize: '14px',
                fontWeight: 600,
                color: tokens.colors.void,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Whale table */}
        {!whalesLoading && !whalesError && (
          <WhaleTable
            whales={whales}
            isMobile={isMobile}
            onWhaleClick={handleWhaleClick}
          />
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="app-container"
      style={{
        minHeight: '100vh',
        backgroundColor: tokens.colors.void,
        color: tokens.colors.textPrimary,
        fontFamily: tokens.fonts.body,
      }}
    >
      {/* Background gradient effects */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(ellipse at 20% 20%, ${tokens.colors.cyan}08 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, ${tokens.colors.magenta}05 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Subtle scanlines for CRT effect */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        isMobile={isMobile}
      />

      {/* Main content area */}
      <main
        style={{
          position: 'relative',
          zIndex: 2,
          padding: isMobile ? tokens.spacing[4] : tokens.spacing[8],
          paddingTop: isMobile ? '80px' : '100px', // Account for fixed header
          paddingBottom: isMobile ? '90px' : tokens.spacing[8], // Account for mobile nav
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* View content */}
        {currentView === 'dashboard' && renderDashboardContent()}
        {currentView === 'whales' && renderWhalesContent()}

        {/* Placeholder for other views - will be implemented in future steps */}
        {(currentView === 'alerts' || currentView === 'settings') && (
          <div style={{ textAlign: 'center', paddingTop: tokens.spacing[8] }}>
            <h1
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: isMobile ? tokens.fontSizes['2xl'] : tokens.fontSizes['4xl'],
                fontWeight: tokens.fontWeights.extrabold,
                color: tokens.colors.textPrimary,
                marginBottom: tokens.spacing[4],
                letterSpacing: '-0.02em',
              }}
            >
              {currentView === 'alerts' && 'Live Alerts'}
              {currentView === 'settings' && 'Settings'}
            </h1>

            <p
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: tokens.fontSizes.base,
                color: tokens.colors.textSecondary,
                maxWidth: '500px',
                margin: '0 auto',
                marginBottom: tokens.spacing[8],
              }}
            >
              {currentView === 'alerts' &&
                'Real-time alerts for whale deposits and trades.'}
              {currentView === 'settings' &&
                'Configure your notification preferences.'}
            </p>

            {/* Coming soon badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
                padding: `${tokens.spacing[3]} ${tokens.spacing[5]}`,
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: tokens.radius.lg,
              }}
            >
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: tokens.fontSizes.xs,
                  color: tokens.colors.textMuted,
                }}
              >
                Coming in Step {currentView === 'alerts' ? '7' : '10'}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNav currentView={currentView} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
