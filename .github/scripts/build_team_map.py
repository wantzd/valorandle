"""
build_team_map.py
Discovers vlr.gg team ids for every VCT league team and maintains
.github/data/team-map.json.

Why this exists
---------------
Reading a team's roster needs a team id (`/v2/team?id=`), but the API offers no
way to list team ids:

    /v2/teams, /v2/team/roster   404
    /v2/rankings                 team names, no ids
    /v2/event, /v2/event/teams   404
    player.current_team          no id

A match, however, names both of its teams *with* ids. So ids are recovered
transitively:

    /v2/match?q=results&num_pages=N   → team NAMES + tournament_name + match id
    /v2/match/details?match_id=X      → teams[].id  ← the id

The map is committed, so this converges: the first run resolves the whole
league, and later runs only spend requests on teams they have never seen —
normally none, until a roster changes or a new org is promoted.

Output (.github/data/team-map.json):
    {
      "generated": "2026-08-15",
      "teams": {
        "7386": { "name": "MIBR", "league": "Americas", "last_seen": "2026-08-15" }
      }
    }

Env:
    VLRGG_API_URL, VLRGG_API_TOKEN   required
    MATCH_PAGES                      results pages to scan (50 matches each, default 6)
    MAX_DETAIL_FETCHES               cap on detail requests per run (default 40)

Requires: pip install httpx
"""

import httpx
import json
import os
import re
import sys
import time
from collections import defaultdict
from datetime import date

# ── Config ────────────────────────────────────────────────────────────────────
API_BASE  = os.environ.get("VLRGG_API_URL", "").rstrip("/")
API_TOKEN = os.environ.get("VLRGG_API_TOKEN", "").strip()

if not API_BASE:
    print("ERROR: VLRGG_API_URL environment variable is not set.")
    sys.exit(1)
if not API_TOKEN:
    print("ERROR: VLRGG_API_TOKEN environment variable is not set.")
    sys.exit(1)

API_HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}
TIMEOUT     = 30
RETRIES     = 3          # the API intermittently ConnectTimeouts
RATE_SLEEP  = 0.35

MATCH_PAGES        = int(os.environ.get("MATCH_PAGES", "6"))
MAX_DETAIL_FETCHES = int(os.environ.get("MAX_DETAIL_FETCHES", "40"))

MAP_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "data", "team-map.json")
)

# Regional VCT events only. International events (Champions, Masters) mix
# leagues, so they cannot be used to attribute a team to one — and Game Changers
# is a separate circuit entirely.
VCT_LEAGUE_RE = re.compile(
    r'VCT\s+\d{4}:\s*(Americas|EMEA|Pacific|China)\b', re.IGNORECASE
)
LEAGUE_CANON = {
    "americas": "Americas",
    "emea":     "EMEA",
    "pacific":  "Pacific",
    "china":    "China",
}

TODAY = date.today().isoformat()


def api_get(path, params):
    """GET with retries. Returns parsed JSON, or None when it never succeeds."""
    last = None
    for attempt in range(1, RETRIES + 1):
        try:
            r = httpx.get(
                f"{API_BASE}{path}",
                params=params,
                headers=API_HEADERS,
                timeout=TIMEOUT,
                follow_redirects=True,
            )
            if r.status_code == 200:
                return r.json()
            last = f"HTTP {r.status_code}"
        except Exception as e:
            last = f"{type(e).__name__}: {e}"
        if attempt < RETRIES:
            time.sleep(2 * attempt)
    print(f"  ✗ {path} failed after {RETRIES} attempts — {last}")
    return None


# ── Load existing map ─────────────────────────────────────────────────────────
teams = {}   # team_id (str) → {"name", "league", "last_seen"}

if os.path.exists(MAP_PATH):
    try:
        with open(MAP_PATH, "r", encoding="utf-8") as f:
            teams = (json.load(f) or {}).get("teams", {})
        print(f"[Load] {len(teams)} teams already mapped")
    except Exception as e:
        print(f"[Load] ⚠ could not read team-map.json ({e}) — starting empty")
else:
    print("[Load] no team-map.json yet — first run, mapping from scratch")

# name.lower() → team_id, to tell which names still need resolving
name_to_id = {v["name"].strip().lower(): tid for tid, v in teams.items() if v.get("name")}


# ── Step 1: scan recent results for VCT league matches ────────────────────────
print(f"\n[Step 1] Fetching {MATCH_PAGES} page(s) of results ({MATCH_PAGES * 50} matches)...")

payload = api_get("/v2/match", {"q": "results", "num_pages": MATCH_PAGES})
segments = ((payload or {}).get("data") or {}).get("segments") or []
meta     = ((payload or {}).get("data") or {}).get("meta") or {}
print(f"  got {len(segments)} matches (meta: {meta.get('page_range')})")

if not segments:
    print("\nNo matches returned — nothing to do. Leaving team-map.json untouched.")
    sys.exit(0)

MATCH_ID_RE = re.compile(r'/(\d{4,})/')

# match_id → (league, [team names])   for matches that involve an unmapped team
pending      = {}
league_names = defaultdict(set)   # league → {team name}

for seg in segments:
    tournament = seg.get("tournament_name") or ""
    m = VCT_LEAGUE_RE.search(tournament)
    if not m:
        continue
    league = LEAGUE_CANON[m.group(1).lower()]

    names = [n.strip() for n in (seg.get("team1"), seg.get("team2")) if n and n.strip()]
    if not names:
        continue
    league_names[league].update(names)

    # Only matches that can teach us something are worth a detail request
    if all(n.lower() in name_to_id for n in names):
        continue

    page = seg.get("match_page") or ""
    mid  = MATCH_ID_RE.search(page)
    if mid:
        pending[mid.group(1)] = (league, names)

total_seen = sum(len(v) for v in league_names.values())
print(f"\n  VCT league teams seen in sample: {total_seen}")
for league in sorted(league_names):
    known = sum(1 for n in league_names[league] if n.lower() in name_to_id)
    print(f"    {league:9s} {len(league_names[league]):3d} teams  ({known} already mapped)")

print(f"\n  {len(pending)} match(es) involve an unmapped team")


# ── Step 2: resolve ids via match details ─────────────────────────────────────
if not pending:
    print("\n[Step 2] Nothing to resolve — every team in the sample is mapped.")
else:
    budget = min(len(pending), MAX_DETAIL_FETCHES)
    print(f"\n[Step 2] Fetching details for {budget} match(es) "
          f"(cap MAX_DETAIL_FETCHES={MAX_DETAIL_FETCHES})...\n")

    resolved = 0
    for i, (mid, (league, names)) in enumerate(list(pending.items())[:budget], 1):
        # Skip if an earlier detail in this same run already covered both teams
        if all(n.lower() in name_to_id for n in names):
            continue

        data = api_get("/v2/match/details", {"match_id": mid})
        segs = ((data or {}).get("data") or {}).get("segments") or []
        if not segs:
            continue

        for t in (segs[0].get("teams") or []):
            tid  = str(t.get("id") or "").strip()
            name = (t.get("name") or "").strip()
            if not tid or not name:
                continue

            prev = teams.get(tid)
            if prev and prev.get("name") != name:
                # Same org, new branding — keep the id, follow the rename
                print(f"  ↻ {tid}: '{prev['name']}' → '{name}'")
                name_to_id.pop(prev["name"].strip().lower(), None)
            elif not prev:
                print(f"  + {tid}: {name} ({league})")
                resolved += 1

            teams[tid] = {
                "name":      name,
                "league":    league,
                "last_seen": TODAY,
            }
            name_to_id[name.lower()] = tid

        time.sleep(RATE_SLEEP)

    print(f"\n  ✓ {resolved} new team(s) mapped")

    still_missing = sorted({
        n for names in league_names.values() for n in names
        if n.lower() not in name_to_id
    })
    if still_missing:
        print(f"\n  ⚠ {len(still_missing)} team(s) still unmapped — raise MATCH_PAGES"
              f" or MAX_DETAIL_FETCHES, or wait for them to play again:")
        for n in still_missing:
            print(f"      {n}")


# ── Step 3: write ─────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(MAP_PATH), exist_ok=True)

output = {
    "_comment": (
        "Generated by .github/scripts/build_team_map.py. vlr.gg team ids, "
        "recovered from match details because the API cannot list them directly. "
        "Consumed by the roster sync to read each team's roster."
    ),
    "generated": TODAY,
    "teams": dict(sorted(teams.items(), key=lambda kv: int(kv[0]))),
}

with open(MAP_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
    f.write("\n")

by_league = defaultdict(int)
for v in teams.values():
    by_league[v.get("league", "?")] += 1

print(f"\n[Done] {len(teams)} teams in team-map.json")
for league in sorted(by_league):
    print(f"  {league:9s} {by_league[league]}")
