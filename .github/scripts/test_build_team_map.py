"""
test_build_team_map.py — exercises build_team_map.py without touching the API.

Run:  python .github/scripts/test_build_team_map.py

The script under test is copied into a throwaway tree next to a stub `httpx`
module. Python puts a script's own directory first on sys.path, so the stub
shadows the real httpx and every request is answered from canned fixtures
shaped like the real endpoints.

Covered:
  - only regional VCT events feed the map (Game Changers and international
    events are excluded, since they cannot attribute a team to one league)
  - convergence: a second run over the same data spends zero detail requests
  - short-vs-official naming ("Bilibili Gaming" / "Guangzhou Huadu Bilibili
    Gaming") is reconciled via an alias instead of re-resolving forever
  - a rebrand keeps the team id and follows the new name
  - MAX_DETAIL_FETCHES is honoured, and a partial map is still written
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))

STUB_HTTPX = textwrap.dedent('''
    import json, os

    CALLS_FILE = os.path.join(os.path.dirname(__file__), "_calls.log")
    SCENARIO   = os.environ.get("SCENARIO", "base")

    def _log(kind):
        with open(CALLS_FILE, "a", encoding="utf-8") as f:
            f.write(kind + "\\n")

    # (match_id, tournament, (short1, id1), (short2, id2))
    MATCHES = [
        ("729746", "VCT 2026: Americas Stage 2", ("MIBR", "7386"), ("KRU Esports", "2355")),
        ("729747", "VCT 2026: Americas Stage 2", ("LOUD", "6961"), ("FURIA", "2406")),
        ("729748", "VCT 2026: EMEA Stage 2",     ("FNATIC", "2593"), ("Team Heretics", "1001")),
        ("729749", "VCT 2026: Pacific Stage 2",  ("Team Secret", "6199"), ("DRX", "8185")),
        ("729750", "VCT 2026: China Stage 2",    ("EDward Gaming", "1120"), ("TYLOO", "731")),
        # results uses the short name, details returns the full legal name
        ("729753", "VCT 2026: China Stage 2",    ("Bilibili Gaming", "12010"),
                                                 ("Titan Esports Club", "14137")),
        # different circuit — must never enter the map
        ("729751", "Game Changers 2026: EMEA Stage 3", ("G2 Gozen", "9999"), ("Guild X", "9998")),
        # international event — league is ambiguous, also excluded
        ("729752", "Valorant Champions 2026",    ("NRG", "1034"), ("Paper Rex", "624")),
    ]

    OFFICIAL = {
        "12010": "Guangzhou Huadu Bilibili Gaming",
        "14137": "Wuxi Titan Esports Club",
    }

    class _Resp:
        def __init__(self, payload, status=200):
            self._p, self.status_code = payload, status
            self.text = json.dumps(payload)[:200]
        def json(self):
            return self._p

    def get(url, params=None, headers=None, timeout=None, follow_redirects=None):
        params = params or {}

        if "/v2/match/details" in url:
            _log("details")
            mid = str(params.get("match_id"))
            for m_id, _tour, t1, t2 in MATCHES:
                if m_id == mid:
                    (n1, i1), (n2, i2) = t1, t2
                    n1, n2 = OFFICIAL.get(i1, n1), OFFICIAL.get(i2, n2)
                    if SCENARIO == "rename" and i1 == "7386":
                        n1 = "MIBR Academy"
                    return _Resp({"data": {"segments": [{
                        "match_id": mid,
                        "teams": [
                            {"id": i1, "name": n1},
                            {"id": i2, "name": n2},
                        ],
                    }]}})
            return _Resp({"detail": "Not Found"}, 404)

        if "/v2/match" in url:
            _log("results")
            segs = []
            for m_id, tour, t1, t2 in MATCHES:
                n1 = "MIBR Academy" if (SCENARIO == "rename" and t1[1] == "7386") else t1[0]
                segs.append({
                    "team1": n1,
                    "team2": t2[0],
                    "tournament_name": tour,
                    "match_page": "/%s/slug" % m_id,
                })
            return _Resp({"data": {"segments": segs, "meta": {"page_range": "1-1"}}})

        return _Resp({"detail": "Not Found"}, 404)
''')


def main():
    sandbox = tempfile.mkdtemp(prefix="teammap-test-")
    try:
        scripts = os.path.join(sandbox, ".github", "scripts")
        os.makedirs(scripts)
        shutil.copy(os.path.join(HERE, "build_team_map.py"), scripts)
        with open(os.path.join(scripts, "httpx.py"), "w", encoding="utf-8") as f:
            f.write(STUB_HTTPX)

        script   = os.path.join(scripts, "build_team_map.py")
        calls_f  = os.path.join(scripts, "_calls.log")
        map_path = os.path.join(sandbox, ".github", "data", "team-map.json")

        def run(scenario="base", **extra):
            if os.path.exists(calls_f):
                os.remove(calls_f)
            env = dict(os.environ)
            env.update({
                "VLRGG_API_URL": "https://stub.invalid",
                "VLRGG_API_TOKEN": "stub",
                "PYTHONIOENCODING": "utf-8",
                "SCENARIO": scenario,
            })
            env.update(extra)
            proc = subprocess.run([sys.executable, script], capture_output=True,
                                  text=True, encoding="utf-8", env=env)
            calls = open(calls_f, encoding="utf-8").read().split() if os.path.exists(calls_f) else []
            data  = json.load(open(map_path, encoding="utf-8")) if os.path.exists(map_path) else {}
            return proc, calls, data

        fails = []

        def check(label, cond, detail=""):
            print(f"{'ok  ' if cond else 'FAIL'} {label}" + (f"   [{detail}]" if detail and not cond else ""))
            if not cond:
                fails.append(label)

        # 1. cold start
        proc, calls, data = run()
        if proc.returncode != 0:
            print(proc.stdout, proc.stderr)
            return 1
        teams = data.get("teams", {})
        check("6 VCT matches map 12 teams", len(teams) == 12, f"got {len(teams)}")
        check("Game Changers excluded", "9999" not in teams and "9998" not in teams)
        check("international event excluded", "1034" not in teams and "624" not in teams)
        check("league attributed (MIBR=Americas)", teams.get("7386", {}).get("league") == "Americas")
        check("league attributed (FNATIC=EMEA)", teams.get("2593", {}).get("league") == "EMEA")
        check("official long name stored",
              teams.get("12010", {}).get("name") == "Guangzhou Huadu Bilibili Gaming")
        check("short name kept as alias",
              "Bilibili Gaming" in (teams.get("12010", {}).get("aliases") or []))
        check("keys sorted numerically", list(teams.keys()) == sorted(teams.keys(), key=int))
        check("one detail call per VCT match", calls.count("details") == 6, f"got {calls.count('details')}")

        # 2. convergence
        _, calls2, data2 = run()
        check("second run spends no detail calls", calls2.count("details") == 0,
              f"got {calls2.count('details')}")
        check("map unchanged on convergence", data2.get("teams") == teams)

        # 3. rebrand
        _, _, data3 = run(scenario="rename")
        teams3 = data3.get("teams", {})
        check("rebrand keeps the id", "7386" in teams3)
        check("rebrand follows the new name", teams3.get("7386", {}).get("name") == "MIBR Academy",
              str(teams3.get("7386")))
        check("rebrand creates no duplicate", len(teams3) == 12, f"got {len(teams3)}")

        # 4. request cap
        os.remove(map_path)
        proc4, calls4, data4 = run(MAX_DETAIL_FETCHES="2")
        check("cap honoured", calls4.count("details") == 2, f"got {calls4.count('details')}")
        check("partial map still written", len(data4.get("teams", {})) == 4,
              f"got {len(data4.get('teams', {}))}")
        check("warns about unmapped teams", "still unmapped" in proc4.stdout)

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
