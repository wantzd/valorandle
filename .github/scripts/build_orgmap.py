"""
build_orgmap.py
Fetches player data for Valorandle and writes org-map.json.

Sources:
  0. players.js — vlrId mapping (parsed locally)
  1. vlrgg /v2/stats — fallback agents (all-time top 3) + org membership
  2. vlrgg /v2/player?id=X — per-player: teamFull, country, agent_stats (primary)
  3. vlrgg /v2/match?q=results + /v2/match/details — agent picks from last 5 VCT
     matches per player (most accurate role source)
  4. Liquipedia API — birthdate → age (activates when LIQUIPEDIA_API_KEY is set)

Output format (org-map.json):
  - Players with vlrId: keyed by vlrId string
    { "754": { "teamFull": "FURIA", "country": "EUA", "countryCode": "BR", "role": "Duelist" } }
  - Players without vlrId: keyed by name (lowercase) — backward compat
    { "playername": { "role": "Duelist" } }

Run by GitHub Actions weekly (see .github/workflows/update-players.yml).
Requires: pip install httpx
"""

import httpx
import json
import os
import re
import sys
import time
from collections import defaultdict

# ── Secrets ───────────────────────────────────────────────────────────────────
API_BASE = os.environ.get("VLRGG_API_URL", "").rstrip("/")

if not API_BASE:
    print("ERROR: VLRGG_API_URL environment variable is not set.")
    sys.exit(1)

# ── Agent → Role map (all VALORANT agents — updated 2026-05-12) ───────────────
AGENT_ROLE = {
    # Duelists
    "jett":       "Duelist",
    "reyna":      "Duelist",
    "phoenix":    "Duelist",
    "neon":       "Duelist",
    "iso":        "Duelist",
    "raze":       "Duelist",
    "yoru":       "Duelist",
    "waylay":     "Duelist",
    # Initiators
    "sova":       "Initiator",
    "fade":       "Initiator",
    "breach":     "Initiator",
    "kayo":       "Initiator",
    "kay/o":      "Initiator",
    "skye":       "Initiator",
    "gekko":      "Initiator",
    "tejo":       "Initiator",
    # Controllers
    "brimstone":  "Controller",
    "viper":      "Controller",
    "omen":       "Controller",
    "astra":      "Controller",
    "harbor":     "Controller",
    "clove":      "Controller",
    "miks":       "Controller",
    # Sentinels
    "killjoy":    "Sentinel",
    "cypher":     "Sentinel",
    "sage":       "Sentinel",
    "chamber":    "Sentinel",
    "deadlock":   "Sentinel",
    "vyse":       "Sentinel",
    "veto":       "Sentinel",
}

# ── Country code → (Portuguese name, ISO uppercase) ───────────────────────────
COUNTRY_MAP = {
    "us": ("EUA",              "US"),
    "ca": ("Canadá",           "CA"),
    "br": ("Brasil",           "BR"),
    "cl": ("Chile",            "CL"),
    "ar": ("Argentina",        "AR"),
    "co": ("Colômbia",         "CO"),
    "mx": ("México",           "MX"),
    "do": ("Rep. Dominicana",  "DO"),
    "pe": ("Peru",             "PE"),
    "uy": ("Uruguai",          "UY"),
    "gb": ("Reino Unido",      "GB"),
    "uk": ("Reino Unido",      "GB"),
    "de": ("Alemanha",         "DE"),
    "fr": ("França",           "FR"),
    "es": ("Espanha",          "ES"),
    "tr": ("Turquia",          "TR"),
    "ua": ("Ucrânia",          "UA"),
    "ru": ("Rússia",           "RU"),
    "se": ("Suécia",           "SE"),
    "dk": ("Dinamarca",        "DK"),
    "fi": ("Finlândia",        "FI"),
    "no": ("Noruega",          "NO"),
    "nl": ("Holanda",          "NL"),
    "be": ("Bélgica",          "BE"),
    "pl": ("Polônia",          "PL"),
    "pt": ("Portugal",         "PT"),
    "it": ("Itália",           "IT"),
    "hr": ("Croácia",          "HR"),
    "ro": ("Romênia",          "RO"),
    "rs": ("Sérvia",           "RS"),
    "kz": ("Cazaquistão",      "KZ"),
    "kg": ("Quirguistão",      "KG"),
    "mn": ("Mongólia",         "MN"),
    "ma": ("Marrocos",         "MA"),
    "kr": ("Coreia do Sul",    "KR"),
    "jp": ("Japão",            "JP"),
    "cn": ("China",            "CN"),
    "tw": ("Taiwan",           "TW"),
    "hk": ("Hong Kong",        "HK"),
    "sg": ("Singapura",        "SG"),
    "th": ("Tailândia",        "TH"),
    "ph": ("Filipinas",        "PH"),
    "id": ("Indonésia",        "ID"),
    "my": ("Malásia",          "MY"),
    "vn": ("Vietnã",           "VN"),
    "au": ("Austrália",        "AU"),
    "nz": ("Nova Zelândia",    "NZ"),
    "in": ("Índia",            "IN"),
    "pk": ("Paquistão",        "PK"),
    "mn": ("Mongólia",         "MN"),
}

TIMEOUT       = 30
RESULTS_PAGES = 10
MAX_MATCHES   = 5
VCT_KEYWORDS  = ["VCT 2026", "VCT 2025"]


def agent_to_role(agent_name):
    return AGENT_ROLE.get(agent_name.lower())


def detect_role(agent_list):
    """
    Detect dominant role from agent list.
    - secondary ≥ 2 picks → compound "Role (Flex)"
    - tied counts → "Flex"
    - negligible secondary → pure role
    """
    role_counts = defaultdict(int)
    for agent in agent_list:
        role = agent_to_role(agent)
        if role:
            role_counts[role] += 1
    if not role_counts:
        return None

    dominant       = max(role_counts, key=role_counts.get)
    dominant_count = role_counts[dominant]
    max_secondary  = max((c for r, c in role_counts.items() if r != dominant), default=0)

    if dominant_count == max_secondary:
        return "Flex"
    if max_secondary >= 2:
        return f"{dominant} (Flex)"
    return dominant


def country_from_code(code):
    """Return (country_pt, countryCode_upper) or (None, None) if unknown."""
    if not code:
        return None, None
    result = COUNTRY_MAP.get(code.lower().strip())
    return result if result else (None, None)


# ── Step 0: Parse players.js for vlrId mapping ────────────────────────────────
PLAYERS_JS_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "js", "players.js")
)

# vlrId (int) → { "id": str, "name": str }
vlr_id_map = {}
# name.lower() → vlrId (int)  — for quick lookup
name_to_vlrid = {}

print("[Step 0] Parsing players.js for vlrId mapping...")

try:
    with open(PLAYERS_JS_PATH, "r", encoding="utf-8") as f:
        js_content = f.read()

    # Match each { ... } player block
    for block in re.finditer(r'\{[^{}]+\}', js_content):
        text = block.group()
        if 'vlrId' not in text:
            continue
        vlrid_m = re.search(r'vlrId\s*:\s*(\d+)', text)
        name_m  = re.search(r'\bname\s*:\s*"([^"]+)"', text)
        id_m    = re.search(r'\bid\s*:\s*"([^"]+)"', text)
        if vlrid_m and name_m:
            vid  = int(vlrid_m.group(1))
            name = name_m.group(1)
            pid  = id_m.group(1) if id_m else name
            vlr_id_map[vid]             = {"id": pid, "name": name}
            name_to_vlrid[name.lower()] = vid

    print(f"  Found {len(vlr_id_map)} players with vlrId in players.js\n")
except Exception as e:
    print(f"  ⚠ Could not parse players.js: {e}\n")


# ── Step 1: Fallback data from vlrgg /v2/stats ────────────────────────────────
REGIONS = ["na", "eu", "ap", "la-s", "la-n", "br", "kr", "cn"]

org_map      = {}   # name.lower() → abbreviated team (internal only)
name_regions = defaultdict(list)
agents_all   = {}   # name.lower() → [agent, ...] career
agents_30d   = {}   # name.lower() → [agent, ...] last 30 days

errors = []

print("[Step 1] Fetching player stats (timespan=all)...\n")

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
            name_regions[key].append(region)
            agents = seg.get("agents") or []
            if agents:
                agents_all[key] = agents
            count += 1
        print(f"  ✓ {region:6s}  {count} players")
    except Exception as e:
        print(f"  ✗ {region:6s}  {e}")
        errors.append(region)

collisions = {k for k, v in name_regions.items() if len(v) > 1}
if collisions:
    print(f"\n  ⚠ Name collisions ({len(collisions)}): {', '.join(sorted(collisions))}")
print(f"\n  Total from stats: {len(org_map)} players\n")


# Step 1b: timespan=30 fallback agents
print("[Step 1b] Fetching recent agents (timespan=30)...\n")

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


# ── Step 1c: Per-player fetch via vlrId → teamFull, country, agents ────────────
# This is the primary and most accurate source.
# Keys by vlrId, so no name-collision issues at all.

player_teamfull  = {}   # name.lower() → full team name
player_country   = {}   # name.lower() → {"country": "...", "countryCode": "..."}
player_agents_p  = {}   # name.lower() → [agent, ...] from player endpoint

vlrid_role_source  = {}   # vlrId (int) → agent list (for role detection)

print(f"[Step 1c] Fetching per-player data via vlrId ({len(vlr_id_map)} players)...\n")

ok_count = err_count = 0
for vid, pinfo in vlr_id_map.items():
    pname = pinfo["name"].lower()
    try:
        r = httpx.get(
            f"{API_BASE}/v2/player",
            params={"id": vid},
            timeout=TIMEOUT,
            follow_redirects=True,
        )
        r.raise_for_status()
        data = r.json().get("data", {})

        # ── Team full name ─────────────────────────────────────────────────────
        # Try several field paths used by different vlrgg API versions
        team_obj = (
            data.get("team") or
            data.get("current_team") or
            (data.get("player") or {}).get("team") or
            (data.get("player") or {}).get("current_team") or
            {}
        )
        team_name = (
            team_obj.get("name") or
            team_obj.get("full_name") or
            team_obj.get("tag") or
            ""
        ).strip()
        if team_name:
            player_teamfull[pname] = team_name

        # ── Country ────────────────────────────────────────────────────────────
        player_obj = data.get("player") or data
        raw_country = (
            player_obj.get("country") or
            player_obj.get("country_code") or
            data.get("country") or
            ""
        ).strip()
        country_pt, country_code = country_from_code(raw_country)
        if country_pt:
            player_country[pname] = {
                "country":     country_pt,
                "countryCode": country_code,
            }

        # ── Agent stats (for role detection fallback) ──────────────────────────
        agents_raw = (
            player_obj.get("agent_stats") or
            player_obj.get("agents") or
            data.get("agent_stats") or
            data.get("agents") or
            []
        )
        if agents_raw:
            # Sort by usage_count / usage / rounds_played descending
            def usage_key(a):
                return (
                    a.get("usage_count") or
                    a.get("usage") or
                    a.get("rounds_played") or
                    a.get("games_played") or 0
                )
            agents_sorted = sorted(agents_raw, key=usage_key, reverse=True)
            agent_names = [
                (a.get("agent") or a.get("agent_name") or a.get("name") or "").strip()
                for a in agents_sorted
            ]
            agent_names = [a for a in agent_names if a]
            if agent_names:
                player_agents_p[pname] = agent_names
                vlrid_role_source[vid] = agent_names

        ok_count += 1
        if ok_count % 20 == 0:
            print(f"  ... {ok_count}/{len(vlr_id_map)} done")

        time.sleep(0.35)   # polite rate limiting

    except Exception as e:
        err_count += 1
        if err_count <= 10:
            print(f"  ✗ vlrId {vid} ({pinfo['name']}): {e}")

print(f"\n  ✓ {ok_count} players fetched, {err_count} errors")
print(f"  teamFull: {len(player_teamfull)}, country: {len(player_country)}, agents: {len(player_agents_p)}\n")


# ── Step 2: Recent VCT match agent picks ──────────────────────────────────────
recent_agents          = defaultdict(list)
match_count_per_player = defaultdict(int)

print(f"[Step 2] Fetching recent VCT matches ({RESULTS_PAGES} pages)...")

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
            name      = match.get("tournament_name", "")
            page_path = match.get("match_page", "")
            if any(kw in name for kw in VCT_KEYWORDS) and page_path:
                mid = page_path.strip("/").split("/")[0]
                if mid.isdigit():
                    match_ids.append(mid)
        print(f"  Page {page}: {len(results)} results, {len(match_ids)} VCT so far")
    except Exception as e:
        print(f"  ✗ Results page {page}: {e}")

match_ids = list(dict.fromkeys(match_ids))
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
        seg  = (r.json().get("data", {}).get("segments") or [{}])[0]
        maps = seg.get("maps") or []

        for game_map in maps:
            players_data = game_map.get("players") or {}
            for side in ("team1", "team2"):
                for p in players_data.get(side) or []:
                    pname = (p.get("name") or "").strip().lower()
                    agent = (p.get("agent") or "").strip()
                    if pname and agent and match_count_per_player[pname] < MAX_MATCHES:
                        recent_agents[pname].append(agent)

        if maps:
            for side in ("team1", "team2"):
                for p in (maps[0].get("players") or {}).get(side) or []:
                    pname = (p.get("name") or "").strip().lower()
                    if pname:
                        match_count_per_player[pname] += 1

        time.sleep(0.4)
    except Exception as e:
        print(f"  ✗ match {mid}: {e}")

# Stats: how many known players have recent VCT agents
known_names = set(name_to_vlrid.keys()) | set(org_map.keys())
players_with_recent = sum(1 for p in known_names if p in recent_agents)
print(f"  Recent agents found for {players_with_recent} known players\n")


# ── Step 3: Detect role — 4-tier priority ─────────────────────────────────────
# 1. VCT match agents (most accurate, last 5 matches)
# 2. Player endpoint agent_stats (career weighted by usage)
# 3. 30-day stats agents
# 4. All-time career agents

role_map = {}   # name.lower() → role string

all_known = set(vlr_id_map[v]["name"].lower() for v in vlr_id_map) | set(org_map.keys())

for pname in all_known:
    agents = (
        recent_agents.get(pname) or
        player_agents_p.get(pname) or
        agents_30d.get(pname) or
        agents_all.get(pname) or
        []
    )
    role = detect_role(agents)
    if role:
        role_map[pname] = role

t1 = sum(1 for p in role_map if p in recent_agents)
t2 = sum(1 for p in role_map if p not in recent_agents and p in player_agents_p)
t3 = sum(1 for p in role_map if p not in recent_agents and p not in player_agents_p and p in agents_30d)
t4 = len(role_map) - t1 - t2 - t3
print(f"[Step 3] {len(role_map)} roles detected:")
print(f"  VCT matches: {t1} | player endpoint: {t2} | 30d stats: {t3} | all-time: {t4}\n")


# ── Step 4: Liquipedia API — birthdate → age ──────────────────────────────────
from datetime import date as _date

age_map = {}
LIQUIPEDIA_KEY = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()

if not LIQUIPEDIA_KEY:
    print("[Step 4] LIQUIPEDIA_API_KEY not set — age and IGL stay hardcoded in players.js\n")
else:
    print("[Step 4] Fetching player data from Liquipedia (birthdate + IGL role)...")
    today = _date.today()
    liq_headers = {
        "Authorization": f"Apikey {LIQUIPEDIA_KEY}",
        "Accept":        "application/json",
    }
    liq_ok = liq_igl = liq_errors = 0

    all_names = list(set(
        list(org_map.keys()) +
        [vlr_id_map[v]["name"].lower() for v in vlr_id_map]
    ))

    igl_map = {}  # pname → True when Liquipedia confirms IGL role

    for pname in all_names:
        candidates = [pname.title(), pname] if pname.title() != pname else [pname]
        for candidate in candidates:
            try:
                r = httpx.get(
                    "https://api.liquipedia.net/api/v3/player",
                    params={"wiki": "valorant",
                            "conditions": f"[[pagename::{candidate}]]",
                            "fields": "id,birthdate,extradata"},
                    headers=liq_headers,
                    timeout=15,
                    follow_redirects=True,
                )
                r.raise_for_status()
                result = r.json().get("result", [])
                if result:
                    row = result[0]

                    # Birthdate → age
                    bd_raw = row.get("birthdate", "")
                    if bd_raw and bd_raw != "0000-01-01":
                        try:
                            bd  = _date.fromisoformat(bd_raw)
                            age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
                            age_map[pname] = age
                            liq_ok += 1
                        except ValueError:
                            pass

                    # IGL detection via extradata.role
                    extradata = row.get("extradata") or {}
                    if extradata.get("role", "").lower() == "igl":
                        igl_map[pname] = True
                        liq_igl += 1

                    break  # found on Liquipedia — stop trying candidates
            except Exception as e:
                liq_errors += 1
                if liq_errors <= 5:
                    print(f"  ✗ {candidate}: {e}")
            finally:
                time.sleep(1.1)  # sempre dorme após cada request, mesmo após break

    print(f"  ✓ {liq_ok} ages fetched, {liq_igl} IGLs detected "
          f"({liq_errors} errors, {len(all_names)-liq_ok} not found)\n")


# ── Step 5: Build org-map.json ────────────────────────────────────────────────
#
# Entry format:
#   vlrId-keyed  (String(vlrId)) → full data: teamFull, country, countryCode, role, age
#   name-keyed   (name.lower())  → minimal:   role, age  (fallback for players w/o vlrId)
#
# api.js reads vlrId-keyed entries when player has p.vlrId set, else falls back to
# name-keyed. vlrId-keyed entries get team + country applied; name-keyed get only role+age.

player_data = {}

# 1. vlrId-keyed entries (primary, most accurate)
for vid, pinfo in vlr_id_map.items():
    pname = pinfo["name"].lower()
    entry = {}

    tf = player_teamfull.get(pname)
    if tf:
        entry["teamFull"] = tf

    pc = player_country.get(pname)
    if pc:
        entry["country"]     = pc["country"]
        entry["countryCode"] = pc["countryCode"]

    # Liquipedia IGL overrides agent-detected role
    if igl_map.get(pname):
        detected = role_map.get(pname)
        # Compound: "IGL/Duelist", "IGL/Controller", etc.
        entry["role"] = f"IGL/{detected}" if detected else "IGL"
    elif role_map.get(pname):
        entry["role"] = role_map[pname]

    age = age_map.get(pname)
    if age:
        entry["age"] = age

    if entry:
        player_data[str(vid)] = entry

# 2. name-keyed entries (fallback — players without vlrId in players.js)
vlrid_names = {vlr_id_map[v]["name"].lower() for v in vlr_id_map}
for pname in org_map:
    if pname in vlrid_names:
        continue   # already covered by vlrId entry above
    entry = {}
    if pname in age_map:
        entry["age"] = age_map[pname]
    if igl_map.get(pname):
        detected = role_map.get(pname)
        entry["role"] = f"IGL/{detected}" if detected else "IGL"
    elif pname in role_map:
        entry["role"] = role_map[pname]
    if entry:
        player_data[pname] = entry

output_path = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "org-map.json")
)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(player_data, f, ensure_ascii=False, indent=2)

vlrid_entries = sum(1 for k in player_data if k.isdigit())
name_entries  = len(player_data) - vlrid_entries

print(f"[Done] Wrote {len(player_data)} entries to org-map.json")
print(f"  vlrId-keyed: {vlrid_entries} | name-keyed: {name_entries}")
if errors:
    print(f"  Failed regions: {', '.join(errors)}")
