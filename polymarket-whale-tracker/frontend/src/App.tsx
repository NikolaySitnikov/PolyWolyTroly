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
import { LAYOUT } from './constants/layout';
import { useMobile } from './hooks/useMobile';
import { useStats } from './hooks/useStats';
import { useWhales } from './hooks/useWhales';
import { useAlerts } from './hooks/useAlerts';
import { useWallet } from './hooks/useWallet';
import { useTrendingMarkets } from './hooks/useTrendingMarkets';
import { useWebSocket, type DepositEvent } from './hooks/useWebSocket';
import { useApiConnectivity } from './hooks/useApiConnectivity';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import { DashboardLoading } from './components/DashboardLoading';
import { DashboardError } from './components/DashboardError';
import { WhaleTable } from './components/WhaleTable';
import { AlertFeed } from './components/AlertFeed';
import { TrendingMarkets } from './components/TrendingMarkets';
import { WalletProfile } from './components/WalletProfile';
import { WalletProfileLoading } from './components/WalletProfileLoading';
import { WalletProfileError } from './components/WalletProfileError';
import { InlineLoading } from './components/InlineLoading';
import { GlowText } from './components/GlowText';
import { Settings } from './components/Settings';
import { useSettings } from './contexts/SettingsContext';
import type { ViewId } from './types/navigation';
import type { Alert } from './types/alert';
import type { WhaleSortField, SortDirection } from './types/whale';
import type { WhaleSortField as ApiSortField } from './services/api';

/**
 * Parse URL hash to determine view and wallet address
 * Supports: #dashboard, #whales, #alerts, #settings, #wallet/0x...
 */
interface ParsedHash {
  view: ViewId;
  walletAddress: string | null;
}

function parseHash(): ParsedHash {
  const hash = window.location.hash.slice(1); // Remove #
  const validViews: ViewId[] = ['dashboard', 'whales', 'alerts', 'settings'];

  // Check for wallet profile: #wallet/0x...
  if (hash.startsWith('wallet/')) {
    const address = hash.slice(7); // Remove 'wallet/'
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { view: 'wallet', walletAddress: address };
    }
  }

  // Standard views
  if (validViews.includes(hash as ViewId)) {
    return { view: hash as ViewId, walletAddress: null };
  }

  return { view: 'dashboard', walletAddress: null };
}

// WebSocket URL - derived from API URL, or use current host for network access
function getWebSocketUrl(): string {
  // If explicit API URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('http', 'ws');
  }
  // Otherwise, derive from current location (works for localhost AND network IP)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  return `${protocol}//${host}:3002`;
}
const WS_URL = getWebSocketUrl();

/**
 * Map frontend camelCase sort field to backend snake_case
 */
function mapSortFieldToApi(field: WhaleSortField): ApiSortField {
  const mapping: Record<WhaleSortField, ApiSortField> = {
    totalDeposited: 'total_deposited',
    depositCount: 'deposit_count',
    firstSeenAt: 'first_seen_at',
  };
  return mapping[field];
}

function App() {
  const isMobile = useMobile();
  const { settings } = useSettings();
  const initialHash = parseHash();
  const [currentView, setCurrentView] = useState<ViewId>(initialHash.view);
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(
    initialHash.walletAddress
  );

  // Whale table sort state (managed here for server-side sorting)
  const [whaleSortBy, setWhaleSortBy] = useState<WhaleSortField>('totalDeposited');
  const [whaleSortDir, setWhaleSortDir] = useState<SortDirection>('desc');

  const { data: stats, loading, error, refetch, updateStats } = useStats();
  const WHALES_PER_PAGE = 20;
  const DEPOSITS_PER_PAGE = 10;
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
  } = useWhales(WHALES_PER_PAGE, mapSortFieldToApi(whaleSortBy), whaleSortDir);

  const ALERTS_PER_PAGE = 20;
  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
    total: totalAlerts,
    page: alertsPage,
    totalPages: alertsTotalPages,
    setPage: setAlertsPage,
    refetch: refetchAlerts,
    addAlert,
  } = useAlerts(ALERTS_PER_PAGE, settings.minAlertThreshold);

  // Trending markets data
  const {
    markets: trendingMarkets,
    loading: trendingLoading,
    error: trendingError,
    refetch: refetchTrending,
  } = useTrendingMarkets(8);

  // Wallet profile data
  const {
    wallet: walletData,
    deposits: walletDeposits,
    loading: walletLoading,
    error: walletError,
    depositsLoading,
    depositsTotal,
    depositsPage,
    setDepositsPage,
    refetch: refetchWallet,
  } = useWallet(selectedWalletAddress, DEPOSITS_PER_PAGE);

  // Keep refs updated for WebSocket callbacks to avoid stale closures
  const whalesRef = useRef(whales);
  whalesRef.current = whales;

  // Unified refetch function - retries all data sources at once
  const refetchAll = useCallback(() => {
    refetch();
    refetchWhales();
    refetchAlerts();
    refetchTrending();
  }, [refetch, refetchWhales, refetchAlerts, refetchTrending]);

  // Auto-refetch when API recovers from disconnection
  const { onReconnect } = useApiConnectivity();
  useEffect(() => {
    return onReconnect(refetchAll);
  }, [onReconnect, refetchAll]);

  // Sync URL hash with current view and wallet address
  useEffect(() => {
    if (currentView === 'wallet' && selectedWalletAddress) {
      window.location.hash = `wallet/${selectedWalletAddress}`;
    } else {
      window.location.hash = currentView;
    }
  }, [currentView, selectedWalletAddress]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseHash();
      setCurrentView(parsed.view);
      setSelectedWalletAddress(parsed.walletAddress);
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
    if (view !== 'wallet') {
      setSelectedWalletAddress(null);
    }
  };

  const handleWhaleClick = (address: string) => {
    setSelectedWalletAddress(address);
    setCurrentView('wallet');
  };

  const handleAlertClick = (alert: Alert) => {
    // Navigate to wallet profile for the alert's wallet
    setSelectedWalletAddress(alert.walletAddress);
    setCurrentView('wallet');
  };

  const handleBackFromWallet = () => {
    setSelectedWalletAddress(null);
    setCurrentView('whales');
  };

  const handleWhaleSortChange = (field: WhaleSortField, direction: SortDirection) => {
    setWhaleSortBy(field);
    setWhaleSortDir(direction);
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
          <InlineLoading icon="⚡" message="Loading alerts..." />
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
              onClick={refetchAll}
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
          <AlertFeed
            alerts={alerts}
            isMobile={isMobile}
            onAlertClick={handleAlertClick}
            activeMinThreshold={settings.minAlertThreshold}
            currentPage={alertsPage}
            totalPages={alertsTotalPages}
            totalItems={totalAlerts}
            itemsPerPage={ALERTS_PER_PAGE}
            onPageChange={setAlertsPage}
          />
        )}
      </div>
    );
  };

  const renderDashboardContent = () => {
    if (loading) {
      return <DashboardLoading isMobile={isMobile} />;
    }

    if (error) {
      return <DashboardError error={error} onRetry={refetchAll} isMobile={isMobile} />;
    }

    if (stats) {
      return (
        <>
          <Dashboard stats={stats} isMobile={isMobile} />
          {/* Trending Markets Section */}
          <div style={{ marginTop: tokens.spacing[6] }}>
            <TrendingMarkets
              markets={trendingMarkets}
              loading={trendingLoading}
              error={trendingError}
              isMobile={isMobile}
              onRetry={refetchTrending}
            />
          </div>
        </>
      );
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
          <InlineLoading icon="🐋" message="Loading whales..." />
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
              onClick={refetchAll}
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
            totalItems={stats?.whaleCount ?? totalWhales}
            onPageChange={setWhalesPage}
            sortBy={whaleSortBy}
            sortDir={whaleSortDir}
            onSortChange={handleWhaleSortChange}
          />
        )}
      </div>
    );
  };

  const renderWalletContent = () => {
    if (walletLoading) {
      return <WalletProfileLoading isMobile={isMobile} />;
    }

    if (walletError) {
      return (
        <WalletProfileError
          error={walletError}
          onBack={handleBackFromWallet}
          onRetry={refetchWallet}
          isMobile={isMobile}
        />
      );
    }

    if (walletData) {
      return (
        <WalletProfile
          wallet={walletData}
          deposits={walletDeposits}
          depositsLoading={depositsLoading}
          depositsTotal={depositsTotal}
          depositsPage={depositsPage}
          depositsPerPage={DEPOSITS_PER_PAGE}
          onDepositsPageChange={setDepositsPage}
          onBack={handleBackFromWallet}
          isMobile={isMobile}
        />
      );
    }

    return null;
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
          paddingTop: isMobile ? LAYOUT.content.paddingTop.mobile : LAYOUT.content.paddingTop.desktop,
          paddingBottom: isMobile ? LAYOUT.content.paddingBottom.mobile : LAYOUT.content.paddingBottom.desktop,
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* View content */}
        {currentView === 'dashboard' && renderDashboardContent()}
        {currentView === 'whales' && renderWhalesContent()}
        {currentView === 'alerts' && renderAlertsContent()}
        {currentView === 'wallet' && renderWalletContent()}

        {/* Settings page */}
        {currentView === 'settings' && <Settings isMobile={isMobile} />}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNav currentView={currentView} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
