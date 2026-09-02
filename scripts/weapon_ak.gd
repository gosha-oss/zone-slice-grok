extends Node3D

const FIRE_GAP := 0.1
const RELOAD_TIME := 2.2

var _cool := 0.0
var _reload := 0.0
var _recoil := 0.0
var _root: Node3D
var _flash: OmniLight3D
var _muzzle: Marker3D

func _ready() -> void:
	_root = Node3D.new()
	_root.position = Vector3(0.22, -0.18, -0.42)
	add_child(_root)
	_part(Vector3(0.05, 0.07, 0.28), Vector3(0, 0.02, 0.02), Color(0.12, 0.14, 0.1))
	_part(Vector3(0.028, 0.028, 0.42), Vector3(0, 0.03, -0.32), Color(0.1, 0.1, 0.09))
	_part(Vector3(0.045, 0.16, 0.04), Vector3(0, -0.1, 0.04), Color(0.18, 0.16, 0.12))
	_muzzle = Marker3D.new()
	_muzzle.position = Vector3(0, 0.03, -0.55)
	_root.add_child(_muzzle)
	_flash = OmniLight3D.new()
	_flash.light_energy = 0.0
	_flash.omni_range = 3.5
	_flash.light_color = Color(1.0, 0.72, 0.28)
	_muzzle.add_child(_flash)

func _part(size: Vector3, pos: Vector3, color: Color) -> void:
	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mi.mesh = box
	mi.position = pos
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.metallic = 0.55
	mi.material_override = m
	_root.add_child(mi)

func _process(delta: float) -> void:
	_cool = maxf(0.0, _cool - delta)
	if _reload > 0.0:
		_reload = maxf(0.0, _reload - delta)
		if _reload == 0.0:
			Game.reload_mag()
	_recoil = move_toward(_recoil, 0.0, delta * 14.0)
	if _flash.light_energy > 0.0:
		_flash.light_energy = maxf(0.0, _flash.light_energy - delta * 40.0)
	if Game.inventory_open or _reload > 0.0:
		return
	if Input.is_action_pressed("fire") and _cool == 0.0:
		_try_fire()
	if Input.is_action_just_pressed("reload") and Game.mag < Game.MAG_SIZE and Game.reserve > 0:
		_reload = RELOAD_TIME

func _try_fire() -> void:
	if not Game.fire_one():
		return
	_cool = FIRE_GAP
	_recoil = 1.0
	_flash.light_energy = 6.0
	var cam := get_parent() as Camera3D
	if cam == null:
		return
	var from := cam.global_position
	var dir := -cam.global_transform.basis.z
	var to := from + dir * 180.0
	var q := PhysicsRayQueryParameters3D.create(from, to)
	q.collision_mask = 1
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	var end := to if hit.is_empty() else hit.position
	_spawn_tracer(from + dir * 0.6, end)

func _spawn_tracer(from: Vector3, to: Vector3) -> void:
	var t := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(0.02, 0.02, 0.55)
	t.mesh = box
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.72, 0.2)
	m.emission_enabled = true
	m.emission = Color(1.0, 0.55, 0.1)
	m.emission_energy_multiplier = 8.0
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	t.material_override = m
	get_tree().current_scene.add_child(t)
	t.global_position = from
	if to.distance_to(from) > 0.05:
		t.look_at(to, Vector3.UP)
	var tw := get_tree().create_tween()
	tw.tween_property(t, "global_position", to, 0.12)
	tw.tween_callback(t.queue_free)
