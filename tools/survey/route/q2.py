import osmium, math, collections
S, W, N, E = 49.34, 31.90, 49.53, 32.20
LAT0, LON0 = (S+N)/2,(W+E)/2
p=math.radians(LAT0)
MLAT = 111132.92 - 559.82*math.cos(2*p) + 1.175*math.cos(4*p)
MLON = 111412.84*math.cos(p) - 93.5*math.cos(3*p)
res = collections.defaultdict(list)
class H(osmium.SimpleHandler):
    def way(self, w):
        t = w.tags
        if t.get("highway") in ("trunk","primary","secondary"):
            for n in w.nodes:
                l=n.location
                if l.valid() and S<=l.lat<=N and W<=l.lon<=E:
                    res[(t.get("highway"), t.get("ref",""), t.get("name",""))].append(((l.lon-LON0)*MLON, -(l.lat-LAT0)*MLAT))
H().apply_file("/home/claude/mapsrc/cherkasy_oblast-latest.osm.pbf", locations=True)
for k,v in sorted(res.items(), key=lambda kv:-len(kv[1]))[:40]:
    xs=[a for a,b in v]; zs=[b for a,b in v]
    print(k, len(v), "x %.0f..%.0f z %.0f..%.0f"%(min(xs),max(xs),min(zs),max(zs)))
