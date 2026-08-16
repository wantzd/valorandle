"""
sync_roster.py
Compares the hand-maintained roster in public/js/players.js against the live
VCT rosters and reports the drift.

Why
---
build_orgmap.py only ever *enriches* players that already exist in players.js —
it can neither add a newcomer nor retire someone who left. players.js was last
edited by hand on 2026-06-01, so every roster move since then is invisible to
the game. This closes that gap.

How
---
  .github/data/team-map.json   → team ids per league (see build_team_map.py)
  /v2/team?id=                 → roster[]: id, alias, country, is_captain, is_staff
  Liquipedia /api/v3/player    → birthdate, status, extradata.agent1..3, earningsbyyear

Field sourcing for a newcomer:
  vlrId, name, country   vlrgg roster
  team, league           team-map.json
  age                    Liquipedia birthdate
  role                   Liquipedia agent1..3 → AGENT_ROLE (human-curated, so
                         far steadier than vlrgg's 30-day pick statistics)
  isIGL                  roster.is_captain, or Liquipedia extradata.role == igl
  yearsActive            span of Liquipedia earningsbyyear
  titles                 left as ["Nenhum"] on purpose — build_orgmap.py fills
                         real titles into org-map.json from event_placements on
                         its next run, and api.js applies them over players.js

Output:
  .github/data/roster-drift.json   machine-readable drift
  stdout                           human-readable report
  players.js                       only when APPLY=1, and only insertions into
                                   an existing team block

Departures are never applied automatically: dropping a player also drops
curated history, and "not on a mapped roster this week" is not proof of
retirement. They are reported for a human to action.

Env:
  VLRGG_API_URL, VLRGG_API_TOKEN   required
  LIQUIPEDIA_API_KEY               optional; without it age/role/yearsActive
                                   are left blank for newcomers
  APPLY                            "1" to write insertions into players.js
"""

import httpx
import json
import os
import re
import sys
import time
from collections import defaultdict
from datetime import date

from vlr_common import agent_to_role, country_from_code

# ── Config ────────────────────────────────────────────────────────────────────
API_BASE  = os.environ.get("VLRGG_API_URL", "").rstrip("/")
API_TOKEN = os.environ.get("VLRGG_API_TOKEN", "").strip()
LIQ_KEY   = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()
APPLY     = os.environ.get("APPLY", "").strip() == "1"

if not API_BASE or not API_TOKEN:
    print("ERROR: VLRGG_API_URL / VLRGG_API_TOKEN not set.")
    sys.exit(1)

API_HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}
TIMEOUT     = 30
RETRIES     = 3
RATE_SLEEP  = 0.35

HERE          = os.path.dirname(__file__)
TEAM_MAP_PATH = os.path.normpath(os.path.join(HERE, "..", "data", "team-map.json"))
DRIFT_PATH    = os.path.normpath(os.path.join(HERE, "..", "data", "roster-drift.json"))
PLAYERS_JS    = os.path.normpath(os.path.join(HERE, "..", "..", "public", "js", "players.js"))

LEAGUE_FULL = {
    "Americas": ("VCT Americas", "americas"),
    "EMEA":     ("VCT EMEA",     "emea"),
    "Pacific":  ("VCT Pacific",  "pacific"),
    "China":    ("VCT China",    "china"),
}

TODAY = date.today()


def api_get(path, params):
    last = None
    for attempt in range(1, RETRIES + 1):
        try:
            r = httpx.get(f"{API_BASE}{path}", params=params, headers=API_HEADERS,
                          timeout=TIMEOUT, follow_redirects=True)
            if r.status_code == 200:
                return r.json()
            last = f"HTTP {r.status_code}"
        except Exception as e:
            last = f"{type(e).__name__}: {e}"
        if attempt < RETRIES:
            time.sleep(2 * attempt)
    print(f"  ✗ {path} failed after {RETRIES} attempts — {last}")
    return None


# ── Step 0: team map ──────────────────────────────────────────────────────────
if not os.path.exists(TEAM_MAP_PATH):
    print(f"ERROR: {TEAM_MAP_PATH} missing — run build_team_map.py first.")
    sys.exit(1)

with open(TEAM_MAP_PATH, encoding="utf-8") as f:
    team_map = (json.load(f) or {}).get("teams", {})

print(f"[Step 0] {len(team_map)} teams in team-map.json")


# ── Step 1: current players.js ────────────────────────────────────────────────
# Parsed with the same block regex build_orgmap.py uses, so both agree on what
# counts as a player row.
def parse_players_js(text):
    players = {}
    for block in re.finditer(r'\{[^{}]+\}', text):
        chunk = block.group()
        vid_m = re.search(r'vlrId\s*:\s*(\d+)', chunk)
        if not vid_m:
            continue
        def field(name):
            m = re.search(rf'\b{name}\s*:\s*"([^"]*)"', chunk)
            return m.group(1) if m else None
        players[int(vid_m.group(1))] = {
            "name":   field("name"),
            "team":   field("team"),
            "league": field("league"),
        }
    return players


with open(PLAYERS_JS, encoding="utf-8") as f:
    players_js_text = f.read()

existing = parse_players_js(players_js_text)
print(f"[Step 1] {len(existing)} players in players.js")


# ── Step 2: live rosters ──────────────────────────────────────────────────────
print(f"\n[Step 2] Fetching {len(team_map)} rosters...")

live = {}          # vlrId (int) → {alias, country, is_captain, team, league}
roster_errors = []

for tid, meta in sorted(team_map.items(), key=lambda kv: int(kv[0])):
    data = api_get("/v2/team", {"id": tid})
    segs = ((data or {}).get("data") or {}).get("segments") or []
    if not segs:
        roster_errors.append(meta.get("name", tid))
        continue

    for member in (segs[0].get("roster") or []):
        # Coaches and analysts share the roster array with players
        if member.get("is_staff"):
            continue
        pid = str(member.get("id") or "").strip()
        if not pid.isdigit():
            continue
        live[int(pid)] = {
            "alias":      (member.get("alias") or "").strip(),
            "country":    (member.get("country") or "").strip(),
            "is_captain": bool(member.get("is_captain")),
            "team":       meta.get("name", ""),
            "league":     meta.get("league", ""),
        }
    time.sleep(RATE_SLEEP)

print(f"  {len(live)} players across {len(team_map) - len(roster_errors)} rosters")
if roster_errors:
    print(f"  ⚠ {len(roster_errors)} roster(s) unavailable: {', '.join(roster_errors[:10])}")


# ── Step 3: Liquipedia enrichment ─────────────────────────────────────────────
liq = {}   # vlrId (int) → liquipedia row

if not LIQ_KEY:
    print("\n[Step 3] LIQUIPEDIA_API_KEY not set — newcomers will have blank"
          " age/role/yearsActive")
else:
    print("\n[Step 3] Bulk-fetching Liquipedia players...")
    liq_headers = {"Authorization": f"Apikey {LIQ_KEY}", "Accept": "application/json"}
    VLR_RE = re.compile(r'vlr\.gg/player/(\d+)', re.IGNORECASE)

    offset, page = 0, 0
    while True:
        page += 1
        if page > 1:
            time.sleep(3)   # free tier is 60 req/hour; only 1-3 pages are needed
        try:
            r = httpx.get(
                "https://api.liquipedia.net/api/v3/player",
                params={
                    "wiki": "valorant",
                    "fields": "pagename,id,birthdate,status,nationality,"
                              "extradata,links,earningsbyyear",
                    "limit": 1000,
                    "offset": offset,
                },
                headers=liq_headers, timeout=TIMEOUT, follow_redirects=True,
            )
            r.raise_for_status()
            rows = r.json().get("result", [])
        except Exception as e:
            print(f"  ✗ Liquipedia page {page}: {e}")
            break

        for row in rows:
            m = VLR_RE.search((row.get("links") or {}).get("vlr") or "")
            if m:
                liq[int(m.group(1))] = row

        print(f"  page {page}: {len(rows)} rows (indexed by vlrId: {len(liq)})")
        if len(rows) < 1000:
            break
        offset += 1000


def age_from(row):
    bd = (row or {}).get("birthdate") or ""
    if not bd or bd.startswith("0000"):
        return None
    try:
        d = date.fromisoformat(bd[:10])
    except ValueError:
        return None
    age = TODAY.year - d.year - ((TODAY.month, TODAY.day) < (d.month, d.day))
    return age if 14 <= age <= 50 else None


def role_from(row):
    """Signature agents are curated on Liquipedia, so they beat pick stats."""
    extra  = (row or {}).get("extradata") or {}
    agents = [extra.get(f"agent{i}") for i in (1, 2, 3)]
    roles  = [agent_to_role(a) for a in agents if a]
    roles  = [r for r in roles if r]
    if not roles:
        return None
    counts = defaultdict(int)
    for r in roles:
        counts[r] += 1
    top = max(counts, key=counts.get)
    return "Flex" if len(counts) == len(roles) and len(roles) > 1 else top


def is_igl(row, captain):
    extra = (row or {}).get("extradata") or {}
    return captain or str(extra.get("role", "")).lower() == "igl"


def years_active(row):
    years = [int(y) for y in ((row or {}).get("earningsbyyear") or {}) if str(y).isdigit()]
    return (TODAY.year - min(years) + 1) if years else None


def is_retired(row):
    return str((row or {}).get("status", "")).lower() == "retired"


# ── Step 4: diff ──────────────────────────────────────────────────────────────
additions, departures, team_changes, retired_hits = [], [], [], []

for vid, info in sorted(live.items()):
    row      = liq.get(vid)
    league   = info["league"]
    full, lid = LEAGUE_FULL.get(league, (league, league.lower()))

    if vid not in existing:
        if is_retired(row):
            # On a roster but flagged retired — almost always a stale page
            retired_hits.append({"vlrId": vid, "name": info["alias"], "team": info["team"]})
            continue
        pt, cc = country_from_code(info["country"])
        additions.append({
            "vlrId":       vid,
            "name":        info["alias"],
            "country":     pt,
            "countryCode": cc,
            "team":        info["team"],
            "league":      full,
            "leagueId":    lid,
            "age":         age_from(row),
            "role":        role_from(row),
            "isIGL":       is_igl(row, info["is_captain"]),
            "yearsActive": years_active(row),
        })
    elif existing[vid]["team"] and existing[vid]["team"] != info["team"]:
        team_changes.append({
            "vlrId": vid,
            "name":  info["alias"],
            "from":  existing[vid]["team"],
            "to":    info["team"],
        })

for vid, info in sorted(existing.items()):
    if vid not in live:
        departures.append({"vlrId": vid, "name": info["name"], "team": info["team"]})

print(f"\n[Step 4] Drift")
print(f"  additions:    {len(additions)}")
print(f"  departures:   {len(departures)}")
print(f"  team changes: {len(team_changes)}")
if retired_hits:
    print(f"  skipped (Liquipedia says retired): {len(retired_hits)}")


def js_line(a):
    """Render one players.js row, matching the existing hand-written style."""
    parts = [
        f'id:"{a["name"]}"',
        f'vlrId:{a["vlrId"]}',
        f'name:"{a["name"]}"',
        f'displayName:"{a["name"]}"',
        f'country:"{a["country"] or ""}"',
        f'countryCode:"{a["countryCode"] or ""}"',
        f'team:"{a["team"]}"',
        f'league:"{a["league"]}"',
        f'leagueId:"{a["leagueId"]}"',
    ]
    if a["age"]:
        parts.append(f'age:{a["age"]}')
    if a["role"]:
        parts.append(f'role:"{a["role"]}"')
    if a["isIGL"]:
        parts.append("isIGL:true")
    if a["yearsActive"]:
        parts.append(f'yearsActive:{a["yearsActive"]}')
    parts.append('titles:["Nenhum"]')
    return "  { " + ", ".join(parts) + " },"


# ── Step 5: report ────────────────────────────────────────────────────────────
if additions:
    print("\n  New players (grouped by team):")
    by_team = defaultdict(list)
    for a in additions:
        by_team[a["team"]].append(a)
    for team in sorted(by_team):
        print(f"\n    ── {team}")
        for a in sorted(by_team[team], key=lambda x: x["name"]):
            gaps = [k for k in ("age", "role", "yearsActive") if not a[k]]
            flag = f"   ⚠ missing: {', '.join(gaps)}" if gaps else ""
            print(f"       {a['name']:18s} {a['country'] or '?':16s}"
                  f" {a['role'] or '?':12s}{flag}")

if team_changes:
    print("\n  Team changes:")
    for c in team_changes:
        print(f"    {c['name']:18s} {c['from']} → {c['to']}")

if departures:
    print("\n  Not on any mapped roster (review by hand — never auto-removed):")
    for d in departures:
        print(f"    {d['name']:18s} was {d['team']}")

drift = {
    "generated":     TODAY.isoformat(),
    "additions":     additions,
    "team_changes":  team_changes,
    "departures":    departures,
    "skipped_retired": retired_hits,
    "js_lines":      [js_line(a) for a in additions],
}

os.makedirs(os.path.dirname(DRIFT_PATH), exist_ok=True)
with open(DRIFT_PATH, "w", encoding="utf-8") as f:
    json.dump(drift, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(f"\n[Done] wrote {DRIFT_PATH}")


# ── Step 6: optional insertion into players.js ────────────────────────────────
# Only additions, only into a team block that already exists. A brand-new org
# needs a new section (and a decision about where it belongs), so those are
# reported rather than guessed at.
if not APPLY:
    print("\nAPPLY not set — players.js untouched.")
    sys.exit(0)

if not additions:
    print("\nNothing to apply.")
    sys.exit(0)

text     = players_js_text
inserted = 0
no_block = []

by_team = defaultdict(list)
for a in additions:
    by_team[a["team"]].append(a)

for team, group in by_team.items():
    # Team sections are marked "  // ── <team> ────..."
    header = re.search(
        rf'^[ \t]*//[ \t]*[─\-]+[ \t]*{re.escape(team)}\b.*$',
        text, re.MULTILINE)
    if not header:
        no_block.append(team)
        continue

    # Insert after the last consecutive player row under that header
    pos  = header.end()
    last = pos
    for m in re.finditer(r'^\s*\{[^{}]+\},?\s*$', text[pos:], re.MULTILINE):
        if text[pos:pos + m.start()].strip():
            break      # a non-row line ended the block
        last = pos + m.end()

    lines = "\n" + "\n".join(js_line(a) for a in sorted(group, key=lambda x: x["name"]))
    text  = text[:last] + lines + text[last:]
    inserted += len(group)

if inserted:
    with open(PLAYERS_JS, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print(f"\n[Apply] inserted {inserted} player(s) into players.js")
if no_block:
    print(f"[Apply] {len(no_block)} team(s) have no section in players.js —"
          f" add by hand: {', '.join(sorted(no_block))}")
