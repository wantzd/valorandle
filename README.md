# Valorandle

A daily guessing game for VALORANT esports fans. Each day, five VCT pro players are hidden across the four global leagues — Americas, EMEA, Pacific, and China. Identify them from their stats in up to 8 attempts per round.

**[valorandle.com](https://valorandle.com/en)**

---

## How to play

Guess a pro player by name. After each attempt, colored tiles show how close you are:

- 🟩 **Green** — exact match
- 🟨 **Yellow** — close (age within ±3, similar role group, same region)
- 🟥 **Red** — no match

Attributes compared: country, team, age, role, region, titles won, and years active.

---

## Built with

Astro and Svelte, rendered as a static site and deployed on Vercel. Large map screenshots are served from `media.valorandle.com` through Cloudflare.

---

### Environment variables

Set `DISCORD_FEEDBACK_WEBHOOK_URL` in Vercel for the home feedback form. The webhook is only read by the `/api/feedback` function and is never exposed to the browser.

---

## Credits

Player data sourced from [Liquipedia](https://liquipedia.net/valorant), licensed under [CC BY-SA](https://liquipedia.net/commons/Liquipedia:Copyrights).

Fan-made. Not affiliated with or endorsed by Riot Games.
