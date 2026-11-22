extends Control
## Карта города (M). Колесо — масштаб, левая кнопка — двигать. Тест: правая кнопка — перенестись в точку.

var _player: CharacterBody3D
var _city: Node3D
var _tex: Texture2D
var _zoom: float = 1.0
var _center: Vector2 = Vector2.ZERO      # мировые x,z в центре экрана
var _drag: bool = false
var _font: Font

func setup(player: CharacterBody3D, city: Node3D) -> void:
	_player = player
	_city = city
	if ResourceLoader.exists("res://city/map.png"):
		_tex = load("res://city/map.png")
	_font = ThemeDB.fallback_font

func toggle() -> void:
	visible = not visible
	_player.input_enabled = not visible
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if visible else Input.MOUSE_MODE_CAPTURED
	if visible:
		_center = Vector2(_player.global_position.x, _player.global_position.z)
		_zoom = 4.0
	queue_redraw()

func _scale() -> float:
	# пикселей экрана на метр
	var ws := CityData.world_size()
	return minf(size.x / ws.x, size.y / ws.y) * _zoom

func world_to_screen(w: Vector2) -> Vector2:
	return size * 0.5 + (w - _center) * _scale()

func screen_to_world(s: Vector2) -> Vector2:
	return _center + (s - size * 0.5) / _scale()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_zoom = minf(_zoom * 1.25, 60.0)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_zoom = maxf(_zoom / 1.25, 1.0)
		elif event.button_index == MOUSE_BUTTON_LEFT:
			_drag = event.pressed
		elif event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			var w := screen_to_world(event.position)
			var y := CityData.height_at(w.x, w.y)
			_player.frozen = true
			_player.teleport(Vector3(w.x, y + 1.5, w.y))
			_city.is_ready = false
			if not _city.initial_ready.is_connected(_unfreeze):
				_city.initial_ready.connect(_unfreeze, CONNECT_ONE_SHOT)
			toggle()
		queue_redraw()
	elif event is InputEventMouseMotion and _drag:
		_center -= event.relative / _scale()
		queue_redraw()

func _unfreeze() -> void:
	_player.frozen = false

func _process(_delta: float) -> void:
	if visible:
		queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.07, 0.08, 0.09, 0.96))
	var ws := CityData.world_size()
	var origin := Vector2(CityData.x0, CityData.z0)
	if _tex:
		draw_texture_rect(_tex, Rect2(world_to_screen(origin), ws * _scale()), false)
	# выезды и места
	for e: Dictionary in CityData.meta.get("exits", []):
		var s := world_to_screen(Vector2(e.x, e.z))
		draw_circle(s, 7.0, Color(0.95, 0.35, 0.25))
		draw_string(_font, s + Vector2(12, 5), "Блокпост: " + str(e.name), HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(1, 0.85, 0.8))
	if _zoom >= 2.5:
		for pl: Dictionary in CityData.meta.get("places", []):
			var s := world_to_screen(Vector2(pl.x, pl.z))
			if Rect2(Vector2.ZERO, size).has_point(s):
				draw_string(_font, s, str(pl.name), HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 1, 1, 0.9))
	# игрок
	var p := world_to_screen(Vector2(_player.global_position.x, _player.global_position.z))
	var yaw := _player.rotation.y
	var fwd := Vector2(-sin(yaw), -cos(yaw))
	var side := Vector2(-fwd.y, fwd.x)
	draw_colored_polygon(PackedVector2Array([p + fwd * 16.0, p - fwd * 9.0 + side * 9.0, p - fwd * 9.0 - side * 9.0]), Color(0.2, 0.75, 1.0))
	draw_string(_font, Vector2(24, size.y - 52), "Колесо — масштаб · левая кнопка — двигать · правая кнопка — перенестись (тест) · M — закрыть", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(1, 1, 1, 0.8))
	draw_string(_font, Vector2(24, size.y - 24), str(CityData.meta.get("attribution", "© участники OpenStreetMap")), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(1, 1, 1, 0.6))
