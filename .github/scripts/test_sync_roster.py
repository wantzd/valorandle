"""
test_sync_roster.py — exercises sync_roster.py without touching the network.

Run:  python .github/scripts/test_sync_roster.py

Uses a copy of the REAL public/js/players.js, so the insertion logic is proven
against the actual hand-written formatting rather than a toy fixture. Requires
node on PATH to confirm the rewritten file is still valid JavaScript.

Covered:
  - newcomers are detected, staff (is_staff) are not
  - a player Liquipedia flags as retired is skipped, not added
  - Liquipedia fills age / role / isIGL / yearsActive
  - team changes and departures are reported, never auto-applied
  - APPLY=1 inserts into the right team block, leaves every existing row
    byte-identical, and the result still parses as JavaScript
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))

STUB_HTTPX = textwrap.dedent('''
    import json, os

    # FURIA = 2406 in the real team map. Two of these vlrIds are already in
    # players.js (nerve 754, eeiu 796); the rest exercise the new paths.
    ROSTERS = {
        "2406": [
            {"id": "754",   "alias": "nerve",    "country": "us", "is_captain": True,  "is_staff": False},
            {"id": "796",   "alias": "eeiu",     "country": "ca", "is_captain": False, "is_staff": False},
            {"id": "99001", "alias": "novato",   "country": "br", "is_captain": False, "is_staff": False},
            {"id": "99002", "alias": "capitao",  "country": "br", "is_captain": True,  "is_staff": False},
            {"id": "99003", "alias": "aposentado","country": "us","is_captain": False, "is_staff": False},
            {"id": "99004", "alias": "treinador","country": "br", "is_captain": False, "is_staff": True},
            # is_staff is unreliable in the real API — role is the real signal
            {"id": "99005", "alias": "coachzin", "country": "br", "is_captain": False,
             "is_staff": False, "role": "head coach"},
            {"id": "99006", "alias": "reserva",  "country": "br", "is_captain": False,
             "is_staff": False, "role": "sub"},
            {"id": "99007", "alias": "parado",   "country": "br", "is_captain": False,
             "is_staff": False, "role": "inactive"},
        ],
        # Org with no section in players.js — exercises append_team_section
        "9500": [
            {"id": "99010", "alias": "estreante1", "country": "br", "is_captain": True,  "is_staff": False},
            {"id": "99011", "alias": "estreante2", "country": "ar", "is_captain": False, "is_staff": False},
        ],
    }

    LIQ_ROWS = [
        {   # full data — should fill every field
            "id": "novato", "birthdate": "2004-03-10", "status": "Active",
            "nationality": "Brazil",
            "extradata": {"agent1": "Jett", "agent2": "Raze", "agent3": "Neon"},
            "earningsbyyear": {"2024": 100, "2025": 200, "2026": 300},
            "links": {"vlr": "https://www.vlr.gg/player/99001"},
        },
        {   # igl via extradata, controller agents
            "id": "capitao", "birthdate": "1999-01-02", "status": "Active",
            "nationality": "Brazil",
            "extradata": {"role": "igl", "agent1": "Omen", "agent2": "Astra", "agent3": "Brimstone"},
            "earningsbyyear": {"2021": 10, "2026": 20},
            "links": {"vlr": "https://www.vlr.gg/player/99002"},
        },
        {   # retired — must be skipped even though the roster lists them
            "id": "aposentado", "birthdate": "1996-06-06", "status": "Retired",
            "nationality": "United States",
            "extradata": {"agent1": "Sova"},
            "earningsbyyear": {"2020": 5},
            "links": {"vlr": "https://www.vlr.gg/player/99003"},
        },
    ]

    class _Resp:
        def __init__(self, payload, status=200):
            self._p, self.status_code = payload, status
            self.text = json.dumps(payload)[:200]
        def json(self):
            return self._p
        def raise_for_status(self):
            if self.status_code != 200:
                raise Exception("HTTP %s" % self.status_code)

    def get(url, params=None, headers=None, timeout=None, follow_redirects=None):
        params = params or {}

        if "liquipedia.net" in url:
            if os.environ.get("LIQ_429"):
                return _Resp({"detail": "rate limited"}, 429)
            if params.get("offset", 0):
                return _Resp({"result": []})
            return _Resp({"result": LIQ_ROWS})

        if "/v2/team" in url:
            tid = str(params.get("id"))
            roster = ROSTERS.get(tid)
            if roster is None:
                return _Resp({"data": {"segments": [{"roster": []}]}})
            return _Resp({"data": {"segments": [{"roster": roster}]}})

        return _Resp({"detail": "Not Found"}, 404)
''')

TEAM_MAP = {
    "_comment": "test fixture",
    "generated": "2026-08-16",
    "teams": {
        "2406": {"name": "FURIA", "league": "Americas", "last_seen": "2026-08-16"},
        "9500": {"name": "Time Novo FC", "league": "Americas", "last_seen": "2026-08-16"},
    },
}


def load_classifier():
    """Pull classify_team_change out of sync_roster.py without running it.

    Importing the module would hit the network and sys.exit on missing secrets,
    so the pure helpers are sliced out and exec'd on their own.
    """
    src   = open(os.path.join(HERE, "sync_roster.py"), encoding="utf-8").read()
    start = src.index("ORG_NOISE_RE = ")
    end   = src.index("# ── Step 4")
    ns = {"re": __import__("re")}
    exec(src[start:end], ns)
    return ns["classify_team_change"]


def node_players(path):
    """Parse players.js with node and return the array, or raise."""
    out = subprocess.run(
        ["node", "-e",
         "const fs=require('fs');"
         f"const src=fs.readFileSync({json.dumps(path)},'utf8');"
         "const db=new Function(src+'; return PLAYERS_DB;')();"
         "process.stdout.write(JSON.stringify(db));"],
        capture_output=True, text=True, encoding="utf-8",
    )
    if out.returncode != 0:
        raise RuntimeError("node could not parse players.js:\n" + out.stderr)
    return json.loads(out.stdout)


def main():
    if not shutil.which("node"):
        print("SKIP: node not on PATH — cannot validate players.js")
        return 0

    sandbox = tempfile.mkdtemp(prefix="roster-test-")
    try:
        scripts = os.path.join(sandbox, ".github", "scripts")
        data    = os.path.join(sandbox, ".github", "data")
        pubjs   = os.path.join(sandbox, "public", "js")
        for d in (scripts, data, pubjs):
            os.makedirs(d)

        for name in ("sync_roster.py", "vlr_common.py"):
            shutil.copy(os.path.join(HERE, name), scripts)
        with open(os.path.join(scripts, "httpx.py"), "w", encoding="utf-8") as f:
            f.write(STUB_HTTPX)
        with open(os.path.join(data, "team-map.json"), "w", encoding="utf-8") as f:
            json.dump(TEAM_MAP, f)

        players_path = os.path.join(pubjs, "players.js")
        shutil.copy(os.path.join(REPO, "public", "js", "players.js"), players_path)

        before_text = open(players_path, encoding="utf-8").read()
        before      = node_players(players_path)

        env = dict(os.environ)
        env.update({
            "VLRGG_API_URL": "https://stub.invalid",
            "VLRGG_API_TOKEN": "stub",
            "LIQUIPEDIA_API_KEY": "stub",
            "PYTHONIOENCODING": "utf-8",
            "APPLY": "1",
        })
        def run_429():
            e = dict(env)
            e["LIQ_429"] = "1"
            e["LIQ_BACKOFF"] = "0"   # do not really sleep through the backoff
            p = subprocess.run([sys.executable, os.path.join(scripts, "sync_roster.py")],
                               capture_output=True, text=True, encoding="utf-8", env=e)
            return p, None, None

        proc = subprocess.run([sys.executable, os.path.join(scripts, "sync_roster.py")],
                              capture_output=True, text=True, encoding="utf-8", env=env)
        if proc.returncode != 0:
            print(proc.stdout, proc.stderr)
            return 1

        drift = json.load(open(os.path.join(data, "roster-drift.json"), encoding="utf-8"))
        after = node_players(players_path)

        fails = []

        def check(label, cond, detail=""):
            print(f"{'ok  ' if cond else 'FAIL'} {label}" + (f"   [{detail}]" if detail and not cond else ""))
            if not cond:
                fails.append(label)

        adds = {a["name"]: a for a in drift["additions"]}

        check("newcomers detected",
              set(adds) == {"novato", "capitao", "estreante1", "estreante2"},
              str(sorted(adds)))
        check("is_staff excluded", "treinador" not in adds)
        check("coach excluded despite is_staff false", "coachzin" not in adds)
        check("sub excluded", "reserva" not in adds)
        check("inactive excluded", "parado" not in adds)
        check("non-players reported, not silently dropped",
              {p["name"] for p in drift["non_players"]}
              == {"treinador", "coachzin", "reserva", "parado"},
              str(sorted(p["name"] for p in drift["non_players"])))
        check("retired player skipped",
              [s["name"] for s in drift["skipped_retired"]] == ["aposentado"],
              str(drift["skipped_retired"]))

        check("age from birthdate", adds.get("novato", {}).get("age") == 22,
              str(adds.get("novato", {}).get("age")))
        check("role from signature agents (duelist)",
              adds.get("novato", {}).get("role") == "Duelist",
              str(adds.get("novato", {}).get("role")))
        check("role from signature agents (controller)",
              adds.get("capitao", {}).get("role") == "Controller")
        check("isIGL from roster captain", adds.get("novato", {}).get("isIGL") is False)
        check("isIGL from liquipedia role", adds.get("capitao", {}).get("isIGL") is True)
        check("yearsActive from earnings span",
              adds.get("novato", {}).get("yearsActive") == 3,
              str(adds.get("novato", {}).get("yearsActive")))
        check("country translated", adds.get("novato", {}).get("country") == "Brasil")
        check("league expanded", adds.get("novato", {}).get("league") == "VCT Americas")

        # Everyone in players.js but absent from the single stubbed roster
        # Classification of team changes — proven directly, since the stub only
        # exercises one team.
        classify = load_classifier()
        for old, new, want in [
            ("Fnatic", "FNATIC", "spelling"),
            ("ZETA Division", "ZETA DIVISION", "spelling"),
            ("Trace", "Trace Esports", "spelling"),
            ("DRX", "KIWOOM DRX", "rename"),
            ("EDG", "EDward Gaming", "rename"),
            ("Evil Geniuses", "FURIA", "transfer"),
            ("GIANTX", "FNATIC", "transfer"),
        ]:
            got = classify(old, new)
            check(f"{old!r} → {new!r} is {want}", got == want, got)

        check("departures reported", len(drift["departures"]) == len(before) - 2,
              f"got {len(drift['departures'])}")
        check("departures not applied",
              all(p["vlrId"] in {x["vlrId"] for x in after} for p in before))

        # Insertion correctness
        check("four rows added", len(after) == len(before) + 4, f"got {len(after)}")
        new_rows = {p["name"]: p for p in after if p["vlrId"] in (99001, 99002)}
        check("newcomers landed in FURIA",
              all(p["team"] == "FURIA" for p in new_rows.values()),
              str({k: v.get("team") for k, v in new_rows.items()}))

        # Brand-new org gets its own section inside the right league region
        after_text = open(players_path, encoding="utf-8").read()
        novos = [p for p in after if p["vlrId"] in (99010, 99011)]
        check("new org players added", len(novos) == 2, f"got {len(novos)}")
        check("new org rows carry the team",
              all(p["team"] == "Time Novo FC" for p in novos))
        check("new org got a section header", "── Time Novo FC" in after_text)
        americas = after_text.index("VCT AMERICAS")
        emea     = after_text.index("VCT EMEA")
        check("section landed inside the Americas region",
              americas < after_text.index("── Time Novo FC") < emea)
        check("new org players sit in the Americas league",
              all(p["league"] == "VCT Americas" for p in novos))
        check("newcomer has titles placeholder",
              new_rows.get("novato", {}).get("titles") == ["Nenhum"])

        by_id_before = {p["vlrId"]: p for p in before}
        changed = [p["name"] for p in after
                   if p["vlrId"] in by_id_before and p != by_id_before[p["vlrId"]]]
        check("no existing row modified", not changed, str(changed[:5]))

        # The file must differ only by added lines
        removed = [l for l in before_text.splitlines()
                   if l not in set(open(players_path, encoding="utf-8").read().splitlines())]
        check("no original line removed", not removed, str(removed[:3]))

        # A Liquipedia outage must abort the write, not produce blank rows.
        shutil.copy(os.path.join(REPO, "public", "js", "players.js"), players_path)
        pristine = open(players_path, encoding="utf-8").read()
        proc429, _, _ = run_429()
        check("429 aborts with non-zero exit", proc429.returncode != 0,
              f"exit {proc429.returncode}")
        check("429 leaves players.js untouched",
              open(players_path, encoding="utf-8").read() == pristine)
        check("429 explains why", "Refusing to modify players.js" in proc429.stdout)

        print()
        if fails:
            print(f"{len(fails)} failure(s): " + "; ".join(fails))
            return 1
        print("all checks passed")
        return 0
    finally:
        shutil.rmtree(sandbox, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
