"""Shanghai recommendations, structured for the map.

Coordinates are hand-placed from the venue names in recc.md and are accurate to
roughly the right building / block — good enough to cluster and navigate by, but
tap through to a maps app before you walk somewhere.

Descriptions stay short and close to the wording in recc.md.
"""

TRIP = "September 2026 Trip"

# Zone id -> display config. Blue / green / yellow; the hotel pin is red.
# Yellow is too light for white text, so each zone also sets its pin text colour.
ZONES = {
    "fc": {
        "name": "Wukang Rd / French Concession",
        "short": "French Concession",
        "light": "#2a78d6",
        "text": "#fff",
    },
    "bund": {
        "name": "The Bund / Lujiazui",
        "short": "Bund / Lujiazui",
        "light": "#2e9a4e",
        "text": "#fff",
    },
    "jingan": {
        "name": "Jing'an Temple",
        "short": "Jing'an",
        "light": "#f2b90f",
        "text": "#231d05",
    },
}

CATEGORIES = {
    "food": "Food",
    "shopping": "Shopping",
    "sightseeing": "Sightseeing",
}

# Where we're staying. Drawn as a red pin, always visible, not numbered.
HOTEL = {
    "name": "Grand Hyatt Shanghai",
    "name_zh": "上海金茂君悦大酒店",
    "lat": 31.2352,
    "lng": 121.5056,
    "description": "Hotel. Jin Mao Tower, Lujiazui.",
    "photo": "grand-hyatt.jpg",
}

# (name_en, name_zh, category, zone, lat, lng, description, photo)
# photo is a filename in photos/, or None.
PLACES = [
    ("Bing Cheng Lao Yu Jia", "冰城老于家 (徐家汇店)", "food", "fc", 31.1950, 121.4362,
     "North-eastern Chinese food (e.g. guo bao rou, pancake).", "bing-cheng.jpg"),
    ("Fei Da Chu", "费大厨辣椒炒肉 (陆家嘴中心店)", "food", "bund", 31.2381, 121.5047,
     "Hunan-style food. Savoury, strong flavours, very tasty.", "fei-da-chu.jpg"),
    ("Four Seasons of People's Blessing", "四季民福烤鸭店 (中信泰富店)", "food", "jingan", 31.2295, 121.4531,
     "Beijing-style duck.", "four-seasons.jpg"),
    ("Banu Hotpot", "巴奴毛肚火锅 (上海陆家嘴中心店)", "food", "bund", 31.2383, 121.5049,
     "Nice hotpot.", "banu.jpg"),
    ("Haidilao", "海底捞火锅 (华山路店)", "food", "fc", 31.2158, 121.4401,
     "The famous hotpot chain.", "haidilao.jpg"),
    ("Lao Ji Shi", "老吉士酒家 (天平路店)", "food", "fc", 31.2012, 121.4334,
     "Classic Shanghainese food.", "lao-ji-shi.jpg"),
    ("FLAIR", "顶层餐厅酒吧 (浦东丽思卡尔顿酒店)", "food", "bund", 31.2377, 121.5032,
     "Bar. Best view of the Oriental Pearl Tower / skyline.", "flair.jpg"),
    ("Conde", "上海海鸥丽晶酒店", "food", "bund", 31.2462, 121.4900,
     "Bar. Good view of the Oriental Pearl Tower / skyline.", "conde.jpg"),
    ("Shanghai IFC Mall", "上海国金中心商场", "shopping", "bund", 31.2377, 121.5021,
     "Big.", "ifc.jpg"),
    ("Xintiandi", "新天地广场", "shopping", "jingan", 31.2205, 121.4749,
     "Old shikumen lanes turned into shops and bars.", "xintiandi.jpg"),
    ("Two ITC", "上海国贸中心二期", "shopping", "fc", 31.1948, 121.4338,
     "New mall in Xujiahui.", "two-itc.jpg"),
    ("Grand Gateway", "港汇恒隆广场", "shopping", "fc", 31.1941, 121.4353,
     "Big mall in Xujiahui.", "grand-gateway.jpg"),
    ("The Louis", "路易号", "shopping", "jingan", 31.2291, 121.4579,
     "The big LV boat.", "the-louis.jpg"),
    ("North Bund", "北外滩", "sightseeing", "bund", 31.2468, 121.4929,
     "Riverside walk with skyline views.", "north-bund.jpg"),
    ("Yu Garden", "豫园 / 城隍庙", "sightseeing", "bund", 31.2271, 121.4920,
     "Classical garden and old-town bazaar.", "yu-garden.jpg"),
    ("Wukang Mansion", "武康大楼", "sightseeing", "fc", 31.2096, 121.4371,
     "The famous wedge-shaped old building.", "wukang-mansion.jpg"),
    ("Jing'an Temple", "静安寺", "sightseeing", "jingan", 31.2236, 121.4451,
     "Golden temple among the skyscrapers.", "jingan-temple.jpg"),
    ("Lujiazui", "陆家嘴", "sightseeing", "bund", 31.2397, 121.4998,
     "The skyscrapers: Shanghai Tower, Jin Mao, the Pearl.", "lujiazui.jpg"),
]


def as_dicts():
    """PLACES as a list of dicts, numbered 1..n in list order (category, zone, name)."""
    keys = ("name", "name_zh", "category", "zone", "lat", "lng", "description", "photo")
    rows = [dict(zip(keys, p)) for p in PLACES]
    cat_order, zone_order = list(CATEGORIES), list(ZONES)
    rows.sort(key=lambda r: (cat_order.index(r["category"]), zone_order.index(r["zone"]), r["name"]))
    for i, r in enumerate(rows, 1):
        r["n"] = i
    return rows
