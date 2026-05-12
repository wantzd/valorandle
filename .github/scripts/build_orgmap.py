"""
build_orgmap.py
Fetches player stats from the vlrggapi for all VCT regions,
builds a name→team map, and writes it to org-map.json.

Run by GitHub Actions weekly (see .github/workflows/update-players.yml).
Requires: pip install httpx
"""

import httpx
import json
import os
import sys

API_BASE = os.environ.get("VLRGG_API_URL", "").rstrip("/")

if not API_BASE:
    print("ERROR: VLRGG_API_URL environment variable is not set.")
    sys.exit(1)

REGIONS   = ["na", "eu", "ap", "la-s", "la-n", "br", "kr", "cn"]
TIMESPAN  = "all"
TIMEOUT   = 30  # seconds per request

org_map = {}
errors  = []

print(f"Fetching player data from: {API_BASE}\n")

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
            if player and org:
                org_map[player.lower()] = org
                count += 1
        print(f"  ✓ {region:6s}  {count} players")
    except Exception as e:
        print(f"  ✗ {region:6s}  {e}")
        errors.append(region)

output_path = os.path.join(os.path.dirname(__file__), "..", "..", "org-map.json")
output_path = os.path.normpath(output_path)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(org_map, f, ensure_ascii=False, indent=2)

print(f"\nWrote {len(org_map)} entries to org-map.json")

if errors:
    print(f"Failed regions: {', '.join(errors)}")
    # Don't fail the workflow — partial data is still useful
