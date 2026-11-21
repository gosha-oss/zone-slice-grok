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

var v := PackedVector3Array()
var nrm := PackedVector3Array()
var col := PackedColorArray()
var idx := PackedInt32Array()

static func build(c: Vector2i, with_shape: bool) -> Dictionary:
	var b := ChunkBuilder.new()
	return b._build(c, with_shape)

func _build(c: Vector2i, with_shape: bool) -> Dictionary:
	var D := CityData
	_terrain(c)
	var rec := D.chunk_record(c)
	var water: ArrayMesh = null
	if rec.y > 0:
		water = _features(rec.x)
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = v
	arrays[Mesh.ARRAY_NORMAL] = nrm
	arrays[Mesh.ARRAY_COLOR] = col
	arrays[Mesh.ARRAY_INDEX] = idx
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	var out := {"mesh": mesh, "water": water, "tris": idx.size() / 3}
	if with_shape:
		out["shape"] = mesh.create_trimesh_shape()
	return out

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
		var npts := g.decode_u16(p + 3)
		p += 5
		var pts := PackedVector3Array()
		pts.resize(npts)
		for k in npts:
			pts[k] = Vector3(g.decode_s16(p) * U, g.decode_s16(p + 4) * 0.01, g.decode_s16(p + 2) * U)
			p += 6
		_road(pts, width, cls, flags)
	# заборы и стены
	var nbar := g.decode_u16(p); p += 2
	for _w in nbar:
		var height := g[p + 1] * 0.1
		var npts := g.decode_u16(p + 2)
		p += 4
		var prev := Vector3.ZERO
		for k in npts:
			var q := Vector3(g.decode_s16(p) * U, g.decode_s16(p + 4) * 0.01, g.decode_s16(p + 2) * U)
			p += 6
			if k > 0:
				_wall(prev, q, prev.y - 0.5, q.y - 0.5, prev.y + height, q.y + height, BARRIER_COLOR)
				_wall(q, prev, q.y - 0.5, prev.y - 0.5, q.y + height, prev.y + height, BARRIER_COLOR)
			prev = q
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

func _road(pts: PackedVector3Array, width: float, cls: int, flags: int) -> void:
	var n := pts.size()
	if n < 2:
		return
	var c := ROAD_COLORS[mini(cls, ROAD_COLORS.size() - 1)]
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
