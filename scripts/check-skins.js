#!/usr/bin/env node
/**
 * check-skins.js
 * Read-only validation of public/data/skins-db.json against bundle-patches.json.
 * Runs the same three checks as seed-skins.js but without fetching or writing.
 * Safe for CI — does not touch any file.
 *
 * Exit code 0 = all checks passed.
 * Exit code 1 = missing patch entries (or data files unreadable).
 *
 * Usage:
 *   node scripts/check-skins.js
 *   npm run check:skins
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { validateSkins } from './lib/validate-skins.js';

const __dir      = dirname(fileURLToPath(import.meta.url));
const DB_FILE    = join(__dir, '..', 'public', 'data', 'skins-db.json');
const PATCH_FILE = join(__dir, '..', 'public', 'data', 'bundle-patches.json');

function main() {
  // ── Load ──────────────────────────────────────────────────────────────────
  let db, patches;
  try {
    db = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error(`[check:skins] Cannot read skins-db.json: ${e.message}`);
    console.error('  Run: node scripts/seed-skins.js  (or npm run seed:skins once added)');
    process.exit(1);
  }
  try {
    patches = JSON.parse(readFileSync(PATCH_FILE, 'utf-8'));
  } catch (e) {
    console.error(`[check:skins] Cannot read bundle-patches.json: ${e.message}`);
    process.exit(1);
  }

  console.log(`[check:skins] ${db.skins.length} skins | ${db.bundles.length} bundles`);

  // ── Validate ─────────────────────────────────────────────────────────────
  // Note: suspicious-name check (Map arg) is only available during seeding
  // because it operates on derivedNames before overrides. Here we skip it —
  // by the time skins-db.json exists the names are already final.
  const { errors, warnings, report } = validateSkins(db.skins, patches);

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

main();
