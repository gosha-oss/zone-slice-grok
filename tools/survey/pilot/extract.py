# Вытаскивает из OSM всё про пилотный район (мікрорайон Лісовий = Луначарка) в district.json
import osmium, sys, json, math
from shapely.geometry import Polygon, Point, LineString
MLAT, MLON, LAT0, LON0 = 111218.12, 72532.47, 49.435, 32.05
def xz(lat, lon): return ((lon - LON0) * MLON, (LAT0 - lat) * MLAT)
out = {"poly": None, "buildings": [], "roads": [], "trees": [], "entrances": []}
class A(osmium.SimpleHandler):
    def area(self, a):
        if a.tags.get("name") == "Мікрорайон Лісовий" and a.tags.get("place") == "quarter":
            ring = next(iter(a.outer_rings()))
            out["poly"] = [(p.lat, p.lon) for p in ring]
A().apply_file(sys.argv[1], locations=True)
poly = Polygon([(lon, lat) for lat, lon in out["poly"]])
big = poly.buffer(0.0006)   # ~45 м запаса, чтобы захватить улицы по краю
class B(osmium.SimpleHandler):
    def node(self, n):
        t = dict(n.tags)
        if not t: return
        p = Point(n.location.lon, n.location.lat)
        if not big.contains(p): return
        if t.get("natural") == "tree": out["trees"].append((n.location.lat, n.location.lon))
        if "entrance" in t: out["entrances"].append((n.id, n.location.lat, n.location.lon, t["entrance"]))
    def way(self, w):
        t = dict(w.tags)
        if "building" not in t and "highway" not in t: return
        try: pts = [(n.location.lat, n.location.lon) for n in w.nodes]
        except Exception: return
        if len(pts) < 2: return
        if "building" in t:
            if len(pts) < 4: return
            pg = Polygon([(lo, la) for la, lo in pts])
            c = pg.centroid
            if not poly.contains(c): return
            P = [xz(la, lo) for la, lo in pts]
            area = abs(sum(x1 * z2 - x2 * z1 for (x1, z1), (x2, z2) in zip(P, P[1:]))) / 2
            out["buildings"].append({"id": w.id, "lat": c.y, "lon": c.x, "area": round(area), "pts": pts,
                "tags": {k: v for k, v in t.items() if k.startswith(("building", "addr:", "name", "shop", "amenity", "roof", "height", "levels"))}})
        else:
            h = t["highway"]
            if h not in ("trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "service", "pedestrian", "footway"): return
            ls = LineString([(lo, la) for la, lo in pts])
            if not big.intersects(ls): return
            out["roads"].append({"id": w.id, "hw": h, "service": t.get("service", ""), "name": t.get("name", ""), "pts": pts})
B().apply_file(sys.argv[1], locations=True)
json.dump(out, open("district.json", "w"), ensure_ascii=False)
import collections
c = collections.Counter(b["tags"].get("building") for b in out["buildings"])
print("зданий:", len(out["buildings"]), dict(c.most_common(10)))
print("дорог:", collections.Counter(r["hw"] for r in out["roads"]))
print("деревьев на карте:", len(out["trees"]), "входов на карте:", len(out["entrances"]))
la = [p[0] for p in out["poly"]]; lo = [p[1] for p in out["poly"]]
print("границы:", min(la), max(la), min(lo), max(lo))
