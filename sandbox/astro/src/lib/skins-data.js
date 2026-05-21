// skins-data.js — Logic and I18N for the Skins game mode.
// The skins-db.json and bundle-patches.json are fetched at runtime from /data/.

import { getDailyDateKey } from './game-utils.js';

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
export function skinSearch(allSkins, query, excludeUuids = new Set()) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return allSkins
    .filter(s =>
      !excludeUuids.has(s.uuid) && (
        s.displayName.toLowerCase().includes(q) ||
        s.bundleName.toLowerCase().includes(q)  ||
        s.weapon.toLowerCase().includes(q)
      )
    )
    .slice(0, 14);
}

// ── Guess comparison ──────────────────────────────────────────────────────────
// Returns an array of feedback cells:
//   [bundle, weapon, edition, patch]
// status: 'correct' | 'wrong'
// hint:   '↑' | '↓' | null (direction arrows for ordered columns)
export function compareSkins(guess, target, patches) {
  const bundleOk = guess.bundleName === target.bundleName;
  const weaponOk = guess.weapon     === target.weapon;

  const gEd = EDITION_ORDER[guess.edition] || 0;
  const tEd = EDITION_ORDER[target.edition] || 0;
  const edOk = gEd > 0 && tEd > 0 && gEd === tEd;

  const gPatchStr = patches[guess.bundleName]  ?? null;
  const tPatchStr = patches[target.bundleName] ?? null;
  const gP = gPatchStr ? parseFloat(gPatchStr) : null;
  const tP = tPatchStr ? parseFloat(tPatchStr) : null;
  const patchOk = gP !== null && tP !== null && gP === tP;

  return [
    {
      attr: 'bundle',
      value: guess.bundleName,
      status: bundleOk ? 'correct' : 'wrong',
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
      attr: 'patch',
      value: gPatchStr || '?',
      status: patchOk ? 'correct' : 'wrong',
      hint: !patchOk && gP && tP ? (gP < tP ? '↑' : '↓') : null,
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
      patch:   'Patch',
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
      patch:   'Patch',
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
