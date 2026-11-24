# Составляет список точек съёмки для пилотного района -> points.json
import json, math
from shapely.geometry import Polygon, Point, LineString, box
D = json.load(open("district.json"))
COS = math.cos(math.radians(49.455)); MLAT = 111218.12; MLON = MLAT * COS
def m(lat, lon): return (lon * MLON, lat * MLAT)            # метры (x на восток, y на север)
def ll(x, y): return (y / MLAT, x / MLON)
poly = Polygon([m(la, lo) for la, lo in D["poly"]])
HOME = m(49.4553, 32.0061)
def bearing(ax, ay, bx, by): return round(math.degrees(math.atan2(bx - ax, by - ay)) % 360)
pts = []
def add(kind, x, y, **kw):
    la, lo = ll(x, y)
    pts.append(dict(id="", kind=kind, lat=round(la, 6), lon=round(lo, 6), **kw))

# 1. Вид сверху: сетка кадров на зуме 19 (кадр ~210x110 м даже в маленьком окне)
SX, SY = 190.0, 95.0
minx, miny, maxx, maxy = poly.bounds
bpts = [Point(*m(b["lat"], b["lon"])) for b in D["buildings"]]
y = miny + SY / 2
while y < maxy:
    x = minx + SX / 2
    while x < maxx:
        cell = box(x - SX / 2, y - SY / 2, x + SX / 2, y + SY / 2)
        if cell.intersects(poly) and any(cell.contains(p) for p in bpts):
            add("A", x, y, zoom=19)
        x += SX
    y += SY

# дороги в метрах
roads = []
for r in D["roads"]:
    if r["hw"] in ("footway",): continue
    ls = LineString([m(la, lo) for la, lo in r["pts"]])
    roads.append((r, ls))
def nearest_road_point(px, py, maxd, kinds=None):
    best = None
    P = Point(px, py)
    for r, ls in roads:
        if kinds and r["hw"] not in kinds: continue
        d = ls.distance(P)
        if d <= maxd and (best is None or d < best[0]):
            q = ls.interpolate(ls.project(P))
            best = (d, q.x, q.y, r)
    return best

# 2. Панорамы на крупные здания: с ближайшей дороги, лицом к зданию; у многоэтажек ещё с другой стороны (двор)
SMALL = {"garage", "garages", "shed", "barn", "hut", "roof", "greenhouse", "house", "detached", "construction"}
pano = []
for b in D["buildings"]:
    bt = b["tags"].get("building", "yes")
    if bt in SMALL or b["area"] < 220: continue
    bp = Polygon([m(la, lo) for la, lo in b["pts"]])
    c = bp.centroid
    tall = bt in ("apartments", "residential") or b["area"] > 600
    seen_sides = []
    # точки на дорогах вокруг здания, до 70 м, по разные стороны
    cands = []
    for r, ls in roads:
        d = ls.distance(bp)
        if d > 70: continue
        q = ls.interpolate(ls.project(c))
        cands.append((d, q.x, q.y, r))
    cands.sort(key=lambda t: t[0])
    for d, qx, qy, r in cands:
        ang = math.atan2(qx - c.x, qy - c.y)
        if any(abs((ang - a + math.pi) % (2 * math.pi) - math.pi) < math.radians(70) for a in seen_sides): continue
        seen_sides.append(ang)
        pano.append(dict(x=qx, y=qy, h=bearing(qx, qy, c.x, c.y), pitch=14 if tall else 6, bid=b["id"], why="здание"))
        if len(seen_sides) >= (3 if tall else 2): break
# 3. Улицы частного сектора: каждые 90 м, поочерёдно влево/вправо; у дома героя — каждые 35 м на обе стороны
for r, ls in roads:
    if r["hw"] not in ("residential", "tertiary", "secondary", "primary", "unclassified", "living_street"): continue
    L = ls.length
    s = 20.0; k = 0
    while s < L - 10:
        q = ls.interpolate(s); q2 = ls.interpolate(min(L, s + 3))
        if poly.buffer(30).contains(q):
            fwd = bearing(q.x, q.y, q2.x, q2.y)
            near_home = math.hypot(q.x - HOME[0], q.y - HOME[1]) < 160
            main = r["hw"] in ("primary", "secondary", "tertiary")
            if near_home:
                for side in (90, 270): pano.append(dict(x=q.x, y=q.y, h=(fwd + side) % 360, pitch=4, why="у дома героя"))
            elif main:
                for side in (90, 270): pano.append(dict(x=q.x, y=q.y, h=(fwd + side) % 360, pitch=6, why="главная улица"))
            else:
                pano.append(dict(x=q.x, y=q.y, h=(fwd + (90 if k % 2 == 0 else 270)) % 360, pitch=4, why="частный сектор"))
        step = 35.0 if math.hypot(q.x - HOME[0], q.y - HOME[1]) < 160 else (60.0 if r["hw"] in ("primary", "secondary", "tertiary") else 90.0)
        s += step; k += 1
# убрать почти одинаковые точки (ближе 12 м и взгляд в ту же сторону)
kept = []
for p in pano:
    if any(math.hypot(p["x"] - q["x"], p["y"] - q["y"]) < 12 and abs((p["h"] - q["h"] + 180) % 360 - 180) < 40 for q in kept): continue
    kept.append(p)
for p in kept:
    add("P", p["x"], p["y"], heading=int(p["h"]), pitch=p["pitch"], why=p["why"], **({"bid": p["bid"]} if "bid" in p else {}))
# нумерация: сначала вид сверху, потом панорамы по маршруту (с запада на восток полосами)
A = [p for p in pts if p["kind"] == "A"]; P = [p for p in pts if p["kind"] == "P"]
P.sort(key=lambda p: (round(p["lat"] / 0.0012), p["lon"] if round(p["lat"] / 0.0012) % 2 == 0 else -p["lon"]))
for i, p in enumerate(A): p["id"] = "A%03d" % (i + 1)
for i, p in enumerate(P): p["id"] = "P%04d" % (i + 1)
for p in A:
    p["url"] = "https://www.google.com/maps/@?api=1&map_action=map&center=%.6f,%.6f&zoom=19&basemap=satellite" % (p["lat"], p["lon"])
for p in P:
    p["url"] = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=%.6f,%.6f&heading=%d&pitch=%d&fov=100" % (p["lat"], p["lon"], p["heading"], p["pitch"])
json.dump(A + P, open("points.json", "w"), ensure_ascii=False, indent=0)
import collections
print("вид сверху:", len(A), " панорамы:", len(P), collections.Counter(p["why"] for p in P))
