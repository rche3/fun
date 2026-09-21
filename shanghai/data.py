"""Shanghai recommendations, structured for the map.

Coordinates are hand-placed from the venue names in recc.md and are accurate to
roughly the right building / block — good enough to cluster and navigate by, but
tap through to a maps app before you walk somewhere.
"""

# Zone id -> display config. Colours are dataviz categorical slots 1-3
# (blue / orange / aqua), validated all-pairs in light and dark mode.
ZONES = {
    "fc": {
        "name": "Wukang Rd / French Concession",
        "short": "French Concession",
        "blurb": "Plane trees, low-rise lanes, Xujiahui malls at the south end.",
        "light": "#2a78d6",
        "dark": "#3987e5",
        "center": [31.2060, 121.4370],
    },
    "bund": {
        "name": "The Bund / Lujiazui",
        "short": "Bund / Lujiazui",
        "blurb": "The skyline, the towers, the river and the old town.",
        "light": "#eb6834",
        "dark": "#d95926",
        "center": [31.2380, 121.4960],
    },
    "jingan": {
        "name": "Jing'an Temple",
        "short": "Jing'an",
        "blurb": "Nanjing West Road — temples and flagship malls in one block.",
        "light": "#1baf7a",
        "dark": "#199e70",
        "center": [31.2260, 121.4560],
    },
}

CATEGORIES = {
    "food": {"name": "Food", "icon": "\U0001F958"},
    "shopping": {"name": "Malls / Shopping", "icon": "\U0001F6CD"},
    "sightseeing": {"name": "Sightseeing", "icon": "\U0001F5FA"},
}

# (name_en, name_zh, category, subcategory, zone, lat, lng, description)
PLACES = [
    (
        "Bing Cheng Lao Yu Jia", "冰城老于家 (徐家汇店)",
        "food", "Region-specific Chinese", "fc", 31.1950, 121.4362,
        "North-eastern Chinese. Big portions, cheap, loud — order the guo bao rou "
        "and a cumin lamb and you're done. Good late.",
    ),
    (
        "Fei Da Chu", "费大厨辣椒炒肉 (陆家嘴中心店)",
        "food", "Region-specific Chinese", "bund", 31.2381, 121.5047,
        "Hunan — savoury and strong flavours, very tasty. The signature chilli-fried "
        "pork is the whole point; get rice, it's salty by design. Queue at peak, so "
        "put your name down and walk the mall.",
    ),
    (
        "Four Seasons of People's Blessing", "四季民福烤鸭店 (中信泰富店)",
        "food", "Region-specific Chinese", "jingan", 31.2295, 121.4531,
        "The Beijing duck institution, done properly — crisp skin, carved at the "
        "table, sugar on the side. Half a duck plus a couple of sides feeds two. "
        "Book ahead.",
    ),
    (
        "Banu Hotpot", "巴奴毛肚火锅 (上海陆家嘴中心店)",
        "food", "Hotpot", "bund", 31.2383, 121.5049,
        "The tripe (毛肚) is the reason it exists — 7 seconds in, 7 out. "
        "Ingredient quality well above the chains, priced accordingly.",
    ),
    (
        "Haidilao", "海底捞火锅 (华山路店)",
        "food", "Hotpot", "fc", 31.2158, 121.4401,
        "The famous one. Food is fine, the service is the experience — snacks while "
        "you wait, the noodle-pulling performance, they'll do your nails. Good with "
        "a group, open very late.",
    ),
    (
        "Lao Ji Shi", "老吉士酒家 (天平路店)",
        "food", "Shanghai classic", "fc", 31.2012, 121.4334,
        "Proper old-school Shanghainese. Small, cramped, no ceremony. Hongshao rou, "
        "drunken chicken, crab-roe tofu, the fried rice. Book — it's tiny.",
    ),
    (
        "FLAIR", "顶层餐厅酒吧 (浦东丽思卡尔顿酒店)",
        "food", "Bars", "bund", 31.2377, 121.5032,
        "Best view of the Oriental Pearl and the skyline. 58th floor of the Ritz, "
        "outdoor terrace pointed straight at the tower. Drinks are expensive and "
        "that's not the point. Sunset, and book the terrace.",
    ),
    (
        "Conde", "上海海鸥丽晶酒店",
        "food", "Bars", "bund", 31.2462, 121.4900,
        "Lower and closer than FLAIR — you're at the river's edge looking across, "
        "which honestly frames the skyline better. Much easier to walk into.",
    ),
    (
        "Shanghai IFC Mall", "上海国金中心商场",
        "shopping", None, "bund", 31.2377, 121.5021,
        "The Lujiazui default — luxury downstairs, a solid food hall, connected "
        "underground to the metro and the towers so you never go outside. Easy "
        "rainy-day plan.",
    ),
    (
        "Xintiandi", "新天地广场",
        "shopping", None, "jingan", 31.2205, 121.4749,
        "Restored shikumen lane houses turned into an open-air mall. Touristy, but "
        "genuinely nice to walk at night. Come for the bars and the people-watching "
        "rather than the shopping.",
    ),
    (
        "Two ITC", "上海国贸中心二期",
        "shopping", None, "fc", 31.1948, 121.4338,
        "The newer, quieter end of Xujiahui. Well-curated, not crowded, good cafés. "
        "Pair it with Grand Gateway across the road if you're actually shopping.",
    ),
    (
        "Grand Gateway", "港汇恒隆广场",
        "shopping", None, "fc", 31.1941, 121.4353,
        "The big Xujiahui workhorse — sits right on top of the metro interchange. "
        "Everything's here, nothing's special. Good for a top-up run.",
    ),
    (
        "The Louis (big LV boat)", "路易号",
        "shopping", None, "jingan", 31.2291, 121.4579,
        "The LV ship on Nanjing West Road — a full-size boat as a store, with a café "
        "and exhibition upstairs. Worth it for the photo even if you buy nothing. "
        "Book the café slot in advance.",
    ),
    (
        "North Bund", "北外滩",
        "sightseeing", None, "bund", 31.2468, 121.4929,
        "The quieter side of the river with the best single view in the city — "
        "Pudong on one side, the old Bund on the other. Go at dusk and walk the "
        "promenade.",
    ),
    (
        "Yu Garden", "豫园 / 城隍庙",
        "sightseeing", None, "bund", 31.2271, 121.4920,
        "Ming-dynasty garden wrapped in a very busy bazaar. The garden is lovely and "
        "calm; the market around it is chaos. Morning, before the tour groups.",
    ),
    (
        "Wukang Mansion", "武康大楼",
        "sightseeing", None, "fc", 31.2096, 121.4371,
        "The wedge-shaped 1924 building at the fork — the most photographed corner "
        "in Shanghai. Fifteen minutes of looking, then walk the side streets, which "
        "are the real reason to be here.",
    ),
    (
        "Jing'an Temple", "静安寺",
        "sightseeing", None, "jingan", 31.2236, 121.4451,
        "Working golden temple in the middle of the shopping district, skyscrapers "
        "on all sides. That contrast is the appeal. Quick stop, then straight into "
        "the malls.",
    ),
    (
        "Lujiazui", "陆家嘴",
        "sightseeing", None, "bund", 31.2397, 121.4998,
        "The three towers — Shanghai Tower, Jin Mao, SWFC — plus the Pearl. Do the "
        "sky-walk circle between them at night. Shanghai Tower deck if it's clear.",
    ),
]


def as_dicts():
    """PLACES as a list of dicts, numbered 1..n in zone order for map labels."""
    keys = ("name", "name_zh", "category", "subcategory", "zone", "lat", "lng", "description")
    rows = [dict(zip(keys, p)) for p in PLACES]
    zone_order = list(ZONES)
    rows.sort(key=lambda r: (zone_order.index(r["zone"]), r["category"], r["name"]))
    for i, r in enumerate(rows, 1):
        r["n"] = i
    return rows
