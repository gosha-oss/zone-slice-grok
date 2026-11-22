#!/usr/bin/env python3
"""
build_city.py — собирает данные города для игры из открытых карт.

Вход (папка SRC):  osm_*.json.gz (OpenStreetMap, Overpass JSON), N49E031.hgt.gz, N49E032.hgt.gz (высоты SRTM)
Выход (папка OUT): city.json, terrain.bin, geo.bin, pois.json, map.png

Запуск:  python3 tools/build_city.py SRC OUT
Данные карты: © участники OpenStreetMap (ODbL). Высоты: NASA SRTM.
"""
import sys, os, json, gzip, math, struct, glob
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else "city"
os.makedirs(OUT, exist_ok=True)

# ---------- система координат ----------
S, W, N, E = 49.34, 31.90, 49.53, 32.20
LAT0, LON0 = (S + N) / 2, (W + E) / 2
_p = math.radians(LAT0)
MLAT = 111132.92 - 559.82 * math.cos(2 * _p) + 1.175 * math.cos(4 * _p)
MLON = 111412.84 * math.cos(_p) - 93.5 * math.cos(3 * _p)
CHUNK, CELL, CPC = 256.0, 8.0, 32
U = 0.0625

def proj(lat, lon):
    """широта/долгота -> метры: x на восток, z на юг"""
    return (lon - LON0) * MLON, -(lat - LAT0) * MLAT

NX = int(math.ceil((E - W) * MLON / CHUNK))
NZ = int(math.ceil((N - S) * MLAT / CHUNK))
X0, Z0 = -NX * CHUNK / 2, -NZ * CHUNK / 2
GW, GH = NX * CPC + 1, NZ * CPC + 1
print(f"город {NX}x{NZ} квадратов, сетка {GW}x{GH}, начало {X0},{Z0}")

# ---------- OSM ----------
nodes, ways, rels, tagged_nodes = {}, {}, [], []
pbf = sorted(glob.glob(os.path.join(SRC, "*.osm.pbf")))
if pbf:
    import osmium
    AREA_KEYS = ("natural", "landuse", "waterway", "building", "leisure", "amenity", "place")
    M = 0.01
    def inside(lat, lon):
        return S - M <= lat <= N + M and W - M <= lon <= E + M
    need_ways = set()
    class RelPass(osmium.SimpleHandler):
        def relation(self, r):
            t = dict(r.tags)
            if t.get("type") == "multipolygon" and any(k in t for k in AREA_KEYS):
                mem = [{"type": {"w": "way", "n": "node", "r": "relation"}[m.type], "ref": m.ref, "role": m.role} for m in r.members]
                rels.append({"id": r.id, "tags": t, "members": mem})
                for m in mem:
                    if m["type"] == "way":
                        need_ways.add(m["ref"])
    RelPass().apply_file(pbf[0])
    class MainPass(osmium.SimpleHandler):
        def node(self, n):
            if len(n.tags) and inside(n.location.lat, n.location.lon):
                nodes[n.id] = proj(n.location.lat, n.location.lon)
                tagged_nodes.append({"id": n.id, "tags": dict(n.tags)})
        def way(self, w):
            locs = [(nd.ref, nd.location) for nd in w.nodes if nd.location.valid()]
            if not locs:
                return
            if w.id not in need_ways:
                if not len(w.tags) or not any(inside(l.lat, l.lon) for _, l in locs):
                    return
            for ref, l in locs:
                if ref not in nodes:
                    nodes[ref] = proj(l.lat, l.lon)
            ways[w.id] = {"id": w.id, "nodes": [ref for ref, _ in locs], "tags": dict(w.tags)}
    MainPass().apply_file(pbf[0], locations=True)
    # связи, у которых ни одна линия не попала в город, не нужны
    def touches(r):
        for m in r["members"]:
            w_ = ways.get(m["ref"]) if m["type"] == "way" else None
            if w_ and any(X0 - 500 < nodes[n][0] < -X0 + 500 and Z0 - 500 < nodes[n][1] < -Z0 + 500 for n in w_["nodes"]):
                return True
        return False
    rels = [r for r in rels if touches(r)]
    print("прочитан", os.path.basename(pbf[0]))
else:
    for path in sorted(glob.glob(os.path.join(SRC, "osm_*.json.gz"))):
        with gzip.open(path, "rt", encoding="utf-8") as f:
            data = json.load(f)
        for el in data["elements"]:
            t = el["type"]
            if t == "node":
                if el["id"] not in nodes:
                    nodes[el["id"]] = proj(el["lat"], el["lon"])
                if "tags" in el:
                    tagged_nodes.append(el)
            elif t == "way":
                old = ways.get(el["id"])
                if old is None or ("tags" in el and "tags" not in old):
                    ways[el["id"]] = el
            elif t == "relation":
                rels.append(el)
        print("прочитан", os.path.basename(path), len(data["elements"]))
        del data
    seen = set()
    rels = [r for r in rels if not (r["id"] in seen or seen.add(r["id"]))]
    seen = set()
    tagged_nodes = [n for n in tagged_nodes if not (n["id"] in seen or seen.add(n["id"]))]
print(f"узлов {len(nodes)}, линий {len(ways)}, связей {len(rels)}")

def way_pts(w):
    return [nodes[n] for n in w["nodes"] if n in nodes]

def stitch(way_ids):
    """собрать замкнутые кольца из кусочков линий"""
    segs = [list(ways[i]["nodes"]) for i in way_ids if i in ways and len(ways[i]["nodes"]) > 1]
    rings = []
    while segs:
        cur = segs.pop()
        changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for k, s in enumerate(segs):
                if s[0] == cur[-1]:
                    cur += s[1:]; segs.pop(k); changed = True; break
                if s[-1] == cur[-1]:
                    cur += s[-2::-1]; segs.pop(k); changed = True; break
                if s[-1] == cur[0]:
                    cur = s[:-1] + cur; segs.pop(k); changed = True; break
                if s[0] == cur[0]:
                    cur = s[:0:-1] + cur; segs.pop(k); changed = True; break
        if len(cur) >= 4 and cur[0] == cur[-1]:
            rings.append([nodes[n] for n in cur if n in nodes])
    return rings

def rel_rings(r):
    outer = [m["ref"] for m in r.get("members", []) if m["type"] == "way" and m.get("role") in ("outer", "")]
    inner = [m["ref"] for m in r.get("members", []) if m["type"] == "way" and m.get("role") == "inner"]
    return stitch(outer), stitch(inner)

# ---------- рельеф ----------
def load_hgt(name):
    with gzip.open(os.path.join(SRC, name + ".hgt.gz"), "rb") as f:
        return np.frombuffer(f.read(), dtype=">i2").reshape(3601, 3601).astype(np.float32)

dem = np.hstack([load_hgt("N49E031")[:, :-1], load_hgt("N49E032")])   # долгота 31..33, широта 50..49
dem[dem < -1000] = np.nan
if np.isnan(dem).any():
    dem = np.where(np.isnan(dem), np.nanmedian(dem), dem)
gx = X0 + np.arange(GW) * CELL
gz = Z0 + np.arange(GH) * CELL
lon = LON0 + gx / MLON
lat = LAT0 - gz / MLAT
rows = (50.0 - lat) * 3600.0
cols = (lon - 31.0) * 3600.0
RR, CC = np.meshgrid(rows, cols, indexing="ij")
raw = ndimage.map_coordinates(dem, [RR, CC], order=1, mode="nearest").astype(np.float32)
del dem, RR, CC
H = ndimage.gaussian_filter(raw, 3.0)        # сгладить шум домов и деревьев в данных высот
HR = ndimage.gaussian_filter(H, 2.0)         # ещё более гладкое поле — профиль дорог
print("высоты:", float(raw.min()), float(raw.max()))

def gpos(x, z):
    return (x - X0) / CELL, (z - Z0) / CELL

def sample(grid, xs, zs):
    fi = (np.asarray(xs) - X0) / CELL
    fj = (np.asarray(zs) - Z0) / CELL
    return ndimage.map_coordinates(grid, [fj, fi], order=1, mode="nearest")

def sample_tri(grid, xs, zs):
    """высота по тем же треугольникам, что рисует игра"""
    fi = np.clip((np.asarray(xs, dtype=np.float64) - X0) / CELL, 0, GW - 1.001)
    fj = np.clip((np.asarray(zs, dtype=np.float64) - Z0) / CELL, 0, GH - 1.001)
    i = np.floor(fi).astype(int); j = np.floor(fj).astype(int)
    fx = fi - i; fz = fj - j
    h00 = grid[j, i]; h10 = grid[j, i + 1]; h01 = grid[j + 1, i]; h11 = grid[j + 1, i + 1]
    a = h00 + fx * (h10 - h00) + fz * (h01 - h00)
    b = h11 + (1 - fx) * (h01 - h11) + (1 - fz) * (h10 - h11)
    return np.where(fx + fz <= 1.0, a, b)

# ---------- покрытие земли ----------
def to_px(pts):
    return [((x - X0) / CELL, (z - Z0) / CELL) for x, z in pts]

COVER_RULES = [  # (класс, порядок рисования), позже = поверх
    (5, lambda t: t.get("landuse") == "residential"),
    (7, lambda t: t.get("landuse") in ("farmland", "farmyard", "orchard", "allotments", "vineyard", "greenhouse_horticulture")),
    (6, lambda t: t.get("landuse") in ("industrial", "railway", "garages", "construction", "brownfield", "landfill", "quarry", "military", "depot")),
    (9, lambda t: t.get("landuse") in ("commercial", "retail", "education", "institutional") or t.get("amenity") in ("parking", "school", "university", "hospital", "marketplace") or t.get("leisure") in ("pitch", "stadium", "sports_centre", "track", "playground")),
    (1, lambda t: t.get("landuse") in ("grass", "meadow", "recreation_ground", "village_green", "greenfield", "flowerbed") or t.get("leisure") in ("park", "garden", "golf_course", "dog_park") or t.get("natural") in ("grassland", "heath", "scrub", "wetland")),
    (8, lambda t: t.get("landuse") == "cemetery" or t.get("amenity") == "grave_yard"),
    (2, lambda t: t.get("landuse") == "forest" or t.get("natural") == "wood"),
    (4, lambda t: t.get("natural") in ("sand", "beach", "shingle") or t.get("leisure") == "beach_resort"),
    (3, lambda t: t.get("natural") == "water" or t.get("waterway") in ("riverbank", "dock") or t.get("landuse") in ("reservoir", "basin")),
]
cover = np.zeros((GH, GW), dtype=np.uint8)
area_ways = [w for w in ways.values() if "tags" in w and len(w["nodes"]) >= 4 and w["nodes"][0] == w["nodes"][-1]]
area_rels = [r for r in rels if r.get("tags", {}).get("type") in ("multipolygon", "boundary")]
for cls, rule in COVER_RULES:
    img = Image.new("L", (GW, GH), 0)
    d = ImageDraw.Draw(img)
    for r in area_rels:
        if rule(r["tags"]):
            outer, inner = rel_rings(r)
            for ring in outer:
                if len(ring) >= 3: d.polygon(to_px(ring), fill=1)
            for ring in inner:
                if len(ring) >= 3: d.polygon(to_px(ring), fill=0)
    for w in area_ways:
        if rule(w["tags"]) and "building" not in w["tags"]:
            p = way_pts(w)
            if len(p) >= 3: d.polygon(to_px(p), fill=1)
    m = np.asarray(img, dtype=bool)
    cover[m] = cls
    print("покрытие", cls, int(m.sum()))
# узкие реки и каналы линиями
img = Image.new("L", (GW, GH), 0); d = ImageDraw.Draw(img)
for w in ways.values():
    t = w.get("tags", {})
    if t.get("waterway") in ("river", "canal") and t.get("tunnel") is None:
        p = way_pts(w)
        if len(p) >= 2: d.line(to_px(p), fill=1, width=2 if t["waterway"] == "river" else 1)
cover[np.asarray(img, dtype=bool)] = 3

# большая вода по карте высот: водохранилище в данных SRTM идеально ровное
def flat_water(raw_):
    r5 = np.round(raw_).astype(np.int32)
    vals, counts = np.unique(r5, return_counts=True)
    lvl = int(vals[np.argmax(counts)])
    rng = ndimage.maximum_filter(raw_, 5) - ndimage.minimum_filter(raw_, 5)
    m = (np.abs(raw_ - lvl) < 0.6) & (rng < 0.3)
    m = ndimage.binary_opening(m, iterations=3)
    lab_, n_ = ndimage.label(m)
    if n_ == 0:
        return m, lvl
    sizes_ = ndimage.sum(m, lab_, np.arange(1, n_ + 1))
    keep = np.concatenate([[False], sizes_ > 4000])       # только большие водоёмы (> ~25 га)
    return keep[lab_], lvl
dem_water, dem_level = flat_water(raw)
osm_water = int((cover == 3).sum())
cover[dem_water & (cover != 3)] = 3
print("вода: по OSM", osm_water, "клеток, вместе с картой высот", int((cover == 3).sum()), "уровень", dem_level)

# ---------- дороги ----------
ROAD = {  # highway -> (класс, ширина)
    "motorway": (0, 14), "trunk": (0, 13), "primary": (0, 11), "motorway_link": (0, 7), "trunk_link": (0, 7), "primary_link": (0, 7),
    "secondary": (1, 9.5), "tertiary": (1, 8), "secondary_link": (1, 6.5), "tertiary_link": (1, 6),
    "residential": (2, 6), "unclassified": (2, 6), "living_street": (2, 5),
    "service": (3, 3.6), "track": (4, 3.2),
    "footway": (5, 1.8), "path": (5, 1.5), "cycleway": (5, 2.0), "steps": (5, 2.0), "bridleway": (5, 1.5),
    "pedestrian": (6, 5),
}
LIFT = {0: 0.10, 1: 0.10, 2: 0.10, 3: 0.10, 4: 0.08, 5: 0.15, 6: 0.13, 7: 0.19}
UNPAVED = ("unpaved", "ground", "dirt", "gravel", "sand", "earth", "mud", "grass", "compacted", "fine_gravel")
STEP = 5.0

def resample(pts, step):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dz)
        if L < 0.05:
            continue
        n = max(1, int(math.ceil(L / step)))
        for k in range(1, n + 1):
            out.append((a[0] + dx * k / n, a[1] + dz * k / n))
    return out

def num_i(v):
    try:
        return int(str(v).split(";")[0])
    except (ValueError, TypeError):
        return 0

roads = []   # dict(cls, w, flags, pts[(x,z)], bridge)
for w in ways.values():
    t = w.get("tags")
    if not t:
        continue
    cls = width = None
    if t.get("highway") in ROAD:
        if t.get("area") == "yes" or t.get("tunnel") in ("yes", "culvert") or t.get("indoor") == "yes":
            continue
        cls, width = ROAD[t["highway"]]
        if cls <= 2:
            try:
                width = max(width, float(t.get("lanes", "0").split(";")[0]) * 3.4)
            except ValueError:
                pass
            if t.get("surface") in UNPAVED:
                cls = 4
        if t.get("highway") == "service" and t.get("service") in ("driveway", "parking_aisle", "alley"):
            width = 3.0
    elif t.get("railway") in ("rail", "tram", "light_rail", "narrow_gauge") and t.get("tunnel") != "yes":
        cls, width = 7, 2.6
    if cls is None:
        continue
    p = way_pts(w)
    if len(p) < 2:
        continue
    bridge = t.get("bridge") not in (None, "no")
    sf = t.get("surface", "")
    surf = 1 if sf in ("paving_stones", "sett", "cobblestone", "unhewn_cobblestone", "bricks") or (cls == 6 and not sf) else (2 if sf.startswith("concrete") else 0)
    node_s = [0.0]
    for a_, b_ in zip(p, p[1:]):
        node_s.append(node_s[-1] + math.hypot(b_[0] - a_[0], b_[1] - a_[1]))
    roads.append({"cls": cls, "w": float(width), "bridge": bridge, "pts": resample(p, STEP if cls != 5 else 4.0),
                  "name": t.get("name", ""), "ref": t.get("highway", t.get("railway")), "id": w["id"], "surf": surf,
                  "nids": [n for n in w["nodes"] if n in nodes], "node_s": node_s, "lanes_tag": num_i(t.get("lanes")),
                  "oneway": t.get("oneway") in ("yes", "1", "true") or t.get("junction") == "roundabout"})
print("дорог:", len(roads))

# высоты дорог
for r in roads:
    xs = [p[0] for p in r["pts"]]; zs = [p[1] for p in r["pts"]]
    r["hr"] = sample(HR, xs, zs)
# мосты: ровная линия между концами (плюс небольшой горб)
for r in roads:
    if r["bridge"]:
        n = len(r["hr"])
        a, b = float(r["hr"][0]), float(r["hr"][-1])
        tt = np.linspace(0, 1, n)
        r["hr"] = a + (b - a) * tt

# подогнать землю под дороги: под полотном земля не выше дороги
Hf = H.copy()
protect = np.zeros((GH, GW), dtype=bool)
sx, sz, sh, sw = [], [], [], []
for r in roads:
    if r["bridge"] or r["cls"] == 5:
        continue
    sx += [p[0] for p in r["pts"]]; sz += [p[1] for p in r["pts"]]
    sh += list(r["hr"]); sw += [r["w"] * 0.5] * len(r["pts"])
sx = np.array(sx); sz = np.array(sz); sh = np.array(sh, dtype=np.float32); sw = np.array(sw, dtype=np.float32)
fi = (sx - X0) / CELL; fj = (sz - Z0) / CELL
bi = np.round(fi).astype(int); bj = np.round(fj).astype(int)
flat = Hf.ravel(); pflat = protect.ravel()
K = 3
for dj in range(-K, K + 1):
    for di in range(-K, K + 1):
        ii = bi + di; jj = bj + dj
        dist = np.hypot((ii - fi) * CELL, (jj - fj) * CELL)
        ok = (ii >= 0) & (jj >= 0) & (ii < GW) & (jj < GH) & (dist <= sw + 11.5)
        lin = (jj[ok] * GW + ii[ok])
        np.minimum.at(flat, lin, sh[ok] - 0.05)
        okp = ok & (dist <= sw + 5.0)
        pflat[jj[okp] * GW + ii[okp]] = True
print("земля подогнана под дороги, точек:", len(sx))

# ---------- вода ----------
water = (cover == 3) & ~protect
cover[(cover == 3) & protect] = 0
lab, nlab = ndimage.label(water)
water_level_grid = np.full((GH, GW), np.nan, dtype=np.float32)
main_level = 0.0
if nlab:
    idxs = np.arange(1, nlab + 1)
    med = ndimage.median(raw, lab, idxs)
    sizes = ndimage.sum(water, lab, idxs)
    main_level = float(med[int(np.argmax(sizes))])
    lv = np.concatenate([[np.nan], med]).astype(np.float32)
    water_level_grid = lv[lab]
    depth = np.where(sizes > 20000, 3.0, 1.5)
    dp = np.concatenate([[0], depth]).astype(np.float32)[lab]
    Hf = np.where(water, np.minimum(Hf, water_level_grid - dp), Hf)
    # берег: земля рядом с водой не ниже уровня воды
    near = ndimage.binary_dilation(water, iterations=1) & ~water
    lvl_near = ndimage.grey_dilation(np.nan_to_num(water_level_grid, nan=-9999), size=3)
    Hf = np.where(near & (lvl_near > -9000), np.maximum(Hf, lvl_near + 0.25), Hf)
print("уровень главной воды (над морем):", main_level, "водоёмов:", nlab)
YOFF = main_level          # в игре высота 0 = уровень Днепра
Hf = Hf - YOFF
for r in roads:
    r["y"] = np.asarray(r["hr"], dtype=np.float64) - YOFF + LIFT[r["cls"]]
    if r["cls"] == 5 and not r["bridge"]:
        # тропы и тротуары лежат на готовой земле
        xs = [p[0] for p in r["pts"]]; zs = [p[1] for p in r["pts"]]
        r["y"] = sample_tri(Hf, xs, zs) + LIFT[5]
    if r["bridge"]:
        r["y"] = r["y"] + 0.35

# ---------- дома ----------
def poly_area2(p):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(p, p[1:] + p[:1]))

def clean_ring(p):
    if len(p) > 1 and p[0] == p[-1]:
        p = p[:-1]
    out = []
    for q in p:
        if not out or math.hypot(q[0] - out[-1][0], q[1] - out[-1][1]) > 0.25:
            out.append(q)
    if len(out) > 2 and math.hypot(out[0][0] - out[-1][0], out[0][1] - out[-1][1]) <= 0.25:
        out.pop()
    while len(out) > 250:
        out = out[::2]
    return out

def num(s):
    try:
        return float(str(s).replace(",", ".").replace("m", "").split(";")[0].strip())
    except ValueError:
        return None

HOUSE = ("house", "detached", "semidetached_house", "bungalow", "cabin", "terrace", "farm", "static_caravan")
APART = ("apartments", "residential", "dormitory", "hotel")
SMALL = ("garage", "garages", "shed", "hut", "carport", "kiosk", "service", "toilets", "roof", "greenhouse", "barn", "cowshed", "sty", "stable", "container", "guardhouse")
INDUS = ("industrial", "warehouse", "factory", "manufacture", "hangar", "storage_tank", "silo", "transformer_tower")
COMM = ("retail", "commercial", "supermarket", "office", "shop", "mall")
PUBLIC = ("school", "kindergarten", "hospital", "university", "college", "public", "government", "civic", "train_station", "fire_station", "sports_hall", "stadium", "museum", "theatre")
RELIG = ("church", "cathedral", "chapel", "religious", "temple", "mosque", "synagogue", "monastery")

def classify(t, area):
    b = t.get("building", "yes")
    if b in RELIG or t.get("amenity") == "place_of_worship": kind, h = 7, 14.0
    elif b in PUBLIC or t.get("amenity") in ("school", "kindergarten", "hospital", "university", "college", "police", "townhall", "courthouse", "clinic", "fire_station", "theatre", "library"): kind, h = 5, 10.0
    elif b in COMM or "shop" in t or t.get("amenity") in ("restaurant", "cafe", "bank", "fuel", "pharmacy", "bar", "fast_food", "marketplace"): kind, h = 6, (8.0 if area > 1500 else 5.0)
    elif b in INDUS: kind, h = 3, 9.0
    elif b in SMALL: kind, h = 4, 2.8
    elif b in HOUSE: kind, h = 1, 5.5
    elif b in APART: kind, h = (2, 15.8) if area > 250 else (1, 6.0)
    else:
        if area < 45: kind, h = 4, 3.0
        elif area < 230: kind, h = 1, 5.5
        elif area < 700: kind, h = 0, 8.0
        else: kind, h = 0, 11.0
    lv = num(t.get("building:levels")) if "building:levels" in t else None
    hh = num(t.get("height")) if "height" in t else None
    if hh and 1.5 < hh < 200:
        h = hh
    elif lv and 0 < lv < 60:
        h = lv * 3.0 + 0.8
        if lv >= 4 and kind in (0, 1): kind = 2
    return kind, h

buildings = []
def add_building(p, t):
    p = clean_ring(p)
    if len(p) < 3:
        return
    a2 = poly_area2(p)
    if abs(a2) < 8.0:
        return
    if a2 < 0:
        p = p[::-1]
    kind, h = classify(t, abs(a2) / 2)
    xs = [q[0] for q in p]; zs = [q[1] for q in p]
    ys = sample_tri(Hf, xs, zs)
    buildings.append({"kind": kind, "h": h, "pts": p, "base": float(np.mean(ys)), "lo": float(np.min(ys)),
                      "cx": sum(xs) / len(xs), "cz": sum(zs) / len(zs), "tags": t})
for w in area_ways:
    if "building" in w["tags"] and w["tags"]["building"] != "no":
        add_building(way_pts(w), w["tags"])
for r in rels:
    t = r.get("tags", {})
    if "building" in t and t.get("type") == "multipolygon":
        outer, _ = rel_rings(r)
        for ring in outer:
            add_building(ring, t)
print("домов:", len(buildings))

# ---------- заборы ----------
BARRIER_H = {"fence": 1.8, "wall": 2.0, "hedge": 1.2, "retaining_wall": 1.5, "city_wall": 3.0, "guard_rail": 0.8, "handrail": 1.0}
barriers = []
raw_barriers = []
for w in ways.values():
    t = w.get("tags", {})
    if t.get("barrier") in BARRIER_H and "building" not in t:
        ids = [n for n in w["nodes"] if n in nodes]
        if len(ids) >= 2:
            raw_barriers.append((t, ids))
print("заборов на карте:", len(raw_barriers))

# ---------- детали дорог: разметка, бордюры, тротуары, люки, заплаты ----------
import random, zlib
from collections import defaultdict

lines = []          # dict(type, wcm, pts[(x,z)], y[])   type: 0 сплошная, 1 прерывистая, 5 парковка, 10 бордюр
decals = []         # (type, x, z, y, yaw°, уклон м/м, a, b)  type: 1 зебра, 2 стоп-линия, 3 люк, 4 решётка, 5 заплата
local_decals = []   # то же, но из Mapillary (уходит в отдельный файл)

# городская зона: рядом есть дома
bimg = Image.new("L", (GW, GH), 0); bd = ImageDraw.Draw(bimg)
for b in buildings:
    bd.polygon(to_px(b["pts"]), fill=1)
    px_ = gpos(b["cx"], b["cz"]); bd.point(px_, fill=1)
urban = ndimage.binary_dilation(np.asarray(bimg, dtype=bool), iterations=6) | np.isin(cover, (5, 6, 9))
del bimg, bd

# мелкая сетка 3 м: где уже есть тротуары и дома
FR = 3.0
FW_, FH_ = int(NX * CHUNK / FR) + 1, int(NZ * CHUNK / FR) + 1
def fpx(pts):
    return [((x - X0) / FR, (z - Z0) / FR) for x, z in pts]
fimg = Image.new("L", (FW_, FH_), 0); fd = ImageDraw.Draw(fimg)
for r in roads:
    if r["cls"] in (5, 6):
        fd.line(fpx(r["pts"]), fill=1, width=1)
foot_mask = np.asarray(fimg, dtype=bool).copy()
fimg = Image.new("L", (FW_, FH_), 0); fd = ImageDraw.Draw(fimg)
for b in buildings:
    fd.polygon(fpx(b["pts"]), fill=1)
bld_mask = np.asarray(fimg, dtype=bool).copy()
del fimg, fd
def fhit(mask, xs, zs):
    i = np.clip(((np.asarray(xs) - X0) / FR).astype(int), 0, FW_ - 1)
    j = np.clip(((np.asarray(zs) - Z0) / FR).astype(int), 0, FH_ - 1)
    return mask[j, i]

def prep(r):
    """массивы вдоль дороги: X, Z, Y, S (путь), нормаль влево NXl, NZl"""
    if "X" in r:
        return
    X = np.array([p[0] for p in r["pts"]]); Z = np.array([p[1] for p in r["pts"]])
    dx = np.gradient(X) if len(X) > 2 else np.full(len(X), X[-1] - X[0])
    dz = np.gradient(Z) if len(Z) > 2 else np.full(len(Z), Z[-1] - Z[0])
    L = np.hypot(dx, dz); L[L < 1e-6] = 1.0
    r["X"], r["Z"], r["Y"] = X, Z, np.asarray(r["y"], dtype=np.float64)
    r["TX"], r["TZ"] = dx / L, dz / L
    seg = np.hypot(np.diff(X), np.diff(Z))
    r["S"] = np.concatenate([[0.0], np.cumsum(seg)])
    r["L"] = float(r["S"][-1])

def at(r, s):
    """точка на оси дороги: x, z, y, tx, tz"""
    S = r["S"]
    return (float(np.interp(s, S, r["X"])), float(np.interp(s, S, r["Z"])), float(np.interp(s, S, r["Y"])),
            float(np.interp(s, S, r["TX"])), float(np.interp(s, S, r["TZ"])))

def extract(r, s0, s1, off, dy=0.0):
    """кусок линии вдоль дороги со сдвигом влево на off -> pts[(x,z)], ys"""
    S = r["S"]
    ss = np.concatenate([[s0], S[(S > s0 + 0.5) & (S < s1 - 0.5)], [s1]])
    X = np.interp(ss, S, r["X"]); Z = np.interp(ss, S, r["Z"]); Y = np.interp(ss, S, r["Y"]) + dy
    tx = np.interp(ss, S, r["TX"]); tz = np.interp(ss, S, r["TZ"])
    n = np.hypot(tx, tz); n[n < 1e-6] = 1.0
    X = X + (tz / n) * off; Z = Z - (tx / n) * off
    return list(zip(X.tolist(), Z.tolist())), Y

def intervals(L, cuts, minlen):
    ev = sorted((max(0.0, s - rad), min(L, s + rad)) for s, rad in cuts)
    out = []; cur = 0.0
    for a, b in ev:
        if a - cur >= minlen:
            out.append((cur, a))
        cur = max(cur, b)
    if L - cur >= minlen:
        out.append((cur, L))
    return out

def runs(mask, S, minlen, gap):
    """участки, где mask истинна -> [(s0, s1)]"""
    out = []; start = None
    for k in range(len(mask)):
        if mask[k] and start is None:
            start = S[k]
        if (not mask[k] or k == len(mask) - 1) and start is not None:
            end = S[k] if mask[k] else S[k - 1]
            if out and start - out[-1][1] < gap:
                out[-1] = (out[-1][0], end)
            else:
                out.append((start, end))
            start = None
    return [(a, b) for a, b in out if b - a >= minlen]

def clip_iv(ivs, a, b):
    return [(max(a, x), min(b, y)) for x, y in ivs if min(b, y) - max(a, x) > 0]

def isect(A, B, minlen):
    out = []
    for a0, a1 in A:
        for b0, b1 in B:
            lo, hi = max(a0, b0), min(a1, b1)
            if hi - lo >= minlen:
                out.append((lo, hi))
    return out

car = [r for r in roads if r["cls"] <= 4]
for r in car:
    prep(r)
    r["ccut"] = []; r["kcut"] = []
# перекрёстки: узел, где сходится три и больше «рукавов»
node_roads = defaultdict(list)
for ri, r in enumerate(car):
    last = len(r["nids"]) - 1
    for k, nid in enumerate(r["nids"]):
        node_roads[nid].append((ri, r["node_s"][k], 1 if k in (0, last) else 2))
node_on_road = {}
for nid, ent in node_roads.items():
    best = min(ent, key=lambda e: car[e[0]]["cls"])
    node_on_road[nid] = (best[0], best[1])
    if sum(e[2] for e in ent) < 3:
        continue
    for ri, s, arms in ent:
        r = car[ri]
        others = [car[rj] for rj, _, a2 in ent if rj != ri]
        if arms == 1:   # продолжение той же улицы не считается пересечением
            cont = [o for o in others if o["name"] == r["name"] and o["cls"] == r["cls"]]
            if cont:
                others.remove(cont[0])
        if not others:
            continue
        wc = [o["w"] for o in others if o["cls"] <= 2]
        if wc:
            r["ccut"].append((s, max(wc) / 2 + 2.0))
        r["kcut"].append((s, max(o["w"] for o in others) / 2 + 1.5))

def hsh(*a):
    return zlib.crc32(repr(a).encode()) & 0xffffffff

# --- пешеходные переходы ---
def add_zebra(r, s, target):
    if r["cls"] > 2 or r["bridge"] and False:
        return False
    x, z, y, tx, tz = at(r, s)
    if any((x - q[1]) ** 2 + (z - q[2]) ** 2 < 15 * 15 for q in zebra_near.get((int(x // 64), int(z // 64)), [])):
        return False
    yaw = math.degrees(math.atan2(tx, tz))
    s0, s1 = max(0.0, s - 2), min(r["L"], s + 2)
    slope = (float(np.interp(s1, r["S"], r["Y"])) - float(np.interp(s0, r["S"], r["Y"]))) / max(0.5, s1 - s0)
    q = (1, x, z, y + 0.02, yaw, slope, max(2.0, r["w"] - 0.5), 4.0)
    target.append(q)
    zebra_near.setdefault((int(x // 64), int(z // 64)), []).append(q)
    r["ccut"].append((s, 2.7))
    (zebra_log_local if target is local_decals else zebra_log).append((r, s) if target is local_decals else (r, s, None))
    return q
zebra_near = {}
zebra_log = []; zebra_log_local = []
n_zebra = n_stop = 0
for n in tagged_nodes:
    t = n["tags"]
    if t.get("highway") == "crossing" and t.get("crossing") not in ("unmarked", "no", "informal") and n["id"] in node_on_road:
        ri, s = node_on_road[n["id"]]
        r = car[ri]
        q = add_zebra(r, s, decals)
        if not q:
            continue
        zebra_log[-1] = (r, s, n["id"])
        n_zebra += 1
        if t.get("crossing") == "traffic_signals" or t.get("crossing:signals") == "yes":
            hw = r["w"] / 2
            for sgn in ((-1,) if r["oneway"] else (-1, 1)):
                ss = s + sgn * 3.6
                if 0 < ss < r["L"]:
                    x, z, y, tx, tz = at(r, ss)
                    if r["oneway"]:
                        decals.append((2, x, z, y + 0.02, q[4], q[5], r["w"] - 0.6, 0.4))
                    else:   # своя (правая) половина дороги
                        o = sgn * hw / 2
                        decals.append((2, x + tz * o, z - tx * o, y + 0.02, q[4], q[5], hw - 0.4, 0.4))
                    n_stop += 1
print("переходов:", n_zebra, "стоп-линий:", n_stop)

# --- Mapillary: переходы, люки, решётки (если данные лежат рядом) ---
mly = []
for path in glob.glob(os.path.join(SRC, "mapillary*.jsonl")) + glob.glob(os.path.join(SRC, "mapillary", "*.jsonl")):
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                o = json.loads(line)
                mly.append((o["v"],) + proj(o["lat"], o["lon"]))
            except (ValueError, KeyError):
                pass
# поиск ближайшей дороги по сетке
rgrid = defaultdict(list)
for ri, r in enumerate(car):
    if r["cls"] <= 3:
        for k in range(0, len(r["X"]), 2):
            rgrid[(int(r["X"][k] // 32), int(r["Z"][k] // 32))].append((ri, k))
def nearest_road(x, z, maxd, maxcls=2):
    best = None
    gx_, gz_ = int(x // 32), int(z // 32)
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            for ri, k in rgrid.get((gx_ + dx, gz_ + dz), ()):
                r = car[ri]
                if r["cls"] > maxcls:
                    continue
                d = math.hypot(r["X"][k] - x, r["Z"][k] - z)
                if d < maxd and (best is None or d < best[0]):
                    best = (d, ri, float(r["S"][k]))
    return best
n_m = 0
for v_, x, z in mly:
    if v_ == "marking--discrete--crosswalk-zebra":
        b_ = nearest_road(x, z, 10.0)
        if b_ and add_zebra(car[b_[1]], b_[2], local_decals):
            n_m += 1
    elif v_ in ("object--manhole", "object--catch-basin"):
        b_ = nearest_road(x, z, 9.0, 3)
        if b_ and b_[0] < car[b_[1]]["w"] / 2:
            y = float(np.interp(b_[2], car[b_[1]]["S"], car[b_[1]]["Y"])) + 0.025
        else:
            y = float(sample_tri(Hf, [x], [z])[0]) + 0.04
        local_decals.append((3, x, z, y, 0.0, 0.0, 0.7, 0.7) if v_ == "object--manhole" else (4, x, z, y, float(hsh(x) % 180), 0.0, 0.45, 0.75))
        n_m += 1
print("из Mapillary для дорог:", n_m, "из", len(mly))
for n in tagged_nodes:
    if n["tags"].get("man_made") == "manhole":
        x, z = nodes[n["id"]]
        decals.append((3, x, z, float(sample_tri(Hf, [x], [z])[0]) + 0.04, 0.0, 0.0, 0.7, 0.7))

# --- разметка, бордюры, тротуары, люки, заплаты по каждой дороге ---
auto_walks = []
n_curb = 0
for r in car:
    if r["cls"] > 2 or r["L"] < 12:
        continue
    rng = random.Random(r["id"])
    S = r["S"]; L = r["L"]; hw = r["w"] / 2
    ui = np.clip(((r["X"] - X0) / CELL).astype(int), 0, GW - 1); uj = np.clip(((r["Z"] - Z0) / CELL).astype(int), 0, GH - 1)
    urb = urban[uj, ui]
    lanes = r["lanes_tag"] or (4 if (r["cls"] == 0 and r["w"] >= 13) else 2)
    if r["oneway"] and not r["lanes_tag"]:
        lanes = 2 if r["w"] >= 7 else 1
    kind = r["ref"]
    # разметка
    chance = {"motorway": 1, "trunk": 1, "primary": 0.95, "secondary": 0.9, "tertiary": 0.7}.get(kind, 0.15 if not r["lanes_tag"] else 0.6)
    if kind.endswith("_link"):
        chance = 0.5
    if rng.random() < chance:
        iv = intervals(L, r["ccut"], 5.0)
        wcm = 15 if r["cls"] == 0 else 12
        specs = []
        if r["oneway"]:
            for i in range(1, lanes):
                specs.append((-hw + i * r["w"] / lanes, 1))
        else:
            if lanes >= 4:
                specs += [(0.14, 0), (-0.14, 0), (hw / 2, 1), (-hw / 2, 1)]
            else:
                specs.append((0.0, 0 if (r["bridge"] or kind in ("trunk", "primary")) and rng.random() < 0.5 else 1))
        if kind in ("motorway", "trunk", "primary", "secondary") or r["bridge"]:
            specs += [(hw - 0.3, 0), (-(hw - 0.3), 0)]
        for off, typ in specs:
            for s0, s1 in iv:
                pts, ys = extract(r, s0, s1, off, 0.02)
                lines.append({"type": typ, "wcm": wcm, "pts": pts, "y": ys})
    if r["bridge"] or r["surf"] == 0 and False:
        continue
    town = runs(urb, S, 20.0, 15.0)
    if not town:
        continue
    # бордюры (дорога слева от линии)
    kiv = isect(intervals(L, r["kcut"], 3.0), town, 3.0)
    for s0, s1 in kiv:
        pts, ys = extract(r, s0, s1, -hw)
        lines.append({"type": 10, "wcm": 0, "pts": pts, "y": ys})
        pts, ys = extract(r, s0, s1, hw)
        lines.append({"type": 10, "wcm": 0, "pts": pts[::-1], "y": ys[::-1]})
        n_curb += 2
    # тротуары там, где на карте их нет
    verge = 2.2 if r["cls"] <= 1 else 1.0
    woff = hw + verge + 0.9
    wcuts = [(s, rad + verge + 1.5) for s, rad in r["kcut"]]
    wiv = isect(intervals(L, wcuts, 12.0), town, 12.0)
    for side in (1, -1):
        has = np.zeros(len(S), dtype=bool)
        for o in np.arange(hw + 1.0, hw + 10.0, 1.5):
            has |= fhit(foot_mask, r["X"] + r["TZ"] * o * side, r["Z"] - r["TX"] * o * side)
        blocked = fhit(bld_mask, r["X"] + r["TZ"] * woff * side, r["Z"] - r["TX"] * woff * side)
        free = runs(~has & ~blocked, S, 25.0, 0.0)
        for s0, s1 in isect(wiv, free, 20.0):
            pts, _ = extract(r, s0, s1, woff * side)
            pts = resample(pts, 4.0)
            auto_walks.append({"cls": 5, "w": 1.6, "bridge": False, "pts": pts, "name": "", "ref": "footway", "surf": 3, "auto": True})
    # люки, решётки, заплаты
    wear = rng.random()
    s = rng.uniform(5, 40)
    while s < L - 3:
        if urb[min(len(urb) - 1, int(np.searchsorted(S, s)))]:
            x, z, y, tx, tz = at(r, s)
            yaw = math.degrees(math.atan2(tx, tz))
            s1 = min(L, s + 2.0)
            slope = (float(np.interp(s1, S, r["Y"])) - y) / max(0.5, s1 - s)
            roll = rng.random()
            if roll < 0.22:
                o = rng.uniform(-(hw - 1.0), hw - 1.0)
                decals.append((3, x + tz * o, z - tx * o, y + 0.025, 0.0, 0.0, 0.7, 0.7))
            elif roll < 0.34:
                o = (hw - 0.35) * rng.choice((-1, 1))
                decals.append((4, x + tz * o, z - tx * o, y + 0.025, yaw, slope, 0.45, 0.75))
            elif roll < 0.34 + 0.5 * (0.35 + wear):
                o = rng.uniform(-(hw - 1.2), hw - 1.2)
                decals.append((5, x + tz * o, z - tx * o, y + 0.012, yaw, slope, rng.uniform(1.5, 6.0), rng.uniform(0.9, min(2.6, hw))))
        s += rng.uniform(9, 30)
print("бордюров:", n_curb, "линий разметки:", sum(1 for l in lines if l["type"] < 5), "наклеек:", len(decals), "тротуаров достроено:", len(auto_walks))
for a in auto_walks:
    xs = [p[0] for p in a["pts"]]; zs = [p[1] for p in a["pts"]]
    a["y"] = sample_tri(Hf, xs, zs) + LIFT[5]
roads += auto_walks

# --- парковочные места: тонкий контур ---
n_park = 0
for w in area_ways:
    if w["tags"].get("amenity") == "parking_space":
        p = way_pts(w)
        if 4 <= len(p) <= 12:
            p = resample(p, 2.0)
            ys = sample_tri(Hf, [q[0] for q in p], [q[1] for q in p]) + 0.07
            lines.append({"type": 5, "wcm": 10, "pts": p, "y": ys})
            n_park += 1
print("парковочных мест:", n_park)

# ---------- заборы: виды, ворота, частный сектор ----------
# вид забора: 0 стена · 1 бетонные плиты · 2 профнастил · 3 штакетник · 4 сетка · 5 прутья · 6 живая изгородь
#             7 кирпич · 8 отбойник · 9 низкое ограждение газона · 10 ворота · 11 подпорная стена
FENCE_H = {0: 2.0, 1: 2.4, 2: 2.0, 3: 1.3, 4: 1.7, 5: 1.6, 6: 1.2, 7: 2.0, 8: 0.8, 9: 0.5, 10: 2.0, 11: 1.5}
GATE_W = {"gate": 3.6, "lift_gate": 3.6, "swing_gate": 3.6, "sliding_gate": 3.6, "wicket_gate": 1.2, "kissing_gate": 1.2, "entrance": 1.4, "turnstile": 1.0}
gate_nodes = {n["id"]: GATE_W[n["tags"]["barrier"]] for n in tagged_nodes if n["tags"].get("barrier") in GATE_W}
def mask_of(draw_fn, dil=0):
    im = Image.new("L", (FW_, FH_), 0); draw_fn(ImageDraw.Draw(im))
    m = np.asarray(im, dtype=bool).copy()
    return ndimage.binary_dilation(m, iterations=dil) if dil else m
def _d_houses(d):
    for b in buildings:
        if b["kind"] == 1: d.polygon(fpx(b["pts"]), fill=1)
def _d_big(d):
    for b in buildings:
        if b["kind"] in (2, 3, 5, 6, 7): d.polygon(fpx(b["pts"]), fill=1)
def _d_car(d):
    for r in car:
        d.line(fpx(r["pts"]), fill=1, width=max(1, int(round(r["w"] / FR))))
def _d_bar(d):
    for t_, ids_ in raw_barriers:
        d.line(fpx([nodes[i] for i in ids_]), fill=1, width=1)
house_near = mask_of(_d_houses, 4)
big_near = mask_of(_d_big, 3)
car_mask = mask_of(_d_car)
bar_mask = mask_of(_d_bar, 2)
def cover_at(x, z):
    return int(cover[min(max(int((z - Z0) / CELL), 0), GH - 1), min(max(int((x - X0) / CELL), 0), GW - 1)])
def private_kind(seed):
    h = seed % 100; v = seed // 100
    if h < 50: return 2, v % 5
    if h < 64: return 3, v % 3
    if h < 74: return 7, v % 3
    if h < 84: return 1, 2
    if h < 92: return 5, v % 3
    return 4, 0
def fence_kind(t, x, z, seed):
    b = t["barrier"]; ft = t.get("fence_type", ""); mat = t.get("material", "")
    h = seed % 100; v = seed // 100
    if b == "hedge": return 6, 0
    if b == "guard_rail": return 8, 0
    if b == "handrail": return 9, v % 2
    if b == "retaining_wall": return 11, 0
    if b == "city_wall": return 0, 0
    c = cover_at(x, z); private = bool(fhit(house_near, [x], [z])[0]) and not fhit(big_near, [x], [z])[0]
    if b == "wall":
        if mat == "brick" or (not mat and private): return 7, v % 3
        return (1, v % 2) if c == 6 else (0, 0)
    if ft in ("chain_link", "wire", "net"): return 4, 0
    if ft in ("metal", "bars", "railing", "pole"): return 5, v % 3
    if ft == "wood": return 3, v % 3
    if ft == "concrete" or mat == "concrete": return 1, v % 2
    if mat == "brick": return 7, v % 3
    if c == 6: return (1, v % 2) if h < 80 else (4, 0)
    if private: return private_kind(seed)
    if c in (8, 9): return (5, v % 3) if h < 60 else (4, 0)
    if c == 7: return (4, 0) if h < 70 else (3, v % 3)
    return (5, v % 3) if h < 50 else (4, 0)
def poly_sub(P, S, s0, s1, step=6.0):
    ss = np.unique(np.concatenate([[s0], S[(S > s0 + 0.3) & (S < s1 - 0.3)], np.arange(s0, s1, step)[1:], [s1]]))
    X = np.interp(ss, S, [p[0] for p in P]); Z = np.interp(ss, S, [p[1] for p in P])
    return list(zip(X.tolist(), Z.tolist()))
def add_fence(pts, kind, var, h=None):
    if len(pts) < 2:
        return 0.0
    ys = sample_tri(Hf, [q[0] for q in pts], [q[1] for q in pts])
    barriers.append({"type": kind, "var": var, "h": min(h or FENCE_H[kind], 6.0), "pts": pts, "y": ys})
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]))
km_osm = 0.0
for t, ids in raw_barriers:
    P = [nodes[i] for i in ids]
    S = np.concatenate([[0.0], np.cumsum([math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(P, P[1:])])])
    L = float(S[-1])
    if L < 1.0:
        continue
    mid = poly_sub(P, S, L / 2, L / 2 + 0.01)[0]
    kind, var = fence_kind(t, mid[0], mid[1], hsh(ids[0], len(ids)))
    cuts = [(float(S[k]), gate_nodes[i] / 2) for k, i in enumerate(ids) if i in gate_nodes]
    hh = num(t.get("height")) if "height" in t else None
    for s0, s1 in intervals(L, cuts, 0.8):
        km_osm += add_fence(poly_sub(P, S, s0, s1), kind, var, hh if hh and 0.3 < hh < 6 else None)
# частный сектор: заборы вдоль улиц, которых нет на карте — участками, у каждого свои ворота
km_gen = 0.0; n_plots = 0
for r in car:
    if r["cls"] > 2 or r["bridge"] or r["L"] < 20:
        continue
    hw = r["w"] / 2
    ss = np.arange(1.0, r["L"] - 1.0, 1.5)
    if len(ss) < 6:
        continue
    X = np.interp(ss, r["S"], r["X"]); Z = np.interp(ss, r["S"], r["Z"])
    TX = np.interp(ss, r["S"], r["TX"]); TZ = np.interp(ss, r["S"], r["TZ"])
    nn = np.hypot(TX, TZ); nn[nn < 1e-6] = 1.0; TX /= nn; TZ /= nn
    far = np.ones(len(ss), dtype=bool)
    for c_, rad_ in r["kcut"]:
        far &= np.abs(ss - c_) > rad_ + 4.0
    for side in (-1, 1):
        off = side * (hw + 3.4)
        PX = X + TZ * off; PZ = Z - TX * off
        def probe(m, extra):
            return fhit(m, X + TZ * (off + side * extra), Z - TX * (off + side * extra))
        ok = far & probe(house_near, 9.0) & ~probe(big_near, 6.0) & ~fhit(bld_mask, PX, PZ) & ~fhit(car_mask, PX, PZ) & ~fhit(bar_mask, PX, PZ)
        ok &= ~probe(foot_mask, 2.0) & ~probe(foot_mask, 4.5) & ~probe(car_mask, 3.0)
        for a, b in runs(ok, ss, 9.0, 0.0):
            s = a; k = 0
            while b - s > 1.0:
                seed = hsh(r["id"], side, int(s))
                ln = 14.0 + seed % 13
                if b - s - ln < 9.0:
                    ln = b - s
                e = s + ln
                kind, var = private_kind(seed // 7)
                def piece(s0, s1, kd, vr):
                    if s1 - s0 < 0.6:
                        return 0.0
                    q = np.concatenate([[s0], np.arange(s0, s1, 5.0)[1:], [s1]])
                    return add_fence(list(zip((np.interp(q, ss, PX)).tolist(), (np.interp(q, ss, PZ)).tolist())), kd, vr)
                if ln >= 10.0:
                    g0 = s + 1.5 + (seed // 1000) % max(1, int(ln - 7.5))
                    km_gen += piece(s, g0, kind, var) + piece(g0, g0 + 4.4, 10, (seed // 50) % 5) + piece(g0 + 4.4, e, kind, var)
                else:
                    km_gen += piece(s, e, kind, var)
                # боковой забор между участками
                if k > 0 or True:
                    bx = float(np.interp(s, ss, PX)); bz = float(np.interp(s, ss, PZ))
                    ox = float(np.interp(s, ss, TZ)) * side; oz = -float(np.interp(s, ss, TX)) * side
                    side_pts = [(bx, bz)]
                    for d_ in range(3, 28, 3):
                        qx, qz = bx + ox * d_, bz + oz * d_
                        if fhit(bld_mask, [qx], [qz])[0] or fhit(car_mask, [qx], [qz])[0] or fhit(bar_mask, [qx], [qz])[0]:
                            break
                        side_pts.append((qx, qz))
                    if len(side_pts) >= 3:
                        sk, sv = private_kind(seed // 13)
                        km_gen += add_fence(side_pts, sk if sk != 5 else 4, sv)
                n_plots += 1; k += 1
                s = e
print("заборов: с карты %.0f км, достроено в частном секторе %.0f км, участков %d, ворот на карте %d" % (km_osm / 1000, km_gen / 1000, n_plots, len(gate_nodes)))

# ---------- столбы, светофоры, знаки, остановки ----------
# prop = (тип, x, z, y, yaw°, вид). yaw — куда «смотрит» предмет.
# типы: 1 фонарь (вид 0 с вылетом к дороге, 1 парковый) · 2 столб ЛЭП · 3 светофор · 4 пешеходный светофор
#       5 знак (вид = какой) · 6 остановка · 7 лавка · 8 урна
props = []
local_props = []
pgrid = defaultdict(list)
def p_near(x, z, d, types=None):
    gx_, gz_ = int(x // 16), int(z // 16)
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            for t_, px, pz in pgrid.get((gx_ + dx, gz_ + dz), ()):
                if (types is None or t_ in types) and (px - x) ** 2 + (pz - z) ** 2 < d * d:
                    return True
    return False
def add_prop(target, t_, x, z, yaw, var=0, y=None):
    if not (X0 + 2 < x < -X0 - 2 and Z0 + 2 < z < -Z0 - 2) or fhit(bld_mask, [x], [z])[0]:
        return False
    if y is None:
        y = float(sample_tri(Hf, [x], [z])[0])
    target.append((t_, x, z, y, yaw, var))
    pgrid[(int(x // 16), int(z // 16))].append((t_, x, z))
    return True
def side_point(r, s, off, along=0.0):
    """точка у дороги: off — сдвиг влево от оси; возвращает x, z, y оси, tx, tz"""
    x, z, y, tx, tz = at(r, min(max(s + along, 0.0), r["L"]))
    n = math.hypot(tx, tz) or 1.0
    tx, tz = tx / n, tz / n
    return x + tz * off, z - tx * off, y, tx, tz
def yaw_of(fx, fz):
    return math.degrees(math.atan2(fx, fz))
def road_sign(target, r, s, sgn, var, extra=1.0, along=0.0, t_=5):
    """предмет справа по ходу для тех, кто подъезжает к точке s со стороны sgn; лицом к ним"""
    x, z, y, tx, tz = side_point(r, s, sgn * (r["w"] / 2 + extra), along)
    return add_prop(target, t_, x, z, yaw_of(sgn * tx, sgn * tz), var, y + 0.05)
def approaches(r, s, d):
    out = []
    for sgn in (-1, 1):
        if r["oneway"] and sgn == 1:
            continue
        if 0 < s + sgn * d < r["L"]:
            out.append(sgn)
    return out

# светофоры и знаки у переходов
def zebra_furniture(target, r, s, signals):
    hw = r["w"] / 2
    for sgn in (-1, 1):
        if signals:
            x, z, y, tx, tz = side_point(r, s, sgn * (hw + 0.7))
            add_prop(target, 4, x, z, yaw_of(-sgn * tz, sgn * tx), 0, y + 0.05)   # лицом через дорогу
            if not (r["oneway"] and sgn == 1):
                road_sign(target, r, s, sgn, 0, 0.7, sgn * 3.6, 3)
        if not (r["oneway"] and sgn == 1):
            road_sign(target, r, s, sgn, 0, 1.3, sgn * 2.6)
sig_cross = set()
for n in tagged_nodes:
    t = n["tags"]
    if t.get("highway") == "crossing" and (t.get("crossing") == "traffic_signals" or t.get("crossing:signals") == "yes"):
        sig_cross.add(n["id"])
for q in decals:
    if q[0] == 1 and len(q) > 8:
        pass
for (r_, s_, nid_) in zebra_log:
    zebra_furniture(props, r_, s_, nid_ in sig_cross)
for (r_, s_) in zebra_log_local:
    zebra_furniture(local_props, r_, s_, False)

# перекрёстки: светофоры, «уступи дорогу», «главная дорога»
n_sig = n_yield = 0
sig_nodes = {n["id"] for n in tagged_nodes if n["tags"].get("highway") == "traffic_signals"}
for nid, ent in node_roads.items():
    is_junction = sum(e[2] for e in ent) >= 3
    has_sig = nid in sig_nodes
    if not (is_junction or has_sig):
        continue
    best_cls = min(car[e[0]]["cls"] for e in ent)
    for ri, s, arms in ent:
        r = car[ri]
        if r["cls"] > 3:
            continue
        others = [car[rj] for rj, _, _ in ent if rj != ri]
        rad = (max([o["w"] for o in others] + [0.0]) / 2 + 2.5) if is_junction else 0.5
        for sgn in approaches(r, s, rad + 1.0):
            if has_sig and r["cls"] <= 2:
                if road_sign(props, r, s, sgn, 0, 0.7, sgn * rad, 3):
                    n_sig += 1
                    x, z, y, tx, tz = at(r, s + sgn * rad)
                    yw = yaw_of(tx, tz)
                    if r["oneway"]:
                        decals.append((2, x, z, y + 0.02, yw, 0.0, r["w"] - 0.6, 0.4))
                    else:
                        o = sgn * r["w"] / 4
                        decals.append((2, x + tz * o, z - tx * o, y + 0.02, yw, 0.0, r["w"] / 2 - 0.4, 0.4))
            if not is_junction:
                continue
            if r["cls"] > best_cls and best_cls <= 1 and (r["cls"] <= 2 or best_cls == 0):
                if road_sign(props, r, s, sgn, 1, 1.3, sgn * (rad + 1.5)):
                    n_yield += 1
            elif r["cls"] == best_cls and r["cls"] <= 1 and any(o["cls"] > r["cls"] and o["cls"] <= 2 for o in others) and hsh(nid, ri, sgn) % 3 == 0:
                road_sign(props, r, s, sgn, 2, 1.3, sgn * (rad + 9.0))
print("светофоров:", n_sig, "знаков «уступи»:", n_yield)

# остановки
n_bus = 0
for n in tagged_nodes:
    t = n["tags"]
    if t.get("highway") == "bus_stop" or (t.get("public_transport") == "platform" and t.get("bus") == "yes"):
        x, z = nodes[n["id"]]
        b_ = nearest_road(x, z, 18.0, 2)
        if not b_ or p_near(x, z, 12.0, (6,)):
            continue
        r = car[b_[1]]
        ax, az, ay, tx, tz = side_point(r, b_[2], 0.0)
        side = 1 if (x - ax) * tz - (z - az) * tx > 0 else -1
        off = side * max(r["w"] / 2 + 2.6, min(b_[0], r["w"] / 2 + 5.0))
        sx, sz, sy, tx, tz = side_point(r, b_[2], off)
        if add_prop(props, 6, sx, sz, yaw_of(-side * tz, side * tx), hsh(n["id"]) % 2, None if b_[0] > r["w"] / 2 + 3 else sy + 0.05):
            n_bus += 1
            road_sign(props, r, b_[2], side, 9, 1.3, side * 4.5)
print("остановок:", n_bus)

# фонари: с карты, из Mapillary, и достроенные вдоль улиц, где данных нет
def lamp_at(target, x, z, maxd=14.0):
    b_ = nearest_road(x, z, maxd, 3)
    if b_:
        r = car[b_[1]]
        ax, az, ay, tx, tz = side_point(r, b_[2], 0.0)
        y_ = float(sample_tri(Hf, [x], [z])[0])
        if b_[0] < r["w"] / 2 + 5.0:
            y_ = max(y_, ay + 0.05)
        return add_prop(target, 1, x, z, yaw_of(ax - x, az - z), 0, y_)
    return add_prop(target, 1, x, z, float(hsh(x, z) % 360), 1)
n_lamp = 0
for n in tagged_nodes:
    if n["tags"].get("highway") == "street_lamp":
        x, z = nodes[n["id"]]
        n_lamp += bool(lamp_at(props, x, z))
n_lamp_map = n_lamp
for r in car:
    if r["cls"] > 2 or r["L"] < 30 or r["bridge"]:
        continue
    hw = r["w"] / 2
    step = 38.0 if r["cls"] == 0 else 44.0
    side = -1 if hsh(r["id"]) % 2 else 1
    s = 12.0 + hsh(r["id"], 1) % 12
    while s < r["L"] - 8:
        x, z, y, tx, tz = side_point(r, s, side * (hw + 0.6))
        ui_ = min(max(int((x - X0) / CELL), 0), GW - 1); uj_ = min(max(int((z - Z0) / CELL), 0), GH - 1)
        if urban[uj_, ui_] and not p_near(x, z, 26.0, (1,)) and not any(abs(s - c_) < rad_ + 1 for c_, rad_ in r["kcut"]):
            n_lamp += bool(add_prop(props, 1, x, z, yaw_of(-side * tz, side * tx), 0, y + 0.05))
        s += step
print("фонарей:", n_lamp, "(с карты %d)" % n_lamp_map)
for n in tagged_nodes:
    a_ = n["tags"].get("amenity")
    if a_ in ("bench", "waste_basket"):
        x, z = nodes[n["id"]]
        add_prop(props, 7 if a_ == "bench" else 8, x, z, float(hsh(n["id"]) % 4 * 90), 0)

# дворы: детские площадки, спортплощадки, мусорные контейнеры, бетонные блоки
# типы: 9 качели · 10 горка · 11 песочница · 12 турник · 13 ворота футбольные · 14 баскетбольное кольцо
#       15 мусорные контейнеры · 16 бетонный блок · 17 столбик
def pt_in(poly, x, z):
    c = False
    for (x1, z1), (x2, z2) in zip(poly, poly[1:] + poly[:1]):
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1) + x1:
            c = not c
    return c
n_play = n_pitch = 0
for w in area_ways:
    t = w["tags"]
    if t.get("leisure") not in ("playground", "pitch") and t.get("amenity") not in ("waste_disposal", "recycling"):
        continue
    P = way_pts(w)[:-1]
    if len(P) < 3:
        continue
    cx_ = sum(p[0] for p in P) / len(P); cz_ = sum(p[1] for p in P) / len(P)
    area = abs(poly_area2(P)) / 2
    seed = hsh(w["nodes"][0])
    if t.get("leisure") == "playground":
        rad = math.sqrt(area) / 2
        yw = float(seed % 360)
        items = [(9, -0.45, 0.0), (11, 0.4, 0.35), (10, 0.4, -0.4), (12, -0.1, 0.6)]
        items = items[:1 if area < 30 else 2 if area < 70 else 4]
        for t_, ax_, az_ in items:
            x, z = cx_ + ax_ * rad, cz_ + az_ * rad
            if pt_in(P, x, z):
                add_prop(props, t_, x, z, yw + (0 if t_ != 10 else 90), seed % 3)
        add_prop(props, 7, cx_ + 0.75 * rad, cz_, 270.0, 0)
        n_play += 1
    elif t.get("leisure") == "pitch":
        sp = t.get("sport", "")
        if sp not in ("soccer", "basketball", "multi", "streetball", "futsal"):
            continue
        e = max(zip(P, P[1:] + P[:1]), key=lambda ab: math.hypot(ab[1][0] - ab[0][0], ab[1][1] - ab[0][1]))
        dx, dz = e[1][0] - e[0][0], e[1][1] - e[0][1]; n_ = math.hypot(dx, dz) or 1.0
        dx, dz = dx / n_, dz / n_
        proj_ = [(p[0] - cx_) * dx + (p[1] - cz_) * dz for p in P]
        half = (max(proj_) - min(proj_)) / 2; mid_ = (max(proj_) + min(proj_)) / 2
        if half < 5 or half > 70:
            continue
        for sg in (-1, 1):
            x, z = cx_ + dx * (mid_ + sg * (half - 0.8)), cz_ + dz * (mid_ + sg * (half - 0.8))
            add_prop(props, 14 if sp in ("basketball", "streetball") else 13, x, z, yaw_of(-sg * dx, -sg * dz), 1 if half > 30 else 0)
        n_pitch += 1
    else:
        b_ = nearest_road(cx_, cz_, 40.0, 4)
        yw = float(seed % 4 * 90)
        if b_:
            ax, az, _, _, _ = at(car[b_[1]], b_[2]); yw = yaw_of(ax - cx_, az - cz_)
        add_prop(props, 15, cx_, cz_, yw, seed % 3)
for n in tagged_nodes:
    t = n["tags"]
    x, z = nodes[n["id"]]
    if t.get("amenity") in ("waste_disposal", "recycling"):
        b_ = nearest_road(x, z, 40.0, 4)
        yw = float(hsh(n["id"]) % 4 * 90)
        if b_:
            ax, az, _, _, _ = at(car[b_[1]], b_[2]); yw = yaw_of(ax - x, az - z)
        add_prop(props, 15, x, z, yw, hsh(n["id"]) % 3)
    elif t.get("barrier") == "block":
        add_prop(props, 16, x, z, float(hsh(n["id"]) % 180), hsh(n["id"]) % 2)
    elif t.get("barrier") == "bollard":
        add_prop(props, 17, x, z, 0.0, 0)
    elif t.get("leisure") == "playground":
        add_prop(props, 9, x, z, float(hsh(n["id"]) % 360), 0)
print("детских площадок:", n_play, "спортплощадок:", n_pitch)

# Mapillary: то, чего нет на карте (только в локальный слой)
MLY_SIGNS = {"regulatory--yield": 1, "regulatory--priority-road": 2, "regulatory--stop": 3, "regulatory--no-entry": 4,
             "regulatory--maximum-speed-limit": 5, "regulatory--no-stopping": 5, "regulatory--no-heavy-goods-vehicles": 5, "regulatory--no-parking": 5,
             "regulatory--go-straight": 6, "regulatory--keep-right": 6, "regulatory--turn": 6, "regulatory--roundabout": 6, "regulatory--pass-on-either-side": 6,
             "regulatory--one-way": 6, "warning--": 7, "information--parking": 8, "information--pedestrians-crossing": 0}
n_ml = 0
for v_, x, z in mly:
    if v_ == "object--street-light":
        if not p_near(x, z, 14.0, (1,)):
            n_ml += bool(lamp_at(local_props, x, z))
    elif v_ == "object--support--utility-pole":
        if not p_near(x, z, 6.0, (1, 2)):
            b_ = nearest_road(x, z, 20.0, 4)
            yw = 0.0
            if b_:
                _, _, _, tx, tz = at(car[b_[1]], b_[2]); yw = yaw_of(tx, tz)
            n_ml += bool(add_prop(local_props, 2, x, z, yw, hsh(x, z) % 2))
    elif v_ in ("object--bench", "object--trash-can"):
        if not p_near(x, z, 3.0, (7, 8)):
            b_ = nearest_road(x, z, 25.0, 4)
            yw = float(hsh(x, z) % 360)
            if b_:
                ax, az, _, tx, tz = at(car[b_[1]], b_[2]); yw = yaw_of(ax - x, az - z)
            n_ml += bool(add_prop(local_props, 7 if v_ == "object--bench" else 8, x, z, yw, 0))
    else:
        var = next((k_ for p_, k_ in MLY_SIGNS.items() if v_.startswith(p_)), None)
        if var is None or p_near(x, z, 7.0 if var == 0 else 3.0, (5,)):
            continue
        b_ = nearest_road(x, z, 16.0, 3)
        if not b_:
            continue
        r = car[b_[1]]
        ax, az, ay, tx, tz = side_point(r, b_[2], 0.0)
        side = 1 if (x - ax) * tz - (z - az) * tx > 0 else -1
        if r["oneway"]:
            side_f = -1
        else:
            side_f = side
        d_ = max(b_[0], r["w"] / 2 + 1.0)
        sx, sz, sy, tx, tz = side_point(r, b_[2], side * d_)
        n_ml += bool(add_prop(local_props, 5, sx, sz, yaw_of(side_f * tx, side_f * tz), var))
print("предметов:", len(props), "из Mapillary:", n_ml)
if os.environ.get("CITY_DEBUG"):
    json.dump([props, local_props, [[b["type"], b["pts"][0][0], b["pts"][0][1], b["pts"][-1][0], b["pts"][-1][1]] for b in barriers]], open(os.environ["CITY_DEBUG"], "w"))

# ---------- раскладка по квадратам ----------
def chunk_of(x, z):
    return int(math.floor((x - X0) / CHUNK)), int(math.floor((z - Z0) / CHUNK))

def split_line(pts, ys):
    """разрезать линию по границам квадратов -> [(cx, cz, [(x,z,y)])]"""
    pieces = []
    cur = None; cur_c = None
    for k in range(len(pts) - 1):
        ax, az = pts[k]; bx, bz = pts[k + 1]
        ay, by = float(ys[k]), float(ys[k + 1])
        ts = [0.0, 1.0]
        for (a, b, o) in ((ax, bx, X0), (az, bz, Z0)):
            lo, hi = sorted((a, b))
            g = math.floor((lo - o) / CHUNK) + 1
            while o + g * CHUNK < hi:
                if abs(b - a) > 1e-9:
                    ts.append((o + g * CHUNK - a) / (b - a))
                g += 1
        ts = sorted(set(ts))
        for t0, t1 in zip(ts, ts[1:]):
            if t1 - t0 < 1e-9:
                continue
            p0 = (ax + (bx - ax) * t0, az + (bz - az) * t0, ay + (by - ay) * t0)
            p1 = (ax + (bx - ax) * t1, az + (bz - az) * t1, ay + (by - ay) * t1)
            c = chunk_of((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
            if c != cur_c:
                if cur and len(cur) > 1:
                    pieces.append((cur_c, cur))
                cur = [p0]; cur_c = c
            cur.append(p1)
    if cur and len(cur) > 1:
        pieces.append((cur_c, cur))
    return pieces

chunks = {}
def ch(c):
    if c not in chunks:
        chunks[c] = {"b": [], "r": [], "w": [], "l": [], "d": [], "p": []}
    return chunks[c]
def valid(c):
    return 0 <= c[0] < NX and 0 <= c[1] < NZ

for b in buildings:
    c = chunk_of(b["cx"], b["cz"])
    if valid(c): ch(c)["b"].append(b)
for r in roads:
    for c, pts in split_line(r["pts"], r["y"]):
        if valid(c): ch(c)["r"].append((r, pts))
for w in barriers:
    for c, pts in split_line(w["pts"], w["y"]):
        if valid(c): ch(c)["w"].append((w, pts))
for ln in lines:
    for c, pts in split_line(ln["pts"], ln["y"]):
        if valid(c): ch(c)["l"].append((ln, pts))
for q in decals:
    c = chunk_of(q[1], q[2])
    if valid(c): ch(c)["d"].append(q)
for q in props:
    c = chunk_of(q[1], q[2])
    if valid(c): ch(c)["p"].append(q)
def pack_decal(q, ox, oz):
    t_, x, z, y, yaw, slope, a, b = q
    return struct.pack("<BhhhhbBB", t_, i16((x - ox) / U), i16((z - oz) / U), i16(y * 100), i16(yaw * 10),
                       max(-127, min(127, int(round(slope * 100)))), max(1, min(255, int(round(a * 10)))), max(1, min(255, int(round(b * 10)))))
# локальный слой (Mapillary): отдельный файл, в публичный репозиторий не кладётся
if local_decals or local_props:
    loc = {}; locp = {}
    for q in local_decals:
        c = chunk_of(q[1], q[2])
        if valid(c):
            ox, oz = X0 + c[0] * CHUNK, Z0 + c[1] * CHUNK
            loc.setdefault("%d_%d" % c, []).append([q[0], round(q[1] - ox, 2), round(q[2] - oz, 2), round(q[3], 2), round(q[4], 1), round(q[5], 3), round(q[6], 1), round(q[7], 1)])
    for q in local_props:
        c = chunk_of(q[1], q[2])
        if valid(c):
            ox, oz = X0 + c[0] * CHUNK, Z0 + c[1] * CHUNK
            locp.setdefault("%d_%d" % c, []).append([q[0], round(q[1] - ox, 2), round(q[2] - oz, 2), round(q[3], 2), round(q[4], 1), q[5]])
    json.dump({"attribution": "Mapillary, CC BY-SA", "decals": loc, "props": locp}, open(os.path.join(OUT, "local_extra.json"), "w"), separators=(",", ":"))
    print("локальный слой Mapillary:", len(local_decals), "+", len(local_props))

def i16(v):
    return max(-32767, min(32767, int(round(v))))

def water_blob(cx, cz):
    """вода квадрата: по каждому уровню — маска клеток 32x32 (бит = клетка с водой)"""
    wl = water_level_grid[cz * CPC:(cz + 1) * CPC + 1, cx * CPC:(cx + 1) * CPC + 1]
    if not np.isfinite(wl).any():
        return bytes([0])
    w_ = np.nan_to_num(wl, nan=-9999.0)
    cell = np.maximum(np.maximum(w_[:-1, :-1], w_[1:, :-1]), np.maximum(w_[:-1, 1:], w_[1:, 1:]))
    levels = [v for v in np.unique(np.round(cell, 2)) if v > -9000][:8]
    out = bytearray([len(levels)])
    for lv_ in levels:
        mask = np.abs(cell - lv_) < 0.006
        out += struct.pack("<h", i16((float(lv_) - YOFF) * 100)) + np.packbits(mask.ravel(), bitorder="little").tobytes()
    return bytes(out)

records = {}
for c, d in chunks.items():
    ox, oz = X0 + c[0] * CHUNK, Z0 + c[1] * CHUNK
    out = bytearray(water_blob(c[0], c[1]))
    bl = d["b"][:65535]
    out += struct.pack("<H", len(bl))
    for b in bl:
        out += struct.pack("<BBhH", b["kind"], len(b["pts"]), i16(b["base"] * 100), min(65535, int(round(b["h"] * 10))))
        for x, z in b["pts"]:
            out += struct.pack("<hh", i16((x - ox) / U), i16((z - oz) / U))
    rl = d["r"][:65535]
    out += struct.pack("<H", len(rl))
    for r, pts in rl:
        out += struct.pack("<BBBBH", r["cls"], min(255, int(round(r["w"] * 4))), 1 if r["bridge"] else 0, r.get("surf", 0), len(pts))
        for x, z, y in pts:
            out += struct.pack("<hhh", i16((x - ox) / U), i16((z - oz) / U), i16(y * 100))
    wl_ = d["w"][:65535]
    out += struct.pack("<H", len(wl_))
    for w, pts in wl_:
        out += struct.pack("<BBH", w["type"] | (w["var"] << 4), min(255, int(round(w["h"] * 10))), len(pts))
        for x, z, y in pts:
            out += struct.pack("<hhh", i16((x - ox) / U), i16((z - oz) / U), i16(y * 100))
    ll = d["l"][:65535]
    out += struct.pack("<H", len(ll))
    for ln, pts in ll:
        out += struct.pack("<BBH", ln["type"], ln["wcm"], len(pts))
        for x, z, y in pts:
            out += struct.pack("<hhh", i16((x - ox) / U), i16((z - oz) / U), i16(y * 100))
    dl = d["d"][:65535]
    out += struct.pack("<H", len(dl))
    for q in dl:
        out += pack_decal(q, ox, oz)
    pl = d["p"][:65535]
    out += struct.pack("<H", len(pl))
    for t_, x, z, y, yaw, var in pl:
        out += struct.pack("<BhhhhB", t_, i16((x - ox) / U), i16((z - oz) / U), i16(y * 100), i16(((yaw + 180) % 360 - 180) * 10), var)
    records[c] = bytes(out)
# квадраты только с водой тоже нужны (лист воды)
for cz in range(NZ):
    for cx in range(NX):
        if (cx, cz) in records:
            continue
        wb = water_blob(cx, cz)
        if wb[0]:
            records[(cx, cz)] = wb + struct.pack("<HHHHHH", 0, 0, 0, 0, 0, 0)

head = bytearray(b"CGEO") + struct.pack("<II", NX, NZ)
table = bytearray()
body = bytearray()
base = 12 + NX * NZ * 8
for cz in range(NZ):
    for cx in range(NX):
        rec = records.get((cx, cz), b"")
        table += struct.pack("<II", base + len(body) if rec else 0, len(rec))
        body += rec
geo = bytes(head + table + body)
with gzip.open(os.path.join(OUT, "geo.bin"), "wb", compresslevel=9) as f:
    f.write(geo)
hcm = np.clip(np.round(Hf * 100), -32767, 32767).astype("<i2")
with gzip.open(os.path.join(OUT, "terrain.bin"), "wb", compresslevel=9) as f:
    f.write(b"CTER" + struct.pack("<II", GW, GH) + hcm.tobytes() + cover.tobytes())
print("geo.bin (несжато):", len(geo), "terrain (несжато):", hcm.nbytes + cover.nbytes)

# ---------- места, выезды, точка старта ----------
places = []
for n in tagged_nodes:
    t = n["tags"]
    if t.get("place") in ("city", "town", "village", "hamlet", "suburb", "neighbourhood", "quarter", "locality", "island") and t.get("name"):
        x, z = nodes[n["id"]]
        if X0 < x < -X0 and Z0 < z < -Z0:
            places.append({"name": t.get("name:ru") or t["name"], "name_uk": t["name"], "kind": t["place"], "x": round(x, 1), "z": round(z, 1)})
pois = []
def poi(t, x, z):
    for key in ("amenity", "shop", "office", "tourism", "leisure", "military", "man_made"):
        if key in t:
            pois.append({"k": key + "=" + t[key], "n": t.get("name", ""), "x": round(x, 1), "z": round(z, 1)})
            return
for n in tagged_nodes:
    poi(n["tags"], *nodes[n["id"]])
for b in buildings:
    poi(b["tags"], b["cx"], b["cz"])
json.dump(pois, open(os.path.join(OUT, "pois.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

extra = {}
extra_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "city_extra.json")
if os.path.exists(extra_path):
    extra = json.load(open(extra_path, encoding="utf-8"))
def snap(x, z, classes):
    """притянуть точку к ближайшей дороге нужного класса -> (x, z, угол дороги в градусах)"""
    best = None
    for r in roads:
        if r["cls"] not in classes or r["bridge"]:
            continue
        pts = r["pts"]
        for k in range(len(pts)):
            d = (pts[k][0] - x) ** 2 + (pts[k][1] - z) ** 2
            if best is None or d < best[0]:
                a_ = pts[max(0, k - 1)]; b_ = pts[min(len(pts) - 1, k + 1)]
                best = (d, pts[k][0], pts[k][1], math.degrees(math.atan2(-(b_[0] - a_[0]), -(b_[1] - a_[1]))), r["w"])
    return best
exits = []
for e in extra.get("exits", []):
    b_ = snap(e["x"], e["z"], (0, 1))
    exits.append({"name": e["name"], "x": round(b_[1], 1), "z": round(b_[2], 1), "yaw": round(b_[3], 1), "width": b_[4]})
spawns = {}
for k, v in extra.get("spawns", {}).items():
    b_ = snap(v["x"], v["z"], tuple(v.get("road_cls", (2, 3))))
    spawns[k] = [round(b_[1], 1), round(b_[2], 1)]
    extra.setdefault("spawn_yaw", round(b_[3], 1))
if "home" not in spawns:
    spawns["home"] = [0.0, 0.0]

meta = {
    "version": 4, "name": "Черкассы", "origin": {"lat": LAT0, "lon": LON0}, "m_per_deg": {"lat": MLAT, "lon": MLON},
    "x0": X0, "z0": Z0, "nx": NX, "nz": NZ, "chunk": CHUNK, "cell": CELL, "sea_level_offset": YOFF,
    "spawns": spawns, "spawn_yaw": extra.get("spawn_yaw", 0), "exits": exits, "places": places,
    "counts": {"buildings": len(buildings), "roads": len(roads), "barriers": len(barriers), "pois": len(pois), "lines": len(lines), "decals": len(decals), "props": len(props)},
    "attribution": "Карта: © участники OpenStreetMap (ODbL) · Высоты: NASA SRTM",
}
json.dump(meta, open(os.path.join(OUT, "city.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------- картинка карты ----------
MW = 4096
sc = MW / (NX * CHUNK)
MH = int(round(NZ * CHUNK * sc))
PAL = np.array([(112, 110, 104), (104, 122, 92), (74, 98, 70), (58, 84, 104), (176, 166, 132), (124, 121, 115),
                (112, 110, 114), (136, 130, 100), (100, 110, 96), (128, 128, 128)], dtype=np.uint8)
base_img = Image.fromarray(PAL[np.minimum(cover, 9)], "RGB").resize((MW, MH), Image.NEAREST)
# лёгкая тень рельефа
sh_ = np.clip(1.0 + (np.gradient(Hf, axis=1) + np.gradient(Hf, axis=0)) * 0.12, 0.75, 1.25)
shade = Image.fromarray(np.uint8(np.clip(sh_ * 128, 0, 255)), "L").resize((MW, MH), Image.BILINEAR)
base_img = Image.composite(base_img, Image.new("RGB", (MW, MH), (0, 0, 0)), Image.new("L", (MW, MH), 255))
arr = np.asarray(base_img, dtype=np.float32) * (np.asarray(shade, dtype=np.float32)[..., None] / 128.0)
img = Image.fromarray(np.uint8(np.clip(arr, 0, 255)), "RGB")
d = ImageDraw.Draw(img)
def mp(x, z):
    return ((x - X0) * sc, (z - Z0) * sc)
RC = {0: (236, 200, 120), 1: (232, 226, 200), 2: (210, 210, 210), 3: (180, 180, 180), 4: (160, 140, 110), 5: (150, 146, 138), 6: (190, 190, 190), 7: (60, 50, 45)}
for order in (5, 4, 3, 7, 2, 1, 0):
    for r in roads:
        if r["cls"] == order:
            d.line([mp(*p) for p in r["pts"]], fill=RC[order], width=max(1, int(round(r["w"] * sc))))
BC = {0: (70, 70, 74), 1: (88, 80, 70), 2: (60, 64, 76), 3: (70, 72, 80), 4: (84, 80, 76), 5: (110, 90, 60), 6: (90, 76, 110), 7: (150, 120, 50)}
for b in buildings:
    d.polygon([mp(*p) for p in b["pts"]], fill=BC[b["kind"]])
img.save(os.path.join(OUT, "map.png"), optimize=True)
print("готово:", OUT, {k: os.path.getsize(os.path.join(OUT, k)) for k in os.listdir(OUT)})
