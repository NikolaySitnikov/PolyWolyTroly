/**
 * PolyWolyTroly - Whale Intelligence Platform
 *
 * Main App component - the shell for the entire application.
 * Implements the cyberpunk terminal aesthetic from the design system.
 *
 * Step 2: Now includes Header and MobileNav components with navigation.
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { useState } from 'react';
import './styles/globals.css';
import { tokens } from './styles/tokens';
import { useMobile } from './hooks/useMobile';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import type { ViewId } from './types/navigation';

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
        {/* View content - will be expanded in future steps */}
        <div style={{ textAlign: 'center', paddingTop: tokens.spacing[8] }}>
          {/* Current view indicator */}
          <div
            style={{
              marginBottom: tokens.spacing[6],
              padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md,
              display: 'inline-block',
            }}
          >
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.xs,
                color: tokens.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Current View:
            </span>{' '}
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.sm,
                color: tokens.colors.cyan,
                fontWeight: tokens.fontWeights.semibold,
              }}
            >
              {currentView}
            </span>
          </div>

          {/* Placeholder content based on view */}
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
            {currentView === 'dashboard' && 'Whale Intelligence Dashboard'}
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
            {currentView === 'dashboard' &&
              'Track the smart money. See what the whales are buying.'}
            {currentView === 'whales' &&
              'Browse all tracked whale wallets and their activity.'}
            {currentView === 'alerts' &&
              'Real-time alerts for whale deposits and trades.'}
            {currentView === 'settings' &&
              'Configure your notification preferences.'}
          </p>

          {/* Status badge */}
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
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: tokens.colors.profit,
                boxShadow: `0 0 10px ${tokens.colors.profit}`,
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes.xs,
                color: tokens.colors.textSecondary,
              }}
            >
              Step 2 complete. Navigation working.
            </span>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNav currentView={currentView} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
