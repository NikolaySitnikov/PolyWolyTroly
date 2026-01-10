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
import { useUnreadAlertCount } from './hooks/useUnreadAlertCount';
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
import { GlowText } from './components/GlowText';
import { Settings } from './components/Settings';
import { ToastContainer } from './components/ToastContainer';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { PullToRefresh } from './components/PullToRefresh';
import { WhaleTableSkeleton } from './components/WhaleTableSkeleton';
import { AlertFeedSkeleton } from './components/AlertFeedSkeleton';
import { LiveTicker } from './components/LiveTicker';
import { WhaleOfTheDay } from './components/WhaleOfTheDay';
import { useSettings } from './contexts/SettingsContext';
import { useToast } from './contexts/ToastContext';
import type { ViewId } from './types/navigation';
import type { Alert } from './types/alert';
import type { WhaleSortField, SortDirection } from './types/whale';
import { fetchWhaleAtIndex, type WhaleSortField as ApiSortField, type DepositSortField } from './services/api';
import type { AlertSortField } from './components/AlertFeed';

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
 * Trading fields (pnl, winRate, etc.) fallback to total_deposited
 * since backend doesn't support sorting by trading metrics
 */
function mapSortFieldToApi(field: WhaleSortField): ApiSortField {
  const mapping: Record<WhaleSortField, ApiSortField> = {
    totalDeposited: 'total_deposited',
    depositCount: 'deposit_count',
    firstSeenAt: 'first_seen_at',
    // Trading fields - backend doesn't support these, fallback to total_deposited
    pnl: 'total_deposited',
    winRate: 'total_deposited',
    portfolioValue: 'total_deposited',
    lastActivityAt: 'first_seen_at',
  };
  return mapping[field];
}

/**
 * Map alert sort field to API deposit sort field
 */
function mapAlertSortFieldToApi(field: AlertSortField): DepositSortField {
  const mapping: Record<AlertSortField, DepositSortField> = {
    amount: 'amount',
    timestamp: 'created_at',
  };
  return mapping[field];
}

function App() {
  const isMobile = useMobile();
  const { settings } = useSettings();
  const { addToast } = useToast();
  const initialHash = parseHash();
  const [currentView, setCurrentView] = useState<ViewId>(initialHash.view);
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(
    initialHash.walletAddress
  );
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Track unread alert count for navigation badges
  // Uses hook that prevents incrementing when already on alerts tab
  // or when deposit amount is below user's configured threshold
  const {
    count: unreadAlertCount,
    increment: incrementUnreadAlerts,
    clear: clearUnreadAlerts,
  } = useUnreadAlertCount(currentView, settings.minAlertThreshold);

  // Whale table sort state (managed here for server-side sorting)
  const [whaleSortBy, setWhaleSortBy] = useState<WhaleSortField>('totalDeposited');
  const [whaleSortDir, setWhaleSortDir] = useState<SortDirection>('desc');

  // Alert feed sort state (managed here for server-side sorting)
  const [alertSortBy, setAlertSortBy] = useState<AlertSortField>('timestamp');
  const [alertSortDir, setAlertSortDir] = useState<SortDirection>('desc');

  // Live ticker visibility state
  const [showLiveTicker, setShowLiveTicker] = useState(true);

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
  } = useAlerts(
    ALERTS_PER_PAGE,
    settings.minAlertThreshold,
    mapAlertSortFieldToApi(alertSortBy),
    alertSortDir
  );

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

  // Deduplicate deposits by txHash (backend may send duplicates due to RPC polling)
  const processedTxHashesRef = useRef(new Set<string>());

  // Unified refetch function - retries all data sources at once
  const refetchAll = useCallback(() => {
    refetch();
    refetchWhales();
    refetchAlerts();
    refetchTrending();
    // Also refetch wallet if currently viewing a wallet profile
    if (selectedWalletAddress) {
      refetchWallet();
    }
  }, [refetch, refetchWhales, refetchAlerts, refetchTrending, selectedWalletAddress, refetchWallet]);

  // Pull-to-refresh handler for mobile - wraps refetchAll with async/delay
  const handlePullToRefresh = useCallback(async () => {
    refetchAll();
    // Small delay to show the loading animation
    await new Promise((resolve) => setTimeout(resolve, 800));
  }, [refetchAll]);

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

  // Global keyboard shortcut: "?" opens keyboard shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // "?" key (Shift + /)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Stable callback for deposit handling - uses refs to avoid stale closures
  const handleDeposit = useCallback(
    (deposit: DepositEvent) => {
      // Deduplicate: skip if we've already processed this transaction
      if (processedTxHashesRef.current.has(deposit.txHash)) {
        return;
      }
      processedTxHashesRef.current.add(deposit.txHash);

      // Limit Set size to prevent memory leak (keep last 100 txHashes)
      if (processedTxHashesRef.current.size > 100) {
        const firstKey = processedTxHashesRef.current.values().next().value;
        if (firstKey) processedTxHashesRef.current.delete(firstKey);
      }

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

      // Show toast notification for whale deposit
      const formattedAmount = deposit.amount >= 1000000
        ? `$${(deposit.amount / 1000000).toFixed(1)}M`
        : deposit.amount >= 1000
        ? `$${(deposit.amount / 1000).toFixed(0)}K`
        : `$${deposit.amount.toLocaleString()}`;
      const shortAddress = `${deposit.walletAddress.slice(0, 6)}...${deposit.walletAddress.slice(-4)}`;
      const isNew = deposit.isNewWallet;

      addToast({
        variant: isNew ? 'success' : 'info',
        title: isNew ? 'New Whale Spotted!' : 'Whale Activity',
        message: `${formattedAmount} deposit from ${shortAddress}`,
      });

      // Increment unread alert count (for navigation badges)
      // Hook checks: current view (won't increment on alerts tab)
      // and amount threshold (won't increment if below user's setting)
      incrementUnreadAlerts(deposit.amount);

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
    [addAlert, addWhale, updateWhale, addToast, incrementUnreadAlerts]
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
    // Clear unread count when visiting alerts page
    if (view === 'alerts') {
      clearUnreadAlerts();
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

  // Track the current whale's position in the full sorted list (1-indexed)
  // This is separate from the local array index because we can navigate beyond loaded whales
  const [currentWhalePosition, setCurrentWhalePosition] = useState<number | null>(null);

  // Find current whale index in loaded array (for initial navigation from WhaleTable)
  const localWhaleIndex = selectedWalletAddress
    ? whales.findIndex((w) => w.address.toLowerCase() === selectedWalletAddress.toLowerCase())
    : -1;

  // Update position when whale is found in local array (clicked from table)
  // Calculate: (current page - 1) * items per page + local index + 1
  useEffect(() => {
    if (localWhaleIndex >= 0) {
      const globalPosition = (whalesPage - 1) * WHALES_PER_PAGE + localWhaleIndex + 1;
      setCurrentWhalePosition(globalPosition);
    }
  }, [localWhaleIndex, whalesPage]);

  // Fallback: When page loads from URL hash with a wallet address but whale is not in local array,
  // set position to 1 so navigation is available. User can still navigate with arrows.
  // This handles the case where user refreshes the page while viewing a whale profile.
  useEffect(() => {
    const totalWhaleCount = stats?.whaleCount ?? totalWhales;
    if (
      selectedWalletAddress &&
      currentWhalePosition === null &&
      localWhaleIndex === -1 &&
      totalWhaleCount > 0
    ) {
      // Set a fallback position of 1 - navigation will still work
      // When user navigates, handleWhalePageChange will fetch the correct whale
      setCurrentWhalePosition(1);
    }
  }, [selectedWalletAddress, currentWhalePosition, localWhaleIndex, stats?.whaleCount, totalWhales]);

  // Handle whale navigation (1-indexed position in full sorted list)
  // Fetches whale at position if not in current loaded whales array
  const handleWhalePageChange = useCallback(async (targetPosition: number) => {
    const totalWhaleCount = stats?.whaleCount ?? totalWhales;

    // Validate bounds
    if (targetPosition < 1 || targetPosition > totalWhaleCount) {
      return;
    }

    // Convert 1-indexed position to 0-indexed
    const index = targetPosition - 1;

    // Check if whale might be in currently loaded array
    // Calculate what page this index would be on
    const targetPage = Math.floor(index / WHALES_PER_PAGE) + 1;

    if (targetPage === whalesPage && index % WHALES_PER_PAGE < whales.length) {
      // Whale is in current page's loaded data
      const localIndex = index % WHALES_PER_PAGE;
      setSelectedWalletAddress(whales[localIndex].address);
      setCurrentWhalePosition(targetPosition);
      return;
    }

    // Whale is on a different page - fetch it directly by index
    try {
      const whale = await fetchWhaleAtIndex(
        index,
        mapSortFieldToApi(whaleSortBy),
        whaleSortDir
      );
      if (whale) {
        setSelectedWalletAddress(whale.address);
        setCurrentWhalePosition(targetPosition);
      }
    } catch (err) {
      console.error('Failed to fetch whale at index:', err);
      addToast({
        variant: 'error',
        title: 'Navigation Failed',
        message: 'Could not load whale data',
      });
    }
  }, [whales, whalesPage, stats?.whaleCount, totalWhales, whaleSortBy, whaleSortDir, addToast]);

  const handleWhaleSortChange = (field: WhaleSortField, direction: SortDirection) => {
    setWhaleSortBy(field);
    setWhaleSortDir(direction);
  };

  const handleAlertSortChange = (field: AlertSortField, direction: SortDirection) => {
    setAlertSortBy(field);
    setAlertSortDir(direction);
  };

  // Swipe handlers for mobile whale cards (feature placeholder - shows toast feedback)
  const handleFollowWhale = (address: string) => {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    addToast({
      variant: 'success',
      title: 'Following Whale',
      message: `You are now following ${shortAddress}`,
    });
    // TODO: Implement actual follow logic with state persistence
  };

  const handleHideWhale = (address: string) => {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    addToast({
      variant: 'info',
      title: 'Whale Hidden',
      message: `${shortAddress} hidden from your feed`,
    });
    // TODO: Implement actual hide logic with state persistence
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
            Live <GlowText>Alerts</GlowText>
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

        {/* Loading state - skeleton shaped like actual content */}
        {alertsLoading && <AlertFeedSkeleton isMobile={isMobile} count={5} />}

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
            onNavigateToSettings={() => handleNavigate('settings')}
            currentPage={alertsPage}
            totalPages={alertsTotalPages}
            totalItems={totalAlerts}
            itemsPerPage={ALERTS_PER_PAGE}
            onPageChange={setAlertsPage}
            sortBy={alertSortBy}
            sortDir={alertSortDir}
            onSortChange={handleAlertSortChange}
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
            Tracked <GlowText>Whales</GlowText>
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

        {/* Loading state - skeleton shaped like actual content */}
        {whalesLoading && <WhaleTableSkeleton isMobile={isMobile} count={5} />}

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
            onFollowWhale={isMobile ? handleFollowWhale : undefined}
            onHideWhale={isMobile ? handleHideWhale : undefined}
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
      const totalWhaleCount = stats?.whaleCount ?? totalWhales;
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
          currentWhalePosition={currentWhalePosition ?? undefined}
          totalWhalesCount={totalWhaleCount > 0 ? totalWhaleCount : undefined}
          onWhaleNavigate={handleWhalePageChange}
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
        alertCount={unreadAlertCount}
      />

      {/* Live Ticker - horizontal scrolling whale activity */}
      <LiveTicker
        alerts={alerts.slice(0, 20)} // Show last 20 alerts
        hidden={!showLiveTicker || alertsLoading || alerts.length === 0}
        dismissable
        onDismiss={() => setShowLiveTicker(false)}
        onItemClick={(alert) => handleWhaleClick(alert.walletAddress)}
        isMobile={isMobile}
        speed="normal"
      />

      {/* Main content area */}
      {(() => {
        // Determine if ticker is visible to adjust padding
        const tickerVisible = showLiveTicker && !alertsLoading && alerts.length > 0;
        const paddingTop = tickerVisible
          ? (isMobile ? LAYOUT.content.paddingTop.mobile : LAYOUT.content.paddingTop.desktop)
          : (isMobile ? LAYOUT.content.paddingTopNoTicker.mobile : LAYOUT.content.paddingTopNoTicker.desktop);

        const mainContent = (
          <main
            style={{
              position: 'relative',
              zIndex: 2,
              padding: isMobile ? tokens.spacing[4] : tokens.spacing[8],
              paddingTop,
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
        );

        // Always wrap with PullToRefresh but disable on desktop
        // This maintains consistent React tree structure so state persists on resize
        return (
          <PullToRefresh onRefresh={handlePullToRefresh} disabled={!isMobile}>
            {mainContent}
          </PullToRefresh>
        );
      })()}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNav
          currentView={currentView}
          onNavigate={handleNavigate}
          alertCount={unreadAlertCount}
        />
      )}

      {/* Whale of the Day - fixed floating badge */}
      <WhaleOfTheDay
        isMobile={isMobile}
        onViewProfile={handleWhaleClick}
      />

      {/* Toast Notifications */}
      <ToastContainer isMobile={isMobile} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
}

export default App;
