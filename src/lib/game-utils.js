// Shared utilities used across all game modes

export function getDailyDateKey() {
  const now       = new Date();
  const utcMinus3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return utcMinus3.toISOString().slice(0, 10);
}

export function msUntilNextDaily() {
  const now       = new Date();
  const utcMinus3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const tomorrow  = new Date(utcMinus3);
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000).getTime() - now.getTime();
}

export function formatCountdown(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function setCookie(name, value, days) {
  const expires = days
    ? `; expires=${new Date(Date.now() + days * 864e5).toUTCString()}`
    : '';
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function loadLang() {
  try {
    const ls = localStorage.getItem('valorandle_lang');
    if (ls) return ls;
  } catch {}
  const ck = getCookie('valorandle_lang');
  if (ck) return ck;
  return (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export function saveLang(lang) {
  try { localStorage.setItem('valorandle_lang', lang); } catch {}
  setCookie('valorandle_lang', lang, 365);
}

// ── Seeded PRNG (FNV-1a based) ────────────────────────────────────────────────
export function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function() {
    h += h << 13; h ^= h >> 7;
    h += h << 3;  h ^= h >> 17;
    h += h << 5;
    return ((h >>> 0) / 4294967296);
  };
}

export function loadStats() {
  const fallback = { played: 0, wins: 0, streak: 0, maxStreak: 0, lastPlayedDate: null };
  try {
    const raw = localStorage.getItem('valorandle_stats');
    const parsed = raw ? JSON.parse(raw) : fallback;
    if (!parsed.lastPlayedDate) parsed.lastPlayedDate = findLatestCompletedDailyDate();
    const stats = normalizeStats(parsed, getDailyDateKey());
    localStorage.setItem('valorandle_stats', JSON.stringify(stats));
    return stats;
  } catch {
    return fallback;
  }
}

function findLatestCompletedDailyDate() {
  let latest = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key?.match(/^valorandle_daily_.+_(\d{4}-\d{2}-\d{2})$/);
      if (!match || (latest && match[1] <= latest)) continue;
      const state = JSON.parse(localStorage.getItem(key) || 'null');
      if (state?.dailyDone) latest = match[1];
    }
  } catch {}
  return latest;
}

export function dayDifference(fromDate, toDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(toDate || '')) return null;
  return Math.round((Date.parse(toDate + 'T00:00:00Z') - Date.parse(fromDate + 'T00:00:00Z')) / 864e5);
}

export function normalizeStats(input, today = getDailyDateKey()) {
  const stats = {
    played: Number(input?.played) || 0,
    wins: Number(input?.wins) || 0,
    streak: Number(input?.streak) || 0,
    maxStreak: Number(input?.maxStreak) || 0,
    lastPlayedDate: input?.lastPlayedDate || null,
  };
  const gap = dayDifference(stats.lastPlayedDate, today);
  if (gap === null || gap > 1) stats.streak = 0;
  return stats;
}

export function recordDailyCompletion(input, today = getDailyDateKey(), won = false) {
  const stats = normalizeStats(input, today);
  if (stats.lastPlayedDate === today) return stats;
  const gap = dayDifference(stats.lastPlayedDate, today);
  stats.played += 1;
  if (won) stats.wins += 1;
  stats.streak = gap === 1 ? stats.streak + 1 : 1;
  stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
  stats.lastPlayedDate = today;
  return stats;
}
