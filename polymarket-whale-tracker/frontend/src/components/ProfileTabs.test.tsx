/**
 * ProfileTabs Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileTabs, PROFILE_TABS, ProfileTabId } from './ProfileTabs';

describe('ProfileTabs', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all tabs', () => {
    render(<ProfileTabs activeTab="positions" onChange={mockOnChange} />);

    PROFILE_TABS.forEach((tab) => {
      expect(screen.getByTestId(`profile-tab-${tab.id}`)).toBeInTheDocument();
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });

  it('marks active tab as selected', () => {
    render(<ProfileTabs activeTab="deposits" onChange={mockOnChange} />);

    const depositsTab = screen.getByTestId('profile-tab-deposits');
    expect(depositsTab).toHaveAttribute('aria-selected', 'true');

    const positionsTab = screen.getByTestId('profile-tab-positions');
    expect(positionsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when tab is clicked', () => {
    render(<ProfileTabs activeTab="positions" onChange={mockOnChange} />);

    fireEvent.click(screen.getByTestId('profile-tab-activity'));
    expect(mockOnChange).toHaveBeenCalledWith('activity');

    fireEvent.click(screen.getByTestId('profile-tab-deposits'));
    expect(mockOnChange).toHaveBeenCalledWith('deposits');
  });

  it('displays counts when provided', () => {
    const counts: Partial<Record<ProfileTabId, number>> = {
      positions: 12,
      deposits: 5,
    };

    render(
      <ProfileTabs activeTab="positions" onChange={mockOnChange} counts={counts} />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays 99+ for counts over 99', () => {
    const counts: Partial<Record<ProfileTabId, number>> = {
      positions: 150,
    };

    render(
      <ProfileTabs activeTab="positions" onChange={mockOnChange} counts={counts} />
    );

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('does not display count badge for zero counts', () => {
    const counts: Partial<Record<ProfileTabId, number>> = {
      positions: 0,
      activity: 5,
    };

    render(
      <ProfileTabs activeTab="positions" onChange={mockOnChange} counts={counts} />
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ProfileTabs activeTab="positions" onChange={mockOnChange} />);

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Profile sections');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });

  it('renders correctly on mobile', () => {
    render(<ProfileTabs activeTab="positions" onChange={mockOnChange} isMobile />);

    const tablist = screen.getByTestId('profile-tabs');
    expect(tablist).toBeInTheDocument();
  });
});
