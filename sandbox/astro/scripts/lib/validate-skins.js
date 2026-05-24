/**
 * validate-skins.js
 * Shared validation logic used by seed-skins.js (post-write) and check-skins.js (read-only).
 * Three checks:
 *   1. Suspicious derived bundle names (bad regex cut)
 *   2. Missing patch entries (blocks daily pool silently without this check)
 *   3. Bundle size report with [LARGE BUNDLE] flag (signals undetected new waves)
 */

// Patterns that suggest the weapon-suffix strip went wrong
const SUSPICIOUS_END_RE = /[.,;:\-!?/\\]$/;

/**
 * Returns a reason string if the derived name looks malformed, or null if clean.
 * @param {string} name
 * @returns {string|null}
 */
export function suspiciousBundleName(name) {
  if (!name || name.trim().length < 3) return 'too short (< 3 chars)';
  if (SUSPICIOUS_END_RE.test(name))    return `ends with punctuation "${name.slice(-1)}"`;
  return null;
}

/**
 * Run all three validation checks.
 *
 * @param {Array}  skins         - skins array from skins-db.json
 * @param {Object} patches       - full bundle-patches.json (may include "_note")
 * @param {Map}    suspiciousMap - Map<derivedName, displayName[]> collected during processing
 * @returns {{ warnings: string[], errors: string[], report: string }}
 */
export function validateSkins(skins, patches, suspiciousMap = new Map()) {
  const errors   = [];
  const warnings = [];
  const lines    = [];

  const patchKeys = new Set(Object.keys(patches).filter(k => k !== '_note'));

  // ── 1. Suspicious derived names ──────────────────────────────────────────
  for (const [derivedName, displayNames] of suspiciousMap) {
    const reason = suspiciousBundleName(derivedName);
    if (reason) {
      const examples = displayNames.slice(0, 2).map(n => `"${n}"`).join(', ');
      warnings.push(
        `[SUSPICIOUS BUNDLE NAME] "${derivedName}" (${reason}) — from: ${examples}`,
      );
    }
  }

  // ── 2. Missing patches ────────────────────────────────────────────────────
  const byBundle = new Map();
  for (const skin of skins) {
    if (!byBundle.has(skin.bundleName)) byBundle.set(skin.bundleName, []);
    byBundle.get(skin.bundleName).push(skin);
  }

  for (const [bundle, bundleSkins] of [...byBundle].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!patchKeys.has(bundle)) {
      errors.push(
        `[MISSING PATCH] Bundle "${bundle}" — ${bundleSkins.length} skin(s) excluded from pool.` +
        ` Add "${bundle}" to bundle-patches.json.`,
      );
    }
  }

  // ── 3. Bundle size report ─────────────────────────────────────────────────
  const sorted = [...byBundle].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const maxLen = Math.max(...sorted.map(([n]) => n.length), 10);
  const hr     = '─'.repeat(maxLen + 28);

  lines.push('\nBundle size report:');
  lines.push(hr);
  for (const [bundle, bundleSkins] of sorted) {
    const count   = bundleSkins.length;
    const weapons = bundleSkins.map(s => s.weapon).sort().join(', ');
    const large   = count > 6  ? '  ← [LARGE BUNDLE]'  : '';
    const missing = !patchKeys.has(bundle) ? '  ← NO PATCH' : '';
    lines.push(
      `  ${bundle.padEnd(maxLen)}  ${String(count).padStart(2)}  ${weapons}${large}${missing}`,
    );
  }
  lines.push(hr);
  lines.push(`  Total: ${skins.length} skins | ${sorted.length} bundles\n`);

  return { errors, warnings, report: lines.join('\n') };
}
