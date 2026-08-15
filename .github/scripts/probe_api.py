"""
probe_api.py — final reconnaissance before writing the team-id discovery.

Answered so far:
  /v2/match?q=results          200 — team1/team2 NAMES + tournament_name (league)
                                     + match_page containing the match id
  /v2/match/details?match_id=  200 — teams[] with id + name   ← the team id source
  /v2/team?id=                 200 — roster[] with id/alias/country/is_captain/is_staff
  /v2/rankings                 200 — team names, no ids
  /v2/event, /v2/event/teams   404
  /v2/teams, /v2/team/roster   404

So the chain is: results → match id → details → team ids. This last probe pins
down the two remaining unknowns before the real script is written:
  a) how results pagination is parameterised
  b) which tournament_name values appear, so leagues can be pattern-matched

Safety: public repo, public logs. Structure and short public values only.
"""

import httpx
import os
import re
import sys
from collections import Counter

API_BASE  = os.environ.get("VLRGG_API_URL", "").rstrip("/")
API_TOKEN = os.environ.get("VLRGG_API_TOKEN", "").strip()

if not API_BASE or not API_TOKEN:
    print("ERROR: VLRGG_API_URL / VLRGG_API_TOKEN not set.")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}
TIMEOUT = 30


def get(path, params):
    return httpx.get(f"{API_BASE}{path}", params=params, headers=HEADERS,
                     timeout=TIMEOUT, follow_redirects=True)


def segments(params):
    try:
        r = get("/v2/match", params)
        if r.status_code != 200:
            return None, f"HTTP {r.status_code}: {r.text[:120]}"
        data = r.json().get("data") or {}
        return data.get("segments") or [], data.get("meta")
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def fingerprint(segs):
    """Identify a page by its first match, to tell pages apart."""
    if not segs:
        return "(empty)"
    s = segs[0]
    return f"{s.get('team1')} vs {s.get('team2')} @ {s.get('tournament_name')}"


# ── a) Pagination ─────────────────────────────────────────────────────────────
print("=" * 70)
print("PAGINATION — which parameter actually advances the page?")
print("=" * 70)

base, meta = segments({"q": "results"})
print(f"baseline (no page param): {len(base or [])} matches")
print(f"  meta: {meta}")
print(f"  first: {fingerprint(base)}")

for param in ("page", "page_number", "page_range", "num_pages", "limit"):
    segs, m = segments({"q": "results", param: 2})
    if segs is None:
        print(f"\n  {param}=2 -> {m}")
        continue
    same = fingerprint(segs) == fingerprint(base)
    print(f"\n  {param}=2 -> {len(segs)} matches | first identical to page 1? {same}")
    print(f"      meta: {m}")
    print(f"      first: {fingerprint(segs)}")

# ── b) League coverage ────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("LEAGUE COVERAGE — tournament_name values in recent results")
print("=" * 70)

# Pull whatever the widest working call gives us and tally the tournaments.
wide, m = segments({"q": "results", "page_range": "1-5"})
if not wide:
    wide, m = segments({"q": "results"})
print(f"sampled {len(wide or [])} matches | meta: {m}\n")

tourneys = Counter(s.get("tournament_name", "?") for s in (wide or []))
for name, n in tourneys.most_common(40):
    print(f"  {n:4d}  {name}")

# How many distinct team names show up per VCT league — tells us how many
# match-detail calls the discovery will need before a league is fully mapped.
print("\n" + "=" * 70)
print("DISTINCT TEAM NAMES PER VCT LEAGUE (in this sample)")
print("=" * 70)

VCT_RE = re.compile(r'VCT\s+\d{4}:\s*(Americas|EMEA|Pacific|China)', re.IGNORECASE)
by_league = {}
for s in (wide or []):
    m2 = VCT_RE.search(s.get("tournament_name") or "")
    if not m2:
        continue
    league = m2.group(1)
    by_league.setdefault(league, set()).update(
        t for t in (s.get("team1"), s.get("team2")) if t
    )

for league, teams in sorted(by_league.items()):
    print(f"\n  {league}: {len(teams)} teams")
    for t in sorted(teams):
        print(f"      {t}")

if not by_league:
    print("\n  (no VCT league matches in this sample — may need more pages)")

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)
