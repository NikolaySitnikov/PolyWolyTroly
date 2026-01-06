/**
 * useSound Hook
 *
 * Sound design system for PolyWolyTroly.
 * Uses Web Audio API to generate brand-appropriate sounds:
 * - Sonar ping: Short blip for regular notifications
 * - Whale call: Ethereal tone for whale alerts
 * - Cha-ching: Success sound for large deposits
 *
 * All sounds are synthesized (no audio files needed).
 * Respects user preference for sound enabled/disabled.
 *
 * @see ../contexts/SettingsContext.tsx - soundEnabled setting
 */

import { useCallback, useRef, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export type SoundType = 'sonar' | 'whale' | 'chaching' | 'success' | 'error';

interface UseSoundResult {
  /** Play a sound effect */
  playSound: (type: SoundType) => void;
  /** Preview a sound (always plays regardless of settings) */
  previewSound: (type: SoundType) => void;
  /** Whether sound is currently enabled */
  soundEnabled: boolean;
}

/**
 * Create AudioContext lazily (required for browser autoplay policies)
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Generate sonar ping sound
 * Short, high-pitched blip - submarine radar vibe
 */
function playSonarPing(ctx: AudioContext, volume: number = 0.3): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // High-pitched sine wave
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

  // Quick attack, quick decay
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
}

/**
 * Generate whale call sound
 * Ethereal, low-frequency sweep - whale song vibe
 */
function playWhaleCall(ctx: AudioContext, volume: number = 0.25): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Low-frequency sweep
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(150, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
  oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);

  // Low-pass filter for muffled underwater effect
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, ctx.currentTime);

  // Slow attack, slow decay for dreamy feel
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.15);
  gainNode.gain.setValueAtTime(volume, ctx.currentTime + 0.4);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.8);
}

/**
 * Generate cha-ching sound
 * Cash register / coin sound for big money
 */
function playChaChing(ctx: AudioContext, volume: number = 0.3): void {
  // Two-tone coin sound
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode1 = ctx.createGain();
  const gainNode2 = ctx.createGain();

  osc1.connect(gainNode1);
  osc2.connect(gainNode2);
  gainNode1.connect(ctx.destination);
  gainNode2.connect(ctx.destination);

  // First tone (higher)
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1567.98, ctx.currentTime); // G6
  gainNode1.gain.setValueAtTime(0, ctx.currentTime);
  gainNode1.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gainNode1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  // Second tone (even higher, delayed)
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(2093.00, ctx.currentTime + 0.08); // C7
  gainNode2.gain.setValueAtTime(0, ctx.currentTime);
  gainNode2.gain.setValueAtTime(0, ctx.currentTime + 0.08);
  gainNode2.gain.linearRampToValueAtTime(volume * 0.8, ctx.currentTime + 0.09);
  gainNode2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.2);
  osc2.start(ctx.currentTime + 0.08);
  osc2.stop(ctx.currentTime + 0.3);
}

/**
 * Generate success sound
 * Upward arpeggio - positive feedback
 */
function playSuccess(ctx: AudioContext, volume: number = 0.2): void {
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const startTime = ctx.currentTime + i * 0.05;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

    osc.start(startTime);
    osc.stop(startTime + 0.2);
  });
}

/**
 * Generate error sound
 * Low buzzer - negative feedback
 */
function playError(ctx: AudioContext, volume: number = 0.2): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Low, slightly dissonant
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.setValueAtTime(140, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.setValueAtTime(volume * 0.8, ctx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

/**
 * Play a sound by type
 */
function playSoundByType(type: SoundType, volume: number = 0.3): void {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    switch (type) {
      case 'sonar':
        playSonarPing(ctx, volume);
        break;
      case 'whale':
        playWhaleCall(ctx, volume);
        break;
      case 'chaching':
        playChaChing(ctx, volume);
        break;
      case 'success':
        playSuccess(ctx, volume);
        break;
      case 'error':
        playError(ctx, volume);
        break;
    }
  } catch (error) {
    // Silently fail if audio not supported
    console.warn('Audio playback failed:', error);
  }
}

/**
 * Hook for playing sounds with settings awareness
 */
export function useSound(): UseSoundResult {
  const { settings } = useSettings();
  const lastPlayedRef = useRef<number>(0);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      // Don't close shared context, just cleanup ref
    };
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      if (!settings.soundEnabled) return;

      // Debounce sounds (min 100ms between plays)
      const now = Date.now();
      if (now - lastPlayedRef.current < 100) return;
      lastPlayedRef.current = now;

      playSoundByType(type);
    },
    [settings.soundEnabled]
  );

  const previewSound = useCallback((type: SoundType) => {
    // Preview always plays regardless of settings
    playSoundByType(type);
  }, []);

  return {
    playSound,
    previewSound,
    soundEnabled: settings.soundEnabled,
  };
}

export default useSound;
