/**
 * maps.ts
 *
 * Data and pure logic for the Maps game mode.
 * No DOM, no side-effects — safe to import in both SSR and client contexts.
 *
 * Coordinate system for callout buttons:
 *   x / y are percentage positions on the tactical minimap image.
 *   Placeholder values here — update together with the actual image assets.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type MapId =
  | 'bind' | 'haven' | 'split' | 'ascent' | 'icebox'
  | 'breeze' | 'fracture' | 'pearl' | 'lotus' | 'sunset' | 'abyss';

export type AreaId = 'A' | 'B' | 'C' | 'Mid' | 'Spawn' | 'Other';

export interface MapMeta {
  id:          MapId;
  name:        string;
  releaseYear: number;
  sites:       number;
  country:     { pt: string; en: string };
  description: { pt: string; en: string };
}

export interface Callout {
  id:   string;
  name: string;   // display name ("A Main", "CT Spawn", etc.)
  area: AreaId;
  x:    number;   // % left on minimap
  y:    number;   // % top  on minimap
}

export interface MapHint {
  pt: string;
  en: string;
}

export interface DailyMapTarget {
  mapId:     MapId;
  calloutId: string;
  img:       string | null;   // path to screenshot; null until assets arrive
}

export interface MapGuessFeedback {
  attr:   'map' | 'callout' | 'area';
  value:  string;
  status: 'correct' | 'wrong';
}

// ── Map metadata ──────────────────────────────────────────────────────────────

export const MAPS_DB: Record<MapId, MapMeta> = {
  bind: {
    id: 'bind', name: 'Bind', releaseYear: 2020, sites: 2,
    country:     { pt: 'Marrocos',  en: 'Morocco' },
    description: { pt: 'Único mapa com teleportes ligando os dois lados.',
                   en: 'The only map with teleporters connecting both sides.' },
  },
  haven: {
    id: 'haven', name: 'Haven', releaseYear: 2020, sites: 3,
    country:     { pt: 'Butão',   en: 'Bhutan' },
    description: { pt: 'Único mapa com três bombsites.',
                   en: 'The only map with three bomb sites.' },
  },
  split: {
    id: 'split', name: 'Split', releaseYear: 2020, sites: 2,
    country:     { pt: 'Japão',   en: 'Japan' },
    description: { pt: 'Mapa vertical com meio difícil de controlar.',
                   en: 'Vertical map with a notoriously hard mid to control.' },
  },
  ascent: {
    id: 'ascent', name: 'Ascent', releaseYear: 2020, sites: 2,
    country:     { pt: 'Itália',  en: 'Italy' },
    description: { pt: 'Mapa aberto com portões controláveis.',
                   en: 'Open map with player-controlled gates.' },
  },
  icebox: {
    id: 'icebox', name: 'Icebox', releaseYear: 2020, sites: 2,
    country:     { pt: 'Ártico',  en: 'Arctic' },
    description: { pt: 'Mapa industrial com muitos andares e verticais.',
                   en: 'Industrial map with multi-floor verticality.' },
  },
  breeze: {
    id: 'breeze', name: 'Breeze', releaseYear: 2021, sites: 2,
    country:     { pt: 'Caribe',  en: 'Caribbean' },
    description: { pt: 'Mapa amplo e aberto em ruínas tropicais.',
                   en: 'Wide-open tropical ruin map.' },
  },
  fracture: {
    id: 'fracture', name: 'Fracture', releaseYear: 2021, sites: 2,
    country:     { pt: 'EUA',     en: 'USA' },
    description: { pt: 'Instalação secreta cortada ao meio por um precipício.',
                   en: 'Secret facility split by a chasm with two-sided attacker entry.' },
  },
  pearl: {
    id: 'pearl', name: 'Pearl', releaseYear: 2022, sites: 2,
    country:     { pt: 'Portugal', en: 'Portugal' },
    description: { pt: 'Cidade subaquática de outra dimensão.',
                   en: 'Underwater city from an alternate dimension.' },
  },
  lotus: {
    id: 'lotus', name: 'Lotus', releaseYear: 2023, sites: 3,
    country:     { pt: 'Índia',   en: 'India' },
    description: { pt: 'Templo antigo com portas giratórias e três sites.',
                   en: 'Ancient temple with rotating doors and three bomb sites.' },
  },
  sunset: {
    id: 'sunset', name: 'Sunset', releaseYear: 2023, sites: 2,
    country:     { pt: 'EUA',     en: 'USA' },
    description: { pt: 'Bairro urbano de Los Angeles com área central.',
                   en: 'Urban Los Angeles neighbourhood with a contested mid.' },
  },
  abyss: {
    id: 'abyss', name: 'Abyss', releaseYear: 2024, sites: 2,
    country:     { pt: 'Alto-mar', en: 'Open Sea' },
    description: { pt: 'Plataforma sem paredes laterais sobre o oceano.',
                   en: 'Platform with no outer walls, floating above the ocean.' },
  },
};

// ── Callouts ──────────────────────────────────────────────────────────────────
// x/y = % position on minimap image. Placeholders — adjust with real assets.

export const MAPS_CALLOUTS: Record<MapId, Callout[]> = {
  bind: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 18, y: 12 },
    { id: 'a_short',   name: 'A Short',    area: 'A',     x: 33, y: 22 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 52, y: 18 },
    { id: 'a_elbow',   name: 'A Elbow',    area: 'A',     x: 46, y: 32 },
    { id: 'a_bath',    name: 'A Bath',     area: 'A',     x: 60, y: 28 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 82, y: 82 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 65, y: 75 },
    { id: 'b_long',    name: 'B Long',     area: 'B',     x: 75, y: 68 },
    { id: 'mid',       name: 'Mid',        area: 'Mid',   x: 55, y: 52 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 55, y: 35 },
    { id: 'tp_a',      name: 'TP to A',    area: 'Other', x: 30, y: 50 },
    { id: 'tp_b',      name: 'TP to B',    area: 'Other', x: 72, y: 50 },
  ],
  haven: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 15, y: 15 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 22, y: 30 },
    { id: 'a_lobby',   name: 'A Lobby',    area: 'A',     x: 10, y: 28 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 50, y: 12 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 50, y: 30 },
    { id: 'b_court',   name: 'B Courtyard',area: 'B',     x: 44, y: 22 },
    { id: 'c_main',    name: 'C Main',     area: 'C',     x: 82, y: 15 },
    { id: 'c_site',    name: 'C Site',     area: 'C',     x: 78, y: 30 },
    { id: 'c_long',    name: 'C Long',     area: 'C',     x: 88, y: 30 },
    { id: 'mid',       name: 'Mid',        area: 'Mid',   x: 50, y: 52 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 68 },
    { id: 'garage',    name: 'Garage',     area: 'Other', x: 30, y: 58 },
  ],
  split: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 18, y: 18 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 32, y: 25 },
    { id: 'a_ramp',    name: 'A Ramp',     area: 'A',     x: 28, y: 18 },
    { id: 'a_heaven',  name: 'A Heaven',   area: 'A',     x: 38, y: 18 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 80, y: 20 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 68, y: 28 },
    { id: 'b_short',   name: 'B Short',    area: 'B',     x: 72, y: 20 },
    { id: 'mid_top',   name: 'Mid Top',    area: 'Mid',   x: 50, y: 22 },
    { id: 'mid_bot',   name: 'Mid Bottom', area: 'Mid',   x: 50, y: 42 },
    { id: 'mid_mail',  name: 'Mail',       area: 'Mid',   x: 56, y: 38 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 60 },
    { id: 'vent',      name: 'Vent',       area: 'Other', x: 50, y: 32 },
  ],
  ascent: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 12, y: 25 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 22, y: 22 },
    { id: 'a_garden',  name: 'A Garden',   area: 'A',     x: 18, y: 15 },
    { id: 'a_lobby',   name: 'A Lobby',    area: 'A',     x: 8,  y: 35 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 85, y: 25 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 75, y: 22 },
    { id: 'b_garden',  name: 'B Garden',   area: 'B',     x: 80, y: 15 },
    { id: 'b_lobby',   name: 'B Lobby',    area: 'B',     x: 90, y: 35 },
    { id: 'mid_bot',   name: 'Mid Bottom', area: 'Mid',   x: 50, y: 52 },
    { id: 'mid_top',   name: 'Mid Top',    area: 'Mid',   x: 50, y: 28 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 18 },
    { id: 'atk',       name: 'Atk Spawn',  area: 'Spawn', x: 50, y: 75 },
    { id: 'catwalk',   name: 'Catwalk',    area: 'Mid',   x: 42, y: 38 },
  ],
  icebox: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 15, y: 22 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 28, y: 18 },
    { id: 'a_pipes',   name: 'A Pipes',    area: 'A',     x: 22, y: 15 },
    { id: 'a_rafters', name: 'A Rafters',  area: 'A',     x: 35, y: 15 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 82, y: 22 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 70, y: 18 },
    { id: 'b_orange',  name: 'B Orange',   area: 'B',     x: 78, y: 15 },
    { id: 'b_yellow',  name: 'B Yellow',   area: 'B',     x: 65, y: 12 },
    { id: 'mid',       name: 'Mid',        area: 'Mid',   x: 50, y: 40 },
    { id: 'kitchen',   name: 'Kitchen',    area: 'Mid',   x: 42, y: 35 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 62 },
  ],
  breeze: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 12, y: 28 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 22, y: 22 },
    { id: 'a_hall',    name: 'A Hall',     area: 'A',     x: 18, y: 18 },
    { id: 'a_cave',    name: 'A Cave',     area: 'A',     x: 28, y: 15 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 85, y: 28 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 75, y: 22 },
    { id: 'b_tunnel',  name: 'B Tunnel',   area: 'B',     x: 80, y: 40 },
    { id: 'b_elbow',   name: 'B Elbow',    area: 'B',     x: 72, y: 15 },
    { id: 'mid',       name: 'Mid',        area: 'Mid',   x: 50, y: 38 },
    { id: 'mid_nest',  name: 'Mid Nest',   area: 'Mid',   x: 50, y: 28 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 58 },
    { id: 'atk',       name: 'Atk Spawn',  area: 'Spawn', x: 50, y: 75 },
  ],
  fracture: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 15, y: 35 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 28, y: 28 },
    { id: 'a_rope',    name: 'A Rope',     area: 'A',     x: 22, y: 22 },
    { id: 'a_dish',    name: 'A Dish',     area: 'A',     x: 35, y: 22 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 82, y: 35 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 70, y: 28 },
    { id: 'b_arcade',  name: 'B Arcade',   area: 'B',     x: 78, y: 22 },
    { id: 'b_tunnel',  name: 'B Tunnel',   area: 'B',     x: 65, y: 40 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 55 },
    { id: 'atk_e',     name: 'Atk East',   area: 'Spawn', x: 80, y: 62 },
    { id: 'atk_w',     name: 'Atk West',   area: 'Spawn', x: 20, y: 62 },
    { id: 'ropes',     name: 'Ropes',      area: 'Other', x: 50, y: 35 },
  ],
  pearl: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 15, y: 25 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 25, y: 20 },
    { id: 'a_art',     name: 'Art',        area: 'A',     x: 20, y: 15 },
    { id: 'a_flowers', name: 'Flowers',    area: 'A',     x: 30, y: 20 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 82, y: 25 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 72, y: 20 },
    { id: 'b_link',    name: 'B Link',     area: 'B',     x: 78, y: 18 },
    { id: 'mid',       name: 'Mid',        area: 'Mid',   x: 50, y: 42 },
    { id: 'mid_plaza', name: 'Mid Plaza',  area: 'Mid',   x: 50, y: 32 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 60 },
    { id: 'atk',       name: 'Atk Spawn',  area: 'Spawn', x: 50, y: 78 },
    { id: 'shops',     name: 'Shops',      area: 'Mid',   x: 42, y: 38 },
  ],
  lotus: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 12, y: 28 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 22, y: 22 },
    { id: 'a_root',    name: 'A Root',     area: 'A',     x: 18, y: 15 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 50, y: 12 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 50, y: 25 },
    { id: 'b_mound',   name: 'B Mound',    area: 'B',     x: 44, y: 18 },
    { id: 'c_main',    name: 'C Main',     area: 'C',     x: 85, y: 28 },
    { id: 'c_site',    name: 'C Site',     area: 'C',     x: 75, y: 22 },
    { id: 'c_top',     name: 'C Top',      area: 'C',     x: 80, y: 15 },
    { id: 'mid',       name: 'Mid',        area: 'Mid',   x: 50, y: 48 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 65 },
    { id: 'atk',       name: 'Atk Spawn',  area: 'Spawn', x: 50, y: 80 },
  ],
  sunset: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 12, y: 30 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 22, y: 25 },
    { id: 'a_elbow',   name: 'A Elbow',    area: 'A',     x: 18, y: 18 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 85, y: 30 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 75, y: 25 },
    { id: 'b_alley',   name: 'B Alley',    area: 'B',     x: 82, y: 18 },
    { id: 'mid',       name: 'Mid',        area: 'Mid',   x: 50, y: 42 },
    { id: 'mid_shop',  name: 'Mid Shop',   area: 'Mid',   x: 44, y: 35 },
    { id: 'mid_top',   name: 'Mid Top',    area: 'Mid',   x: 50, y: 30 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 60 },
    { id: 'atk',       name: 'Atk Spawn',  area: 'Spawn', x: 50, y: 78 },
    { id: 'market',    name: 'Market',     area: 'Other', x: 38, y: 28 },
  ],
  abyss: [
    { id: 'a_main',    name: 'A Main',     area: 'A',     x: 12, y: 28 },
    { id: 'a_site',    name: 'A Site',     area: 'A',     x: 22, y: 22 },
    { id: 'a_link',    name: 'A Link',     area: 'A',     x: 28, y: 18 },
    { id: 'b_main',    name: 'B Main',     area: 'B',     x: 85, y: 28 },
    { id: 'b_site',    name: 'B Site',     area: 'B',     x: 75, y: 22 },
    { id: 'b_link',    name: 'B Link',     area: 'B',     x: 70, y: 18 },
    { id: 'mid',       name: 'Mid',        area: 'Mid',   x: 50, y: 40 },
    { id: 'mid_bridge',name: 'Mid Bridge', area: 'Mid',   x: 50, y: 30 },
    { id: 'ct',        name: 'CT Spawn',   area: 'Spawn', x: 50, y: 60 },
    { id: 'atk',       name: 'Atk Spawn',  area: 'Spawn', x: 50, y: 78 },
    { id: 'pit',       name: 'The Pit',    area: 'Other', x: 50, y: 52 },
  ],
};

// ── Hints ─────────────────────────────────────────────────────────────────────

export const MAPS_HINTS: Record<MapId, MapHint[]> = {
  bind: [
    { pt: 'Lançado em 2020',                  en: 'Released in 2020' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Localizado no Marrocos',           en: 'Located in Morocco' },
    { pt: 'Único mapa com teleportes',        en: 'Only map with teleporters' },
    { pt: 'Não há meio convencional',         en: 'Has no conventional mid lane' },
  ],
  haven: [
    { pt: 'Lançado em 2020',                  en: 'Released in 2020' },
    { pt: 'Localizado no Butão',              en: 'Located in Bhutan' },
    { pt: 'Único mapa com 3 bombsites',       en: 'Only map with 3 bomb sites' },
    { pt: 'CT tem 3 sites para defender',     en: 'CT side defends 3 sites' },
    { pt: 'Possui uma garagem icônica',       en: 'Features an iconic garage' },
  ],
  split: [
    { pt: 'Lançado em 2020',                  en: 'Released in 2020' },
    { pt: 'Localizado no Japão',              en: 'Located in Japan' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Há uma zipline no meio',           en: 'Features a zipline in mid' },
    { pt: 'Mapa mais vertical do jogo',       en: 'Most vertical map in the game' },
  ],
  ascent: [
    { pt: 'Lançado em 2020',                  en: 'Released in 2020' },
    { pt: 'Localizado na Itália',             en: 'Located in Italy' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Portões podem ser fechados',       en: 'Gates can be locked by players' },
    { pt: 'O mid é muito contestado',         en: 'Mid is heavily contested' },
  ],
  icebox: [
    { pt: 'Lançado em 2020',                  en: 'Released in 2020' },
    { pt: 'Localizado no Ártico',             en: 'Located in the Arctic' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Tem containers e ziplines',        en: 'Features containers and ziplines' },
    { pt: 'Estética de pesquisa polar',       en: 'Polar research aesthetic' },
  ],
  breeze: [
    { pt: 'Lançado em 2021',                  en: 'Released in 2021' },
    { pt: 'Localizado no Caribe',             en: 'Located in the Caribbean' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Um dos maiores mapas do jogo',     en: 'One of the largest maps in the game' },
    { pt: 'Ruínas tropicais e praias',        en: 'Tropical ruins and beaches' },
  ],
  fracture: [
    { pt: 'Lançado em 2021',                  en: 'Released in 2021' },
    { pt: 'Localizado nos EUA',               en: 'Located in the USA' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Atacantes entram dos 2 lados',     en: 'Attackers can enter from both sides' },
    { pt: 'Instalação secreta com ziplines',  en: 'Secret facility with ziplines' },
  ],
  pearl: [
    { pt: 'Lançado em 2022',                  en: 'Released in 2022' },
    { pt: 'Localizado em Portugal',           en: 'Located in Portugal' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Cidade subaquática alternativa',   en: 'An alternate-dimension underwater city' },
    { pt: 'Primeiro mapa sem habilidades',    en: 'First map with no interactive mechanics' },
  ],
  lotus: [
    { pt: 'Lançado em 2023',                  en: 'Released in 2023' },
    { pt: 'Localizado na Índia',              en: 'Located in India' },
    { pt: 'Possui 3 bombsites',               en: 'Has 3 bomb sites' },
    { pt: 'Portas giratórias entre sites',    en: 'Rotating doors between sites' },
    { pt: 'Templo antigo misterioso',         en: 'Ancient mysterious temple' },
  ],
  sunset: [
    { pt: 'Lançado em 2023',                  en: 'Released in 2023' },
    { pt: 'Localizado em Los Angeles, EUA',   en: 'Located in Los Angeles, USA' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Porta no B pode ser ativada',      en: 'A door on B can be activated' },
    { pt: 'Bairro urbano no pôr do sol',      en: 'Urban neighbourhood at sunset' },
  ],
  abyss: [
    { pt: 'Lançado em 2024',                  en: 'Released in 2024' },
    { pt: 'Localizado sobre o oceano',        en: 'Located above the ocean' },
    { pt: 'Possui 2 bombsites',               en: 'Has 2 bomb sites' },
    { pt: 'Cair fora do mapa = morte',        en: 'Falling off the map means death' },
    { pt: 'Sem paredes externas',             en: 'No outer walls' },
  ],
};

// ── Daily target pool ─────────────────────────────────────────────────────────
// Expand this list as screenshot assets become available.

export const DAILY_MAP_TARGETS: DailyMapTarget[] = [
  { mapId: 'bind',   calloutId: 'a_main',   img: null },
  { mapId: 'bind',   calloutId: 'b_site',   img: null },
  { mapId: 'bind',   calloutId: 'mid',      img: null },
  { mapId: 'haven',  calloutId: 'b_site',   img: null },
  { mapId: 'haven',  calloutId: 'c_main',   img: null },
  { mapId: 'split',  calloutId: 'a_site',   img: null },
  { mapId: 'split',  calloutId: 'mid_top',  img: null },
  { mapId: 'ascent', calloutId: 'mid_bot',  img: null },
  { mapId: 'ascent', calloutId: 'b_site',   img: null },
  { mapId: 'icebox', calloutId: 'a_site',   img: null },
  { mapId: 'breeze', calloutId: 'mid',      img: null },
  { mapId: 'breeze', calloutId: 'a_site',   img: null },
  { mapId: 'pearl',  calloutId: 'mid',      img: null },
  { mapId: 'pearl',  calloutId: 'b_site',   img: null },
  { mapId: 'lotus',  calloutId: 'b_site',   img: null },
  { mapId: 'lotus',  calloutId: 'c_site',   img: null },
  { mapId: 'sunset', calloutId: 'mid',      img: null },
  { mapId: 'abyss',  calloutId: 'a_site',   img: null },
];

// ── Seeded daily picker (same FNV-1a logic as daily.ts) ───────────────────────

export function getDailyMapTarget(): DailyMapTarget {
  const today = new Date();
  // UTC-3 (Brazil time)
  const brt = new Date(today.getTime() - 3 * 60 * 60 * 1000);
  const key  = `${brt.getUTCFullYear()}-${String(brt.getUTCMonth() + 1).padStart(2,'0')}-${String(brt.getUTCDate()).padStart(2,'0')}`;

  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash  = (hash * 16777619) >>> 0;
  }
  return DAILY_MAP_TARGETS[hash % DAILY_MAP_TARGETS.length];
}

export function getRandomMapTarget(excludeIds?: string[]): DailyMapTarget {
  const pool = excludeIds?.length
    ? DAILY_MAP_TARGETS.filter(t => !excludeIds.includes(`${t.mapId}:${t.calloutId}`))
    : DAILY_MAP_TARGETS;
  return pool[Math.floor(Math.random() * pool.length)] ?? DAILY_MAP_TARGETS[0];
}

// ── Compare function ──────────────────────────────────────────────────────────

export function compareMapGuess(
  guessMapId:     MapId,
  guessCalloutId: string,
  target:         DailyMapTarget
): MapGuessFeedback[] {
  const targetCallout = MAPS_CALLOUTS[target.mapId]?.find(c => c.id === target.calloutId);
  const guessCallout  = MAPS_CALLOUTS[guessMapId]?.find(c => c.id === guessCalloutId);

  const mapOk     = guessMapId === target.mapId;
  const calloutOk = mapOk && guessCalloutId === target.calloutId;
  const areaOk    = mapOk && guessCallout?.area === targetCallout?.area;

  return [
    {
      attr:   'map',
      value:  MAPS_DB[guessMapId]?.name ?? guessMapId,
      status: mapOk     ? 'correct' : 'wrong',
    },
    {
      attr:   'callout',
      value:  guessCallout?.name ?? guessCalloutId,
      status: calloutOk ? 'correct' : 'wrong',
    },
    {
      attr:   'area',
      value:  guessCallout?.area ?? '?',
      status: areaOk    ? 'correct' : 'wrong',
    },
  ];
}

// ── Persistence helpers ───────────────────────────────────────────────────────

export interface MapsDailyState {
  guesses:   Array<{ mapId: string; calloutId: string; feedback: MapGuessFeedback[] }>;
  hintsUsed: number;
  finished:  boolean;
  won:       boolean;
}

function getDailyKey(): string {
  const today = new Date();
  const brt   = new Date(today.getTime() - 3 * 60 * 60 * 1000);
  const key   = `${brt.getUTCFullYear()}-${String(brt.getUTCMonth() + 1).padStart(2,'0')}-${String(brt.getUTCDate()).padStart(2,'0')}`;
  return `valorandle_maps_daily_${key}`;
}

export function loadMapsDailyState(): MapsDailyState | null {
  try {
    const raw = localStorage.getItem(getDailyKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveMapsDailyState(state: MapsDailyState): void {
  try { localStorage.setItem(getDailyKey(), JSON.stringify(state)); } catch {}
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAPS_MAX_GUESSES = 6;
export const MAPS_MAX_HINTS   = 5;

/** Blur values (px) indexed by floor(wrongCount / 2). */
export const ZOOM_BLUR_STEPS = [12, 8, 5, 2, 0];
