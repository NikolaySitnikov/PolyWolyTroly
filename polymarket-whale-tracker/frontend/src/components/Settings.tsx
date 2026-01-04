/**
 * Settings Component
 *
 * Settings page for configuring notification preferences.
 * Follows DESIGN_SYSTEM.md specifications.
 *
 * Features:
 * - Minimum alert threshold slider with presets
 * - Sound notification toggle
 * - Telegram bot connection (coming soon)
 * - Reset to defaults
 */

import { tokens } from '../styles/tokens';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsProps {
  isMobile: boolean;
}

const THRESHOLD_PRESETS = [
  { label: '$10K', value: 10000 },
  { label: '$50K', value: 50000 },
  { label: '$100K', value: 100000 },
  { label: '$500K', value: 500000 },
];

/**
 * Format threshold value for display
 */
function formatThreshold(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value}`;
}

/**
 * Settings section wrapper
 */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: tokens.spacing[5],
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radius.lg,
      }}
    >
      <h3
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: tokens.fontSizes.md,
          fontWeight: tokens.fontWeights.semibold,
          color: tokens.colors.textPrimary,
          marginBottom: tokens.spacing[1],
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: tokens.fontSizes.sm,
            color: tokens.colors.textMuted,
            marginBottom: tokens.spacing[4],
          }}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

/**
 * Toggle switch component
 */
function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: '52px',
        height: '28px',
        background: checked ? tokens.colors.cyan : tokens.colors.border,
        borderRadius: '14px',
        border: 'none',
        cursor: 'pointer',
        transition: `background ${tokens.animation.durationFast} ease`,
        boxShadow: checked ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '27px' : '3px',
          width: '22px',
          height: '22px',
          background: checked ? tokens.colors.void : tokens.colors.textMuted,
          borderRadius: '50%',
          transition: `all ${tokens.animation.durationFast} ease`,
        }}
      />
    </button>
  );
}

export function Settings({ isMobile }: SettingsProps) {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <div
      data-testid="settings-container"
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: isMobile ? tokens.spacing[4] : tokens.spacing[6],
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: tokens.spacing[8] }}>
        <h1
          style={{
            fontFamily: tokens.fonts.display,
            fontSize: isMobile ? tokens.fontSizes['2xl'] : tokens.fontSizes['3xl'],
            fontWeight: tokens.fontWeights.bold,
            color: tokens.colors.textPrimary,
            marginBottom: tokens.spacing[2],
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontFamily: tokens.fonts.body,
            fontSize: tokens.fontSizes.md,
            color: tokens.colors.textSecondary,
          }}
        >
          Configure your notification preferences.
        </p>
      </div>

      {/* Settings Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        {/* Threshold Section */}
        <SettingsSection
          title="Minimum Alert Threshold"
          description="Only show alerts for deposits above this amount"
        >
          {/* Current Value Display */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: tokens.spacing[4],
            }}
          >
            <span
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: tokens.fontSizes['2xl'],
                fontWeight: tokens.fontWeights.bold,
                color: tokens.colors.cyan,
              }}
            >
              {formatThreshold(settings.minAlertThreshold)}
            </span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="1000"
            max="1000000"
            step="1000"
            value={settings.minAlertThreshold}
            onChange={(e) => updateSettings({ minAlertThreshold: Number(e.target.value) })}
            aria-label="Minimum alert threshold"
            style={{
              width: '100%',
              height: '8px',
              appearance: 'none',
              background: `linear-gradient(to right, ${tokens.colors.cyan} 0%, ${tokens.colors.cyan} ${((settings.minAlertThreshold - 1000) / (1000000 - 1000)) * 100}%, ${tokens.colors.border} ${((settings.minAlertThreshold - 1000) / (1000000 - 1000)) * 100}%, ${tokens.colors.border} 100%)`,
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: tokens.spacing[4],
            }}
          />

          {/* Preset Buttons */}
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[2],
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {THRESHOLD_PRESETS.map((preset) => {
              const isActive = settings.minAlertThreshold === preset.value;
              return (
                <button
                  key={preset.value}
                  onClick={() => updateSettings({ minAlertThreshold: preset.value })}
                  aria-label={preset.label}
                  style={{
                    padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
                    background: isActive ? tokens.colors.cyan : 'transparent',
                    border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
                    borderRadius: tokens.radius.md,
                    fontFamily: tokens.fonts.mono,
                    fontSize: tokens.fontSizes.sm,
                    fontWeight: tokens.fontWeights.medium,
                    color: isActive ? tokens.colors.void : tokens.colors.textSecondary,
                    cursor: 'pointer',
                    transition: `all ${tokens.animation.durationFast} ease`,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* Sound Toggle Section */}
        <SettingsSection
          title="Sound Notifications"
          description="Play a sound when new whale alerts arrive"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: tokens.fontSizes.sm,
                color: settings.soundEnabled ? tokens.colors.textPrimary : tokens.colors.textMuted,
              }}
            >
              {settings.soundEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <ToggleSwitch
              checked={settings.soundEnabled}
              onChange={(checked) => updateSettings({ soundEnabled: checked })}
              ariaLabel="Sound notifications"
            />
          </div>
        </SettingsSection>

        {/* Telegram Section */}
        <SettingsSection
          title="Telegram Notifications"
          description="Connect your Telegram to receive whale alerts"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: tokens.spacing[4],
            }}
          >
            <div>
              {settings.telegramConnected ? (
                <span
                  style={{
                    fontFamily: tokens.fonts.mono,
                    fontSize: tokens.fontSizes.sm,
                    color: tokens.colors.profit,
                  }}
                >
                  Connected as {settings.telegramUsername}
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: tokens.spacing[2],
                    padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
                    background: `${tokens.colors.warning}20`,
                    border: `1px solid ${tokens.colors.warning}40`,
                    borderRadius: tokens.radius.sm,
                    fontFamily: tokens.fonts.mono,
                    fontSize: tokens.fontSizes.xs,
                    color: tokens.colors.warning,
                  }}
                >
                  Coming Soon
                </span>
              )}
            </div>
            <button
              aria-label="Connect Telegram"
              disabled={!settings.telegramConnected}
              style={{
                padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
                background: settings.telegramConnected ? tokens.colors.loss : tokens.colors.surface,
                border: `1px solid ${settings.telegramConnected ? tokens.colors.loss : tokens.colors.border}`,
                borderRadius: tokens.radius.md,
                fontFamily: tokens.fonts.body,
                fontSize: tokens.fontSizes.sm,
                fontWeight: tokens.fontWeights.medium,
                color: settings.telegramConnected
                  ? tokens.colors.textPrimary
                  : tokens.colors.textMuted,
                cursor: settings.telegramConnected ? 'pointer' : 'not-allowed',
                opacity: settings.telegramConnected ? 1 : 0.6,
              }}
            >
              {settings.telegramConnected ? 'Disconnect' : 'Connect Telegram'}
            </button>
          </div>
        </SettingsSection>

        {/* Reset Button */}
        <div style={{ textAlign: 'center', marginTop: tokens.spacing[4] }}>
          <button
            onClick={resetSettings}
            aria-label="Reset to defaults"
            style={{
              padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
              background: 'transparent',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md,
              fontFamily: tokens.fonts.body,
              fontSize: tokens.fontSizes.sm,
              fontWeight: tokens.fontWeights.medium,
              color: tokens.colors.textMuted,
              cursor: 'pointer',
              transition: `all ${tokens.animation.durationFast} ease`,
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
