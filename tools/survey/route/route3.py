import json,math,random
exec(open('route2.py').read().split("R=[]")[0])
done=[json.loads(l) for l in open('notes.jsonl')]
def far(la,lo,d=180):
    X,Y=xy(la,lo)
    return all(math.hypot(*(a-b for a,b in zip(xy(r['lat'],r['lon']),(X,Y))))>d for r in done if r.get('lat'))
R=[]
areas=[('Юг',49.4320,32.0170,700,6),('Химпоселок',49.4030,32.0350,600,5),('Днепровский',49.4040,32.0990,700,5),('Можайского',49.4570,32.0300,500,4),('Луначарка',49.4550,32.0040,600,4),('Центр',49.4430,32.0600,700,8),('Мытница',49.4380,32.0850,600,3),('Казбет',49.4530,32.0430,500,3),('Дахновка',49.4840,31.9870,700,2)]
for nm,la,lo,rad,n in areas:
    c=[p for p in around(la,lo,n*4,rad,('primary','secondary','tertiary','unclassified','residential')) if far(p[0],p[1])]
    for p in c[:n]: R.append(dict(cat='5_районы',title=f'{nm}: {p[3]}',lat=p[0],lon=p[1],heading=p[2]))
lm=[('Драмтеатр',49.44395,32.05994),('ТЦ Любава',49.44569,32.05844),('Речной вокзал',49.4500,32.0780),('Стадион Черкаси-Арена',49.4402,32.0644),('Площадь Славы/Замковая гора',49.4482,32.0661),('Набережная Мытница',49.4425,32.0905),('Парк Сосновка вход',49.4710,32.0180),('Обласна лікарня',49.4655,32.0160)]
for nm,la,lo in lm:
    p=facing(la,lo,nm); R.append(dict(cat='2_здания',title=nm,lat=p[0],lon=p[1],heading=p[2]))
for i,r in enumerate(R): r['n']=200+i
json.dump(R,open('route3.json','w'),ensure_ascii=False)
for r in R: print(r['n'],r['title'][:45],r['lat'],r['lon'],r['heading'])
