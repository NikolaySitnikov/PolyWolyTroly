/**
 * CopyableAddress Component Tests
 *
 * Tests for the wallet address component with long-press to copy.
 * Per BRAND_GUIDELINES_EXTENDED.md:
 * - Long press on address: Copy to clipboard
 * - Haptic feedback on action
 * - Click to navigate (optional)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CopyableAddress } from './CopyableAddress';

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

// Mock vibrate API
const mockVibrate = vi.fn().mockReturnValue(true);
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
});

describe('CopyableAddress', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    mockVibrate.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

  describe('Rendering', () => {
    it('renders shortened address by default', () => {
      render(<CopyableAddress address={testAddress} />);
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    });

    it('renders full address when showFull is true', () => {
      render(<CopyableAddress address={testAddress} showFull />);
      expect(screen.getByText(testAddress)).toBeInTheDocument();
    });

    it('has monospace font family in style', () => {
      render(<CopyableAddress address={testAddress} />);
      const element = screen.getByTestId('copyable-address');
      const style = element.getAttribute('style');
      expect(style).toContain('JetBrains Mono');
    });
  });

  describe('Long Press to Copy', () => {
    it('copies address on long press', async () => {
      render(<CopyableAddress address={testAddress} />);
      const element = screen.getByTestId('copyable-address');

      // Start long press
      await act(async () => {
        fireEvent.touchStart(element);
      });

      // Wait for threshold
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Allow async clipboard call to resolve
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockWriteText).toHaveBeenCalledWith(testAddress);
    });

    it('triggers haptic feedback on copy', async () => {
      render(<CopyableAddress address={testAddress} />);
      const element = screen.getByTestId('copyable-address');

      await act(async () => {
        fireEvent.touchStart(element);
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Allow async operations to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockVibrate).toHaveBeenCalledWith(50);
    });

    it('does not copy if released before threshold', async () => {
      render(<CopyableAddress address={testAddress} />);
      const element = screen.getByTestId('copyable-address');

      await act(async () => {
        fireEvent.touchStart(element);
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        fireEvent.touchEnd(element);
      });

      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });

  describe('Click Navigation', () => {
    it('calls onClick when provided and not long-pressed', async () => {
      const handleClick = vi.fn();
      render(<CopyableAddress address={testAddress} onClick={handleClick} />);
      const element = screen.getByTestId('copyable-address');

      // Quick tap (no long press)
      await act(async () => {
        fireEvent.click(element);
      });

      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Visual Feedback', () => {
    it('shows visual feedback during long press', async () => {
      render(<CopyableAddress address={testAddress} />);
      const element = screen.getByTestId('copyable-address');

      await act(async () => {
        fireEvent.touchStart(element);
      });

      // Should have pressed state - check transform style
      const style = element.getAttribute('style');
      expect(style).toContain('scale(0.97)');
    });

    it('shows copy success indicator after successful copy', async () => {
      // Use real timers for this test since waitFor doesn't work well with fake timers
      vi.useRealTimers();

      render(<CopyableAddress address={testAddress} />);
      const element = screen.getByTestId('copyable-address');

      // Directly call the copy handler by using keyboard shortcut (Ctrl+C)
      await act(async () => {
        fireEvent.keyDown(element, { key: 'c', ctrlKey: true });
      });

      // Allow async clipboard operation
      await act(async () => {
        await Promise.resolve();
      });

      // Check that copied indicator appears
      expect(screen.getByText(/Copied/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has appropriate aria label', () => {
      render(<CopyableAddress address={testAddress} />);
      const element = screen.getByTestId('copyable-address');
      expect(element).toHaveAttribute('aria-label', expect.stringContaining('Long press to copy'));
    });

    it('indicates copy action to screen readers', () => {
      render(<CopyableAddress address={testAddress} />);
      const element = screen.getByTestId('copyable-address');
      expect(element).toHaveAttribute('role', 'button');
    });
  });
});
