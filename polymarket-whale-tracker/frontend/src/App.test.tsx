/**
 * App Component Tests
 *
 * TDD: RED phase - Tests for the base App shell
 * Verifies the app renders with correct branding and styling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { ApiConnectivityProvider } from './hooks/useApiConnectivity';
import * as api from './services/api';

// Mock the WebSocket hook to prevent real connections
vi.mock('./hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({ connected: false })),
}));

// Mock the API module with all required exports
vi.mock('./services/api', () => ({
  api: { baseUrl: 'http://localhost:3002' },
  getWebSocketUrl: vi.fn(() => 'ws://localhost:3002'),
  fetchStats: vi.fn(),
  fetchHealth: vi.fn(),
  fetchDeposits: vi.fn(),
  fetchWhales: vi.fn(),
  fetchTrendingMarkets: vi.fn(),
  fetchWhaleOfTheDay: vi.fn(),
  fetchTradingData: vi.fn(),
  fetchWallet: vi.fn(),
  fetchWhaleAtIndex: vi.fn(),
  fetchPriceHistory: vi.fn(),
}));

// Wrapper to provide required contexts
function renderApp() {
  return render(
    <ApiConnectivityProvider>
      <SettingsProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SettingsProvider>
    </ApiConnectivityProvider>
  );
}

const mockStats: api.StatsResponse = {
  whaleCount: 42,
  whaleCountTrend: 5,
  totalVolume: 15750000,
  totalVolumeTrend: 1250000,
  alertsToday: 12,
  newWhalesToday: 5,
};

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to successful fetch
    vi.mocked(api.fetchStats).mockResolvedValue(mockStats);
    // Mock health check for ApiConnectivityProvider
    vi.mocked(api.fetchHealth).mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      blockchain: { listening: true, healthy: true, lastHeartbeatTime: null, lastEventTime: null, startTime: null, consecutiveErrors: 0 },
    });
    // Mock deposits for WhaleOfTheDay hook and alerts
    vi.mocked(api.fetchDeposits).mockResolvedValue({
      deposits: [],
      total: 0,
      page: 1,
      limit: 200,
    });
    // Mock whales
    vi.mocked(api.fetchWhales).mockResolvedValue({
      wallets: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    // Mock trending markets
    vi.mocked(api.fetchTrendingMarkets).mockResolvedValue({
      markets: [],
      updatedAt: new Date().toISOString(),
    });
    // Mock whale of the day
    vi.mocked(api.fetchWhaleOfTheDay).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      renderApp();
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should have the app container with correct test id', async () => {
      renderApp();
      const appContainer = screen.getByTestId('app-container');
      expect(appContainer).toBeInTheDocument();
    });
  });

  describe('Branding', () => {
    it('should display the PolyWolyTroly brand name', async () => {
      renderApp();
      await waitFor(() => {
        expect(screen.getByText(/PolyWolyTroly/i)).toBeInTheDocument();
      });
    });

    it('should display the tagline "Whale Intelligence"', async () => {
      renderApp();
      await waitFor(() => {
        // There may be multiple instances (header and content), use getAllBy
        const elements = screen.getAllByText(/Whale Intelligence/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Styling', () => {
    it('should have void black background color', async () => {
      renderApp();
      await waitFor(() => {
        const appContainer = screen.getByTestId('app-container');
        expect(appContainer).toHaveStyle({ backgroundColor: 'rgb(10, 10, 15)' });
      });
    });

    it('should have primary text color', async () => {
      renderApp();
      await waitFor(() => {
        const appContainer = screen.getByTestId('app-container');
        expect(appContainer).toHaveStyle({ color: 'rgb(240, 240, 245)' });
      });
    });
  });

  describe('Structure', () => {
    it('should have a main content area', async () => {
      renderApp();
      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should show loading state initially', () => {
      // Never resolving promise to keep loading state
      vi.mocked(api.fetchStats).mockImplementation(() => new Promise(() => {}));

      renderApp();

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('should fetch stats on mount', async () => {
      renderApp();

      await waitFor(() => {
        expect(api.fetchStats).toHaveBeenCalledTimes(1);
      });
    });

    it('should display dashboard with data after successful fetch', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Verify the data is displayed
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display error state when fetch fails', async () => {
      // Clear all mocks and set up fresh rejection mock
      vi.mocked(api.fetchStats).mockReset();
      vi.mocked(api.fetchStats).mockImplementation(() =>
        Promise.reject(new Error('Failed to fetch stats: 500'))
      );

      renderApp();

      await waitFor(
        () => {
          expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
        },
        { timeout: 5000, interval: 100 }
      );

      expect(screen.getByText(/Failed to fetch stats/i)).toBeInTheDocument();
    });

    it('should have a retry button in error state', async () => {
      // Clear all mocks and set up fresh rejection mock
      vi.mocked(api.fetchStats).mockReset();
      vi.mocked(api.fetchStats).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      renderApp();

      await waitFor(
        () => {
          expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
        },
        { timeout: 5000, interval: 100 }
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
