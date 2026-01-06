/**
 * useSound Hook Tests
 *
 * @see ./useSound.ts
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSound } from './useSound';
import { SettingsProvider } from '../contexts/SettingsContext';
import type { ReactNode } from 'react';

// Track AudioContext creation
let audioContextCreated = false;

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  destination = {};

  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }

  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }

  createBiquadFilter() {
    return {
      connect: vi.fn(),
      type: 'lowpass',
      frequency: {
        setValueAtTime: vi.fn(),
      },
    };
  }

  resume() {
    return Promise.resolve();
  }

  constructor() {
    audioContextCreated = true;
  }
}

// Setup AudioContext mock
const originalAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;

beforeEach(() => {
  audioContextCreated = false;
  (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
  localStorage.clear();
});

afterEach(() => {
  if (originalAudioContext) {
    (window as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
  }
});

// Wrapper with SettingsProvider
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SettingsProvider>{children}</SettingsProvider>;
  };
}

describe('useSound', () => {
  describe('initialization', () => {
    it('returns playSound and previewSound functions', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.playSound).toBe('function');
      expect(typeof result.current.previewSound).toBe('function');
    });

    it('returns soundEnabled from settings (default false)', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      expect(result.current.soundEnabled).toBe(false);
    });

    it('returns soundEnabled as true when settings have it enabled', () => {
      localStorage.setItem(
        'polywoly-settings',
        JSON.stringify({ soundEnabled: true })
      );

      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      expect(result.current.soundEnabled).toBe(true);
    });
  });

  describe('playSound', () => {
    it('does not create AudioContext when soundEnabled is false', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.playSound('sonar');
      });

      expect(audioContextCreated).toBe(false);
    });

    it('creates AudioContext when soundEnabled is true', () => {
      localStorage.setItem(
        'polywoly-settings',
        JSON.stringify({ soundEnabled: true })
      );

      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.playSound('sonar');
      });

      expect(audioContextCreated).toBe(true);
    });
  });

  describe('previewSound', () => {
    it('plays sound regardless of soundEnabled setting', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      // Sound is disabled by default
      expect(result.current.soundEnabled).toBe(false);

      // Preview should not throw when sound is disabled
      expect(() => {
        act(() => {
          result.current.previewSound('sonar');
        });
      }).not.toThrow();
    });
  });

  describe('sound types', () => {
    it('supports sonar sound type', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      // Should not throw
      expect(() => {
        act(() => {
          result.current.previewSound('sonar');
        });
      }).not.toThrow();
    });

    it('supports whale sound type', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      expect(() => {
        act(() => {
          result.current.previewSound('whale');
        });
      }).not.toThrow();
    });

    it('supports chaching sound type', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      expect(() => {
        act(() => {
          result.current.previewSound('chaching');
        });
      }).not.toThrow();
    });

    it('supports success sound type', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      expect(() => {
        act(() => {
          result.current.previewSound('success');
        });
      }).not.toThrow();
    });

    it('supports error sound type', () => {
      const { result } = renderHook(() => useSound(), {
        wrapper: createWrapper(),
      });

      expect(() => {
        act(() => {
          result.current.previewSound('error');
        });
      }).not.toThrow();
    });
  });
});
