/**
 * PolyWolyTroly - Whale Intelligence Platform
 *
 * Main App component - the shell for the entire application.
 * Implements the cyberpunk terminal aesthetic from the design system.
 *
 * Step 5: Connected to real backend API with loading/error states.
 * Step 5b: Live updates via WebSocket - data updates instantly!
 * Step 6: Whale List/Table with search & sort.
 * Step 7: Live Alert Feed with real-time updates.
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import './styles/globals.css';
import { tokens } from './styles/tokens';
import { useMobile } from './hooks/useMobile';
import { useStats } from './hooks/useStats';
import { useWhales } from './hooks/useWhales';
import { useAlerts } from './hooks/useAlerts';
import { useWebSocket, type DepositEvent } from './hooks/useWebSocket';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import { DashboardLoading } from './components/DashboardLoading';
import { DashboardError } from './components/DashboardError';
import { WhaleTable } from './components/WhaleTable';
import { AlertFeed } from './components/AlertFeed';
import { GlowText } from './components/GlowText';
import type { ViewId } from './types/navigation';
import type { Alert } from './types/alert';

/**
 * Get initial view from URL hash or default to dashboard
 */
function getInitialView(): ViewId {
  const hash = window.location.hash.slice(1); // Remove #
  const validViews: ViewId[] = ['dashboard', 'whales', 'alerts', 'settings'];
  return validViews.includes(hash as ViewId) ? (hash as ViewId) : 'dashboard';
}

// WebSocket URL - same port as API
const WS_URL = 'ws://localhost:3002';

function App() {
  const isMobile = useMobile();
  const [currentView, setCurrentView] = useState<ViewId>(getInitialView);
  const { data: stats, loading, error, refetch, updateStats } = useStats();
  const WHALES_PER_PAGE = 20;
  const {
    whales,
    loading: whalesLoading,
    error: whalesError,
    refetch: refetchWhales,
    updateWhale,
    addWhale,
    total: totalWhales,
    page: whalesPage,
    setPage: setWhalesPage,
  } = useWhales(WHALES_PER_PAGE);

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
    addAlert,
  } = useAlerts();

  // Keep refs updated for WebSocket callbacks to avoid stale closures
  const whalesRef = useRef(whales);
  whalesRef.current = whales;

  // Sync URL hash with current view
  useEffect(() => {
    window.location.hash = currentView;
  }, [currentView]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const view = getInitialView();
      setCurrentView(view);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Stable callback for deposit handling - uses refs to avoid stale closures
  const handleDeposit = useCallback(
    (deposit: DepositEvent) => {
      console.log('🔥 New deposit received via WebSocket:', deposit);

      // Add to live alert feed instantly
      const newAlert: Alert = {
        id: deposit.txHash,
        type: 'deposit',
        walletAddress: deposit.walletAddress,
        amount: deposit.amount,
        timestamp: new Date().toISOString(),
        txHash: deposit.txHash,
      };
      addAlert(newAlert);

      // Seamlessly update or add whale data without triggering loading state
      if (deposit.isNewWallet) {
        // New whale - add to list
        addWhale({
          address: deposit.walletAddress,
          firstSeenAt: new Date().toISOString(),
          totalDeposited: deposit.amount,
          depositCount: 1,
        });
      } else {
        // Existing whale - update their deposit count and total
        // Use ref to get current whales to avoid stale closure
        const existingWhale = whalesRef.current.find(
          (w) => w.address.toLowerCase() === deposit.walletAddress.toLowerCase()
        );
        if (existingWhale) {
          updateWhale(deposit.walletAddress, {
            totalDeposited: existingWhale.totalDeposited + deposit.amount,
            depositCount: existingWhale.depositCount + 1,
          });
        }
      }
    },
    [addAlert, addWhale, updateWhale]
  );

  // Connect to WebSocket for instant live updates
  // Uses seamless updates - no loading states, no page refresh
  useWebSocket(WS_URL, {
    onStats: updateStats,
    onDeposit: handleDeposit,
  });

  const handleNavigate = (view: ViewId) => {
    setCurrentView(view);
  };

  const handleWhaleClick = (address: string) => {
    console.log('Whale clicked:', address);
    // Future: navigate to wallet profile view
  };

  const handleAlertClick = (alert: Alert) => {
    console.log('Alert clicked:', alert);
    // Future: navigate to wallet profile or show alert details
  };

  const renderAlertsContent = () => {
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
            ⚡ Live <GlowText>Alerts</GlowText>
          </h1>
          <p
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.sm,
              color: tokens.colors.textSecondary,
            }}
          >
            Real-time whale deposits as they happen
          </p>
        </div>

        {/* Loading state */}
        {alertsLoading && (
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
              ⚡
            </div>
            <p style={{ color: tokens.colors.textSecondary }}>Loading alerts...</p>
          </div>
        )}

        {/* Error state */}
        {alertsError && (
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
              {alertsError}
            </p>
            <button
              onClick={refetchAlerts}
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

        {/* Alert feed */}
        {!alertsLoading && !alertsError && (
          <AlertFeed alerts={alerts} isMobile={isMobile} onAlertClick={handleAlertClick} />
        )}
      </div>
    );
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
            currentPage={whalesPage}
            itemsPerPage={WHALES_PER_PAGE}
            totalItems={totalWhales}
            onPageChange={setWhalesPage}
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
        {currentView === 'alerts' && renderAlertsContent()}

        {/* Placeholder for settings - will be implemented in Step 10 */}
        {currentView === 'settings' && (
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
              Settings
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
              Configure your notification preferences.
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
                Coming in Step 10
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
