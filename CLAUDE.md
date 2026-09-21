# CLAUDE.md

Instructions for Claude working in this repo.

## Start and end of every session

1. **At the start, read [`PROGRESS.md`](PROGRESS.md) first.** It says where we left
   off, what's in flight, and what's next. Don't re-derive what it already records.
2. **At the end of every task, update `PROGRESS.md`** before saying you're done:
   - Update **Current state** for any project you touched.
   - Add a dated entry at the top of **Log** (date, project, what changed, and
     anything left half-done).
   - Rewrite **Next up / open questions** so the next session can start from it
     directly.
   Keep it short. It's a handoff note, not a diary. Trim log entries older than a
   couple of months down to one line each.
3. If a task adds, moves or archives a project, also update the table in the root
   `README.md`.

`README.md` is the human-facing index of the repo. `PROGRESS.md` is the working
handoff between sessions. Don't merge them.

## What this repo is

`rche3/fun` on GitHub: Roger's personal grab-bag of small projects, notes and
experiments. Not one application. Each top-level directory stands on its own.

| Path | What | Stack |
| --- | --- | --- |
| `shanghai/` | Mobile-first map of Shanghai recommendations for Roger's 27 Sep 2026 trip, live at https://shanghai.up.railway.app | Python stdlib + Leaflet (CDN), no deps |
| `archive/nfc-loyalty/` | Apple Wallet / NFC loyalty-card server (archived) | Node + SQLite |
| `archive/nfc-loyalty-wallet-plan.md` | Design notes for the above | — |

`venv/` at the root is a local, gitignored Python 3.10 venv with nothing
installed in it. Nothing depends on it.

## Conventions

- One top-level directory per project. Loose `.md` notes are fine too.
- Done or parked projects move under `archive/` and get an `ARCHIVED.md`.
- Never commit secrets: `.env`, certs, keys and `*.db` are gitignored at the
  root. Ship a `.env.example` instead.
- Dependency dirs (`node_modules/`, `venv/`) are gitignored.
- Only commit or push when Roger asks. `main` is the only branch.

## shanghai/ specifics

- `data.py` is the source of truth for the map (trip, zones, hotel, places as
  tuples). `recc.md` is the prose write-up, synced **by hand**, and nothing reads
  it at build time. If you change a place, change it in both.
- **Descriptions are Roger's words, kept short.** One line, no added commentary,
  tips or embellishment. He strongly dislikes padded descriptions. For an empty
  one, write a few plain words.
- Keep the UI minimal: no emojis, no subcategories, no filler text like counts
  or taglines.
- `template.html` is the page. `build_map.py` fills in the data, writes
  `public/index.html` and copies `photos/` over. Never hand-edit `public/`.
- Photos: `photos/<name>.jpg`, with the filename set in `data.py`. Landmarks come
  from Wikimedia Commons, credited in `photos/CREDITS.md`. Restaurant photos come
  from Roger (Xiaohongshu and similar need a login, which Claude can't do).
  Shrink them with `sips -Z 480` before committing.
- Run locally: `python3 build_map.py && python3 server.py` (port 8000, or set
  `PORT=8077` if 8000 is taken).
- Deploy: Railway project `delightful-tranquility`, service `fun`, connected to
  GitHub `rche3/fun`, so **every push to `main` redeploys**. The service settings
  are Root Directory `/shanghai`, build `python3 build_map.py`, start
  `python3 server.py`. They're set in the Railway dashboard, not in a file, because
  Railway has deprecated `railway.json`. `shanghai/` is `railway link`ed locally,
  so `railway logs` and `railway up` work from there.
- `public/` is gitignored. Railway builds it on deploy.
- After UI changes, run `node shanghai/tools/ux-test.mjs` against a local server
  and look at the screenshots. Roger tests on an iPhone 17 Pro Max.
- **Don't deploy without asking.** Roger reviews on localhost first.
- Keep it dependency-free. `requirements.txt` is intentionally empty.
