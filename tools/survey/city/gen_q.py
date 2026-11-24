# python3 gen_q.py slug -> q/<slug>/points.json  (как pilot/gen.py, с упрощением: реже в частном секторе и промзонах)
import json, math, sys, collections
from shapely import wkt
from shapely.geometry import Polygon, Point, LineString, box
slug = sys.argv[1]; D = json.load(open("q/%s/district.json" % slug))
g = wkt.loads(D["wkt"])
lat0 = sum(p[0] for p in D["poly"]) / len(D["poly"])
COS = math.cos(math.radians(lat0)); MLAT = 111218.12; MLON = MLAT * COS
def m(lat, lon): return (lon * MLON, lat * MLAT)
def ll(x, y): return (y / MLAT, x / MLON)
poly = Polygon([m(la, lo) for la, lo in D["poly"]]); 
pts = []
def add(kind, x, y, **kw):
    la, lo = ll(x, y); pts.append(dict(id="", kind=kind, lat=round(la, 6), lon=round(lo, 6), **kw))
def bearing(ax, ay, bx, by): return round(math.degrees(math.atan2(bx - ax, by - ay)) % 360)
SMALL = {"garage", "garages", "shed", "barn", "hut", "roof", "greenhouse", "house", "detached", "construction", "industrial", "warehouse", "hangar", "farm_auxiliary", "service", "storage_tank"}
B = []
for b in D["buildings"]:
    bt = b["tags"].get("building", "yes")
    B.append((b, bt, Polygon([m(la, lo) for la, lo in b["pts"]])))
bpts = [Point(*m(b["lat"], b["lon"])) for b, _, _ in B]
# 1. спутник: сетка 190x95 м, только клетки с домами
SX, SY = 190.0, 95.0
minx, miny, maxx, maxy = poly.bounds
y = miny + SY / 2
while y < maxy:
    x = minx + SX / 2
    while x < maxx:
        cell = box(x - SX / 2, y - SY / 2, x + SX / 2, y + SY / 2)
        n = sum(1 for p in bpts if cell.contains(p))
        if cell.intersects(poly) and n >= 2: add("A", x, y, zoom=19)
        x += SX
    y += SY
roads = []
for r in D["roads"]:
    roads.append((r, LineString([m(la, lo) for la, lo in r["pts"]])))
# 2. панорамы на крупные здания Т1 (не мелочь и не пром.), с ближайших дорог, до 70 м
pano = []
for b, bt, bp in B:
    if bt in SMALL or b["area"] < 250: continue
    c = bp.centroid
    tall = bt in ("apartments", "residential", "dormitory") or b["area"] > 600
    seen = []
    cands = []
    for r, ls in roads:
        d = ls.distance(bp)
        if d > 70: continue
        q = ls.interpolate(ls.project(c)); cands.append((d, q.x, q.y))
    cands.sort(key=lambda t: t[0])
    for d, qx, qy in cands:
        ang = math.atan2(qx - c.x, qy - c.y)
        if any(abs((ang - a + math.pi) % (2 * math.pi) - math.pi) < math.radians(70) for a in seen): continue
        seen.append(ang)
        pano.append(dict(x=qx, y=qy, h=bearing(qx, qy, c.x, c.y), pitch=14 if tall else 6, bid=b["id"], why="здание"))
        if len(seen) >= (3 if tall else 2): break
# 3. улицы: главные каждые 60 м на обе стороны; жилые 90 м (многоэтажки) или 110 м (частный сектор/промзона), поочерёдно
def local_small_share(q):
    near = [bt for (b, bt, bp), p in zip(B, bpts) if (p.x - q.x) ** 2 + (p.y - q.y) ** 2 < 60 ** 2]
    if len(near) < 3: return 1.0
    return sum(1 for t in near if t in SMALL or t == "yes") / len(near)
for r, ls in roads:
    hw = r["hw"]
    if hw in ("pedestrian",): continue
    L = ls.length; s = 20.0; k = 0
    while s < L - 10:
        q = ls.interpolate(s); q2 = ls.interpolate(min(L, s + 3))
        if poly.buffer(30).contains(q):
            fwd = bearing(q.x, q.y, q2.x, q2.y)
            main = hw in ("primary", "secondary", "tertiary", "trunk")
            if main:
                for side in (90, 270): pano.append(dict(x=q.x, y=q.y, h=(fwd + side) % 360, pitch=6, why="главная улица"))
            else:
                pano.append(dict(x=q.x, y=q.y, h=(fwd + (90 if k % 2 == 0 else 270)) % 360, pitch=4, why="частный сектор" if local_small_share(q) > .7 else "жилая"))
        sm = (not hw in ("primary", "secondary", "tertiary", "trunk")) and local_small_share(q) > .7
        s += 60.0 if hw in ("primary", "secondary", "tertiary", "trunk") else (110.0 if sm else 90.0); k += 1
kept = []
for p in pano:
    if any(math.hypot(p["x"] - q["x"], p["y"] - q["y"]) < 12 and abs((p["h"] - q["h"] + 180) % 360 - 180) < 40 for q in kept): continue
    kept.append(p)
for p in kept:
    add("P", p["x"], p["y"], heading=int(p["h"]), pitch=p["pitch"], why=p["why"], **({"bid": p["bid"]} if "bid" in p else {}))
A = [p for p in pts if p["kind"] == "A"]; P = [p for p in pts if p["kind"] == "P"]
P.sort(key=lambda p: (round(p["lat"] / 0.0012), p["lon"] if round(p["lat"] / 0.0012) % 2 == 0 else -p["lon"]))
pre = {"sosnivskyi": "S"}.get(slug, slug[:1].upper())
for i, p in enumerate(A): p["id"] = "A%03d" % (i + 1)
for i, p in enumerate(P): p["id"] = "P%04d" % (i + 1)
for p in A: p["url"] = "https://www.google.com/maps/@?api=1&map_action=map&center=%.6f,%.6f&zoom=19&basemap=satellite" % (p["lat"], p["lon"])
for p in P: p["url"] = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=%.6f,%.6f&heading=%d&pitch=%d&fov=100" % (p["lat"], p["lon"], p["heading"], p["pitch"])
json.dump(A + P, open("q/%s/points.json" % slug, "w"), ensure_ascii=False, indent=0)
print(slug, "спутник:", len(A), "панорамы:", len(P), dict(collections.Counter(p["why"] for p in P)))
