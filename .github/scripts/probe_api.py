"""
probe_api.py — one-off reconnaissance of the vlrgg API surface.

Purpose: work out whether the API can supply full team ROSTERS, which is what
build_orgmap.py would need in order to add/remove players automatically instead
of only enriching the hand-maintained list in public/js/players.js.

Safety: this repo is public, so Actions logs are public too. This script prints
STRUCTURE ONLY — field names, types, container sizes — plus a couple of team and
player names, which are public information on vlr.gg anyway. It never prints the
API base URL, the token, or full response bodies.

Run via:  Actions → "Probe API shape" → Run workflow
Delete this file and .github/workflows/probe-api.yml once the shape is known.
"""

import httpx
import json
import os
import sys

API_BASE  = os.environ.get("VLRGG_API_URL", "").rstrip("/")
API_TOKEN = os.environ.get("VLRGG_API_TOKEN", "").strip()

if not API_BASE or not API_TOKEN:
    print("ERROR: VLRGG_API_URL / VLRGG_API_TOKEN not set.")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}
TIMEOUT = 30


def describe(value, depth=0, max_depth=4):
    """Render the SHAPE of a JSON value — keys and types, never bulk content."""
    pad = "  " * depth
    if depth >= max_depth:
        return f"{pad}..."
    if isinstance(value, dict):
        lines = []
        for k, v in list(value.items())[:25]:
            if isinstance(v, (dict, list)):
                lines.append(f"{pad}{k}: {type(v).__name__}")
                lines.append(describe(v, depth + 1, max_depth))
            else:
                # scalar: show the type, and the value only if it is short and
                # clearly public (team/player/agent names, counts)
                sample = ""
                if isinstance(v, str) and len(v) <= 40:
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


def probe(label, path, params=None):
    print("\n" + "=" * 70)
    print(f"PROBE: {label}   (path: {path})")
    print("=" * 70)
    try:
        r = httpx.get(
            f"{API_BASE}{path}",
            params=params or {},
            headers=HEADERS,
            timeout=TIMEOUT,
            follow_redirects=True,
        )
        print(f"HTTP {r.status_code}")
        if r.status_code != 200:
            body = r.text[:200]
            print(f"body (truncated): {body}")
            return
        data = r.json()
        print(describe(data))
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")


# ── 1. Endpoints the build script already relies on ───────────────────────────
# Confirms whether /v2/stats segments carry a player id or vlr.gg link. Without
# one, new players found via stats cannot be given a vlrId automatically.
probe("stats (region=na, all-time)", "/v2/stats", {"region": "na", "timespan": "all"})

# Known-good player: nerve (vlrId 754). Shows what current_team looks like and
# whether the payload includes any roster/teammate information.
probe("player by id", "/v2/player", {"id": 754})

# ── 2. Candidate roster endpoints — the ones that would make sync possible ────
# These are guesses; whichever returns HTTP 200 tells us the roster path exists.
probe("teams list",        "/v2/teams")
probe("teams by region",   "/v2/teams", {"region": "na"})
probe("team by id",        "/v2/team", {"id": 2593})       # 2593 = Sentinels on vlr.gg
probe("team roster",       "/v2/team/roster", {"id": 2593})
probe("events list",       "/v2/events")
probe("rankings",          "/v2/rankings", {"region": "na"})

print("\n" + "=" * 70)
print("DONE — paste this log back to continue the roster-sync work.")
print("=" * 70)
