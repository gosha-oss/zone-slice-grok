extends Node3D
## Главная сцена прототипа: город, герой, часы, интерфейс.

@onready var player: CharacterBody3D = $Player
@onready var city: Node3D = $City
@onready var hud: Control = $UI/HUD
@onready var map: Control = $UI/Map

const QUALITY := {"low": 800.0, "mid": 1400.0, "ultra": 2200.0}

func _ready() -> void:
	if not CityData.ok:
		hud.show_message("Нет данных города. Запусти tools/build_city.py")
		return
	var spawn := CityData.place("home")
	player.teleport(spawn + Vector3(0, 1.2, 0))
	player.rotation.y = deg_to_rad(float(CityData.meta.get("spawn_yaw", 0.0)))
	hud.setup(player, city)
	map.setup(player, city)
	hud.show_message("Строю город…")
	city.initial_ready.connect(_on_city_ready)
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--autotest="):
			var t: Node = load("res://tools/auto_test.gd").new()
			add_child(t)
			t.start(self, a.trim_prefix("--autotest="))

func _on_city_ready() -> void:
	player.frozen = false
	hud.show_message("")
	hud.show_hint()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("map"):
		map.toggle()
	elif event.is_action_pressed("pause"):
		if map.visible:
			map.toggle()
		else:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED else Input.MOUSE_MODE_CAPTURED
	elif event.is_action_pressed("debug_hour"):
		GameClock.advance(60.0)
	elif event.is_action_pressed("debug_time_faster"):
		GameClock.time_scale = minf(GameClock.time_scale * 4.0, 128.0)
	elif event.is_action_pressed("debug_time_slower"):
		GameClock.time_scale = maxf(GameClock.time_scale / 4.0, GameClock.DEFAULT_SCALE)
	elif event is InputEventKey and event.pressed and not event.echo:
		match event.physical_keycode:
			KEY_F5: city.set_quality(QUALITY.low); hud.flash("Дальность: низко")
			KEY_F6: city.set_quality(QUALITY.mid); hud.flash("Дальность: средне")
			KEY_F7: city.set_quality(QUALITY.ultra); hud.flash("Дальность: ультра")
