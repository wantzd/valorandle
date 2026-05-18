# Valorandle

A daily guessing game for VALORANT esports fans. Identify VCT pro players from their stats — country, team, age, role, titles, and years active — in up to 8 attempts. New challenge every day across all four VCT global leagues.

**Live at [valorandle.com](https://valorandle.com)**

---

## How it works

Each daily challenge consists of 5 rounds. Every round, a different pro player is selected from one of the four VCT leagues (Americas, EMEA, Pacific, China). You have 8 guesses per round. After each guess, colored tiles reveal how close you are:

- 🟩 **Green** — exact match
- 🟨 **Yellow** — close (age ±3 years, similar role group)
- 🟥 **Red** — no match

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Data pipeline | Python (`build_orgmap.py`), GitHub Actions |
| Hosting | Hostinger (static) |
| Player stats | [vlr.gg](https://www.vlr.gg) API |
| Player ages & IGL role | [Liquipedia](https://liquipedia.net/valorant) |

---

## Data sources & credits

**Player ages and IGL designation** are sourced from [Liquipedia](https://liquipedia.net/valorant) via their [DB API](https://api.liquipedia.net). Data is licensed under [CC BY-SA](https://liquipedia.net/commons/Liquipedia:Copyrights).

**Player performance stats** (team, agents, match history) are sourced from the vlr.gg API.

This project is a fan-made tool and is not affiliated with or endorsed by Riot Games.

---

## Project structure

```
├── js/
│   ├── api.js          # Fetches and merges org-map.json into PLAYERS_DB
│   ├── game-logic.js   # Game rules, comparison functions, i18n, persistence
│   └── players.js      # Static player database (name, titles, vlrId, etc.)
├── icons/              # Favicons and app icons
├── logos/              # VCT league logos
├── .github/
│   ├── scripts/
│   │   └── build_orgmap.py   # Weekly data pipeline (team, country, role, age)
│   └── workflows/
│       ├── update-players.yml    # Runs build_orgmap.py every Monday
│       └── deploy-hostinger.yml  # Deploys to production via FTP
├── index.html          # Home / lobby
├── league-select.html  # League selection screen
├── game.html           # Main game screen
└── org-map.json        # Generated weekly — live player data
```

---

## Running locally

No build step required. Open `index.html` directly in a browser, or serve with any static server:

```bash
python -m http.server 8000
```

---

## Data pipeline

Player data is updated every Monday at 06:00 UTC via GitHub Actions:

1. Fetches current team and country from the vlr.gg API
2. Fetches agent pick history from recent VCT matches to detect player role
3. Fetches birthdate and IGL status from the Liquipedia DB API
4. Writes `org-map.json` and pushes it to the repository
5. Deploys updated files to Hostinger via FTP

To run the pipeline locally:

```bash
pip install httpx
VLRGG_API_URL=<url> LIQUIPEDIA_API_KEY=<key> python .github/scripts/build_orgmap.py
```

---

## License

Code is released under the MIT License. Player data from Liquipedia is subject to [CC BY-SA](https://liquipedia.net/commons/Liquipedia:Copyrights).
