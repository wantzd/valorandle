"""
build_orgmap.py
Fetches player data for Valorandle and writes org-map.json.

Sources:
  1. vlrgg API  — team name + top agents per player (via /v2/stats, already called)
  2. Liquipedia API — birthdate → age (DISABLED — awaiting API key approval)

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

# ── Secrets ───────────────────────────────────────────────────────────────────
API_BASE = os.environ.get("VLRGG_API_URL", "").rstrip("/")

if not API_BASE:
    print("ERROR: VLRGG_API_URL environment variable is not set.")
    sys.exit(1)

# ── Agent → Role map (all 29 VALORANT agents — updated 2026-05-12) ────────────
# Keys are lowercase to match the vlrgg API response format.
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
    "kayo":       "Initiator",  # vlrgg omits slash: "kayo" not "kay/o"
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

TIMEOUT = 30


def detect_role(agents):
    """
    Given a list of agent names (ordered by usage, most played first),
    return the dominant role using positional weights (3/2/1).
    Returns None if no known agents found.
    """
    weights = [3, 2, 1]
    role_scores = {}
    for i, agent in enumerate(agents[:3]):
        role = AGENT_ROLE.get(agent.lower().replace("/", "").replace("-", ""))
        if role:
            w = weights[i] if i < len(weights) else 1
            role_scores[role] = role_scores.get(role, 0) + w
    if not role_scores:
        return None
    total = sum(role_scores.values())
    dominant = max(role_scores, key=role_scores.get)
    return dominant if role_scores[dominant] / total >= 0.50 else "Flex"


# ── Step 1: Build team + role maps from vlrgg stats ───────────────────────────
REGIONS  = ["na", "eu", "ap", "la-s", "la-n", "br", "kr", "cn"]
TIMESPAN = "all"

org_map  = {}   # name.lower() → team string
role_map = {}   # name.lower() → detected role string
errors   = []

print("[vlrgg] Fetching player data (team + agents)...\n")

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
            if not player or not org:
                continue
            key = player.lower()
            org_map[key] = org
            agents = seg.get("agents") or []
            role = detect_role(agents)
            if role:
                role_map[key] = role
            count += 1
        print(f"  ✓ {region:6s}  {count} players")
    except Exception as e:
        print(f"  ✗ {region:6s}  {e}")
        errors.append(region)

print(f"\n  Total: {len(org_map)} players, {len(role_map)} roles detected\n")


# ── Step 2: Liquipedia API — birthdate → age ──────────────────────────────────
# DISABLED: awaiting Liquipedia API key approval.
# To enable: uncomment this block and ensure LIQUIPEDIA_API_KEY secret is set.
#
# from datetime import date
# age_map = {}
# LIQUIPEDIA_KEY = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()
# if LIQUIPEDIA_KEY:
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
#                 bd = date.fromisoformat(result[0]["birthdate"])
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


# ── Step 3: Build final player_data dict and write org-map.json ──────────────
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
