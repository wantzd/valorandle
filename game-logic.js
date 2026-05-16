const I18N = {
  "pt-BR": {
    correct: "Correto!",
    wrong: "Errado",
    close: "Quase",
    higher: "↑ Mais velho",
    lower: "↓ Mais novo",
    guessPlaceholder: "Digite o nome do jogador...",
    attribs: {
      name: "Jogador",
      country: "País",
      team: "Time",
      age: "Idade",
      role: "Função",
      titles: "Títulos",
      yearsActive: "Anos Ativo"
    },
    attempts: (n, max) => `${n}/${max} tentativas`,
    round: (n, total) => `Round ${n} de ${total}`,
    dailyComplete: "Você completou o Daily de hoje! 🏆",
    dailyFailed: "Não foi hoje. O jogador era",
    streak: "Sequência",
    wins: "Vitórias",
    played: "Jogos",
    winRate: "Taxa de vitória",
    noMoreGuesses: "Sem mais tentativas!",
    alreadyGuessed: "Você já chutou esse jogador!",
    notFound: "Jogador não encontrado",
    nextIn: "Próximo Daily em",
    shareBtn: "Compartilhar",
    playAgain: "Jogar de Novo",
    backLobby: "Voltar ao Lobby",
    years: "anos",
    noTitles: "Nenhum",
    roles: {
      Duelist: "Duelista",
      Initiator: "Iniciador",
      Controller: "Controlador",
      Sentinel: "Sentinela",
      Flex: "Flex"
    }
  },
  "en": {
    correct: "Correct!",
    wrong: "Wrong",
    close: "Close",
    higher: "↑ Older",
    lower: "↓ Younger",
    guessPlaceholder: "Type player name...",
    attribs: {
      name: "Player",
      country: "Country",
      team: "Team",
      age: "Age",
      role: "Role",
      titles: "Titles",
      yearsActive: "Yrs Active"
    },
    attempts: (n, max) => `${n}/${max} attempts`,
    round: (n, total) => `Round ${n} of ${total}`,
    dailyComplete: "You completed today's Daily! 🏆",
    dailyFailed: "Better luck next time. The player was",
    streak: "Streak",
    wins: "Wins",
    played: "Played",
    winRate: "Win Rate",
    noMoreGuesses: "No more guesses!",
    alreadyGuessed: "You already guessed that player!",
    notFound: "Player not found",
    nextIn: "Next Daily in",
    shareBtn: "Share",
    playAgain: "Play Again",
    backLobby: "Back to Lobby",
    years: "yrs",
    noTitles: "None",
    roles: {
      Duelist: "Duelist",
      Initiator: "Initiator",
      Controller: "Controller",
      Sentinel: "Sentinel",
      Flex: "Flex"
    }
  }
};

const COUNTRY_EN = {
  "Brasil": "Brazil",
  "EUA": "USA",
  "Reino Unido": "UK",
  "Coreia do Sul": "South Korea",
  "Japão": "Japan",
  "China": "China",
  "Canadá": "Canada",
  "Austrália": "Australia",
  "Argentina": "Argentina",
  "Chile": "Chile",
  "México": "Mexico",
  "Colômbia": "Colombia",
  "Peru": "Peru",
  "Uruguai": "Uruguay",
  "Venezuela": "Venezuela",
  "Turquia": "Turkey",
  "Alemanha": "Germany",
  "França": "France",
  "Espanha": "Spain",
  "Itália": "Italy",
  "Suécia": "Sweden",
  "Noruega": "Norway",
  "Dinamarca": "Denmark",
  "Finlândia": "Finland",
  "Polônia": "Poland",
  "Rússia": "Russia",
  "Ucrânia": "Ukraine",
  "Quirguistão": "Kyrgyzstan",
  "Cazaquistão": "Kazakhstan",
  "Paquistão": "Pakistan",
  "Índia": "India",
  "Tailândia": "Thailand",
  "Filipinas": "Philippines",
  "Indonésia": "Indonesia",
  "Mongólia": "Mongolia",
  "Marrocos": "Morocco",
  "África do Sul": "South Africa",
  "Nigéria": "Nigeria",
  "Egito": "Egypt",
  "Hong Kong": "Hong Kong",
  "Taiwan": "Taiwan",
  "Cingapura": "Singapore",
  "Nova Zelândia": "New Zealand",
  "Islândia": "Iceland",
  "Portugal": "Portugal",
  "Bélgica": "Belgium",
  "Países Baixos": "Netherlands",
  "Suíça": "Switzerland",
  "Áustria": "Austria",
  "República Tcheca": "Czech Republic",
  "Romênia": "Romania",
  "Hungria": "Hungary",
  "Grécia": "Greece",
  "Croácia": "Croatia",
  "Sérvia": "Serbia",
  "Geórgia": "Georgia",
  "Armênia": "Armenia",
  "Azerbaijão": "Azerbaijan",
};

const MAX_GUESSES = 8;
const DAILY_ROUNDS = 5;

const ROLE_GROUPS = {
  Duelist:    ["Duelist"],
  Initiator:  ["Initiator", "Flex"],
  Controller: ["Controller"],
  Sentinel:   ["Sentinel", "Flex"],
  Flex:       ["Initiator", "Sentinel", "Flex"],
};

const TITLE_TIERS = {
  S: ["Champions 2021", "Champions 2022", "Champions 2023", "Champions 2024", "Champions 2025"],
  A: ["Masters Reykjavik 2021", "Masters Berlim 2021", "Masters Reykjavik 2022",
      "Masters Copenhagen 2022", "Masters Tokyo 2023", "Masters Shanghai 2024",
      "Masters Bangkok 2025", "Masters Santiago 2026",
      "VCT Americas 2022", "VCT Americas 2023", "VCT Americas 2024", "VCT Americas 2025"]
};

function getTitleTier(title) {
  for (const [tier, list] of Object.entries(TITLE_TIERS)) {
    if (list.includes(title)) return tier;
  }
  return null;
}

function compareGuess(guess, target) {
  return [
    compareCountry(guess, target),
    compareTeam(guess, target),
    compareAge(guess, target),
    compareRole(guess, target),
    compareTitles(guess, target),
    compareYearsActive(guess, target)
  ];
}

// PAÍS — Verde ou Vermelho
function compareCountry(guess, target) {
  return {
    attr: "country",
    value: guess.country,
    status: guess.country === target.country ? "correct" : "wrong",
    hint: null
  };
}

// TIME — Verde ou Vermelho
function compareTeam(guess, target) {
  return {
    attr: "team",
    value: guess.team,
    status: guess.team === target.team ? "correct" : "wrong",
    hint: null
  };
}

// IDADE — Verde exato, Amarelo ±3, Vermelho >3 (com seta)
function compareAge(guess, target) {
  const diff = target.age - guess.age;
  let status, hint;
  if (diff === 0) {
    status = "correct"; hint = null;
  } else if (Math.abs(diff) <= 3) {
    status = "close"; hint = diff > 0 ? "↑" : "↓";
  } else {
    status = "wrong"; hint = diff > 0 ? "↑" : "↓";
  }
  return { attr: "age", value: guess.age, status, hint };
}

// ROLE — Verde exato, Amarelo se mesmo grupo ou mesma base, Vermelho senão
// Suporta roles compostas tipo "Duelist (Flex)":
//   - Mesma string exata → verde
//   - Mesma base (ex: "Duelist" vs "Duelist (Flex)") → amarelo
//   - Grupos existentes (Flex↔Initiator/Sentinel, etc.) usando base → amarelo
function compareRole(guess, target) {
  const gr = guess.role, tr = target.role;
  if (gr === tr) return { attr: "role", value: gr, status: "correct", hint: null };

  // Extrai base: "Duelist (Flex)" → "Duelist"
  const gBase = gr.replace(" (Flex)", "");
  const tBase = tr.replace(" (Flex)", "");

  // Mesma base → amarelo (ex: "Duelist" vs "Duelist (Flex)")
  if (gBase === tBase) return { attr: "role", value: gr, status: "close", hint: null };

  // Grupos existentes usando a base de cada role
  const sameGroup = (ROLE_GROUPS[gBase] || []).includes(tBase) ||
                    (ROLE_GROUPS[tBase] || []).includes(gBase);
  return { attr: "role", value: gr, status: sameGroup ? "close" : "wrong", hint: null };
}

// TÍTULOS — APENAS Verde (idêntico) ou Vermelho (diferente)
function compareTitles(guess, target) {
  const gTitles = guess.titles.filter(t => t !== "Nenhum").sort();
  const tTitles = target.titles.filter(t => t !== "Nenhum").sort();

  // Ambos sem títulos = verde
  if (gTitles.length === 0 && tTitles.length === 0) {
    return { attr: "titles", value: "Nenhum", status: "correct", hint: null, fullList: [] };
  }

  // Listas idênticas = verde
  const identical = gTitles.length === tTitles.length &&
                    gTitles.every((t, i) => t === tTitles[i]);
  if (identical) {
    return { attr: "titles", value: formatTitles(gTitles), status: "correct", hint: null, fullList: gTitles };
  }

  // Qualquer diferença = vermelho
  return {
    attr: "titles",
    value: gTitles.length === 0 ? "Nenhum" : formatTitles(gTitles),
    status: "wrong",
    hint: null,
    fullList: gTitles
  };
}

// ANOS ATIVO — Verde exato, Amarelo ±1, Vermelho >1 (com seta)
function compareYearsActive(guess, target) {
  const gYears = guess.yearsActive || 0;
  const tYears = target.yearsActive || 0;
  const diff = tYears - gYears;

  let status, hint;
  if (diff === 0) {
    status = "correct"; hint = null;
  } else if (Math.abs(diff) <= 1) {
    status = "close"; hint = diff > 0 ? "↑" : "↓";
  } else {
    status = "wrong"; hint = diff > 0 ? "↑" : "↓";
  }
  return { attr: "yearsActive", value: gYears, status, hint };
}

function formatTitles(titles) {
  if (titles.length === 0) return "Nenhum";
  if (titles.length === 1) return titles[0];
  return `${titles[0]} +${titles.length - 1}`;
}

function getDailyDateKey() {
  const now = new Date();
  const utcMinus3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return utcMinus3.toISOString().slice(0, 10);
}

function seededRandom(seed) {
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

function getDailyPlayers(players) {
  const dateKey = getDailyDateKey();
  const rng = seededRandom(`valorandle-${dateKey}`);
  // Fisher-Yates shuffle with seeded RNG
  const arr = [...players];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, DAILY_ROUNDS);
}

function getRandomPlayer(players, exclude = []) {
  const pool = players.filter(p => !exclude.includes(p.id));
  return pool[Math.floor(Math.random() * pool.length)];
}

function msUntilNextDaily() {
  const now = new Date();
  const utcMinus3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const tomorrow = new Date(utcMinus3);
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const nextReset = new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000);
  return nextReset.getTime() - now.getTime();
}

function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Cookies work on file:// unlike localStorage in some browsers with strict settings
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + d.toUTCString();
  }
  document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let c of ca) {
    c = c.trim();
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

const LS_KEYS = {
  stats:      "valorandle_stats",
  dailyState: "valorandle_daily_",
  lang:       "valorandle_lang"
};

function loadStats() {
  try {
    const raw = localStorage.getItem(LS_KEYS.stats);
    if (!raw) return { played: 0, wins: 0, streak: 0, maxStreak: 0 };
    return JSON.parse(raw);
  } catch { return { played: 0, wins: 0, streak: 0, maxStreak: 0 }; }
}

function saveStats(stats) {
  try { localStorage.setItem(LS_KEYS.stats, JSON.stringify(stats)); } catch {}
}

function loadDailyState() {
  try {
    const key = LS_KEYS.dailyState + getDailyDateKey();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveDailyState(state) {
  try {
    const key = LS_KEYS.dailyState + getDailyDateKey();
    localStorage.setItem(key, JSON.stringify(state));
    cleanOldDailyStates();
  } catch {}
}

function cleanOldDailyStates() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_KEYS.dailyState));
    if (keys.length <= 7) return;
    keys.sort();
    keys.slice(0, keys.length - 7).forEach(k => localStorage.removeItem(k));
  } catch {}
}

// Lang: saved in BOTH localStorage AND cookie for maximum compatibility
function loadLang() {
  try {
    const ls = localStorage.getItem(LS_KEYS.lang);
    if (ls) return ls;
  } catch {}
  const ck = getCookie("valorandle_lang");
  if (ck) return ck;
  // Auto-detect browser language; default to English if not Portuguese
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("pt") ? "pt-BR" : "en";
}

function saveLang(lang) {
  try { localStorage.setItem(LS_KEYS.lang, lang); } catch {}
  setCookie("valorandle_lang", lang, 365);
}

// Share text generator
function generateShareText(dailyDate, roundResults, lang) {
  const emojiMap = { correct: "🟩", close: "🟨", wrong: "🟥" };
  let text = `Valorandle Daily ${dailyDate}\n\n`;
  roundResults.forEach((round, i) => {
    text += `Round ${i + 1}: `;
    if (!round.won) {
      text += "❌\n";
    } else {
      text += round.guesses.map(g =>
        g.feedback.map(f => emojiMap[f.status]).join("")
      ).join("\n") + "\n";
    }
    text += "\n";
  });
  text += "🎮 valorandle.com";
  return text;
}
