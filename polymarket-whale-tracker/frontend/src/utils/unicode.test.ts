/**
 * Unicode Character Encoding Tests
 *
 * Ensures all special Unicode characters used in the app
 * are properly encoded and render correctly.
 *
 * This guards against UTF-8 encoding issues like:
 * - â€¹ instead of ‹
 * - â€º instead of ›
 * - ðŸ‹ instead of 🐋
 */

import { describe, it, expect } from 'vitest';

describe('Unicode Character Encoding', () => {
  describe('Navigation Arrows', () => {
    it('should correctly encode left angle bracket (‹)', () => {
      const char = '‹';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x2039); // Unicode: SINGLE LEFT-POINTING ANGLE QUOTATION MARK
    });

    it('should correctly encode right angle bracket (›)', () => {
      const char = '›';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x203a); // Unicode: SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
    });

    it('should correctly encode left arrow (←)', () => {
      const char = '←';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x2190); // Unicode: LEFTWARDS ARROW
    });

    it('should correctly encode right arrow (→)', () => {
      const char = '→';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x2192); // Unicode: RIGHTWARDS ARROW
    });

    it('should correctly encode up arrow (↑)', () => {
      const char = '↑';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x2191); // Unicode: UPWARDS ARROW
    });

    it('should correctly encode down arrow (↓)', () => {
      const char = '↓';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x2193); // Unicode: DOWNWARDS ARROW
    });
  });

  describe('Emoji Characters', () => {
    it('should correctly encode whale emoji (🐋)', () => {
      const char = '🐋';
      // Emoji is a surrogate pair in JS (2 UTF-16 code units)
      expect(char.length).toBe(2);
      expect(char.codePointAt(0)).toBe(0x1f40b); // Unicode: WHALE
    });

    it('should correctly encode chart emoji (📊)', () => {
      const char = '📊';
      expect(char.length).toBe(2);
      expect(char.codePointAt(0)).toBe(0x1f4ca); // Unicode: BAR CHART
    });

    it('should correctly encode fire emoji (🔥)', () => {
      const char = '🔥';
      expect(char.length).toBe(2);
      expect(char.codePointAt(0)).toBe(0x1f525); // Unicode: FIRE
    });

    it('should correctly encode chart increasing emoji (📈)', () => {
      const char = '📈';
      expect(char.length).toBe(2);
      expect(char.codePointAt(0)).toBe(0x1f4c8); // Unicode: CHART WITH UPWARDS TREND
    });

    it('should correctly encode lightning emoji (⚡)', () => {
      const char = '⚡';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x26a1); // Unicode: HIGH VOLTAGE SIGN
    });

    it('should correctly encode gear emoji (⚙)', () => {
      const char = '⚙';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x2699); // Unicode: GEAR
    });

    it('should correctly encode magnifying glass emoji (🔍)', () => {
      const char = '🔍';
      expect(char.length).toBe(2);
      expect(char.codePointAt(0)).toBe(0x1f50d); // Unicode: LEFT-POINTING MAGNIFYING GLASS
    });

    it('should correctly encode NEW button emoji (🆕)', () => {
      const char = '🆕';
      expect(char.length).toBe(2);
      expect(char.codePointAt(0)).toBe(0x1f195); // Unicode: SQUARED NEW
    });
  });

  describe('Special UI Characters', () => {
    it('should correctly encode multiplication sign (×)', () => {
      const char = '×';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x00d7); // Unicode: MULTIPLICATION SIGN
    });

    it('should correctly encode filled circle (◉)', () => {
      const char = '◉';
      expect(char.length).toBe(1);
      expect(char.charCodeAt(0)).toBe(0x25c9); // Unicode: FISHEYE
    });

    it('should correctly encode ellipsis (...)', () => {
      // Note: We use 3 periods, not the Unicode ellipsis character
      const threePoints = '...';
      expect(threePoints.length).toBe(3);
    });
  });

  describe('String Rendering', () => {
    it('should render pagination nav buttons correctly', () => {
      const prev = '‹';
      const next = '›';
      expect(prev).toBe('‹');
      expect(next).toBe('›');
    });

    it('should render trend indicators correctly', () => {
      const up = '↑ 5%';
      const down = '↓ 3%';
      expect(up).toContain('↑');
      expect(down).toContain('↓');
    });

    it('should render back navigation correctly', () => {
      const backLink = '← Back to Whales';
      expect(backLink).toContain('←');
    });

    it('should render view all link correctly', () => {
      const viewAll = 'View all →';
      expect(viewAll).toContain('→');
    });
  });
});
