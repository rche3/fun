# Shanghai map

Mobile-first map of Shanghai recommendations for the 27 September 2026 trip.

```
recc.md          the readable write-up (keep descriptions in sync by hand)
data.py          the source of truth for the MAP: trip, zones, hotel, places
template.html    the page (Leaflet, no framework); build_map.py fills it in
build_map.py     writes public/index.html and copies photos/ into public/
photos/          one square-ish photo per place, named in data.py; CREDITS.md
server.py        stdlib static server for Railway ($PORT)
public/          generated output, gitignored; rebuild with build_map.py
```

## Run it locally

```bash
python3 build_map.py
python3 server.py            # http://localhost:8000
PORT=8077 python3 server.py  # if 8000 is taken
```

No dependencies. `requirements.txt` is intentionally empty.

## Deploy to Railway

Live at https://shanghai.up.railway.app. Railway project `delightful-tranquility`, service `fun`, connected to
the `rche3/fun` GitHub repo. **Every push to `main` redeploys.**

The service settings (set in the Railway dashboard, not in a file):

- Root Directory: `/shanghai`
- Build command: `python3 build_map.py`
- Start command: `python3 server.py` (binds `$PORT`)

Railway has deprecated `railway.json`, so there isn't one. The `Procfile` is a
fallback for buildpack-style detection. To deploy without pushing, run `railway up`
from this directory.

## Adding or changing a place

Edit the tuple in `data.py`: `(name_en, name_zh, category, zone, lat, lng,
description, photo)`. Then re-run `python3 build_map.py`. Pin numbers are
generated in list order (category, then zone, then name), so they renumber
themselves.

Keep descriptions short and in Roger's words. Mirror any change in `recc.md`.

## Photos

Drop a file into `photos/` using the filename given in `data.py`. The build
prints any that are missing, and the tile shows an empty square until one
arrives. Shrink big phone or Xiaohongshu photos first, e.g.
`sips -Z 480 photos/*.jpg`. Landmark photos are from Wikimedia Commons; credits
are in `photos/CREDITS.md`.

## Notes on the map itself

- **Tiles:** standard OpenStreetMap tiles, turned greyscale with a CSS filter.
  No API key. CARTO's grey basemaps stamp "API KEY REQUIRED" on keyless tiles,
  and Esri's grey canvas has no labels in China. For a cleaner, Google-style
  look, sign up for Stadia Maps (free tier) and use `alidade_smooth`.
- **Dark mode** follows the phone's setting. The basemap is the light OSM raster
  put through a CSS greyscale + invert; the UI palette swaps via CSS variables.
- **Zone colours:** French Concession blue, Bund / Lujiazui green, Jing'an
  yellow (with dark numbers so they stay readable). The hotel is a red H pin.
- **"Open in 高德"** links search Amap by the Chinese name rather than by
  coordinate — that sidesteps the WGS-84 vs GCJ-02 offset inside China and lands
  on the right venue.
- **Coordinates** are hand-placed to roughly the right building. Good enough to
  cluster and navigate by; tap through to Amap before walking somewhere.
