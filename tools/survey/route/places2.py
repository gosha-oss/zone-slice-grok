import osmium
S,N,W,E=49.34,49.53,31.90,32.20
class H(osmium.SimpleHandler):
    def node(s,n):
        t=n.tags
        if t.get('place') in ('suburb','neighbourhood','quarter','locality') :
            la,lo=n.location.lat,n.location.lon
            if S<=la<=N and W<=lo<=E: print('PLACE',t.get('place'),t.get('name'),t.get('name:ru',''),round(la,5),round(lo,5))
    def way(s,w):
        t=w.tags; nm=t.get('name','')
        if any(k in nm for k in ('Можайськ','Азот','Хімволокно','Фотоприлад','Черкаське хімволокно','ТЕЦ','завод','Завод','Комбінат','комбінат')) or t.get('place') in('suburb','neighbourhood','quarter'):
            try: pts=[(x.location.lat,x.location.lon) for x in w.nodes]
            except Exception: return
            la=sum(p[0] for p in pts)/len(pts); lo=sum(p[1] for p in pts)/len(pts)
            if S<=la<=N and W<=lo<=E: print('WAY',t.get('highway') or t.get('landuse') or t.get('building') or t.get('place'),nm,round(la,5),round(lo,5),len(pts))
H().apply_file('/home/claude/mapsrc/cherkasy_oblast-latest.osm.pbf',locations=True)
