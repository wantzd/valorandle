// abilities-data.js — Logic and I18N for the Abilities game mode.
// abilities-db.json is fetched at runtime from /data/.

import { getDailyDateKey, seededRandom } from './game-utils.js';

// ── I18N ───────────────────────────────────────────────────────────────────────
export const ABILITIES_I18N = {
  'pt-BR': {
    title:       'Habilidades',
    modeDesc:    'Adivinhe o agente pela habilidade',
    pick:        'Selecione o modo de jogo',
    daily:       'Daily',
    free:        'Livre',
    desc:        'Descrição',
    image:       'Imagem',
    subDescHint: 'Tooltip da habilidade com nomes censurados',
    subImgHint:  'Ícone coberto — revelado a cada tentativa',
    searchPh:    'Buscar agente ou habilidade...',
    attempts:    (n, m) => `${n}/${m} tentativas`,
    headers:     { agent: 'Agente', role: 'Função', key: 'Tecla', ult: 'Ultimate' },
    roles:       { Duelist: 'Duelista', Initiator: 'Iniciador', Controller: 'Controlador', Sentinel: 'Sentinela' },
    yes:         'Sim',
    no:          'Não',
    notFound:    'Habilidade não encontrada',
    alreadyUsed: 'Você já tentou essa habilidade!',
    win:         (agent, key) => `Era ${agent} · ${key}!`,
    lose:        (agent, key) => `Era ${agent} · ${key}`,
    playAgain:   'Jogar de Novo',
    backLobby:   'Voltar',
    share:       'Compartilhar',
    copied:      'Copiado!',
    nextIn:      'Próximo daily em',
    loadError:   'Erro ao carregar dados. Tente novamente.',
    daily_done:  'Daily concluído!',
    correct_lbl: 'Correto!',
    wrong_lbl:   'Errado',
    close_lbl:   'Quase',
  },
  'en': {
    title:       'Abilities',
    modeDesc:    'Guess the agent by their ability',
    pick:        'Select game mode',
    daily:       'Daily',
    free:        'Free',
    desc:        'Description',
    image:       'Image',
    subDescHint: 'Ability tooltip with names censored',
    subImgHint:  'Icon covered — revealed with each guess',
    searchPh:    'Search agent or ability...',
    attempts:    (n, m) => `${n}/${m} attempts`,
    headers:     { agent: 'Agent', role: 'Role', key: 'Key', ult: 'Ultimate' },
    roles:       { Duelist: 'Duelist', Initiator: 'Initiator', Controller: 'Controller', Sentinel: 'Sentinel' },
    yes:         'Yes',
    no:          'No',
    notFound:    'Ability not found',
    alreadyUsed: 'You already tried that ability!',
    win:         (agent, key) => `It was ${agent} · ${key}!`,
    lose:        (agent, key) => `It was ${agent} · ${key}`,
    playAgain:   'Play Again',
    backLobby:   'Back',
    share:       'Share',
    copied:      'Copied!',
    nextIn:      'Next daily in',
    loadError:   'Failed to load data. Please try again.',
    daily_done:  'Daily complete!',
    correct_lbl: 'Correct!',
    wrong_lbl:   'Wrong',
    close_lbl:   'Close',
  },
};

// ── Role groups (mirrors pro-players) ─────────────────────────────────────────
const ROLE_GROUPS = {
  Duelist:    ['Duelist'],
  Initiator:  ['Initiator', 'Flex'],
  Controller: ['Controller'],
  Sentinel:   ['Sentinel', 'Flex'],
  Flex:       ['Initiator', 'Sentinel', 'Flex'],
};

// ── Compare ────────────────────────────────────────────────────────────────────
/**
 * Returns 4 feedback cells for a single guess:
 *   Agent (correct/wrong), Role (correct/close/wrong),
 *   Key (correct/wrong), Ultimate (correct/wrong).
 *
 * Win condition: guess.id === target.id  (same agent + same slot).
 */
export function compareAbilityGuess(guess, target) {
  const agentOk = guess.agentUuid === target.agentUuid;

  const gr = guess.agentRole, tr = target.agentRole;
  const roleOk  = gr === tr;
  const roleMid = !roleOk && (
    (ROLE_GROUPS[gr] || []).includes(tr) ||
    (ROLE_GROUPS[tr] || []).includes(gr)
  );

  const keyOk = guess.key === target.key;
  // "Ultimate" column: ✅ when both are / both aren't ultimate
  const ultOk = guess.isUltimate === target.isUltimate;

  return [
    { attr: 'agent', value: guess.agentNameEN, status: agentOk ? 'correct' : 'wrong' },
    { attr: 'role',  value: guess.agentRole,   status: roleOk ? 'correct' : roleMid ? 'close' : 'wrong' },
    { attr: 'key',   value: guess.key,         status: keyOk  ? 'correct' : 'wrong' },
    { attr: 'ult',   value: guess.isUltimate,  status: ultOk  ? 'correct' : 'wrong' },
  ];
}

// ── Daily / free target selection ─────────────────────────────────────────────
export function getDailyAbilityTarget(abilities, sub = 'desc') {
  const dateKey = getDailyDateKey();
  const rng     = seededRandom(`valorandle-abilities-${sub}-${dateKey}`);
  const arr     = [...abilities];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr[0] ?? null;
}

export function getFreeAbilityTarget(abilities, exclude = []) {
  const pool = abilities.filter(a => !exclude.includes(a.id));
  const src  = pool.length ? pool : abilities;
  return src[Math.floor(Math.random() * src.length)] ?? null;
}

// ── Search / autocomplete ─────────────────────────────────────────────────────
export function abilitySearch(abilities, query, lang, usedIds = new Set()) {
  const q = query.toLowerCase();
  if (!q) return [];
  return abilities
    .filter(a => {
      if (usedIds.has(a.id)) return false;
      const agentName = a.agentNameEN.toLowerCase();
      const abilName  = (lang === 'en' ? a.nameEN : a.namePT).toLowerCase();
      return agentName.includes(q) || abilName.includes(q) || a.key.toLowerCase() === q;
    })
    .slice(0, 10);
}

// ── Image-mode reveal grid ────────────────────────────────────────────────────
export const GRID_COLS  = 5;
export const GRID_ROWS  = 4;
export const GRID_TOTAL = GRID_COLS * GRID_ROWS; // 20 cells

/**
 * Returns a seeded-random shuffle of cell indices [0..19].
 * revealOrder[0] is the first cell uncovered, [1] the second, etc.
 */
export function buildRevealOrder(targetId) {
  const rng     = seededRandom(`reveal-${targetId}`);
  const indices = Array.from({ length: GRID_TOTAL }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

// ── Share text ────────────────────────────────────────────────────────────────
export function generateAbilityShareText(dateKey, sub, guesses, won, lang) {
  const emojiMap = { correct: '🟩', close: '🟨', wrong: '🟥' };
  const subLabel = sub === 'image' ? '🖼️' : '🔤';
  let text = `Valorandle Abilities ${subLabel} ${dateKey}\n\n`;
  for (const g of guesses) {
    text += g.feedback.map(f => emojiMap[f.status] || '⬛').join('') + '\n';
  }
  if (!won) text += '❌\n';
  text += '\n🎮 valorandle.com';
  return text;
}
