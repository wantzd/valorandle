// ============================================================
// AGENTGUESS — Base de Jogadores VCT Global
// Dados: Liquipedia, vlr.gg — Aproximado para 2026
// ============================================================

var PLAYERS_DB = [

  // ══════════════════════════════════════════════════════════
  // VCT AMERICAS
  // ══════════════════════════════════════════════════════════

  // ── FURIA ────────────────────────────────────────────────
  { id:"nerve",     name:"nerve",     displayName:"nerve",     country:"EUA",            countryCode:"US", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:23, role:"Controller", isIGL:true,       yearsActive:6, titles:["Nenhum"] },
  { id:"eeiu",      name:"eeiu",      displayName:"eeiu",      country:"Canadá",          countryCode:"CA", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:24, role:"Initiator",  yearsActive:6, titles:["Nenhum"] },
  { id:"koalanoob", name:"koalanoob", displayName:"koalanoob", country:"Canadá",          countryCode:"CA", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:23, role:"Sentinel",   yearsActive:4, titles:["Nenhum"] },
  { id:"artzin",    name:"artzin",    displayName:"artzin",    country:"Brasil",          countryCode:"BR", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:22, role:"Sentinel",   isIGL:true,        yearsActive:4, titles:["Nenhum"] },
  { id:"alym",      name:"alym",      displayName:"alym",      country:"Quirguistão",     countryCode:"KG", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:20, role:"Duelist",    yearsActive:2, titles:["Nenhum"] },
  { id:"basic",     name:"basic",     displayName:"basic",     country:"Brasil",          countryCode:"BR", team:"FURIA",         league:"VCT Americas", leagueId:"americas", age:19, role:"Flex",       yearsActive:3, titles:["Nenhum"] },

  // ── G2 Esports ────────────────────────────────────────────
  { id:"jawgemo",   name:"jawgemo",   displayName:"jawgemo",   country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:26, role:"Duelist",    yearsActive:5, titles:["Champions 2024"] },
  { id:"BABYBAY",   name:"BABYBAY",   displayName:"BABYBAY",   country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:30, role:"Sentinel",   yearsActive:6, titles:["Champions 2024"] },
  { id:"trent",     name:"trent",     displayName:"trent",     country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:21, role:"Initiator",  yearsActive:4, titles:["Champions 2024"] },
  { id:"valyn",     name:"valyn",     displayName:"valyn",     country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:23, role:"Controller", isIGL:true,        yearsActive:4, titles:["Champions 2024"] },
  { id:"leaf",      name:"leaf",      displayName:"leaf",      country:"EUA",            countryCode:"US", team:"G2 Esports",    league:"VCT Americas", leagueId:"americas", age:22, role:"Flex",       yearsActive:5, titles:["Champions 2024"] },

  // ── NRG ──────────────────────────────────────────────────
  { id:"keiko",     name:"keiko",     displayName:"keiko",     country:"Reino Unido",    countryCode:"GB", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:22, role:"Flex",       yearsActive:4, titles:["Nenhum"] },
  { id:"brawk",     name:"brawk",     displayName:"brawk",     country:"EUA",            countryCode:"US", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:25, role:"Initiator",  yearsActive:6, titles:["Champions 2025"] },
  { id:"mada",      name:"mada",      displayName:"mada",      country:"Canadá",          countryCode:"CA", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:22, role:"Duelist",    yearsActive:5, titles:["Champions 2025"] },
  { id:"skuba",     name:"skuba",     displayName:"skuba",     country:"EUA",            countryCode:"US", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:23, role:"Sentinel",   yearsActive:5, titles:["Champions 2025"] },
  { id:"Ethan",     name:"Ethan",     displayName:"Ethan",     country:"EUA",            countryCode:"US", team:"NRG",           league:"VCT Americas", leagueId:"americas", age:26, role:"Initiator",  isIGL:true,        yearsActive:6, titles:["Champions 2025","Masters Reykjavik 2022"] },

  // ── MIBR ─────────────────────────────────────────────────
  { id:"zekken",    name:"zekken",    displayName:"zekken",    country:"EUA",            countryCode:"US", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:21, role:"Duelist",    yearsActive:5, titles:["Masters Bangkok 2025"] },
  { id:"tex",       name:"tex",       displayName:"tex",       country:"EUA",            countryCode:"US", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:26, role:"Sentinel",   yearsActive:5, titles:["VCT Americas 2023","Masters Tokyo 2023"] },
  { id:"Mazino",    name:"Mazino",    displayName:"Mazino",    country:"Chile",           countryCode:"CL", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:24, role:"Flex",       yearsActive:5, titles:["VCT Americas 2023","Masters Tokyo 2023"] },
  { id:"Verno",     name:"Verno",     displayName:"Verno",     country:"EUA",            countryCode:"US", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:20, role:"Controller", yearsActive:2, titles:["Nenhum"] },
  { id:"aspas",     name:"aspas",     displayName:"aspas",     country:"Brasil",          countryCode:"BR", team:"MIBR",          league:"VCT Americas", leagueId:"americas", age:22, role:"Duelist",    yearsActive:5, titles:["Champions 2022","Masters Copenhagen 2022","VCT Americas 2022"] },

  // ── 100 Thieves ───────────────────────────────────────────
  { id:"Asuna",     name:"Asuna",     displayName:"Asuna",     country:"EUA",            countryCode:"US", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:22, role:"Duelist",    yearsActive:6, titles:["Nenhum"] },
  { id:"bang",      name:"bang",      displayName:"bang",      country:"EUA",            countryCode:"US", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:22, role:"Flex",       yearsActive:6, titles:["Masters Bangkok 2025"] },
  { id:"Cryocells", name:"Cryocells", displayName:"Cryocells", country:"EUA",            countryCode:"US", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:23, role:"Duelist",    yearsActive:6, titles:["Nenhum"] },
  { id:"vora",      name:"vora",      displayName:"vora",      country:"EUA",            countryCode:"US", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:21, role:"Initiator",  isIGL:true,        yearsActive:3, titles:["Nenhum"] },
  { id:"Timotino",  name:"Timotino",  displayName:"Timotino",  country:"Canadá",          countryCode:"CA", team:"100 Thieves",   league:"VCT Americas", leagueId:"americas", age:18, role:"Initiator",  yearsActive:2, titles:["Nenhum"] },

  // ── Cloud9 ────────────────────────────────────────────────
  { id:"Zellsis",   name:"Zellsis",   displayName:"Zellsis",   country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:28, role:"Flex",       yearsActive:6, titles:["Masters Bangkok 2025"] },
  { id:"penny",     name:"penny",     displayName:"penny",     country:"Canadá",          countryCode:"CA", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:23, role:"Duelist",    isIGL:true,        yearsActive:5, titles:["Nenhum"] },
  { id:"Xeppaa",    name:"Xeppaa",    displayName:"Xeppaa",    country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:25, role:"Initiator",  yearsActive:5, titles:["Nenhum"] },
  { id:"v1c",       name:"v1c",       displayName:"v1c",       country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:21, role:"Flex",       yearsActive:5, titles:["Nenhum"] },
  { id:"OXY",       name:"OXY",       displayName:"OXY",       country:"EUA",            countryCode:"US", team:"Cloud9",        league:"VCT Americas", leagueId:"americas", age:20, role:"Duelist",    yearsActive:4, titles:["Nenhum"] },

  // ── Evil Geniuses ─────────────────────────────────────────
  { id:"C0M",       name:"C0M",       displayName:"C0M",       country:"EUA",            countryCode:"US", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:25, role:"Initiator",  yearsActive:6, titles:["Nenhum"] },
  { id:"supamen",   name:"supamen",   displayName:"supamen",   country:"EUA",            countryCode:"US", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:28, role:"Controller", yearsActive:6, titles:["Nenhum"] },
  { id:"Okeanos",   name:"Okeanos",   displayName:"Okeanos",   country:"Vietnã",         countryCode:"VN", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:22, role:"Flex",       yearsActive:5, titles:["Nenhum"] },
  { id:"dgzin",     name:"dgzin",     displayName:"dgzin",     country:"Brasil",          countryCode:"BR", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:25, role:"Duelist",    yearsActive:5, titles:["Nenhum"] },
  { id:"bao",       name:"bao",       displayName:"bao",       country:"Vietnã",         countryCode:"VN", team:"Evil Geniuses", league:"VCT Americas", leagueId:"americas", age:19, role:"Sentinel",   yearsActive:2, titles:["Nenhum"] },

  // ── LEVIATÁN ──────────────────────────────────────────────
  { id:"kiNgg",     name:"kiNgg",     displayName:"kiNgg",     country:"Chile",           countryCode:"CL", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:24, role:"Controller", isIGL:true,        yearsActive:5, titles:["VCT Americas 2023","Masters Tokyo 2023"] },
  { id:"blowz",     name:"blowz",     displayName:"blowz",     country:"Brasil",          countryCode:"BR", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:18, role:"Initiator",  yearsActive:2, titles:["Nenhum"] },
  { id:"Sato",      name:"Sato",      displayName:"Sato",      country:"Brasil",          countryCode:"BR", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:19, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"spikeziN",  name:"spikeziN",  displayName:"spikeziN",  country:"Brasil",          countryCode:"BR", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:18, role:"Flex",       yearsActive:3, titles:["Nenhum"] },
  { id:"Neon_lev",  name:"Neon",      displayName:"Neon",      country:"Argentina",       countryCode:"AR", team:"LEVIATÁN",      league:"VCT Americas", leagueId:"americas", age:18, role:"Sentinel",   yearsActive:4, titles:["Nenhum"] },

  // ── ENVY ──────────────────────────────────────────────────
  { id:"Rossy",     name:"Rossy",     displayName:"Rossy",     country:"EUA",            countryCode:"US", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:23, role:"Controller", isIGL:true,        yearsActive:4, titles:["Nenhum"] },
  { id:"keznit",    name:"keznit",    displayName:"keznit",    country:"Chile",           countryCode:"CL", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:24, role:"Duelist",    yearsActive:5, titles:["Nenhum"] },
  { id:"P0PPIN",    name:"P0PPIN",    displayName:"P0PPIN",    country:"EUA",            countryCode:"US", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:21, role:"Initiator",  isIGL:true,        yearsActive:3, titles:["Nenhum"] },
  { id:"Demon1",    name:"Demon1",    displayName:"Demon1",    country:"EUA",            countryCode:"US", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:23, role:"Duelist",    yearsActive:4, titles:["Champions 2023"] },
  { id:"Eggsterr",  name:"Eggsterr",  displayName:"Eggsterr",  country:"EUA",            countryCode:"US", team:"ENVY",          league:"VCT Americas", leagueId:"americas", age:23, role:"Sentinel",   yearsActive:4, titles:["Nenhum"] },

  // ── Sentinels ─────────────────────────────────────────────
  { id:"johnqt",    name:"johnqt",    displayName:"johnqt",    country:"Marrocos",        countryCode:"MA", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:27, role:"Controller", isIGL:true,        yearsActive:5, titles:["Nenhum"] },
  { id:"JonahP",    name:"JonahP",    displayName:"JonahP",    country:"Canadá",          countryCode:"CA", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:26, role:"Flex",       yearsActive:6, titles:["Champions 2024"] },
  { id:"cortezia",  name:"cortezia",  displayName:"cortezia",  country:"Brasil",          countryCode:"BR", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:21, role:"Controller", yearsActive:5, titles:["Nenhum"] },
  { id:"Reduxx",    name:"Reduxx",    displayName:"Reduxx",    country:"EUA",            countryCode:"US", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:19, role:"Duelist",    yearsActive:6, titles:["Nenhum"] },
  { id:"Jerrwin",   name:"Jerrwin",   displayName:"Jerrwin",   country:"Canadá",          countryCode:"CA", team:"Sentinels",     league:"VCT Americas", leagueId:"americas", age:22, role:"Initiator",  yearsActive:2, titles:["Nenhum"] },

  // ── LOUD ──────────────────────────────────────────────────
  { id:"erde",      name:"erde",      displayName:"erde",      country:"Chile",           countryCode:"CL", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:18, role:"Controller", isIGL:true,        yearsActive:4, titles:["Nenhum"] },
  { id:"Virtyy",    name:"Virtyy",    displayName:"Virtyy",    country:"Rep. Dominicana", countryCode:"DO", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:23, role:"Flex",       yearsActive:5, titles:["Nenhum"] },
  { id:"lukxo",     name:"lukxo",     displayName:"lukxo",     country:"Brasil",          countryCode:"BR", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:19, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"cauanzin",  name:"cauanzin",  displayName:"cauanzin",  country:"Brasil",          countryCode:"BR", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:20, role:"Initiator",  yearsActive:4, titles:["Champions 2022","VCT Americas 2022"] },
  { id:"Darker",    name:"Darker",    displayName:"Darker",    country:"Colômbia",        countryCode:"CO", team:"LOUD",          league:"VCT Americas", leagueId:"americas", age:21, role:"Flex",       yearsActive:3, titles:["Nenhum"] },

  // ── KRÜ Esports ───────────────────────────────────────────
  { id:"saadhak",   name:"saadhak",   displayName:"saadhak",   country:"Argentina",       countryCode:"AR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:29, role:"Controller", isIGL:true,        yearsActive:6, titles:["Champions 2022","Masters Copenhagen 2022","VCT Americas 2022"] },
  { id:"mwzera",    name:"mwzera",    displayName:"mwzera",    country:"Brasil",          countryCode:"BR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:24, role:"Duelist",    yearsActive:6, titles:["Nenhum"] },
  { id:"Less",      name:"Less",      displayName:"Less",      country:"Brasil",          countryCode:"BR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:21, role:"Sentinel",   yearsActive:5, titles:["Champions 2022","Masters Copenhagen 2022","VCT Americas 2022"] },
  { id:"silentzz",  name:"silentzz",  displayName:"silentzz",  country:"Brasil",          countryCode:"BR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:21, role:"Controller", yearsActive:4, titles:["Nenhum"] },
  { id:"Dantedeu5", name:"Dantedeu5", displayName:"Dantedeu5", country:"Argentina",       countryCode:"AR", team:"KRÜ Esports",   league:"VCT Americas", leagueId:"americas", age:18, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },

  // ══════════════════════════════════════════════════════════
  // VCT EMEA
  // ══════════════════════════════════════════════════════════

  // ── Fnatic ────────────────────────────────────────────────
  { id:"Boaster",   name:"Boaster",   displayName:"Boaster",   country:"Reino Unido",    countryCode:"GB", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:28, role:"Controller", isIGL:true,        yearsActive:6, titles:["Champions 2021"] },
  { id:"Alfajer",   name:"Alfajer",   displayName:"Alfajer",   country:"Turquia",         countryCode:"TR", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:21, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"Leo_fnc",   name:"Leo",       displayName:"Leo",       country:"Alemanha",        countryCode:"DE", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:23, role:"Initiator",  yearsActive:4, titles:["Nenhum"] },
  { id:"Derke",     name:"Derke",     displayName:"Derke",     country:"Finlândia",       countryCode:"FI", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:23, role:"Duelist",    yearsActive:5, titles:["Nenhum"] },
  { id:"Chronicle", name:"Chronicle", displayName:"Chronicle", country:"Reino Unido",    countryCode:"GB", team:"Fnatic",        league:"VCT EMEA", leagueId:"emea", age:23, role:"Flex",       yearsActive:4, titles:["Nenhum"] },

  // ── NAVI ─────────────────────────────────────────────────
  { id:"ANGE1",     name:"ANGE1",     displayName:"ANGE1",     country:"Ucrânia",         countryCode:"UA", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:31, role:"Controller", isIGL:true,        yearsActive:7, titles:["Nenhum"] },
  { id:"cNed",      name:"cNed",      displayName:"cNed",      country:"Turquia",         countryCode:"TR", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:24, role:"Duelist",    yearsActive:5, titles:["Champions 2021"] },
  { id:"SUYGETSU",  name:"SUYGETSU",  displayName:"SUYGETSU",  country:"Ucrânia",         countryCode:"UA", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:23, role:"Flex",       yearsActive:4, titles:["Nenhum"] },
  { id:"Jady",      name:"Jady",      displayName:"Jady",      country:"Portugal",        countryCode:"PT", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"Zyppan",    name:"Zyppan",    displayName:"Zyppan",    country:"Suécia",          countryCode:"SE", team:"NAVI",          league:"VCT EMEA", leagueId:"emea", age:22, role:"Sentinel",   yearsActive:4, titles:["Nenhum"] },

  // ── Team Liquid ───────────────────────────────────────────
  { id:"Jamppi",    name:"Jamppi",    displayName:"Jamppi",    country:"Finlândia",       countryCode:"FI", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:24, role:"Duelist",    yearsActive:5, titles:["Masters Berlim 2021"] },
  { id:"soulcas",   name:"soulcas",   displayName:"soulcas",   country:"Reino Unido",    countryCode:"GB", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:24, role:"Initiator",  yearsActive:5, titles:["Masters Berlim 2021"] },
  { id:"L1NK",      name:"L1NK",      displayName:"L1NK",      country:"Reino Unido",    countryCode:"GB", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:23, role:"Sentinel",   yearsActive:5, titles:["Masters Berlim 2021"] },
  { id:"Ayaz",      name:"Ayaz",      displayName:"Ayaz",      country:"Reino Unido",    countryCode:"GB", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",       yearsActive:3, titles:["Nenhum"] },
  { id:"Bpx",       name:"Bpx",       displayName:"Bpx",       country:"Alemanha",        countryCode:"DE", team:"Team Liquid",   league:"VCT EMEA", leagueId:"emea", age:24, role:"Controller", isIGL:true,        yearsActive:4, titles:["Nenhum"] },

  // ── Giants Gaming ─────────────────────────────────────────
  { id:"Mixwell",   name:"Mixwell",   displayName:"Mixwell",   country:"Espanha",         countryCode:"ES", team:"Giants",        league:"VCT EMEA", leagueId:"emea", age:29, role:"Sentinel",   yearsActive:6, titles:["Nenhum"] },
  { id:"hoody",     name:"hoody",     displayName:"hoody",     country:"França",          countryCode:"FR", team:"Giants",        league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"NanteZ",    name:"NanteZ",    displayName:"NanteZ",    country:"Dinamarca",       countryCode:"DK", team:"Giants",        league:"VCT EMEA", leagueId:"emea", age:22, role:"Controller", yearsActive:3, titles:["Nenhum"] },
  { id:"pAura",     name:"pAura",     displayName:"pAura",     country:"Alemanha",        countryCode:"DE", team:"Giants",        league:"VCT EMEA", leagueId:"emea", age:23, role:"Sentinel",   isIGL:true,        yearsActive:4, titles:["Nenhum"] },
  { id:"vakk",      name:"vakk",      displayName:"vakk",      country:"Turquia",         countryCode:"TR", team:"Giants",        league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",  yearsActive:3, titles:["Champions 2021"] },

  // ── BBL Esports ───────────────────────────────────────────
  { id:"AsLanM24",  name:"AsLanM24",  displayName:"AsLanM24",  country:"Turquia",         countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",    yearsActive:4, titles:["Nenhum"] },
  { id:"Turko",     name:"Turko",     displayName:"Turko",     country:"Turquia",         countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:23, role:"Flex",       isIGL:true,        yearsActive:4, titles:["Nenhum"] },
  { id:"Brave",     name:"Brave",     displayName:"Brave",     country:"Turquia",         countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:21, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
  { id:"qw1",       name:"qw1",       displayName:"qw1",       country:"Turquia",         countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"XCEED",     name:"XCEED",     displayName:"XCEED",     country:"Turquia",         countryCode:"TR", team:"BBL Esports",   league:"VCT EMEA", leagueId:"emea", age:22, role:"Flex",       yearsActive:3, titles:["Nenhum"] },

  // ── Karmine Corp ──────────────────────────────────────────
  { id:"wailers",   name:"wailers",   displayName:"wailers",   country:"França",          countryCode:"FR", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"beyAz",     name:"beyAz",     displayName:"beyAz",     country:"Turquia",         countryCode:"TR", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:20, role:"Initiator",  yearsActive:2, titles:["Nenhum"] },
  { id:"riens",     name:"riens",     displayName:"riens",     country:"França",          countryCode:"FR", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:21, role:"Initiator",  isIGL:true,        yearsActive:3, titles:["Nenhum"] },
  { id:"ShahZam",   name:"ShahZam",   displayName:"ShahZam",   country:"EUA",            countryCode:"US", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:28, role:"Controller", isIGL:true,        yearsActive:6, titles:["Nenhum"] },
  { id:"tormentii", name:"tormentii", displayName:"tormentii", country:"França",          countryCode:"FR", team:"Karmine Corp",  league:"VCT EMEA", leagueId:"emea", age:21, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },

  // ══════════════════════════════════════════════════════════
  // VCT PACIFIC
  // ══════════════════════════════════════════════════════════

  // ── Paper Rex ─────────────────────────────────────────────
  { id:"f0rsakeN",  name:"f0rsakeN",  displayName:"f0rsakeN",  country:"Singapura",       countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:24, role:"Duelist",    yearsActive:5, titles:["Masters Bangkok 2025"] },
  { id:"d4v41",     name:"d4v41",     displayName:"d4v41",     country:"Singapura",       countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:26, role:"Sentinel",   isIGL:true,        yearsActive:5, titles:["Masters Bangkok 2025"] },
  { id:"mindfreak", name:"mindfreak", displayName:"mindfreak", country:"Austrália",       countryCode:"AU", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:29, role:"Initiator",  yearsActive:7, titles:["Masters Bangkok 2025"] },
  { id:"Jinggg",    name:"Jinggg",    displayName:"Jinggg",    country:"Singapura",       countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:23, role:"Duelist",    yearsActive:4, titles:["Masters Bangkok 2025"] },
  { id:"something", name:"something", displayName:"something", country:"Singapura",       countryCode:"SG", team:"Paper Rex",     league:"VCT Pacific", leagueId:"pacific", age:22, role:"Flex",       yearsActive:3, titles:["Masters Bangkok 2025"] },

  // ── ZETA Division ─────────────────────────────────────────
  { id:"Dep",       name:"Dep",       displayName:"Dep",       country:"Japão",           countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:23, role:"Duelist",    yearsActive:5, titles:["Nenhum"] },
  { id:"Laz",       name:"Laz",       displayName:"Laz",       country:"Japão",           countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:25, role:"Sentinel",   isIGL:true,        yearsActive:5, titles:["Nenhum"] },
  { id:"crow",      name:"crow",      displayName:"crow",      country:"Japão",           countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
  { id:"SugarZ3ro", name:"SugarZ3ro", displayName:"SugarZ3ro", country:"Japão",           countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:21, role:"Flex",       yearsActive:3, titles:["Nenhum"] },
  { id:"Shenji",    name:"Shenji",    displayName:"Shenji",    country:"Japão",           countryCode:"JP", team:"ZETA Division", league:"VCT Pacific", leagueId:"pacific", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },

  // ── DRX ──────────────────────────────────────────────────
  { id:"stax",      name:"stax",      displayName:"stax",      country:"Coreia do Sul",   countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:26, role:"Initiator",  isIGL:true,        yearsActive:5, titles:["Nenhum"] },
  { id:"Rb",        name:"Rb",        displayName:"Rb",        country:"Japão",           countryCode:"JP", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:4, titles:["Nenhum"] },
  { id:"BuZz",      name:"BuZz",      displayName:"BuZz",      country:"Coreia do Sul",   countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:23, role:"Initiator",  yearsActive:5, titles:["Nenhum"] },
  { id:"Foxy9",     name:"Foxy9",     displayName:"Foxy9",     country:"Coreia do Sul",   countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"Flashback", name:"Flashback", displayName:"Flashback", country:"Coreia do Sul",   countryCode:"KR", team:"DRX",           league:"VCT Pacific", leagueId:"pacific", age:24, role:"Sentinel",   yearsActive:4, titles:["Nenhum"] },

  // ── Gen.G ─────────────────────────────────────────────────
  { id:"Meteor",    name:"Meteor",    displayName:"Meteor",    country:"Coreia do Sul",   countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:23, role:"Flex",       yearsActive:4, titles:["Nenhum"] },
  { id:"Munchkin",  name:"Munchkin",  displayName:"Munchkin",  country:"Coreia do Sul",   countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:24, role:"Controller", isIGL:true,        yearsActive:5, titles:["Nenhum"] },
  { id:"t3xture",   name:"t3xture",   displayName:"t3xture",   country:"Coreia do Sul",   countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"karon",     name:"karon",     displayName:"karon",     country:"Coreia do Sul",   countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:23, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
  { id:"Russ",      name:"Russ",      displayName:"Russ",      country:"Coreia do Sul",   countryCode:"KR", team:"Gen.G",         league:"VCT Pacific", leagueId:"pacific", age:24, role:"Initiator",  yearsActive:4, titles:["Nenhum"] },

  // ── T1 ────────────────────────────────────────────────────
  { id:"ban",       name:"ban",       displayName:"ban",       country:"Coreia do Sul",   countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"Xeta",      name:"Xeta",      displayName:"Xeta",      country:"Coreia do Sul",   countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:23, role:"Initiator",  yearsActive:4, titles:["Nenhum"] },
  { id:"Carpe",     name:"Carpe",     displayName:"Carpe",     country:"Coreia do Sul",   countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:28, role:"Duelist",    yearsActive:4, titles:["Nenhum"] },
  { id:"Sylvan",    name:"Sylvan",    displayName:"Sylvan",    country:"Coreia do Sul",   countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:24, role:"Controller", isIGL:true,        yearsActive:3, titles:["Nenhum"] },
  { id:"Mako",      name:"Mako",      displayName:"Mako",      country:"Coreia do Sul",   countryCode:"KR", team:"T1",            league:"VCT Pacific", leagueId:"pacific", age:23, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },

  // ── Talon Esports ─────────────────────────────────────────
  { id:"sushiboys", name:"sushiboys", displayName:"sushiboys", country:"Tailândia",       countryCode:"TH", team:"Talon",         league:"VCT Pacific", leagueId:"pacific", age:22, role:"Duelist",    yearsActive:4, titles:["Nenhum"] },
  { id:"garnetS",   name:"garnetS",   displayName:"garnetS",   country:"Tailândia",       countryCode:"TH", team:"Talon",         league:"VCT Pacific", leagueId:"pacific", age:22, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
  { id:"Crws",      name:"Crws",      displayName:"Crws",      country:"Tailândia",       countryCode:"TH", team:"Talon",         league:"VCT Pacific", leagueId:"pacific", age:21, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"Deryeon",   name:"Deryeon",   displayName:"Deryeon",   country:"Tailândia",       countryCode:"TH", team:"Talon",         league:"VCT Pacific", leagueId:"pacific", age:20, role:"Flex",       yearsActive:2, titles:["Nenhum"] },
  { id:"GMT",       name:"GMT",       displayName:"GMT",       country:"Tailândia",       countryCode:"TH", team:"Talon",         league:"VCT Pacific", leagueId:"pacific", age:23, role:"Controller", isIGL:true,        yearsActive:4, titles:["Nenhum"] },

  // ══════════════════════════════════════════════════════════
  // VCT CHINA
  // ══════════════════════════════════════════════════════════

  // ── Edward Gaming (EDG) ───────────────────────────────────
  { id:"Smoggy",    name:"Smoggy",    displayName:"Smoggy",    country:"China",           countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:22, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"nobody",    name:"nobody",    displayName:"nobody",    country:"China",           countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:23, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
  { id:"ZmjjKK",    name:"ZmjjKK",    displayName:"ZmjjKK",    country:"China",           countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:24, role:"Flex",       yearsActive:4, titles:["Nenhum"] },
  { id:"Haodong",   name:"Haodong",   displayName:"Haodong",   country:"China",           countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:24, role:"Flex",       isIGL:true,        yearsActive:4, titles:["Nenhum"] },
  { id:"Zhizhang", name:"Zhizhang",  displayName:"Zhizhang",  country:"China",           countryCode:"CN", team:"EDG",           league:"VCT China", leagueId:"china", age:21, role:"Initiator",  yearsActive:2, titles:["Nenhum"] },

  // ── Bilibili Gaming (BLG) ─────────────────────────────────
  { id:"Ciax",      name:"Ciax",      displayName:"Ciax",      country:"China",           countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:22, role:"Flex",       yearsActive:3, titles:["Nenhum"] },
  { id:"s1Mon",     name:"s1Mon",     displayName:"s1Mon",     country:"China",           countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:21, role:"Duelist",    yearsActive:2, titles:["Nenhum"] },
  { id:"biank",     name:"biank",     displayName:"biank",     country:"China",           countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },
  { id:"Life_blg",  name:"Life",      displayName:"Life",      country:"China",           countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:23, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
  { id:"Wuwu",      name:"Wuwu",      displayName:"Wuwu",      country:"China",           countryCode:"CN", team:"BLG",           league:"VCT China", leagueId:"china", age:24, role:"Controller", isIGL:true,        yearsActive:4, titles:["Nenhum"] },

  // ── FunPlus Phoenix (FPX) ─────────────────────────────────
  { id:"CHICHOO",   name:"CHICHOO",   displayName:"CHICHOO",   country:"China",           countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:25, role:"Controller", isIGL:true,        yearsActive:4, titles:["Nenhum"] },
  { id:"CLOUD",     name:"CLOUD",     displayName:"CLOUD",     country:"China",           countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:24, role:"Flex",       yearsActive:4, titles:["Nenhum"] },
  { id:"Lysoar",    name:"Lysoar",    displayName:"Lysoar",    country:"China",           countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:21, role:"Duelist",    yearsActive:2, titles:["Nenhum"] },
  { id:"Xiaohao",   name:"Xiaohao",   displayName:"Xiaohao",   country:"China",           countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:23, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
  { id:"Bazz",      name:"Bazz",      displayName:"Bazz",      country:"China",           countryCode:"CN", team:"FPX",           league:"VCT China", leagueId:"china", age:22, role:"Initiator",  yearsActive:3, titles:["Nenhum"] },

  // ── Trace Esports ─────────────────────────────────────────
  { id:"xccurate",  name:"xccurate",  displayName:"xccurate",  country:"China",           countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:23, role:"Duelist",    yearsActive:3, titles:["Nenhum"] },
  { id:"Rock",      name:"Rock",      displayName:"Rock",      country:"China",           countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:25, role:"Controller", isIGL:true,        yearsActive:5, titles:["Nenhum"] },
  { id:"XanZi",     name:"XanZi",     displayName:"XanZi",     country:"China",           countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:22, role:"Flex",       yearsActive:3, titles:["Nenhum"] },
  { id:"Levi_trc",  name:"Levi",      displayName:"Levi",      country:"China",           countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:21, role:"Initiator",  yearsActive:2, titles:["Nenhum"] },
  { id:"Spring_trc",name:"Spring",    displayName:"Spring",    country:"China",           countryCode:"CN", team:"Trace",         league:"VCT China", leagueId:"china", age:22, role:"Sentinel",   yearsActive:3, titles:["Nenhum"] },
];

if (typeof module !== "undefined") module.exports = PLAYERS_DB;
