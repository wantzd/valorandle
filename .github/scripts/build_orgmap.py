"""
build_orgmap.py
Fetches player data for Valorandle and writes org-map.json.

Sources:
  1. vlrgg API  — team name per player (required, via VLRGG_API_URL secret)
  2. vlrgg API  — agent picks from recent matches → auto-detect role (optional)
  3. Liquipedia API — birthdate → age (DISABLED — awaiting API key approval)

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
from collections import defaultdict

# ── Secrets ───────────────────────────────────────────────────────────────────
API_BASE = os.environ.get("VLRGG_API_URL", "").rstrip("/")

if not API_BASE:
    print("ERROR: VLRGG_API_URL environment variable is not set.")
    sys.exit(1)

# ── Agent → Role map (all 29 VALORANT agents — updated 2026-05-12) ────────────
AGENT_ROLE = {
    # Duelists (8)
    "Jett":       "Duelist",
    "Reyna":      "Duelist",
    "Phoenix":    "Duelist",
    "Neon":       "Duelist",
    "Iso":        "Duelist",
    "Raze":       "Duelist",
    "Yoru":       "Duelist",
    "Waylay":     "Duelist",    # released 2026
    # Initiators (7)
    "Sova":       "Initiator",
    "Fade":       "Initiator",
    "Breach":     "Initiator",
    "KAY/O":      "Initiator",
    "Skye":       "Initiator",
    "Gekko":      "Initiator",
    "Tejo":       "Initiator",  # released early 2025
    # Controllers (7)
    "Brimstone":  "Controller",
    "Viper":      "Controller",
    "Omen":       "Controller",
    "Astra":      "Controller",
    "Harbor":     "Controller",
    "Clove":      "Controller",
    "Miks":       "Controller", # released March 2026
    # Sentinels (7)
    "Killjoy":    "Sentinel",
    "Cypher":     "Sentinel",
    "Sage":       "Sentinel",
    "Chamber":    "Sentinel",
    "Deadlock":   "Sentinel",
    "Vyse":       "Sentinel",   # released August 2025
    "Veto":       "Sentinel",   # released October 2025
}

TIMEOUT = 30


# ── Step 1: Build team map from vlrgg stats ───────────────────────────────────
REGIONS  = ["na", "eu", "ap", "la-s", "la-n", "br", "kr", "cn"]
TIMESPAN = "all"

org_map = {}   # name.lower() → team string (interim)
errors  = []

print("[vlrgg] Fetching player/team data...\n")

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
# Tries two endpoint patterns; skips gracefully if neither is available.

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
    return dominant if role_counts[dominant] / total >= 0.60 else "Flex"

print("[vlrgg] Attempting agent/match data for role detection...")

# Attempt A: /v2/agents endpoint (bulk agent stats per region)
agents_ok = False
try:
    sample_url = f"{API_BASE}/v2/agents?region=na&timespan=60d"
    r = httpx.get(sample_url, timeout=TIMEOUT, follow_redirects=True)
    if r.status_code == 200:
        segs = r.json().get("data", {}).get("segments", [])
        player_agents = defaultdict(dict)
        for seg in segs:
            pname = seg.get("player", "").strip().lower()
            agent = seg.get("agent", "").strip()
            rounds = seg.get("rounds_played") or seg.get("rounds") or 1
            if pname and agent:
                player_agents[pname][agent] = player_agents[pname].get(agent, 0) + rounds
        # Fetch remaining regions
        for region in [r2 for r2 in REGIONS if r2 != "na"]:
            try:
                r2 = httpx.get(f"{API_BASE}/v2/agents?region={region}&timespan=60d",
                                timeout=TIMEOUT, follow_redirects=True)
                if r2.status_code == 200:
                    for seg in r2.json().get("data", {}).get("segments", []):
                        pname = seg.get("player", "").strip().lower()
                        agent = seg.get("agent", "").strip()
                        rounds = seg.get("rounds_played") or seg.get("rounds") or 1
                        if pname and agent:
                            player_agents[pname][agent] = player_agents[pname].get(agent, 0) + rounds
            except Exception:
                pass
        for pname, acounts in player_agents.items():
            detected = detect_role_from_agents(acounts)
            if detected:
                role_map[pname] = detected
        agents_ok = True
        print(f"  ✓ /v2/agents  — detected roles for {len(role_map)} players")
    else:
        print(f"  ✗ /v2/agents returned {r.status_code}")
except Exception as e:
    print(f"  ✗ /v2/agents not available ({e})")

# Attempt B: /v2/player?name=<name> per player (slower fallback)
if not agents_ok and org_map:
    print("  Trying /v2/player?name=<player> per player...")
    sample = next(iter(org_map))
    try:
        probe = httpx.get(f"{API_BASE}/v2/player?name={sample}",
                          timeout=TIMEOUT, follow_redirects=True)
        pdata = probe.json().get("data", {}) if probe.status_code == 200 else {}
        has_agents = bool(pdata.get("agents") or pdata.get("top_agents"))
        if has_agents:
            print(f"  ✓ /v2/player supports agents — fetching all {len(org_map)} players...")
            for pname in list(org_map.keys()):
                try:
                    pr = httpx.get(f"{API_BASE}/v2/player?name={pname}",
                                   timeout=15, follow_redirects=True)
                    if pr.status_code == 200:
                        pd = pr.json().get("data", {})
                        agents_raw = pd.get("agents") or pd.get("top_agents") or []
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
            print("  ✗ /v2/player has no agent data — role detection skipped")
    except Exception as e:
        print(f"  ✗ /v2/player not available ({e}) — role detection skipped")

if not role_map:
    print("  Role detection skipped — roles remain as defined in players.js\n")
else:
    print()


# ── Step 3: Liquipedia API — birthdate → age ──────────────────────────────────
# DISABLED: awaiting Liquipedia API key approval.
# To enable: uncomment this block and ensure LIQUIPEDIA_API_KEY secret is set.
#
# age_map = {}
# LIQUIPEDIA_KEY = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()
# if LIQUIPEDIA_KEY:
#     from datetime import date
#     print("[Liquipedia] Fetching player birthdates...")
#     today = date.today()
#     liq_headers = {
#         "Authorization": f"Apikey {LIQUIPEDIA_KEY}",
#         "Accept":        "application/json",
#     }
#     liq_errors = 0
#     for pname in list(org_map.keys()):
#         page = pname.title()
#         try:
#             r = httpx.get(
#                 "https://api.liquipedia.net/api/v3/player",
#                 params={"wiki": "valorant",
#                         "conditions": f"[[pagename::{page}]]",
#                         "fields": "id,birthdate"},
#                 headers=liq_headers,
#                 timeout=15,
#                 follow_redirects=True,
#             )
#             result = r.json().get("result", [])
#             if result and result[0].get("birthdate"):
#                 from datetime import date as _d
#                 bd = _d.fromisoformat(result[0]["birthdate"])
#                 age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
#                 age_map[pname] = age
#         except Exception as e:
#             liq_errors += 1
#             if liq_errors <= 3:
#                 print(f"  ✗ Liquipedia miss: {pname} — {e}")
#         time.sleep(1.1)
#     print(f"  ✓ Got age for {len(age_map)} players ({liq_errors} misses)\n")
# else:
#     print("[Liquipedia] LIQUIPEDIA_API_KEY not set — skipping\n")

age_map = {}   # empty until Liquipedia block is re-enabled


# ── Step 4: Build final player_data dict and write org-map.json ──────────────
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
