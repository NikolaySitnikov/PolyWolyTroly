/**
 * Settings Component Tests
 *
 * Tests for the Settings page component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';
import { SettingsProvider } from '../contexts/SettingsContext';
import { ToastProvider } from '../contexts/ToastContext';

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
      <ToastProvider>
        <Settings isMobile={isMobile} />
      </ToastProvider>
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

    it('should render settings icon', () => {
      renderWithProvider();

      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });
  });

  describe('Alert Threshold Section', () => {
    it('should render threshold section header', () => {
      renderWithProvider();

      expect(screen.getByText('Alert Thresholds')).toBeInTheDocument();
    });

    it('should display current threshold value as formatted amount', () => {
      renderWithProvider();

      // Default is $10,000 - displayed as $10K (multiple elements: display + button + scale label)
      const elements = screen.getAllByText('$10K');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render threshold slider', () => {
      renderWithProvider();

      const slider = screen.getByRole('slider', { name: /minimum alert threshold/i });
      expect(slider).toBeInTheDocument();
    });

    it('should show preset buttons', () => {
      renderWithProvider();

      // Current presets: $1K, $5K, $10K, $25K, $50K
      expect(screen.getByRole('button', { name: '$1K' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '$5K' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '$10K' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '$25K' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '$50K' })).toBeInTheDocument();
    });

    it('should update threshold when preset button clicked', () => {
      renderWithProvider();

      // Click the $25K preset button
      const preset25kButton = screen.getByRole('button', { name: '$25K' });
      fireEvent.click(preset25kButton);

      // There should be multiple elements with $25K (display value + button)
      const elements = screen.getAllByText('$25K');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Notification Section', () => {
    it('should render notifications section header', () => {
      renderWithProvider();

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should render telegram toggle', () => {
      renderWithProvider();

      const toggle = screen.getByRole('switch', { name: /telegram alerts/i });
      expect(toggle).toBeInTheDocument();
    });

    it('should render sound toggle', () => {
      renderWithProvider();

      const toggle = screen.getByRole('switch', { name: /sound effects/i });
      expect(toggle).toBeInTheDocument();
    });

    it('should be off by default for sound', () => {
      renderWithProvider();

      const toggle = screen.getByRole('switch', { name: /sound effects/i });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should toggle sound on click', () => {
      renderWithProvider();

      const toggle = screen.getByRole('switch', { name: /sound effects/i });
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should render notification preview button', () => {
      renderWithProvider();

      expect(screen.getByRole('button', { name: /test notification/i })).toBeInTheDocument();
    });
  });

  describe('About Section', () => {
    it('should render about section', () => {
      renderWithProvider();

      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('should show app name', () => {
      renderWithProvider();

      expect(screen.getByText('PolyWolyTroly')).toBeInTheDocument();
    });

    it('should show version', () => {
      renderWithProvider();

      expect(screen.getByText(/v1.0.0/)).toBeInTheDocument();
    });
  });

  describe('Reset Button', () => {
    it('should render reset button', () => {
      renderWithProvider();

      expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument();
    });

    it('should reset settings when clicked', () => {
      renderWithProvider();

      // Change sound to enabled
      const soundToggle = screen.getByRole('switch', { name: /sound effects/i });
      fireEvent.click(soundToggle);
      expect(soundToggle).toHaveAttribute('aria-checked', 'true');

      // Reset
      fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

      // Sound should be back to off
      expect(soundToggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Mobile Layout', () => {
    it('should apply mobile styles', () => {
      renderWithProvider(true);

      expect(screen.getByTestId('settings-container')).toBeInTheDocument();
    });

    it('should render mobile header', () => {
      renderWithProvider(true);

      // Mobile has sticky header with settings title
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});
