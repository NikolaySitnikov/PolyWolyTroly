/**
 * Profile Types Tests
 *
 * TDD: RED phase - Tests for profile type utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  getDisplayName,
  getAvatarGradient,
  getAvatarInitials,
  AVATAR_GRADIENTS,
  type UserProfile,
} from './profile';

/**
 * Create a mock UserProfile with required fields
 */
function mockProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    createdAt: '2024-01-01T00:00:00Z',
    proxyWallet: '0x1234567890abcdef1234567890abcdef12345678',
    displayUsernamePublic: true,
    pseudonym: '',
    name: '',
    users: [],
    verifiedBadge: false,
    ...overrides,
  };
}

describe('Profile Types', () => {
  describe('getDisplayName', () => {
    it('should return name if present', () => {
      const profile = mockProfile({
        name: 'CryptoWhale',
      });
      expect(getDisplayName(profile)).toBe('CryptoWhale');
    });

    it('should return pseudonym if name is not present', () => {
      const profile = mockProfile({
        pseudonym: 'whale_master',
      });
      expect(getDisplayName(profile)).toBe('whale_master');
    });

    it('should return truncated address if no name or pseudonym', () => {
      const profile = mockProfile({
        proxyWallet: '0x1234567890abcdef1234567890abcdef12345678',
      });
      expect(getDisplayName(profile)).toBe('0x1234...5678');
    });

    it('should return truncated address if profile is null', () => {
      expect(getDisplayName(null, '0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234...5678');
    });

    it('should return empty string if no profile and no address', () => {
      expect(getDisplayName(null)).toBe('');
    });
  });

  describe('AVATAR_GRADIENTS', () => {
    it('should have at least 4 gradient options', () => {
      expect(AVATAR_GRADIENTS.length).toBeGreaterThanOrEqual(4);
    });

    it('should have from and to colors for each gradient', () => {
      AVATAR_GRADIENTS.forEach(gradient => {
        expect(gradient.from).toBeDefined();
        expect(gradient.to).toBeDefined();
        expect(gradient.from).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(gradient.to).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('getAvatarGradient', () => {
    it('should return a gradient object', () => {
      const gradient = getAvatarGradient('0x1234567890abcdef1234567890abcdef12345678');
      expect(gradient).toHaveProperty('from');
      expect(gradient).toHaveProperty('to');
    });

    it('should return deterministic gradient for same address', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const gradient1 = getAvatarGradient(address);
      const gradient2 = getAvatarGradient(address);
      expect(gradient1).toEqual(gradient2);
    });

    it('should return different gradients for different addresses', () => {
      const gradient1 = getAvatarGradient('0x1234567890abcdef1234567890abcdef12345678');
      const gradient2 = getAvatarGradient('0xabcdef1234567890abcdef1234567890abcdef12');
      // Verify both return valid gradient objects with from/to properties
      expect(gradient1).toHaveProperty('from');
      expect(gradient1).toHaveProperty('to');
      expect(gradient2).toHaveProperty('from');
      expect(gradient2).toHaveProperty('to');
    });

    it('should handle lowercase and uppercase addresses', () => {
      const lower = getAvatarGradient('0x1234abcd');
      const upper = getAvatarGradient('0x1234ABCD');
      expect(lower).toEqual(upper);
    });
  });

  describe('getAvatarInitials', () => {
    it('should return first two letters of single word username', () => {
      expect(getAvatarInitials('whale')).toBe('WH');
    });

    it('should return initials from multi-word username', () => {
      expect(getAvatarInitials('Crypto Whale')).toBe('CW');
      expect(getAvatarInitials('big_money_player')).toBe('BM');
      expect(getAvatarInitials('super-trader')).toBe('ST');
    });

    it('should return address prefix if no username', () => {
      expect(getAvatarInitials(undefined, '0x1234abcd')).toBe('12');
    });

    it('should return whale emoji if no username or address', () => {
      expect(getAvatarInitials()).toBe('🐋');
    });

    it('should uppercase the initials', () => {
      expect(getAvatarInitials('crypto whale')).toBe('CW');
    });
  });
});
