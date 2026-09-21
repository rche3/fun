"""Build the Shanghai map site.

    python3 build_map.py            # writes public/index.html

Leaflet renders the map client-side; this script is the data pipeline — it takes
the structured recommendations in data.py and bakes them into one self-contained
mobile-first page (no build step, no framework, no API key).

Why not folium: folium wraps the same Leaflet in Python, but its output is a
desktop-shaped page — you can't control the bottom sheet, the filter chips or the
dark-mode handling without hand-editing the HTML it emits anyway. Templating
Leaflet directly is less code and gives a page that behaves on a phone.
"""

import json
import pathlib

from data import CATEGORIES, PLACES, ZONES, as_dicts

OUT = pathlib.Path(__file__).parent / "public" / "index.html"

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5">
<meta name="theme-color" content="#fcfcfb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161615" media="(prefers-color-scheme: dark)">
<meta name="description" content="Shanghai recommendations, mapped into three walkable zones.">
<title>Shanghai — three zones</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<style>
:root {
  color-scheme: light;
  --surface: #fcfcfb;
  --surface-2: #ffffff;
  --line: #e4e3df;
  --ink: #17171a;
  --ink-2: #52514e;
  --ink-3: #85837c;
  --shadow: 0 -2px 24px rgba(20,20,18,.13);
  --z-fc: #2a78d6;
  --z-bund: #eb6834;
  --z-jingan: #1baf7a;
  --tiles-dark: 0;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface: #161615;
    --surface-2: #1f1f1e;
    --line: #333331;
    --ink: #f5f4f0;
    --ink-2: #c3c2b7;
    --ink-3: #8e8d85;
    --shadow: 0 -2px 28px rgba(0,0,0,.55);
    --z-fc: #3987e5;
    --z-bund: #d95926;
    --z-jingan: #199e70;
    --tiles-dark: 1;
  }
}

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  background: var(--surface);
  color: var(--ink);
  font: 15px/1.5 ui-sans-serif, -apple-system, "SF Pro Text", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}
#app { position: fixed; inset: 0; display: flex; flex-direction: column; }

/* ---- header ---- */
header {
  flex: none;
  padding: max(10px, env(safe-area-inset-top)) 0 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  z-index: 500;
}
.title {
  display: flex; align-items: baseline; gap: 8px;
  padding: 0 16px 8px;
}
.title h1 { font-size: 17px; font-weight: 640; letter-spacing: -.01em; margin: 0; }
.title span { font-size: 12.5px; color: var(--ink-3); }
.chips {
  display: flex; gap: 6px; padding: 0 12px;
  overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: none; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--surface-2); color: var(--ink-2);
  font: inherit; font-size: 13px; font-weight: 520; white-space: nowrap;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background .13s, color .13s, border-color .13s;
}
.chip .dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
.chip[data-zone="fc"] .dot { background: var(--z-fc); }
.chip[data-zone="bund"] .dot { background: var(--z-bund); }
.chip[data-zone="jingan"] .dot { background: var(--z-jingan); }
.chip[aria-pressed="true"] { background: var(--ink); color: var(--surface); border-color: var(--ink); }
.chip .n { color: var(--ink-3); font-variant-numeric: tabular-nums; }
.chip[aria-pressed="true"] .n { color: var(--surface); opacity: .65; }

/* ---- map ---- */
#map { flex: 1; min-height: 0; background: var(--surface-2); }
.leaflet-container { font: inherit; background: var(--surface-2); }
.leaflet-tile-pane {
  filter: invert(var(--tiles-dark)) hue-rotate(calc(var(--tiles-dark) * 180deg))
          brightness(calc(1 - var(--tiles-dark) * .12)) contrast(calc(1 - var(--tiles-dark) * .08))
          saturate(calc(1 - var(--tiles-dark) * .25));
}
.leaflet-control-attribution { font-size: 10px; background: rgba(252,252,251,.78) !important; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .leaflet-control-attribution {
    background: rgba(22,22,21,.78) !important; color: #8e8d85;
  }
  :root:not([data-theme="light"]) .leaflet-control-attribution a { color: #a9a8a0; }
}
.leaflet-bar a {
  background: var(--surface-2); color: var(--ink); border-bottom-color: var(--line);
}

.pin {
  display: grid; place-items: center;
  width: 28px; height: 28px; border-radius: 50%;
  color: #fff; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px var(--surface), 0 1px 5px rgba(0,0,0,.35);
  transition: transform .14s ease;
}
.pin.is-active { transform: scale(1.32); z-index: 900; }
.pin.fc { background: var(--z-fc); }
.pin.bund { background: var(--z-bund); }
.pin.jingan { background: var(--z-jingan); }

/* ---- bottom sheet ---- */
#sheet {
  flex: none; position: relative; z-index: 600;
  background: var(--surface);
  border-top: 1px solid var(--line);
  border-radius: 16px 16px 0 0;
  box-shadow: var(--shadow);
  /* leaves the map the larger half of the phone — tap the handle to collapse */
  max-height: 45vh; display: flex; flex-direction: column;
  transition: max-height .26s cubic-bezier(.3,.9,.3,1);
}
#sheet.collapsed { max-height: 84px; }
.grab {
  flex: none; padding: 9px 16px 8px; cursor: pointer;
  display: flex; align-items: center; gap: 10px;
  -webkit-tap-highlight-color: transparent;
}
.grab::before {
  content: ""; position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
  width: 34px; height: 4px; border-radius: 2px; background: var(--line);
}
.grab h2 { font-size: 13.5px; font-weight: 600; margin: 4px 0 0; }
.grab .caret { margin-left: auto; margin-top: 4px; color: var(--ink-3); font-size: 12px; transition: transform .2s; }
#sheet.collapsed .caret { transform: rotate(180deg); }
#list {
  overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding: 2px 12px calc(12px + env(safe-area-inset-bottom));
}
.zone-head {
  display: flex; align-items: center; gap: 7px;
  padding: 12px 4px 6px; font-size: 11.5px; font-weight: 640;
  letter-spacing: .05em; text-transform: uppercase; color: var(--ink-3);
}
.zone-head .dot { width: 8px; height: 8px; border-radius: 50%; }
.card {
  width: 100%; text-align: left; display: flex; gap: 11px;
  padding: 11px 12px; margin-bottom: 6px;
  background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px;
  color: inherit; font: inherit; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.card:active { transform: scale(.995); }
.card .num {
  flex: none; display: grid; place-items: center;
  width: 24px; height: 24px; border-radius: 50%; margin-top: 1px;
  color: #fff; font-size: 11.5px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.card .num.fc { background: var(--z-fc); }
.card .num.bund { background: var(--z-bund); }
.card .num.jingan { background: var(--z-jingan); }
.card h3 { margin: 0; font-size: 14.5px; font-weight: 600; letter-spacing: -.005em; }
.card .zh { color: var(--ink-3); font-size: 12.5px; margin: 1px 0 4px; }
.card p { margin: 0; font-size: 13px; color: var(--ink-2); }
.card .tag { font-size: 11.5px; color: var(--ink-3); }

/* ---- popup ---- */
.leaflet-popup-content-wrapper {
  background: var(--surface-2); color: var(--ink);
  border-radius: 13px; box-shadow: 0 4px 22px rgba(0,0,0,.24);
}
.leaflet-popup-tip { background: var(--surface-2); }
.leaflet-popup-content { margin: 13px 14px; width: 232px !important; font: inherit; }
.leaflet-popup-content h3 { margin: 0; font-size: 14.5px; font-weight: 640; }
.leaflet-popup-content .zh { color: var(--ink-3); font-size: 12.5px; margin: 1px 0 6px; }
.leaflet-popup-content p { margin: 0 0 9px; font-size: 13px; color: var(--ink-2); }
.leaflet-popup-content a.go {
  display: inline-block; padding: 6px 11px; border-radius: 8px;
  background: var(--ink); color: var(--surface);
  font-size: 12.5px; font-weight: 560; text-decoration: none;
}
.leaflet-container a.leaflet-popup-close-button { color: var(--ink-3); }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}

@media (min-width: 820px) {
  #app { flex-direction: row; }
  header {
    position: absolute; top: 0; left: 0; right: 380px; border-bottom: none;
    background: transparent; padding-top: 12px; pointer-events: none;
  }
  .title { display: none; }
  .chips { pointer-events: auto; }
  .chip { box-shadow: 0 1px 6px rgba(0,0,0,.14); }
  #sheet {
    width: 380px; max-height: none; height: 100%;
    border-radius: 0; border-top: none; border-left: 1px solid var(--line);
  }
  #sheet.collapsed { max-height: none; }
  .grab::before { display: none; }
  .grab { cursor: default; padding-top: 16px; }
  .grab .caret { display: none; }
}
</style>
</head>
<body>
<div id="app">
  <header>
    <div class="title">
      <h1>Shanghai</h1>
      <span>three zones, one day each</span>
    </div>
    <div class="chips" id="chips" role="group" aria-label="Filter by zone"></div>
  </header>
  <div id="map"></div>
  <section id="sheet" aria-label="Places">
    <div class="grab" id="grab" role="button" tabindex="0" aria-expanded="true" aria-controls="list">
      <h2 id="count"></h2>
      <span class="caret">▾</span>
    </div>
    <div id="list"></div>
  </section>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
const ZONES = __ZONES__;
const CATEGORIES = __CATEGORIES__;
const PLACES = __PLACES__;

const map = L.map('map', { zoomControl: false, attributionControl: true })
  .setView([31.2260, 121.4700], 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);
// Standard OSM tiles: no API key, no watermark. (CARTO's basemaps now stamp
// "API KEY REQUIRED" across keyless tiles.) Dark mode is a CSS filter on the
// tile pane — see --tiles-dark. Swap in a keyed provider here if traffic grows.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const amap = p => 'https://uri.amap.com/search?keyword=' +
  encodeURIComponent(p.name_zh || p.name) + '&city=' + encodeURIComponent('上海');

let active = null;           // currently selected place id
let filter = 'all';          // 'all' | zone id
const markers = {};

/* ---------- markers ---------- */
PLACES.forEach(p => {
  const m = L.marker([p.lat, p.lng], {
    icon: L.divIcon({
      className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -15],
      html: '<div class="pin ' + p.zone + '" data-n="' + p.n + '">' + p.n + '</div>'
    }),
    keyboard: false,
    title: p.name
  });
  m.bindPopup(
    '<h3>' + esc(p.name) + '</h3>' +
    '<div class="zh">' + esc(p.name_zh) + ' · ' + CATEGORIES[p.category].icon + ' ' +
      esc(p.subcategory || CATEGORIES[p.category].name) + '</div>' +
    '<p>' + esc(p.description) + '</p>' +
    '<a class="go" href="' + amap(p) + '" target="_blank" rel="noopener">Open in 高德 ↗</a>',
    { closeButton: true, autoPanPadding: [24, 24] }
  );
  m.on('click', () => select(p.n, false));
  markers[p.n] = m;
});

/* ---------- filtering ---------- */
function visible() {
  return PLACES.filter(p => filter === 'all' || p.zone === filter);
}

function render() {
  const rows = visible();

  Object.values(markers).forEach(m => map.removeLayer(m));
  rows.forEach(p => markers[p.n].addTo(map));

  document.getElementById('count').textContent =
    rows.length + (rows.length === 1 ? ' place' : ' places') +
    (filter === 'all' ? ' · all zones' : ' · ' + ZONES[filter].short);

  const list = document.getElementById('list');
  list.innerHTML = '';
  const order = filter === 'all' ? Object.keys(ZONES) : [filter];
  order.forEach(z => {
    const inZone = rows.filter(p => p.zone === z);
    if (!inZone.length) return;
    const head = document.createElement('div');
    head.className = 'zone-head';
    head.innerHTML = '<span class="dot" style="background:var(--z-' + z + ')"></span>' + esc(ZONES[z].name);
    list.appendChild(head);
    inZone.forEach(p => {
      const card = document.createElement('button');
      card.className = 'card';
      card.type = 'button';
      card.innerHTML =
        '<span class="num ' + p.zone + '">' + p.n + '</span>' +
        '<span><h3>' + esc(p.name) + '</h3>' +
        '<div class="zh">' + esc(p.name_zh) + '</div>' +
        '<p>' + esc(p.description) + '</p>' +
        '<div class="tag">' + CATEGORIES[p.category].icon + ' ' +
          esc(p.subcategory || CATEGORIES[p.category].name) + '</div></span>';
      card.addEventListener('click', () => select(p.n, true));
      list.appendChild(card);
    });
  });

  fit(rows);
}

function fit(rows) {
  if (!rows.length) return;
  // The map is a flex child between a header and a sheet, so Leaflet's cached
  // size is stale until layout settles — fit against the wrong height and the
  // markers land off-screen. Measure, fit, then do it once more after the
  // sheet has taken its height.
  const bounds = L.latLngBounds(rows.map(p => [p.lat, p.lng]));
  const go = () => {
    map.invalidateSize({ pan: false });
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: false });
  };
  requestAnimationFrame(go);
  setTimeout(go, 180);
}

/* ---------- selection ---------- */
function select(n, fromList) {
  active = n;
  document.querySelectorAll('.pin').forEach(el =>
    el.classList.toggle('is-active', +el.dataset.n === n));
  const p = PLACES.find(x => x.n === n);
  if (fromList) {
    if (window.innerWidth < 820) collapse(true);
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: .5 });
    setTimeout(() => markers[n].openPopup(), 380);
  }
}

/* ---------- sheet ---------- */
function collapse(on) {
  const sheet = document.getElementById('sheet');
  sheet.classList.toggle('collapsed', on);
  document.getElementById('grab').setAttribute('aria-expanded', String(!on));
  setTimeout(() => {
    map.invalidateSize({ pan: false });
    if (active === null) fit(visible());
  }, 280);
}
const grab = document.getElementById('grab');
grab.addEventListener('click', () =>
  collapse(!document.getElementById('sheet').classList.contains('collapsed')));
grab.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); grab.click(); }
});

/* ---------- chips ---------- */
const chips = document.getElementById('chips');
[['all', 'All', null]].concat(Object.entries(ZONES).map(([id, z]) => [id, z.short, id]))
  .forEach(([id, label, zone]) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    if (zone) b.dataset.zone = zone;
    b.setAttribute('aria-pressed', String(id === 'all'));
    const n = id === 'all' ? PLACES.length : PLACES.filter(p => p.zone === id).length;
    b.innerHTML = (zone ? '<span class="dot"></span>' : '') + esc(label) +
      ' <span class="n">' + n + '</span>';
    b.addEventListener('click', () => {
      filter = id;
      [...chips.children].forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      render();
    });
    chips.appendChild(b);
  });

render();

const resettle = () => {
  map.invalidateSize({ pan: false });
  if (active === null) fit(visible());
};
window.addEventListener('load', resettle);
window.addEventListener('resize', resettle);
window.addEventListener('orientationchange', () => setTimeout(resettle, 260));

window.__map = map;  // debug handle
</script>
</body>
</html>
"""


def build():
    html = (TEMPLATE
            .replace("__ZONES__", json.dumps(ZONES, ensure_ascii=False))
            .replace("__CATEGORIES__", json.dumps(CATEGORIES, ensure_ascii=False))
            .replace("__PLACES__", json.dumps(as_dicts(), ensure_ascii=False)))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT}  ({len(PLACES)} places, {len(ZONES)} zones, {len(html):,} bytes)")


if __name__ == "__main__":
    build()
