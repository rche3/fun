# PROGRESS

Session-to-session handoff. Claude reads this first and updates it after every
task (see `CLAUDE.md`).

## Current state

- **shanghai/**: Live at https://shanghai.up.railway.app (Railway project
  `delightful-tranquility`, service `fun`; every push to `main` redeploys).
  The 2026-09-21 redesign is live (`1643001`).
- **archive/nfc-loyalty/**: Archived. Nothing to do.

## Next up / open questions

- **Roger is adding 10 photos himself** from Xiaohongshu and similar. Filenames
  go in `shanghai/photos/`: bing-cheng, fei-da-chu, four-seasons, banu,
  haidilao, lao-ji-shi, flair, conde, two-itc, the-louis (`.jpg`). Shrink with
  `sips -Z 480` and then rebuild.
- Roger plans to add more places to the list.
- Optional: a cleaner Google-style basemap needs a free Stadia Maps account
  (`alidade_smooth`). The current map is greyscale OSM.
- Possible: rename the Railway project and service, or buy a domain
  (`rogerchen.app`, `rche.app` and `rchen.app` were free on 2026-09-21).

## Log

### 2026-09-21
- Redesigned the Shanghai map from Roger's feedback:
  - Header is now "Shanghai 上海" + "27 September 2026 trip".
  - Two filter rows: areas (All / FC / Bund / Jing'an) and categories (All /
    Food / Shopping / Sightseeing).
  - List grouped by category in collapsible sections. No emojis,
    subcategories or count text.
  - Zone colours: blue FC, green Bund, yellow Jing'an. Grand Hyatt is a red H
    pin.
  - Descriptions cut back to Roger's own short wording (`data.py` +
    `recc.md`).
  - Square photo on each tile: 9 landmarks from Wikimedia, 10 left for Roger.
  - Greyscale OSM map.
  - Moved the HTML out of `build_map.py` into `template.html`.
  - Xiaohongshu needs a login and Douyin is blocked for the browser extension,
    so restaurant photos are Roger's job.
- Renamed the Railway link from `fun-production-5f58.up.railway.app` to
  `shanghai.up.railway.app`. The old URL now returns 404.
- Deployed `shanghai/` to Railway. Set the service's Root Directory to
  `/shanghai`, with build `python3 build_map.py` and start `python3 server.py`,
  via the Railway API. Removed `railway.json` because Railway deprecated config
  files. Gitignored `shanghai/public/`. Committed, pushed, and generated the
  domain. Checked that the site returns 200.
- Read the whole repo. Added `CLAUDE.md` (session instructions) and this
  `PROGRESS.md`.
