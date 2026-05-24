#!/usr/bin/env node
/**
 * seed-skins.js
 * Fetches skin data from valorant-api.com and writes public/data/skins-db.json.
 * Run from the sandbox/astro/ directory:
 *   node scripts/seed-skins.js
 *
 * After writing, runs three integrity checks (see scripts/lib/validate-skins.js):
 *   1. Suspicious derived bundle names
 *   2. Missing patch entries → process.exit(1) to break CI
 *   3. Bundle size report with [LARGE BUNDLE] flag for undetected new waves
 *
 * bundle-patches.json and skin-overrides.json live in public/data/ and are
 * read at seed-time (for validation) and at runtime by the game.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { validateSkins, suspiciousBundleName } from './lib/validate-skins.js';

const __dir         = dirname(fileURLToPath(import.meta.url));
const OUT           = join(__dir, '..', 'public', 'data', 'skins-db.json');
const OVERRIDES_FILE = join(__dir, '..', 'public', 'data', 'skin-overrides.json');
const PATCHES_FILE   = join(__dir, '..', 'public', 'data', 'bundle-patches.json');

const BASE    = 'https://valorant-api.com/v1';
const LANG_EN = 'language=en-US';
const LANG_PT = 'language=pt-BR';

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
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i].streamedVideo) return levels[i];
  }
  return null;
}

// Content-tier devName → clean label
function cleanEdition(devName = '', displayName = '') {
  const s = devName || displayName;
  const map = {
    SelectEdition:    'Select',
    DeluxeEdition:    'Deluxe',
    PremiumEdition:   'Premium',
    ExclusiveEdition: 'Exclusive',
    UltraEdition:     'Ultra',
  };
  if (map[s]) return map[s];
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
  // ── Load support files ───────────────────────────────────────────────────
  let skinOverrides = {};
  try {
    const raw = readFileSync(OVERRIDES_FILE, 'utf-8');
    skinOverrides = JSON.parse(raw);
    delete skinOverrides['_note'];
    console.log(`[overrides] Loaded ${Object.keys(skinOverrides).length} overrides`);
  } catch {
    console.log('[overrides] No skin-overrides.json — proceeding without overrides');
  }

  let patches = {};
  try {
    patches = JSON.parse(readFileSync(PATCHES_FILE, 'utf-8'));
    console.log(`[patches]   Loaded ${Object.keys(patches).length - 1} bundle patch entries`);
  } catch {
    console.warn('[patches]   Could not read bundle-patches.json — missing-patch check will flag everything');
  }

  // ── Fetch ────────────────────────────────────────────────────────────────
  console.log('[1/5] Fetching content tiers…');
  const tiers = await fetchJSON(`${BASE}/contenttiers?${LANG_EN}`);
  const tierMap      = {};
  const editionIcons = {};
  for (const t of tiers) {
    const label = cleanEdition(t.devName, t.displayName);
    tierMap[t.uuid] = label;
    if (label && t.displayIcon) editionIcons[label] = t.displayIcon;
  }

  console.log('[2/5] Fetching themes…');
  const themes   = await fetchJSON(`${BASE}/themes?${LANG_EN}`);
  const themeMap = {};
  for (const th of themes) themeMap[th.uuid] = th.displayName;

  console.log('[3/5] Fetching weapons (EN)…');
  const weapons = await fetchJSON(`${BASE}/weapons?${LANG_EN}`);

  console.log('[4/5] Fetching weapons (PT-BR)…');
  const weaponsPT = await fetchJSON(`${BASE}/weapons?${LANG_PT}`);

  // Build uuid → PT display name for skins
  const skinNamesPT = new Map();
  for (const weapon of weaponsPT) {
    for (const skin of weapon.skins) {
      skinNamesPT.set(skin.uuid, skin.displayName);
    }
  }

  // ── Process ──────────────────────────────────────────────────────────────
  console.log('[5/5] Processing skins…');
  const skins = [];

  // Map<derivedName → displayName[]> — fed to validator for suspicious-name check
  const suspiciousMap = new Map();

  for (const weapon of weapons) {
    const weaponName = weapon.displayName; // "Vandal", "Phantom", "Melee", …

    for (const skin of weapon.skins) {
      if (!skin.themeUuid || skin.themeUuid === STANDARD_THEME_UUID) continue;

      // Derive bundleName from displayName by stripping the weapon suffix.
      // "Prelude to Chaos Vandal" → "Prelude to Chaos"
      // Melee skins ("Elderflame Dagger") never end with " Melee" → null → skipped.
      const derivedName = skin.displayName.endsWith(' ' + weaponName)
        ? skin.displayName.slice(0, -(weaponName.length + 1)).trim()
        : null;
      if (!derivedName) continue;

      // Collect suspicious derived names for post-processing check
      if (suspiciousBundleName(derivedName)) {
        if (!suspiciousMap.has(derivedName)) suspiciousMap.set(derivedName, []);
        suspiciousMap.get(derivedName).push(skin.displayName);
      }

      // Apply manual override if this UUID has a wave correction
      const bundleName = skinOverrides[skin.uuid] ?? derivedName;

      // Skip VCT Classic skins — one per team, no unique audio, unsolvable
      if (weaponName === 'Classic' && bundleName.startsWith('VCT')) continue;

      const bestLevel = bestAudioLevel(skin.levels ?? []);
      const audioUrl  = bestLevel?.streamedVideo ?? null;
      if (!audioUrl) continue;

      if (!skin.contentTierUuid) continue;

      // PT-BR names — format is "{WeaponEN} {LocalizedSkinName}" (inverted vs EN)
      const displayNamePT = skinNamesPT.get(skin.uuid) ?? skin.displayName;
      // Strip weapon prefix to get the PT bundle name (e.g. "Odin Xenocaçador" → "Xenocaçador")
      const bundleNamePT = displayNamePT.startsWith(weaponName + ' ')
        ? displayNamePT.slice(weaponName.length + 1).trim()
        : bundleName; // fallback to EN bundle name

      skins.push({
        uuid:          skin.uuid,
        displayName:   skin.displayName,
        displayNamePT,
        bundleName,
        bundleNamePT,
        weapon:        weaponName,
        edition:       tierMap[skin.contentTierUuid] || null,
        audioUrl,
      });
    }
  }

  // Sort for determinism
  skins.sort((a, b) =>
    a.bundleName.localeCompare(b.bundleName) || a.weapon.localeCompare(b.weapon),
  );

  const bundles     = [...new Set(skins.map(s => s.bundleName))].sort();
  const weaponTypes = [...new Set(skins.map(s => s.weapon))].sort();

  // ── Write ────────────────────────────────────────────────────────────────
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ skins, bundles, weaponTypes, editionIcons }, null, 2), 'utf-8');
  console.log(`\n✓ Wrote ${skins.length} skins (${bundles.length} bundles) to ${OUT}`);

  // ── Validate ─────────────────────────────────────────────────────────────
  const { errors, warnings, report } = validateSkins(skins, patches, suspiciousMap);

  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach(w => console.warn('  ' + w));
  }

  console.log(report);

  if (errors.length) {
    console.error('Errors:');
    errors.forEach(e => console.error('  ' + e));
    console.error(`\n✗ ${errors.length} error(s). Fix bundle-patches.json before shipping.\n`);
    process.exit(1);
  }

  console.log('✓ All checks passed\n');
}

main().catch(err => { console.error(err); process.exit(1); });
