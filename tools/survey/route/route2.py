import json,math,random
d=json.load(open('osm_walk.json')); roads=d['roads']
LAT0,LON0=49.435,32.05; MLAT,MLON=111218.12,72532.47
def xy(la,lo): return ((lo-LON0)*MLON,(la-LAT0)*MLAT)
def brg(a,b,c,e):
    x1,y1=xy(a,b);x2,y2=xy(c,e); return int((math.degrees(math.atan2(x2-x1,y2-y1))+360)%360)
segs=[]
for a,b,c,e,hw,nm in roads:
    x1,y1=xy(a,b);x2,y2=xy(c,e); segs.append((x1,y1,x2,y2,hw,nm,a,b,c,e))
def around(la,lo,n,R=450,cls=None):
    X,Y=xy(la,lo); cand=[]
    for s in segs:
        if cls and s[4] not in cls: continue
        mx,my=(s[0]+s[2])/2,(s[1]+s[3])/2
        if math.hypot(mx-X,my-Y)<R and math.hypot(s[2]-s[0],s[3]-s[1])>25: cand.append(s)
    random.seed(int(la*1e4)); random.shuffle(cand)
    pick=[]
    for s in cand:
        mx,my=(s[0]+s[2])/2,(s[1]+s[3])/2
        if all(math.hypot(mx-p[0],my-p[1])>R*0.45 for p in pick): pick.append((mx,my,s))
        if len(pick)>=n: break
    out=[]
    for mx,my,s in pick:
        out.append((round(LAT0+my/MLAT,6),round(LON0+mx/MLON,6),brg(s[6],s[7],s[8],s[9]),s[5] or s[4]))
    return out
def facing(la,lo,name):
    X,Y=xy(la,lo); best=None
    for s in segs:
        if s[4] in ('residential','tertiary','secondary','primary','unclassified','trunk'):
            x1,y1,x2,y2=s[:4]; dx,dy=x2-x1,y2-y1; ll=dx*dx+dy*dy
            if not ll: continue
            t=max(0,min(1,((X-x1)*dx+(Y-y1)*dy)/ll)); px,py=x1+t*dx,y1+t*dy; dd=math.hypot(X-px,Y-py)
            if best is None or dd<best[0]: best=(dd,px,py)
    la2,lo2=LAT0+best[2]/MLAT,LON0+best[1]/MLON
    return (round(la2,6),round(lo2,6),brg(la2,lo2,la,lo),name)
R=[]
dist=[('Юг (Южный)',49.43196,32.02207,6),('Юго-Западный',49.43181,32.00924,5),('Химпоселок',49.40228,32.0361,7),('Днепровский (Д)',49.40299,32.09787,6),('Можайского',49.4571,32.0315,5),('Луначарка (Лесной/Поляна)',49.4557,32.0021,6),('Казбет',49.45364,32.04262,3),('Мытница',49.43782,32.08465,3),('Сосновка',49.46864,32.01229,3),('Дахновский',49.48441,31.98695,3),('Кирилловка/Пятиэтажки',49.37917,32.02354,2),('Центр Соборный',49.43044,32.06779,2)]
for nm,la,lo,n in dist:
    for p in (around(la,lo,n,700,('primary','secondary','tertiary','trunk','unclassified'))+around(la,lo,n,450,('residential',)))[:n]: R.append(dict(cat='5_районы',title=f'{nm}: {p[3]}',lat=p[0],lon=p[1],heading=p[2]))
fac=[('Азот проходная',49.3662,32.0700),('Химволокно',49.3875,32.07455),('Богдан (легковые)',49.43989,32.01673),('Богдан (грузовики)',49.40682,32.10977),('Аврора',49.40233,32.11424),('Приборостроительный завод',49.42105,32.01258),('Шелковый комбинат',49.39714,32.04176),('Завод ТЕХНО',49.39372,32.04374),('УпМаш',49.4171,32.08624),('Мясокомбинат',49.42157,32.03896)]
for nm,la,lo in fac:
    p=facing(la,lo,nm); R.append(dict(cat='6_заводы',title=nm,lat=p[0],lon=p[1],heading=p[2]))
for i,r in enumerate(R): r['n']=100+i
json.dump(R,open('route2.json','w'),ensure_ascii=False)
print(len(R))
for r in R: print(r['n'],r['title'][:50],r['lat'],r['lon'],r['heading'])
