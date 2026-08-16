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

# Shared lookup tables — see vlr_common.py
from vlr_common import agent_to_role, country_from_code
from liquipedia import load_players

# ── Secrets ───────────────────────────────────────────────────────────────────
API_BASE = os.environ.get("VLRGG_API_URL", "").rstrip("/")
API_TOKEN = os.environ.get("VLRGG_API_TOKEN", "").strip()

if not API_BASE:
    print("ERROR: VLRGG_API_URL environment variable is not set.")
    sys.exit(1)
if not API_TOKEN:
    print("ERROR: VLRGG_API_TOKEN environment variable is not set.")
    sys.exit(1)

API_HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}

TIMEOUT       = 30

# ── Team-name sanitising ──────────────────────────────────────────────────────
# vlrgg's `current_team.name` is scraped, and the tenure line sometimes leaks in
# glued to the org name, in two shapes:
#
#   "FURIAjoined in June 2025"                    → still on the team
#   "Evil GeniusesNovember 2025 – July 2026"      → LEFT in July 2026
#   "Team HereticsApril 2022 – November 2022"     → LEFT in November 2022
#
# A closed date range means the player is listed as a FORMER member. Stripping
# the suffix and keeping the org would assert they are still there, which is
# exactly backwards — so those are dropped and reported as departures instead.
_MONTH = (
    r'(?:January|February|March|April|May|June|July|August|September|October'
    r'|November|December)'
)

# "November 2025 – July 2026" — tenure that has ENDED (player left)
TENURE_CLOSED_RE = re.compile(
    rf'{_MONTH}\s+\d{{4}}\s*[–—-]\s*{_MONTH}\s+\d{{4}}\s*$', re.IGNORECASE
)
# "joined in June 2025" / "November 2025 – present" — tenure still OPEN
TENURE_OPEN_RE = re.compile(
    rf'\s*(?:joined\s+in\s+.+|{_MONTH}\s+\d{{4}}\s*[–—-]\s*present)\s*$',
    re.IGNORECASE,
)

# National teams appear as `current_team` during Red Bull Home Ground / Nations
# style events and would otherwise overwrite the player's real org.
NATIONAL_TEAM_NAMES = {
    "argentina", "australia", "brazil", "brasil", "canada", "chile", "china",
    "colombia", "croatia", "denmark", "dominican republic", "egypt", "finland",
    "france", "germany", "hong kong", "india", "indonesia", "italy", "japan",
    "kazakhstan", "korea", "malaysia", "mexico", "mongolia", "morocco",
    "netherlands", "new zealand", "norway", "peru", "philippines", "poland",
    "portugal", "romania", "russia", "saudi arabia", "serbia", "singapore",
    "south korea", "spain", "sweden", "taiwan", "thailand", "turkey",
    "türkiye", "ukraine", "united states", "uruguay", "vietnam",
}


def is_national_team(team_name):
    """True when `team_name` looks like a national side rather than an org."""
    normalised = team_name.strip().lower()
    # "Team Türkiye", "Team Brazil" → strip the prefix before comparing
    stripped = re.sub(r'^team\s+', '', normalised)
    return normalised in NATIONAL_TEAM_NAMES or stripped in NATIONAL_TEAM_NAMES


def clean_team_name(raw_name):
    """Normalise a scraped `current_team.name`.

    Returns (team_name, reason) where team_name is None when the value must not
    be applied. reason is one of: None (clean), "left ...", "national",
    "unknown ...".
    """
    name = (raw_name or "").strip()
    if not name:
        return None, None

    name = TENURE_OPEN_RE.sub('', name).strip()

    if TENURE_CLOSED_RE.search(name):
        former = TENURE_CLOSED_RE.sub('', name).strip()
        return None, f"left {former}" if former else "left"

    if is_national_team(name):
        return None, "national"

    if not name:
        return None, None

    # vlrgg's `current_team` is simply the last roster the player appeared on,
    # which during off-season is often a pickup or scrim side rather than an
    # org — e.g. nerve showed up as "BOSS BABY", Xeppaa as "Kalebs kitten".
    # Applying those would put a joke name on the team tile, so anything absent
    # from the players.js allowlist is refused and reported instead.
    #
    # When known_orgs is empty the players.js parse failed upstream; in that
    # case the check is skipped rather than rejecting every team on earth.
    if known_orgs and name.lower() not in known_orgs:
        return None, f"unknown {name}"

    return name, None


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


# ── Step 0: Parse players.js for vlrId mapping ────────────────────────────────
LIQ_CACHE = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "data", "liquipedia.json")
)

PLAYERS_JS_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "public", "js", "players.js")
)

# vlrId (int) → { "id": str, "name": str }
vlr_id_map = {}
# name.lower() → vlrId (int)  — for quick lookup
name_to_vlrid = {}
# Every org named in players.js, lowercased. Used as an allowlist when applying
# `current_team` from the API — see clean_team_name(). vlrgg reports whatever
# roster a player last appeared on, including pickup/scrim sides ("BOSS BABY",
# "Certified Turtles"), which must never overwrite the real org.
known_orgs = set()

print("[Step 0] Parsing players.js for vlrId mapping...")

try:
    with open(PLAYERS_JS_PATH, "r", encoding="utf-8") as f:
        js_content = f.read()

    # sync_roster.py retires players by commenting their line out instead of
    # deleting it, so those rows must be skipped here too — otherwise a retired
    # player would be fetched again and reappear in org-map.json.
    active_js = "\n".join(
        l for l in js_content.split("\n") if not l.lstrip().startswith("//"))

    # Match each { ... } player block
    for block in re.finditer(r'\{[^{}]+\}', active_js):
        text = block.group()

        # Collect the org allowlist from every row, with or without vlrId
        team_m = re.search(r'\bteam\s*:\s*"([^"]+)"', text)
        if team_m:
            known_orgs.add(team_m.group(1).strip().lower())

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

    print(f"  Found {len(vlr_id_map)} players with vlrId in players.js")
    print(f"  Org allowlist: {len(known_orgs)} teams\n")
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
        r = httpx.get(
            url,
            headers=API_HEADERS,
            timeout=TIMEOUT,
            follow_redirects=True,
        )
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
        r = httpx.get(
            url,
            headers=API_HEADERS,
            timeout=TIMEOUT,
            follow_redirects=True,
        )
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

departures    = []   # [(player, former_team)]  — vlrgg shows tenure as ended
national_hits = []   # [(player, national_side)] — ignored, not a real org
unknown_orgs  = []   # [(player, team)] — not in the players.js allowlist

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
    # Modern Masters format: "Masters Bangkok 2025", "Masters Santiago 2026"
    m = re.search(r'Masters (\w+) (\d+)', event_name)
    if m:
        return f'Masters {m.group(1)} {m.group(2)}'
    # Legacy Masters format: "Valorant Champions Tour Stage N: Masters <City>"
    # (2021–2022 era — no year in event name, extract from date param)
    m = re.search(r'Stage \d+: Masters (\w+)', event_name, re.IGNORECASE)
    if m:
        city = m.group(1)
        yr   = str(year)[:4] if year else ''
        return f'Masters {city} {yr}' if yr else f'Masters {city}'
    # Regional: preserve Kickoff / Stage N suffix when present
    # e.g. "VCT 2026: Americas Kickoff"  → "VCT Americas Kickoff 2026"
    #      "VCT 2026: Americas Stage 1"  → "VCT Americas Stage 1 2026"
    #      "VCT 2023: Americas"          → "VCT Americas 2023"
    m = re.search(r'(?:VCT|Champions Tour) (\d+): (Americas|EMEA|Pacific|China)(.*)', event_name)
    if m:
        year_str = m.group(1)
        region   = m.group(2)
        stage    = m.group(3).strip()   # "Kickoff", "Stage 1", "Stage 2", or ""
        if stage:
            return f'VCT {region} {stage} {year_str}'
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
            headers=API_HEADERS,
            timeout=TIMEOUT,
            follow_redirects=True,
        )
        r.raise_for_status()
        # API returns { "data": { "segments": [ <player_obj> ] } }
        seg = (r.json().get("data", {}).get("segments") or [{}])[0]

        # ── Team full name ─────────────────────────────────────────────────────
        raw_team = (seg.get("current_team") or {}).get("name", "")
        team_name, skip_reason = clean_team_name(raw_team)
        if team_name:
            player_teamfull[pname] = team_name
        elif skip_reason == "national":
            # Keep whatever players.js already has — a national side is not an org
            national_hits.append((pinfo["name"], raw_team.strip()))
        elif skip_reason and skip_reason.startswith("left"):
            # vlrgg lists them as a former member — the org in players.js is stale
            departures.append((pinfo["name"], skip_reason[5:] or "?"))
        elif skip_reason and skip_reason.startswith("unknown"):
            # Pickup side, or a real org missing from players.js — needs a human
            unknown_orgs.append((pinfo["name"], skip_reason[8:]))

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
print(f"  teamFull: {len(player_teamfull)}, country: {len(player_country)}, agents: {len(player_agents_p)}")

# Roster drift — these need a manual edit in public/js/players.js, since this
# script only enriches the existing roster and never adds or removes players.
if departures:
    print(f"\n  ⚠ {len(departures)} player(s) listed as FORMER members on vlrgg —"
          f" players.js still has them on a team:")
    for pname, former in sorted(departures):
        print(f"      {pname:20s} left {former}")
if national_hits:
    print(f"\n  ℹ {len(national_hits)} player(s) currently on a national side"
          f" (org kept from players.js):")
    for pname, side in sorted(national_hits):
        print(f"      {pname:20s} → {side}")
if unknown_orgs:
    print(f"\n  ⚠ {len(unknown_orgs)} player(s) whose current team is not in the"
          f" players.js allowlist — pickup side, or a real org that needs adding:")
    for pname, team in sorted(unknown_orgs):
        print(f"      {pname:20s} → {team}")
print()


# ── Step 2: Detect role — 3-tier priority ─────────────────────────────────────
# 1. 30-day stats agents  (primary — large sample, still recent)
# 2. Player endpoint agent_stats (career weighted by usage — fallback for inactive)
# 3. All-time career agents (last resort)
#
# The previous approach of fetching last-5-VCT-match details was dropped:
# - 5 matches is too small a sample (outlier games skew results)
# - Per-map agent picks across 5 maps/match inflated counts unfairly
# - Name collisions between regions caused cross-contamination
# - 30d stats already covers ~30-50 map picks per player with proper aggregation

role_map = {}   # name.lower() → role string

# Priority: career stats (player endpoint) → 30d → all-time career
#
# Career stats (player_agents_p) are weighted across the player's full history
# and are far more resistant to short-term noise from unofficial tournaments
# or composition experiments during off-season.
#
# 30d stats are kept as fallback for newer players with limited career data,
# but are NOT the primary source — they capture all matches (official + unofficial)
# and can misclassify players who are testing compositions in non-VCT events.

all_known = set(vlr_id_map[v]["name"].lower() for v in vlr_id_map) | set(org_map.keys())

for pname in all_known:
    agents = (
        player_agents_p.get(pname) or
        agents_30d.get(pname) or
        agents_all.get(pname) or
        []
    )
    role = detect_role(agents)
    if role:
        role_map[pname] = role

t1 = sum(1 for p in role_map if p in player_agents_p)
t2 = sum(1 for p in role_map if p not in player_agents_p and p in agents_30d)
t3 = len(role_map) - t1 - t2
print(f"[Step 2] {len(role_map)} roles detected:")
print(f"  career stats: {t1} | 30d stats: {t2} | all-time: {t3}\n")


# ── Step 3: Liquipedia — birthdate → age, extradata.role → IGL ───────────────
#
# Reads the shared snapshot in .github/data/liquipedia.json rather than calling
# the API. The free tier allows 60 requests per hour and a full sweep costs 6,
# so this script and sync_roster.py used to spend 12 a week between them and a
# live run did get a 429. liquipedia.py refreshes the snapshot at most weekly
# and both scripts read it — see that module for the details.
#
# Matching: links.vlr → vlrId first, then id/pagename by name.

from datetime import date as _date

age_map = {}
igl_map = {}  # pname → True when Liquipedia confirms IGL role
LIQUIPEDIA_KEY = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()

# vlrId → Liquipedia pagename, for players whose in-game name differs from
# their page title.
LIQUIPEDIA_PAGE_OVERRIDES = {
    4712: "HeiB",   # heybay
    4885: "Whz",    # whzy / whz
}

print("[Step 3] Liquipedia enrichment (birthdate + IGL)")
try:
    liq_players, _ = load_players(
        LIQUIPEDIA_KEY, LIQ_CACHE,
        force=os.environ.get("LIQUIPEDIA_FORCE") == "1")
except Exception as e:
    print(f"  ✗ {e} — age and IGL stay as players.js has them\n")
    liq_players = None

if liq_players:
    today = _date.today()
    liq_ok = liq_igl = liq_no_match = 0

    all_known_players = list(set(
        list(org_map.keys()) +
        [vlr_id_map[v]["name"].lower() for v in vlr_id_map]
    ))

    for pname in all_known_players:
        vid = name_to_vlrid.get(pname)
        row = liq_players.find(vid, pname)

        # Manual pagename override for the few name mismatches
        if row is None and vid in LIQUIPEDIA_PAGE_OVERRIDES:
            row = liq_players.by_name(LIQUIPEDIA_PAGE_OVERRIDES[vid])

        if row is None:
            liq_no_match += 1
            continue

        bd_raw = row.get("birthdate") or ""
        if bd_raw and bd_raw != "0000-01-01":
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

        if row.get("role") == "igl":
            igl_map[pname] = True
            liq_igl += 1

    print(f"  ✓ {liq_ok} ages resolved, {liq_igl} IGLs detected "
          f"({liq_no_match} players not matched on Liquipedia)\n")


# ── Step 4: Build org-map.json ────────────────────────────────────────────────
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
    os.path.join(os.path.dirname(__file__), "..", "..", "public", "data", "org-map.json")
)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(player_data, f, ensure_ascii=False, indent=2)

vlrid_entries = sum(1 for k in player_data if k in {str(v) for v in vlr_id_map})
name_entries  = len(player_data) - vlrid_entries

print(f"[Done] Wrote {len(player_data)} entries to org-map.json")
print(f"  vlrId-keyed: {vlrid_entries} | name-keyed: {name_entries}")
if errors:
    print(f"  Failed regions: {', '.join(errors)}")
