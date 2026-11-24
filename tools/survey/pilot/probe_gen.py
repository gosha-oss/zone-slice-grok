# python3 probe_gen.py K  — печатает пачку проверок (batch JSON) для K следующих непроверенных точек обзора
import json, sys
K = int(sys.argv[1]); TAB = 2102494252
pts = json.load(open('points.json'))
done = set()
for l in open('log.jsonl'):
    try: done.add(json.loads(l)['id'])
    except: pass
probed = json.load(open('probe.json')) if __import__('os').path.exists('probe.json') else {}
JS = "for(let i=0;i<20&&/api=1/.test(location.href);i++)await new Promise(r=>setTimeout(r,500));/api=1/.test(location.href)?'T':/!1s\\w{22}/.test(location.href)?'OK':'NO'"
seen = []; acts = []
for p in pts:
    if p['kind'] != 'P' or p['id'] in done: continue
    k = '%s,%s' % (p['lat'], p['lon'])
    if k in probed or k in seen: continue
    seen.append(k)
    if len(seen) > K: break
    # url с первым направлением точки
    acts.append({"name": "navigate", "input": {"tabId": TAB, "url": "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + k}})
    acts.append({"name": "javascript_tool", "input": {"action": "javascript_exec", "tabId": TAB, "text": JS}})
seen = seen[:K]
json.dump(seen, open('probe_last.json', 'w'))
print(json.dumps(acts, ensure_ascii=False, separators=(',', ':')))
print('#', len(seen), 'viewpoints', file=sys.stderr)
