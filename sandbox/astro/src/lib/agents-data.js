import { getDailyDateKey } from './game-utils.js';

// ── Agent database (hardcoded from valorant-api.com + manual data) ────────────
// gender: M=Masculino/Male, F=Feminino/Female, O=Outro/Other
// flag: ISO 3166-1 alpha-2 (flag-icons library) or null
// year: release year of the agent
// ult: ultimate points cost
export const AGENTS_DB = {
  astra:     { name:'Astra',     role:'Controller', gender:'F', flag:'gh',     originPT:'Gana',           originEN:'Ghana',          year:2021, ult:7, icon:'https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/displayicon.png' },
  breach:    { name:'Breach',    role:'Initiator',  gender:'M', flag:'se',     originPT:'Suécia',          originEN:'Sweden',         year:2020, ult:8, icon:'https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/displayicon.png' },
  brimstone: { name:'Brimstone', role:'Controller', gender:'M', flag:'us',     originPT:'EUA',             originEN:'USA',            year:2020, ult:8, icon:'https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/displayicon.png' },
  chamber:   { name:'Chamber',   role:'Sentinel',   gender:'M', flag:'fr',     originPT:'França',          originEN:'France',         year:2021, ult:8, icon:'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png' },
  clove:     { name:'Clove',     role:'Controller', gender:'O', flag:'gb-sct', originPT:'Escócia',         originEN:'Scotland',       year:2024, ult:8, icon:'https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png' },
  cypher:    { name:'Cypher',    role:'Sentinel',   gender:'M', flag:'ma',     originPT:'Marrocos',        originEN:'Morocco',        year:2020, ult:7, icon:'https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png' },
  deadlock:  { name:'Deadlock',  role:'Sentinel',   gender:'F', flag:'no',     originPT:'Noruega',         originEN:'Norway',         year:2023, ult:7, icon:'https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png' },
  fade:      { name:'Fade',      role:'Initiator',  gender:'F', flag:'tr',     originPT:'Turquia',         originEN:'Turkey',         year:2022, ult:8, icon:'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png' },
  gekko:     { name:'Gekko',     role:'Initiator',  gender:'M', flag:'us',     originPT:'EUA',             originEN:'USA',            year:2023, ult:8, icon:'https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png' },
  harbor:    { name:'Harbor',    role:'Controller', gender:'M', flag:'in',     originPT:'Índia',           originEN:'India',          year:2022, ult:7, icon:'https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png' },
  iso:       { name:'Iso',       role:'Duelist',    gender:'M', flag:'cn',     originPT:'China',           originEN:'China',          year:2023, ult:7, icon:'https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png' },
  jett:      { name:'Jett',      role:'Duelist',    gender:'F', flag:'kr',     originPT:'Coreia do Sul',   originEN:'South Korea',    year:2020, ult:8, icon:'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png' },
  kayo:      { name:'KAY/O',     role:'Initiator',  gender:'M', flag:null,     originPT:'Desconhecido',    originEN:'Unknown',        year:2021, ult:8, icon:'https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png' },
  killjoy:   { name:'Killjoy',   role:'Sentinel',   gender:'F', flag:'de',     originPT:'Alemanha',        originEN:'Germany',        year:2020, ult:9, icon:'https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png' },
  miks:      { name:'Miks',      role:'Controller', gender:'F', flag:'hr',     originPT:'Croácia',          originEN:'Croatia',        year:2025, ult:8, icon:'https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/displayicon.png' },
  neon:      { name:'Neon',      role:'Duelist',    gender:'F', flag:'ph',     originPT:'Filipinas',       originEN:'Philippines',    year:2022, ult:8, icon:'https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png' },
  omen:      { name:'Omen',      role:'Controller', gender:'M', flag:null,     originPT:'Desconhecido',    originEN:'Unknown',        year:2020, ult:7, icon:'https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png' },
  phoenix:   { name:'Phoenix',   role:'Duelist',    gender:'M', flag:'gb',     originPT:'Reino Unido',     originEN:'United Kingdom', year:2020, ult:6, icon:'https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png' },
  raze:      { name:'Raze',      role:'Duelist',    gender:'F', flag:'br',     originPT:'Brasil',          originEN:'Brazil',         year:2020, ult:8, icon:'https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png' },
  reyna:     { name:'Reyna',     role:'Duelist',    gender:'F', flag:'mx',     originPT:'México',          originEN:'Mexico',         year:2020, ult:7, icon:'https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png' },
  sage:      { name:'Sage',      role:'Sentinel',   gender:'F', flag:'cn',     originPT:'China',           originEN:'China',          year:2020, ult:7, icon:'https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png' },
  skye:      { name:'Skye',      role:'Initiator',  gender:'F', flag:'au',     originPT:'Austrália',       originEN:'Australia',      year:2020, ult:8, icon:'https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png' },
  sova:      { name:'Sova',      role:'Initiator',  gender:'M', flag:'ru',     originPT:'Rússia',          originEN:'Russia',         year:2020, ult:8, icon:'https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png' },
  tejo:      { name:'Tejo',      role:'Initiator',  gender:'M', flag:'co',     originPT:'Colômbia',        originEN:'Colombia',       year:2025, ult:9, icon:'https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/displayicon.png' },
  veto:      { name:'Veto',      role:'Sentinel',   gender:'M', flag:'sn',     originPT:'Senegal',         originEN:'Senegal',        year:2025, ult:7, icon:'https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/displayicon.png' },
  viper:     { name:'Viper',     role:'Controller', gender:'F', flag:'us',     originPT:'EUA',             originEN:'USA',            year:2020, ult:9, icon:'https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png' },
  vyse:      { name:'Vyse',      role:'Sentinel',   gender:'F', flag:null,     originPT:'Desconhecido',    originEN:'Unknown',        year:2024, ult:8, icon:'https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/displayicon.png' },
  waylay:    { name:'Waylay',    role:'Duelist',    gender:'F', flag:'th',     originPT:'Tailândia',       originEN:'Thailand',       year:2025, ult:8, icon:'https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/displayicon.png' },
  yoru:      { name:'Yoru',      role:'Duelist',    gender:'M', flag:'jp',     originPT:'Japão',           originEN:'Japan',          year:2021, ult:8, icon:'https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png' },
};

const AGENT_KEYS = Object.keys(AGENTS_DB);

// ── I18N ──────────────────────────────────────────────────────────────────────
export const AGENTS_I18N = {
  'pt-BR': {
    modeTag:       'Agentes',
    modeDailyDesc: 'Novo agente todo dia',
    modeFreeDesc:  'Agentes aleatórios',
    modeFree:      'Modo livre',
    back:          '← Lobby',
    attempts:      (n, max) => `${n}/${max} tentativas`,
    headers:       { agent:'Agente', gender:'Gênero', role:'Função', origin:'Origem', year:'Lançamento', ult:'Pts. Ult' },
    roles:         { Controller:'Controlador', Duelist:'Duelista', Initiator:'Iniciador', Sentinel:'Sentinela' },
    genders:       { M:'Masculino', F:'Feminino', O:'Outro' },
    placeholder:   'Digite o nome do agente...',
    confirmBtn:    'OK →',
    win:           'ACERTOU!',
    winSub:        (n) => `Em ${n} tentativa${n !== 1 ? 's' : ''}!`,
    lose:          (name) => `Era ${name}`,
    loseSub:       'Tente novamente amanhã!',
    nextDaily:     'Próximo daily em',
    shareBtn:      '📋 Compartilhar',
    playFree:      'Modo livre',
    newRound:      'Novo agente',
    copiedToast:   'Resultado copiado!',
    apiError:      'Erro ao carregar dados dos agentes.',
    notFound:      'Agente não encontrado',
    alreadyGuessed:'Já tentou este agente',
    shareHeader:   'Valorandle — Agentes',
    shareWin:      (n) => `Acertei em ${n}!`,
    shareLose:     'Não acertei hoje',
    modePicker:    'Como quer jogar?',
  },
  'en': {
    modeTag:       'Agents',
    modeDailyDesc: 'New agent every day',
    modeFreeDesc:  'Random agents',
    modeFree:      'Free mode',
    back:          '← Lobby',
    attempts:      (n, max) => `${n}/${max} attempts`,
    headers:       { agent:'Agent', gender:'Gender', role:'Role', origin:'Origin', year:'Release', ult:'Ult Pts' },
    roles:         { Controller:'Controller', Duelist:'Duelist', Initiator:'Initiator', Sentinel:'Sentinel' },
    genders:       { M:'Male', F:'Female', O:'Other' },
    placeholder:   'Type agent name...',
    confirmBtn:    'OK →',
    win:           'GOT IT!',
    winSub:        (n) => `In ${n} attempt${n !== 1 ? 's' : ''}!`,
    lose:          (name) => `It was ${name}`,
    loseSub:       'Try again tomorrow!',
    nextDaily:     'Next daily in',
    shareBtn:      '📋 Share',
    playFree:      'Free mode',
    newRound:      'New agent',
    copiedToast:   'Result copied!',
    apiError:      'Error loading agent data.',
    notFound:      'Agent not found',
    alreadyGuessed:'Already guessed this agent',
    shareHeader:   'Valorandle — Agents',
    shareWin:      (n) => `Got it in ${n}!`,
    shareLose:     'Missed today',
    modePicker:    'How do you want to play?',
  },
};

// ── Comparison ─────────────────────────────────────────────────────────────────
export function compareAgentGuess(guessId, targetId, lang = 'pt-BR') {
  const g = AGENTS_DB[guessId];
  const tg = AGENTS_DB[targetId];
  if (!g || !tg) return null;

  const l = lang === 'en' ? 'en' : 'pt-BR';

  const roleName   = l === 'pt-BR' ? (AGENTS_I18N['pt-BR'].roles[g.role]   || g.role)   : g.role;
  const genderName = l === 'pt-BR' ? (AGENTS_I18N['pt-BR'].genders[g.gender] || g.gender) : (AGENTS_I18N['en'].genders[g.gender] || g.gender);
  const originName = l === 'pt-BR' ? g.originPT : g.originEN;

  // Origin: compare by originEN as canonical key
  const originMatch = g.originEN === tg.originEN;

  // Year: exact=correct, ±1=close, else=wrong; arrow shows direction to target
  const yearDiff = tg.year - g.year;
  const yearStatus = yearDiff === 0 ? 'correct' : Math.abs(yearDiff) === 1 ? 'close' : 'wrong';
  const yearHint   = yearDiff > 0 ? '↑' : yearDiff < 0 ? '↓' : null;

  // Ult points: same logic as year
  const ultDiff   = tg.ult - g.ult;
  const ultStatus = ultDiff === 0 ? 'correct' : Math.abs(ultDiff) === 1 ? 'close' : 'wrong';
  const ultHint   = ultDiff > 0 ? '↑' : ultDiff < 0 ? '↓' : null;

  return [
    { attr:'gender', value: genderName,       status: g.gender === tg.gender ? 'correct' : 'wrong', hint: null },
    { attr:'role',   value: roleName,         status: g.role   === tg.role   ? 'correct' : 'wrong', hint: null },
    { attr:'origin', value: originName,       status: originMatch            ? 'correct' : 'wrong', hint: null, flag: g.flag },
    { attr:'year',   value: String(g.year),   status: yearStatus,                                    hint: yearHint },
    { attr:'ult',    value: String(g.ult),    status: ultStatus,                                     hint: ultHint },
  ];
}

// ── Daily / free target ────────────────────────────────────────────────────────
export function getDailyAgentTarget() {
  const key = getDailyDateKey().replace(/-/g, '');
  let s = parseInt(key, 10);
  // xorshift with offset so agent target differs from maps/players targets
  s = ((s ^ (s << 13)) >>> 0);
  s = ((s ^ (s >>  7)) >>> 0);
  s = ((s ^ (s << 17)) >>> 0);
  s = ((s +  31)       >>> 0);
  return AGENT_KEYS[s % AGENT_KEYS.length];
}

export function getFreeAgentTarget() {
  return AGENT_KEYS[Math.floor(Math.random() * AGENT_KEYS.length)];
}

export function agentSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return AGENT_KEYS
    .filter(id => AGENTS_DB[id].name.toLowerCase().includes(q))
    .sort((a, b) => {
      const an = AGENTS_DB[a].name.toLowerCase();
      const bn = AGENTS_DB[b].name.toLowerCase();
      // Prefix matches first
      const ap = an.startsWith(q) ? 0 : 1;
      const bp = bn.startsWith(q) ? 0 : 1;
      return ap - bp || an.localeCompare(bn);
    })
    .slice(0, 8);
}
