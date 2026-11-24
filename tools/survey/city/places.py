import osmium, json, sys
from shapely.geometry import Polygon, MultiPolygon
res=[]
class H(osmium.SimpleHandler):
    def area(self,a):
        t=dict(a.tags)
        p=t.get('place'); b=t.get('boundary'); al=t.get('admin_level')
        keep = p in ('city','town','village','suburb','quarter','neighbourhood','borough','hamlet','locality') or (b=='administrative' and al in ('6','7','8','9','10'))
        if not keep: return
        try:
            polys=[]
            for o in a.outer_rings():
                ring=[(n.lon,n.lat) for n in o]
                if len(ring)>=4: polys.append(Polygon(ring))
            if not polys: return
            g=MultiPolygon(polys) if len(polys)>1 else polys[0]
            c=g.representative_point()
            if not (31.8<c.x<32.3 and 49.30<c.y<49.55): return
            res.append({'name':t.get('name',''),'place':p,'boundary':b,'al':al,'id':a.orig_id(),'from_way':a.from_way(),
                        'wkt':g.wkt,'lat':c.y,'lon':c.x})
        except Exception as e: pass
H().apply_file(sys.argv[1],locations=True)
json.dump(res,open('city/places.json','w'),ensure_ascii=False)
for r in res: print(r['place'],r['boundary'],r['al'],r['name'],round(r['lat'],4),round(r['lon'],4))
