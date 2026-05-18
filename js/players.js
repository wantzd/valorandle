// ============================================================
// AGENTGUESS — Base de Jogadores VCT Global
// Dados: vlr.gg / Liquipedia — Atualizado 2026
// vlrId = ID numérico da página /player/:id na vlr.gg
// ⚠ Entradas sem vlrId ainda precisam de verificação
// ============================================================

var PLAYERS_DB = [

  // ══════════════════════════════════════════════════════════
  // VCT AMERICAS (12 times: 10 parceiros + G2/ENVY via Ascension)
  // ══════════════════════════════════════════════════════════

  // ── FURIA ────────────────────────────────────────────────
  { id:"nerve",     vlrId:754,   name:"nerve",     displayName:"nerve",     country:"EUA",            countryCode:"US", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:23, role:"Controller", isIGL:true,  yearsActive:6, titles:["Nenhum"] },
  { id:"eeiu",      vlrId:796,   name:"eeiu",      displayName:"eeiu",      country:"Canadá",          countryCode:"CA", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:24, role:"Initiator",              yearsActive:6, titles:["Nenhum"] },
  { id:"koalanoob", vlrId:3722,  name:"koalanoob", displayName:"koalanoob", country:"Canadá",          countryCode:"CA", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:23, role:"Sentinel",               yearsActive:4, titles:["Nenhum"] },
  { id:"artzin",    vlrId:5957,  name:"artzin",    displayName:"artzin",    country:"Brasil",          countryCode:"BR", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:22, role:"Sentinel",               yearsActive:4, titles:["Nenhum"] },
  { id:"alym",      vlrId:48025, name:"alym",      displayName:"alym",      country:"Quirguistão",     countryCode:"KG", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:20, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },

  // ── G2 Esports (Ascension 2025) ──────────────────────────
  { id:"valyn",     vlrId:3885,  name:"valyn",     displayName:"valyn",     country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:24, role:"Controller", isIGL:true,  yearsActive:4, titles:["Champions 2024"] },
  { id:"trent",     vlrId:15500, name:"trent",     displayName:"trent",     country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:22, role:"Initiator",              yearsActive:4, titles:["Champions 2024"] },
  { id:"jawgemo",   vlrId:3993,  name:"jawgemo",   displayName:"jawgemo",   country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:27, role:"Duelist",                yearsActive:5, titles:["Champions 2024"] },
  { id:"BABYBAY",   vlrId:2170,  name:"BABYBAY",   displayName:"BABYBAY",   country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:31, role:"Sentinel",               yearsActive:6, titles:["Champions 2024"] },
  { id:"leaf",      vlrId:7873,  name:"leaf",      displayName:"leaf",      country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:23, role:"Flex",                   yearsActive:5, titles:["Champions 2024"] },

  // ── NRG ──────────────────────────────────────────────────
  { id:"keiko",     vlrId:11494, name:"keiko",     displayName:"keiko",     country:"Reino Unido",    countryCode:"GB", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:23, role:"Flex",                   yearsActive:4, titles:["Nenhum"] },
  { id:"brawk",     vlrId:2172,  name:"brawk",     displayName:"brawk",     country:"EUA",            countryCode:"US", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:26, role:"Initiator",              yearsActive:6, titles:["Champions 2025"] },
  { id:"mada",      vlrId:5132,  name:"mada",      displayName:"mada",      country:"Canadá",          countryCode:"CA", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:22, role:"Duelist",                yearsActive:5, titles:["Champions 2025"] },
  { id:"skuba",     vlrId:11118, name:"skuba",     displayName:"skuba",     country:"EUA",            countryCode:"US", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:23, role:"Sentinel",               yearsActive:5, titles:["Champions 2025"] },
  { id:"Ethan",     vlrId:11225, name:"Ethan",     displayName:"Ethan",     country:"EUA",            countryCode:"US", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:26, role:"Initiator", isIGL:true,  yearsActive:6, titles:["Champions 2025","Masters Reykjavik 2022"] },

  // ── MIBR ─────────────────────────────────────────────────
  { id:"zekken",    vlrId:4004,  name:"zekken",    displayName:"zekken",    country:"EUA",            countryCode:"US", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:21, role:"Duelist",                yearsActive:5, titles:["Masters Bangkok 2025"] },
  { id:"tex",       vlrId:1818,  name:"tex",       displayName:"tex",       country:"EUA",            countryCode:"US", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:26, role:"Sentinel",               yearsActive:5, titles:["VCT Americas 2023","Masters Tokyo 2023"] },
  { id:"Mazino",    vlrId:7603,  name:"Mazino",    displayName:"Mazino",    country:"Chile",           countryCode:"CL", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:24, role:"Flex",                   yearsActive:5, titles:["VCT Americas 2023","Masters Tokyo 2023"] },
  { id:"Verno",     vlrId:21668, name:"Verno",     displayName:"Verno",     country:"EUA",            countryCode:"US", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:20, role:"Controller",             yearsActive:2, titles:["Nenhum"] },
  { id:"aspas",     vlrId:8480,  name:"aspas",     displayName:"aspas",     country:"Brasil",          countryCode:"BR", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:22, role:"Duelist",                yearsActive:5, titles:["Champions 2022","Masters Copenhagen 2022","VCT Americas 2022"] },

  // ── 100 Thieves ───────────────────────────────────────────
  { id:"Asuna",     vlrId:601,   name:"Asuna",     displayName:"Asuna",     country:"EUA",            countryCode:"US", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:22, role:"Duelist",                yearsActive:6, titles:["Nenhum"] },
  { id:"bang",      vlrId:3880,  name:"bang",      displayName:"bang",      country:"EUA",            countryCode:"US", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:22, role:"Flex",                   yearsActive:6, titles:["Masters Bangkok 2025"] },
  { id:"Cryocells", vlrId:4147,  name:"Cryocells", displayName:"Cryocells", country:"EUA",            countryCode:"US", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:23, role:"Duelist",                yearsActive:6, titles:["Nenhum"] },
  { id:"vora",      vlrId:20140, name:"vora",      displayName:"vora",      country:"EUA",            countryCode:"US", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:21, role:"Initiator", isIGL:true,  yearsActive:3, titles:["Nenhum"] },
  { id:"Timotino",  vlrId:29893, name:"Timotino",  displayName:"Timotino",  country:"Canadá",          countryCode:"CA", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:18, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },

  // ── Cloud9 ────────────────────────────────────────────────
  { id:"Zellsis",   vlrId:729,   name:"Zellsis",   displayName:"Zellsis",   country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:28, role:"Flex",                   yearsActive:6, titles:["Masters Bangkok 2025"] },
  { id:"Xeppaa",    vlrId:7871,  name:"Xeppaa",    displayName:"Xeppaa",    country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:25, role:"Initiator",              yearsActive:5, titles:["Nenhum"] },
  { id:"OXY",       vlrId:18796, name:"OXY",       displayName:"OXY",       country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:20, role:"Duelist",                yearsActive:4, titles:["Nenhum"] },
  { id:"Jackk",     vlrId:44842, name:"Jackk",     displayName:"Jackk",     country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:22, role:"Flex",                   yearsActive:4, titles:["Nenhum"] },
  { id:"Notexxd",   vlrId:39021, name:"Notexxd",   displayName:"Notexxd",   country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:21, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },

  // ── Evil Geniuses ─────────────────────────────────────────
  { id:"supamen",   vlrId:826,   name:"supamen",   displayName:"supamen",   country:"EUA",            countryCode:"US", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:28, role:"Controller",             yearsActive:6, titles:["Nenhum"] },
  { id:"dgzin",     vlrId:8873,  name:"dgzin",     displayName:"dgzin",     country:"Brasil",          countryCode:"BR", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:25, role:"Duelist",                yearsActive:5, titles:["Nenhum"] },
  { id:"bao",       vlrId:34400, name:"bao",       displayName:"bao",       country:"Vietnã",         countryCode:"VN", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:19, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"Paincakes", vlrId:2164,  name:"Paincakes", displayName:"Paincakes", country:"EUA",            countryCode:"US", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"zerona",    vlrId:14048, name:"zerona",    displayName:"zerona",    country:"EUA",            countryCode:"US", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:22, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },

  // ── LEVIATÁN ──────────────────────────────────────────────
  { id:"kiNgg",     vlrId:8549,  name:"kiNgg",     displayName:"kiNgg",     country:"Chile",           countryCode:"CL", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:24, role:"Controller", isIGL:true,  yearsActive:5, titles:["VCT Americas 2023","Masters Tokyo 2023"] },
  { id:"blowz",     vlrId:21251, name:"blowz",     displayName:"blowz",     country:"Brasil",          countryCode:"BR", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:18, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"Sato",      vlrId:21659, name:"Sato",      displayName:"Sato",      country:"Brasil",          countryCode:"BR", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:19, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"spikeziN",  vlrId:21661, name:"spikeziN",  displayName:"spikeziN",  country:"Brasil",          countryCode:"BR", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:18, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"Neon_lev",  vlrId:29243, name:"Neon",      displayName:"Neon",      country:"Argentina",       countryCode:"AR", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:18, role:"Sentinel",               yearsActive:4, titles:["Nenhum"] },

  // ── ENVY (Ascension 2025) ─────────────────────────────────
  { id:"Rossy",     vlrId:1129,  name:"Rossy",     displayName:"Rossy",     country:"EUA",            countryCode:"US", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:23, role:"Controller", isIGL:true,  yearsActive:4, titles:["Nenhum"] },
  { id:"keznit",    vlrId:2462,  name:"keznit",    displayName:"keznit",    country:"Chile",           countryCode:"CL", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:24, role:"Duelist",                yearsActive:5, titles:["Nenhum"] },
  { id:"P0PPIN",    vlrId:21778, name:"P0PPIN",    displayName:"P0PPIN",    country:"EUA",            countryCode:"US", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:21, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"Demon1",    vlrId:26171, name:"Demon1",    displayName:"Demon1",    country:"EUA",            countryCode:"US", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:23, role:"Duelist",                yearsActive:4, titles:["Champions 2023"] },
  { id:"Eggsterr",  vlrId:35302, name:"Eggsterr",  displayName:"Eggsterr",  country:"EUA",            countryCode:"US", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:23, role:"Sentinel",               yearsActive:4, titles:["Nenhum"] },

  // ── Sentinels ─────────────────────────────────────────────
  { id:"johnqt",    vlrId:1265,  name:"johnqt",    displayName:"johnqt",    country:"Marrocos",        countryCode:"MA", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:27, role:"Controller", isIGL:true,  yearsActive:5, titles:["Nenhum"] },
  { id:"JonahP",    vlrId:4581,  name:"JonahP",    displayName:"JonahP",    country:"Canadá",          countryCode:"CA", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:26, role:"Flex",                   yearsActive:6, titles:["Champions 2024"] },
  { id:"cortezia",  vlrId:5395,  name:"cortezia",  displayName:"cortezia",  country:"Brasil",          countryCode:"BR", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:21, role:"Controller",             yearsActive:5, titles:["Nenhum"] },
  { id:"Reduxx",    vlrId:8419,  name:"Reduxx",    displayName:"Reduxx",    country:"EUA",            countryCode:"US", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:19, role:"Duelist",                yearsActive:6, titles:["Nenhum"] },
  { id:"Jerrwin",   vlrId:34057, name:"Jerrwin",   displayName:"Jerrwin",   country:"Canadá",          countryCode:"CA", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },

  // ── LOUD ──────────────────────────────────────────────────
  { id:"erde",      vlrId:29242, name:"erde",      displayName:"erde",      country:"Chile",           countryCode:"CL", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:18, role:"Controller", isIGL:true,  yearsActive:4, titles:["Nenhum"] },
  { id:"Virtyy",    vlrId:3983,  name:"Virtyy",    displayName:"Virtyy",    country:"Rep. Dominicana", countryCode:"DO", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:23, role:"Flex",                   yearsActive:5, titles:["Nenhum"] },
  { id:"lukxo",     vlrId:28716, name:"lukxo",     displayName:"lukxo",     country:"Brasil",          countryCode:"BR", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:19, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"cauanzin",  vlrId:6193,  name:"cauanzin",  displayName:"cauanzin",  country:"Brasil",          countryCode:"BR", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:20, role:"Initiator",              yearsActive:4, titles:["Champions 2022","VCT Americas 2022"] },
  { id:"Darker",    vlrId:10557, name:"Darker",    displayName:"Darker",    country:"Colômbia",        countryCode:"CO", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:21, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },

  // ── KRÜ Esports ───────────────────────────────────────────
  { id:"saadhak",   vlrId:727,   name:"saadhak",   displayName:"saadhak",   country:"Argentina",       countryCode:"AR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:29, role:"Controller", isIGL:true,  yearsActive:6, titles:["Champions 2022","Masters Copenhagen 2022","VCT Americas 2022"] },
  { id:"mwzera",    vlrId:939,   name:"mwzera",    displayName:"mwzera",    country:"Brasil",          countryCode:"BR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:24, role:"Duelist",                yearsActive:6, titles:["Nenhum"] },
  { id:"Less",      vlrId:8447,  name:"Less",      displayName:"Less",      country:"Brasil",          countryCode:"BR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:21, role:"Sentinel",               yearsActive:5, titles:["Champions 2022","Masters Copenhagen 2022","VCT Americas 2022"] },
  { id:"silentzz",  vlrId:11921, name:"silentzz",  displayName:"silentzz",  country:"Brasil",          countryCode:"BR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:21, role:"Controller",             yearsActive:4, titles:["Nenhum"] },
  { id:"Dantedeu5", vlrId:41135, name:"Dantedeu5", displayName:"Dantedeu5", country:"Argentina",       countryCode:"AR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:18, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },

  // ══════════════════════════════════════════════════════════
  // VCT EMEA (12 times)
  // ══════════════════════════════════════════════════════════

  // ── Fnatic ────────────────────────────────────────────────
  { id:"Boaster",   vlrId:438,   name:"Boaster",   displayName:"Boaster",   country:"Reino Unido",    countryCode:"GB", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:28, role:"Controller", isIGL:true,  yearsActive:6, titles:["Champions 2021"] },
  { id:"Alfajer",   vlrId:9810,  name:"Alfajer",   displayName:"Alfajer",   country:"Turquia",         countryCode:"TR", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:21, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"kaajak",    vlrId:9554,  name:"kaajak",    displayName:"kaajak",    country:"Dinamarca",       countryCode:"DK", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"crashies",  vlrId:4,     name:"crashies",  displayName:"crashies",  country:"EUA",            countryCode:"US", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:23, role:"Initiator",              yearsActive:5, titles:["Nenhum"] },
  { id:"CyvOph",    vlrId:13258, name:"CyvOph",    displayName:"CyvOph",    country:"França",          countryCode:"FR", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },

  // ── FUT Esports ───────────────────────────────────────────
  { id:"yetujey",   vlrId:8369,  name:"yetujey",   displayName:"yetujey",   country:"Turquia",         countryCode:"TR", team:"FUT Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"xeus",      vlrId:12793, name:"xeus",      displayName:"xeus",      country:"Turquia",         countryCode:"TR", team:"FUT Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"sociablEE", vlrId:5568,  name:"sociablEE", displayName:"sociablEE", country:"Turquia",         countryCode:"TR", team:"FUT Esports",   league:"VCT EMEA", leagueId:"emea", age:23, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"s0pp",      vlrId:39357, name:"s0pp",      displayName:"s0pp",      country:"Turquia",         countryCode:"TR", team:"FUT Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"KROSTALY",  vlrId:15735, name:"KROSTALY",  displayName:"KROSTALY",  country:"Turquia",         countryCode:"TR", team:"FUT Esports",   league:"VCT EMEA", leagueId:"emea", age:24, role:"Controller", isIGL:true,  yearsActive:4, titles:["Nenhum"] },

  // ── Gentle Mates (substituiu KOI) ─────────────────────────
  { id:"Minny",     vlrId:23169, name:"Minny",     displayName:"Minny",     country:"França",          countryCode:"FR", team:"Gentle Mates",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"bipo",      vlrId:18400, name:"bipo",      displayName:"bipo",      country:"França",          countryCode:"FR", team:"Gentle Mates",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"GLYPH",     vlrId:8286,  name:"GLYPH",     displayName:"GLYPH",     country:"França",          countryCode:"FR", team:"Gentle Mates",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"marteen",   vlrId:10307, name:"marteen",   displayName:"marteen",   country:"Bélgica",         countryCode:"BE", team:"Gentle Mates",  league:"VCT EMEA", leagueId:"emea", age:24, role:"Sentinel",  isIGL:true,  yearsActive:4, titles:["Nenhum"] },
  { id:"starxo",    vlrId:565,   name:"starxo",    displayName:"starxo",    country:"França",          countryCode:"FR", team:"Gentle Mates",  league:"VCT EMEA", leagueId:"emea", age:26, role:"Controller",             yearsActive:6, titles:["Nenhum"] },

  // ── GIANTX (ex-Giants Gaming) ─────────────────────────────
  { id:"westside",  vlrId:34684, name:"westside",  displayName:"westside",  country:"Espanha",         countryCode:"ES", team:"GIANTX",        league:"VCT EMEA", leagueId:"emea", age:23, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"GRUBINHO",  vlrId:5550,  name:"GRUBINHO",  displayName:"GRUBINHO",  country:"Brasil",          countryCode:"BR", team:"GIANTX",        league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"Flickless", vlrId:6959,  name:"Flickless", displayName:"Flickless", country:"Espanha",         countryCode:"ES", team:"GIANTX",        league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"Cloud_gx",  vlrId:4181,  name:"Cloud",     displayName:"Cloud",     country:"Espanha",         countryCode:"ES", team:"GIANTX",        league:"VCT EMEA", leagueId:"emea", age:23, role:"Controller", isIGL:true,  yearsActive:4, titles:["Nenhum"] },
  { id:"ara",       vlrId:11332, name:"ara",       displayName:"ara",       country:"Espanha",         countryCode:"ES", team:"GIANTX",        league:"VCT EMEA", leagueId:"emea", age:21, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },

  // ── Karmine Corp ──────────────────────────────────────────
  { id:"avez",      vlrId:5654,  name:"avez",      displayName:"avez",      country:"França",          countryCode:"FR", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"SUYGETSU",  vlrId:2858,  name:"SUYGETSU",  displayName:"SUYGETSU",  country:"Ucrânia",         countryCode:"UA", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:23, role:"Flex",                   yearsActive:4, titles:["Nenhum"] },
  { id:"dos9",      vlrId:16215, name:"dos9",      displayName:"dos9",      country:"França",          countryCode:"FR", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:21, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"LêwN",      vlrId:20144, name:"LêwN",      displayName:"LêwN",      country:"França",          countryCode:"FR", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Controller",             yearsActive:3, titles:["Nenhum"] },
  { id:"N4RRATE",   vlrId:36245, name:"N4RRATE",   displayName:"N4RRATE",   country:"França",          countryCode:"FR", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:23, role:"Sentinel",  isIGL:true,  yearsActive:3, titles:["Nenhum"] },

  // ── Natus Vincere (NAVI) ──────────────────────────────────
  { id:"Filu",      vlrId:4544,  name:"Filu",      displayName:"Filu",      country:"Ucrânia",         countryCode:"UA", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"hiro",      vlrId:29867, name:"hiro",      displayName:"hiro",      country:"Rússia",          countryCode:"RU", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"Ruxic",     vlrId:18677, name:"Ruxic",     displayName:"Ruxic",     country:"Ucrânia",         countryCode:"UA", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"chloric",   vlrId:15639, name:"chloric",   displayName:"chloric",   country:"Rússia",          countryCode:"RU", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"ExiT",      vlrId:11917, name:"ExiT",      displayName:"ExiT",      country:"Ucrânia",         countryCode:"UA", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:23, role:"Controller", isIGL:true,  yearsActive:4, titles:["Nenhum"] },

  // ── Team Heretics ─────────────────────────────────────────
  { id:"Wo0t",      vlrId:21328, name:"Wo0t",      displayName:"Wo0t",      country:"Finlândia",       countryCode:"FI", team:"Team Heretics", league:"VCT EMEA", leagueId:"emea", age:23, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },
  { id:"riens",     vlrId:10971, name:"RieNs",     displayName:"RieNs",     country:"França",          countryCode:"FR", team:"Team Heretics", league:"VCT EMEA", leagueId:"emea", age:21, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"Koshmaras", vlrId:23365, name:"Koshmaras", displayName:"Koshmaras", country:"Polônia",         countryCode:"PL", team:"Team Heretics", league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"Boo",       vlrId:1144,  name:"Boo",       displayName:"Boo",       country:"França",          countryCode:"FR", team:"Team Heretics", league:"VCT EMEA", leagueId:"emea", age:21, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"benjyfishy",vlrId:29873, name:"benjyfishy",displayName:"benjyfishy",country:"Reino Unido",    countryCode:"GB", team:"Team Heretics", league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },

  // ── Team Liquid ───────────────────────────────────────────
  { id:"wayne",     vlrId:24628, name:"wayne",     displayName:"wayne",     country:"Reino Unido",    countryCode:"GB", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"purp0",     vlrId:1885,  name:"purp0",     displayName:"purp0",     country:"Reino Unido",    countryCode:"GB", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"nAts",      vlrId:457,   name:"nAts",      displayName:"nAts",      country:"Rússia",          countryCode:"RU", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:24, role:"Sentinel",               yearsActive:5, titles:["Nenhum"] },
  { id:"MiniBoo",   vlrId:18350, name:"MiniBoo",   displayName:"MiniBoo",   country:"França",          countryCode:"FR", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:21, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"kamo",      vlrId:14681, name:"kamo",      displayName:"kamo",      country:"Reino Unido",    countryCode:"GB", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },

  // ── Team Vitality ─────────────────────────────────────────
  { id:"Derke",     vlrId:5022,  name:"Derke",     displayName:"Derke",     country:"Finlândia",       countryCode:"FI", team:"Team Vitality", league:"VCT EMEA", leagueId:"emea", age:23, role:"Duelist",                yearsActive:5, titles:["Nenhum"] },
  { id:"Chronicle", vlrId:458,   name:"Chronicle", displayName:"Chronicle", country:"Reino Unido",    countryCode:"GB", team:"Team Vitality", league:"VCT EMEA", leagueId:"emea", age:23, role:"Flex",                   yearsActive:4, titles:["Nenhum"] },
  { id:"Sayonara",  vlrId:33902, name:"Sayonara",  displayName:"Sayonara",  country:"França",          countryCode:"FR", team:"Team Vitality", league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"PROFEK",    vlrId:5554,  name:"PROFEK",    displayName:"PROFEK",    country:"Polônia",         countryCode:"PL", team:"Team Vitality", league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"Jamppi",    vlrId:9780,  name:"Jamppi",    displayName:"Jamppi",    country:"Finlândia",       countryCode:"FI", team:"Team Vitality", league:"VCT EMEA", leagueId:"emea", age:25, role:"Initiator",              yearsActive:5, titles:["Masters Berlim 2021"] },

  // ── BBL Esports ───────────────────────────────────────────
  { id:"BBL_Rose",    vlrId:5565,  name:"Rosé",       displayName:"Rosé",       country:"Turquia",   countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"loversrock",  vlrId:40935, name:"lovers rock", displayName:"lovers rock",country:"Turquia",   countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:21, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"Loita",       vlrId:24344, name:"Loita",       displayName:"Loita",      country:"Turquia",   countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"Lar0k",       vlrId:31305, name:"Lar0k",       displayName:"Lar0k",      country:"Turquia",   countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:23, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },
  { id:"Crewen",      vlrId:12795, name:"Crewen",      displayName:"Crewen",     country:"Turquia",   countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },

  // ── PACIFIC (Ascension EMEA — ⚠ verificar roster) ────────
  { id:"seven_pac", name:"seven",     displayName:"seven",     country:"Croácia",      countryCode:"HR", team:"PACIFIC",       league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"qpert",     name:"qpert",     displayName:"qpert",     country:"França",       countryCode:"FR", team:"PACIFIC",       league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"NINJA",     name:"NINJA",     displayName:"NINJA",     country:"Alemanha",     countryCode:"DE", team:"PACIFIC",       league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"cNed",      name:"cNed",      displayName:"cNed",      country:"Turquia",      countryCode:"TR", team:"PACIFIC",       league:"VCT EMEA", leagueId:"emea", age:24, role:"Duelist",                yearsActive:5, titles:["Champions 2021"] },
  { id:"al0rante",  name:"al0rante",  displayName:"al0rante",  country:"Itália",       countryCode:"IT", team:"PACIFIC",       league:"VCT EMEA", leagueId:"emea", age:22, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },

  // ── Eternal Fire (substituiu ULF — ⚠ verificar roster) ───
  { id:"Izzy",      name:"Izzy",      displayName:"Izzy",      country:"Turquia",      countryCode:"TR", team:"Eternal Fire",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"echo_ef",   name:"echo",      displayName:"echo",      country:"Turquia",      countryCode:"TR", team:"Eternal Fire",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"nekky",     name:"nekky",     displayName:"nekky",     country:"Turquia",      countryCode:"TR", team:"Eternal Fire",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"audaz",     name:"audaz",     displayName:"audaz",     country:"Turquia",      countryCode:"TR", team:"Eternal Fire",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },
  { id:"Favian",    name:"Favian",    displayName:"Favian",    country:"Turquia",      countryCode:"TR", team:"Eternal Fire",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },

  // ══════════════════════════════════════════════════════════
  // VCT PACIFIC (12 times)
  // ══════════════════════════════════════════════════════════

  // ── Paper Rex ─────────────────────────────────────────────
  { id:"f0rsakeN",  vlrId:9801,  name:"f0rsakeN",  displayName:"f0rsakeN",  country:"Singapura",    countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:24, role:"Duelist",                yearsActive:5, titles:["Masters Bangkok 2025"] },
  { id:"d4v41",     vlrId:9803,  name:"d4v41",     displayName:"d4v41",     country:"Singapura",    countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:26, role:"Sentinel",  isIGL:true,  yearsActive:5, titles:["Masters Bangkok 2025"] },
  { id:"Jinggg",    vlrId:7378,  name:"Jinggg",    displayName:"Jinggg",    country:"Singapura",    countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:23, role:"Duelist",                yearsActive:4, titles:["Masters Bangkok 2025"] },
  { id:"something", vlrId:17086, name:"something", displayName:"something", country:"Singapura",    countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",                   yearsActive:3, titles:["Masters Bangkok 2025"] },
  { id:"invy",      vlrId:8504,  name:"invy",      displayName:"invy",      country:"Singapura",    countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },

  // ── ZETA Division ─────────────────────────────────────────
  { id:"SugarZ3ro", vlrId:6668,  name:"SugarZ3ro", displayName:"SugarZ3ro", country:"Japão",        countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:21, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"Xdll",      vlrId:25221, name:"Xdll",      displayName:"Xdll",      country:"Japão",        countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"SyouTa",    vlrId:12990, name:"SyouTa",    displayName:"SyouTa",    country:"Japão",        countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"eKo",       vlrId:1960,  name:"eKo",       displayName:"eKo",       country:"Japão",        countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"Absol",     vlrId:34776, name:"Absol",     displayName:"Absol",     country:"Japão",        countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:23, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },

  // ── DRX ──────────────────────────────────────────────────
  { id:"Yong",      vlrId:51238, name:"Yong",      displayName:"Yong",      country:"Coreia do Sul",countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"MaKo",      vlrId:4462,  name:"MaKo",      displayName:"MaKo",      country:"Coreia do Sul",countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:23, role:"Sentinel",               yearsActive:3, titles:["Nenhum"] },
  { id:"Hermes",    vlrId:17049, name:"Hermes",    displayName:"Hermes",    country:"Coreia do Sul",countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"HYUNMIN",   vlrId:28400, name:"HYUNMIN",   displayName:"HYUNMIN",   country:"Coreia do Sul",countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"free1ng",   vlrId:1916,  name:"free1ng",   displayName:"free1ng",   country:"Coreia do Sul",countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:22, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },
  { id:"BeYN",      vlrId:4678,  name:"BeYN",      displayName:"BeYN",      country:"Coreia do Sul",countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },

  // ── Gen.G ─────────────────────────────────────────────────
  { id:"t3xture",   vlrId:9196,  name:"t3xture",   displayName:"t3xture",   country:"Coreia do Sul",countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"karon",     vlrId:34974, name:"karon",     displayName:"karon",     country:"Coreia do Sul",countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:23, role:"Sentinel",               yearsActive:3, titles:["Nenhum"] },
  { id:"Ash",       vlrId:25017, name:"Ash",       displayName:"Ash",       country:"Coreia do Sul",countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"Lakia",     vlrId:773,   name:"Lakia",     displayName:"Lakia",     country:"Coreia do Sul",countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:25, role:"Initiator",              yearsActive:5, titles:["Nenhum"] },
  { id:"ZynX",      vlrId:51099, name:"ZynX",      displayName:"ZynX",      country:"Coreia do Sul",countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:22, role:"Controller", isIGL:true,  yearsActive:2, titles:["Nenhum"] },

  // ── T1 ────────────────────────────────────────────────────
  { id:"stax",      vlrId:485,   name:"stax",      displayName:"stax",      country:"Coreia do Sul",countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:26, role:"Initiator", isIGL:true,  yearsActive:5, titles:["Nenhum"] },
  { id:"Munchkin",  vlrId:2489,  name:"Munchkin",  displayName:"Munchkin",  country:"Coreia do Sul",countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:24, role:"Controller",             yearsActive:5, titles:["Nenhum"] },
  { id:"Meteor",    vlrId:13039, name:"Meteor",    displayName:"Meteor",    country:"Coreia do Sul",countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:23, role:"Flex",                   yearsActive:4, titles:["Nenhum"] },
  { id:"Carpe",     vlrId:31207, name:"Carpe",     displayName:"Carpe",     country:"Coreia do Sul",countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:28, role:"Duelist",                yearsActive:4, titles:["Nenhum"] },
  { id:"iZu",       vlrId:29833, name:"iZu",       displayName:"iZu",       country:"Coreia do Sul",countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"BuZz",      vlrId:804,   name:"BuZz",      displayName:"BuZz",      country:"Coreia do Sul",countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:23, role:"Initiator",              yearsActive:5, titles:["Nenhum"] },

  // ── DetonatioN FocusMe ────────────────────────────────────
  { id:"Meiy",      vlrId:6672,  name:"Meiy",      displayName:"Meiy",      country:"Japão",        countryCode:"JP", team:"DetonatioN FocusMe", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",       yearsActive:3, titles:["Nenhum"] },
  { id:"akame",     vlrId:13002, name:"akame",     displayName:"akame",     country:"Japão",        countryCode:"JP", team:"DetonatioN FocusMe", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"SSeeS",     vlrId:21438, name:"SSeeS",     displayName:"SSeeS",     country:"Japão",        countryCode:"JP", team:"DetonatioN FocusMe", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",   yearsActive:2, titles:["Nenhum"] },
  { id:"Caedye",    vlrId:29841, name:"Caedye",    displayName:"Caedye",    country:"Japão",        countryCode:"JP", team:"DetonatioN FocusMe", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:2, titles:["Nenhum"] },
  { id:"yatsuka",   vlrId:29843, name:"yatsuka",   displayName:"yatsuka",   country:"Japão",        countryCode:"JP", team:"DetonatioN FocusMe", league:"VCT Pacific", leagueId:"pacific", age:23, role:"Controller", isIGL:true, yearsActive:3, titles:["Nenhum"] },

  // ── Global Esports ────────────────────────────────────────
  { id:"xavi8k",    vlrId:7754,  name:"xavi8k",    displayName:"xavi8k",    country:"Índia",        countryCode:"IN", team:"Global Esports", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"PatMen",    vlrId:13744, name:"PatMen",    displayName:"PatMen",    country:"Índia",        countryCode:"IN", team:"Global Esports", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"Kr1stal",   vlrId:5796,  name:"Kr1stal",   displayName:"Kr1stal",   country:"Índia",        countryCode:"IN", team:"Global Esports", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",       yearsActive:3, titles:["Nenhum"] },
  { id:"autumn",    vlrId:872,   name:"autumn",    displayName:"autumn",    country:"Índia",        countryCode:"IN", team:"Global Esports", league:"VCT Pacific", leagueId:"pacific", age:25, role:"Sentinel",   yearsActive:5, titles:["Nenhum"] },
  { id:"UdoTan",    vlrId:4428,  name:"UdoTan",    displayName:"UdoTan",    country:"Índia",        countryCode:"IN", team:"Global Esports", league:"VCT Pacific", leagueId:"pacific", age:23, role:"Controller", isIGL:true, yearsActive:4, titles:["Nenhum"] },

  // ── Nongshim RedForce ─────────────────────────────────────
  { id:"Rb",        vlrId:488,   name:"Rb",        displayName:"Rb",        country:"Japão",        countryCode:"JP", team:"Nongshim RedForce", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:4, titles:["Nenhum"] },
  { id:"Xross",     vlrId:42772, name:"Xross",     displayName:"Xross",     country:"Coreia do Sul",countryCode:"KR", team:"Nongshim RedForce", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",       yearsActive:2, titles:["Nenhum"] },
  { id:"Ivy",       vlrId:31829, name:"Ivy",       displayName:"Ivy",       country:"Coreia do Sul",countryCode:"KR", team:"Nongshim RedForce", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",  yearsActive:2, titles:["Nenhum"] },
  { id:"Francis",   vlrId:31828, name:"Francis",   displayName:"Francis",   country:"Coreia do Sul",countryCode:"KR", team:"Nongshim RedForce", league:"VCT Pacific", leagueId:"pacific", age:23, role:"Controller", isIGL:true, yearsActive:3, titles:["Nenhum"] },
  { id:"Dambi",     vlrId:31827, name:"Dambi",     displayName:"Dambi",     country:"Coreia do Sul",countryCode:"KR", team:"Nongshim RedForce", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",   yearsActive:2, titles:["Nenhum"] },

  // ── Rex Regum Qeon ────────────────────────────────────────
  { id:"xffero",    vlrId:4871,  name:"xffero",    displayName:"xffero",    country:"Indonésia",    countryCode:"ID", team:"Rex Regum Qeon", league:"VCT Pacific", leagueId:"pacific", age:24, role:"Initiator",  isIGL:true, yearsActive:5, titles:["Nenhum"] },
  { id:"monyet",    vlrId:8497,  name:"monyet",    displayName:"monyet",    country:"Indonésia",    countryCode:"ID", team:"Rex Regum Qeon", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"Kushy",     vlrId:4866,  name:"Kushy",     displayName:"Kushy",     country:"Indonésia",    countryCode:"ID", team:"Rex Regum Qeon", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",       yearsActive:3, titles:["Nenhum"] },
  { id:"Jemkin",    vlrId:24895, name:"Jemkin",    displayName:"Jemkin",    country:"Indonésia",    countryCode:"ID", team:"Rex Regum Qeon", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",   yearsActive:2, titles:["Nenhum"] },
  { id:"crazyguy",  vlrId:1430,  name:"crazyguy",  displayName:"crazyguy",  country:"Indonésia",    countryCode:"ID", team:"Rex Regum Qeon", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Controller", yearsActive:3, titles:["Nenhum"] },

  // ── Team Secret ───────────────────────────────────────────
  { id:"Sylvan",    vlrId:4056,  name:"Sylvan",    displayName:"Sylvan",    country:"Coreia do Sul",countryCode:"KR", team:"Team Secret",   league:"VCT Pacific", leagueId:"pacific", age:24, role:"Controller", isIGL:true, yearsActive:3, titles:["Nenhum"] },
  { id:"Rimuru",    vlrId:48439, name:"Rimuru",    displayName:"Rimuru",    country:"Filipinas",    countryCode:"PH", team:"Team Secret",   league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:2, titles:["Nenhum"] },
  { id:"kellyS",    vlrId:7437,  name:"kellyS",    displayName:"kellyS",    country:"Filipinas",    countryCode:"PH", team:"Team Secret",   league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"JessieVash",vlrId:2334,  name:"JessieVash",displayName:"JessieVash",country:"Filipinas",    countryCode:"PH", team:"Team Secret",   league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",       yearsActive:4, titles:["Nenhum"] },
  { id:"Zeus_ts",   vlrId:46135, name:"Zeus",      displayName:"Zeus",      country:"Filipinas",    countryCode:"PH", team:"Team Secret",   league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",   yearsActive:2, titles:["Nenhum"] },
  { id:"BerserX",   vlrId:4874,  name:"BerserX",   displayName:"BerserX",   country:"Filipinas",    countryCode:"PH", team:"Team Secret",   league:"VCT Pacific", leagueId:"pacific", age:23, role:"Flex",       yearsActive:4, titles:["Nenhum"] },

  // ── VARREL ────────────────────────────────────────────────
  { id:"zexy",      vlrId:37532, name:"zexy",      displayName:"zexy",      country:"Japão",        countryCode:"JP", team:"VARREL",        league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:2, titles:["Nenhum"] },
  { id:"XuNa",      vlrId:42733, name:"XuNa",      displayName:"XuNa",      country:"Japão",        countryCode:"JP", team:"VARREL",        league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",  yearsActive:2, titles:["Nenhum"] },
  { id:"oonzmlp",   vlrId:34926, name:"oonzmlp",   displayName:"oonzmlp",   country:"Japão",        countryCode:"JP", team:"VARREL",        league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",       yearsActive:2, titles:["Nenhum"] },
  { id:"Klaus",     vlrId:4426,  name:"Klaus",     displayName:"Klaus",     country:"Japão",        countryCode:"JP", team:"VARREL",        league:"VCT Pacific", leagueId:"pacific", age:23, role:"Controller", isIGL:true, yearsActive:3, titles:["Nenhum"] },
  { id:"C1ndeR",    vlrId:2149,  name:"C1ndeR",    displayName:"C1ndeR",    country:"Japão",        countryCode:"JP", team:"VARREL",        league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
  { id:"Foxy9",     vlrId:11600, name:"Foxy9",     displayName:"Foxy9",     country:"Coreia do Sul",countryCode:"KR", team:"VARREL",        league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },

  // ── FULL SENSE (substituiu Talon Esports) ─────────────────
  { id:"Leviathan", vlrId:27254, name:"Leviathan", displayName:"Leviathan", country:"Tailândia",    countryCode:"TH", team:"FULL SENSE",    league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"JitboyS",   vlrId:13788, name:"JitboyS",   displayName:"JitboyS",   country:"Tailândia",    countryCode:"TH", team:"FULL SENSE",    league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"killua",    vlrId:13784, name:"killua",    displayName:"killua",    country:"Tailândia",    countryCode:"TH", team:"FULL SENSE",    league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",       yearsActive:2, titles:["Nenhum"] },
  { id:"Primmie",   vlrId:25255, name:"Primmie",   displayName:"Primmie",   country:"Tailândia",    countryCode:"TH", team:"FULL SENSE",    league:"VCT Pacific", leagueId:"pacific", age:22, role:"Controller", isIGL:true, yearsActive:3, titles:["Nenhum"] },
  { id:"Crws",      vlrId:3977,  name:"Crws",      displayName:"Crws",      country:"Tailândia",    countryCode:"TH", team:"FULL SENSE",    league:"VCT Pacific", leagueId:"pacific", age:21, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"seph1roth", vlrId:27244, name:"seph1roth", displayName:"seph1roth", country:"Tailândia",    countryCode:"TH", team:"FULL SENSE",    league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",   yearsActive:2, titles:["Nenhum"] },

  // ══════════════════════════════════════════════════════════
  // VCT CHINA (12 times)
  // ══════════════════════════════════════════════════════════

  // ── Edward Gaming (EDG) ───────────────────────────────────
  { id:"Smoggy",    vlrId:4742,  name:"Smoggy",    displayName:"Smoggy",    country:"China",        countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"nobody",    vlrId:3017,  name:"nobody",    displayName:"nobody",    country:"China",        countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:23, role:"Sentinel",               yearsActive:3, titles:["Nenhum"] },
  { id:"ZmjjKK",    vlrId:3520,  name:"ZmjjKK",    displayName:"ZmjjKK",    country:"China",        countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:24, role:"Flex",                   yearsActive:4, titles:["Nenhum"] },
  { id:"CHICHOO",   vlrId:15559, name:"CHICHOO",   displayName:"CHICHOO",   country:"China",        countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:25, role:"Controller", isIGL:true,  yearsActive:4, titles:["Nenhum"] },
  { id:"Jieni7",    vlrId:51244, name:"Jieni7",    displayName:"Jieni7",    country:"China",        countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },

  // ── Bilibili Gaming (BLG) ─────────────────────────────────
  { id:"rushia",    vlrId:48878, name:"rushia",    displayName:"rushia",    country:"China",        countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"Knight_blg",vlrId:4774,  name:"Knight",    displayName:"Knight",    country:"China",        countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:23, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"nephh",     vlrId:10698, name:"nephh",     displayName:"nephh",     country:"China",        countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"whzy",      vlrId:4885,  name:"whzy",      displayName:"whzy",      country:"China",        countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:3, titles:["Nenhum"] },
  { id:"yilai",     vlrId:62947, name:"yilai",     displayName:"yilai",     country:"China",        countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:22, role:"Controller", isIGL:true,  yearsActive:2, titles:["Nenhum"] },

  // ── FunPlus Phoenix (FPX) ─────────────────────────────────
  { id:"AAAAY",     vlrId:19530, name:"AAAAY",     displayName:"AAAAY",     country:"China",        countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"BerLIN",    vlrId:7857,  name:"BerLIN",    displayName:"BerLIN",    country:"China",        countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"Life",      vlrId:3028,  name:"Life",      displayName:"Life",      country:"China",        countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:23, role:"Sentinel",               yearsActive:3, titles:["Nenhum"] },
  { id:"sScary",    vlrId:4382,  name:"sScary",    displayName:"sScary",    country:"Tailândia",    countryCode:"TH", team:"FPX",           league:"VCT China", leagueId:"china", age:22, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"Setrod",    vlrId:50025, name:"Setrod",    displayName:"Setrod",    country:"China",        countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:22, role:"Controller", isIGL:true,  yearsActive:2, titles:["Nenhum"] },

  // ── Trace Esports ─────────────────────────────────────────
  { id:"LuoK1ng",   vlrId:3045,  name:"LuoK1ng",   displayName:"LuoK1ng",   country:"China",        countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:23, role:"Duelist",                yearsActive:4, titles:["Nenhum"] },
  { id:"Kai_trc",   vlrId:37494, name:"Kai",       displayName:"Kai",       country:"China",        countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"Xlele",     vlrId:54487, name:"Xlele",     displayName:"Xlele",     country:"China",        countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"Viva",      vlrId:36415, name:"Viva",      displayName:"Viva",      country:"China",        countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"DeLb",      vlrId:10821, name:"deLb",      displayName:"deLb",      country:"China",        countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:23, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },

  // ── All Gamers ────────────────────────────────────────────
  { id:"K1ra",      vlrId:46748, name:"K1ra",      displayName:"K1ra",      country:"China",        countryCode:"CN", team:"All Gamers",    league:"VCT China", leagueId:"china", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"Shr1mp",    vlrId:25494, name:"Shr1mp",    displayName:"Shr1mp",    country:"China",        countryCode:"CN", team:"All Gamers",    league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"Septem7",   vlrId:3031,  name:"Septem7",   displayName:"Septem7",   country:"China",        countryCode:"CN", team:"All Gamers",    league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"f4ngeer",   vlrId:21216, name:"f4ngeer",   displayName:"f4ngeer",   country:"China",        countryCode:"CN", team:"All Gamers",    league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"iamgrq",    vlrId:58959, name:"iamgrq",    displayName:"iamgrq",    country:"China",        countryCode:"CN", team:"All Gamers",    league:"VCT China", leagueId:"china", age:23, role:"Controller", isIGL:true,  yearsActive:2, titles:["Nenhum"] },

  // ── Dragon Ranger Gaming ──────────────────────────────────
  { id:"vo0kashu",  vlrId:3741,  name:"vo0kashu",  displayName:"vo0kashu",  country:"China",        countryCode:"CN", team:"Dragon Ranger", league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:3, titles:["Nenhum"] },
  { id:"Nicc",      vlrId:11524, name:"Nicc",      displayName:"Nicc",      country:"China",        countryCode:"CN", team:"Dragon Ranger", league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"SpiritZ1",  vlrId:31753, name:"SpiritZ1",  displayName:"SpiritZ1",  country:"China",        countryCode:"CN", team:"Dragon Ranger", league:"VCT China", leagueId:"china", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"Akeman",    vlrId:52904, name:"Akeman",    displayName:"Akeman",    country:"China",        countryCode:"CN", team:"Dragon Ranger", league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"Flex1n",    vlrId:4705,  name:"Flex1n",    displayName:"Flex1n",    country:"China",        countryCode:"CN", team:"Dragon Ranger", league:"VCT China", leagueId:"china", age:23, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },

  // ── JD Gaming ─────────────────────────────────────────────
  { id:"stew",      vlrId:16924, name:"stew",      displayName:"stew",      country:"China",        countryCode:"CN", team:"JD Gaming",     league:"VCT China", leagueId:"china", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"jkuro",     vlrId:3519,  name:"jkuro",     displayName:"jkuro",     country:"China",        countryCode:"CN", team:"JD Gaming",     league:"VCT China", leagueId:"china", age:23, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },
  { id:"zhe",       vlrId:49476, name:"zhe",       displayName:"zhe",       country:"China",        countryCode:"CN", team:"JD Gaming",     league:"VCT China", leagueId:"china", age:23, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"Yuicaw",    vlrId:11218, name:"Yuicaw",    displayName:"Yuicaw",    country:"China",        countryCode:"CN", team:"JD Gaming",     league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"coconut",   vlrId:12365, name:"coconut",   displayName:"coconut",   country:"China",        countryCode:"CN", team:"JD Gaming",     league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },

  // ── Nova Esports ──────────────────────────────────────────
  { id:"OBONE",     vlrId:36670, name:"OBONE",     displayName:"OBONE",     country:"China",        countryCode:"CN", team:"Nova Esports",  league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"Ezeir",     vlrId:46460, name:"Ezeir",     displayName:"Ezeir",     country:"China",        countryCode:"CN", team:"Nova Esports",  league:"VCT China", leagueId:"china", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"GREEN_nov", vlrId:34181, name:"GREEN",     displayName:"GREEN",     country:"China",        countryCode:"CN", team:"Nova Esports",  league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"heybay",    vlrId:4712,  name:"heybay",    displayName:"heybay",    country:"China",        countryCode:"CN", team:"Nova Esports",  league:"VCT China", leagueId:"china", age:23, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },
  { id:"GuanG",     vlrId:41054, name:"GuanG",     displayName:"GuanG",     country:"China",        countryCode:"CN", team:"Nova Esports",  league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },

  // ── Titan Esports Club ────────────────────────────────────
  { id:"Haodong",   vlrId:4720,  name:"Haodong",   displayName:"Haodong",   country:"China",        countryCode:"CN", team:"Titan Esports", league:"VCT China", leagueId:"china", age:24, role:"Flex",      isIGL:true,  yearsActive:4, titles:["Nenhum"] },
  { id:"Dynamite",  vlrId:42235, name:"Dynamite",  displayName:"Dynamite",  country:"China",        countryCode:"CN", team:"Titan Esports", league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"Abo",       vlrId:5011,  name:"Abo",       displayName:"Abo",       country:"China",        countryCode:"CN", team:"Titan Esports", league:"VCT China", leagueId:"china", age:23, role:"Initiator",              yearsActive:3, titles:["Nenhum"] },
  { id:"CoCo",      vlrId:47629, name:"CoCo",      displayName:"CoCo",      country:"China",        countryCode:"CN", team:"Titan Esports", league:"VCT China", leagueId:"china", age:22, role:"Controller",             yearsActive:2, titles:["Nenhum"] },
  { id:"lucas_tec", vlrId:19677, name:"lucas",     displayName:"lucas",     country:"China",        countryCode:"CN", team:"Titan Esports", league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },

  // ── TYLOO ─────────────────────────────────────────────────
  { id:"Splash",    vlrId:36685, name:"splash",    displayName:"splash",    country:"China",        countryCode:"CN", team:"TYLOO",         league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"Scales",    vlrId:39485, name:"Scales",    displayName:"Scales",    country:"China",        countryCode:"CN", team:"TYLOO",         league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"Erv",       vlrId:55085, name:"Erv",       displayName:"Erv",       country:"China",        countryCode:"CN", team:"TYLOO",         league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },
  { id:"sword9",    vlrId:3049,  name:"sword9",    displayName:"sword9",    country:"China",        countryCode:"CN", team:"TYLOO",         league:"VCT China", leagueId:"china", age:23, role:"Flex",                   yearsActive:3, titles:["Nenhum"] },
  { id:"slowly",    vlrId:41739, name:"slowly",    displayName:"slowly",    country:"China",        countryCode:"CN", team:"TYLOO",         league:"VCT China", leagueId:"china", age:24, role:"Controller", isIGL:true,  yearsActive:4, titles:["Nenhum"] },

  // ── Wolves Esports ────────────────────────────────────────
  { id:"SiuFatBB",  vlrId:7849,  name:"SiuFatBB",  displayName:"SiuFatBB",  country:"China",        countryCode:"CN", team:"Wolves",        league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"glacier",   vlrId:49973, name:"glacier",   displayName:"glacier",   country:"Taiwan",       countryCode:"TW", team:"Wolves",        league:"VCT China", leagueId:"china", age:21, role:"Duelist",                yearsActive:1, titles:["Nenhum"] },
  { id:"jowa",      vlrId:19292, name:"jowa",      displayName:"jowa",      country:"China",        countryCode:"CN", team:"Wolves",        league:"VCT China", leagueId:"china", age:22, role:"Flex",                   yearsActive:2, titles:["Nenhum"] },
  { id:"yosemite",  vlrId:6022,  name:"yosemite",  displayName:"yosemite",  country:"China",        countryCode:"CN", team:"Wolves",        league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"Spring",    vlrId:14125, name:"Spring",    displayName:"Spring",    country:"China",        countryCode:"CN", team:"Wolves",        league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:3, titles:["Nenhum"] },

  // ── Xi Lai Gaming (XLG) ───────────────────────────────────
  { id:"WsLeo",     vlrId:24308, name:"WsLeo",     displayName:"WsLeo",     country:"China",        countryCode:"CN", team:"XLG",           league:"VCT China", leagueId:"china", age:22, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"Lysoar",    vlrId:37489, name:"Lysoar",    displayName:"Lysoar",    country:"China",        countryCode:"CN", team:"XLG",           league:"VCT China", leagueId:"china", age:21, role:"Duelist",                yearsActive:2, titles:["Nenhum"] },
  { id:"NoMan",     vlrId:11527, name:"NoMan",     displayName:"NoMan",     country:"China",        countryCode:"CN", team:"XLG",           league:"VCT China", leagueId:"china", age:23, role:"Controller", isIGL:true,  yearsActive:3, titles:["Nenhum"] },
  { id:"Rarga",     vlrId:22047, name:"Rarga",     displayName:"Rarga",     country:"China",        countryCode:"CN", team:"XLG",           league:"VCT China", leagueId:"china", age:22, role:"Initiator",              yearsActive:2, titles:["Nenhum"] },
  { id:"happywei",  vlrId:37927, name:"happywei",  displayName:"happywei",  country:"China",        countryCode:"CN", team:"XLG",           league:"VCT China", leagueId:"china", age:22, role:"Sentinel",               yearsActive:2, titles:["Nenhum"] },

];

if (typeof module !== "undefined") module.exports = PLAYERS_DB;
