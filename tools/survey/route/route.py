import json, math, collections
d=json.load(open('/home/claude/walk/osm_walk.json'))
roads=d['roads']; pois=d['pois']
LAT0,LON0=49.435,32.05; MLAT,MLON=111218.12,72532.47
def xy(la,lo): return ((lo-LON0)*MLON,(la-LAT0)*MLAT)
def bearing(la1,lo1,la2,lo2):
    x1,y1=xy(la1,lo1);x2,y2=xy(la2,lo2); return (math.degrees(math.atan2(x2-x1,y2-y1))+360)%360
# length per named major road
L=collections.defaultdict(list)
for la1,lo1,la2,lo2,hw,nm in roads:
    if hw in('primary','secondary','trunk','tertiary') and nm: L[(nm,hw)].append((la1,lo1,la2,lo2))
tot=sorted(((sum(math.dist(xy(a,b),xy(c,e)) for a,b,c,e in v),k) for k,v in L.items()),reverse=True)
for l,k in tot[:45]: print(int(l),k)

def seg_points(nm,hw,step):
    segs=L[(nm,hw)]; out=[]; acc=step/2
    for a,b,c,e in segs:
        l=math.dist(xy(a,b),xy(c,e))
        while acc<l:
            t=acc/l; out.append((a+(c-a)*t,b+(e-b)*t,bearing(a,b,c,e))); acc+=step
        acc-=l
    # keep spread: dedupe within 500m
    res=[]
    for p in out:
        if all(math.dist(xy(p[0],p[1]),xy(q[0],q[1]))>step*0.7 for q in res): res.append(p)
    return res
def near_road(la,lo,maxd=300):
    best=None
    X,Y=xy(la,lo)
    for a,b,c,e,hw,nm in roads:
        x1,y1=xy(a,b);x2,y2=xy(c,e);dx,dy=x2-x1,y2-y1;ll=dx*dx+dy*dy
        if ll==0: continue
        t=max(0,min(1,((X-x1)*dx+(Y-y1)*dy)/ll)); px,py=x1+t*dx,y1+t*dy
        dd=math.hypot(X-px,Y-py)
        if dd<maxd and (best is None or dd<best[0]): best=(dd,LAT0+py/MLAT,LON0+px/MLON,nm)
    return best
route=[]
def add(cat,title,la,lo,hd): route.append(dict(cat=cat,title=title,lat=round(la,6),lon=round(lo,6),heading=int(hd)))
mains=[('бульвар Шевченка','secondary',1400),('Сумгаїтська вулиця','primary',1600),('Благовісна вулиця','secondary',1600),('Надпільна вулиця','secondary',1600),('вулиця Шевченка','tertiary',1800),('вулиця Чигиринський Шлях','primary',1800),('вулиця Героїв Холодного Яру','primary',1800),('проспект Хіміків','primary',1800),('Пастерівська вулиця','secondary',1800),('Черкаська дамба','primary',1600),('вулиця Вʼячеслава Чорновола','secondary',1800),('Смілянська вулиця','secondary',1300),('Смілянська вулиця','primary',1500),('Канівська вулиця','primary',1700),('вулиця Хрещатик','tertiary',900),('вулиця Небесної Сотні','tertiary',1000),('Дахнівська вулиця','tertiary',2500),('Черкаська обʼїзна дорога','primary',3000),('вулиця Гетьмана Сагайдачного','secondary',1500),('вулиця Героїв Дніпра','secondary',1200),('проспект Перемоги','primary',1200),('вулиця Онопрієнка','primary',1500),('Припортова вулиця','secondary',1500),('вулиця Максима Залізняка','secondary',1500),('вулиця Лейтенанта Мукана','secondary',1500)]
for nm,hw,st in mains:
    for la,lo,hd in seg_points(nm,hw,st): add('1_улицы',nm,la,lo,hd)
def poi(cat,title,la,lo):
    r=near_road(la,lo)
    if r: add(cat,title,r[1],r[2],bearing(r[1],r[2],la,lo))
key=[('пожарная','Пожежно-рятувальна частина №2'),('пожарная','ДПРЧ-1'),('полиция','Головне управління Національної поліції'),('полиция','Управління патрульної поліції'),('суд','Придніпровський районний суд міста Черкаси'),('суд','Черкаський окружний адміністративний суд'),('администрация','Черкаська міська рада'),('администрация','Прокуратура Черкаського району'),('автовокзал','Автовокзал "Черкаси" (АС-1)'),('вокзал','Вокзал Черкаси'),('рынок','Критий ринок'),('рынок','Ринок Луна'),('рынок','Казбетський ринок'),('рынок','Привокзальний ринок'),('тюрьма','Черкаський слідчий ізолятор'),('тюрьма','Черкаська виправна колонія №62'),('больница','Міська лікарня №1'),('больница','Обласна Лікарня')]
for c,nm in key:
    for p in pois[c]:
        if p[2]==nm: poi('2_здания',f'{c}: {nm}',p[0],p[1]); break
for p in sorted(pois['промзона'],key=lambda p:-p[3])[:5]: poi('2_здания','промзона '+(p[2] or ''),p[0],p[1])
for p in sorted(pois['гаражи'],key=lambda p:-p[3])[:2]: poi('3_типовое','гаражный кооператив',p[0],p[1])
tall=[p for p in pois['многоэтажка'] if p[2] in('9','10','12','14','16')]; five=[p for p in pois['многоэтажка'] if p[2] in('5',)]
for p in tall[::max(1,len(tall)//4)][:4]: poi('3_типовое',f'многоэтажка {p[2]} эт.',p[0],p[1])
for p in five[::max(1,len(five)//3)][:3]: poi('3_типовое','пятиэтажка',p[0],p[1])
# Луначарка / дом героя: несколько точек вокруг спавна
hx,hz=-3214.5,-2249.8; hla,hlo=LAT0-hz/MLAT,LON0+hx/MLON
for dx,dz in((0,0),(300,0),(-300,150),(0,-350),(250,350)):
    la,lo=LAT0-(hz+dz)/MLAT,LON0+(hx+dx)/MLON; r=near_road(la,lo,400)
    if r: add('3_типовое','Луначарка (частный сектор)',r[1],r[2],(bearing(r[1],r[2],la,lo)+90)%360)
import json as J
ex=J.load(open('/home/claude/zone-slice-grok/city/city.json'))['exits']
for e in ex:
    la,lo=LAT0-e['z']/MLAT,LON0+e['x']/MLON; add('4_выезды','выезд '+e['name'],la,lo,0)
# dedupe close points
fin=[]
for r in route:
    if all(math.dist(xy(r['lat'],r['lon']),xy(q['lat'],q['lon']))>120 or r['cat']!=q['cat'] for q in fin): fin.append(r)
fin.sort(key=lambda r:(r['cat']))
for i,r in enumerate(fin): r['n']=i+1
J.dump(fin,open('/home/claude/walk/route.json','w'),ensure_ascii=False,indent=0)
print(len(fin), collections.Counter(r['cat'] for r in fin))
