"""
liquipedia.py — cached access to the Liquipedia player dataset.

The free tier allows 60 requests per hour, and a full sweep costs 6 (1000 rows
per page). Two workflows needed that data and each fetched its own copy, so a
single week already spent 12 requests, and any rerun or manual dispatch spent 6
more. A live run did hit HTTP 429 and silently enriched nothing.

So the sweep is done once and the trimmed result is committed to
.github/data/liquipedia.json. Callers read the file; the network is only
touched when the snapshot is older than MAX_AGE_DAYS. Steady state is 6
requests per week, shared by every script.

The snapshot keeps only the fields the scripts actually use — adding a new one
means bumping SCHEMA and forcing a refresh.

Usage:
    from liquipedia import load_players
    players, refreshed = load_players(api_key, cache_path)
    row = players.by_vlr_id(8480) or players.by_name("aspas")
"""

import json
import os
import re
import time
from datetime import date, datetime

API_URL       = "https://api.liquipedia.net/api/v3/player"
PAGE_SIZE     = 1000
MAX_PAGES     = 12          # ~5.6k players today; the guard is against runaway loops
MAX_AGE_DAYS  = 6           # refresh weekly, just before the Monday jobs
SCHEMA        = 1           # bump when the trimmed shape changes
FIELDS        = "pagename,id,birthdate,status,nationality,extradata,links,earningsbyyear"

VLR_RE = re.compile(r'vlr\.gg/player/(\d+)', re.IGNORECASE)


def _trim(row):
    """Keep only what build_orgmap and sync_roster read."""
    extra = row.get("extradata") or {}
    years = [int(y) for y in (row.get("earningsbyyear") or {}) if str(y).isdigit()]
    m     = VLR_RE.search((row.get("links") or {}).get("vlr") or "")
    return {
        "vlrId":       int(m.group(1)) if m else None,
        "id":          (row.get("id") or "").strip(),
        "pagename":    (row.get("pagename") or "").strip(),
        "birthdate":   row.get("birthdate") or "",
        "status":      row.get("status") or "",
        "nationality": row.get("nationality") or "",
        "role":        str(extra.get("role") or "").lower(),
        "agents":      [extra.get(f"agent{i}") for i in (1, 2, 3) if extra.get(f"agent{i}")],
        "firstYear":   min(years) if years else None,
    }


class Players:
    """Lookup over the trimmed snapshot."""

    def __init__(self, rows):
        self.rows     = rows
        self._by_vlr  = {}
        self._by_name = {}
        for r in rows:
            if r.get("vlrId"):
                self._by_vlr[r["vlrId"]] = r
            # Pages that do not link to vlr.gg (Frz, Tacolilla) are reachable
            # only by name, so index both id and pagename.
            for key in (r.get("id"), r.get("pagename")):
                key = (key or "").strip().lower()
                if key and key not in self._by_name:
                    self._by_name[key] = r

    def __len__(self):
        return len(self.rows)

    def by_vlr_id(self, vid):
        return self._by_vlr.get(vid)

    def by_name(self, name):
        return self._by_name.get((name or "").strip().lower())

    def find(self, vid=None, name=None):
        """vlr link first, then name."""
        return (self.by_vlr_id(vid) if vid else None) or (self.by_name(name) if name else None)


def _read_cache(path):
    if not os.path.exists(path):
        return None, "missing"
    try:
        with open(path, encoding="utf-8") as f:
            blob = json.load(f)
    except Exception as e:
        return None, f"unreadable ({e})"

    if blob.get("schema") != SCHEMA:
        return None, f"schema {blob.get('schema')} != {SCHEMA}"

    try:
        fetched = datetime.strptime(blob["fetched"], "%Y-%m-%d").date()
    except Exception:
        return None, "no usable timestamp"

    age = (date.today() - fetched).days
    if age > MAX_AGE_DAYS:
        return None, f"{age} days old"
    return blob.get("players") or [], f"{age} days old"


def _fetch(api_key, http, backoff):
    headers = {"Authorization": f"Apikey {api_key}", "Accept": "application/json"}
    rows, offset = [], 0

    for page in range(1, MAX_PAGES + 1):
        if page > 1:
            time.sleep(2)
        batch = None
        for attempt in range(1, 4):
            try:
                r = http.get(API_URL, params={
                    "wiki": "valorant", "fields": FIELDS,
                    "limit": PAGE_SIZE, "offset": offset,
                }, headers=headers, timeout=30, follow_redirects=True)
                if r.status_code == 429:
                    wait = backoff * attempt
                    print(f"  … Liquipedia rate-limited (429), waiting {wait}s")
                    time.sleep(wait)
                    continue
                r.raise_for_status()
                batch = r.json().get("result", [])
                break
            except Exception as e:
                print(f"  ✗ Liquipedia page {page} attempt {attempt}: {e}")
                time.sleep(backoff * attempt)
        if batch is None:
            raise RuntimeError(f"Liquipedia page {page} failed after 3 attempts")

        rows.extend(_trim(x) for x in batch)
        print(f"  page {page}: {len(batch)} rows (total {len(rows)})")
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return rows


def load_players(api_key, cache_path, http=None, force=False, backoff=None):
    """Return (Players, refreshed).

    Reads the committed snapshot when it is fresh. Refreshes only when stale,
    missing, or `force`. Raises when a refresh is needed but fails, so a caller
    never silently proceeds with no enrichment.
    """
    if backoff is None:
        backoff = int(os.environ.get("LIQ_BACKOFF", "20"))

    if not force:
        cached, why = _read_cache(cache_path)
        if cached is not None:
            print(f"[Liquipedia] using cached snapshot ({len(cached)} players, {why})")
            return Players(cached), False
        print(f"[Liquipedia] snapshot unusable: {why} — refreshing")
    else:
        print("[Liquipedia] forced refresh")

    if not api_key:
        raise RuntimeError("LIQUIPEDIA_API_KEY not set and no usable snapshot")
    if http is None:
        import httpx as http

    rows = _fetch(api_key, http, backoff)

    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump({
            "_comment": (
                "Trimmed Liquipedia snapshot, refreshed by the data workflows. "
                "Committed so the 60 req/hour free tier is spent once a week "
                "instead of once per script run. Regenerate by deleting this "
                "file or setting LIQUIPEDIA_FORCE=1."
            ),
            "schema":  SCHEMA,
            "fetched": date.today().isoformat(),
            "players": rows,
        }, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    print(f"[Liquipedia] refreshed snapshot: {len(rows)} players")
    return Players(rows), True
