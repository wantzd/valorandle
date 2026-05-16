// ============================================================
// VALORANDLE — Player Data Integration (api.js)
//
// Fetches org-map.json (generated weekly by GitHub Actions)
// and merges live data into the local PLAYERS_DB.
//
// org-map.json format (dual-key):
//   "<vlrId>":    { "teamFull": "...", "country": "...", "countryCode": "US",
//                   "age": 22, "role": "Duelist" }   ← full data, keyed by VLR.gg numeric ID
//   "<name>":     { "age": 22, "role": "Duelist" }   ← fallback for players without vlrId
//
// Merge rules:
//   • vlrId match  → apply teamFull, country, countryCode, age, role
//   • name match   → apply age and role only (country data less reliable via name lookup)
//
// If the file is missing or the fetch fails, the game runs
// normally using the local data from players.js.
// ============================================================

(function () {
  "use strict";

  const ORG_MAP_URL    = "./org-map.json";
  const CACHE_DATA_KEY = "valorandle_api_cache_v1";
  const CACHE_EXP_KEY  = "valorandle_api_cache_exp";
  const CACHE_TTL_MS   = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ── Cache ─────────────────────────────────────────────────
  function getCached() {
    try {
      const exp = parseInt(localStorage.getItem(CACHE_EXP_KEY) || "0", 10);
      if (Date.now() < exp) {
        const raw = localStorage.getItem(CACHE_DATA_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch { /* storage unavailable */ }
    return null;
  }

  function setCache(players) {
    try {
      const exp = Date.now() + CACHE_TTL_MS;
      localStorage.setItem(CACHE_DATA_KEY, JSON.stringify(players));
      localStorage.setItem(CACHE_EXP_KEY,  String(exp));
    } catch { /* storage full or unavailable */ }
  }

  // ── Merge ─────────────────────────────────────────────────
  function applyOrgMap(players, orgMap) {
    return players.map(p => {
      // Primary: match by vlrId (precise, no name collisions)
      const vlrKey   = p.vlrId ? String(p.vlrId) : null;
      const vlrEntry = vlrKey ? orgMap[vlrKey] : null;

      // Fallback: match by lowercase name (role/age only — country less reliable)
      const nameEntry = orgMap[p.name.toLowerCase()];

      const byVlrId = !!vlrEntry;
      const entry   = vlrEntry || nameEntry;
      if (!entry) return p;

      const isObj = typeof entry === "object" && entry !== null;
      const updates = {};

      if (byVlrId && isObj) {
        // vlrId match: trust teamFull and country data from per-player API fetch
        if (entry.teamFull    && entry.teamFull    !== p.team)        updates.team        = entry.teamFull;
        if (entry.country     && entry.country     !== p.country)     updates.country     = entry.country;
        if (entry.countryCode && entry.countryCode !== p.countryCode) updates.countryCode = entry.countryCode;
      }

      // age and role applied for both vlrId and name matches
      if (isObj && entry.age  && entry.age  !== p.age)  updates.age  = entry.age;
      if (isObj && entry.role && entry.role !== p.role) updates.role = entry.role;

      return Object.keys(updates).length ? { ...p, ...updates } : p;
    });
  }

  // ── Public API ────────────────────────────────────────────
  window.initPlayersDB = async function () {
    // 1. Serve from cache while still valid
    const cached = getCached();
    if (cached) {
      window.PLAYERS_DB = cached;
      return;
    }

    // 2. Fetch the weekly-generated org map
    try {
      const res = await fetch(ORG_MAP_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const orgMap = await res.json();
      const merged = applyOrgMap(window.PLAYERS_DB, orgMap);
      window.PLAYERS_DB = merged;
      setCache(merged);
    } catch (err) {
      // 3. Silent fallback: local data from players.js
      console.warn("[Valorandle] org-map.json unavailable — using local data.", err.message);
    }
  };

  // Force a fresh fetch on the next page load (run in browser console)
  window.clearPlayerCache = function () {
    localStorage.removeItem(CACHE_DATA_KEY);
    localStorage.removeItem(CACHE_EXP_KEY);
    console.info("[Valorandle] Player cache cleared. Reload to fetch fresh data.");
  };
})();
