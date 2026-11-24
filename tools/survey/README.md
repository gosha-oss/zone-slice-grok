# tools/survey — съёмка города для игры 01 (Черкассы)

Скрипты, которыми нарезается город на районы и точки съёмки (спутник A, Street View P), и вспомогательные данные.
Сами снимки и журналы съёмки в GitHub НЕ кладутся (снимки Google — только справка для себя): они лежат на ПК в
`E:\AI_Workspace\01_PROJECTS\Active\Games\Game_01_UNTITLED\01_refs\survey\`.

## Что где

| Папка | Что |
|---|---|
| `city/` | выгрузка районов из OSM (`extract_q.py`), сетка точек (`gen_q.py`), контуры мікрорайонов (`places.json`, `places.py`), статистика по районам (`stats.py`, `stats.json`, `tiers.json`) |
| `city/template/` | четыре рабочих скрипта района: `next.py` (что снимать дальше), `shot.py` (запись в журнал), `rec.py` (запись пачки), `sync.py` (пачки для переноса на ПК). Шаблон взят у `sosnivskyi`; для нового района слово `sosnivskyi` заменяется на slug района |
| `city/points/` | точки съёмки по готовым районам (sosnivskyi, dakhnivskyi, peremoha, blahovisnyi) |
| `pilot/` | пилот Луначарка (мікрорайон «Лісовий»): тот же конвейер, первая версия |
| `passport/` | рабочие списки паспортов зданий Луначарки |
| `trees/` | деревья из карты высот крон (`trees_from_chm.py`) и итог для Луначарки |
| `route/` | первые скрипты и пробы маршрута (старое, для справки) |

## Как запустить в новой сессии

1. `pip install --break-system-packages osmium shapely numpy`
2. Рабочая папка должна быть именно `/home/claude/walk/city` (пути зашиты в скриптах). Взять `walk_backup_24-11.tar.gz` с ПК (`...\survey\_handoff_07\`), распаковать в `/home/claude` — там всё: скрипты, контуры, точки, журналы и списки уже перенесённых файлов по всем районам.
3. Карта OSM лежит на ПК там же частями: `cat cherkasy_oblast-latest.osm.pbf.part* > /home/claude/mapsrc/cherkasy_oblast-latest.osm.pbf`, проверка — `SHA256SUMS.txt`. Высоты `N49E031.hgt.gz`, `N49E032.hgt.gz` — туда же.

## Новый район

Из `/home/claude/walk/city`:

    python3 extract_q.py "Назва" slug      # имя БЕЗ слова «Мікрорайон»; «вне» = город без мікрорайонів
    python3 gen_q.py slug
    cd q
    for f in next.py shot.py sync.py rec.py; do sed 's/sosnivskyi/slug/g' sosnivskyi/$f > slug/$f; done
    touch slug/synced.txt

В `sync.py` путь на ПК: `...\01_refs\survey\<slug>`. Подробный порядок съёмки и правила записи — в файле передачи
(проект «01 Портфолио», документ `claude/передача-07-1-в-07-2-съёмка-районов.md`).

© участники OpenStreetMap (данные карты).
