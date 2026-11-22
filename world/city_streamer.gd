extends Node3D
## Подгружает квадраты города вокруг игрока и выгружает дальние. Входы в здания и езда — без экранов загрузки.

@export var target_path: NodePath
@export var view_radius: float = 1400.0      # как далеко видны дома и дороги, м
@export var collision_radius: float = 420.0  # где есть физика, м
@export var max_tasks: int = 3               # сколько квадратов строится одновременно
@export var apply_per_frame: int = 2
@export var decal_range: float = 700.0       # как далеко видны разметка и люки, м
@export var glow_range: float = 900.0        # как далеко видны огни и пятна света, м
@export var real_lights: int = 14            # сколько ближайших фонарей светят по-настоящему

signal initial_ready

var loaded: Dictionary = {}     # Vector2i -> {node, body, pending_shape}
var pending: Dictionary = {}    # Vector2i -> true
var queue: Array[Vector2i] = []
var is_ready: bool = false
var tris_total: int = 0

var _target: Node3D
var _last_c := Vector2i(-9999, -9999)
var _done: Array = []
var _mutex := Mutex.new()
var _task_ids: Array[int] = []
var _mat: StandardMaterial3D
var _water_mat: StandardMaterial3D
var _far: MeshInstance3D
var _far_mat: ShaderMaterial
var _glow_mat: ShaderMaterial
var _night := 0.0
var _glow_on := false
var _omni: Array[OmniLight3D] = []
var _omni_t := 0.0

func _ready() -> void:
	_target = get_node_or_null(target_path)
	_mat = StandardMaterial3D.new()
	_mat.vertex_color_use_as_albedo = true
	_mat.vertex_color_is_srgb = true
	_mat.albedo_color = Color(0.7, 0.7, 0.7)
	_mat.roughness = 0.92
	_water_mat = StandardMaterial3D.new()
	_water_mat.albedo_color = ChunkBuilder.WATER_COLOR
	_water_mat.roughness = 0.12
	_water_mat.metallic = 0.1
	var sh := Shader.new()
	sh.code = """shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never, shadows_disabled, fog_disabled;
uniform float night = 0.0;
void fragment() {
	ALBEDO = COLOR.rgb * night;
}
"""
	_glow_mat = ShaderMaterial.new()
	_glow_mat.shader = sh
	for _i in real_lights:
		var o := OmniLight3D.new()
		o.omni_range = 22.0
		o.omni_attenuation = 1.3
		o.shadow_enabled = false
		o.light_color = Color(1.0, 0.78, 0.50)
		o.visible = false
		add_child(o)
		_omni.append(o)
	if CityData.ok:
		_build_far_async()

func focus() -> Vector3:
	return _target.global_position if _target else Vector3.ZERO

func _process(_delta: float) -> void:
	if not CityData.ok:
		return
	var pos := focus()
	var c := CityData.chunk_of(pos)
	if c != _last_c:
		_last_c = c
		_replan(c)
	_start_tasks()
	_apply_done()
	_update_collision(pos)
	_update_lights(pos, _delta)
	if _far_mat:
		_far_mat.set_shader_parameter("cam_pos", pos)
		_far_mat.set_shader_parameter("near_r", maxf(0.0, view_radius - 420.0) if is_ready else 0.0)
	if not is_ready and loaded.has(c) and loaded[c].body != null:
		is_ready = true
		initial_ready.emit()

func _replan(c: Vector2i) -> void:
	var r := int(ceil(view_radius / CityData.CHUNK))
	var want: Array[Vector2i] = []
	for dz in range(-r, r + 1):
		for dx in range(-r, r + 1):
			if Vector2(dx, dz).length() * CityData.CHUNK > view_radius:
				continue
			var k := Vector2i(c.x + dx, c.y + dz)
			if CityData.chunk_valid(k) and not loaded.has(k) and not pending.has(k):
				want.append(k)
	want.sort_custom(func(a: Vector2i, b: Vector2i) -> bool: return (a - c).length_squared() < (b - c).length_squared())
	queue = want
	# выгрузка дальних
	var limit := view_radius + CityData.CHUNK * 1.5
	for k: Vector2i in loaded.keys():
		if Vector2(k - c).length() * CityData.CHUNK > limit:
			var e: Dictionary = loaded[k]
			tris_total -= e.tris
			e.node.queue_free()
			loaded.erase(k)

func _start_tasks() -> void:
	while pending.size() < max_tasks and not queue.is_empty():
		var k: Vector2i = queue.pop_front()
		if loaded.has(k) or pending.has(k):
			continue
		pending[k] = true
		var near := Vector2(k - _last_c).length() * CityData.CHUNK <= collision_radius + CityData.CHUNK
		_task_ids.append(WorkerThreadPool.add_task(_task.bind(k, near)))

func _task(k: Vector2i, with_shape: bool) -> void:
	var res := ChunkBuilder.build(k, with_shape)
	_mutex.lock()
	_done.append([k, res])
	_mutex.unlock()

func _shape_task(k: Vector2i, mesh: ArrayMesh) -> void:
	var shape := mesh.create_trimesh_shape()
	_mutex.lock()
	_done.append([k, {"shape_only": shape}])
	_mutex.unlock()

func _apply_done() -> void:
	for _i in apply_per_frame:
		_mutex.lock()
		var item: Variant = _done.pop_front() if not _done.is_empty() else null
		_mutex.unlock()
		if item == null:
			return
		var k: Vector2i = item[0]
		var res: Dictionary = item[1]
		if res.has("shape_only"):
			if loaded.has(k):
				loaded[k].pending_shape = false
				_attach_body(k, res.shape_only)
			continue
		pending.erase(k)
		var node := Node3D.new()
		node.name = "c_%d_%d" % [k.x, k.y]
		node.position = CityData.chunk_origin(k)
		var mi := MeshInstance3D.new()
		mi.mesh = res.mesh
		mi.material_override = _mat
		node.add_child(mi)
		if res.water != null:
			var w := MeshInstance3D.new()
			w.mesh = res.water
			w.material_override = _water_mat
			w.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			node.add_child(w)
		if res.get("decals") != null:
			var dm := MeshInstance3D.new()
			dm.mesh = res.decals
			dm.material_override = _mat
			dm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			dm.visibility_range_end = decal_range
			node.add_child(dm)
		var lamps := PackedVector3Array()
		if res.get("glow") != null:
			var gm := MeshInstance3D.new()
			gm.mesh = res.glow
			gm.material_override = _glow_mat
			gm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			gm.visibility_range_end = glow_range
			gm.visible = _glow_on
			gm.add_to_group("city_glow")
			node.add_child(gm)
			lamps = res.lamps
		add_child(node)
		loaded[k] = {"node": node, "mesh": res.mesh, "body": null, "pending_shape": false, "tris": res.tris, "lamps": lamps}
		tris_total += res.tris
		if res.has("shape"):
			_attach_body(k, res.shape)

func _attach_body(k: Vector2i, shape: Shape3D) -> void:
	var e: Dictionary = loaded[k]
	if e.body != null:
		return
	var body := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	cs.shape = shape
	body.add_child(cs)
	e.node.add_child(body)
	e.body = body

func _update_collision(pos: Vector3) -> void:
	var c := _last_c
	var r := int(ceil(collision_radius / CityData.CHUNK)) + 1
	for dz in range(-r, r + 1):
		for dx in range(-r, r + 1):
			var k := Vector2i(c.x + dx, c.y + dz)
			if not loaded.has(k):
				continue
			var e: Dictionary = loaded[k]
			var center := CityData.chunk_origin(k) + Vector3(128, 0, 128)
			var d := Vector2(center.x - pos.x, center.z - pos.z).length()
			if d <= collision_radius and e.body == null and not e.pending_shape:
				e.pending_shape = true
				_task_ids.append(WorkerThreadPool.add_task(_shape_task.bind(k, e.mesh)))
			elif d > collision_radius + CityData.CHUNK * 2.0 and e.body != null:
				e.body.queue_free()
				e.body = null

# ---------- дальняя земля: весь город одним грубым листом ----------
func _build_far_async() -> void:
	_task_ids.append(WorkerThreadPool.add_task(_far_task))

func _far_task() -> void:
	var D := CityData
	var step := 8
	var w := (D.grid_w - 1) / step + 1
	var hh := (D.grid_h - 1) / step + 1
	var vv := PackedVector3Array(); vv.resize(w * hh)
	var nn := PackedVector3Array(); nn.resize(w * hh)
	var cc := PackedColorArray(); cc.resize(w * hh)
	var ii := PackedInt32Array(); ii.resize((w - 1) * (hh - 1) * 6)
	for j in hh:
		for i in w:
			var gi := i * step
			var gj := j * step
			var cov := D.cover_at_cell(gi, gj)
			var y := D.h(gi, gj)
			var color := ChunkBuilder.COVER_COLORS[mini(cov, ChunkBuilder.COVER_COLORS.size() - 1)]
			if cov == 3:
				y += 1.5
				color = ChunkBuilder.WATER_COLOR
			var p := j * w + i
			vv[p] = Vector3(D.x0 + gi * D.CELL, y, D.z0 + gj * D.CELL)
			var dx := D.h(gi + step, gj) - D.h(gi - step, gj)
			var dz := D.h(gi, gj + step) - D.h(gi, gj - step)
			nn[p] = Vector3(-dx, 2.0 * D.CELL * step, -dz).normalized()
			cc[p] = color
	var q := 0
	for j in hh - 1:
		for i in w - 1:
			var a := j * w + i
			ii[q] = a; ii[q + 1] = a + 1; ii[q + 2] = a + w
			ii[q + 3] = a + 1; ii[q + 4] = a + w + 1; ii[q + 5] = a + w
			q += 6
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vv
	arrays[Mesh.ARRAY_NORMAL] = nn
	arrays[Mesh.ARRAY_COLOR] = cc
	arrays[Mesh.ARRAY_INDEX] = ii
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	_attach_far.call_deferred(mesh)

func _attach_far(mesh: ArrayMesh) -> void:
	_far_mat = ShaderMaterial.new()
	_far_mat.shader = load("res://world/far_terrain.gdshader")
	_far = MeshInstance3D.new()
	_far.mesh = mesh
	_far.material_override = _far_mat
	_far.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_far.extra_cull_margin = 100000.0
	add_child(_far)

func set_quality(radius: float) -> void:
	view_radius = radius
	_last_c = Vector2i(-9999, -9999)

func _exit_tree() -> void:
	for id in _task_ids:
		WorkerThreadPool.wait_for_task_completion(id)

## Ночной свет: огни и пятна на земле по всему городу, настоящие источники — только у ближайших фонарей.
func _update_lights(pos: Vector3, delta: float) -> void:
	var dn := get_node_or_null("../DayNight")
	_night = dn.night_amount() if dn and dn.has_method("night_amount") else 0.0
	_glow_mat.set_shader_parameter("night", _night)
	var on := _night > 0.02
	if on != _glow_on:
		_glow_on = on
		get_tree().call_group("city_glow", "set_visible", on)
	_omni_t -= delta
	if _omni_t > 0.0:
		for o in _omni:
			o.light_energy = 4.5 * _night
		return
	_omni_t = 0.3
	var found: Array = []
	if on:
		var cam := get_viewport().get_camera_3d()
		var cp := cam.global_position if cam else pos
		var c := CityData.chunk_of(cp)
		for dz in range(-1, 2):
			for dx in range(-1, 2):
				var e: Variant = loaded.get(c + Vector2i(dx, dz))
				if e == null:
					continue
				var org: Vector3 = e.node.position
				for lp: Vector3 in e.lamps:
					var w := org + lp
					var d := w.distance_squared_to(cp)
					if d < 110.0 * 110.0:
						found.append([d, w])
		found.sort_custom(func(a: Array, b: Array) -> bool: return a[0] < b[0])
	for i in _omni.size():
		var o := _omni[i]
		if i < found.size():
			o.global_position = found[i][1] - Vector3(0.0, 0.25, 0.0)
			o.light_energy = 4.5 * _night
			o.visible = true
		else:
			o.visible = false
