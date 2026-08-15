"""
probe_api.py — reconnaissance for the team-id problem.

Established so far:
  /v2/team?id=      200 — roster[] has id/alias/country/is_captain/is_staff
  /v2/stats         200 — no player id
  /v2/rankings      200 — team names, NO team id
  current_team      —     no team id
  /v2/teams         404
  /v2/team/roster   404

So rosters are readable but there is no known way to enumerate team ids. A
match has two teams, so match results/details are the most likely place for an
id to appear. This probe CHAINS: it pulls a real match id out of the results
list and immediately fetches its details, so one run answers the question.

Safety: this repo is public, so Actions logs are public. Structure only —
field names, types, and short public values (team/player names). Never the API
base URL, the token, or full response bodies.
"""

import httpx
import json
import os
import re
import sys

API_BASE  = os.environ.get("VLRGG_API_URL", "").rstrip("/")
API_TOKEN = os.environ.get("VLRGG_API_TOKEN", "").strip()

if not API_BASE or not API_TOKEN:
    print("ERROR: VLRGG_API_URL / VLRGG_API_TOKEN not set.")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}
TIMEOUT = 30


def describe(value, depth=0, max_depth=5):
    pad = "  " * depth
    if depth >= max_depth:
        return f"{pad}..."
    if isinstance(value, dict):
        lines = []
        for k, v in list(value.items())[:30]:
            if isinstance(v, (dict, list)):
                lines.append(f"{pad}{k}: {type(v).__name__}")
                lines.append(describe(v, depth + 1, max_depth))
            else:
                sample = ""
                if isinstance(v, str) and len(v) <= 60:
                    sample = f" = {v!r}"
                elif isinstance(v, (int, float, bool)) or v is None:
                    sample = f" = {v!r}"
                lines.append(f"{pad}{k}: {type(v).__name__}{sample}")
        return "\n".join(lines)
    if isinstance(value, list):
        if not value:
            return f"{pad}(empty list)"
        return f"{pad}[{len(value)} items] first item:\n" + describe(value[0], depth + 1, max_depth)
    return f"{pad}{type(value).__name__}"


def get(path, params=None):
    r = httpx.get(
        f"{API_BASE}{path}",
        params=params or {},
        headers=HEADERS,
        timeout=TIMEOUT,
        follow_redirects=True,
    )
    return r


def probe(label, path, params=None, max_depth=5):
    print("\n" + "=" * 70)
    print(f"PROBE: {label}   (path: {path})")
    print("=" * 70)
    try:
        r = get(path, params)
        print(f"HTTP {r.status_code}")
        if r.status_code != 200:
            print(f"body (truncated): {r.text[:150]}")
            return None
        data = r.json()
        print(describe(data, max_depth=max_depth))
        return data
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        return None


# ── 1. Match results — does a match carry team ids? ───────────────────────────
results = probe("match results", "/v2/match", {"q": "results"})

# ── 2. Chain into match details using a real id from step 1 ───────────────────
# Any id-looking field on the first segment, or an id embedded in a url path.
match_id = None
if results:
    segs = (results.get("data") or {}).get("segments") or []
    if segs:
        first = segs[0]
        for key in ("id", "match_id", "match_page", "url_path", "url"):
            val = first.get(key)
            if isinstance(val, str):
                m = re.search(r'(\d{4,})', val)
                if m:
                    match_id = m.group(1)
                    print(f"\n>>> match id extracted from '{key}': {match_id}")
                    break
            elif isinstance(val, int):
                match_id = str(val)
                print(f"\n>>> match id from '{key}': {match_id}")
                break

if match_id:
    # The endpoint rejected `id` with 422 and named the parameter it wants:
    #   {"loc": ["query", "match_id"], "msg": "Field required"}
    probe("match details", "/v2/match/details", {"match_id": match_id}, max_depth=7)
else:
    print("\n>>> no match id found in results — cannot chain into details")

# ── 3. Event detail — events may list participating teams with ids ────────────
events = probe("events (na)", "/v2/events", {"region": "na"}, max_depth=4)

event_id = None
if events:
    segs = (events.get("data") or {}).get("segments") or []
    for seg in segs:
        val = seg.get("url_path") or seg.get("id") or ""
        m = re.search(r'(\d{3,})', str(val))
        if m:
            event_id = m.group(1)
            print(f"\n>>> event id extracted: {event_id}  (title: {seg.get('title')!r})")
            break

if event_id:
    probe("event detail", "/v2/event", {"id": event_id}, max_depth=6)
    probe("event teams",  "/v2/event/teams", {"id": event_id}, max_depth=6)

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)
