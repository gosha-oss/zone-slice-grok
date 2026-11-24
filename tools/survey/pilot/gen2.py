# Досъёмка: добавляет в points.json серию D — недостающие стороны крупных домов
import json, math, collections
from shapely.geometry import Polygon, Point, LineString
D = json.load(open("district.json"))
L = {json.loads(l)["id"]: json.loads(l) for l in open("log.jsonl")}
pts = json.load(open("points.json"))
pts = [p for p in pts if p["kind"] != "D"]
COS = math.cos(math.radians(49.455)); MLAT = 111218.12; MLON = MLAT * COS
def m(la, lo): return (lo * MLON, la * MLAT)
def ll(x, y): return (y / MLAT, x / MLON)
def bearing(ax, ay, bx, by): return round(math.degrees(math.atan2(bx - ax, by - ay)) % 360)
def sector(a): return int(((a + 45) % 360) // 90)   # 0=С 1=В 2=Ю 3=З
NAME = ["С", "В", "Ю", "З"]
SMALL = {"garage","garages","shed","barn","hut","roof","greenhouse","house","detached","construction"}
B = {b["id"]: b for b in D["buildings"]}
big = [b for b in D["buildings"] if b["tags"].get("building","yes") not in SMALL and b["area"] >= 220]
cov = collections.defaultdict(set)
for p in pts:
    r = L.get(p["id"])
    if p.get("bid") and r and r["status"] == "ok":
        la = r.get("real_lat") or p["lat"]; lo = r.get("real_lon") or p["lon"]
        b = B[p["bid"]]; cx, cy = m(b["lat"], b["lon"]); x, y = m(la, lo)
        if math.hypot(x - cx, y - cy) <= 70:
            cov[p["bid"]].add(sector(bearing(cx, cy, x, y)))
# кандидаты на дорогах
cands = []
for r in D["roads"]:
    if r["hw"] == "footway": continue
    ls = LineString([m(la, lo) for la, lo in r["pts"]])
    s = 0
    while s < ls.length:
        q = ls.interpolate(s); cands.append((q.x, q.y)); s += 10
    q = ls.interpolate(ls.length); cands.append((q.x, q.y))
new = []; skipped = []
def prio(b):
    t = b["tags"]; lv = t.get("building:levels")
    return (0 if (lv and int(lv) >= 3) else 1, -b["area"])
for b in sorted(big, key=prio):
    t = b["tags"]; lv = t.get("building:levels")
    tall = bool(lv and int(lv) >= 5) or b["area"] > 600
    need = 3 if tall else 2
    have = cov.get(b["id"], set())
    if len(have) >= need: continue
    cx, cy = m(b["lat"], b["lon"]); bp = Polygon([m(la, lo) for la, lo in b["pts"]])
    best = {}
    for x, y in cands:
        d = bp.distance(Point(x, y))
        if d < 8 or d > 70: continue
        sct = sector(bearing(cx, cy, x, y))
        if sct in have: continue
        if sct not in best or d < best[sct][0]: best[sct] = (d, x, y)
    order = sorted(best.items(), key=lambda kv: kv[1][0])[: need - len(have)]
    if not order: skipped.append(b["id"]); continue
    for sct, (d, x, y) in order:
        new.append(dict(x=x, y=y, h=bearing(x, y, cx, cy), pitch=14 if tall else 6, bid=b["id"], side=NAME[sct]))
# убрать почти одинаковые
kept = []
for p in new:
    if any(math.hypot(p["x"]-q["x"], p["y"]-q["y"]) < 10 and abs((p["h"]-q["h"]+180) % 360 - 180) < 40 for q in kept): continue
    kept.append(p)
kept.sort(key=lambda p: (round(p["y"]/0.0012/MLAT), p["x"] if round(p["y"]/0.0012/MLAT) % 2 == 0 else -p["x"]))
for i, p in enumerate(kept):
    la, lo = ll(p["x"], p["y"])
    pts.append(dict(id="D%03d" % (i+1), kind="D", lat=round(la,6), lon=round(lo,6), heading=int(p["h"]), pitch=p["pitch"], why="досъёмка", bid=p["bid"],
        url="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=%.6f,%.6f&heading=%d&pitch=%d&fov=100" % (la, lo, p["h"], p["pitch"])))
json.dump(pts, open("points.json", "w"), ensure_ascii=False, indent=0)
print("крупных", len(big), "нужна досъёмка домов", len({p['bid'] for p in kept}), "точек D", len(kept), "без кандидатов", len(skipped))
