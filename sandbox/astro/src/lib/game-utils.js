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

export function loadStats() {
  try {
    const raw = localStorage.getItem('valorandle_stats');
    return raw ? JSON.parse(raw) : { played: 0, wins: 0, streak: 0, maxStreak: 0 };
  } catch {
    return { played: 0, wins: 0, streak: 0, maxStreak: 0 };
  }
}
