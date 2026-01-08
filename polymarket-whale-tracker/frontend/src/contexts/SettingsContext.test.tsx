/**
 * SettingsContext Tests
 *
 * Tests for the settings state management context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';

// Test component that uses the settings context
function TestConsumer() {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <div>
      <span data-testid="threshold">{settings.minAlertThreshold}</span>
      <span data-testid="sound">{settings.soundEnabled ? 'on' : 'off'}</span>
      <span data-testid="telegram">{settings.telegramConnected ? 'connected' : 'disconnected'}</span>
      <span data-testid="telegram-username">{settings.telegramUsername || 'none'}</span>
      <button onClick={() => updateSettings({ minAlertThreshold: 100000 })}>
        Set 100K
      </button>
      <button onClick={() => updateSettings({ soundEnabled: true })}>
        Enable Sound
      </button>
      <button onClick={() => updateSettings({ telegramConnected: true, telegramUsername: '@whale' })}>
        Connect Telegram
      </button>
      <button onClick={resetSettings}>Reset</button>
    </div>
  );
}

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

describe('SettingsContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Default Values', () => {
    it('should provide default settings', () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      expect(screen.getByTestId('threshold')).toHaveTextContent('10000');
      expect(screen.getByTestId('sound')).toHaveTextContent('off');
      expect(screen.getByTestId('telegram')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('telegram-username')).toHaveTextContent('none');
    });
  });

  describe('Update Settings', () => {
    it('should update minAlertThreshold', () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      fireEvent.click(screen.getByText('Set 100K'));

      expect(screen.getByTestId('threshold')).toHaveTextContent('100000');
    });

    it('should update soundEnabled', () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      fireEvent.click(screen.getByText('Enable Sound'));

      expect(screen.getByTestId('sound')).toHaveTextContent('on');
    });

    it('should update telegram settings', () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      fireEvent.click(screen.getByText('Connect Telegram'));

      expect(screen.getByTestId('telegram')).toHaveTextContent('connected');
      expect(screen.getByTestId('telegram-username')).toHaveTextContent('@whale');
    });
  });

  describe('Reset Settings', () => {
    it('should reset all settings to defaults', () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      // Change settings
      fireEvent.click(screen.getByText('Set 100K'));
      fireEvent.click(screen.getByText('Enable Sound'));
      fireEvent.click(screen.getByText('Connect Telegram'));

      // Verify changes
      expect(screen.getByTestId('threshold')).toHaveTextContent('100000');
      expect(screen.getByTestId('sound')).toHaveTextContent('on');

      // Reset
      fireEvent.click(screen.getByText('Reset'));

      // Verify defaults
      expect(screen.getByTestId('threshold')).toHaveTextContent('10000');
      expect(screen.getByTestId('sound')).toHaveTextContent('off');
      expect(screen.getByTestId('telegram')).toHaveTextContent('disconnected');
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save settings to localStorage on update', () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      fireEvent.click(screen.getByText('Set 100K'));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'polywoly-settings',
        expect.stringContaining('"minAlertThreshold":100000')
      );
    });

    it('should load settings from localStorage on mount', () => {
      const savedSettings = JSON.stringify({
        minAlertThreshold: 50000,
        soundEnabled: true,
        telegramConnected: false,
        telegramUsername: null,
      });
      localStorageMock.getItem.mockReturnValue(savedSettings);

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      expect(screen.getByTestId('threshold')).toHaveTextContent('50000');
      expect(screen.getByTestId('sound')).toHaveTextContent('on');
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      // Should fall back to defaults
      expect(screen.getByTestId('threshold')).toHaveTextContent('10000');
    });
  });

  describe('useSettings outside provider', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useSettings must be used within a SettingsProvider');

      consoleSpy.mockRestore();
    });
  });
});
