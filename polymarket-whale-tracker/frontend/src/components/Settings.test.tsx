/**
 * Settings Component Tests
 *
 * Tests for the Settings page component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';
import { SettingsProvider } from '../contexts/SettingsContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function renderWithProvider(isMobile = false) {
  return render(
    <SettingsProvider>
      <Settings isMobile={isMobile} />
    </SettingsProvider>
  );
}

describe('Settings Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Header', () => {
    it('should render settings title', () => {
      renderWithProvider();

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render settings description', () => {
      renderWithProvider();

      expect(screen.getByText(/Configure your notification preferences/)).toBeInTheDocument();
    });
  });

  describe('Alert Threshold Section', () => {
    it('should render threshold section', () => {
      renderWithProvider();

      expect(screen.getByText('Minimum Alert Threshold')).toBeInTheDocument();
    });

    it('should display current threshold value', () => {
      renderWithProvider();

      // Default is $10,000 - there are two instances: display value + preset button
      const slider = screen.getByRole('slider', { name: /minimum alert threshold/i });
      expect(slider).toHaveValue('10000');
    });

    it('should render threshold slider', () => {
      renderWithProvider();

      const slider = screen.getByRole('slider', { name: /minimum alert threshold/i });
      expect(slider).toBeInTheDocument();
    });

    it('should update threshold when slider changes', () => {
      renderWithProvider();

      const slider = screen.getByRole('slider', { name: /minimum alert threshold/i });
      fireEvent.change(slider, { target: { value: '75000' } });

      // 75K is not a preset, so only one element with this text
      expect(screen.getByText('$75K')).toBeInTheDocument();
    });

    it('should show preset buttons', () => {
      renderWithProvider();

      expect(screen.getByRole('button', { name: '$10K' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '$50K' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '$100K' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '$500K' })).toBeInTheDocument();
    });

    it('should update threshold when preset button clicked', () => {
      renderWithProvider();

      fireEvent.click(screen.getByRole('button', { name: '$100K' }));

      const slider = screen.getByRole('slider', { name: /minimum alert threshold/i });
      expect(slider).toHaveValue('100000');
    });

    it('should highlight active preset button', () => {
      renderWithProvider();

      // Default is $10K, should be highlighted with cyan background
      const button10k = screen.getByRole('button', { name: '$10K' });
      // Check that the button has the cyan color in its background
      expect(button10k).toHaveStyle({ background: 'rgb(0, 255, 240)' });
    });
  });

  describe('Sound Toggle Section', () => {
    it('should render sound toggle section', () => {
      renderWithProvider();

      expect(screen.getByText('Sound Notifications')).toBeInTheDocument();
    });

    it('should render toggle switch', () => {
      renderWithProvider();

      const toggle = screen.getByRole('switch', { name: /sound notifications/i });
      expect(toggle).toBeInTheDocument();
    });

    it('should be off by default', () => {
      renderWithProvider();

      const toggle = screen.getByRole('switch', { name: /sound notifications/i });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should toggle sound on click', () => {
      renderWithProvider();

      const toggle = screen.getByRole('switch', { name: /sound notifications/i });
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Telegram Section', () => {
    it('should render telegram section', () => {
      renderWithProvider();

      expect(screen.getByText('Telegram Notifications')).toBeInTheDocument();
    });

    it('should show connect button when not connected', () => {
      renderWithProvider();

      expect(screen.getByRole('button', { name: /connect telegram/i })).toBeInTheDocument();
    });

    it('should show coming soon badge', () => {
      renderWithProvider();

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });
  });

  describe('Reset Button', () => {
    it('should render reset button', () => {
      renderWithProvider();

      expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument();
    });

    it('should reset settings when clicked', () => {
      renderWithProvider();

      // Change threshold to non-preset value
      const slider = screen.getByRole('slider', { name: /minimum alert threshold/i });
      fireEvent.change(slider, { target: { value: '75000' } });
      expect(slider).toHaveValue('75000');

      // Reset
      fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

      // Should be back to $10K
      expect(slider).toHaveValue('10000');
    });
  });

  describe('Mobile Layout', () => {
    it('should apply mobile styles', () => {
      renderWithProvider(true);

      expect(screen.getByTestId('settings-container')).toBeInTheDocument();
    });
  });
});
