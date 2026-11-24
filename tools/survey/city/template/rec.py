# python3 rec.py A009:2idelf P0003:ck7wo7:"заметка" P0009:-:no_pano ...
#  ID:ключ            -> ok (ключ = 6 символов из имени файла «Image source»)
#  ID:ключ:заметка    -> ok + заметка (адрес/место камеры)
#  ID:-:статус        -> без файла (no_pano / black / captcha / skip)
import sys, glob, subprocess
for a in sys.argv[1:]:
    parts = a.split(":", 2)
    pid, key = parts[0], parts[1]
    extra = parts[2] if len(parts) > 2 else ""
    if key == "-":
        subprocess.run(["python3", "shot.py", pid, "-", extra or "no_pano"]); continue
    f = glob.glob("/tmp/claude-tool-results/*/*-%s-*.jpg" % key)
    if len(f) != 1: print("!!", pid, key, f); continue
    cmd = ["python3", "shot.py", pid, f[0]] + (["ok", extra] if extra else [])
    subprocess.run(cmd)
