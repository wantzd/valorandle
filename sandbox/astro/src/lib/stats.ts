import type { Stats } from './types';

const LS_STATS = 'valorandle_stats';

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(LS_STATS);
    if (!raw) return { played: 0, wins: 0, streak: 0, maxStreak: 0 };
    return JSON.parse(raw) as Stats;
  } catch {
    return { played: 0, wins: 0, streak: 0, maxStreak: 0 };
  }
}

export function saveStats(stats: Stats): void {
  try { localStorage.setItem(LS_STATS, JSON.stringify(stats)); } catch { /* storage full */ }
}

export function recordResult(won: boolean): void {
  const stats = loadStats();
  stats.played++;
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
  } else {
    stats.streak = 0;
  }
  saveStats(stats);
}
