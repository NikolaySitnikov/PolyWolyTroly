/**
 * InlineLoading Component Tests
 *
 * Tests for the inline loading indicator component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InlineLoading } from './InlineLoading';

describe('InlineLoading Component', () => {
  it('should render with icon and message', () => {
    render(<InlineLoading icon="🐋" message="Loading whales..." />);

    expect(screen.getByText('🐋')).toBeInTheDocument();
    expect(screen.getByText('Loading whales...')).toBeInTheDocument();
  });

  it('should have testid for testing', () => {
    render(<InlineLoading icon="⚡" message="Loading..." />);

    expect(screen.getByTestId('inline-loading')).toBeInTheDocument();
  });

  it('should apply pulse animation to icon', () => {
    render(<InlineLoading icon="📊" message="Loading data..." />);

    const icon = screen.getByText('📊');
    expect(icon).toHaveStyle({ animation: 'pulse 2s ease-in-out infinite' });
  });

  it('should render in card container by default', () => {
    render(<InlineLoading icon="🔍" message="Searching..." />);

    const container = screen.getByTestId('inline-loading');
    expect(container).toBeInTheDocument();
  });

  it('should render without card container when naked prop is true', () => {
    render(<InlineLoading icon="🔍" message="Searching..." naked />);

    const container = screen.getByTestId('inline-loading');
    expect(container).toBeInTheDocument();
  });
});
