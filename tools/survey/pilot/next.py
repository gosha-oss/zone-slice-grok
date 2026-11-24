# python3 next.py [N] — следующие N точек, которые ещё не сняты
import json, sys, os
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6
done = set()
if os.path.exists("log.jsonl"):
    for l in open("log.jsonl"):
        r = json.loads(l)
        if r["status"] in ("ok", "no_pano", "black", "skip"): done.add(r["id"])
pts = json.load(open("points.json"))
left = [p for p in pts if p["id"] not in done]
print("осталось %d из %d" % (len(left), len(pts)))
for p in left[:N]: print(p["id"], p["url"])
