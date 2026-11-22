#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скачивает с Mapillary точечные объекты по Черкассам: знаки, столбы, фонари,
люки, гидранты, светофоры и т.д. Только координаты и тип, фотографии не качает.

Ключ вводится в окне (символы не видны), нигде не сохраняется и в файлы не пишется.
Можно прерывать (Ctrl+C) и запускать снова: докачивает с того же места.
Использует только стандартные модули Python, ничего ставить не нужно.
"""
import sys, os, json, time, getpass, urllib.request, urllib.error

BASE = "https://graph.mapillary.com/map_features"

# Весь город с запасом (совпадает с картой игры): запад, юг, восток, север
CITY = (31.900, 49.340, 32.200, 49.530)
# Проба: небольшой участок в центре города
TEST = (32.0560, 49.4410, 32.0660, 49.4490)

START_CELL = 0.05      # начальный размер ячейки, градусов
MIN_CELL = 0.0004      # меньше не делим (~30 м)
LIMIT = 2000           # сколько объектов просим за раз
SPLIT_AT = 500         # если в ответе столько и больше, ячейка могла обрезаться: делим её на 4 и качаем заново
PAUSE = 0.15           # пауза между запросами, секунд


class AuthError(Exception):
    pass


def say(*a):
    print(*a, flush=True)


def _clean(text, token):
    return str(text).replace(token, "***") if token else str(text)


def fetch(base, token, bbox, limit=LIMIT):
    """Один запрос. Возвращает ('ok', список) или ('split', None) или ('fail', текст)."""
    w, s, e, n = bbox
    url = (base + "?fields=id,object_value,geometry,first_seen_at,last_seen_at"
           "&limit=%d&bbox=%.6f,%.6f,%.6f,%.6f" % (limit, w, s, e, n))
    req = urllib.request.Request(url, headers={"Authorization": "OAuth " + token})
    last = ""
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.loads(r.read().decode("utf-8"))
            return "ok", data.get("data", [])
        except urllib.error.HTTPError as ex:
            body = ""
            try:
                body = ex.read().decode("utf-8", "replace")
            except Exception:
                pass
            low = body.lower()
            if ex.code in (401, 403) or "invalid oauth" in low or ("access token" in low and "expired" in low):
                raise AuthError(_clean(body or ex.code, token))
            if ex.code == 400 and ("reduce" in low or "too large" in low or "too much" in low
                                   or "limit" in low or "bbox" in low):
                return "split", None
            last = "HTTP %s %s" % (ex.code, _clean(body[:200], token))
            if ex.code == 400 and attempt >= 2:
                return "split", None
        except Exception as ex:  # сеть, таймаут
            last = _clean(ex, token)
        time.sleep(1.5 * (attempt + 1))
    return "fail", last


def children(bbox):
    w, s, e, n = bbox
    mx, my = (w + e) / 2, (s + n) / 2
    return [(w, s, mx, my), (mx, s, e, my), (w, my, mx, n), (mx, my, e, n)]


def grid(bbox, step):
    w, s, e, n = bbox
    cells = []
    y = s
    while y < n - 1e-9:
        x = w
        while x < e - 1e-9:
            cells.append((x, y, min(x + step, e), min(y + step, n)))
            x += step
        y += step
    return cells


def key(b):
    return "%.6f,%.6f,%.6f,%.6f" % b


def download(token, out_dir, bbox, base=BASE, limit=LIMIT, pause=PAUSE, quiet=False):
    """Скачивает bbox в out_dir. Возвращает (всего_объектов, число_неудачных_ячеек)."""
    os.makedirs(out_dir, exist_ok=True)
    jl = os.path.join(out_dir, "features.jsonl")
    pr = os.path.join(out_dir, "progress.json")
    failed_path = os.path.join(out_dir, "failed.txt")

    seen = set()
    if os.path.exists(jl):
        with open(jl, encoding="utf-8") as f:
            for line in f:
                try:
                    seen.add(json.loads(line)["id"])
                except Exception:
                    pass
    prog = {"done": [], "split": []}
    if os.path.exists(pr):
        try:
            prog = json.load(open(pr, encoding="utf-8"))
        except Exception:
            pass
    if prog.get("v") != 2:   # старая докачка считала обрезанные ответы готовыми, начинаем ячейки заново
        prog = {"done": [], "split": [], "v": 2}
    done, split = set(prog["done"]), set(prog["split"])
    thr = min(limit, SPLIT_AT)
    failed = 0
    reqs = 0

    def save_prog():
        tmp = pr + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"done": sorted(done), "split": sorted(split), "v": 2}, f)
        os.replace(tmp, pr)

    stack = list(reversed(grid(bbox, START_CELL)))
    out = open(jl, "a", encoding="utf-8")
    total_cells = len(stack)
    try:
        while stack:
            cell = stack.pop()
            k = key(cell)
            if k in done:
                continue
            if k in split:
                stack.extend(reversed(children(cell)))
                continue
            status, res = fetch(base, token, cell, limit)
            reqs += 1
            time.sleep(pause)
            size = cell[2] - cell[0]
            if status == "ok" and len(res) >= thr and size > MIN_CELL:
                status = "split"
            if status == "split" and size > MIN_CELL:
                split.add(k)
                save_prog()
                stack.extend(reversed(children(cell)))
                continue
            if status == "fail":
                failed += 1
                with open(failed_path, "a", encoding="utf-8") as f:
                    f.write("%s  %s\n" % (k, res))
                if not quiet:
                    say("  ячейка не скачалась, пропускаю (записал в failed.txt)")
                continue
            if status == "split":      # слишком мелко, берём что есть
                res = res or []
            added = 0
            for it in res or []:
                try:
                    fid = it["id"]
                    if fid in seen:
                        continue
                    lon, lat = it["geometry"]["coordinates"][:2]
                    rec = {"id": fid, "v": it.get("object_value", ""), "lon": lon, "lat": lat,
                           "last": it.get("last_seen_at", "")}
                except Exception:
                    continue
                seen.add(fid)
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                added += 1
            out.flush()
            done.add(k)
            save_prog()
            if not quiet and (reqs % 10 == 0 or added):
                say("  запросов: %d, объектов всего: %d" % (reqs, len(seen)))
    finally:
        out.close()
    return len(seen), failed


def summarize(out_dir):
    """Собирает итоговый файл и сводку по типам."""
    jl = os.path.join(out_dir, "features.jsonl")
    items, counts = [], {}
    if os.path.exists(jl):
        with open(jl, encoding="utf-8") as f:
            for line in f:
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                items.append(r)
                counts[r["v"]] = counts.get(r["v"], 0) + 1
    with open(os.path.join(out_dir, "mapillary_cherkasy.json"), "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False)
    lines = ["Всего объектов: %d" % len(items), ""]
    for v, c in sorted(counts.items(), key=lambda x: -x[1]):
        lines.append("%7d  %s" % (c, v))
    with open(os.path.join(out_dir, "summary.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return len(items), counts


def groups(counts):
    g = {"знаки": 0, "фонари": 0, "столбы": 0, "люки": 0, "гидранты": 0, "светофоры": 0, "прочее": 0}
    for v, c in counts.items():
        if v.startswith(("regulatory--", "warning--", "information--", "complementary--")):
            g["знаки"] += c
        elif "street-light" in v:
            g["фонари"] += c
        elif "utility-pole" in v or "pole" in v:
            g["столбы"] += c
        elif "manhole" in v:
            g["люки"] += c
        elif "hydrant" in v:
            g["гидранты"] += c
        elif "traffic-light" in v:
            g["светофоры"] += c
        else:
            g["прочее"] += c
    return g


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "data")
    say("=" * 60)
    say(" Mapillary: скачивание знаков, столбов, фонарей, люков (Черкассы)")
    say("=" * 60)
    say("Вставь ключ доступа (Access Token, начинается с MLY|) и нажми Enter.")
    say("Символы не отображаются, это нормально. Ключ нигде не сохраняется.")
    token = getpass.getpass("Ключ: ").strip()
    if not token.startswith("MLY|"):
        say("Ключ должен начинаться с MLY| . Проверь, что скопировал Access Token целиком.")
        return 1
    try:
        say("\nШаг 1. Проба: смотрю небольшой участок в центре города...")
        tdir = os.path.join(out_dir, "_probe")
        n, failed = download(token, tdir, TEST, quiet=True)
        total, counts = summarize(tdir)
        g = groups(counts)
        say("Нашёл объектов: %d" % total)
        for k, v in g.items():
            say("   %-10s %d" % (k, v))
        if total == 0:
            say("\nВ центре города у Mapillary пусто (или ключ без доступа к данным).")
            ans = input("Всё равно скачивать весь город? (д/н): ").strip().lower()
        else:
            ans = input("\nСкачать весь город? Это займёт от 10 минут до часа. (д/н): ").strip().lower()
        if ans not in ("д", "y", "yes", "да"):
            say("Остановились после пробы. Ничего больше не скачивалось.")
            return 0
        say("\nШаг 2. Качаю весь город. Можно прервать (Ctrl+C) и запустить снова: докачает.")
        n, failed = download(token, os.path.join(out_dir, "city"), CITY)
        total, counts = summarize(os.path.join(out_dir, "city"))
        say("\nГотово. Объектов: %d, не скачалось ячеек: %d" % (total, failed))
        for k, v in groups(counts).items():
            say("   %-10s %d" % (k, v))
        say("\nФайлы лежат в папке: " + os.path.join(out_dir, "city"))
        say("Скажи Claude «Mapillary скачан».")
    except AuthError:
        say("\nMapillary не принял ключ (неверный или просрочен). Проверь, что это Access Token.")
        return 1
    except KeyboardInterrupt:
        say("\nОстановлено. Запусти снова, докачает с того же места.")
        return 0
    return 0


if __name__ == "__main__":
    try:
        code = main()
    except BaseException:
        import traceback
        text = traceback.format_exc()
        print("\nОшибка:\n" + text)
        try:
            d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, "last_error.txt"), "w", encoding="utf-8") as f:
                f.write(text)
        except Exception:
            pass
        code = 1
    try:
        input("\nНажми Enter, чтобы закрыть окно...")
    except Exception:
        pass
    sys.exit(code)
