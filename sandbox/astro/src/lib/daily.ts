import type { Player } from './types';

export const MAX_GUESSES = 8;
export const DAILY_ROUNDS = 5;

/** Returns today's date key in UTC-3 (Brazil time). Same logic as original game-logic.js. */
export function getDailyDateKey(): string {
  const now = new Date();
  const utcMinus3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return utcMinus3.toISOString().slice(0, 10);
}

/** Deterministic RNG seeded by a string — identical to game-logic.js implementation. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function () {
    h += h << 13; h ^= h >> 7;
    h += h << 3;  h ^= h >> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

/** Returns 5 shuffled players for the daily challenge (deterministic per date). */
export function getDailyPlayers(players: Player[]): Player[] {
  const dateKey = getDailyDateKey();
  const rng = seededRandom(`valorandle-${dateKey}`);
  const arr = [...players];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, DAILY_ROUNDS);
}

/** Returns a random player excluding those already used. */
export function getRandomPlayer(players: Player[], excludeIds: string[] = []): Player {
  const pool = players.filter(p => !excludeIds.includes(p.id));
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Milliseconds until the next daily reset (03:00 UTC = 00:00 BRT). */
export function msUntilNextDaily(): number {
  const now = new Date();
  const utcMinus3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const tomorrow = new Date(utcMinus3);
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const nextReset = new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000);
  return nextReset.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
