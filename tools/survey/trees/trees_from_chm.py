"""Деревья Луначарки из карты высот крон Meta/WRI (1 м).
Источник: Meta and WRI, source imagery (c) Maxar.
Вход: GeoTIFF высот крон (EPSG:3857), pilot/district.json. Выход: trees.json (lat, lon, h, r, cls).
Запуск: python3 trees_from_chm.py <chm.tif> <district.json> <out.json>
"""
import sys, json, math
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from rasterio.features import rasterize
from rasterio.warp import transform as wtransform
from scipy import ndimage as ndi
from shapely.geometry import Polygon, LineString

MIN_H = 3.0      # ниже — кусты/шум, деревом не считаем
BLD_BUF = 1.5    # м: отступ от контура дома (крыша в карте высот даёт ложные "кроны")
ROAD_HALF = {'primary':6,'secondary':5,'tertiary':4,'residential':3,'service':2,'unclassified':3}

def to3857(lat, lon):
    x, y = wtransform('EPSG:4326', 'EPSG:3857', [lon], [lat]); return x[0], y[0]

def main(chm, dist, out):
    d = json.load(open(dist))
    P = [to3857(a, b) for a, b in d['poly']]
    poly = Polygon(P); minx, miny, maxx, maxy = poly.bounds
    with rasterio.open(chm) as src:
        assert src.crs.to_epsg() == 3857, src.crs
        win = from_bounds(minx, miny, maxx, maxy, src.transform).round_offsets().round_lengths()
        h = src.read(1, window=win).astype('float32'); T = src.window_transform(win)
        px = abs(T.a)                      # метров проекции на пиксель
    k = math.cos(math.radians(d['poly'][0][0]))   # проекционный метр -> настоящий
    shapes = []
    for b in d['buildings']:
        pts = [to3857(a, c) for a, c in b['pts']]
        if len(pts) >= 3: shapes.append(Polygon(pts).buffer(BLD_BUF / k))
    for r in d['roads']:
        pts = [to3857(a, c) for a, c in r['pts']]
        if len(pts) >= 2: shapes.append(LineString(pts).buffer(ROAD_HALF.get(r.get('hw'), 2) / k))
    block = rasterize(shapes, out_shape=h.shape, transform=T, fill=0, default_value=1).astype(bool)
    inside = rasterize([poly], out_shape=h.shape, transform=T, fill=0, default_value=1).astype(bool)
    h[block | ~inside] = 0
    hs = ndi.gaussian_filter(h, 1.0)
    trees = []
    # окно поиска вершины зависит от высоты: высокое дерево — шире крона
    for lo, hi, win_m in ((3, 8, 3), (8, 15, 5), (15, 99, 7)):
        w = max(3, int(round(win_m / (px * k))) | 1)
        mx = ndi.maximum_filter(hs, size=w)
        ys, xs = np.where((hs == mx) & (hs >= lo) & (hs < hi) & (h >= MIN_H))
        for y, x in zip(ys, xs):
            X, Y = T * (x + 0.5, y + 0.5)
            lon, lat = wtransform('EPSG:3857', 'EPSG:4326', [X], [Y])
            hh = float(h[max(0, y-1):y+2, max(0, x-1):x+2].max())
            trees.append({'lat': round(lat[0], 7), 'lon': round(lon[0], 7), 'h': round(hh, 1),
                          'r': round(min(6.0, max(1.2, hh * 0.28)), 1),
                          'cls': 'low' if hh < 8 else 'mid' if hh < 15 else 'tall'})
    cover = float((h >= MIN_H).sum()) / max(1, inside.sum())
    json.dump({'credit': 'Meta and WRI, source imagery © Maxar', 'count': len(trees),
               'canopy_cover': round(cover, 3), 'trees': trees}, open(out, 'w'))
    print('trees', len(trees), 'cover', round(cover, 3),
          {c: sum(t['cls'] == c for t in trees) for c in ('low', 'mid', 'tall')})

if __name__ == '__main__':
    main(*sys.argv[1:4])
