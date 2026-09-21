# PROGRESS

Session-to-session handoff. Claude reads this first and updates it after every
task (see `CLAUDE.md`).

## Current state

- **shanghai/**: Map site is built and works locally. All of it (`data.py`,
  `build_map.py`, `server.py`, `public/`, `railway.json`, `Procfile`,
  `requirements.txt`, `README.md`) is **uncommitted**, and `recc.md` has
  uncommitted edits (expanded descriptions). **Not deployed to Railway yet.**
- **archive/nfc-loyalty/**: Archived. Nothing to do.

## Next up / open questions

- Deploy `shanghai/` to Railway. Railway CLI v4.6.3 is installed but not logged
  in yet (`railway login`).
- Commit and push the `shanghai/` work first if deploying from GitHub.
- Decide whether to commit `shanghai/public/`. Railway rebuilds it on deploy, so
  it could be gitignored.

## Log

### 2026-09-21
- Read the whole repo. Added `CLAUDE.md` (session instructions) and this
  `PROGRESS.md`. No code changes.
