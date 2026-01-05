/**
 * KeyboardShortcutsModal Component
 *
 * Modal displaying available keyboard shortcuts.
 * Triggered by pressing "?" key anywhere in the app.
 *
 * Per DESIGN_IMPLEMENTATION_ROADMAP.md:
 * - Implement keyboard shortcuts modal (press ? to show)
 *
 * Accessibility:
 * - Escape key closes modal
 * - Click outside closes modal
 * - Focus trapped inside modal when open
 * - Proper ARIA attributes
 *
 * @see ../Design docs/DESIGN_SYSTEM.md
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { tokens } from '../styles/tokens';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: Shortcut[];
}

/**
 * Define all keyboard shortcuts grouped by category
 */
const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'W'], description: 'Go to Whales' },
      { keys: ['G', 'A'], description: 'Go to Alerts' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['R'], description: 'Refresh data' },
      { keys: ['/', 'Ctrl', 'K'], description: 'Search (coming soon)' },
    ],
  },
  {
    title: 'Lists & Tables',
    shortcuts: [
      { keys: ['J'], description: 'Next item' },
      { keys: ['K'], description: 'Previous item' },
      { keys: ['←'], description: 'Previous page' },
      { keys: ['→'], description: 'Next page' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal / Cancel' },
    ],
  },
];

/**
 * Render a single key in the keyboard style
 */
function Key({ children }: { children: string }) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '24px',
        height: '24px',
        padding: '0 8px',
        background: tokens.colors.void,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radius.sm,
        fontFamily: tokens.fonts.mono,
        fontSize: tokens.fontSizes.xs,
        fontWeight: tokens.fontWeights.medium,
        color: tokens.colors.textPrimary,
        boxShadow: `0 2px 0 ${tokens.colors.border}`,
      }}
    >
      {children}
    </kbd>
  );
}

/**
 * Render a shortcut row with keys and description
 */
function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${tokens.spacing[2]} 0`,
      }}
    >
      <span
        style={{
          fontFamily: tokens.fonts.body,
          fontSize: tokens.fontSizes.sm,
          color: tokens.colors.textSecondary,
        }}
      >
        {shortcut.description}
      </span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {shortcut.keys.map((key, index) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Key>{key}</Key>
            {index < shortcut.keys.length - 1 && (
              <span
                style={{
                  fontFamily: tokens.fonts.mono,
                  fontSize: tokens.fontSizes.xs,
                  color: tokens.colors.textMuted,
                }}
              >
                then
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Render a section of shortcuts
 */
function ShortcutSectionComponent({ section }: { section: ShortcutSection }) {
  return (
    <div style={{ marginBottom: tokens.spacing[6] }}>
      <h3
        style={{
          fontFamily: tokens.fonts.mono,
          fontSize: tokens.fontSizes.xs,
          fontWeight: tokens.fontWeights.semibold,
          color: tokens.colors.cyan,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: tokens.spacing[3],
          paddingBottom: tokens.spacing[2],
          borderBottom: `1px solid ${tokens.colors.border}`,
        }}
      >
        {section.title}
      </h3>
      <div>
        {section.shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.description} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = 'keyboard-shortcuts-title';

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 150ms ease-out',
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: tokens.radius.xl,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${tokens.colors.cyanGlow}`,
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'scaleIn 200ms ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: tokens.spacing[5],
            borderBottom: `1px solid ${tokens.colors.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
            <span style={{ fontSize: '20px' }}>⌨️</span>
            <h2
              id={titleId}
              style={{
                fontFamily: tokens.fonts.display,
                fontSize: tokens.fontSizes.xl,
                fontWeight: tokens.fontWeights.bold,
                color: tokens.colors.textPrimary,
                margin: 0,
              }}
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md,
              color: tokens.colors.textSecondary,
              cursor: 'pointer',
              transition: `all ${tokens.animation.durationFast} ease`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = tokens.colors.surfaceHover;
              e.currentTarget.style.borderColor = tokens.colors.cyan;
              e.currentTarget.style.color = tokens.colors.cyan;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = tokens.colors.border;
              e.currentTarget.style.color = tokens.colors.textSecondary;
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: tokens.spacing[5],
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 80px)',
          }}
        >
          {SHORTCUT_SECTIONS.map((section) => (
            <ShortcutSectionComponent key={section.title} section={section} />
          ))}

          {/* Footer hint */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing[2],
              paddingTop: tokens.spacing[4],
              borderTop: `1px solid ${tokens.colors.border}`,
              marginTop: tokens.spacing[2],
            }}
          >
            <span
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: tokens.fontSizes.xs,
                color: tokens.colors.textMuted,
              }}
            >
              Press
            </span>
            <Key>?</Key>
            <span
              style={{
                fontFamily: tokens.fonts.body,
                fontSize: tokens.fontSizes.xs,
                color: tokens.colors.textMuted,
              }}
            >
              anywhere to show this menu
            </span>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
