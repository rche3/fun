# Shanghai map

18 recommendations, split into three walkable zones, on a mobile-first map.

```
recc.md          the readable write-up (descriptions live here too)
data.py          the source of truth for the MAP — places, zones, coordinates
build_map.py     generates public/index.html (Leaflet, no framework, no build step)
server.py        stdlib static server for Railway ($PORT)
public/          generated output — safe to delete, rebuild with build_map.py
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

Edit the tuple in `data.py` — `(name_en, name_zh, category, subcategory, zone,
lat, lng, description)` — then re-run `python3 build_map.py`. The numbering on
the pins is generated (zone order, then category, then name), so it renumbers
itself.

Zones are keyed `fc` / `bund` / `jingan` and defined at the top of `data.py`.

Keep `recc.md` in sync by hand if you want the prose version to match — nothing
reads it at build time.

## Notes on the map itself

- **Tiles:** standard OpenStreetMap tiles. No API key, no watermark. CARTO's
  basemaps now stamp "API KEY REQUIRED" across keyless tiles, so they're out.
  OSM's tile policy is fine for a personal-traffic site; if this ever gets real
  traffic, swap the `L.tileLayer` URL in `build_map.py` for a keyed provider
  (MapTiler, Stadia, Thunderforest).
- **Dark mode** follows the phone's setting. The basemap is the light OSM raster
  put through a CSS invert/hue-rotate; the UI palette swaps via CSS variables.
- **Zone colours** are blue / orange / aqua, checked for colourblind separation
  at all pairs in both light and dark mode. Every pin also carries a number and
  every card names its zone, so colour is never the only signal.
- **"Open in 高德"** links search Amap by the Chinese name rather than by
  coordinate — that sidesteps the WGS-84 vs GCJ-02 offset inside China and lands
  on the right venue.
- **Coordinates** are hand-placed to roughly the right building. Good enough to
  cluster and navigate by; tap through to Amap before walking somewhere.
