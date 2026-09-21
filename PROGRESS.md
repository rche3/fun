# PROGRESS

Session-to-session handoff. Claude reads this first and updates it after every
task (see `CLAUDE.md`).

## Current state

- **shanghai/**: **Live at https://fun-production-5f58.up.railway.app.** Railway
  project `delightful-tranquility`, service `fun`, auto-deploys on every push to
  `main` of `rche3/fun`. All work is committed (`cb05dfe`).
- **archive/nfc-loyalty/**: Archived. Nothing to do.

## Next up / open questions

- Nothing pending. Possible next steps: a custom domain, rename the Railway
  project and service to something clearer than `delightful-tranquility` / `fun`,
  or double-check the place coordinates on a phone.
- If another project in this repo needs Railway, it needs its **own service**
  with its own Root Directory. The `fun` service is pinned to `/shanghai`.

## Log

### 2026-09-21
- Deployed `shanghai/` to Railway. Set the service's Root Directory to
  `/shanghai`, with build `python3 build_map.py` and start `python3 server.py`,
  via the Railway API. Removed `railway.json` because Railway deprecated config
  files. Gitignored `shanghai/public/`. Committed, pushed, and generated the
  domain. Checked that the site returns 200.
- Read the whole repo. Added `CLAUDE.md` (session instructions) and this
  `PROGRESS.md`.
