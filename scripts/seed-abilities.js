#!/usr/bin/env node
/**
 * seed-abilities.js
 * Fetches agent + ability data from valorant-api.com (EN + PT-BR) and writes
 * public/data/abilities-db.json.
 *
 * Run from sandbox/astro/:
 *   node scripts/seed-abilities.js
 *   npm run seed:abilities
 *
 * Output: one entry per (agent × ability slot), skipping Passive slots.
 * Each entry includes censored descriptions (agent name + ability name replaced
 * with "___") for the Description game sub-mode.
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = join(__dir, '..', 'public', 'data', 'abilities-db.json');
const BASE  = 'https://valorant-api.com/v1';

// Slot → keyboard key mapping
const SLOT_KEY = { Grenade: 'C', Ability1: 'Q', Ability2: 'E', Ultimate: 'X' };

// Normalize role display names to internal English keys
const ROLE_NORM = {
  Duelista: 'Duelist',   Duelist: 'Duelist',
  Iniciador: 'Initiator', Initiator: 'Initiator',
  Controlador: 'Controller', Controller: 'Controller',
  Sentinela: 'Sentinel', Sentinel: 'Sentinel',
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const body = await res.json();
  if (body.status !== 200) throw new Error(`API error ${body.status} — ${url}`);
  return body.data;
}

/**
 * Replace all occurrences of each word in `words` (case-insensitive) with "___".
 */
function censor(text, ...words) {
  let result = text;
  for (const w of words) {
    if (!w) continue;
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), '___');
  }
  return result;
}

async function main() {
  console.log('[seed:abilities] Fetching agents (en-US)...');
  const agentsEN = await fetchJSON(
    `${BASE}/agents?isPlayableCharacter=true&language=en-US`
  );

  console.log('[seed:abilities] Fetching agents (pt-BR)...');
  const agentsPT = await fetchJSON(
    `${BASE}/agents?isPlayableCharacter=true&language=pt-BR`
  );

  // Index PT data by UUID for fast lookup
  const ptByUuid = Object.fromEntries(agentsPT.map(a => [a.uuid, a]));

  const agents    = [];
  const abilities = [];

  for (const aEN of agentsEN) {
    const aPT  = ptByUuid[aEN.uuid] || aEN;
    const role = ROLE_NORM[aEN.role?.displayName] || aEN.role?.displayName || '';

    agents.push({
      uuid:   aEN.uuid,
      nameEN: aEN.displayName,
      namePT: aEN.displayName, // agent names are identical in both languages
      role,
      portraitUrl: aEN.displayIconSmall || aEN.displayIcon || '',
    });

    for (let i = 0; i < aEN.abilities.length; i++) {
      const abEN = aEN.abilities[i];
      const abPT = aPT.abilities?.[i] || abEN;
      const key  = SLOT_KEY[abEN.slot];
      if (!key) continue; // skip Passive slot

      const nameEN = abEN.displayName || '';
      const namePT = abPT.displayName || nameEN;
      const descEN = abEN.description || '';
      const descPT = abPT.description || descEN;

      abilities.push({
        id:             `${aEN.uuid}__${abEN.slot}`,
        agentUuid:      aEN.uuid,
        agentNameEN:    aEN.displayName,
        agentNamePT:    aEN.displayName,
        agentRole:      role,
        slot:           abEN.slot,
        key,
        nameEN,
        namePT,
        descEN,
        descPT,
        // Censored versions: agent name + ability name replaced with ___
        descCensoredEN: censor(descEN, aEN.displayName, nameEN),
        descCensoredPT: censor(descPT, aEN.displayName, namePT),
        iconUrl:        abEN.displayIcon || '',
        isUltimate:     abEN.slot === 'Ultimate',
      });
    }
  }

  // Sort abilities alphabetically by agent then by key order
  const KEY_ORDER = { C: 0, Q: 1, E: 2, X: 3 };
  abilities.sort((a, b) => {
    const ag = a.agentNameEN.localeCompare(b.agentNameEN);
    return ag !== 0 ? ag : (KEY_ORDER[a.key] ?? 9) - (KEY_ORDER[b.key] ?? 9);
  });

  const db = {
    generatedAt: new Date().toISOString(),
    agentCount:  agents.length,
    abilityCount: abilities.length,
    agents,
    abilities,
  };

  writeFileSync(OUT, JSON.stringify(db, null, 2), 'utf-8');
  console.log(
    `[seed:abilities] ✓ ${agents.length} agents · ${abilities.length} abilities → abilities-db.json`
  );
}

main().catch(e => { console.error(e); process.exit(1); });
