# python3 probe_apply.py "NO,OK,NO,..."  — применяет результаты последней пачки
import json, sys, os, subprocess
res = sys.argv[1].replace(' ', '').split(',')
seen = json.load(open('probe_last.json'))
assert len(res) == len(seen), (len(res), len(seen))
probed = json.load(open('probe.json')) if os.path.exists('probe.json') else {}
pts = json.load(open('points.json'))
for k, r in zip(seen, res):
    if r == 'T': continue
    probed[k] = r
    if r == 'NO':
        for p in pts:
            if p['kind'] == 'P' and '%s,%s' % (p['lat'], p['lon']) == k:
                subprocess.run(['python3', 'shot.py', p['id'], '-', 'no_pano'], stdout=subprocess.DEVNULL)
json.dump(probed, open('probe.json', 'w'))
ok = [k for k, v in probed.items() if v == 'OK']
print('probed', len(probed), 'ok viewpoints', len(ok))
