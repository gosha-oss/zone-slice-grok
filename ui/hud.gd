extends Control
## Экранный интерфейс прототипа: часы, комендантский час, подсказки, тестовые цифры (F3).

var _player: CharacterBody3D
var _city: Node3D
var _clock: Label
var _curfew: Label
var _debug: Label
var _msg: Label
var _hint: Label
var _flash: Label
var _hint_time: float = 0.0
var _flash_time: float = 0.0
var _show_debug: bool = true

func _ready() -> void:
	_clock = _label(Vector2(24, 18), 30)
	_curfew = _label(Vector2(24, 58), 18)
	_curfew.add_theme_color_override("font_color", Color(1.0, 0.45, 0.4))
	_debug = _label(Vector2(24, 96), 14)
	_debug.add_theme_color_override("font_color", Color(1, 1, 1, 0.75))
	_msg = _label(Vector2.ZERO, 34)
	_msg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_msg.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_msg.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_hint = _label(Vector2.ZERO, 17)
	_hint.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_hint.offset_top = -64
	_hint.offset_bottom = -24
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_flash = _label(Vector2.ZERO, 22)
	_flash.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_flash.offset_top = 22
	_flash.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

func _label(pos: Vector2, size: int) -> Label:
	var l := Label.new()
	l.position = pos
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("outline_size", 6)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(l)
	return l

func setup(player: CharacterBody3D, city: Node3D) -> void:
	_player = player
	_city = city

func show_message(text: String) -> void:
	_msg.text = text

func show_hint() -> void:
	_hint.text = "WASD — идти · Shift — бег · Ctrl — присесть · Пробел — прыжок · M — карта\nТест: V — полёт · T — +1 час · [ ] — скорость времени · F5/F6/F7 — дальность · F3 — цифры"
	_hint_time = 25.0

func flash(text: String) -> void:
	_flash.text = text
	_flash_time = 2.5

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("debug_hud"):
		_show_debug = not _show_debug

func _process(delta: float) -> void:
	_clock.text = "День %d · %s" % [GameClock.day, GameClock.text()]
	_curfew.text = "Комендантский час" if GameClock.curfew else ""
	if _hint_time > 0.0:
		_hint_time -= delta
		if _hint_time <= 0.0:
			_hint.text = ""
	if _flash_time > 0.0:
		_flash_time -= delta
		if _flash_time <= 0.0:
			_flash.text = ""
	_debug.visible = _show_debug
	if _show_debug and _player and _city:
		var p := _player.global_position
		var speed_note := ""
		if GameClock.time_scale > GameClock.DEFAULT_SCALE:
			speed_note = " · время ×%d" % int(GameClock.time_scale / GameClock.DEFAULT_SCALE)
		_debug.text = "%d кадров/с · квадратов %d (в очереди %d) · треугольников %.1f млн\nx %.0f  z %.0f  высота %.1f м · %.0f км/ч%s%s" % [
			Engine.get_frames_per_second(), _city.loaded.size(), _city.queue.size() + _city.pending.size(),
			_city.tris_total / 1000000.0, p.x, p.z, p.y, _player.speed_kmh(),
			" · ПОЛЁТ" if _player.fly else "", speed_note]
