/**
 * LiveIndicator Component Tests
 *
 * Tests for the pulsing live status indicator with health tracking.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveIndicator } from './LiveIndicator';

// Mock the useHealth hook
vi.mock('../hooks/useHealth', () => ({
  useHealth: vi.fn(),
}));

import { useHealth } from '../hooks/useHealth';
const mockUseHealth = vi.mocked(useHealth);

describe('LiveIndicator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to healthy state
    mockUseHealth.mockReturnValue({
      blockchainHealthy: true,
      lastHeartbeatTime: new Date(),
      lastEventTime: new Date(),
      healthCheckOk: true,
    });
  });

  describe('healthy state', () => {
    it('should render without crashing', () => {
      render(<LiveIndicator />);
      expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
    });

    it('should display "LIVE" text when healthy', () => {
      render(<LiveIndicator />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('should have a pulsing dot element', () => {
      render(<LiveIndicator />);
      expect(screen.getByTestId('live-dot')).toBeInTheDocument();
    });

    it('should use profit green color for the dot when healthy', () => {
      render(<LiveIndicator />);
      const dot = screen.getByTestId('live-dot');
      expect(dot).toHaveStyle({ background: '#00ff88' });
    });

    it('should have uppercase styling for LIVE text', () => {
      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');
      expect(indicator).toHaveStyle({ textTransform: 'uppercase' });
    });

    it('should use monospace font family', () => {
      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');
      expect(indicator.style.fontFamily).toContain('JetBrains Mono');
    });

    it('should have pulse animation when healthy', () => {
      render(<LiveIndicator />);
      const dot = screen.getByTestId('live-dot');
      expect(dot.style.animation).toContain('pulse');
    });
  });

  describe('degraded state', () => {
    beforeEach(() => {
      mockUseHealth.mockReturnValue({
        blockchainHealthy: false,
        lastHeartbeatTime: new Date(Date.now() - 120000), // 2 minutes ago (stale)
        lastEventTime: null,
        healthCheckOk: true,
      });
    });

    it('should display "DEGRADED" when blockchain is unhealthy', () => {
      render(<LiveIndicator />);
      expect(screen.getByText('DEGRADED')).toBeInTheDocument();
    });

    it('should use warning orange color when degraded', () => {
      render(<LiveIndicator />);
      const dot = screen.getByTestId('live-dot');
      expect(dot).toHaveStyle({ background: '#ffaa00' });
    });

    it('should not have pulse animation when degraded', () => {
      render(<LiveIndicator />);
      const dot = screen.getByTestId('live-dot');
      expect(dot.style.animation).toBe('none');
    });
  });

  describe('offline state', () => {
    beforeEach(() => {
      mockUseHealth.mockReturnValue({
        blockchainHealthy: false,
        lastHeartbeatTime: null,
        lastEventTime: null,
        healthCheckOk: false,
      });
    });

    it('should display "OFFLINE" when health check fails', () => {
      render(<LiveIndicator />);
      expect(screen.getByText('OFFLINE')).toBeInTheDocument();
    });

    it('should use loss red color when offline', () => {
      render(<LiveIndicator />);
      const dot = screen.getByTestId('live-dot');
      expect(dot).toHaveStyle({ background: '#ff3366' });
    });
  });

  describe('tooltip', () => {
    it('should show tooltip on hover', () => {
      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');

      fireEvent.mouseEnter(indicator);
      expect(screen.getByTestId('health-tooltip')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');

      fireEvent.mouseEnter(indicator);
      expect(screen.getByTestId('health-tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(indicator);
      expect(screen.queryByTestId('health-tooltip')).not.toBeInTheDocument();
    });

    it('should show "Connected" status when healthy', () => {
      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');

      fireEvent.mouseEnter(indicator);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show warning message when degraded', () => {
      mockUseHealth.mockReturnValue({
        blockchainHealthy: false,
        lastHeartbeatTime: new Date(Date.now() - 120000),
        lastEventTime: null,
        healthCheckOk: true,
      });

      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');

      fireEvent.mouseEnter(indicator);
      expect(screen.getByText(/RPC connection lost/i)).toBeInTheDocument();
    });

    it('should show connection error message when offline', () => {
      mockUseHealth.mockReturnValue({
        blockchainHealthy: false,
        lastHeartbeatTime: null,
        lastEventTime: null,
        healthCheckOk: false,
      });

      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');

      fireEvent.mouseEnter(indicator);
      expect(screen.getByText(/cannot reach the backend server/i)).toBeInTheDocument();
    });

    it('should show "Blockchain Listener" header in tooltip', () => {
      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');

      fireEvent.mouseEnter(indicator);
      expect(screen.getByText('Blockchain Listener')).toBeInTheDocument();
    });

    it('should show last heartbeat time in tooltip', () => {
      render(<LiveIndicator />);
      const indicator = screen.getByTestId('live-indicator');

      fireEvent.mouseEnter(indicator);
      expect(screen.getByText('Last Heartbeat')).toBeInTheDocument();
    });
  });
});
