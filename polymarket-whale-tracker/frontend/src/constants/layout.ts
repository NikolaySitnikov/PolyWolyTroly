/**
 * Layout Constants
 *
 * Centralized layout measurements for consistent spacing.
 * These values must be kept in sync with the component implementations.
 */

export const LAYOUT = {
  /** Header heights */
  header: {
    mobile: '60px',
    desktop: '70px',
  },

  /** MobileNav height (excluding safe area) */
  mobileNav: {
    height: '70px',
  },

  /** Content padding to account for fixed header and mobile nav */
  content: {
    /** paddingTop = header height + extra spacing */
    paddingTop: {
      mobile: '80px',  // 60px header + 20px spacing
      desktop: '100px', // 70px header + 30px spacing
    },
    /** paddingBottom = mobile nav height + extra spacing + safe area */
    paddingBottom: {
      mobile: 'calc(70px + 20px + env(safe-area-inset-bottom))', // nav + spacing + safe area
      desktop: '32px',
    },
  },
} as const;
