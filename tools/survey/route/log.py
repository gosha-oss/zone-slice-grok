import sys,json,os,shutil
# usage: log.py n src_path "title" "notes"
n,src,title,notes=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4]
R={r['n']:r for r in json.load(open('route.json'))+json.load(open('route2.json'))+json.load(open('route3.json'))}
r=R.get(int(n.split('_')[0]),{})
cat=r.get('cat','5_прочее')
os.makedirs(f'lib/{cat}',exist_ok=True)
safe=''.join(c if c.isalnum() or c in '-_ ' else '_' for c in title)[:50].strip().replace(' ','_')
dst=f'lib/{cat}/{int(n.split("_")[0]):03d}{("_"+n.split("_")[1]) if "_" in n else ""}_{safe}.jpg'
shutil.copy(src,dst)
with open('notes.jsonl','a') as f: f.write(json.dumps(dict(n=n,cat=cat,title=title,file=dst,lat=r.get('lat'),lon=r.get('lon'),notes=notes),ensure_ascii=False)+'\n')
print(dst)
