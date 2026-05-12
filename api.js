// ============================================================
// AGENTGUESS — Player Data Integration (api.js)
//
// Fetches org-map.json (generated weekly by GitHub Actions)
// and applies updated team names to the local PLAYERS_DB.
//
// org-map.json format: { "playername": "Team Name", ... }
//
// If the file is missing or the fetch fails, the game runs
// normally using the local data from players.js.
// ============================================================

(function () {
  "use strict";

  const ORG_MAP_URL    = "./org-map.json";
  const CACHE_DATA_KEY = "agentguess_api_cache_v1";
  const CACHE_EXP_KEY  = "agentguess_api_cache_exp";
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
      const liveTeam = orgMap[p.name.toLowerCase()];
      return (liveTeam && liveTeam !== p.team) ? { ...p, team: liveTeam } : p;
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
      console.warn("[AgentGuess] org-map.json unavailable — using local data.", err.message);
    }
  };

  // Force a fresh fetch on the next page load (run in browser console)
  window.clearPlayerCache = function () {
    localStorage.removeItem(CACHE_DATA_KEY);
    localStorage.removeItem(CACHE_EXP_KEY);
    console.info("[AgentGuess] Player cache cleared. Reload to fetch fresh data.");
  };
})();
