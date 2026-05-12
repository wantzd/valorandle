"""
build_orgmap.py
Fetches player data for Valorandle and writes org-map.json.

Sources:
  1. vlrgg API  — team name per player (required, via VLRGG_API_URL secret)
  2. vlrgg API  — agent picks from recent matches → auto-detect role (optional)
  3. Liquipedia API — birthdate → age (optional, via LIQUIPEDIA_API_KEY secret)

Output format (org-map.json):
  { "playername": { "team": "Team Name", "age": 22, "role": "Duelist" }, ... }

Run by GitHub Actions weekly (see .github/workflows/update-players.yml).
Requires: pip install httpx
"""

import httpx
import json
import os
import sys
import time
from datetime import date

# ── Secrets ───────────────────────────────────────────────────────────────────
API_BASE        = os.environ.get("VLRGG_API_URL", "").rstrip("/")
LIQUIPEDIA_KEY  = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()

if not API_BASE:
    print("ERROR: VLRGG_API_URL environment variable is not set.")
    sys.exit(1)

# ── Agent → Role map (all current VALORANT agents) ────────────────────────────
AGENT_ROLE = {
    "Jett":       "Duelist",    "Reyna":      "Duelist",
    "Phoenix":    "Duelist",    "Neon":       "Duelist",
    "Iso":        "Duelist",    "Raze":       "Duelist",
    "Yoru":       "Duelist",
    "Sova":       "Initiator",  "Fade":       "Initiator",
    "Breach":     "Initiator",  "KAY/O":      "Initiator",
    "Skye":       "Initiator",  "Gekko":      "Initiator",
    "Brimstone":  "Controller", "Viper":      "Controller",
    "Omen":       "Controller", "Astra":      "Controller",
    "Harbor":     "Controller", "Clove":      "Controller",
    "Killjoy":    "Sentinel",   "Cypher":     "Sentinel",
    "Sage":       "Sentinel",   "Chamber":    "Sentinel",
    "Deadlock":   "Sentinel",   "Vyse":       "Sentinel",
}

TIMEOUT = 30


# ── Step 1: Build team map from vlrgg stats ───────────────────────────────────
REGIONS  = ["na", "eu", "ap", "la-s", "la-n", "br", "kr", "cn"]
TIMESPAN = "all"

org_map = {}   # name.lower() → team string (interim)
errors  = []

print(f"[vlrgg] Fetching player/team data...\n")

for region in REGIONS:
    url = f"{API_BASE}/v2/stats?region={region}&timespan={TIMESPAN}"
    try:
        r = httpx.get(url, timeout=TIMEOUT, follow_redirects=True)
        r.raise_for_status()
        segments = r.json().get("data", {}).get("segments", [])
        count = 0
        for seg in segments:
            player = seg.get("player", "").strip()
            org    = seg.get("org", "").strip()
            if player and org:
                org_map[player.lower()] = org
                count += 1
        print(f"  ✓ {region:6s}  {count} players")
    except Exception as e:
        print(f"  ✗ {region:6s}  {e}")
        errors.append(region)

print(f"\n  Total: {len(org_map)} players from vlrgg\n")


# ── Step 2: Detect role from recent agent picks (vlrgg) ───────────────────────
# Try common endpoint patterns — skip gracefully if unavailable.

role_map = {}   # name.lower() → detected role string

def detect_role_from_agents(agent_counts):
    """Given {agent_name: pick_count}, return dominant role or None."""
    if not agent_counts:
        return None
    role_counts = {}
    total = 0
    for agent, count in agent_counts.items():
        role = AGENT_ROLE.get(agent)
        if role:
            role_counts[role] = role_counts.get(role, 0) + count
            total += count
    if not role_counts or total == 0:
        return None
    dominant = max(role_counts, key=role_counts.get)
    if role_counts[dominant] / total >= 0.60:
        return dominant
    return "Flex"

print("[vlrgg] Attempting agent/match data for role detection...")

# Try /v2/agents endpoint (player agent stats summary)
agents_ok = False
try:
    sample_url = f"{API_BASE}/v2/agents?region=na&timespan=60d"
    r = httpx.get(sample_url, timeout=TIMEOUT, follow_redirects=True)
    if r.status_code == 200:
        segs = r.json().get("data", {}).get("segments", [])
        # Group by player, collect agent + rounds played
        from collections import defaultdict
        player_agents = defaultdict(dict)
        for seg in segs:
            pname = seg.get("player", "").strip().lower()
            agent = seg.get("agent", "").strip()
            rounds = seg.get("rounds_played", 0) or seg.get("rounds", 0) or 1
            if pname and agent:
                player_agents[pname][agent] = player_agents[pname].get(agent, 0) + rounds
        for pname, acounts in player_agents.items():
            detected = detect_role_from_agents(acounts)
            if detected:
                role_map[pname] = detected
        agents_ok = True
        print(f"  ✓ /v2/agents  detected roles for {len(role_map)} players")
except Exception as e:
    print(f"  ✗ /v2/agents not available ({e})")

# Fallback: try /v2/player?name=<name> for individual players
if not agents_ok and org_map:
    print("  Trying /v2/player?name=<player> for a sample...")
    sample_player = next(iter(org_map))
    try:
        r = httpx.get(f"{API_BASE}/v2/player?name={sample_player}", timeout=TIMEOUT, follow_redirects=True)
        if r.status_code == 200:
            data = r.json().get("data", {})
            # Check if response contains agent breakdown
            if data.get("agents") or data.get("top_agents"):
                print("  ✓ /v2/player supports agents — fetching all players (slow)...")
                for pname in list(org_map.keys()):
                    try:
                        pr = httpx.get(f"{API_BASE}/v2/player?name={pname}", timeout=15, follow_redirects=True)
                        if pr.status_code == 200:
                            pdata = pr.json().get("data", {})
                            agents_raw = pdata.get("agents") or pdata.get("top_agents") or []
                            acounts = {}
                            for a in agents_raw:
                                aname = a.get("agent") or a.get("name", "")
                                rounds = a.get("rounds_played") or a.get("rounds") or a.get("games") or 1
                                if aname:
                                    acounts[aname] = rounds
                            detected = detect_role_from_agents(acounts)
                            if detected:
                                role_map[pname] = detected
                        time.sleep(0.5)
                    except Exception:
                        pass
                print(f"  ✓ Detected roles for {len(role_map)} players via /v2/player")
            else:
                print("  ✗ /v2/player response has no agent data — skipping role detection")
        else:
            print(f"  ✗ /v2/player returned {r.status_code} — skipping role detection")
    except Exception as e:
        print(f"  ✗ /v2/player not available ({e}) — skipping role detection")

if not role_map:
    print("  Role detection skipped — roles remain as defined in players.js\n")
else:
    print()


# ── Step 3: Fetch birthdate → age from Liquipedia API ─────────────────────────
age_map = {}   # name.lower() → int age

if LIQUIPEDIA_KEY:
    print("[Liquipedia] Fetching player birthdates...")
    today = date.today()
    liq_headers = {
        "Authorization": f"Apikey {LIQUIPEDIA_KEY}",
        "Accept":        "application/json",
    }
    liq_errors = 0

    for pname in list(org_map.keys()):
        # Liquipedia pagenames use title-case (e.g., "aspas" → "Aspas")
        page = pname.title()
        try:
            r = httpx.get(
                "https://api.liquipedia.net/api/v3/player",
                params={"wiki": "valorant",
                        "conditions": f"[[pagename::{page}]]",
                        "fields": "id,birthdate"},
                headers=liq_headers,
                timeout=15,
                follow_redirects=True,
            )
            result = r.json().get("result", [])
            if result and result[0].get("birthdate"):
                bd = date.fromisoformat(result[0]["birthdate"])
                age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
                age_map[pname] = age
        except Exception as e:
            liq_errors += 1
            if liq_errors <= 3:
                print(f"  ✗ Liquipedia miss: {pname} — {e}")
        time.sleep(1.1)   # respect 1 req/s rate limit

    print(f"  ✓ Got age for {len(age_map)} players ({liq_errors} misses)\n")
else:
    print("[Liquipedia] LIQUIPEDIA_API_KEY not set — ages remain as defined in players.js\n")


# ── Step 4: Build final player_data dict and write JSON ──────────────────────
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
