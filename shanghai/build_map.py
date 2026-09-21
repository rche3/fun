"""Build the Shanghai map site.

    python3 build_map.py            # writes public/index.html + public/photos/

Leaflet renders the map client-side; this script is the data pipeline — it takes
the structured recommendations in data.py, bakes them into template.html, and
copies the photos across. One self-contained mobile-first page, no framework,
no API key.
"""

import json
import pathlib
import shutil

from data import CATEGORIES, HOTEL, TRIP, ZONES, as_dicts

HERE = pathlib.Path(__file__).parent
TEMPLATE = HERE / "template.html"
PHOTOS = HERE / "photos"
OUT = HERE / "public"


def with_photo(row):
    """Drop photo references whose file isn't in photos/ so the page never 404s."""
    if row.get("photo") and not (PHOTOS / row["photo"]).is_file():
        print(f"  no photo yet: photos/{row['photo']}  ({row['name']})")
        row["photo"] = None
    return row


def build():
    places = [with_photo(r) for r in as_dicts()]
    hotel = with_photo(dict(HOTEL))
    dump = lambda v: json.dumps(v, ensure_ascii=False)
    html = (TEMPLATE.read_text(encoding="utf-8")
            .replace("__TRIP__", TRIP)
            .replace("__ZONES__", dump(ZONES))
            .replace("__CATEGORIES__", dump(CATEGORIES))
            .replace("__HOTEL__", dump(hotel))
            .replace("__PLACES__", dump(places)))

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(html, encoding="utf-8")
    shutil.rmtree(OUT / "photos", ignore_errors=True)
    if PHOTOS.is_dir():
        shutil.copytree(PHOTOS, OUT / "photos", ignore=shutil.ignore_patterns("*.md"))
    print(f"wrote {OUT / 'index.html'}  ({len(places)} places, {len(html):,} bytes)")


if __name__ == "__main__":
    build()
