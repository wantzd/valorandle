"""
build_orgmap.py
Fetches player data for Valorandle and writes org-map.json.

Sources:
  0. players.js — vlrId mapping (parsed locally)
  1. vlrgg /v2/stats — fallback agents (all-time top 3) + org membership
  2. vlrgg /v2/player?id=X — per-player: teamFull, country, agent_stats (primary)
  3. vlrgg /v2/match?q=results + /v2/match/details — agent picks from last 5 VCT
     matches per player (most accurate role source)
  4. Liquipedia API — bulk fetch (1–3 requests) → birthdate + IGL role
        Matches players via links.vlr → vlrId. Free tier: 60 req/hr.

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
    "ch": ("Suíça",            "CH"),
    "cz": ("República Tcheca", "CZ"),
    "lt": ("Lituânia",        "LT"),
    "md": ("Moldávia",         "MD"),
    "eg": ("Egito",            "EG"),
    "sa": ("Arábia Saudita",   "SA"),
    "kh": ("Camboja",          "KH"),
    "bm": ("Bermudas",         "BM"),
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
REGIONS = ["na", "eu", "ap", "br", "kr", "cn", "jp", "gc"]

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
player_titles    = {}   # name.lower() → [title, ...] from event_placements

vlrid_role_source  = {}   # vlrId (int) → agent list (for role detection)

# ── Title detection helpers ────────────────────────────────────────────────────
def _is_official_vct_event(event_name):
    name = event_name.lower()
    patterns = [
        r'valorant champions \d+',
        r'valorant masters \w+ \d+',
        r'valorant champions tour stage \d+: masters',
        r'(vct|champions tour) \d+: (americas|emea|pacific|china)',
    ]
    return any(re.search(p, name) for p in patterns)

def _format_vct_title(event_name, year):
    """Convert vlrgg event name to a short display title.

    Titles are normalised to match the TITLE_TIERS keys in game-logic.js:
      Champions <year>              — world championship
      Masters <city> <year>         — international masters
      VCT <region> <year>           — any regional event (Kickoff/Stage N all
                                       map to the same year-level key so that
                                       compareTitles() strict-equality works)
    """
    # World championship
    m = re.search(r'Valorant Champions (\d+)', event_name)
    if m:
        return f'Champions {m.group(1)}'
    # International Masters
    m = re.search(r'Masters (\w+) (\d+)', event_name)
    if m:
        return f'Masters {m.group(1)} {m.group(2)}'
    # Regional: always year-level (Kickoff / Stage 1 / Stage 2 / Split N all
    # collapse to the same "VCT <Region> <year>" key used in TITLE_TIERS)
    m = re.search(r'(?:VCT|Champions Tour) (\d+): (Americas|EMEA|Pacific|China)', event_name)
    if m:
        year_str = m.group(1)
        region   = m.group(2)
        return f'VCT {region} {year_str}'
    return event_name

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
        # API returns { "data": { "segments": [ <player_obj> ] } }
        seg = (r.json().get("data", {}).get("segments") or [{}])[0]

        # ── Team full name ─────────────────────────────────────────────────────
        team_name = (seg.get("current_team") or {}).get("name", "").strip()
        # Strip "joined in ..." suffix that sometimes leaks in from vlrgg scraping
        team_name = re.sub(r'\s*joined\s+in\s+.+$', '', team_name, flags=re.IGNORECASE).strip()
        if team_name:
            player_teamfull[pname] = team_name

        # ── Country ────────────────────────────────────────────────────────────
        raw_country = (seg.get("country") or "").strip()
        country_pt, country_code = country_from_code(raw_country)
        if country_pt:
            player_country[pname] = {
                "country":     country_pt,
                "countryCode": country_code,
            }
        elif raw_country:
            print(f"  ⚠ unknown country code '{raw_country}' for {pinfo['name']} (vlrId {vid})")

        # ── Agent stats (for role detection fallback) ──────────────────────────
        agents_raw = seg.get("agent_stats") or []
        if agents_raw:
            # usage_count comes as a string ("9") — cast to int for sorting
            def usage_key(a):
                try:
                    return int(a.get("usage_count") or 0)
                except (ValueError, TypeError):
                    return 0
            agents_sorted = sorted(agents_raw, key=usage_key, reverse=True)
            agent_names = [
                (a.get("agent") or "").strip()
                for a in agents_sorted
                if a.get("agent")
            ]
            if agent_names:
                player_agents_p[pname] = agent_names
                vlrid_role_source[vid] = agent_names

        # ── Titles from event_placements ───────────────────────────────────────
        placements = seg.get("event_placements") or []
        titles = []
        for placement in placements:
            if placement.get("placement") == "1st" and _is_official_vct_event(placement.get("event", "")):
                title = _format_vct_title(placement["event"], placement.get("date", ""))
                if title not in titles:
                    titles.append(title)
        if titles:
            player_titles[pname] = titles

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


# ── Step 4: Liquipedia API — birthdate → age (bulk fetch) ────────────────────
#
# Free tier: 60 req/hour (~1 req/min).  Per-player loops are impossible at this
# rate with 200+ players.  Instead we fetch ALL Valorant players in 1–3 paginated
# requests (limit=1000 each) and match locally by vlrId extracted from links.vlr.
#
# Endpoint:  GET https://api.liquipedia.net/api/v3/player
# Fields:    pagename, birthdate, extradata, links
# Matching:  links.vlr == "https://www.vlr.gg/player/<vlrId>"  (primary)
#            pagename.lower() == pname                          (fallback)

from datetime import date as _date

age_map = {}
igl_map = {}  # pname → True when Liquipedia confirms IGL role
LIQUIPEDIA_KEY = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()

if not LIQUIPEDIA_KEY:
    print("[Step 4] LIQUIPEDIA_API_KEY not set — age and IGL stay hardcoded in players.js\n")
else:
    print("[Step 4] Bulk-fetching Valorant players from Liquipedia (birthdate + IGL)...")
    today = _date.today()
    liq_headers = {
        "Authorization": f"Apikey {LIQUIPEDIA_KEY}",
        "Accept":        "application/json",
    }

    # ── 4a. Paginated bulk fetch ───────────────────────────────────────────────
    LIQ_FIELDS    = "pagename,birthdate,extradata,links"
    LIQ_PAGE_SIZE = 1000
    LIQ_BASE_URL  = "https://api.liquipedia.net/api/v3/player"

    all_liq_rows = []   # raw Liquipedia player records
    offset        = 0
    page_num      = 0
    liq_fetch_err = 0

    while True:
        page_num += 1
        if page_num > 1:
            time.sleep(3)   # only needed between paginated requests (≤3 total)
        try:
            r = httpx.get(
                LIQ_BASE_URL,
                params={
                    "wiki":   "valorant",
                    "fields": LIQ_FIELDS,
                    "limit":  LIQ_PAGE_SIZE,
                    "offset": offset,
                },
                headers=liq_headers,
                timeout=30,
                follow_redirects=True,
            )
            r.raise_for_status()
            result = r.json().get("result", [])
            all_liq_rows.extend(result)
            print(f"  Page {page_num}: {len(result)} records (total so far: {len(all_liq_rows)})")
            if len(result) < LIQ_PAGE_SIZE:
                break   # last page
            offset += LIQ_PAGE_SIZE
        except Exception as e:
            liq_fetch_err += 1
            print(f"  ✗ Liquipedia page {page_num}: {e}")
            break

    print(f"  Fetched {len(all_liq_rows)} Liquipedia player records in {page_num} request(s)\n")

    # ── 4b. Build lookup dicts ─────────────────────────────────────────────────
    # vlrId (int) → Liquipedia row
    liq_by_vlrid  = {}
    # pagename.lower() → Liquipedia row  (fallback when vlr link absent)
    liq_by_name   = {}

    VLR_PLAYER_RE = re.compile(r'vlr\.gg/player/(\d+)', re.IGNORECASE)

    for row in all_liq_rows:
        pagename = (row.get("pagename") or "").strip()
        if pagename:
            liq_by_name[pagename.lower()] = row

        links = row.get("links") or {}
        vlr_url = links.get("vlr") or links.get("vlrgg") or ""
        m = VLR_PLAYER_RE.search(vlr_url)
        if m:
            liq_by_vlrid[int(m.group(1))] = row

    print(f"  Indexed: {len(liq_by_vlrid)} by vlrId, {len(liq_by_name)} by name")

    # ── 4c. Match against our players ─────────────────────────────────────────
    # vlrId → Liquipedia pagename override for players whose in-game name
    # differs from their Liquipedia page title.
    LIQUIPEDIA_PAGE_OVERRIDES = {
        4712: "HeiB",   # heybay
        4885: "Whz",    # whzy / whz
    }

    liq_ok = liq_igl = liq_no_match = 0

    all_known_players = list(set(
        list(org_map.keys()) +
        [vlr_id_map[v]["name"].lower() for v in vlr_id_map]
    ))

    for pname in all_known_players:
        vid = name_to_vlrid.get(pname)

        # Primary: match by vlrId (direct link in Liquipedia)
        row = liq_by_vlrid.get(vid) if vid else None

        # Secondary: manual pagename override for name-mismatch players
        if row is None and vid and vid in LIQUIPEDIA_PAGE_OVERRIDES:
            override_page = LIQUIPEDIA_PAGE_OVERRIDES[vid].lower()
            row = liq_by_name.get(override_page)

        # Fallback: match by pagename — try several case variants
        if row is None:
            row = (
                liq_by_name.get(pname) or                   # already lowercased
                liq_by_name.get(pname.title().lower()) or   # "babybay" → "babybay"
                liq_by_name.get(pname.upper().lower())       # safety
            )

        if row is None:
            liq_no_match += 1
            continue

        # Birthdate → age
        bd_raw = row.get("birthdate", "")
        if bd_raw and bd_raw not in ("0000-01-01", ""):
            try:
                bd  = _date.fromisoformat(bd_raw[:10])
                age = today.year - bd.year - (
                    (today.month, today.day) < (bd.month, bd.day)
                )
                if 14 <= age <= 50:   # sanity-check range
                    age_map[pname] = age
                    liq_ok += 1
            except ValueError:
                pass

        # IGL detection via extradata.role
        extradata = row.get("extradata") or {}
        if str(extradata.get("role", "")).lower() == "igl":
            igl_map[pname] = True
            liq_igl += 1

    print(f"  ✓ {liq_ok} ages resolved, {liq_igl} IGLs detected "
          f"({liq_no_match} players not matched on Liquipedia)\n")


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

    titles = player_titles.get(pname)
    if titles:
        entry["titles"] = titles

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
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "org-map.json")
)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(player_data, f, ensure_ascii=False, indent=2)

vlrid_entries = sum(1 for k in player_data if k in {str(v) for v in vlr_id_map})
name_entries  = len(player_data) - vlrid_entries

print(f"[Done] Wrote {len(player_data)} entries to org-map.json")
print(f"  vlrId-keyed: {vlrid_entries} | name-keyed: {name_entries}")
if errors:
    print(f"  Failed regions: {', '.join(errors)}")
