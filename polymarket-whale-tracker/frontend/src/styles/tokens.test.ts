/**
 * Design Tokens Tests
 *
 * TDD: RED phase - These tests define what our design tokens should contain.
 * Based on DESIGN_SYSTEM.md specifications.
 */

import { describe, it, expect } from 'vitest';
import { tokens } from './tokens';

describe('Design Tokens', () => {
  describe('Colors', () => {
    it('should have void black as the base background color', () => {
      expect(tokens.colors.void).toBe('#0a0a0f');
    });

    it('should have surface colors for cards and elevated elements', () => {
      expect(tokens.colors.surface).toBe('#12121a');
      expect(tokens.colors.surfaceHover).toBe('#1a1a24');
    });

    it('should have border color for separators', () => {
      expect(tokens.colors.border).toBe('#2a2a3a');
    });

    it('should have primary accent color (cyan)', () => {
      expect(tokens.colors.cyan).toBe('#00fff0');
      expect(tokens.colors.cyanGlow).toBe('rgba(0, 255, 240, 0.2)');
      expect(tokens.colors.cyanDim).toBe('#00b8a9');
    });

    it('should have secondary accent color (magenta)', () => {
      expect(tokens.colors.magenta).toBe('#ff2d92');
      expect(tokens.colors.magentaGlow).toBe('rgba(255, 45, 146, 0.2)');
    });

    it('should have semantic profit/loss colors', () => {
      expect(tokens.colors.profit).toBe('#00ff88');
      expect(tokens.colors.profitGlow).toBe('rgba(0, 255, 136, 0.2)');
      expect(tokens.colors.loss).toBe('#ff3366');
      expect(tokens.colors.lossGlow).toBe('rgba(255, 51, 102, 0.2)');
    });

    it('should have text colors with proper hierarchy', () => {
      expect(tokens.colors.textPrimary).toBe('#f0f0f5');
      expect(tokens.colors.textSecondary).toBe('#8888aa');
      expect(tokens.colors.textMuted).toBe('#555566');
    });

    it('should have warning color', () => {
      expect(tokens.colors.warning).toBe('#ffaa00');
    });

    it('should have purple accent for tertiary elements', () => {
      expect(tokens.colors.purple).toBe('#a855f7');
    });
  });

  describe('Typography', () => {
    it('should have display font for headlines', () => {
      expect(tokens.fonts.display).toContain('Exo 2');
    });

    it('should have monospace font for data/numbers', () => {
      expect(tokens.fonts.mono).toContain('JetBrains Mono');
    });

    it('should have body font for UI text', () => {
      expect(tokens.fonts.body).toContain('Space Grotesk');
    });
  });

  describe('Spacing', () => {
    it('should have spacing scale based on 4px grid', () => {
      expect(tokens.spacing[1]).toBe('0.25rem'); // 4px
      expect(tokens.spacing[2]).toBe('0.5rem');  // 8px
      expect(tokens.spacing[4]).toBe('1rem');    // 16px
      expect(tokens.spacing[6]).toBe('1.5rem');  // 24px
      expect(tokens.spacing[8]).toBe('2rem');    // 32px
    });
  });

  describe('Border Radius', () => {
    it('should have radius scale for different element sizes', () => {
      expect(tokens.radius.sm).toBe('4px');
      expect(tokens.radius.md).toBe('8px');
      expect(tokens.radius.lg).toBe('12px');
      expect(tokens.radius.xl).toBe('16px');
      expect(tokens.radius.full).toBe('9999px');
    });
  });

  describe('Animation', () => {
    it('should have easing functions', () => {
      expect(tokens.animation.easeOutExpo).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    });

    it('should have duration scale', () => {
      expect(tokens.animation.durationFast).toBe('150ms');
      expect(tokens.animation.durationNormal).toBe('250ms');
      expect(tokens.animation.durationSlow).toBe('400ms');
    });
  });

  describe('Breakpoints', () => {
    it('should have responsive breakpoints', () => {
      expect(tokens.breakpoints.sm).toBe('640px');
      expect(tokens.breakpoints.md).toBe('768px');
      expect(tokens.breakpoints.lg).toBe('1024px');
      expect(tokens.breakpoints.xl).toBe('1280px');
    });
  });
});
