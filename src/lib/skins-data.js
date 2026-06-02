// skins-data.js — Logic and I18N for the Skins game mode.
// The skins-db.json and bundle-patches.json are fetched at runtime from /data/.

import { getDailyDateKey } from './game-utils.js';

// ── Act boundaries ─────────────────────────────────────────────────────────────
// Each entry: [minPatchInt, ptLabel, enLabel]
// minPatchInt = major * 100 + minor  (e.g. patch "3.10" → 310, "2.02" → 202)
// This avoids the parseFloat trap where "2.10" < "2.9" as floats (2.1 < 2.9).
// Boundaries derived from /v1/seasons act startTimes + VALORANT biweekly cadence.
const ACT_BOUNDARIES = [
  [100,  'EP 1/Ato I',    'EP 1/Act I'],
  [103,  'EP 1/Ato II',   'EP 1/Act II'],
  [109,  'EP 1/Ato III',  'EP 1/Act III'],
  [200,  'EP 2/Ato I',    'EP 2/Act I'],
  [204,  'EP 2/Ato II',   'EP 2/Act II'],
  [208,  'EP 2/Ato III',  'EP 2/Act III'],
  [300,  'EP 3/Ato I',    'EP 3/Act I'],
  [305,  'EP 3/Ato II',   'EP 3/Act II'],
  [310,  'EP 3/Ato III',  'EP 3/Act III'],
  [400,  'EP 4/Ato I',    'EP 4/Act I'],
  [404,  'EP 4/Ato II',   'EP 4/Act II'],
  [408,  'EP 4/Ato III',  'EP 4/Act III'],
  [500,  'EP 5/Ato I',    'EP 5/Act I'],
  [504,  'EP 5/Ato II',   'EP 5/Act II'],
  [508,  'EP 5/Ato III',  'EP 5/Act III'],
  [600,  'EP 6/Ato I',    'EP 6/Act I'],
  [604,  'EP 6/Ato II',   'EP 6/Act II'],
  [608,  'EP 6/Ato III',  'EP 6/Act III'],
  [700,  'EP 7/Ato I',    'EP 7/Act I'],
  [704,  'EP 7/Ato II',   'EP 7/Act II'],
  [709,  'EP 7/Ato III',  'EP 7/Act III'],
  [800,  'EP 8/Ato I',    'EP 8/Act I'],
  [804,  'EP 8/Ato II',   'EP 8/Act II'],
  [808,  'EP 8/Ato III',  'EP 8/Act III'],
  [900,  'EP 9/Ato I',    'EP 9/Act I'],
  [904,  'EP 9/Ato II',   'EP 9/Act II'],
  [909,  'EP 9/Ato III',  'EP 9/Act III'],
  [1000, 'V25/Ato I',     'V25/Act I'],
  [1004, 'V25/Ato II',    'V25/Act II'],
  [1008, 'V25/Ato III',   'V25/Act III'],
  [1100, 'V25/Ato IV',    'V25/Act IV'],
  [1104, 'V25/Ato V',     'V25/Act V'],
  [1108, 'V25/Ato VI',    'V25/Act VI'],
  [1200, 'V26/Ato I',     'V26/Act I'],
  [1205, 'V26/Ato II',    'V26/Act II'],
  [1208, 'V26/Ato III',   'V26/Act III'],
];

/**
 * Converts a patch string like "3.10", "2.02", "5.0" to a sortable integer.
 * "3.10" → 310,  "2.02" → 202,  "5.0" → 500,  "10.04" → 1004
 * Avoids parseFloat("2.10") === 2.1 < parseFloat("2.9") === 2.9 (wrong order).
 */
function patchToInt(patchStr) {
  if (!patchStr) return -1;
  const dot = patchStr.indexOf('.');
  if (dot === -1) {
    const n = parseInt(patchStr, 10);
    return isNaN(n) ? -1 : n * 100;
  }
  const major = parseInt(patchStr.slice(0, dot), 10);
  const minor = parseInt(patchStr.slice(dot + 1), 10);
  if (isNaN(major) || isNaN(minor)) return -1;
  return major * 100 + minor;
}

/** Returns the index of the act a patch belongs to (for ↑/↓ comparison). */
function patchToActIndex(patchStr) {
  if (!patchStr) return -1;
  const p = patchToInt(patchStr);
  if (p === -1) return -1;
  let idx = 0;
  for (let i = 0; i < ACT_BOUNDARIES.length; i++) {
    if (p >= ACT_BOUNDARIES[i][0]) idx = i;
    else break;
  }
  return idx;
}

/** Returns a localised act label like "EP 5/Ato I" or "V25/Act III". */
export function patchToAct(patchStr, lang = 'pt-BR') {
  if (!patchStr) return '?';
  const idx = patchToActIndex(patchStr);
  if (idx === -1) return '?';
  return lang === 'en' ? ACT_BOUNDARIES[idx][2] : ACT_BOUNDARIES[idx][1];
}

// ── Edition ordering ───────────────────────────────────────────────────────────
export const EDITION_ORDER = {
  Select:    1,
  Deluxe:    2,
  Premium:   3,
  Exclusive: 4,
  Ultra:     5,
};

// ── Daily target (seeded by date) ─────────────────────────────────────────────
export function getDailySkinTarget(pool) {
  if (!pool.length) return null;
  const seed = parseInt(getDailyDateKey().replace(/-/g, ''), 10);
  let s = seed;
  s = ((s ^ (s << 13)) >>> 0);
  s = ((s ^ (s >> 7))  >>> 0);
  s = ((s ^ (s << 17)) >>> 0);
  return pool[s % pool.length];
}

// ── Free mode target (random on each call) ───────────────────────────────────
export function getFreeSkinTarget(pool) {
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Search skins by query ─────────────────────────────────────────────────────
export function skinSearch(allSkins, query, excludeUuids = new Set(), lang = 'pt-BR') {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const isPT = lang !== 'en';
  return allSkins
    .filter(s => {
      if (excludeUuids.has(s.uuid)) return false;
      const name   = isPT ? (s.displayNamePT ?? s.displayName) : s.displayName;
      const bundle = isPT ? (s.bundleNamePT  ?? s.bundleName)  : s.bundleName;
      return (
        name.toLowerCase().includes(q)   ||
        bundle.toLowerCase().includes(q) ||
        // always also search EN so players can type in English
        s.displayName.toLowerCase().includes(q) ||
        s.bundleName.toLowerCase().includes(q)  ||
        s.weapon.toLowerCase().includes(q)
      );
    })
    .slice(0, 14);
}

// ── Guess comparison ──────────────────────────────────────────────────────────
// Returns an array of feedback cells:
//   [bundle, weapon, edition, act]
// status: 'correct' | 'wrong'
// hint:   '↑' | '↓' | null (direction arrows for ordered columns)
// Strip wave suffix ("Araxys 2.0" → "Araxys", "RGX 11z Pro 3.0" → "RGX 11z Pro")
function baseBundleName(name) {
  return name.replace(/\s+\d+\.0$/, '').trim();
}

export function compareSkins(guess, target, patches, lang = 'pt-BR') {
  const bundleOk   = guess.bundleName === target.bundleName;
  const bundleClose = !bundleOk &&
    baseBundleName(guess.bundleName) === baseBundleName(target.bundleName);
  const weaponOk = guess.weapon === target.weapon;

  const gEd = EDITION_ORDER[guess.edition] || 0;
  const tEd = EDITION_ORDER[target.edition] || 0;
  const edOk = gEd > 0 && tEd > 0 && gEd === tEd;

  const gPatchStr = patches[guess.bundleName]  ?? null;
  const tPatchStr = patches[target.bundleName] ?? null;
  const gActIdx = patchToActIndex(gPatchStr);
  const tActIdx = patchToActIndex(tPatchStr);
  const actOk = gActIdx !== -1 && tActIdx !== -1 && gActIdx === tActIdx;

  const gBundleDisplay = lang !== 'en'
    ? (guess.bundleNamePT ?? guess.bundleName)
    : guess.bundleName;

  return [
    {
      attr: 'bundle',
      value: gBundleDisplay,
      status: bundleOk ? 'correct' : bundleClose ? 'close' : 'wrong',
      hint: null,
    },
    {
      attr: 'weapon',
      value: guess.weapon,
      status: weaponOk ? 'correct' : 'wrong',
      hint: null,
    },
    {
      attr: 'edition',
      value: guess.edition || '?',
      status: edOk ? 'correct' : 'wrong',
      hint: !edOk && gEd && tEd ? (gEd < tEd ? '↑' : '↓') : null,
    },
    {
      attr: 'act',
      value: patchToAct(gPatchStr, lang),
      status: actOk ? 'correct' : 'wrong',
      hint: !actOk && gActIdx !== -1 && tActIdx !== -1 ? (gActIdx < tActIdx ? '↑' : '↓') : null,
    },
  ];
}

// ── I18N ──────────────────────────────────────────────────────────────────────
export const SKINS_I18N = {
  'pt-BR': {
    modeTag:        'Skins',
    modeDailyDesc:  'Nova skin todo dia',
    modeFreeDesc:   'Skins aleatórias',
    modeFree:       'Modo livre',
    back:           '← Lobby',
    attempts:       (n, max) => `${n}/${max} tentativas`,
    headers: {
      skin:    'Skin',
      bundle:  'Bundle',
      weapon:  'Arma',
      edition: 'Edição',
      act:     'Ato',
    },
    placeholder:    'Buscar skin ou bundle…',
    confirmBtn:     'OK →',
    playBtn:        '▶ Ouvir',
    pauseBtn:       '⏸ Pausar',
    replayBtn:      '↺',
    win:            'ACERTOU!',
    winSub:         (n) => `Em ${n} tentativa${n !== 1 ? 's' : ''}!`,
    lose:           (name) => `Era ${name}`,
    loseSub:        'Tente novamente amanhã!',
    nextDaily:      'Próximo daily em',
    shareBtn:       '📋 Compartilhar',
    playFree:       'Modo livre',
    newRound:       'Nova skin',
    copiedToast:    'Resultado copiado!',
    loadError:      'Erro ao carregar dados das skins.',
    notFound:       'Skin não encontrada',
    alreadyGuessed: 'Já tentou esta skin',
    shareHeader:    'Valorandle — Skins',
    shareWin:       (n) => `Acertei em ${n}!`,
    shareLose:      'Não acertei hoje',
    modePicker:     'Como quer jogar?',
    editions: {
      Select:    'Select',
      Deluxe:    'Deluxe',
      Premium:   'Premium',
      Exclusive: 'Exclusive',
      Ultra:     'Ultra',
    },
  },
  en: {
    modeTag:        'Skins',
    modeDailyDesc:  'New skin every day',
    modeFreeDesc:   'Random skins',
    modeFree:       'Free mode',
    back:           '← Lobby',
    attempts:       (n, max) => `${n}/${max} attempts`,
    headers: {
      skin:    'Skin',
      bundle:  'Bundle',
      weapon:  'Weapon',
      edition: 'Edition',
      act:     'Act',
    },
    placeholder:    'Search skin or bundle…',
    confirmBtn:     'OK →',
    playBtn:        '▶ Play',
    pauseBtn:       '⏸ Pause',
    replayBtn:      '↺',
    win:            'CORRECT!',
    winSub:         (n) => `In ${n} attempt${n !== 1 ? 's' : ''}!`,
    lose:           (name) => `It was ${name}`,
    loseSub:        'Try again tomorrow!',
    nextDaily:      'Next daily in',
    shareBtn:       '📋 Share',
    playFree:       'Free mode',
    newRound:       'New skin',
    copiedToast:    'Result copied!',
    loadError:      'Failed to load skin data.',
    notFound:       'Skin not found',
    alreadyGuessed: 'Already guessed this skin',
    shareHeader:    'Valorandle — Skins',
    shareWin:       (n) => `I got it in ${n}!`,
    shareLose:      'Did not get today\'s skin',
    modePicker:     'How do you want to play?',
    editions: {
      Select:    'Select',
      Deluxe:    'Deluxe',
      Premium:   'Premium',
      Exclusive: 'Exclusive',
      Ultra:     'Ultra',
    },
  },
};
