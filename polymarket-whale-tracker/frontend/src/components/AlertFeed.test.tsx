/**
 * AlertFeed Component Tests
 *
 * TDD: RED phase - Writing tests for the live alert feed.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertFeed } from './AlertFeed';
import type { Alert } from '../types/alert';

// Mock the useHealth hook for LiveIndicator component
vi.mock('../hooks/useHealth', () => ({
  useHealth: vi.fn(() => ({
    blockchainHealthy: true,
    lastHeartbeatTime: new Date(),
    lastEventTime: new Date(),
    healthCheckOk: true,
  })),
}));

describe('AlertFeed', () => {
  const mockAlerts: Alert[] = [
    {
      id: '0xabc123',
      type: 'deposit',
      walletAddress: '0x1234567890123456789012345678901234567890',
      amount: 50000,
      timestamp: new Date().toISOString(),
      txHash: '0xabc123',
    },
    {
      id: '0xdef456',
      type: 'deposit',
      walletAddress: '0x0987654321098765432109876543210987654321',
      amount: 125000,
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      txHash: '0xdef456',
    },
    {
      id: '0xghi789',
      type: 'deposit',
      walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: 1500000,
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      txHash: '0xghi789',
    },
  ];

  it('should render the component', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    expect(screen.getByTestId('alert-feed')).toBeInTheDocument();
  });

  it('should display the "Live Feed" header', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    expect(screen.getByText('Live Feed')).toBeInTheDocument();
  });

  it('should show LIVE indicator', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('should display all alerts', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    const alertItems = screen.getAllByTestId('alert-item');
    expect(alertItems).toHaveLength(3);
  });

  it('should format wallet addresses with truncation', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    // Should show truncated address like 0x1234...7890
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
  });

  it('should format amounts in USD', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    expect(screen.getByText('$50.0K')).toBeInTheDocument();
    expect(screen.getByText('$125.0K')).toBeInTheDocument();
    expect(screen.getByText('$1.50M')).toBeInTheDocument();
  });

  it('should show deposit type badge', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    const badges = screen.getAllByText('deposit');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should display relative time for timestamps', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    // Should show relative time like "just now", "5 min ago", "1 hour ago"
    expect(screen.getByText(/just now|seconds? ago/i)).toBeInTheDocument();
    expect(screen.getByText(/5 min(utes)? ago/i)).toBeInTheDocument();
  });

  it('should show deposit icon', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={false} />);
    // Should show the deposit icon for each alert
    const icons = screen.getAllByText('💰');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should handle empty alerts array', () => {
    render(<AlertFeed alerts={[]} isMobile={false} />);
    expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
  });

  it('should render mobile layout when isMobile is true', () => {
    render(<AlertFeed alerts={mockAlerts} isMobile={true} />);
    expect(screen.getByTestId('alert-feed')).toBeInTheDocument();
    // Mobile layout should still show alerts
    const alertItems = screen.getAllByTestId('alert-item');
    expect(alertItems).toHaveLength(3);
  });

  it('should call onAlertClick when an alert is clicked', () => {
    const handleClick = vi.fn();
    render(<AlertFeed alerts={mockAlerts} isMobile={false} onAlertClick={handleClick} />);

    const firstAlert = screen.getAllByTestId('alert-item')[0];
    firstAlert.click();

    expect(handleClick).toHaveBeenCalledWith(mockAlerts[0]);
  });

  describe('Minimum Threshold Filter', () => {
    it('should show all alerts when minThreshold is 0', () => {
      render(<AlertFeed alerts={mockAlerts} isMobile={false} minThreshold={0} />);
      const alertItems = screen.getAllByTestId('alert-item');
      expect(alertItems).toHaveLength(3);
    });

    it('should filter alerts below minThreshold', () => {
      render(<AlertFeed alerts={mockAlerts} isMobile={false} minThreshold={100000} />);
      const alertItems = screen.getAllByTestId('alert-item');
      // Only alerts with amount >= 100000 should be shown (125K and 1.5M)
      expect(alertItems).toHaveLength(2);
    });

    it('should show no alerts when minThreshold is higher than all amounts', () => {
      render(<AlertFeed alerts={mockAlerts} isMobile={false} minThreshold={2000000} />);
      expect(screen.queryAllByTestId('alert-item')).toHaveLength(0);
      expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
    });

    it('should show empty state message when all alerts filtered out', () => {
      render(<AlertFeed alerts={mockAlerts} isMobile={false} minThreshold={10000000} />);
      expect(screen.getByText(/waiting for whale activity/i)).toBeInTheDocument();
    });
  });
});
