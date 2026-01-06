/**
 * Settings Component
 *
 * User preferences and configuration panel.
 *
 * Enhanced mobile view with:
 * - Sticky header
 * - Grouped settings sections
 * - Custom toggle switches
 * - Slider controls with presets
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { tokens } from '../styles/tokens';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useSound, type SoundType } from '../hooks/useSound';

interface SettingsProps {
  isMobile: boolean;
}

const THRESHOLD_PRESETS = [
  { label: '$1K', value: 1000 },
  { label: '$5K', value: 5000 },
  { label: '$10K', value: 10000 },
  { label: '$25K', value: 25000 },
  { label: '$50K', value: 50000 },
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
 * Custom Toggle Switch Component
 */
function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        position: 'relative',
        width: '52px',
        height: '28px',
        borderRadius: '14px',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked
          ? `linear-gradient(135deg, ${tokens.colors.cyan}, ${tokens.colors.profit})`
          : tokens.colors.void,
        boxShadow: checked
          ? `0 0 20px ${tokens.colors.cyanGlow}, inset 0 0 0 1px ${tokens.colors.cyan}50`
          : `inset 0 0 0 1px ${tokens.colors.border}`,
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '26px' : '2px',
          width: '24px',
          height: '24px',
          borderRadius: '12px',
          background: tokens.colors.textPrimary,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  );
}

/**
 * Setting Row Component
 */
function SettingRow({
  icon,
  label,
  description,
  children,
  isMobile,
}: {
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '16px',
        padding: isMobile ? '16px' : '16px 20px',
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
        <span style={{ fontSize: isMobile ? '18px' : '16px', marginTop: '2px' }}>{icon}</span>
        <div>
          <div
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: isMobile ? '15px' : '14px',
              fontWeight: 500,
              color: tokens.colors.textPrimary,
              marginBottom: description ? '4px' : 0,
            }}
          >
            {label}
          </div>
          {description && (
            <div
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: isMobile ? '13px' : '12px',
                color: tokens.colors.textMuted,
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>
      <div style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>{children}</div>
    </div>
  );
}

/**
 * Section Header Component
 */
function SectionHeader({ icon, title }: { icon?: string; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
        marginTop: '8px',
      }}
    >
      {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
      <span
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: '11px',
          fontWeight: 600,
          color: tokens.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </span>
    </div>
  );
}

/**
 * Preset Button Component
 */
function PresetButton({
  label,
  isActive,
  onClick,
  isMobile,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  isMobile: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: isMobile ? '1 1 auto' : 'none',
        minWidth: isMobile ? '60px' : 'auto',
        padding: isMobile ? '12px 16px' : '8px 14px',
        background: isActive ? `${tokens.colors.cyan}20` : tokens.colors.void,
        border: `1px solid ${isActive ? tokens.colors.cyan : tokens.colors.border}`,
        borderRadius: isMobile ? '10px' : '8px',
        fontFamily: tokens.fonts.mono,
        fontSize: isMobile ? '14px' : '12px',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? tokens.colors.cyan : tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isActive ? `0 0 15px ${tokens.colors.cyanGlow}` : 'none',
      }}
    >
      {label}
    </button>
  );
}

/**
 * Deposit Slider Component
 */
function DepositSlider({
  value,
  onChange,
  isMobile,
}: {
  value: number;
  onChange: (value: number) => void;
  isMobile: boolean;
}) {
  // Convert value to slider position (logarithmic scale)
  const minLog = Math.log(1000);
  const maxLog = Math.log(100000);
  const valueToSlider = (val: number) => ((Math.log(val) - minLog) / (maxLog - minLog)) * 100;
  const sliderToValue = (pos: number) => Math.exp(minLog + (pos / 100) * (maxLog - minLog));

  const sliderPosition = valueToSlider(Math.max(1000, Math.min(100000, value)));

  return (
    <div style={{ width: '100%' }}>
      {/* Current Value Display */}
      <div
        style={{
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: isMobile ? '24px' : '20px',
            fontWeight: 700,
            color: tokens.colors.cyan,
            textShadow: `0 0 15px ${tokens.colors.cyanGlow}`,
          }}
        >
          {formatThreshold(value)}
        </span>
      </div>

      {/* Slider Track */}
      <div
        style={{
          position: 'relative',
          height: '8px',
          background: tokens.colors.void,
          borderRadius: '4px',
          marginBottom: '12px',
        }}
      >
        {/* Filled Track */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${sliderPosition}%`,
            background: `linear-gradient(90deg, ${tokens.colors.cyan}, ${tokens.colors.profit})`,
            borderRadius: '4px',
            boxShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
          }}
        />

        {/* Slider Input */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={(e) => {
            const newValue = sliderToValue(parseFloat(e.target.value));
            // Snap to nearest preset if close
            const closest = THRESHOLD_PRESETS.reduce((prev, curr) =>
              Math.abs(curr.value - newValue) < Math.abs(prev.value - newValue) ? curr : prev
            );
            if (Math.abs(closest.value - newValue) / newValue < 0.1) {
              onChange(closest.value);
            } else {
              onChange(Math.round(newValue / 100) * 100);
            }
          }}
          aria-label="Minimum alert threshold"
          style={{
            position: 'absolute',
            top: '-10px',
            left: 0,
            width: '100%',
            height: '28px',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />

        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${sliderPosition}%`,
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: tokens.colors.textPrimary,
            border: `3px solid ${tokens.colors.cyan}`,
            boxShadow: `0 0 15px ${tokens.colors.cyanGlow}, 0 2px 8px rgba(0,0,0,0.3)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Scale Labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontFamily: tokens.fonts.mono, fontSize: '10px', color: tokens.colors.textMuted }}>
          $1K
        </span>
        <span style={{ fontFamily: tokens.fonts.mono, fontSize: '10px', color: tokens.colors.textMuted }}>
          $10K
        </span>
        <span style={{ fontFamily: tokens.fonts.mono, fontSize: '10px', color: tokens.colors.textMuted }}>
          $100K
        </span>
      </div>

      {/* Preset Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {THRESHOLD_PRESETS.map((preset) => (
          <PresetButton
            key={preset.value}
            label={preset.label}
            isActive={value === preset.value}
            onClick={() => onChange(preset.value)}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Notification Preview Button
 */
function NotificationPreviewButton({
  isMobile,
  onPreview,
}: {
  isMobile: boolean;
  onPreview: () => void;
}) {
  return (
    <button
      onClick={onPreview}
      style={{
        width: isMobile ? '100%' : 'auto',
        padding: isMobile ? '14px 20px' : '12px 18px',
        background: `linear-gradient(135deg, ${tokens.colors.cyan}15, ${tokens.colors.magenta}10)`,
        border: `1px solid ${tokens.colors.cyan}40`,
        borderRadius: isMobile ? '12px' : '10px',
        fontFamily: tokens.fonts.body,
        fontSize: isMobile ? '14px' : '13px',
        fontWeight: 500,
        color: tokens.colors.cyan,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `linear-gradient(135deg, ${tokens.colors.cyan}25, ${tokens.colors.magenta}15)`;
        e.currentTarget.style.boxShadow = `0 0 20px ${tokens.colors.cyanGlow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `linear-gradient(135deg, ${tokens.colors.cyan}15, ${tokens.colors.magenta}10)`;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span>🔔</span>
      <span>Test Notification</span>
    </button>
  );
}

/**
 * Sound Preview Buttons
 */
function SoundPreviewButtons({
  isMobile,
  onPreview,
}: {
  isMobile: boolean;
  onPreview: (type: SoundType) => void;
}) {
  const sounds: { type: SoundType; label: string; emoji: string }[] = [
    { type: 'sonar', label: 'Sonar', emoji: '📡' },
    { type: 'whale', label: 'Whale', emoji: '🐋' },
    { type: 'chaching', label: 'Money', emoji: '💰' },
    { type: 'success', label: 'Success', emoji: '✓' },
    { type: 'error', label: 'Error', emoji: '✗' },
  ];

  const topRow = sounds.slice(0, 3); // Sonar, Whale, Money
  const bottomRow = sounds.slice(3);  // Success, Error

  const renderButton = ({ type, label, emoji }: { type: SoundType; label: string; emoji: string }) => (
    <button
      key={type}
      onClick={() => onPreview(type)}
      aria-label={`Preview ${label} sound`}
      style={{
        padding: isMobile ? '12px 14px' : '10px 14px',
        background: tokens.colors.void,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: isMobile ? '10px' : '8px',
        fontFamily: tokens.fonts.body,
        fontSize: isMobile ? '13px' : '12px',
        fontWeight: 500,
        color: tokens.colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.cyan;
        e.currentTarget.style.color = tokens.colors.cyan;
        e.currentTarget.style.boxShadow = `0 0 15px ${tokens.colors.cyanGlow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.color = tokens.colors.textSecondary;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Top row: 3 buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {topRow.map(renderButton)}
      </div>
      {/* Bottom row: 2 buttons at 50% each */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {bottomRow.map(renderButton)}
      </div>
    </div>
  );
}

export function Settings({ isMobile }: SettingsProps) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { addToast } = useToast();
  const { previewSound } = useSound();

  const handlePreviewSound = (type: SoundType) => {
    previewSound(type);
  };

  const handlePreviewNotification = () => {
    // Generate random whale data for preview
    const amounts = ['$50K', '$125K', '$250K', '$500K', '$1.2M'];
    const amount = amounts[Math.floor(Math.random() * amounts.length)];
    const isNewWhale = Math.random() > 0.5;

    addToast({
      variant: isNewWhale ? 'success' : 'info',
      title: isNewWhale ? 'New Whale Spotted!' : 'Whale Activity',
      message: `${amount} deposit from 0x7a3d...9f2e`,
    });
  };

  // =====================
  // MOBILE VIEW
  // =====================
  if (isMobile) {
    return (
      <div
        data-testid="settings-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          paddingBottom: '100px',
        }}
      >
        {/* ===== STICKY HEADER ===== */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: `linear-gradient(180deg, ${tokens.colors.void} 0%, ${tokens.colors.void}f0 85%, transparent 100%)`,
            paddingTop: '4px',
            paddingBottom: '20px',
            marginLeft: '-16px',
            marginRight: '-16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <h1
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: '22px',
                fontWeight: 700,
                color: tokens.colors.textPrimary,
                margin: 0,
              }}
            >
              Settings
            </h1>
          </div>
        </div>

        {/* ===== ALERT THRESHOLDS ===== */}
        <SectionHeader icon="💰" title="Alert Thresholds" />
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              color: tokens.colors.textSecondary,
              marginBottom: '16px',
            }}
          >
            Only show whale deposits above this amount
          </div>
          <DepositSlider
            value={settings.minAlertThreshold}
            onChange={(value) => updateSettings({ minAlertThreshold: value })}
            isMobile
          />
        </div>

        {/* ===== NOTIFICATIONS ===== */}
        <SectionHeader icon="🔔" title="Notifications" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '24px',
          }}
        >
          <SettingRow
            icon="📱"
            label="Telegram Alerts"
            description="Receive whale alerts via Telegram bot"
            isMobile
          >
            <Toggle
              checked={settings.telegramConnected}
              onChange={(checked) => updateSettings({ telegramConnected: checked })}
              ariaLabel="Telegram alerts"
            />
          </SettingRow>

          <SettingRow
            icon="🔊"
            label="Sound Effects"
            description="Play sound when new whale detected"
            isMobile
          >
            <Toggle
              checked={settings.soundEnabled}
              onChange={(checked) => updateSettings({ soundEnabled: checked })}
              ariaLabel="Sound effects"
            />
          </SettingRow>

          {/* Notification Preview */}
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: '13px',
                color: tokens.colors.textMuted,
                marginBottom: '12px',
              }}
            >
              Preview what whale alerts look like
            </div>
            <NotificationPreviewButton isMobile onPreview={handlePreviewNotification} />
          </div>

          {/* Sound Preview */}
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: '13px',
                color: tokens.colors.textMuted,
                marginBottom: '12px',
              }}
            >
              Preview sound effects
            </div>
            <SoundPreviewButtons isMobile onPreview={handlePreviewSound} />
          </div>
        </div>

        {/* ===== ABOUT ===== */}
        <SectionHeader title="About" />
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '28px' }}>🐋</span>
            <div>
              <div
                style={{
                  fontFamily: tokens.fonts.display,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: tokens.colors.textPrimary,
                }}
              >
                PolyWolyTroly
              </div>
              <div
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: '12px',
                  color: tokens.colors.textMuted,
                }}
              >
                v1.0.0 • Whale Intelligence
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: tokens.fonts.body,
              fontSize: '13px',
              color: tokens.colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            Track whale wallets on Polymarket. Follow smart money, discover high-conviction bets.
          </div>
        </div>

        {/* ===== RESET BUTTON ===== */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <button
            onClick={resetSettings}
            aria-label="Reset to defaults"
            style={{
              padding: '14px 28px',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              fontFamily: tokens.fonts.body,
              fontSize: '14px',
              fontWeight: 500,
              color: tokens.colors.textMuted,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    );
  }

  // =====================
  // DESKTOP VIEW
  // =====================
  return (
    <div
      data-testid="settings-container"
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: tokens.spacing[6],
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚙️</span>
          <h1
            style={{
              fontFamily: tokens.fonts.display,
              fontSize: '24px',
              fontWeight: 700,
              color: tokens.colors.textPrimary,
              margin: 0,
            }}
          >
            Settings
          </h1>
        </div>
        <button
          onClick={resetSettings}
          aria-label="Reset to defaults"
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            fontFamily: tokens.fonts.body,
            fontSize: '14px',
            fontWeight: 500,
            color: tokens.colors.textMuted,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Reset to Defaults
        </button>
      </div>

      {/* Alert Thresholds */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader icon="💰" title="Alert Thresholds" />
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <DepositSlider
            value={settings.minAlertThreshold}
            onChange={(value) => updateSettings({ minAlertThreshold: value })}
            isMobile={false}
          />
        </div>
      </div>

      {/* Notifications */}
      <div style={{ marginBottom: '24px' }}>
        <SectionHeader icon="🔔" title="Notifications" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SettingRow icon="📱" label="Telegram Alerts" isMobile={false}>
            <Toggle
              checked={settings.telegramConnected}
              onChange={(checked) => updateSettings({ telegramConnected: checked })}
              ariaLabel="Telegram alerts"
            />
          </SettingRow>
          <SettingRow icon="🔊" label="Sound Effects" isMobile={false}>
            <Toggle
              checked={settings.soundEnabled}
              onChange={(checked) => updateSettings({ soundEnabled: checked })}
              ariaLabel="Sound effects"
            />
          </SettingRow>

          {/* Notification Preview */}
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: tokens.colors.textPrimary,
                  marginBottom: '4px',
                }}
              >
                🔔 Preview Notification
              </div>
              <div
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '12px',
                  color: tokens.colors.textMuted,
                }}
              >
                See what whale alerts look like
              </div>
            </div>
            <NotificationPreviewButton isMobile={false} onPreview={handlePreviewNotification} />
          </div>

          {/* Sound Preview */}
          <div
            style={{
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: tokens.colors.textPrimary,
                  marginBottom: '4px',
                }}
              >
                🔊 Preview Sounds
              </div>
              <div
                style={{
                  fontFamily: tokens.fonts.body,
                  fontSize: '12px',
                  color: tokens.colors.textMuted,
                }}
              >
                Hear the notification sound effects
              </div>
            </div>
            <SoundPreviewButtons isMobile={false} onPreview={handlePreviewSound} />
          </div>
        </div>
      </div>

      {/* About Section */}
      <div>
        <SectionHeader title="About" />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <span style={{ fontSize: '40px' }}>🐋</span>
          <div>
            <div
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: '18px',
                fontWeight: 700,
                color: tokens.colors.textPrimary,
                marginBottom: '4px',
              }}
            >
              PolyWolyTroly
            </div>
            <div
              style={{
                fontFamily: tokens.fonts.mono,
                fontSize: '12px',
                color: tokens.colors.textMuted,
              }}
            >
              v1.0.0 • Whale Intelligence Platform for Polymarket
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
