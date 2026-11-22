class_name ChunkBuilder
extends RefCounted
## Строит один квадрат города (256×256 м) из компактных данных: земля, дома, дороги, заборы.
## Работает в фоновом потоке. Ничего не знает про сцену.

const COVER_COLORS: Array[Color] = [
	Color(0.52, 0.51, 0.48),  # 0 земля
	Color(0.45, 0.52, 0.40),  # 1 трава, парк
	Color(0.33, 0.42, 0.31),  # 2 лес
	Color(0.27, 0.32, 0.35),  # 3 дно воды
	Color(0.72, 0.68, 0.55),  # 4 песок
	Color(0.56, 0.55, 0.52),  # 5 жилой двор
	Color(0.50, 0.49, 0.50),  # 6 промзона
	Color(0.58, 0.56, 0.44),  # 7 поле
	Color(0.45, 0.48, 0.43),  # 8 кладбище
	Color(0.57, 0.57, 0.57),  # 9 площадка, торговля
]
const BUILDING_COLORS: Array[Color] = [
	Color(0.78, 0.78, 0.78),  # 0 прочее
	Color(0.80, 0.77, 0.72),  # 1 частный дом
	Color(0.74, 0.75, 0.78),  # 2 многоэтажка
	Color(0.62, 0.63, 0.66),  # 3 завод, склад
	Color(0.60, 0.58, 0.56),  # 4 гараж, сарай
	Color(0.80, 0.74, 0.62),  # 5 школа, больница, власть
	Color(0.72, 0.70, 0.78),  # 6 магазин, офис
	Color(0.86, 0.80, 0.60),  # 7 церковь
]
const ROAD_COLORS: Array[Color] = [
	Color(0.21, 0.21, 0.22),  # 0 главная
	Color(0.23, 0.23, 0.24),  # 1 районная
	Color(0.26, 0.26, 0.27),  # 2 жилая улица
	Color(0.31, 0.31, 0.31),  # 3 проезд
	Color(0.46, 0.41, 0.34),  # 4 грунтовка
	Color(0.63, 0.61, 0.57),  # 5 тротуар, тропа
	Color(0.60, 0.60, 0.60),  # 6 пешеходная зона
	Color(0.30, 0.25, 0.22),  # 7 рельсы
]
const BARRIER_COLOR := Color(0.47, 0.46, 0.45)
const WATER_COLOR := Color(0.20, 0.30, 0.38)
const SKIRT := 1.6        # насколько борт дороги уходит вниз, м
const WALL_DOWN := 3.0    # насколько стены домов уходят под землю, м
const U := 0.0625         # единица координат в данных, м

const MARK_COLOR := Color(0.80, 0.80, 0.77)
const CURB_COLOR := Color(0.60, 0.60, 0.58)
const VERGE_COLOR := Color(0.44, 0.47, 0.40)

var v := PackedVector3Array()
var nrm := PackedVector3Array()
var col := PackedColorArray()
var idx := PackedInt32Array()
# разметка, люки, заплаты: отдельная сетка без столкновений и теней
var dv := PackedVector3Array()
var dc := PackedColorArray()
var di := PackedInt32Array()
# мелкие детали (столбики, прутья, перекладины): видны только вблизи, без теней и столкновений
var ev := PackedVector3Array()
var en := PackedVector3Array()
var ec := PackedColorArray()
var ei := PackedInt32Array()
var cv := PackedVector3Array()      # невидимые стенки для столкновений (сетка, прутья)
var _det := false                   # куда сейчас пишет _pq: в детали или в основную сетку
# свет: накладывается сложением, виден только ночью
var gv := PackedVector3Array()
var gc := PackedColorArray()
var gi := PackedInt32Array()
var lamps := PackedVector3Array()   # где висят лампы (для настоящих источников света рядом с игроком)
var _ck := ""

static func build(c: Vector2i, with_shape: bool) -> Dictionary:
	var b := ChunkBuilder.new()
	return b._build(c, with_shape)

func _build(c: Vector2i, with_shape: bool) -> Dictionary:
	var D := CityData
	_ck = "%d_%d" % [c.x, c.y]
	_terrain(c)
	var rec := D.chunk_record(c)
	var water: ArrayMesh = null
	if rec.y > 0:
		water = _features(rec.x)
	for q: Array in D.local_props.get(_ck, []):
		_prop(int(q[0]), Vector3(q[1], q[3], q[2]), q[4], int(q[5]))
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = v
	arrays[Mesh.ARRAY_NORMAL] = nrm
	arrays[Mesh.ARRAY_COLOR] = col
	arrays[Mesh.ARRAY_INDEX] = idx
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	for q: Array in D.local_decals.get(_ck, []):
		_decal(int(q[0]), Vector3(q[1], q[3], q[2]), q[4], q[5], q[6], q[7])
	var out := {"mesh": mesh, "water": water, "tris": (idx.size() + di.size()) / 3, "decals": null}
	if not dv.is_empty():
		var dn := PackedVector3Array()
		dn.resize(dv.size())
		dn.fill(Vector3.UP)
		var da := []
		da.resize(Mesh.ARRAY_MAX)
		da[Mesh.ARRAY_VERTEX] = dv
		da[Mesh.ARRAY_NORMAL] = dn
		da[Mesh.ARRAY_COLOR] = dc
		da[Mesh.ARRAY_INDEX] = di
		var dm := ArrayMesh.new()
		dm.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, da)
		out["decals"] = dm
	if not gv.is_empty():
		var ga := []
		ga.resize(Mesh.ARRAY_MAX)
		ga[Mesh.ARRAY_VERTEX] = gv
		ga[Mesh.ARRAY_COLOR] = gc
		ga[Mesh.ARRAY_INDEX] = gi
		var gm := ArrayMesh.new()
		gm.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, ga)
		out["glow"] = gm
		out["lamps"] = lamps
	if not ev.is_empty():
		var ea := []
		ea.resize(Mesh.ARRAY_MAX)
		ea[Mesh.ARRAY_VERTEX] = ev
		ea[Mesh.ARRAY_NORMAL] = en
		ea[Mesh.ARRAY_COLOR] = ec
		ea[Mesh.ARRAY_INDEX] = ei
		var em := ArrayMesh.new()
		em.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, ea)
		out["detail"] = em
		out["tris_detail"] = ei.size() / 3
	out["cfaces"] = cv
	if with_shape:
		out["shape"] = make_shape(mesh, cv)
	return out

## Форма для столкновений: видимая сетка плюс невидимые стенки.
static func make_shape(mesh: ArrayMesh, extra: PackedVector3Array) -> Shape3D:
	if extra.is_empty():
		return mesh.create_trimesh_shape()
	var faces := mesh.get_faces()
	faces.append_array(extra)
	var sh := ConcavePolygonShape3D.new()
	sh.set_faces(faces)
	return sh

# ---------- земля ----------
func _terrain(c: Vector2i) -> void:
	var D := CityData
	var n := D.CPC + 1
	var i0 := c.x * D.CPC
	var j0 := c.y * D.CPC
	var base := v.size()
	for j in n:
		for i in n:
			var gi := i0 + i
			var gj := j0 + j
			var y := D.h(gi, gj)
			v.push_back(Vector3(i * D.CELL, y, j * D.CELL))
			var dx := D.h(gi + 1, gj) - D.h(gi - 1, gj)
			var dz := D.h(gi, gj + 1) - D.h(gi, gj - 1)
			nrm.push_back(Vector3(-dx, 2.0 * D.CELL, -dz).normalized())
			col.push_back(COVER_COLORS[mini(D.cover_at_cell(gi, gj), COVER_COLORS.size() - 1)])
	for j in D.CPC:
		for i in D.CPC:
			var a := base + j * n + i
			idx.push_back(a); idx.push_back(a + 1); idx.push_back(a + n)
			idx.push_back(a + 1); idx.push_back(a + n + 1); idx.push_back(a + n)

# ---------- дома, дороги, заборы ----------
func _features(p: int) -> ArrayMesh:
	var g := CityData.geo
	# вода: по каждому уровню — маска клеток 32×32
	var wv := PackedVector3Array()
	var nlev := g[p]; p += 1
	for _l in nlev:
		var wy := g.decode_s16(p) * 0.01; p += 2
		for j in CityData.CPC:
			var row := g.decode_u32(p + j * 4)
			var i := 0
			while i < 32:
				if (row >> i) & 1 == 0:
					i += 1
					continue
				var i1 := i
				while i1 < 32 and (row >> i1) & 1 == 1:
					i1 += 1
				var xa := i * CityData.CELL
				var xb := i1 * CityData.CELL
				var za := j * CityData.CELL
				var zb := za + CityData.CELL
				wv.push_back(Vector3(xa, wy, za)); wv.push_back(Vector3(xb, wy, za)); wv.push_back(Vector3(xa, wy, zb))
				wv.push_back(Vector3(xb, wy, za)); wv.push_back(Vector3(xb, wy, zb)); wv.push_back(Vector3(xa, wy, zb))
				i = i1
		p += 128
	# дома
	var nb := g.decode_u16(p); p += 2
	for _b in nb:
		var kind := g[p]
		var npts := g[p + 1]
		var base_y := g.decode_s16(p + 2) * 0.01
		var height := g.decode_u16(p + 4) * 0.1
		p += 6
		var poly := PackedVector2Array()
		poly.resize(npts)
		for k in npts:
			poly[k] = Vector2(g.decode_s16(p) * U, g.decode_s16(p + 2) * U)
			p += 4
		_building(poly, base_y, height, kind, p)
	# дороги
	var nr := g.decode_u16(p); p += 2
	for _r in nr:
		var cls := g[p]
		var width := g[p + 1] * 0.25
		var flags := g[p + 2]
		var surf := g[p + 3]
		var npts := g.decode_u16(p + 4)
		p += 6
		var pts := PackedVector3Array()
		pts.resize(npts)
		for k in npts:
			pts[k] = Vector3(g.decode_s16(p) * U, g.decode_s16(p + 4) * 0.01, g.decode_s16(p + 2) * U)
			p += 6
		_road(pts, width, cls, flags, surf)
	# заборы и стены
	var nbar := g.decode_u16(p); p += 2
	for _w in nbar:
		var height := g[p + 1] * 0.1
		var ftype := g[p] & 15
		var fvar := g[p] >> 4
		var npts := g.decode_u16(p + 2)
		p += 4
		var fpts := PackedVector3Array()
		fpts.resize(npts)
		for k in npts:
			fpts[k] = Vector3(g.decode_s16(p) * U, g.decode_s16(p + 4) * 0.01, g.decode_s16(p + 2) * U)
			p += 6
		_fence(fpts, ftype, fvar, height)
	# линии: разметка, бордюры, парковки
	var nl := g.decode_u16(p); p += 2
	for _l in nl:
		var ltype := g[p]
		var lw := g[p + 1] * 0.01
		var npts := g.decode_u16(p + 2)
		p += 4
		var pts := PackedVector3Array()
		pts.resize(npts)
		for k in npts:
			pts[k] = Vector3(g.decode_s16(p) * U, g.decode_s16(p + 4) * 0.01, g.decode_s16(p + 2) * U)
			p += 6
		if ltype == 10:
			_curb(pts)
		else:
			_line(pts, lw, ltype, p)
	# наклейки: зебры, стоп-линии, люки, решётки, заплаты
	var nd := g.decode_u16(p); p += 2
	for _d in nd:
		_decal(g[p], Vector3(g.decode_s16(p + 1) * U, g.decode_s16(p + 5) * 0.01, g.decode_s16(p + 3) * U),
			g.decode_s16(p + 7) * 0.1, g.decode_s8(p + 9) * 0.01, g[p + 10] * 0.1, g[p + 11] * 0.1)
		p += 12
	# уличные предметы
	var np := g.decode_u16(p); p += 2
	for _q in np:
		_prop(g[p], Vector3(g.decode_s16(p + 1) * U, g.decode_s16(p + 5) * 0.01, g.decode_s16(p + 3) * U), g.decode_s16(p + 7) * 0.1, g[p + 9])
		p += 10
	if wv.is_empty():
		return null
	var wn := PackedVector3Array()
	wn.resize(wv.size())
	wn.fill(Vector3.UP)
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = wv
	arrays[Mesh.ARRAY_NORMAL] = wn
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return m

func _building(poly: PackedVector2Array, base_y: float, height: float, kind: int, seed_i: int) -> void:
	var n := poly.size()
	if n < 3:
		return
	var c := BUILDING_COLORS[mini(kind, BUILDING_COLORS.size() - 1)]
	var shade := 0.94 + 0.10 * float((seed_i * 2654435761) & 0xFF) / 255.0
	c = Color(c.r * shade, c.g * shade, c.b * shade)
	var top := base_y + height
	var bot := base_y - WALL_DOWN
	for k in n:
		var a := poly[k]
		var b := poly[(k + 1) % n]
		_wall(Vector3(a.x, 0, a.y), Vector3(b.x, 0, b.y), bot, bot, top, top, c)
	var tri := Geometry2D.triangulate_polygon(poly)
	if tri.is_empty():
		return
	var base := v.size()
	var rc := Color(c.r * 0.82, c.g * 0.82, c.b * 0.82)
	for k in n:
		v.push_back(Vector3(poly[k].x, top, poly[k].y))
		nrm.push_back(Vector3.UP)
		col.push_back(rc)
	for t in range(0, tri.size(), 3):
		var a := poly[tri[t]]
		var b := poly[tri[t + 1]]
		var d := poly[tri[t + 2]]
		if (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x) > 0.0:
			idx.push_back(base + tri[t]); idx.push_back(base + tri[t + 1]); idx.push_back(base + tri[t + 2])
		else:
			idx.push_back(base + tri[t]); idx.push_back(base + tri[t + 2]); idx.push_back(base + tri[t + 1])

## Вертикальная стенка от p к q. Лицом наружу, если контур идёт «по часовой» при взгляде сверху.
func _wall(p: Vector3, q: Vector3, pb: float, qb: float, pt: float, qt: float, c: Color) -> void:
	var d := Vector2(q.x - p.x, q.z - p.z)
	if d.length_squared() < 0.0001:
		return
	d = d.normalized()
	var nn := Vector3(d.y, 0.0, -d.x)
	var base := v.size()
	v.push_back(Vector3(p.x, pb, p.z)); v.push_back(Vector3(q.x, qb, q.z))
	v.push_back(Vector3(q.x, qt, q.z)); v.push_back(Vector3(p.x, pt, p.z))
	for _k in 4:
		nrm.push_back(nn)
		col.push_back(c)
	idx.push_back(base); idx.push_back(base + 1); idx.push_back(base + 2)
	idx.push_back(base); idx.push_back(base + 2); idx.push_back(base + 3)

func _road(pts: PackedVector3Array, width: float, cls: int, flags: int, surf: int = 0) -> void:
	var n := pts.size()
	if n < 2:
		return
	var c := ROAD_COLORS[mini(cls, ROAD_COLORS.size() - 1)]
	if cls == 7:
		_rails(pts)
		width = 3.2
		c = Color(0.40, 0.38, 0.36)
	elif surf == 1:
		c = Color(0.55, 0.52, 0.50)      # плитка, брусчатка
	elif surf == 2:
		c = Color(0.52, 0.52, 0.51)      # бетон
	elif surf == 3:
		c = Color(0.50, 0.49, 0.47)      # достроенный тротуар (асфальт)
	elif cls <= 3:
		# у каждой улицы свой оттенок асфальта
		var sh := 0.92 + 0.16 * float((int(pts[0].x * 3.0) * 73856093 ^ int(pts[0].z * 3.0) * 19349663) & 0xFF) / 255.0
		c = Color(c.r * sh, c.g * sh, c.b * sh)
	var hw := width * 0.5
	var skirt := cls <= 3 or (flags & 1) != 0
	var base := v.size()
	var sides := PackedVector3Array()
	sides.resize(n * 2)
	for k in n:
		var d0 := Vector2.ZERO
		var d1 := Vector2.ZERO
		if k > 0:
			d0 = Vector2(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z).normalized()
		if k < n - 1:
			d1 = Vector2(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z).normalized()
		var d := (d0 + d1)
		if d.length_squared() < 0.0001:
			d = d1 if d1 != Vector2.ZERO else d0
		d = d.normalized()
		var scale := 1.0
		if k > 0 and k < n - 1:
			scale = 1.0 / maxf(0.5, d.dot(d1))
		var off := Vector3(d.y, 0.0, -d.x) * (hw * scale)
		var a := pts[k] + off
		var b := pts[k] - off
		sides[k * 2] = a
		sides[k * 2 + 1] = b
		v.push_back(a); v.push_back(b)
		nrm.push_back(Vector3.UP); nrm.push_back(Vector3.UP)
		col.push_back(c); col.push_back(c)
	for k in n - 1:
		var a := base + k * 2
		# a = левый, a+1 = правый, a+2 = следующий левый, a+3 = следующий правый
		idx.push_back(a); idx.push_back(a + 2); idx.push_back(a + 1)
		idx.push_back(a + 1); idx.push_back(a + 2); idx.push_back(a + 3)
	if skirt:
		var sc := Color(c.r * 0.8, c.g * 0.8, c.b * 0.8)
		for k in n - 1:
			var a := sides[k * 2]
			var a2 := sides[k * 2 + 2]
			var b := sides[k * 2 + 1]
			var b2 := sides[k * 2 + 3]
			_wall(a, a2, a.y - SKIRT, a2.y - SKIRT, a.y, a2.y, sc)
			_wall(b2, b, b2.y - SKIRT, b.y - SKIRT, b2.y, b.y, sc)

# ---------- детали дорог ----------
func _dquad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, color: Color) -> void:
	var base := dv.size()
	dv.push_back(a); dv.push_back(b); dv.push_back(c); dv.push_back(d)
	for _k in 4:
		dc.push_back(color)
	di.push_back(base); di.push_back(base + 1); di.push_back(base + 2)
	di.push_back(base); di.push_back(base + 2); di.push_back(base + 3)
	di.push_back(base); di.push_back(base + 2); di.push_back(base + 1)
	di.push_back(base); di.push_back(base + 3); di.push_back(base + 2)

## Нормаль влево в точке k ломаной (в плоскости XZ).
func _left(pts: PackedVector3Array, k: int) -> Vector3:
	var a := pts[maxi(k - 1, 0)]
	var b := pts[mini(k + 1, pts.size() - 1)]
	var d := Vector2(b.x - a.x, b.z - a.z)
	if d.length_squared() < 0.000001:
		return Vector3.ZERO
	d = d.normalized()
	return Vector3(d.y, 0.0, -d.x)

## Линия разметки: 0 сплошная, 1 прерывистая, 5 контур парковки.
func _line(pts: PackedVector3Array, width: float, ltype: int, seed_i: int) -> void:
	var n := pts.size()
	if n < 2:
		return
	var wear := 0.72 + 0.28 * float((seed_i * 2654435761) & 0xFF) / 255.0
	var c := Color(MARK_COLOR.r * wear, MARK_COLOR.g * wear, MARK_COLOR.b * wear)
	if ltype == 5:
		c = Color(0.66, 0.66, 0.64)
	var hw := width * 0.5
	var dash := 2.5
	var gap := 5.0
	var s := 0.0
	for k in n - 1:
		var a := pts[k]
		var b := pts[k + 1]
		var la := _left(pts, k) * hw
		var lb := _left(pts, k + 1) * hw
		if ltype != 1:
			_dquad(a + la, b + lb, b - lb, a - la, c)
			continue
		var seg := Vector2(b.x - a.x, b.z - a.z).length()
		if seg < 0.001:
			continue
		var t := 0.0
		while t < seg:
			var ph := fmod(s + t, dash + gap)
			if ph < dash:
				var t1 := minf(seg, t + dash - ph)
				var p0 := a.lerp(b, t / seg)
				var p1 := a.lerp(b, t1 / seg)
				_dquad(p0 + la, p1 + la, p1 - la, p0 - la, c)
				t = t1 + 0.0001
			else:
				t += dash + gap - ph
		s += seg

## Бордюр: дорога слева от линии. Скат к дороге, полка, откос наружу.
func _curb(pts: PackedVector3Array) -> void:
	var n := pts.size()
	if n < 2:
		return
	var offs: Array[float] = [0.0, 0.17, 0.36, 1.05]
	var ups: Array[float] = [0.0, 0.13, 0.13, -0.30]
	var cols: Array[Color] = [CURB_COLOR, CURB_COLOR, CURB_COLOR * 1.06, VERGE_COLOR]
	var base := v.size()
	for k in n:
		var r := -_left(pts, k)
		for m in 4:
			v.push_back(pts[k] + r * offs[m] + Vector3(0.0, ups[m], 0.0))
			nrm.push_back(Vector3.UP)
			col.push_back(cols[m] if m < 3 else VERGE_COLOR)
	for k in n - 1:
		for m in 3:
			var a := base + k * 4 + m
			# a = ближе к дороге, a+1 = дальше; следующий ряд +4
			idx.push_back(a); idx.push_back(a + 4); idx.push_back(a + 1)
			idx.push_back(a + 1); idx.push_back(a + 4); idx.push_back(a + 5)
		var o := v[base + k * 4 + 3]
		var o2 := v[base + k * 4 + 7]
		_wall(o2, o, o2.y - 1.2, o.y - 1.2, o2.y, o.y, VERGE_COLOR * 0.85)
	# торцы: закрываем профиль с обеих сторон
	for e: int in [base, base + (n - 1) * 4]:
		for t: Array in [[0, 1, 2], [0, 2, 3]]:
			idx.push_back(e + t[0]); idx.push_back(e + t[1]); idx.push_back(e + t[2])
			idx.push_back(e + t[0]); idx.push_back(e + t[2]); idx.push_back(e + t[1])

## Наклейка на дороге. yaw — направление дороги в градусах, slope — уклон вдоль неё.
func _decal(dtype: int, c: Vector3, yaw: float, slope: float, a: float, b: float) -> void:
	var th := deg_to_rad(yaw)
	var f := Vector3(sin(th), 0.0, cos(th))       # вдоль дороги
	var r := Vector3(f.z, 0.0, -f.x)              # поперёк
	var up := Vector3(0.0, slope, 0.0)
	match dtype:
		1:  # зебра: полосы вдоль движения, a — ширина дороги, b — длина полос
			var cnt := maxi(2, int(a / 1.0))
			var step := a / cnt
			var hl := b * 0.5
			for i in cnt:
				var o := r * (-a * 0.5 + (i + 0.5) * step)
				var w := r * 0.25
				_dquad(c + o - w - f * hl - up * hl, c + o - w + f * hl + up * hl, c + o + w + f * hl + up * hl, c + o + w - f * hl - up * hl, MARK_COLOR * 0.95)
		2:  # стоп-линия: a поперёк, b вдоль
			_rect(c, f, r, up, b * 0.5, a * 0.5, MARK_COLOR * 0.9)
		3:  # люк
			var rad := a * 0.5
			var base := dv.size()
			var cc := Color(0.17, 0.16, 0.15)
			dv.push_back(c); dc.push_back(cc * 1.25)
			for i in 10:
				var an := TAU * i / 10.0
				dv.push_back(c + Vector3(cos(an) * rad, 0.0, sin(an) * rad)); dc.push_back(cc)
			for i in 10:
				di.push_back(base); di.push_back(base + 1 + i); di.push_back(base + 1 + (i + 1) % 10)
				di.push_back(base); di.push_back(base + 1 + (i + 1) % 10); di.push_back(base + 1 + i)
		4:  # ливневая решётка
			_rect(c, f, r, up, b * 0.5, a * 0.5, Color(0.13, 0.13, 0.13))
		5:  # заплата на асфальте
			var hsh := float((int(c.x * 5.0) * 73856093 ^ int(c.z * 5.0) * 19349663) & 0xFF) / 255.0
			var g := 0.17 + 0.13 * hsh
			_rect(c, f, r, up, a * 0.5, b * 0.5, Color(g, g, g * 1.03))

func _rect(c: Vector3, f: Vector3, r: Vector3, up: Vector3, hl: float, hwid: float, color: Color) -> void:
	_dquad(c - r * hwid - f * hl - up * hl, c - r * hwid + f * hl + up * hl, c + r * hwid + f * hl + up * hl, c + r * hwid - f * hl - up * hl, color)

## Рельсы и шпалы поверх щебня.
func _rails(pts: PackedVector3Array) -> void:
	var n := pts.size()
	var steel := Color(0.34, 0.33, 0.33)
	var wood := Color(0.24, 0.20, 0.17)
	var s := 0.0
	for k in n - 1:
		var a := pts[k]
		var b := pts[k + 1]
		var seg := Vector2(b.x - a.x, b.z - a.z).length()
		if seg < 0.001:
			continue
		var f := Vector3(b.x - a.x, 0.0, b.z - a.z) / seg
		var r := Vector3(f.z, 0.0, -f.x)
		var la := _left(pts, k)
		var lb := _left(pts, k + 1)
		for side: float in [-0.76, 0.76]:
			var p0 := a + la * side + Vector3(0, 0.17, 0)
			var p1 := b + lb * side + Vector3(0, 0.17, 0)
			_dquad(p0 + la * 0.04, p1 + lb * 0.04, p1 - lb * 0.04, p0 - la * 0.04, steel * 1.25)
			_dquad(p0 + la * 0.04 - Vector3(0, 0.13, 0), p1 + lb * 0.04 - Vector3(0, 0.13, 0), p1 + lb * 0.04, p0 + la * 0.04, steel)
			_dquad(p0 - la * 0.04 - Vector3(0, 0.13, 0), p1 - lb * 0.04 - Vector3(0, 0.13, 0), p1 - lb * 0.04, p0 - la * 0.04, steel)
		var t := fmod(0.7 - fmod(s, 0.7), 0.7)
		while t < seg:
			var m := a.lerp(b, t / seg) + Vector3(0, 0.05, 0)
			_dquad(m - r * 1.3 - f * 0.12, m - r * 1.3 + f * 0.12, m + r * 1.3 + f * 0.12, m + r * 1.3 - f * 0.12, wood)
			t += 0.7
		s += seg

# ---------- уличные предметы: фонари, столбы, светофоры, знаки, остановки ----------
const POLE_COLOR := Color(0.50, 0.50, 0.49)
const METAL_DARK := Color(0.13, 0.14, 0.15)
const SIGN_BACK := Color(0.42, 0.43, 0.44)
const SIGN_RED := Color(0.72, 0.10, 0.09)
const SIGN_BLUE := Color(0.10, 0.27, 0.62)
const SIGN_WHITE := Color(0.88, 0.88, 0.86)
const SIGN_YELLOW := Color(0.88, 0.68, 0.08)

## Четырёхугольник, развёрнутый лицом в сторону want.
func _pq(a: Vector3, b: Vector3, c: Vector3, d: Vector3, color: Color, want: Vector3) -> void:
	var n := (c - b).cross(b - a).normalized()
	if n.dot(want) < 0.0:
		n = -n
		var t := a; a = d; d = t
		t = b; b = c; c = t
	if _det:
		var base := ev.size()
		ev.push_back(a); ev.push_back(b); ev.push_back(c); ev.push_back(d)
		for _k in 4:
			en.push_back(n)
			ec.push_back(color)
		ei.push_back(base); ei.push_back(base + 1); ei.push_back(base + 2)
		ei.push_back(base); ei.push_back(base + 2); ei.push_back(base + 3)
	else:
		var base := v.size()
		v.push_back(a); v.push_back(b); v.push_back(c); v.push_back(d)
		for _k in 4:
			nrm.push_back(n)
			col.push_back(color)
		idx.push_back(base); idx.push_back(base + 1); idx.push_back(base + 2)
		idx.push_back(base); idx.push_back(base + 2); idx.push_back(base + 3)

## Коробка: центр и три полуоси.
func _pbox(c: Vector3, ax: Vector3, ay: Vector3, az: Vector3, color: Color) -> void:
	for s: float in [-1.0, 1.0]:
		_pq(c + ax * s - ay - az, c + ax * s + ay - az, c + ax * s + ay + az, c + ax * s - ay + az, color, ax * s)
		_pq(c + ay * s - ax - az, c + ay * s + ax - az, c + ay * s + ax + az, c + ay * s - ax + az, color * (1.05 if s > 0.0 else 0.8), ay * s)
		_pq(c + az * s - ax - ay, c + az * s + ax - ay, c + az * s + ax + ay, c + az * s - ax + ay, color, az * s)

## Круглый столб от точки a до точки b.
func _ppole(a: Vector3, b: Vector3, r0: float, r1: float, color: Color, sides: int = 5) -> void:
	var ax := (b - a).normalized()
	var u := ax.cross(Vector3(0.3, 0.1, 0.9)).normalized()
	var w := ax.cross(u)
	for k in sides:
		var a0 := TAU * k / sides
		var a1 := TAU * (k + 1) / sides
		var d0 := u * cos(a0) + w * sin(a0)
		var d1 := u * cos(a1) + w * sin(a1)
		_pq(a + d0 * r0, a + d1 * r0, b + d1 * r1, b + d0 * r1, color * (0.85 + 0.15 * absf(cos(a0 + 0.7))), d0 + d1)

## Плоская фигура: c — центр, ux/uy — оси в плоскости, лицом в сторону want.
func _ppoly(c: Vector3, ux: Vector3, uy: Vector3, pts: PackedVector2Array, color: Color, want: Vector3) -> void:
	var base := v.size()
	v.push_back(c); nrm.push_back(want); col.push_back(color)
	for q in pts:
		v.push_back(c + ux * q.x + uy * q.y); nrm.push_back(want); col.push_back(color)
	var n := pts.size()
	var flip := (uy.cross(ux)).dot(want) < 0.0
	for k in n:
		var i1 := base + 1 + k
		var i2 := base + 1 + (k + 1) % n
		idx.push_back(base)
		if flip:
			idx.push_back(i2); idx.push_back(i1)
		else:
			idx.push_back(i1); idx.push_back(i2)

func _ngon(n: int, rad: float, rot: float = 0.0) -> PackedVector2Array:
	var out := PackedVector2Array()
	for k in n:
		var an := rot + TAU * k / n
		out.push_back(Vector2(cos(an) * rad, sin(an) * rad))
	return out

func _prop(ptype: int, p: Vector3, yaw: float, pvar: int) -> void:
	var th := deg_to_rad(yaw)
	var f := Vector3(sin(th), 0.0, cos(th))
	var r := Vector3(f.z, 0.0, -f.x)
	var up := Vector3.UP
	p.y -= 0.15
	match ptype:
		1:  # фонарь
			if pvar == 1:   # парковый
				_ppole(p, p + up * 3.9, 0.06, 0.045, METAL_DARK)
				_pbox(p + up * 4.05, r * 0.16, up * 0.14, f * 0.16, Color(0.85, 0.83, 0.74))
				_lamp_glow(p + up * 4.05, p.y + 0.15, 7.5, 0.40, pvar + int(p.x * 3.0))
			else:
				var top := p + up * 9.0
				_ppole(p, top, 0.14, 0.08, POLE_COLOR)
				var tip := top + f * 1.9 + up * 0.5
				_ppole(top - up * 0.1, tip, 0.05, 0.04, POLE_COLOR, 4)
				_pbox(tip + f * 0.25 - up * 0.02, r * 0.14, up * 0.06, f * 0.36, Color(0.80, 0.80, 0.76))
				_lamp_glow(tip + f * 0.25 - up * 0.10, p.y + 0.15, 14.0, 0.62, int(p.x * 0.05) + int(p.z * 0.05))
		2:  # столб ЛЭП
			var top := p + up * 8.6
			_pbox(p + up * 4.3, r * 0.11, up * 4.3, f * 0.11, Color(0.56, 0.55, 0.52))
			_pbox(top - up * 0.5, r * 0.05, up * 0.05, f * 0.75, METAL_DARK * 2.0)
			if pvar == 1:
				_pbox(top - up * 1.2, r * 0.05, up * 0.05, f * 0.55, METAL_DARK * 2.0)
		3:  # светофор
			_ppole(p, p + up * 3.6, 0.065, 0.055, METAL_DARK * 1.6)
			var hc := p + up * 3.05 + f * 0.02
			_pbox(hc, r * 0.16, up * 0.48, f * 0.11, METAL_DARK)
			var tl: Array[Color] = [Color(0.30, 0.06, 0.05), Color(0.30, 0.22, 0.04), Color(0.04, 0.24, 0.10)]
			var lit := 0 if (int(absf(yaw) / 45.0 + 0.5) % 2) == 0 else 2   # пока без переключения: одна ось красная, другая зелёная
			var bright: Array[Color] = [Color(1.0, 0.16, 0.10), Color(1.0, 0.72, 0.10), Color(0.12, 0.95, 0.35)]
			for k in 3:
				var lc := hc + up * (0.31 - 0.31 * k) + f * 0.115
				_ppoly(lc, r, up, _ngon(8, 0.105), bright[k] if k == lit else tl[k], f)
				if k == lit:
					_glow_quad(lc + f * 0.02, r * 0.11, up * 0.11, bright[k] * 0.8)
			_pbox(p + up * 2.25, r * 0.10, up * 0.20, f * 0.07, METAL_DARK)
		4:  # пешеходный светофор
			_ppole(p, p + up * 2.7, 0.05, 0.045, METAL_DARK * 1.6)
			var hc := p + up * 2.45
			_pbox(hc, r * 0.13, up * 0.27, f * 0.09, METAL_DARK)
			_ppoly(hc + up * 0.13 + f * 0.095, r, up, _ngon(4, 0.12, PI / 4.0), Color(0.55, 0.08, 0.06), f)
			_ppoly(hc - up * 0.13 + f * 0.095, r, up, _ngon(4, 0.12, PI / 4.0), Color(0.06, 0.42, 0.16), f)
		5:  # дорожный знак
			_ppole(p, p + up * 2.95, 0.032, 0.032, SIGN_WHITE * 0.8, 4)
			var c := p + up * 2.5 + f * 0.04
			var sq := PI / 4.0
			var back: PackedVector2Array
			match pvar:
				0, 8, 9:  # синий квадрат: переход, парковка, остановка
					back = _ngon(4, 0.5, sq)
					_ppoly(c, r, up, back, SIGN_BLUE, f)
					if pvar == 0:
						_ppoly(c + f * 0.006 - up * 0.04, r, up, _ngon(3, 0.30, PI / 2.0), SIGN_WHITE, f)
					else:
						_ppoly(c + f * 0.006, r, up, _ngon(4, 0.26, sq), SIGN_WHITE, f)
				1:  # уступи дорогу
					back = _ngon(3, 0.52, -PI / 2.0)
					_ppoly(c, r, up, back, SIGN_RED, f)
					_ppoly(c + f * 0.006, r, up, _ngon(3, 0.33, -PI / 2.0), SIGN_WHITE, f)
				2:  # главная дорога
					back = _ngon(4, 0.48)
					_ppoly(c, r, up, back, SIGN_WHITE, f)
					_ppoly(c + f * 0.006, r, up, _ngon(4, 0.33), SIGN_YELLOW, f)
				3:  # стоп
					back = _ngon(8, 0.40, PI / 8.0)
					_ppoly(c, r, up, back, SIGN_WHITE, f)
					_ppoly(c + f * 0.006, r, up, _ngon(8, 0.36, PI / 8.0), SIGN_RED, f)
				4:  # въезд запрещён
					back = _ngon(12, 0.36)
					_ppoly(c, r, up, back, SIGN_RED, f)
					_ppoly(c + f * 0.006, r * 2.6, up * 0.55, _ngon(4, 0.14, sq), SIGN_WHITE, f)
				5:  # запрещающий
					back = _ngon(12, 0.36)
					_ppoly(c, r, up, back, SIGN_RED, f)
					_ppoly(c + f * 0.006, r, up, _ngon(12, 0.26), SIGN_WHITE, f)
				6:  # предписывающий
					back = _ngon(12, 0.36)
					_ppoly(c, r, up, back, SIGN_BLUE, f)
					_ppoly(c + f * 0.006 + up * 0.02, r * 0.6, up, _ngon(3, 0.22, PI / 2.0), SIGN_WHITE, f)
				_:  # предупреждающий
					back = _ngon(3, 0.52, PI / 2.0)
					_ppoly(c, r, up, back, SIGN_RED, f)
					_ppoly(c + f * 0.006, r, up, _ngon(3, 0.34, PI / 2.0), SIGN_WHITE, f)
			_ppoly(c - f * 0.004, r, up, back, SIGN_BACK, -f)
		6:  # остановка: навес лицом к дороге
			var glass := Color(0.30, 0.36, 0.40) if pvar == 0 else Color(0.40, 0.34, 0.26)
			var frame := METAL_DARK * 1.8
			_pbox(p + up * 1.25 - f * 0.75, r * 2.0, up * 1.1, f * 0.03, glass)
			for s: float in [-1.0, 1.0]:
				_pbox(p + up * 1.25 + r * 2.0 * s - f * 0.15, r * 0.03, up * 1.1, f * 0.6, glass)
				_ppole(p + r * 2.0 * s + f * 0.45, p + r * 2.0 * s + f * 0.45 + up * 2.4, 0.04, 0.04, frame, 4)
				_ppole(p + r * 2.0 * s - f * 0.75, p + r * 2.0 * s - f * 0.75 + up * 2.4, 0.04, 0.04, frame, 4)
			_pbox(p + up * 2.45 - f * 0.1, r * 2.2, up * 0.05, f * 0.85, frame)
			_pbox(p + up * 0.6 - f * 0.5, r * 1.5, up * 0.03, f * 0.2, Color(0.45, 0.33, 0.20))
			_pbox(p + up * 0.3 - f * 0.5, r * 1.4, up * 0.3, f * 0.03, frame)
		7:  # лавка
			var wood := Color(0.46, 0.34, 0.21)
			_pbox(p + up * 0.58, r * 0.85, up * 0.03, f * 0.22, wood)
			_pbox(p + up * 0.88 - f * 0.22, r * 0.85, up * 0.16, f * 0.025, wood)
			for s: float in [-1.0, 1.0]:
				_pbox(p + up * 0.36 + r * 0.7 * s, r * 0.03, up * 0.36, f * 0.2, METAL_DARK * 1.5)
		8:  # урна; вид 1 — зелёный бак на колёсах у ворот
			if pvar == 1:
				_pbox(p + up * 0.70, r * 0.27, up * 0.50, f * 0.30, Color(0.14, 0.36, 0.20))
				_pbox(p + up * 1.23, r * 0.29, up * 0.03, f * 0.33, Color(0.11, 0.28, 0.16))
			else:
				_pbox(p + up * 0.55, r * 0.17, up * 0.40, f * 0.17, Color(0.16, 0.26, 0.18))
		9:  # качели
			var pc: Color = [Color(0.70, 0.16, 0.12), Color(0.16, 0.36, 0.62), Color(0.80, 0.62, 0.10)][pvar % 3]
			for s: float in [-1.0, 1.0]:
				_ppole(p + r * 1.3 * s + f * 0.7, p + r * 1.3 * s + up * 2.2, 0.04, 0.04, pc, 3)
				_ppole(p + r * 1.3 * s - f * 0.7, p + r * 1.3 * s + up * 2.2, 0.04, 0.04, pc, 3)
				_ppole(p + r * 0.45 * s + up * 2.2, p + r * 0.45 * s + up * 0.5, 0.012, 0.012, METAL_DARK * 2.0, 3)
			_ppole(p - r * 1.3 + up * 2.2, p + r * 1.3 + up * 2.2, 0.04, 0.04, pc, 3)
			_pbox(p + up * 0.5, r * 0.5, up * 0.02, f * 0.12, Color(0.45, 0.33, 0.20))
		10:  # горка
			var pc: Color = [Color(0.16, 0.36, 0.62), Color(0.70, 0.16, 0.12), Color(0.20, 0.50, 0.25)][pvar % 3]
			_pbox(p + up * 0.75 - f * 1.2, r * 0.45, up * 0.75, f * 0.45, pc * 0.8)
			_pq(p + up * 1.5 - f * 0.75 - r * 0.35, p + up * 1.5 - f * 0.75 + r * 0.35, p + up * 0.15 + f * 1.9 + r * 0.35, p + up * 0.15 + f * 1.9 - r * 0.35, Color(0.70, 0.72, 0.74), up + f * 0.5)
			_pq(p + up * 1.5 - f * 0.75 - r * 0.35, p + up * 1.5 - f * 0.75 + r * 0.35, p + up * 0.15 + f * 1.9 + r * 0.35, p + up * 0.15 + f * 1.9 - r * 0.35, pc, -up - f * 0.5)
		11:  # песочница
			var wood := Color(0.62, 0.45, 0.20)
			for s: float in [-1.0, 1.0]:
				_pbox(p + up * 0.22 + r * 1.5 * s, r * 0.05, up * 0.14, f * 1.5, wood)
				_pbox(p + up * 0.22 + f * 1.5 * s, r * 1.5, up * 0.14, f * 0.05, wood)
			_pq(p + up * 0.26 - r * 1.45 - f * 1.45, p + up * 0.26 + r * 1.45 - f * 1.45, p + up * 0.26 + r * 1.45 + f * 1.45, p + up * 0.26 - r * 1.45 + f * 1.45, Color(0.76, 0.68, 0.48), up)
		12:  # турники
			var pc := Color(0.20, 0.42, 0.26)
			var hs: Array[float] = [2.3, 1.8, 1.3]
			for k in 4:
				_ppole(p + r * (k - 1.5) * 1.3, p + r * (k - 1.5) * 1.3 + up * (hs[mini(k, 2)] + 0.1), 0.04, 0.04, pc, 3)
			for k in 3:
				_ppole(p + r * (k - 1.5) * 1.3 + up * hs[k], p + r * (k - 0.5) * 1.3 + up * hs[k], 0.022, 0.022, METAL_DARK * 3.0, 3)
		13:  # футбольные ворота
			var hw := 2.5 if pvar == 0 else 3.66
			var gh := 2.0 if pvar == 0 else 2.44
			var wc := Color(0.86, 0.86, 0.84)
			for s: float in [-1.0, 1.0]:
				_ppole(p + r * hw * s, p + r * hw * s + up * gh, 0.05, 0.05, wc, 4)
				_ppole(p + r * hw * s + up * gh, p + r * hw * s - f * 1.2 + up * 0.15, 0.025, 0.025, wc, 3)
			_ppole(p - r * hw + up * gh, p + r * hw + up * gh, 0.05, 0.05, wc, 4)
		14:  # баскетбольное кольцо
			_ppole(p - f * 0.6, p - f * 0.6 + up * 3.3, 0.07, 0.06, METAL_DARK * 2.0, 4)
			_pbox(p - f * 0.45 + up * 3.25, r * 0.9, up * 0.52, f * 0.03, Color(0.84, 0.84, 0.82))
			_ppoly(p - f * 0.15 + up * 3.05, r, f, _ngon(8, 0.23), Color(0.85, 0.35, 0.10), up)
			_ppoly(p - f * 0.15 + up * 3.05, r, f, _ngon(8, 0.23), Color(0.85, 0.35, 0.10), -up)
		15:  # мусорные контейнеры у бетонной стенки
			var wallc := Color(0.56, 0.56, 0.54)
			_pbox(p + up * 0.9 - f * 0.9, r * 2.3, up * 0.9, f * 0.06, wallc)
			_pbox(p + up * 0.9 - r * 2.3, r * 0.06, up * 0.9, f * 0.9, wallc)
			_pbox(p + up * 0.9 + r * 2.3, r * 0.06, up * 0.9, f * 0.9, wallc)
			var bins: Array[Color] = [Color(0.15, 0.32, 0.20), Color(0.18, 0.26, 0.40), Color(0.34, 0.35, 0.36)]
			for k in 3:
				var bc: Color = bins[(k + pvar) % 3]
				_pbox(p + up * 0.62 + r * (k - 1.0) * 1.4 - f * 0.2, r * 0.6, up * 0.55, f * 0.42, bc)
				_pbox(p + up * 1.21 + r * (k - 1.0) * 1.4 - f * 0.2, r * 0.63, up * 0.04, f * 0.45, bc * 0.75)
		16:  # бетонный блок
			_pbox(p + up * 0.42, r * 0.9, up * 0.30, f * 0.30, Color(0.60, 0.60, 0.58) if pvar == 0 else Color(0.72, 0.70, 0.66))
		17:  # столбик
			_ppole(p, p + up * 0.95, 0.07, 0.06, Color(0.30, 0.31, 0.32), 4)
		20:  # дерево
			_tree(p, pvar, yaw)
		21:  # подъезд многоэтажки: дверь, крыльцо, козырёк, боковая стенка, лампа
			var dc: Color = [Color(0.30, 0.31, 0.33), Color(0.36, 0.22, 0.15), Color(0.16, 0.30, 0.22)][pvar % 3]
			var conc := Color(0.62, 0.62, 0.60)
			_pbox(p + up * 1.22 + f * 0.03, r * 0.55, up * 1.05, f * 0.04, dc)
			_pbox(p + up * 1.22 + f * 0.02, r * 0.68, up * 1.18, f * 0.02, conc * 0.8)
			_pbox(p + up * 0.14 + f * 0.8, r * 1.35, up * 0.14, f * 0.8, conc)
			_pbox(p + up * 2.62 + f * 0.85, r * 1.5, up * 0.07, f * 0.85, conc * 0.95)
			_pbox(p + up * 1.4 - r * 1.38 + f * 0.8, r * 0.07, up * 1.2, f * 0.8, conc * 0.9)
			_ppole(p + r * 1.36 + f * 1.5 + up * 0.25, p + r * 1.36 + f * 1.5 + up * 2.56, 0.045, 0.045, METAL_DARK * 1.6, 4)
			_glow_quad(p + up * 2.46 + f * 0.5, r * 0.12, f * 0.12, Color(1.0, 0.82, 0.55))
			_glow_pool(p + f * 1.2 + up * 0.36, 3.2, Color(1.0, 0.80, 0.52) * 0.30)
		22:  # дверь частного дома с крылечком
			_det = true
			var dc: Color = [Color(0.36, 0.22, 0.15), Color(0.80, 0.80, 0.77), Color(0.22, 0.26, 0.34), Color(0.20, 0.34, 0.24)][pvar % 4]
			_pbox(p + up * 1.2 + f * 0.03, r * 0.45, up * 1.0, f * 0.03, dc)
			_pbox(p + up * 0.2 + f * 0.5, r * 0.75, up * 0.15, f * 0.5, Color(0.58, 0.58, 0.56))
			_pq(p + up * 2.45 - r * 0.85, p + up * 2.45 + r * 0.85, p + up * 2.2 + r * 0.85 + f * 0.9, p + up * 2.2 - r * 0.85 + f * 0.9, dc * 0.7, up)
			_det = false
		23:  # вход в магазин или учреждение: стеклянные двери, ступени, козырёк
			var cc: Color = [Color(0.20, 0.30, 0.52), Color(0.50, 0.14, 0.13), Color(0.16, 0.38, 0.24), Color(0.30, 0.31, 0.33)][pvar % 4]
			var conc := Color(0.64, 0.64, 0.62)
			_pbox(p + up * 1.3 + f * 0.03, r * 0.95, up * 1.15, f * 0.04, Color(0.16, 0.22, 0.28))
			_pbox(p + up * 1.3 + f * 0.05, r * 0.03, up * 1.15, f * 0.04, Color(0.75, 0.76, 0.78))
			_pbox(p + up * 1.3 + f * 0.02, r * 1.1, up * 1.3, f * 0.02, Color(0.75, 0.76, 0.78))
			_pbox(p + up * 0.22 + f * 0.9, r * 1.7, up * 0.14, f * 0.9, conc)
			_pbox(p + up * 0.07 + f * 1.05, r * 2.0, up * 0.10, f * 1.25, conc * 0.93)
			_pbox(p + up * 2.95 + f * 0.9, r * 1.9, up * 0.09, f * 0.95, cc)
		24:  # гаражные ворота
			_det = true
			var gc_: Color = [Color(0.40, 0.25, 0.18), Color(0.20, 0.34, 0.24), Color(0.42, 0.43, 0.44), Color(0.36, 0.24, 0.17), Color(0.22, 0.30, 0.42)][pvar % 5]
			_pq(p + f * 0.03 - r * 1.2 + up * 0.15, p + f * 0.03 + r * 1.2 + up * 0.15, p + f * 0.03 + r * 1.2 + up * 2.15, p + f * 0.03 - r * 1.2 + up * 2.15, gc_, f)
			_pq(p + f * 0.05 - r * 0.02 + up * 0.15, p + f * 0.05 + r * 0.02 + up * 0.15, p + f * 0.05 + r * 0.02 + up * 2.15, p + f * 0.05 - r * 0.02 + up * 2.15, gc_ * 0.55, f)
			_pq(p + f * 0.05 - r * 1.26 + up * 2.15, p + f * 0.05 + r * 1.26 + up * 2.15, p + f * 0.05 + r * 1.26 + up * 2.27, p + f * 0.05 - r * 1.26 + up * 2.27, gc_ * 0.6, f)
			_det = false
		25:  # клумба из покрышек
			_det = true
			var tyre := Color(0.07, 0.07, 0.08)
			var paint: Color = [tyre, Color(0.80, 0.80, 0.78), Color(0.20, 0.36, 0.60)][pvar % 3]
			for k in 3:
				var o := r * (k - 1.0) * 0.75 + f * (0.25 if k == 1 else 0.0)
				_pbox(p + o + up * 0.25, r * 0.33, up * 0.10, f * 0.33, paint)
				_pq(p + o + up * 0.36 - r * 0.24 - f * 0.24, p + o + up * 0.36 + r * 0.24 - f * 0.24, p + o + up * 0.36 + r * 0.24 + f * 0.24, p + o + up * 0.36 - r * 0.24 + f * 0.24, Color(0.24, 0.42, 0.20) if k != 1 else Color(0.62, 0.30, 0.36), up)
			_det = false
		26:  # сушилка для белья: два Т-образных столба и верёвки
			var pc := Color(0.30, 0.42, 0.50)
			for s: float in [-1.0, 1.0]:
				_ppole(p + r * 2.2 * s, p + r * 2.2 * s + up * 2.1, 0.04, 0.04, pc, 4)
				_ppole(p + r * 2.2 * s + up * 2.08 - f * 0.7, p + r * 2.2 * s + up * 2.08 + f * 0.7, 0.03, 0.03, pc, 3)
			_det = true
			for k in 3:
				var o := f * (k - 1.0) * 0.6 + up * 2.08
				_pq(p - r * 2.2 + o, p + r * 2.2 + o, p + r * 2.2 + o + up * 0.02, p - r * 2.2 + o + up * 0.02, Color(0.80, 0.80, 0.78), f)
			_det = false

# ---------- свет ----------
func _glow_quad(c: Vector3, a: Vector3, b: Vector3, color: Color) -> void:
	var base := gv.size()
	gv.push_back(c - a - b); gv.push_back(c + a - b); gv.push_back(c + a + b); gv.push_back(c - a + b)
	for _k in 4:
		gc.push_back(color)
	gi.push_back(base); gi.push_back(base + 1); gi.push_back(base + 2)
	gi.push_back(base); gi.push_back(base + 2); gi.push_back(base + 3)

## Только пятно света на земле (лампа у подъезда).
func _glow_pool(g: Vector3, radius: float, c: Color) -> void:
	var base := gv.size()
	gv.push_back(g); gc.push_back(c)
	for k in 8:
		var an := TAU * k / 8.0
		gv.push_back(g + Vector3(cos(an) * radius, 0.0, sin(an) * radius)); gc.push_back(Color(0, 0, 0))
	for k in 8:
		gi.push_back(base); gi.push_back(base + 1 + k); gi.push_back(base + 1 + (k + 1) % 8)

## Лампа: яркая точка и пятно света на земле. Часть ламп тёплые (натриевые), часть белые.
func _lamp_glow(head: Vector3, ground_y: float, radius: float, power: float, seed_i: int) -> void:
	var warm := (seed_i * 7 + 3) % 10 < 7
	var c := Color(1.0, 0.70, 0.36) if warm else Color(0.82, 0.90, 1.0)
	lamps.push_back(head)
	_glow_quad(head, Vector3(0.22, 0.0, 0.0), Vector3(0.0, 0.0, 0.22), c)
	_glow_quad(head, Vector3(0.22, 0.0, 0.0), Vector3(0.0, 0.16, 0.0), c)
	_glow_quad(head, Vector3(0.0, 0.0, 0.22), Vector3(0.0, 0.16, 0.0), c)
	var base := gv.size()
	var g := Vector3(head.x, ground_y + 0.26, head.z)
	gv.push_back(g); gc.push_back(c * power)
	for k in 12:
		var an := TAU * k / 12.0
		gv.push_back(g + Vector3(cos(an) * radius * 0.45, 0.0, sin(an) * radius * 0.45)); gc.push_back(c * power * 0.55)
	for k in 12:
		var an := TAU * k / 12.0
		gv.push_back(g + Vector3(cos(an) * radius, 0.0, sin(an) * radius)); gc.push_back(Color(0, 0, 0))
	for k in 12:
		var k2 := (k + 1) % 12
		gi.push_back(base); gi.push_back(base + 1 + k); gi.push_back(base + 1 + k2)
		gi.push_back(base + 1 + k); gi.push_back(base + 13 + k); gi.push_back(base + 13 + k2)
		gi.push_back(base + 1 + k); gi.push_back(base + 13 + k2); gi.push_back(base + 1 + k2)

# ---------- заборы ----------
const PROF_COLORS: Array[Color] = [Color(0.16, 0.33, 0.22), Color(0.36, 0.24, 0.17), Color(0.42, 0.13, 0.14), Color(0.45, 0.46, 0.47), Color(0.20, 0.30, 0.45)]
const WOOD_COLORS: Array[Color] = [Color(0.22, 0.40, 0.26), Color(0.40, 0.29, 0.19), Color(0.50, 0.47, 0.42)]
const BRICK_COLORS: Array[Color] = [Color(0.55, 0.25, 0.18), Color(0.78, 0.77, 0.73), Color(0.72, 0.60, 0.38)]
const BAR_COLORS: Array[Color] = [Color(0.10, 0.10, 0.11), Color(0.30, 0.20, 0.14), Color(0.14, 0.28, 0.18)]
const CONCRETE_COLORS: Array[Color] = [Color(0.55, 0.55, 0.53), Color(0.80, 0.80, 0.77), Color(0.78, 0.66, 0.62)]

## Точки вдоль линии примерно через step метров (концы отрезков сохраняются).
func _stations(pts: PackedVector3Array, step: float) -> PackedVector3Array:
	var out := PackedVector3Array()
	out.push_back(pts[0])
	for k in range(1, pts.size()):
		var a := pts[k - 1]
		var b := pts[k]
		var n := maxi(1, int(round(Vector2(b.x - a.x, b.z - a.z).length() / step)))
		for i in range(1, n + 1):
			out.push_back(a.lerp(b, float(i) / n))
	return out

## Стенка с двух сторон от y0 до y1 над землёй.
func _panel(a: Vector3, b: Vector3, y0: float, y1: float, color: Color) -> void:
	_wall(a, b, a.y + y0, b.y + y0, a.y + y1, b.y + y1, color)
	_wall(b, a, b.y + y0, a.y + y0, b.y + y1, a.y + y1, color)

## Тонкая полоса (перекладина, проволока), видна с двух сторон.
func _strip(a: Vector3, b: Vector3, y0: float, y1: float, color: Color) -> void:
	var d := Vector3(b.x - a.x, 0.0, b.z - a.z).normalized()
	var n := Vector3(d.z, 0.0, -d.x)
	var up0 := Vector3(0.0, y0, 0.0)
	var up1 := Vector3(0.0, y1, 0.0)
	_pq(a + up0, b + up0, b + up1, a + up1, color, n)

func _cwall(a: Vector3, b: Vector3, h: float) -> void:
	var a1 := a + Vector3(0.0, h, 0.0)
	var b1 := b + Vector3(0.0, h, 0.0)
	var a0 := a - Vector3(0.0, 0.4, 0.0)
	var b0 := b - Vector3(0.0, 0.4, 0.0)
	for t: Array in [[a0, b0, b1], [a0, b1, a1], [b0, a0, a1], [b0, a1, b1]]:
		cv.push_back(t[0]); cv.push_back(t[1]); cv.push_back(t[2])

## Столбик. Тонкий — трёхгранный, толстый — четыре стенки и крышка, развёрнут вдоль забора.
func _post(p: Vector3, half: float, h: float, color: Color, dir: Vector3 = Vector3.RIGHT) -> void:
	if half < 0.06:
		_ppole(p - Vector3(0.0, 0.2, 0.0), p + Vector3(0.0, h, 0.0), half, half, color, 3)
		return
	var c := p + Vector3(0.0, h * 0.5 - 0.1, 0.0)
	var ax := dir * half
	var az := Vector3(dir.z, 0.0, -dir.x) * half
	var ay := Vector3(0.0, h * 0.5 + 0.1, 0.0)
	for s: float in [-1.0, 1.0]:
		_pq(c + ax * s - ay - az, c + ax * s + ay - az, c + ax * s + ay + az, c + ax * s - ay + az, color, ax * s)
		_pq(c + az * s - ax - ay, c + az * s + ax - ay, c + az * s + ax + ay, c + az * s - ax + ay, color * 0.9, az * s)
	_pq(c + ay - ax - az, c + ay + ax - az, c + ay + ax + az, c + ay - ax + az, color * 1.08, Vector3.UP)

func _dir_at(st: PackedVector3Array, k: int) -> Vector3:
	var a := st[maxi(k - 1, 0)]
	var b := st[mini(k + 1, st.size() - 1)]
	var d := Vector3(b.x - a.x, 0.0, b.z - a.z)
	return d.normalized() if d.length_squared() > 0.0001 else Vector3.RIGHT

func _fence(pts: PackedVector3Array, ftype: int, fvar: int, h: float) -> void:
	if pts.size() < 2:
		return
	var seed_i := int(pts[0].x * 7.0) + int(pts[0].z * 13.0)
	var shade := 0.92 + 0.12 * float(seed_i & 7) / 7.0
	match ftype:
		1:  # бетонные плиты
			var st := _stations(pts, 2.5)
			var c := CONCRETE_COLORS[fvar % 3] * shade
			for k in range(1, st.size()):
				_panel(st[k - 1], st[k], -0.5, h, c * (1.0 if k % 2 == 0 else 0.93))
				_panel(st[k - 1], st[k], h, h + 0.0, c)
		2, 7:  # профнастил или кирпич со столбами
			var st := _stations(pts, 3.0)
			var c: Color = (PROF_COLORS[fvar % 5] if ftype == 2 else BRICK_COLORS[fvar % 3]) * shade
			var metal := ftype == 2 and fvar == 3
			var pc: Color = METAL_DARK * 1.6 if metal else (BRICK_COLORS[absi(fvar + seed_i) % 3] * 0.9 if ftype == 2 else c * 0.85)
			for k in range(1, st.size()):
				_panel(st[k - 1], st[k], -0.5, h, c)
			_det = true
			for k in st.size():
				_post(st[k], 0.05 if metal else 0.20, h + 0.14, pc, _dir_at(st, k))
			_det = false
		3:  # штакетник
			var st := _stations(pts, 2.5)
			var c := WOOD_COLORS[fvar % 3] * shade
			for k in range(1, st.size()):
				_panel(st[k - 1], st[k], 0.08, h, c * (1.0 if k % 2 == 0 else 0.95))
			_det = true
			for q in st:
				_post(q, 0.05, h + 0.08, c * 0.75)
			_det = false
		4, 5, 9:  # сетка, прутья, низкое ограждение: видно насквозь
			var step := 2.5 if ftype != 9 else 2.0
			var st := _stations(pts, step)
			var c := Color(0.42, 0.44, 0.45)
			if ftype == 5:
				c = BAR_COLORS[fvar % 3]
			elif ftype == 9:
				c = Color(0.82, 0.82, 0.80) if fvar % 2 == 0 else Color(0.20, 0.42, 0.26)
			for k in range(1, pts.size()):
				_cwall(pts[k - 1], pts[k], h)
			_det = true
			for q in st:
				_post(q, 0.035 if ftype != 5 else 0.05, h + 0.05, c)
			for k in range(1, st.size()):
				var a := st[k - 1]
				var b := st[k]
				_strip(a, b, h - 0.07, h - 0.02, c)
				if ftype == 9:
					_strip(a, b, h * 0.45, h * 0.45 + 0.04, c)
					continue
				_strip(a, b, 0.12, 0.17, c)
				if ftype == 4:
					_strip(a, b, h * 0.5, h * 0.5 + 0.03, c)
					# сетка: редкие косые проволоки, чтобы читалась «рабица»
					var nd := maxi(2, int(a.distance_to(b) / 0.85))
					for i in nd:
						var p0 := a.lerp(b, float(i) / nd)
						var p1 := a.lerp(b, float(i + 1) / nd)
						var dn := Vector3(b.x - a.x, 0.0, b.z - a.z).normalized()
						var nn := Vector3(dn.z, 0.0, -dn.x)
						_pq(p0 + Vector3(0, 0.17, 0), p0 + Vector3(0, 0.20, 0), p1 + Vector3(0, h - 0.07, 0), p1 + Vector3(0, h - 0.10, 0), c * 1.15, nn)
				else:
					var nb := maxi(2, int(a.distance_to(b) / 0.42))
					var dn := (b - a) / nb
					var wd := Vector3(b.x - a.x, 0.0, b.z - a.z).normalized() * 0.015
					for i in range(1, nb):
						var q := a + dn * i
						_strip(q - wd, q + wd, 0.17, h - 0.07, c)
			_det = false
		6:  # живая изгородь
			var c := Color(0.17, 0.32, 0.16) * shade
			for k in range(1, pts.size()):
				var a := pts[k - 1]
				var b := pts[k]
				var d := Vector3(b.x - a.x, 0.0, b.z - a.z).normalized()
				var n := Vector3(d.z, 0.0, -d.x) * 0.45
				var up := Vector3(0.0, h, 0.0)
				var dn := Vector3(0.0, 0.4, 0.0)
				_pq(a + n - dn, b + n - dn, b + n + up, a + n + up, c, n)
				_pq(a - n - dn, b - n - dn, b - n + up, a - n + up, c * 0.9, -n)
				_pq(a - n + up, b - n + up, b + n + up, a + n + up, c * 1.1, Vector3.UP)
		8:  # отбойник
			var c := Color(0.62, 0.64, 0.65)
			for k in range(1, pts.size()):
				_panel(pts[k - 1], pts[k], 0.45, 0.78, c)
			_det = true
			for q in _stations(pts, 2.0):
				_post(q, 0.04, 0.7, c * 0.7)
			_det = false
		10:  # ворота с калиткой
			var c := PROF_COLORS[fvar % 5] * 0.82
			var a := pts[0]
			var b := pts[pts.size() - 1]
			for k in range(1, pts.size()):
				_panel(pts[k - 1], pts[k], 0.06, h, c)
			var gd := Vector3(b.x - a.x, 0.0, b.z - a.z).normalized()
			_post(a, 0.09, h + 0.18, METAL_DARK * 1.4, gd)
			_post(b, 0.09, h + 0.18, METAL_DARK * 1.4, gd)
			_post(a.lerp(b, 0.76), 0.07, h + 0.18, METAL_DARK * 1.4, gd)
			_det = true
			_strip(a, b, h - 0.25, h - 0.19, c * 1.5)
			_strip(a, b, 0.35, 0.41, c * 1.5)
			_det = false
		12:  # жёлтая газовая труба на опорах; над воротами поднимается аркой
			_det = true
			var c := Color(0.82, 0.66, 0.10)
			var uph := Vector3(0.0, h, 0.0)
			for k in range(1, pts.size()):
				_ppole(pts[k - 1] + uph, pts[k] + uph, 0.035, 0.035, c, 3)
			if h > 3.0:
				_ppole(pts[0] + Vector3(0.0, 2.3, 0.0), pts[0] + uph, 0.035, 0.035, c, 3)
				_ppole(pts[pts.size() - 1] + Vector3(0.0, 2.3, 0.0), pts[pts.size() - 1] + uph, 0.035, 0.035, c, 3)
			else:
				for q in _stations(pts, 6.0):
					_ppole(q - Vector3(0.0, 0.2, 0.0), q + uph, 0.025, 0.025, Color(0.40, 0.40, 0.40), 3)
			_det = false
		_:  # стена, подпорная стена
			var c := BARRIER_COLOR * shade
			for k in range(1, pts.size()):
				_panel(pts[k - 1], pts[k], -0.5, h, c)

# ---------- деревья (пока простыми формами) ----------
## Крона-«капля»: верхушка, два кольца и низ. Нормали наружу, верх светлее.
func _crown(c: Vector3, rx: float, ry: float, color: Color, rot: float) -> void:
	var base := v.size()
	var rings: Array = [[0.0, 1.0], [0.72, 0.50], [1.0, -0.12], [0.55, -0.80]]
	var shades: Array[float] = [1.18, 1.06, 0.92, 0.72]
	var seg := 5
	v.push_back(c + Vector3(0.0, ry, 0.0)); nrm.push_back(Vector3.UP); col.push_back(color * shades[0])
	for ri in range(1, 4):
		for k in seg:
			var an := rot + TAU * (k + 0.5 * (ri % 2)) / seg
			var d := Vector3(cos(an), 0.0, sin(an))
			var rr: float = rings[ri][0]
			var yy: float = rings[ri][1]
			v.push_back(c + d * rx * rr + Vector3(0.0, ry * yy, 0.0))
			nrm.push_back((d * rr + Vector3(0.0, yy * 0.8, 0.0)).normalized())
			col.push_back(color * shades[ri])
	for k in seg:
		idx.push_back(base); idx.push_back(base + 1 + (k + 1) % seg); idx.push_back(base + 1 + k)
	for ri in range(1, 3):
		var a0 := base + 1 + (ri - 1) * seg
		var b0 := a0 + seg
		for k in seg:
			var k2 := (k + 1) % seg
			var kb := k if ri % 2 == 1 else k2
			var kb2 := (kb + seg - 1) % seg if ri % 2 == 0 else (k + 1) % seg
			# две полосы треугольников между соседними кольцами (кольца сдвинуты на полшага)
			if ri % 2 == 1:
				idx.push_back(a0 + k); idx.push_back(a0 + k2); idx.push_back(b0 + k2)
				idx.push_back(a0 + k); idx.push_back(b0 + k2); idx.push_back(b0 + k)
			else:
				idx.push_back(a0 + k); idx.push_back(a0 + k2); idx.push_back(b0 + k)
				idx.push_back(a0 + k2); idx.push_back(b0 + k2); idx.push_back(b0 + k)
	# низ кроны
	var l0 := base + 1 + 2 * seg
	for k in range(1, seg - 1):
		idx.push_back(l0); idx.push_back(l0 + k); idx.push_back(l0 + k + 1)

func _tree(p: Vector3, species: int, yaw: float) -> void:
	var hsh_i := int(absf(p.x) * 31.0 + absf(p.z) * 17.0 + yaw)
	var sc := 0.82 + 0.40 * float(hsh_i % 16) / 15.0
	var tint := 0.88 + 0.24 * float((hsh_i / 16) % 8) / 7.0
	var rot := deg_to_rad(yaw)
	var up := Vector3.UP
	var bark := Color(0.26, 0.20, 0.15)
	match species:
		1:  # пирамидальный тополь
			_ppole(p, p + up * 3.0 * sc, 0.20, 0.14, bark, 3)
			_crown(p + up * 9.5 * sc, 1.5 * sc, 7.5 * sc, Color(0.20, 0.36, 0.17) * tint, rot)
		2:  # сосна
			_ppole(p, p + up * 10.0 * sc, 0.19, 0.11, Color(0.45, 0.27, 0.16), 3)
			_crown(p + up * 11.0 * sc, 2.9 * sc, 2.6 * sc, Color(0.12, 0.27, 0.17) * tint, rot)
		3:  # каштан, старое большое дерево
			_ppole(p, p + up * 3.4 * sc, 0.32, 0.22, bark, 4)
			_crown(p + up * 7.2 * sc, 4.4 * sc, 4.4 * sc, Color(0.17, 0.33, 0.14) * tint, rot)
		4:  # берёза
			_ppole(p, p + up * 5.5 * sc, 0.12, 0.08, Color(0.82, 0.82, 0.78), 3)
			_crown(p + up * 8.2 * sc, 2.2 * sc, 3.6 * sc, Color(0.30, 0.46, 0.20) * tint, rot)
		5:  # плодовое, невысокое
			_ppole(p, p + up * 1.7 * sc, 0.10, 0.08, bark, 3)
			_crown(p + up * 3.3 * sc, 2.0 * sc, 1.9 * sc, Color(0.24, 0.42, 0.18) * tint, rot)
		6:  # ель
			_ppole(p, p + up * 1.4 * sc, 0.14, 0.12, bark, 3)
			var cb := v.size()
			var cc := Color(0.10, 0.24, 0.16) * tint
			v.push_back(p + up * 9.5 * sc); nrm.push_back(up); col.push_back(cc * 1.15)
			for k in 6:
				var an := rot + TAU * k / 6.0
				var d := Vector3(cos(an), 0.0, sin(an))
				v.push_back(p + d * 2.3 * sc + up * 1.0 * sc); nrm.push_back((d + up * 0.3).normalized()); col.push_back(cc * 0.8)
			for k in 6:
				idx.push_back(cb); idx.push_back(cb + 1 + (k + 1) % 6); idx.push_back(cb + 1 + k)
		_:  # липа, клён, акация
			_ppole(p, p + up * 2.8 * sc, 0.20, 0.15, bark, 3)
			_crown(p + up * 5.6 * sc, 3.1 * sc, 3.3 * sc, Color(0.19, 0.37, 0.16) * tint, rot)
