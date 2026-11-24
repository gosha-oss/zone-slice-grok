import osmium, json, sys, collections
from shapely import wkt
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union, transform
from shapely.strtree import STRtree
P=json.load(open('city/places.json'))
city=[wkt.loads(p['wkt']) for p in P if p['place']=='city' and p['name']=='Черкаси'][0]
Q=[(p['name'].replace('Мікрорайон ',''),wkt.loads(p['wkt'])) for p in P if p['place']=='quarter' and p['name'].startswith('Мікрорайон')]
MX,MY=72532.47,111218.12
def m(g): return transform(lambda x,y:(x*MX,y*MY),g)
names=[n for n,_ in Q]; geoms=[g for _,g in Q]; tree=STRtree(geoms)
S={n:collections.Counter() for n in names+['вне мікрорайонів']}
R={n:collections.Counter() for n in S}
cityb=city.buffer(0.002)
DRIVE=('trunk','primary','secondary','tertiary','unclassified','residential','living_street','service')
class H(osmium.SimpleHandler):
    def way(self,w):
        t=w.tags
        if 'building' not in t and t.get('highway') not in DRIVE: return
        try: pts=[(n.lon,n.lat) for n in w.nodes]
        except Exception: return
        if 'building' in t:
            if len(pts)<4: return
            pg=Polygon(pts)
            if not pg.is_valid: pg=pg.buffer(0)
            c=pg.centroid
            if not cityb.contains(c): return
            idx=tree.query(c,predicate='within'); n=names[idx[0]] if len(idx) else 'вне мікрорайонів'
            a=m(pg).area; b=t.get('building')
            S[n]['все']+=1
            if a>=250: S[n]['крупные']+=1
            if b in ('apartments','dormitory'): S[n]['многокв']+=1
            if b in ('house','detached','semidetached_house') or (b=='yes' and a<250): S[n]['частн/мелк']+=1
            if b in ('industrial','warehouse','garages','garage','commercial','retail','service','hangar'): S[n]['пром/торг/гараж']+=1
            if b in ('school','kindergarten','university','college','hospital','church','public','civic','government'): S[n]['соц']+=1
            if 'building:levels' in t: S[n]['с этажами']+=1
        else:
            ls=LineString(pts)
            if not cityb.intersects(ls): return
            hw=t['highway']; svc=t.get('service','')
            if hw=='service' and svc in ('parking_aisle','driveway'): hw='service_mini'
            for i in tree.query(ls,predicate='intersects'):
                L=m(ls.intersection(geoms[i])).length
                R[names[i]][hw]+=L
            rest=ls.intersection(cityb).difference(unary_union([geoms[i] for i in tree.query(ls)])) if True else None
            if rest is not None and not rest.is_empty: R['вне мікрорайонів'][hw]+=m(rest).length
H().apply_file(sys.argv[1],locations=True)
out=[]
for n,g in Q+[('вне мікрорайонів',city.difference(unary_union(geoms)))]:
    area=m(g).area/1e6
    main=sum(v for k,v in R[n].items() if k in ('trunk','primary','secondary','tertiary','unclassified','residential','living_street'))
    out.append({'name':n,'km2':round(area,2),**S[n],'road_km':round(main/1000,1),'service_km':round(R[n]['service']/1000,1),'mini_km':round(R[n]['service_mini']/1000,1)})
json.dump(out,open('city/stats.json','w'),ensure_ascii=False,indent=0)
print('city km2',round(m(city).area/1e6,1),'quarters km2',round(m(unary_union(geoms)).area/1e6,1))
for o in sorted(out,key=lambda o:-o['все']): print(o)
