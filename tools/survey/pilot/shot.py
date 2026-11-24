# python3 shot.py ID ПУТЬ_К_СКРИНШОТУ [статус] [заметка]
# статус: ok (по умолчанию) · no_pano · black · captcha · skip. Без снимка вместо пути — дефис.
import json, sys, os, shutil, time
pid, src = sys.argv[1], sys.argv[2]
status = sys.argv[3] if len(sys.argv) > 3 else "ok"
note = sys.argv[4] if len(sys.argv) > 4 else ""
P = {p["id"]: p for p in json.load(open("points.json"))}
assert pid in P, "нет такой точки: " + pid
dst = ""
if src != "-":
    assert os.path.exists(src), "нет файла: " + src
    dst = "shots/%s%s" % (pid, os.path.splitext(src)[1] or ".png")
    shutil.copy(src, dst)
p = P[pid]
import re
real = {}
mm = re.search(r"maps/@(-?[0-9.]+),(-?[0-9.]+),[0-9.]+a,[0-9.]+y,([0-9.]+)h", note)
if mm:
    real = dict(real_lat=float(mm.group(1)), real_lon=float(mm.group(2)), real_heading=float(mm.group(3)))
    pm = re.search(r"!1s([A-Za-z0-9_-]{10,})!2e", note)
    if pm: real["panoid"] = pm.group(1)
    note = ""
rec = dict(id=pid, status=status, file=dst, note=note, **real, t=time.strftime("%Y-%m-%d %H:%M:%S"),
           kind=p["kind"], lat=p["lat"], lon=p["lon"], heading=p.get("heading"), url=p["url"])
open("log.jsonl", "a").write(json.dumps(rec, ensure_ascii=False) + "\n")
print(pid, status, dst)
