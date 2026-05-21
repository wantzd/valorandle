#!/usr/bin/env node
/**
 * seed-skins.js
 * Fetches skin data from valorant-api.com and writes public/data/skins-db.json.
 * Run from the sandbox/astro/ directory:
 *   node scripts/seed-skins.js
 *
 * bundle-patches.json (public/data/) is read separately at runtime by the game.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT    = join(__dir, '..', 'public', 'data', 'skins-db.json');

const BASE = 'https://valorant-api.com/v1';
const LANG = 'language=en-US';

// Standard / default skins theme – filter out
const STANDARD_THEME_UUID = '5a629df4-4765-0214-bd40-fbb96542941f';

/**
 * Return the best level to use for the audio showcase.
 * Goal: max upgrade level in the default color.
 *
 * Levels in the API are additive — level[N] has everything from level[N-1]
 * plus one more effect. The last level with a streamedVideo is therefore the
 * most complete version of the skin (all VFX + sound + animations active)
 * while still using the default chroma (color variants live in skin.chromas,
 * not in skin.levels, so level videos are always the default color).
 *
 * Chroma[0] (default color) never has its own streamedVideo in the API —
 * only variant chromas do, and those would be the wrong color.
 */
function bestAudioLevel(levels) {
  // Walk from the end — pick the last level that has a showcase video
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i].streamedVideo) return levels[i];
  }
  return null;
}

// Content-tier devName → clean label
function cleanEdition(devName = '', displayName = '') {
  const s = devName || displayName;
  // devName examples: "SelectEdition", "DeluxeEdition", "PremiumEdition", etc.
  const map = {
    SelectEdition:    'Select',
    DeluxeEdition:    'Deluxe',
    PremiumEdition:   'Premium',
    ExclusiveEdition: 'Exclusive',
    UltraEdition:     'Ultra',
  };
  if (map[s]) return map[s];
  // fallback: strip " Edition" suffix
  return displayName.replace(' Edition', '') || devName || null;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const body = await res.json();
  if (body.status !== 200) throw new Error(`API error ${body.status} for ${url}`);
  return body.data;
}

async function main() {
  console.log('[1/4] Fetching content tiers…');
  const tiers = await fetchJSON(`${BASE}/contenttiers?${LANG}`);
  const tierMap     = {}; // uuid → clean label
  const editionIcons = {}; // clean label → icon URL
  for (const t of tiers) {
    const label = cleanEdition(t.devName, t.displayName);
    tierMap[t.uuid] = label;
    if (label && t.displayIcon) editionIcons[label] = t.displayIcon;
  }

  console.log('[2/4] Fetching themes…');
  const themes = await fetchJSON(`${BASE}/themes?${LANG}`);
  const themeMap = {}; // uuid → displayName
  for (const th of themes) {
    themeMap[th.uuid] = th.displayName;
  }

  console.log('[3/4] Fetching weapons…');
  const weapons = await fetchJSON(`${BASE}/weapons?${LANG}`);

  console.log('[4/4] Processing skins…');
  const skins = [];

  for (const weapon of weapons) {
    const weaponName = weapon.displayName; // "Vandal", "Phantom", "Melee", …

    for (const skin of weapon.skins) {
      // Skip Standard (default) theme
      if (!skin.themeUuid || skin.themeUuid === STANDARD_THEME_UUID) continue;

      // Skip VCT Classic skins — Select Edition, no unique audio, one per team = unsolvable
      const bundleNameEarly = themeMap[skin.themeUuid] || '';
      if (weaponName === 'Classic' && bundleNameEarly.startsWith('VCT')) continue;

      // Pick the best level for audio (SoundEffects > VFX > level[0])
      const bestLevel = bestAudioLevel(skin.levels ?? []);
      const audioUrl  = bestLevel?.streamedVideo ?? null;
      if (!audioUrl) continue;

      // Skip skins with no content tier (shouldn't happen but be safe)
      if (!skin.contentTierUuid) continue;

      const bundleName = themeMap[skin.themeUuid] || null;
      if (!bundleName) continue; // unknown theme – skip

      const edition = tierMap[skin.contentTierUuid] || null;

      skins.push({
        uuid:        skin.uuid,
        displayName: skin.displayName,
        bundleName,
        weapon:      weaponName,
        edition,
        audioUrl,
      });
    }
  }

  // Sort by bundleName, then weapon for determinism
  skins.sort((a, b) =>
    a.bundleName.localeCompare(b.bundleName) || a.weapon.localeCompare(b.weapon),
  );

  // Unique bundle / weapon lists for the autocomplete
  const bundles = [...new Set(skins.map(s => s.bundleName))].sort();
  const weaponTypes = [...new Set(skins.map(s => s.weapon))].sort();

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ skins, bundles, weaponTypes, editionIcons }, null, 2), 'utf-8');

  console.log(`\n✓ Wrote ${skins.length} skins to ${OUT}`);
  console.log(`  Bundles: ${bundles.length} | Weapon types: ${weaponTypes.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
