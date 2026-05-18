import type { Player, FeedbackCell, Feedback } from './types';

const ROLE_GROUPS: Record<string, string[]> = {
  Duelist:    ['Duelist'],
  Initiator:  ['Initiator', 'Flex'],
  Controller: ['Controller'],
  Sentinel:   ['Sentinel', 'Flex'],
  Flex:       ['Initiator', 'Sentinel', 'Flex'],
};

const TITLE_TIERS: Record<string, string[]> = {
  S: ['Champions 2021', 'Champions 2022', 'Champions 2023', 'Champions 2024', 'Champions 2025'],
  A: [
    'Masters Reykjavik 2021', 'Masters Berlim 2021', 'Masters Reykjavik 2022',
    'Masters Copenhagen 2022', 'Masters Tokyo 2023', 'Masters Shanghai 2024',
    'Masters Bangkok 2025', 'Masters Santiago 2026',
    'VCT Americas 2022', 'VCT Americas 2023', 'VCT Americas 2024', 'VCT Americas 2025',
  ],
};

export function getTitleTier(title: string): string | null {
  for (const [tier, list] of Object.entries(TITLE_TIERS)) {
    if (list.includes(title)) return tier;
  }
  return null;
}

export function formatTitles(titles: string[]): string {
  if (titles.length === 0) return 'Nenhum';
  if (titles.length === 1) return titles[0];
  return `${titles[0]} +${titles.length - 1}`;
}

// ── Individual attribute comparisons ─────────────────────────────────────────

function compareCountry(guess: Player, target: Player): FeedbackCell {
  return {
    attr: 'country',
    value: guess.country,
    status: guess.country === target.country ? 'correct' : 'wrong',
    hint: null,
  };
}

function compareTeam(guess: Player, target: Player): FeedbackCell {
  return {
    attr: 'team',
    value: guess.team,
    status: guess.team === target.team ? 'correct' : 'wrong',
    hint: null,
  };
}

function compareAge(guess: Player, target: Player): FeedbackCell {
  const diff = target.age - guess.age;
  const status = diff === 0 ? 'correct' : Math.abs(diff) <= 3 ? 'close' : 'wrong';
  return { attr: 'age', value: guess.age, status, hint: diff === 0 ? null : diff > 0 ? '↑' : '↓' };
}

function compareRole(guess: Player, target: Player): FeedbackCell {
  const gr = guess.role ?? '';
  const tr = target.role ?? '';
  if (gr === tr) return { attr: 'role', value: gr, status: 'correct', hint: null };

  const gBase = gr.replace(' (Flex)', '');
  const tBase = tr.replace(' (Flex)', '');
  if (gBase === tBase) return { attr: 'role', value: gr, status: 'close', hint: null };

  const sameGroup =
    (ROLE_GROUPS[gBase] ?? []).includes(tBase) ||
    (ROLE_GROUPS[tBase] ?? []).includes(gBase);
  return { attr: 'role', value: gr, status: sameGroup ? 'close' : 'wrong', hint: null };
}

function compareTitles(guess: Player, target: Player): FeedbackCell {
  const gT = (guess.titles ?? []).filter(t => t !== 'Nenhum').sort();
  const tT = (target.titles ?? []).filter(t => t !== 'Nenhum').sort();

  if (gT.length === 0 && tT.length === 0) {
    return { attr: 'titles', value: 'Nenhum', status: 'correct', hint: null, fullList: [] };
  }
  const identical = gT.length === tT.length && gT.every((t, i) => t === tT[i]);
  return {
    attr: 'titles',
    value: gT.length === 0 ? 'Nenhum' : formatTitles(gT),
    status: identical ? 'correct' : 'wrong',
    hint: null,
    fullList: gT,
  };
}

function compareYearsActive(guess: Player, target: Player): FeedbackCell {
  const gY = guess.yearsActive ?? 0;
  const tY = target.yearsActive ?? 0;
  const diff = tY - gY;
  const status = diff === 0 ? 'correct' : Math.abs(diff) <= 1 ? 'close' : 'wrong';
  return { attr: 'yearsActive', value: gY, status, hint: diff === 0 ? null : diff > 0 ? '↑' : '↓' };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function compareGuess(guess: Player, target: Player): Feedback {
  return [
    compareCountry(guess, target),
    compareTeam(guess, target),
    compareAge(guess, target),
    compareRole(guess, target),
    compareTitles(guess, target),
    compareYearsActive(guess, target),
  ];
}
