extends Node3D

var _marker: Node3D


func _ready() -> void:
	_make_environment()
	_make_post()
	var hud := CanvasLayer.new()
	hud.set_script(load("res://scripts/inventory_ui.gd"))
	add_child(hud)
	Game.artifact_taken.connect(show_end_marker)
	Game.subtitle.emit("ДЕНЬ. Пасмурно. Контракт: дом №7, 4 этаж.")


func set_hint(text: String) -> void:
	Game.hint.emit(text)


func show_end_marker() -> void:
	if _marker:
		_marker.visible = true
		return
	_marker = Node3D.new()
	_marker.position = Vector3(0.0, 0.0, 300.0)
	add_child(_marker)
	var mi := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.12
	cyl.bottom_radius = 0.12
	cyl.height = 5.5
	mi.mesh = cyl
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.55, 0.15, 0.1)
	mat.roughness = 0.4
	mi.material_override = mat
	mi.position = Vector3(0, 2.8, 0)
	_marker.add_child(mi)
	var area := Area3D.new()
	area.monitoring = true
	area.collision_mask = 2
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(8, 4, 5)
	cs.shape = box
	area.add_child(cs)
	_marker.add_child(area)
	area.body_entered.connect(func(body: Node) -> void:
		if body.is_in_group("player") and Game.has_artifact:
			Game.subtitle.emit("Контракт закрыт. Уходишь из квартала.")
			await get_tree().create_timer(1.8).timeout
			Game.go_lobby()
	)


func _make_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var ps := ProceduralSkyMaterial.new()
	ps.sky_top_color = Color(0.66, 0.69, 0.72)
	ps.sky_horizon_color = Color(0.74, 0.75, 0.76)
	ps.ground_bottom_color = Color(0.38, 0.37, 0.34)
	ps.ground_horizon_color = Color(0.58, 0.57, 0.54)
	ps.sky_energy_multiplier = 1.35
	ps.sun_angle_max = 4.0
	ps.sun_curve = 0.08
	sky.sky_material = ps
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.70, 0.72, 0.74)
	env.ambient_light_energy = 1.15
	env.fog_enabled = true
	env.fog_light_color = Color(0.70, 0.72, 0.74)
	env.fog_density = 0.0016
	env.fog_aerial_perspective = 0.4
	env.volumetric_fog_enabled = false
	env.glow_enabled = false
	env.ssao_enabled = true
	env.ssr_enabled = true
	env.ssr_max_steps = 24
	env.adjustment_enabled = true
	env.adjustment_saturation = 0.88
	env.adjustment_brightness = 1.12
	env.adjustment_contrast = 1.05
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, 18, 0)
	sun.light_color = Color(0.86, 0.88, 0.90)
	sun.light_energy = 1.25
	sun.light_indirect_energy = 1.0
	sun.shadow_enabled = true
	sun.light_specular = 0.22
	add_child(sun)


func _make_post() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 40
	add_child(layer)
	var tag := Label.new()
	tag.text = "ДЕНЬ  ·  DAY-A"
	tag.add_theme_font_size_override("font_size", 18)
	tag.add_theme_color_override("font_color", Color(0.15, 0.16, 0.18, 0.85))
	tag.position = Vector2(24, 18)
	layer.add_child(tag)
