"""
build_orgmap.py
Fetches player data for Valorandle and writes org-map.json.

Sources:
  1. vlrgg /v2/stats — team name per player + fallback agents (all-time top 3)
  2. vlrgg /v2/match?q=results + /v2/match/details — agent picks from last 5 VCT
     matches per player (more accurate than all-time top agents)
  3. Liquipedia API — birthdate → age (DISABLED — awaiting API key approval)

Output format (org-map.json):
  { "playername": { "team": "Team Name", "role": "Duelist" } }

Run by GitHub Actions weekly (see .github/workflows/update-players.yml).
Requires: pip install httpx
"""

import httpx
import json
import os
import sys
import time
from collections import defaultdict

# ── Secrets ───────────────────────────────────────────────────────────────────
API_BASE = os.environ.get("VLRGG_API_URL", "").rstrip("/")

if not API_BASE:
    print("ERROR: VLRGG_API_URL environment variable is not set.")
    sys.exit(1)

# ── Agent → Role map (all 29 VALORANT agents — updated 2026-05-12) ────────────
# Keys lowercase to match vlrgg API format.
AGENT_ROLE = {
    # Duelists (8)
    "jett":       "Duelist",
    "reyna":      "Duelist",
    "phoenix":    "Duelist",
    "neon":       "Duelist",
    "iso":        "Duelist",
    "raze":       "Duelist",
    "yoru":       "Duelist",
    "waylay":     "Duelist",    # released 2026
    # Initiators (7)
    "sova":       "Initiator",
    "fade":       "Initiator",
    "breach":     "Initiator",
    "kayo":       "Initiator",  # "KAY/O" normalized
    "kay/o":      "Initiator",  # match details use title-case with slash
    "skye":       "Initiator",
    "gekko":      "Initiator",
    "tejo":       "Initiator",  # released early 2025
    # Controllers (7)
    "brimstone":  "Controller",
    "viper":      "Controller",
    "omen":       "Controller",
    "astra":      "Controller",
    "harbor":     "Controller",
    "clove":      "Controller",
    "miks":       "Controller", # released March 2026
    # Sentinels (7)
    "killjoy":    "Sentinel",
    "cypher":     "Sentinel",
    "sage":       "Sentinel",
    "chamber":    "Sentinel",
    "deadlock":   "Sentinel",
    "vyse":       "Sentinel",   # released August 2025
    "veto":       "Sentinel",   # released October 2025
}

TIMEOUT         = 30
RESULTS_PAGES   = 10    # pages of recent results to scan (50 matches/page)
                        # VCT matches are sparse (~10-25/page), need 10 pages
                        # to reliably cover all teams' last 5 VCT matches
MAX_MATCHES     = 5     # max recent VCT matches per player for role detection
VCT_KEYWORDS    = ["VCT 2026", "VCT 2025"]  # tournament names to filter


def agent_to_role(agent_name):
    """Normalize agent name and look up role. Returns None if unknown."""
    return AGENT_ROLE.get(agent_name.lower())


def detect_role(agent_list):
    """
    Given a list of agents (ordered by recency/frequency), return dominant role.

    Rules:
      - Dominant role with no significant secondary → pure role (e.g. "Duelist")
      - Dominant role AND secondary appears 2+ times → compound (e.g. "Duelist (Flex)")
      - No single dominant (tied counts) → "Flex"
      - Unknown agents ignored. Returns None if no known agents.
    """
    role_counts = defaultdict(int)
    for agent in agent_list:
        role = agent_to_role(agent)
        if role:
            role_counts[role] += 1
    if not role_counts:
        return None

    dominant      = max(role_counts, key=role_counts.get)
    dominant_count = role_counts[dominant]
    max_secondary  = max((c for r, c in role_counts.items() if r != dominant), default=0)

    # Tied → no clear primary → Flex
    if dominant_count == max_secondary:
        return "Flex"

    # Secondary role played 2+ times → player is considered a flex
    if max_secondary >= 2:
        return f"{dominant} (Flex)"

    # Secondary negligible (0 or 1 pick) → pure role
    return dominant


# ── Step 1: Build team map + all-time fallback agents from vlrgg stats ────────
REGIONS  = ["na", "eu", "ap", "la-s", "la-n", "br", "kr", "cn"]

org_map         = {}   # name.lower() → team string
agents_all      = {}   # name.lower() → [agent, ...] from timespan=all (career)
agents_30d      = {}   # name.lower() → [agent, ...] from timespan=30  (recent)

errors = []

print("[vlrgg] Fetching player data (timespan=all)...\n")

for region in REGIONS:
    url = f"{API_BASE}/v2/stats?region={region}&timespan=all"
    try:
        r = httpx.get(url, timeout=TIMEOUT, follow_redirects=True)
        r.raise_for_status()
        segments = r.json().get("data", {}).get("segments", [])
        count = 0
        for seg in segments:
            player = seg.get("player", "").strip()
            org    = seg.get("org", "").strip()
            if not player or not org:
                continue
            key = player.lower()
            org_map[key] = org
            agents = seg.get("agents") or []
            if agents:
                agents_all[key] = agents
            count += 1
        print(f"  ✓ {region:6s}  {count} players")
    except Exception as e:
        print(f"  ✗ {region:6s}  {e}")
        errors.append(region)

print(f"\n  Total: {len(org_map)} players\n")


# ── Step 1b: Fetch timespan=30 agents (any tournament, last 30 days) ──────────
print("[vlrgg] Fetching recent agents (timespan=30, all tournaments)...\n")

for region in REGIONS:
    url = f"{API_BASE}/v2/stats?region={region}&timespan=30"
    try:
        r = httpx.get(url, timeout=TIMEOUT, follow_redirects=True)
        r.raise_for_status()
        segments = r.json().get("data", {}).get("segments", [])
        count = 0
        for seg in segments:
            player = seg.get("player", "").strip()
            agents = seg.get("agents") or []
            if player and agents:
                agents_30d[player.lower()] = agents
                count += 1
        print(f"  ✓ {region:6s}  {count} players")
    except Exception as e:
        print(f"  ✗ {region:6s}  {e}")

print(f"\n  30d coverage: {len(agents_30d)} players\n")


# ── Step 2: Build recent agent map from last VCT match results ────────────────
# player.lower() → list of agents played (across last MAX_MATCHES VCT matches)

recent_agents = defaultdict(list)   # name.lower() → [agent, agent, ...]
match_count_per_player = defaultdict(int)

print(f"[vlrgg] Fetching recent VCT match results ({RESULTS_PAGES} pages)...")

match_ids = []
for page in range(1, RESULTS_PAGES + 1):
    try:
        r = httpx.get(
            f"{API_BASE}/v2/match",
            params={"q": "results", "num_pages": 1, "from_page": page},
            timeout=TIMEOUT,
            follow_redirects=True,
        )
        r.raise_for_status()
        results = r.json().get("data", {}).get("segments", [])
        for match in results:
            name = match.get("tournament_name", "")
            page_path = match.get("match_page", "")
            is_vct = any(kw in name for kw in VCT_KEYWORDS)
            if is_vct and page_path:
                mid = page_path.strip("/").split("/")[0]
                if mid.isdigit():
                    match_ids.append(mid)
        print(f"  Page {page}: {len(results)} results, {len(match_ids)} VCT so far")
    except Exception as e:
        print(f"  ✗ Results page {page}: {e}")

match_ids = list(dict.fromkeys(match_ids))   # deduplicate, preserve order
print(f"\n  Fetching details for {len(match_ids)} VCT matches...\n")

for mid in match_ids:
    try:
        r = httpx.get(
            f"{API_BASE}/v2/match/details",
            params={"match_id": mid},
            timeout=TIMEOUT,
            follow_redirects=True,
        )
        r.raise_for_status()
        seg = (r.json().get("data", {}).get("segments") or [{}])[0]
        maps = seg.get("maps") or []

        # Each map has players.team1 / players.team2 with name + agent
        for game_map in maps:
            players_data = game_map.get("players") or {}
            for side in ("team1", "team2"):
                for p in players_data.get(side) or []:
                    pname = (p.get("name") or "").strip().lower()
                    agent = (p.get("agent") or "").strip()
                    if not pname or not agent:
                        continue
                    # Only keep last MAX_MATCHES matches worth of agents
                    if match_count_per_player[pname] < MAX_MATCHES:
                        recent_agents[pname].append(agent)

        # Count distinct matches per player (use first map's team1 player list)
        if maps:
            first_map_players = (maps[0].get("players") or {})
            for side in ("team1", "team2"):
                for p in (first_map_players.get(side) or []):
                    pname = (p.get("name") or "").strip().lower()
                    if pname:
                        match_count_per_player[pname] += 1

        time.sleep(0.4)   # be polite to the API
    except Exception as e:
        print(f"  ✗ match {mid}: {e}")

players_with_recent = sum(1 for p in org_map if p in recent_agents)
print(f"  Recent agents found for {players_with_recent} / {len(org_map)} players\n")


# ── Step 3: Detect role per player ────────────────────────────────────────────
role_map = {}   # name.lower() → detected role string

for pname in org_map:
    agents = recent_agents.get(pname) or agents_30d.get(pname) or agents_all.get(pname) or []
    role = detect_role(agents)
    if role:
        role_map[pname] = role

recent_count = sum(1 for p in role_map if p in recent_agents)
d30_count    = sum(1 for p in role_map if p not in recent_agents and p in agents_30d)
all_count    = len(role_map) - recent_count - d30_count
print(f"[roles] {len(role_map)} roles: {recent_count} from VCT matches, {d30_count} from 30d stats, {all_count} from all-time fallback\n")


# ── Step 4: Liquipedia API — birthdate → age ──────────────────────────────────
# Runs automatically when LIQUIPEDIA_API_KEY secret is set in GitHub Actions.
# No code changes needed — just add the secret and it activates.
#
# API: https://api.liquipedia.net/api/v3/player
# Rate limit: 1 req/second. ~60 players = ~60s. Well within weekly budget.
# Name lookup: tries pname.title() first (e.g. "aspas" → "Aspas"),
#              then pname as-is for players with unusual casing (e.g. "BABYBAY").

from datetime import date as _date

age_map = {}
LIQUIPEDIA_KEY = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()

if not LIQUIPEDIA_KEY:
    print("[Liquipedia] LIQUIPEDIA_API_KEY not set — age remains hardcoded in players.js\n")
else:
    print("[Liquipedia] Fetching player birthdates...")
    today = _date.today()
    liq_headers = {
        "Authorization": f"Apikey {LIQUIPEDIA_KEY}",
        "Accept":        "application/json",
    }
    liq_ok = liq_errors = 0

    for pname in list(org_map.keys()):
        # Try title-case first (aspas→Aspas), then original (BABYBAY stays BABYBAY)
        candidates = [pname.title(), pname] if pname.title() != pname else [pname]
        found = False
        for candidate in candidates:
            try:
                r = httpx.get(
                    "https://api.liquipedia.net/api/v3/player",
                    params={"wiki":       "valorant",
                            "conditions": f"[[pagename::{candidate}]]",
                            "fields":     "id,birthdate"},
                    headers=liq_headers,
                    timeout=15,
                    follow_redirects=True,
                )
                result = r.json().get("result", [])
                if result and result[0].get("birthdate"):
                    bd  = _date.fromisoformat(result[0]["birthdate"])
                    age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
                    age_map[pname] = age
                    liq_ok += 1
                    found = True
                    break
            except Exception as e:
                liq_errors += 1
                if liq_errors <= 5:
                    print(f"  ✗ Liquipedia error: {candidate} — {e}")
            time.sleep(1.1)   # respect 1 req/s rate limit (sleep between candidates too)

        if not found and pname not in age_map:
            pass   # silently skip — age stays as defined in players.js

    print(f"  ✓ Got age for {liq_ok} players ({liq_errors} errors, "
          f"{len(org_map)-liq_ok} not found on Liquipedia)\n")


# ── Step 5: Build final player_data dict and write org-map.json ──────────────
player_data = {}
for pname, team in org_map.items():
    entry = {"team": team}
    if pname in age_map:
        entry["age"] = age_map[pname]
    if pname in role_map:
        entry["role"] = role_map[pname]
    player_data[pname] = entry

output_path = os.path.join(os.path.dirname(__file__), "..", "..", "org-map.json")
output_path = os.path.normpath(output_path)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(player_data, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(player_data)} entries to org-map.json")
if errors:
    print(f"Failed vlrgg regions: {', '.join(errors)}")
