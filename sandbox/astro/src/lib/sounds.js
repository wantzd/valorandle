/**
 * sounds.js — Shared Web Audio synthesizer for all Valorandle game modes.
 *
 * Matches the Pro Players sound design exactly (same tones, same timings).
 * Import { playSound, loadSoundPref, saveSoundPref } and manage soundOn state locally.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, dur, vol = 0.07, type = 'sine', startDelay = 0) {
  try {
    const ctx  = getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + dur + 0.05);
  } catch (_) {}
}

/**
 * Play a sound effect if `enabled` is true.
 *
 * Types:
 *   'flip'      — brief tone on each cell reveal (stagger feedback)
 *   'correct'   — ascending triad on round win
 *   'wrong'     — low tone on round loss
 *   'daily_win' — ascending four-note fanfare on daily complete
 */
export function playSound(type, enabled = true) {
  if (!enabled) return;
  switch (type) {
    case 'flip':
      playTone(480 + Math.random() * 80, 0.07, 0.035, 'sine');
      break;
    case 'correct':
      playTone(523, 0.15, 0.08, 'sine', 0.00);
      playTone(659, 0.15, 0.08, 'sine', 0.12);
      playTone(784, 0.25, 0.08, 'sine', 0.24);
      break;
    case 'wrong':
      playTone(200, 0.22, 0.06, 'triangle');
      break;
    case 'daily_win':
      [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.2, 0.07, 'sine', i * 0.1));
      break;
  }
}

const STORAGE_KEY = 'valorandle_sound';

export function loadSoundPref()      { return localStorage.getItem(STORAGE_KEY) !== '0'; }
export function saveSoundPref(on)    { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); }

/**
 * Schedule sounds to match the staggered cell-flip animation.
 *
 * @param {number}   cols      — number of attribute columns (excluding skin/name cell)
 * @param {number}   staggerMs — delay between columns in ms (default 115)
 * @param {string}   result    — 'correct' | 'wrong'
 * @param {boolean}  enabled
 * @returns {number}  total ms before result sound fires (use to gate UI unlock)
 */
export function scheduleFlipSounds(cols, staggerMs = 115, result, enabled = true) {
  for (let i = 0; i < cols; i++) {
    setTimeout(() => playSound('flip', enabled), (i + 1) * staggerMs);
  }
  const totalMs = cols * staggerMs + 320;
  setTimeout(() => playSound(result, enabled), totalMs);
  return totalMs;
}
