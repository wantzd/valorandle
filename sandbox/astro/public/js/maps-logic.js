// Dados que a API não fornece — mantidos manualmente
const MAPS_STATIC = {
  ascent:   { releaseYear: 2020, country: "Itália"   },
  bind:     { releaseYear: 2020, country: "Marrocos"  },
  haven:    { releaseYear: 2020, country: "Butão"     },
  split:    { releaseYear: 2020, country: "Japão"     },
  icebox:   { releaseYear: 2020, country: "Ártico"    },
  breeze:   { releaseYear: 2021, country: "Caribe"    },
  fracture: { releaseYear: 2021, country: "EUA"       },
  pearl:    { releaseYear: 2022, country: "Portugal"  },
  lotus:    { releaseYear: 2023, country: "Índia"     },
  sunset:   { releaseYear: 2023, country: "EUA"       },
  abyss:    { releaseYear: 2024, country: "Alto-mar"  },
  corrode:  { releaseYear: 2025, country: "França"     },
};

const MAPS_HINTS = {
  bind: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2020",                                                        en:"Released in 2020"                                       },
    { pt:"Localizado no Marrocos",                                                 en:"Located in Morocco"                                     },
    { pt:"Único mapa com teleportes unidirecionais (sem mid convencional)",        en:"Only map with one-way teleporters (no conventional mid)" },
  ],
  haven: [
    { pt:"Possui 3 bombsites",                                                     en:"Has 3 bomb sites"                                       },
    { pt:"Lançado em 2020",                                                        en:"Released in 2020"                                       },
    { pt:"Localizado no Butão",                                                    en:"Located in Bhutan"                                      },
    { pt:"Único mapa com três bombsites",                                          en:"Only map with three bomb sites"                         },
  ],
  split: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2020",                                                        en:"Released in 2020"                                       },
    { pt:"Localizado no Japão",                                                    en:"Located in Japan"                                       },
    { pt:"Cordas (rapel) são a principal mecânica vertical",                       en:"Ropes are the main vertical mechanic"                   },
  ],
  ascent: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2020",                                                        en:"Released in 2020"                                       },
    { pt:"Localizado na Itália",                                                   en:"Located in Italy"                                       },
    { pt:"Portões mecânicos nas entradas dos sites e no mid",                      en:"Mechanical gates at site entries and mid"               },
  ],
  icebox: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2020",                                                        en:"Released in 2020"                                       },
    { pt:"Localizado no Ártico",                                                   en:"Located in the Arctic"                                  },
    { pt:"Cabos deslizantes (ziplines) conectam áreas verticais",                  en:"Ziplines connect vertical areas"                        },
  ],
  breeze: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2021",                                                        en:"Released in 2021"                                       },
    { pt:"Localizado no Caribe",                                                   en:"Located in the Caribbean"                               },
    { pt:"Sites e corredores muito amplos, favorecem rifles de longa distância",   en:"Very wide sites and corridors, favor long-range rifles"  },
  ],
  fracture: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2021",                                                        en:"Released in 2021"                                       },
    { pt:"Localizado nos EUA",                                                     en:"Located in the USA"                                     },
    { pt:"Atacantes chegam pelos flancos esquerdo e direito por uma ponte",        en:"Attackers approach both flanks via a bridge"            },
  ],
  pearl: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2022",                                                        en:"Released in 2022"                                       },
    { pt:"Localizado em Portugal (dimensão alternativa)",                          en:"Located in Portugal (alternate dimension)"              },
    { pt:"Sem mecânicas especiais — sem portas, teleportes ou cabos",              en:"No special mechanics — no doors, teleporters or ziplines" },
  ],
  lotus: [
    { pt:"Possui 3 bombsites",                                                     en:"Has 3 bomb sites"                                       },
    { pt:"Lançado em 2023",                                                        en:"Released in 2023"                                       },
    { pt:"Localizado na Índia",                                                    en:"Located in India"                                       },
    { pt:"Portas giratórias controlam passagens entre áreas-chave",                en:"Rotating doors control key passages"                    },
  ],
  sunset: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2023",                                                        en:"Released in 2023"                                       },
    { pt:"Localizado em Los Angeles, EUA",                                         en:"Located in Los Angeles, USA"                           },
    { pt:"Portão de garagem no mid pode ser aberto ou fechado",                    en:"Mid garage door can be opened or closed"                },
  ],
  abyss: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2024",                                                        en:"Released in 2024"                                       },
    { pt:"Localizado em alto-mar / plataforma oceânica",                           en:"Located at sea / oceanic platform"                      },
    { pt:"Bordas sem paredes — queda resulta em morte instantânea",                en:"No walls at edges — falling off means instant death"    },
  ],
  corrode: [
    { pt:"Possui 2 bombsites",                                                     en:"Has 2 bomb sites"                                       },
    { pt:"Lançado em 2025",                                                        en:"Released in 2025"                                       },
    { pt:"Localizado em Mont-Saint-Michel, Normandia, França (Terra Ômega)",       en:"Located in Mont-Saint-Michel, Normandy, France (Omega Earth)" },
    { pt:"Segundo mapa ambientado na Terra Ômega (após Pearl)",                    en:"Second map set on Omega Earth (after Pearl)"            },
  ],
};

const MAPS_I18N = {
  "pt-BR": {
    back:           "← Hub",
    modeTag:        "Mapas",
    mapView:        "🗺️ Mapa",
    selectMap:      "Selecione o mapa...",
    hintBtn:        "💡 Dica",
    hintLeft:       n => `${n} restante${n === 1 ? "" : "s"}`,
    noHints:        "Sem mais dicas",
    attempts:       (n, max) => `${n}/${max} tentativas`,
    headers:        { map:"Mapa", callout:"Callout", area:"Área" },
    areas:          { A:"Site A", B:"Site B", C:"Site C", Mid:"Meio", Spawn:"Spawn", Other:"Outro" },
    win:            "Você acertou!",
    lose:           (map, callout) => `Era ${map} · ${callout}`,
    winSub:         n => `Em ${n} tentativa${n === 1 ? "" : "s"}`,
    loseSub:        "Mais sorte amanhã!",
    shareHeader:    "🗺️ Valorandle Mapas",
    shareWin:       n => `Acertei em ${n} tentativa${n === 1 ? "" : "s"}!`,
    shareLose:      "Não acertei hoje.",
    nextDaily:      "Próximo daily em",
    playFree:       "Modo livre",
    shareBtn:       "Compartilhar 📋",
    copiedToast:    "Copiado!",
    imgPlaceholder: "Screenshots em breve",
    mapPlaceholder: "Selecione o mapa para ver o minimapa",
    apiError:       "Não foi possível carregar os mapas. Verifique sua conexão.",
  },
  "en": {
    back:           "← Hub",
    modeTag:        "Maps",
    mapView:        "🗺️ Map",
    selectMap:      "Select a map...",
    hintBtn:        "💡 Hint",
    hintLeft:       n => `${n} left`,
    noHints:        "No more hints",
    attempts:       (n, max) => `${n}/${max} attempts`,
    headers:        { map:"Map", callout:"Callout", area:"Area" },
    areas:          { A:"A Site", B:"B Site", C:"C Site", Mid:"Mid", Spawn:"Spawn", Other:"Other" },
    win:            "You got it!",
    lose:           (map, callout) => `It was ${map} · ${callout}`,
    winSub:         n => `In ${n} attempt${n === 1 ? "" : "s"}`,
    loseSub:        "Better luck tomorrow!",
    shareHeader:    "🗺️ Valorandle Maps",
    shareWin:       n => `Got it in ${n} attempt${n === 1 ? "" : "s"}!`,
    shareLose:      "Didn't get it today.",
    nextDaily:      "Next daily in",
    playFree:       "Free mode",
    shareBtn:       "Share 📋",
    copiedToast:    "Copied!",
    imgPlaceholder: "Screenshots coming soon",
    mapPlaceholder: "Select a map to see its minimap",
    apiError:       "Could not load maps. Check your connection.",
  },
};

// Configuração de orientação por mapa (editada pelo calibrador, não pela API)
// swapXY: true → ry vira x na tela, rx vira y na tela (necessário na maioria dos mapas)
// flipX:  true → espelha horizontalmente
// flipY:  true → espelha verticalmente
const MAPS_ORIENT = {
  ascent:   { swapXY: true,  flipX: false, flipY: false },
  bind:     { swapXY: true,  flipX: false, flipY: false },
  haven:    { swapXY: true,  flipX: false, flipY: false },
  split:    { swapXY: true,  flipX: false, flipY: false },
  icebox:   { swapXY: true,  flipX: false, flipY: false },
  breeze:   { swapXY: true,  flipX: false, flipY: false },
  fracture: { swapXY: true,  flipX: false, flipY: false },
  pearl:    { swapXY: true,  flipX: false, flipY: false },
  lotus:    { swapXY: true,  flipX: false, flipY: false },
  sunset:   { swapXY: true,  flipX: false, flipY: false },
  abyss:    { swapXY: true,  flipX: false, flipY: false },
  corrode:  { swapXY: true,  flipX: false, flipY: false },
};

// Preenchidos pela API
let MAPS_DB = {};
let MAPS_CALLOUTS = {};
let MAPS_RAW = {}; // valores brutos (rx, ry) por mapa — usados pelo calibrador

// Posições calibradas manualmente (percentual relativo à imagem do minimapa).
// Após calibração via ?calibrate, substituir o objeto vazio abaixo pelo JSON exportado.
// Quando preenchido, substitui as posições calculadas pela API.
let MAPS_CUSTOM_POS = {};

const VAPI_BASE    = "https://valorant-api.com/v1/maps";
const NON_PLAYABLE = ["HURM", "Range", "Duel", "Podium", "MenuStaging"];

function _mapId(displayName) {
  return displayName.toLowerCase().replace(/\s+/g, "_");
}

function _lcg(seed) {
  return ((seed * 1664525 + 1013904223) >>> 0);
}

async function loadMapsFromAPI() {
  try {
    const [resPT, resEN] = await Promise.all([
      fetch(VAPI_BASE + "?language=pt-BR"),
      fetch(VAPI_BASE + "?language=en-US"),
    ]);
    if (!resPT.ok || !resEN.ok) throw new Error("HTTP " + (resPT.status || resEN.status));

    const [dataPT, dataEN] = await Promise.all([resPT.json(), resEN.json()]);
    const rawPT = dataPT.data || [];
    const rawEN = dataEN.data || [];

    const playable = rawPT.filter(m =>
      (m.callouts?.length || 0) > 5 &&
      m.xMultiplier !== null &&
      !NON_PLAYABLE.some(s => (m.mapUrl || "").includes(s))
    );

    MAPS_DB = {};
    MAPS_CALLOUTS = {};

    playable.forEach(mapPT => {
      const mapEN  = rawEN.find(m => m.uuid === mapPT.uuid);
      const id     = _mapId(mapPT.displayName);
      const stat   = MAPS_STATIC[id] || {};
      const sites  = (mapPT.tacticalDescription || "").includes("C") ? 3 : 2;

      MAPS_DB[id] = {
        uuid:         mapPT.uuid,
        name:         mapPT.displayName,
        sites,
        releaseYear:  stat.releaseYear ?? null,
        country:      stat.country     ?? null,
        displayIcon:  mapPT.displayIcon,
        splash:       mapPT.splash,
        listViewIcon: mapPT.listViewIcon,
        xMultiplier:  mapPT.xMultiplier,
        yMultiplier:  mapPT.yMultiplier,
        xScalarToAdd: mapPT.xScalarToAdd,
        yScalarToAdd: mapPT.yScalarToAdd,
      };

      // Passo 1: calcula posições brutas (fórmula da API, sem clamping)
      // A fórmula produz valores fora de [0,1] em mapas mais antigos (Fracture, Haven, etc.)
      // porque os escalares da API ficaram desatualizados. Normalizamos por mapa.
      const calloutList = (mapPT.callouts || []);
      const raw = calloutList.map((c, i) => {
        const cEN = mapEN?.callouts?.[i];
        return {
          id:    id + "_" + i,
          names: { "pt-BR": c.regionName, "en": cEN?.regionName || c.regionName },
          area:  c.superRegionName || "Other",
          rx: c.location.x * mapPT.xMultiplier + mapPT.xScalarToAdd,
          ry: c.location.y * mapPT.yMultiplier + mapPT.yScalarToAdd,
        };
      });

      // Armazena valores brutos para o calibrador poder recalcular sem re-fetch
      MAPS_RAW[id] = raw;

      // Passo 2: normaliza usando a configuração de orientação do mapa
      recomputeCallouts(id);
    });

    return true;
  } catch (err) {
    console.warn("[Valorandle] Maps API unavailable:", err.message);
    return false;
  }
}

// Recalcula MAPS_CALLOUTS[id] a partir dos valores brutos + configuração de orientação.
// Pode ser chamada pelo calibrador em tempo real sem re-fetch da API.
function recomputeCallouts(id, orientOverride) {
  const raw = MAPS_RAW[id];
  if (!raw || !raw.length) return;

  const o   = orientOverride || MAPS_ORIENT[id] || { swapXY: true, flipX: false, flipY: false };
  const PAD = 5;

  // Escolhe qual eixo bruto vai para x e y na tela
  const aArr = raw.map(c => o.swapXY ? c.ry : c.rx); // → screen-x
  const bArr = raw.map(c => o.swapXY ? c.rx : c.ry); // → screen-y
  const aMin = Math.min(...aArr), aMax = Math.max(...aArr);
  const bMin = Math.min(...bArr), bMax = Math.max(...bArr);
  const norm = (v, lo, hi) =>
    lo === hi ? 50 : PAD + (v - lo) / (hi - lo) * (100 - 2 * PAD);

  MAPS_CALLOUTS[id] = raw.map(c => {
    let x = norm(o.swapXY ? c.ry : c.rx, aMin, aMax);
    let y = norm(o.swapXY ? c.rx : c.ry, bMin, bMax);
    if (o.flipX) x = 100 - x;
    if (o.flipY) y = 100 - y;
    return { id: c.id, names: c.names, area: c.area, x, y };
  });
}

function getDailyMapTarget() {
  const ids = Object.keys(MAPS_DB).filter(id => (MAPS_CALLOUTS[id]?.length || 0) > 3);
  if (!ids.length) return null;
  const dateNum = parseInt(getDailyDateKey().replace(/-/g, ""), 10);
  let s = _lcg(dateNum);
  const mapId   = ids[s % ids.length];
  s = _lcg(s);
  const callouts = MAPS_CALLOUTS[mapId];
  const callout  = callouts[s % callouts.length];
  return { mapId, calloutId: callout.id, img: null };
}

function getFreeMapTarget() {
  const ids = Object.keys(MAPS_DB).filter(id => (MAPS_CALLOUTS[id]?.length || 0) > 3);
  if (!ids.length) return null;
  const mapId   = ids[Math.floor(Math.random() * ids.length)];
  const callouts = MAPS_CALLOUTS[mapId];
  const callout  = callouts[Math.floor(Math.random() * callouts.length)];
  return { mapId, calloutId: callout.id, img: null };
}

function compareMapGuess(guessMapId, guessCalloutId, target, currentLang) {
  const l = currentLang || "pt-BR";
  const targetCallout = (MAPS_CALLOUTS[target.mapId] || []).find(c => c.id === target.calloutId);
  const guessCallout  = (MAPS_CALLOUTS[guessMapId]  || []).find(c => c.id === guessCalloutId);

  const mapOk     = guessMapId === target.mapId;
  const calloutOk = mapOk && guessCalloutId === target.calloutId;
  const areaOk    = mapOk && !!guessCallout && !!targetCallout && guessCallout.area === targetCallout.area;

  return [
    { attr:"map",     value: MAPS_DB[guessMapId]?.name || guessMapId,                               status: mapOk     ? "correct" : "wrong" },
    { attr:"callout", value: guessCallout?.names[l] || guessCallout?.names["en"] || guessCalloutId,  status: calloutOk ? "correct" : "wrong" },
    { attr:"area",    value: guessCallout?.area || "?",                                              status: areaOk    ? "correct" : "wrong" },
  ];
}
