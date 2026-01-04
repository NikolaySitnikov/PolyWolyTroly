/**
 * LiveIndicator Component Tests
 *
 * TDD: RED phase - Tests for the pulsing live status indicator.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveIndicator } from './LiveIndicator';

describe('LiveIndicator Component', () => {
  it('should render without crashing', () => {
    render(<LiveIndicator />);
    expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
  });

  it('should display "LIVE" text', () => {
    render(<LiveIndicator />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('should have a pulsing dot element', () => {
    render(<LiveIndicator />);
    expect(screen.getByTestId('live-dot')).toBeInTheDocument();
  });

  it('should use profit green color for the dot', () => {
    render(<LiveIndicator />);
    const dot = screen.getByTestId('live-dot');
    // Check that it has the profit green background
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
    // Check that font-family style attribute contains JetBrains Mono
    expect(indicator.style.fontFamily).toContain('JetBrains Mono');
  });
});
