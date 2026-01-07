/**
 * PolyWolyTroly Design Tokens
 *
 * Complete design system tokens based on DESIGN_SYSTEM.md
 * "Teenage hacker genius meets Wall Street terminal"
 *
 * @see ../../../Design docs/DESIGN_SYSTEM.md
 */

export const tokens = {
  /**
   * Color Palette
   * Primary: Void black base with cyan accents
   * Semantic: Profit green, loss red
   */
  colors: {
    // Base colors
    void: '#0a0a0f',           // Background base, the infinite dark
    surface: '#12121a',         // Cards, elevated surfaces
    surfaceHover: '#1a1a24',    // Interactive states
    border: '#2a2a3a',          // Subtle separators
    muted: '#4a4a5a',           // Disabled states

    // Primary accent (Cyan)
    cyan: '#00fff0',
    cyanGlow: 'rgba(0, 255, 240, 0.2)',
    cyanDim: '#00b8a9',

    // Secondary accent (Magenta)
    magenta: '#ff2d92',
    magentaGlow: 'rgba(255, 45, 146, 0.2)',

    // Tertiary accent (Purple)
    purple: '#a855f7',

    // Semantic colors
    profit: '#00ff88',
    profitGlow: 'rgba(0, 255, 136, 0.2)',
    profitDim: '#00cc6a',
    loss: '#ff3366',
    lossGlow: 'rgba(255, 51, 102, 0.2)',
    warning: '#ffaa00',

    // Live status (distinct from profit green)
    live: '#22c55e',
    liveGlow: 'rgba(34, 197, 94, 0.3)',
    livePulse: 'rgba(34, 197, 94, 0.6)',

    // Trading-specific
    neutral: '#888899',
    neutralGlow: 'rgba(136, 136, 153, 0.2)',

    // Text colors
    textPrimary: '#f0f0f5',
    textSecondary: '#8888aa',
    textMuted: '#555566',
    textInverse: '#0a0a0f',
  },

  /**
   * Typography
   * Display: Exo 2 for headlines
   * Mono: JetBrains Mono for data
   * Body: Space Grotesk for UI
   */
  fonts: {
    display: "'Exo 2', 'SF Pro Display', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    body: "'Space Grotesk', 'SF Pro Text', system-ui, sans-serif",
  },

  /**
   * Font Sizes (rem)
   * Based on 16px base
   */
  fontSizes: {
    xxs: '0.65rem',   // 10px - Micro labels
    xs: '0.75rem',    // 12px - Small labels
    sm: '0.875rem',   // 14px - Body text
    base: '1rem',     // 16px - Default
    lg: '1.125rem',   // 18px - Large body
    xl: '1.25rem',    // 20px - Section headers
    '2xl': '1.5rem',  // 24px - Card titles
    '3xl': '2rem',    // 32px - Page headers
    '4xl': '2.5rem',  // 40px - Hero text
    '5xl': '3.5rem',  // 56px - Display
    '6xl': '5rem',    // 80px - Massive display
  },

  /**
   * Font Weights
   */
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  /**
   * Spacing Scale (rem)
   * Based on 4px grid
   */
  spacing: {
    0: '0',
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
  },

  /**
   * Border Radius
   */
  radius: {
    sm: '4px',       // Inputs, small elements
    md: '8px',       // Buttons, tags
    lg: '12px',      // Cards, modals
    xl: '16px',      // Large cards
    '2xl': '24px',   // Hero sections
    full: '9999px',  // Pills, avatars
  },

  /**
   * Animation
   */
  animation: {
    // Timing functions
    easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
    easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',

    // Durations
    durationInstant: '50ms',
    durationFast: '150ms',
    durationNormal: '250ms',
    durationSlow: '400ms',
    durationSlower: '600ms',
    durationSlowest: '1000ms',
  },

  /**
   * Responsive Breakpoints
   */
  breakpoints: {
    sm: '640px',     // Mobile landscape
    md: '768px',     // Tablet portrait
    lg: '1024px',    // Tablet landscape / Small desktop
    xl: '1280px',    // Desktop
    '2xl': '1536px', // Large desktop
    '3xl': '1920px', // Ultra-wide
  },

  /**
   * Z-Index Scale
   */
  zIndex: {
    base: 0,
    dropdown: 100,
    sticky: 200,
    modal: 300,
    tooltip: 400,
    notification: 500,
  },

  /**
   * Shadows
   */
  shadows: {
    glow: {
      cyan: '0 0 20px rgba(0, 255, 240, 0.2), 0 0 40px rgba(0, 255, 240, 0.1)',
      profit: '0 0 20px rgba(0, 255, 136, 0.2)',
      loss: '0 0 20px rgba(255, 51, 102, 0.2)',
      magenta: '0 0 20px rgba(255, 45, 146, 0.2)',
    },
    card: '0 4px 20px rgba(0, 0, 0, 0.3)',
    cardHover: '0 0 30px rgba(0, 255, 240, 0.2), inset 0 1px 0 rgba(0, 255, 240, 0.5)',
  },
} as const;

/**
 * Type for accessing tokens in TypeScript
 */
export type Tokens = typeof tokens;
export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
