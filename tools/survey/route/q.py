import osmium, sys, math
S, W, N, E = 49.34, 31.90, 49.53, 32.20
LAT0, LON0 = (S+N)/2,(W+E)/2
p=math.radians(LAT0)
MLAT = 111132.92 - 559.82*math.cos(2*p) + 1.175*math.cos(4*p)
MLON = 111412.84*math.cos(p) - 93.5*math.cos(3*p)
keys = sys.argv[1:]
res = {}
class H(osmium.SimpleHandler):
    def way(self, w):
        t = w.tags
        nm = " | ".join(t.get(k,"") for k in ("name","old_name","name:ru","alt_name","ref"))
        if not nm.strip(" |"): return
        for k in keys:
            if k.lower() in nm.lower():
                locs=[n.location for n in w.nodes if n.location.valid()]
                if not locs: return
                lat=sum(l.lat for l in locs)/len(locs); lon=sum(l.lon for l in locs)/len(locs)
                if S<=lat<=N and W<=lon<=E:
                    res.setdefault((k, t.get("name",""), t.get("highway", t.get("building", t.get("amenity","")))), []).append((lat,lon))
    def node(self, n):
        t = n.tags
        nm = " | ".join(t.get(k,"") for k in ("name","old_name","name:ru","alt_name"))
        for k in keys:
            if nm and k.lower() in nm.lower() and S<=n.location.lat<=N and W<=n.location.lon<=E:
                res.setdefault((k, t.get("name",""), "node:"+t.get("place", t.get("amenity", t.get("shop", t.get("highway",""))))), []).append((n.location.lat,n.location.lon))
H().apply_file("/home/claude/mapsrc/cherkasy_oblast-latest.osm.pbf", locations=True)
for k,v in sorted(res.items()):
    lat=sum(a for a,b in v)/len(v); lon=sum(b for a,b in v)/len(v)
    print(k, len(v), round(lat,5), round(lon,5), "x=%.0f z=%.0f"%((lon-LON0)*MLON, -(lat-LAT0)*MLAT))
