import type { DailyState, RoundResult } from './types';
import { getDailyDateKey } from './daily';

/** Key format matches the existing production game for save-state compatibility. */
function dailyKey(league: string): string {
  return `valorandle_daily_${league}_${getDailyDateKey()}`;
}

export function loadDailyState(league: string): DailyState | null {
  try {
    const raw = localStorage.getItem(dailyKey(league));
    return raw ? (JSON.parse(raw) as DailyState) : null;
  } catch { return null; }
}

export function saveDailyState(league: string, state: DailyState): void {
  try {
    localStorage.setItem(dailyKey(league), JSON.stringify(state));
    pruneOldStates();
  } catch { /* storage full */ }
}

/** Keep at most 7 daily states to avoid filling localStorage. */
function pruneOldStates(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('valorandle_daily_'));
    if (keys.length <= 7) return;
    keys.sort().slice(0, keys.length - 7).forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function generateShareText(roundResults: RoundResult[], lang: string): string {
  const emoji: Record<string, string> = { correct: '🟩', close: '🟨', wrong: '🟥' };
  const date = getDailyDateKey();
  let text = `Valorandle Daily ${date}\n\n`;
  roundResults.forEach((round, i) => {
    text += `Round ${i + 1}: `;
    if (!round.won) {
      text += '❌\n';
    } else {
      text += round.guesses
        .map(g => g.feedback.map(f => emoji[f.status]).join(''))
        .join('\n') + '\n';
    }
    text += '\n';
  });
  text += '🎮 valorandle.com';
  return text;
}
