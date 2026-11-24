# python3 sync.py — готовит новые снимки к переносу на ПК; печатает списки для device_commit_files (по 45 файлов)
import json, os, shutil, time
PC = r"E:\AI_Workspace\01_PROJECTS\Active\Games\Game_01_UNTITLED\01_refs\survey\lunacharka"
synced = set(open("synced.txt").read().split()) if os.path.exists("synced.txt") else set()
new = sorted(f for f in os.listdir("shots") if f not in synced)
base = "/mnt/user-data/outputs/survey_%d" % int(time.time())
batches = [new[i:i + 45] for i in range(0, len(new), 45)] or [[]]
for k, b in enumerate(batches):
    d = "%s_%d" % (base, k); os.makedirs(d, exist_ok=True)
    files = []
    for f in b:
        shutil.copy("shots/" + f, d + "/" + f)
        files.append({"stagedPath": d + "/" + f, "devicePath": PC + "\\shots\\" + f})
    if k == len(batches) - 1:
        for f in ("log.jsonl", "points.json", "README.md"):
            if os.path.exists(f):
                shutil.copy(f, d + "/" + f); files.append({"stagedPath": d + "/" + f, "devicePath": PC + "\\" + f})
    print(json.dumps(files, ensure_ascii=False))
open("synced.txt", "a").write("".join(f + "\n" for f in new))
print("# новых снимков: %d. Подожди 5 секунд перед device_commit_files, потом проверь device_list_dir." % len(new))
