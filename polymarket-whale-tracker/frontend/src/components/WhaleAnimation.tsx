/**
 * WhaleAnimation Component
 *
 * Animated ASCII whale mascot for loading, error, empty, and success states.
 * The whale has different poses and colors based on state.
 *
 * States:
 * - loading: Cyan whale with swimming animation, "Scanning the depths..."
 * - error: Magenta confused whale with ?, "Whale got lost"
 * - empty: Cyan whale at 50% opacity with bubbles, "No whales spotted yet"
 * - success: Green happy whale with ✓, "Whale found!"
 *
 * @see ../../../Design docs/DESIGN_SYSTEM.md - Whale Mascot section
 * @see ../../../Design docs/BRAND_GUIDELINES_EXTENDED.md - Animation Sequences
 */

import { tokens } from '../styles/tokens';

export type WhaleState = 'loading' | 'error' | 'empty' | 'success';

interface WhaleAnimationProps {
  /** Current state of the whale animation */
  state: WhaleState;
  /** Optional custom title to override default */
  title?: string;
  /** Optional custom subtitle to override default */
  subtitle?: string;
}

/**
 * ASCII art for each whale state
 * Each state has a distinct pose to communicate meaning
 */
const WHALE_STATES = {
  // Loading - whale with searching eye (°)
  loading: `       .
      ":"
    ___:____     |"\\/"|
  ,'        \`.    \\  /
  |  °        \\___/  |`,

  // Error - confused whale with ? above and @ eye
  error: `          ?
       .
      ":"
    ___:____     |"\\/"|
  ,'        \`.    \\  /
  |  @        \\___/  |`,

  // Empty - whale surfacing with bubbles (° ° °) and zen eye (-)
  empty: `       .  °  .
      ":"
    ___:____     |"\\/"|
  ,'        \`.    \\  /
  |  -        \\___/  |`,

  // Success - happy whale with ✓ and happy eye (◡)
  success: `       .  ✓
      ":"
    ___:____     |"\\/"|
  ,'        \`.    \\  /
  |  ◡        \\___/  |`,
};

/**
 * Wave pattern for the water below the whale
 */
const WHALE_WAVES = '~^~^~^~^~^~^~^~^~^~^~^~^~';

/**
 * Default messages for each state
 */
const DEFAULT_MESSAGES = {
  loading: {
    title: 'Scanning the depths...',
    subtitle: 'Looking for whale activity...',
    ariaLabel: 'Loading whale data',
  },
  error: {
    title: 'Whale got lost',
    subtitle: 'Something went wrong. Try again?',
    ariaLabel: 'Error loading whale data',
  },
  empty: {
    title: 'No whales spotted yet',
    subtitle: 'Whales will appear here once deposits are detected',
    ariaLabel: 'No whale data available',
  },
  success: {
    title: 'Whale found!',
    subtitle: 'New activity detected',
    ariaLabel: 'Whale data loaded successfully',
  },
};

/**
 * Styles for each whale state
 */
const getWhaleStyles = (state: WhaleState): React.CSSProperties => {
  switch (state) {
    case 'loading':
      return {
        color: tokens.colors.cyan,
        textShadow: `0 0 20px ${tokens.colors.cyanGlow}`,
      };
    case 'error':
      return {
        color: tokens.colors.magenta,
        textShadow: `0 0 15px ${tokens.colors.magentaGlow}`,
      };
    case 'empty':
      return {
        color: tokens.colors.cyan,
        opacity: 0.5,
        textShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
      };
    case 'success':
      return {
        color: tokens.colors.profit,
        textShadow: `0 0 20px ${tokens.colors.profitGlow}`,
      };
  }
};

/**
 * Animation styles for the whale body container
 */
const getBodyAnimation = (state: WhaleState): string => {
  switch (state) {
    case 'loading':
      return 'whaleSwim 3s ease-in-out infinite';
    case 'error':
      return 'none';
    case 'empty':
      return 'subtleFloat 4s ease-in-out infinite';
    case 'success':
      return 'whaleSuccess 0.6s ease-out';
  }
};

/**
 * Animation styles for the waves
 */
const getWaveAnimation = (state: WhaleState): string => {
  switch (state) {
    case 'loading':
      return 'waveShimmer 2s ease-in-out infinite';
    case 'error':
      return 'none';
    case 'empty':
      return 'waveShimmer 4s ease-in-out infinite';
    case 'success':
      return 'waveShimmer 1s ease-in-out';
  }
};

export function WhaleAnimation({ state, title, subtitle }: WhaleAnimationProps) {
  const whaleArt = WHALE_STATES[state];
  const messages = DEFAULT_MESSAGES[state];
  const whaleStyles = getWhaleStyles(state);
  const bodyAnimation = getBodyAnimation(state);
  const waveAnimation = getWaveAnimation(state);

  const displayTitle = title || messages.title;
  const displaySubtitle = subtitle || messages.subtitle;

  return (
    <div
      data-testid="whale-animation"
      role="status"
      aria-live="polite"
      aria-label={messages.ariaLabel}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      {/* Whale container with swimming animation */}
      <div
        data-testid="whale-body"
        style={{
          animation: bodyAnimation,
          marginBottom: '24px',
        }}
      >
        {/* Whale ASCII art */}
        <pre
          data-testid="whale-art"
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            lineHeight: 1.3,
            margin: 0,
            whiteSpace: 'pre',
            ...whaleStyles,
          }}
        >
          {whaleArt}
        </pre>

        {/* Waves with separate shimmer animation */}
        <pre
          data-testid="whale-waves"
          style={{
            fontFamily: tokens.fonts.mono,
            fontSize: '12px',
            lineHeight: 1.3,
            margin: 0,
            whiteSpace: 'pre',
            animation: waveAnimation,
            ...whaleStyles,
          }}
        >
          {WHALE_WAVES}
        </pre>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: tokens.fonts.display,
          fontSize: '18px',
          fontWeight: tokens.fontWeights.bold,
          color: tokens.colors.textPrimary,
          marginBottom: '8px',
        }}
      >
        {displayTitle}
      </div>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: '14px',
          color: tokens.colors.textMuted,
          margin: 0,
          maxWidth: '300px',
        }}
      >
        {displaySubtitle}
      </p>
    </div>
  );
}
