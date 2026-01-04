/**
 * SettingsContext
 *
 * Global settings state management for the application.
 * Persists settings to localStorage for cross-session retention.
 *
 * Settings:
 * - minAlertThreshold: Minimum USD amount for alerts (default: $10,000)
 * - soundEnabled: Play sound on new alerts (default: false)
 * - telegramConnected: Whether Telegram bot is connected (default: false)
 * - telegramUsername: Connected Telegram username (default: null)
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'polywoly-settings';

export interface Settings {
  /** Minimum USD amount to show in alerts (default: 10000) */
  minAlertThreshold: number;
  /** Whether to play sound on new alerts */
  soundEnabled: boolean;
  /** Whether Telegram bot is connected */
  telegramConnected: boolean;
  /** Connected Telegram username */
  telegramUsername: string | null;
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  minAlertThreshold: 10000,
  soundEnabled: false,
  telegramConnected: false,
  telegramUsername: null,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Load settings from localStorage, falling back to defaults
 */
function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Corrupted data, use defaults
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable, silently fail
  }
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  // Save to localStorage whenever settings change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings context
 * @throws Error if used outside SettingsProvider
 */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export { DEFAULT_SETTINGS };
