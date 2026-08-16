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

from vlr_common import agent_to_role, country_from_code, country_from_name
from liquipedia import load_players

# ── Config ────────────────────────────────────────────────────────────────────
API_BASE  = os.environ.get("VLRGG_API_URL", "").rstrip("/")
API_TOKEN = os.environ.get("VLRGG_API_TOKEN", "").strip()
LIQ_KEY   = os.environ.get("LIQUIPEDIA_API_KEY", "").strip()
APPLY     = os.environ.get("APPLY", "").strip() == "1"
# Optional comma-separated allowlist, e.g. "VCT Americas". Empty means every
# league — rolling one league at a time keeps a review to a readable size.
APPLY_LEAGUES = {s.strip() for s in os.environ.get("APPLY_LEAGUES", "").split(",") if s.strip()}
# Comment out players no longer on any mapped roster. Off by default.
RETIRE = os.environ.get("RETIRE_DEPARTURES", "").strip() == "1"
# Rewrite team on players the API shows on a different org. Off by default.
APPLY_TRANSFERS = os.environ.get("APPLY_TRANSFERS", "").strip() == "1"

if not API_BASE or not API_TOKEN:
    print("ERROR: VLRGG_API_URL / VLRGG_API_TOKEN not set.")
    sys.exit(1)

API_HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}
TIMEOUT     = 30
RETRIES     = 3
RATE_SLEEP  = 0.35
# Seconds to wait after a Liquipedia 429, multiplied by the attempt number.
# Overridable so the test suite does not actually sleep.
LIQ_BACKOFF = int(os.environ.get("LIQ_BACKOFF", "20"))

HERE          = os.path.dirname(__file__)
TEAM_MAP_PATH = os.path.normpath(os.path.join(HERE, "..", "data", "team-map.json"))
DRIFT_PATH    = os.path.normpath(os.path.join(HERE, "..", "data", "roster-drift.json"))
LIQ_CACHE     = os.path.normpath(os.path.join(HERE, "..", "data", "liquipedia.json"))
PLAYERS_JS    = os.path.normpath(os.path.join(HERE, "..", "..", "public", "js", "players.js"))

LEAGUE_FULL = {
    "Americas": ("VCT Americas", "americas"),
    "EMEA":     ("VCT EMEA",     "emea"),
    "Pacific":  ("VCT Pacific",  "pacific"),
    "China":    ("VCT China",    "china"),
}

TODAY = date.today()


# Words that mark a roster entry as something other than an active player.
# Matched as substrings because vlrgg concatenates without separators
# ("assistant coachInactive", "Kim Ho- (김호용)Sub").
NON_PLAYER_MARKERS = (
    "coach", "manager", "analyst", "staff", "sub", "inactive", "stand-in",
)


def is_non_player(role):
    """True when roster[].role marks staff, a substitute, or an inactive.

    `is_staff` cannot be trusted — a live run surfaced 54 head coaches with the
    flag unset — but neither can "role is non-empty". The scraper leaks the
    player's REAL NAME into this field: Ethan came back as role='Arnold' (Ethan
    Arnold) and Sato as role='Eduardo Kenzo Nagahama'. Treating any non-empty
    role as staff dropped both from their rosters, leaving NRG and LEVIATÁN
    with four.

    So the test is for known vocabulary rather than for emptiness. A leaked
    name matches nothing and stays a player. "loan" is deliberately absent:
    a loaned player is playing for that team (BESTIA's Loss is their fifth).
    """
    r = (role or "").strip().lower()
    if not r:
        return False
    return any(marker in r for marker in NON_PLAYER_MARKERS)


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
def strip_commented_rows(text):
    """Drop commented-out player lines.

    Retired players are commented rather than deleted, and a commented line
    still contains a `{ ... }` block. Without this the regex would read them
    back as active and the retirement would silently undo itself.
    """
    return "\n".join(l for l in text.split("\n") if not l.lstrip().startswith("//"))


def parse_players_js(text):
    players = {}
    for block in re.finditer(r'\{[^{}]+\}', strip_commented_rows(text)):
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
non_players   = []                      # staff, subs, inactives — reported, not added
roster_role_values = defaultdict(int)   # what vlrgg puts in roster[].role

for tid, meta in sorted(team_map.items(), key=lambda kv: int(kv[0])):
    data = api_get("/v2/team", {"id": tid})
    segs = ((data or {}).get("data") or {}).get("segments") or []
    if not segs:
        roster_errors.append(meta.get("name", tid))
        continue

    for member in (segs[0].get("roster") or []):
        pid = str(member.get("id") or "").strip()
        if not pid.isdigit():
            continue

        member_role = (member.get("role") or "").strip()
        roster_role_values[member_role.lower() or "(empty)"] += 1

        if member.get("is_staff") or is_non_player(member_role):
            non_players.append({
                "vlrId": int(pid),
                "name":  (member.get("alias") or "").strip(),
                "team":  meta.get("name", ""),
                "role":  member_role or "is_staff",
            })
            continue

        live[int(pid)] = {
            "alias":      (member.get("alias") or "").strip(),
            "country":    (member.get("country") or "").strip(),
            "is_captain": bool(member.get("is_captain")),
            "team":       meta.get("name", ""),
            "league":     meta.get("league", ""),
        }
    time.sleep(RATE_SLEEP)

teams_ok = len(team_map) - len(roster_errors)
print(f"  {len(live)} players across {teams_ok} rosters"
      f"  ({len(live) / teams_ok:.1f} per team)")
print(f"  {len(non_players)} non-players filtered out (staff, subs, inactives)")
if roster_errors:
    print(f"  ⚠ {len(roster_errors)} roster(s) unavailable: {', '.join(roster_errors[:10])}")

by_role = defaultdict(int)
for p in non_players:
    by_role[p["role"].lower()] += 1
for value, n in sorted(by_role.items(), key=lambda kv: -kv[1])[:12]:
    print(f"      {n:4d}  {value}")


# ── Step 3: Liquipedia enrichment ─────────────────────────────────────────────
liq_players = None   # liquipedia.Players, or None when unavailable


def liq_row(vid, alias):
    """Liquipedia record for a player, by vlr link first then by name."""
    return liq_players.find(vid, alias) if liq_players else None

print("\n[Step 3] Liquipedia enrichment")
try:
    liq_players, liq_refreshed = load_players(
        LIQ_KEY, LIQ_CACHE, force=os.environ.get("LIQUIPEDIA_FORCE") == "1")
except Exception as e:
    print(f"  ✗ {e}")
    liq_players = None


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
    roles = [agent_to_role(a) for a in ((row or {}).get("agents") or [])]
    roles = [r for r in roles if r]
    if not roles:
        return None
    counts = defaultdict(int)
    for r in roles:
        counts[r] += 1
    top = max(counts, key=counts.get)
    return "Flex" if len(counts) == len(roles) and len(roles) > 1 else top


def is_igl(row, captain):
    return captain or (row or {}).get("role") == "igl"


def years_active(row):
    first = (row or {}).get("firstYear")
    return (TODAY.year - first + 1) if first else None


def is_retired(row):
    return str((row or {}).get("status", "")).lower() == "retired"


ORG_NOISE_RE = re.compile(
    r'\b(esports?|gaming|club|team|e-?sports)\b|[^a-z0-9]', re.IGNORECASE)


def normalise_org(name):
    """Reduce an org name to a comparable core: 'Trace Esports' → 'trace'."""
    return ORG_NOISE_RE.sub('', (name or "").lower())


def _letters(name):
    return re.sub(r'[^a-z0-9]', '', (name or "").lower())


def _is_subsequence(short, long_):
    it = iter(long_)
    return all(ch in it for ch in short)


def classify_team_change(old, new):
    """Tell a real transfer apart from the two teams merely being spelled
    differently in players.js and on vlrgg.

    A live run produced 65 "changes", most of which were noise: Fnatic/FNATIC,
    ZETA Division/ZETA DIVISION, Trace/Trace Esports, EDG/EDward Gaming.
    Presenting those next to an actual move would bury the moves.
    """
    a, b = normalise_org(old), normalise_org(new)
    if not a or not b:
        return "transfer"
    if a == b:
        return "spelling"          # same org, different casing or suffix

    # Containment is checked on the full names, not the noise-stripped ones:
    # "DRX" → "KIWOOM DRX" survives either way, but an initialism like
    # "EDG" → "EDward Gaming" takes its final letter from the very word that
    # gets stripped as noise.
    ra, rb = _letters(old), _letters(new)
    if ra in rb or rb in ra:
        return "rename"

    short, long_ = (ra, rb) if len(ra) <= len(rb) else (rb, ra)
    if len(short) <= 4 and short[:1] == long_[:1] and _is_subsequence(short, long_):
        return "rename"            # EDG → EDward Gaming
    return "transfer"


# ── Step 4: diff ──────────────────────────────────────────────────────────────
additions, departures, team_changes, retired_hits = [], [], [], []

for vid, info in sorted(live.items()):
    row      = liq_row(vid, info["alias"])
    league   = info["league"]
    full, lid = LEAGUE_FULL.get(league, (league, league.lower()))

    if vid not in existing:
        if is_retired(row):
            # On a roster but flagged retired — almost always a stale page
            retired_hits.append({"vlrId": vid, "name": info["alias"], "team": info["team"]})
            continue
        pt, cc = country_from_code(info["country"])
        if not pt:
            # vlrgg sometimes has no country on the roster entry (NiSMO).
            # Liquipedia carries it as an English name instead of a code.
            pt, cc = country_from_name((row or {}).get("nationality"))
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
            "kind":  classify_team_change(existing[vid]["team"], info["team"]),
        })

for vid, info in sorted(existing.items()):
    if vid not in live:
        departures.append({"vlrId": vid, "name": info["name"], "team": info["team"]})

kinds = defaultdict(int)
for c in team_changes:
    kinds[c["kind"]] += 1

print(f"\n[Step 4] Drift")
print(f"  additions:    {len(additions)}")
print(f"  departures:   {len(departures)}")
print(f"  team changes: {len(team_changes)}"
      f"  (transfers {kinds['transfer']}, renames {kinds['rename']},"
      f" spelling {kinds['spelling']})")
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

for kind, title in (
    ("transfer", "Real transfers"),
    ("rename",   "Org renamed / expanded (same team)"),
    ("spelling", "Spelling only — players.js and vlrgg disagree on the name"),
):
    group = [c for c in team_changes if c["kind"] == kind]
    if not group:
        continue
    print(f"\n  {title}: {len(group)}")
    for c in group[:40]:
        print(f"    {c['name']:18s} {c['from']} → {c['to']}")
    if len(group) > 40:
        print(f"    ... and {len(group) - 40} more")

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
    "non_players":   non_players,
    "js_lines":      [js_line(a) for a in additions],
}

os.makedirs(os.path.dirname(DRIFT_PATH), exist_ok=True)
with open(DRIFT_PATH, "w", encoding="utf-8") as f:
    json.dump(drift, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(f"\n[Done] wrote {DRIFT_PATH}")


def append_team_section(text, league, team, rows):
    """Add a "// ── <team> ──" section at the end of `league`'s region.

    players.js groups players by league behind banner blocks:

        // ══════════════════════════════════
        // VCT AMERICAS (12 times: ...)
        // ══════════════════════════════════

        // ── FURIA ──────────────────────────
        { ... },

    A team promoted into a league has no section, so one is appended just
    before the next banner (or at end of array for the last region). Returns
    (text, applied).
    """
    banner_re = re.compile(r'^[ \t]*//[ \t]*═{3,}[ \t]*$', re.MULTILINE)
    label     = league.replace("VCT ", "").upper()
    region    = re.search(rf'^[ \t]*//[ \t]*VCT[ \t]+{re.escape(label)}\b.*$',
                          text, re.MULTILINE | re.IGNORECASE)
    if not region:
        return text, False

    # The banner immediately below the title closes this region's own header —
    # only whitespace separates the two, so skip it. The next banner after that
    # opens the following region, and that is where this region ends.
    nxt = None
    for m in banner_re.finditer(text, region.end()):
        if not text[region.end():m.start()].strip():
            continue
        nxt = m
        break

    if nxt:
        cut = text.rfind("\n", 0, nxt.start()) + 1
    else:
        # Last region — insert before the array's closing bracket
        close = re.search(r'^\s*\];', text[region.end():], re.MULTILINE)
        if not close:
            return text, False
        cut = region.end() + close.start()

    dashes  = "─" * max(3, 58 - len(team))
    section = (f"  // ── {team} {dashes}\n"
               + "\n".join(js_line(a) for a in sorted(rows, key=lambda x: x["name"]))
               + "\n\n")
    return text[:cut] + section + text[cut:], True


# ── Step 6: optional insertion into players.js ────────────────────────────────
# Only additions, only into a team block that already exists. A brand-new org
# needs a new section (and a decision about where it belongs), so those are
# reported rather than guessed at.
if not APPLY:
    print("\nAPPLY not set — players.js untouched.")
    sys.exit(0)

# Writing rows with blank age/role/yearsActive would put empty tiles in the
# game, and a Liquipedia 429 is silent from the caller's point of view: the run
# still "succeeds", it just enriches nothing. Refuse to write in that case
# rather than quietly degrading the data.
if not liq_players:
    print("\nERROR: no Liquipedia data (rate limit, outage, or missing"
          " snapshot), so age/role/yearsActive would all be blank.\n"
          "       Refusing to modify players.js. The drift report above is"
          " still valid — retry once .github/data/liquipedia.json is available.")
    sys.exit(1)

blank = [a["name"] for a in additions if not (a["age"] and a["role"])]
if blank:
    print(f"\n  note: {len(blank)} addition(s) still lack age or role and will"
          f" be written with those fields omitted: {', '.join(blank[:12])}"
          + (" ..." if len(blank) > 12 else ""))

applying = additions
if APPLY_LEAGUES:
    applying = [a for a in additions if a["league"] in APPLY_LEAGUES]
    print(f"\nAPPLY_LEAGUES={', '.join(sorted(APPLY_LEAGUES))}"
          f" — applying {len(applying)} of {len(additions)} addition(s)")

if not applying:
    print("\nNothing to apply.")
    sys.exit(0)

text     = players_js_text
inserted = 0
no_block = []

by_team = defaultdict(list)
for a in applying:
    by_team[a["team"]].append(a)

for team, group in sorted(by_team.items()):
    # Team sections are marked "  // ── <team> ────..."
    header = re.search(
        rf'^[ \t]*//[ \t]*[─\-]+[ \t]*{re.escape(team)}\b.*$',
        text, re.MULTILINE)
    if not header:
        # A team new to the league has no section yet. Append one at the end of
        # its league region, which is delimited by the "// ══" banner blocks.
        text, ok = append_team_section(text, group[0]["league"], team, group)
        if ok:
            inserted += len(group)
            print(f"  + new section: {team} ({len(group)} players)")
        else:
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

# ── Step 6b: apply real transfers ─────────────────────────────────────────────
# Without this, a player who moved leaves both rosters wrong: the old team
# keeps six and the new one shows four. Only `transfer` is applied — `rename`
# and `spelling` merely disagree about how an org is written, and rewriting
# those would churn team names that logos and league grouping depend on.
moved = 0
if APPLY_TRANSFERS:
    scope = [c for c in team_changes if c["kind"] == "transfer"]
    if APPLY_LEAGUES:
        scope = [c for c in scope
                 if (existing.get(c["vlrId"], {}).get("league") or "") in APPLY_LEAGUES]

    for c in scope:
        pattern = re.compile(rf'^(\s*\{{[^{{}}]*\bvlrId:{c["vlrId"]}\b[^{{}}]*\}},?)$',
                             re.MULTILINE)
        m = pattern.search(text)
        if not m:
            continue
        row = m.group(1)
        new_row = re.sub(r'(\bteam\s*:\s*")[^"]*(")',
                         lambda mm: mm.group(1) + c["to"] + mm.group(2), row, count=1)
        if new_row != row:
            text = text[:m.start(1)] + new_row + text[m.end(1):]
            moved += 1
            print(f"  ↔ {c['name']}: {c['from']} → {c['to']}")

    if moved:
        print(f"\n[Apply] moved {moved} player(s) to their current team")


# ── Step 7: optionally retire departed players ────────────────────────────────
# Commented out rather than deleted: the row carries curated history (titles,
# yearsActive, manual role) that the API cannot reproduce, and a wrong call is
# undone by deleting two slashes. A commented line is invisible to PLAYERS_DB
# while staying in the file.
retired = 0
if RETIRE and departures:
    dep_ids = {d["vlrId"] for d in departures}
    if APPLY_LEAGUES:
        dep_ids = {d["vlrId"] for d in departures
                   if (existing.get(d["vlrId"], {}).get("league") or "") in APPLY_LEAGUES}

    out = []
    for line in text.split("\n"):
        m = re.match(r'^(\s*)\{.*\bvlrId:(\d+)\b', line)
        if m and int(m.group(2)) in dep_ids:
            indent = m.group(1)
            out.append(f"{indent}// saiu do elenco em {TODAY.isoformat()} —"
                       f" nao esta em nenhum roster mapeado da vlr.gg")
            out.append(f"{indent}// {line.strip()}")
            retired += 1
        else:
            out.append(line)
    text = "\n".join(out)

if inserted or retired or moved:
    with open(PLAYERS_JS, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
if inserted:
    print(f"\n[Apply] inserted {inserted} player(s) into players.js")
if retired:
    print(f"[Apply] commented out {retired} departed player(s)")
if no_block:
    print(f"[Apply] {len(no_block)} team(s) have no section in players.js —"
          f" add by hand: {', '.join(sorted(no_block))}")
