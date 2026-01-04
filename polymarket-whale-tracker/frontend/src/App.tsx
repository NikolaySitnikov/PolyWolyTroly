/**
 * PolyWolyTroly - Whale Intelligence Platform
 *
 * Main App component - the shell for the entire application.
 * Implements the cyberpunk terminal aesthetic from the design system.
 *
 * Step 4: Added Dashboard with StatCards (mock data).
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { useState } from 'react';
import './styles/globals.css';
import { tokens } from './styles/tokens';
import { useMobile } from './hooks/useMobile';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import type { ViewId } from './types/navigation';

// Mock stats data (will be replaced with API data in Step 5)
const MOCK_STATS = {
  whaleCount: 42,
  totalVolume: 15750000,
  alertsToday: 12,
  newWhalesThisWeek: 5,
};

function App() {
  const isMobile = useMobile();
  const [currentView, setCurrentView] = useState<ViewId>('dashboard');

  const handleNavigate = (view: ViewId) => {
    setCurrentView(view);
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
        {currentView === 'dashboard' && (
          <Dashboard stats={MOCK_STATS} isMobile={isMobile} />
        )}

        {/* Placeholder for other views - will be implemented in future steps */}
        {currentView !== 'dashboard' && (
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
              {currentView === 'whales' && 'Tracked Whales'}
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
              {currentView === 'whales' &&
                'Browse all tracked whale wallets and their activity.'}
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
                Coming in Step {currentView === 'whales' ? '6' : currentView === 'alerts' ? '7' : '10'}
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
