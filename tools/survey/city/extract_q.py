# python3 extract_q.py "Соснівський" slug  -> city/q/<slug>/district.json  (как pilot/extract.py, но для любого мікрорайону)
import osmium, sys, json, os
from shapely import wkt
from shapely.geometry import Polygon, Point, LineString
name, slug = sys.argv[1], sys.argv[2]
P = json.load(open('/home/claude/walk/city/places.json'))
if name == 'вне':
    city = [wkt.loads(p['wkt']) for p in P if p['name'] == 'Черкаси'][0].buffer(0.002)
    from shapely.ops import unary_union
    g = city.difference(unary_union([wkt.loads(p['wkt']) for p in P if p['place'] == 'quarter' and p['name'].startswith('Мікрорайон')]))
else:
    g = [wkt.loads(p['wkt']) for p in P if p['place'] == 'quarter' and p['name'] == 'Мікрорайон ' + name][0]
big = g.buffer(0.0006)
MLAT, MLON = 111218.12, 72532.47
d = "/home/claude/walk/city/q/" + slug; os.makedirs(d + "/shots", exist_ok=True)
poly = max(g.geoms, key=lambda x: x.area) if hasattr(g, 'geoms') else g
out = {"poly": [(la, lo) for lo, la in poly.exterior.coords], "wkt": g.wkt, "buildings": [], "roads": [], "entrances": []}
class B(osmium.SimpleHandler):
    def node(self, n):
        t = dict(n.tags)
        if "entrance" in t and big.contains(Point(n.location.lon, n.location.lat)):
            out["entrances"].append((n.id, n.location.lat, n.location.lon, t["entrance"]))
    def way(self, w):
        t = dict(w.tags)
        if "building" not in t and "highway" not in t: return
        try: pts = [(n.location.lat, n.location.lon) for n in w.nodes]
        except Exception: return
        if len(pts) < 2: return
        if "building" in t:
            if len(pts) < 4: return
            pg = Polygon([(lo, la) for la, lo in pts])
            if not pg.is_valid: pg = pg.buffer(0)
            c = pg.centroid
            if not g.contains(c): return
            area = abs(pg.area) * MLAT * MLON
            out["buildings"].append({"id": w.id, "lat": c.y, "lon": c.x, "area": round(area), "pts": pts,
                "tags": {k: v for k, v in t.items() if k.startswith(("building", "addr:", "name", "shop", "amenity", "roof", "height"))}})
        else:
            h = t["highway"]
            if h not in ("trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "service", "pedestrian"): return
            if h == "service" and t.get("service") in ("parking_aisle", "driveway"): return
            ls = LineString([(lo, la) for la, lo in pts])
            if not big.intersects(ls): return
            out["roads"].append({"id": w.id, "hw": h, "service": t.get("service", ""), "name": t.get("name", ""), "pts": pts})
B().apply_file('/home/claude/mapsrc/cherkasy_oblast-latest.osm.pbf', locations=True)
json.dump(out, open(d + "/district.json", "w"), ensure_ascii=False)
print(name, "зданий", len(out["buildings"]), "дорог", len(out["roads"]), "входов", len(out["entrances"]))
