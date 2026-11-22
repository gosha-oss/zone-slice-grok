extends Node
## Данные города: рельеф, покрытие земли, дома, дороги. Читаются один раз при старте.
## Файлы в res://city/ собирает tools/build_city.py из OpenStreetMap и карты высот.

const CHUNK := 256.0      # размер квадрата города, м
const CELL := 8.0         # шаг сетки рельефа, м
const CPC := 32           # клеток сетки в одном квадрате

var ok: bool = false
var meta: Dictionary = {}
var grid_w: int = 0
var grid_h: int = 0
var x0: float = 0.0       # мировые координаты угла сетки (запад, север)
var z0: float = 0.0
var nx: int = 0           # квадратов по X и Z
var nz: int = 0
var heights: PackedByteArray   # int16, сантиметры
var cover: PackedByteArray     # uint8, тип земли
var geo: PackedByteArray       # дома/дороги по квадратам
var _geo_table: int = 0
var local_decals: Dictionary = {}   # необязательный локальный слой (res://city/local_extra.json)

func _ready() -> void:
	load_all()

func load_all() -> void:
	if not FileAccess.file_exists("res://city/city.json"):
		push_warning("Нет данных города (res://city/city.json)")
		return
	meta = JSON.parse_string(FileAccess.get_file_as_string("res://city/city.json"))
	var t := FileAccess.get_file_as_bytes("res://city/terrain.bin").decompress_dynamic(-1, FileAccess.COMPRESSION_GZIP)
	if t.size() < 12 or t.slice(0, 4).get_string_from_ascii() != "CTER":
		push_error("terrain.bin повреждён")
		return
	grid_w = t.decode_u32(4)
	grid_h = t.decode_u32(8)
	var n := grid_w * grid_h
	heights = t.slice(12, 12 + n * 2)
	cover = t.slice(12 + n * 2, 12 + n * 3)
	geo = FileAccess.get_file_as_bytes("res://city/geo.bin").decompress_dynamic(-1, FileAccess.COMPRESSION_GZIP)
	if geo.size() < 12 or geo.slice(0, 4).get_string_from_ascii() != "CGEO":
		push_error("geo.bin повреждён")
		return
	nx = geo.decode_u32(4)
	nz = geo.decode_u32(8)
	_geo_table = 12
	if int(meta.get("version", 1)) < 2:
		push_error("Данные города старые: пересобери их (tools/build_city.py)")
		return
	if FileAccess.file_exists("res://city/local_extra.json"):
		var le: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://city/local_extra.json"))
		if le is Dictionary:
			local_decals = le.get("decals", {})
	x0 = float(meta["x0"])
	z0 = float(meta["z0"])
	ok = true

func chunk_of(pos: Vector3) -> Vector2i:
	return Vector2i(int(floor((pos.x - x0) / CHUNK)), int(floor((pos.z - z0) / CHUNK)))

func chunk_valid(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < nx and c.y < nz

func chunk_origin(c: Vector2i) -> Vector3:
	return Vector3(x0 + c.x * CHUNK, 0.0, z0 + c.y * CHUNK)

## Смещение и длина записи квадрата в geo.
func chunk_record(c: Vector2i) -> Vector2i:
	var p := _geo_table + (c.y * nx + c.x) * 8
	return Vector2i(geo.decode_u32(p), geo.decode_u32(p + 4))

func h(i: int, j: int) -> float:
	return heights.decode_s16((clampi(j, 0, grid_h - 1) * grid_w + clampi(i, 0, grid_w - 1)) * 2) * 0.01

func cover_at_cell(i: int, j: int) -> int:
	return cover[clampi(j, 0, grid_h - 1) * grid_w + clampi(i, 0, grid_w - 1)]

## Высота земли в точке (совпадает с треугольниками сетки рельефа).
func height_at(x: float, z: float) -> float:
	var fx := (x - x0) / CELL
	var fz := (z - z0) / CELL
	var i := int(floor(fx))
	var j := int(floor(fz))
	fx -= i
	fz -= j
	var h00 := h(i, j)
	var h10 := h(i + 1, j)
	var h01 := h(i, j + 1)
	var h11 := h(i + 1, j + 1)
	if fx + fz <= 1.0:
		return h00 + fx * (h10 - h00) + fz * (h01 - h00)
	return h11 + (1.0 - fx) * (h01 - h11) + (1.0 - fz) * (h10 - h11)

func world_size() -> Vector2:
	return Vector2(nx * CHUNK, nz * CHUNK)

func place(name_key: String) -> Vector3:
	var s: Dictionary = meta.get("spawns", {})
	if s.has(name_key):
		var p: Array = s[name_key]
		return Vector3(p[0], height_at(p[0], p[1]), p[1])
	return Vector3.ZERO
