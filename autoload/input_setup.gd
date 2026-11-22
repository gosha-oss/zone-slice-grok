extends Node
## Все кнопки игры задаются здесь: клавиатура + геймпад (PS5/Xbox).

func _ready() -> void:
	_key("move_forward", KEY_W); _key("move_back", KEY_S)
	_key("move_left", KEY_A); _key("move_right", KEY_D)
	_key("jump", KEY_SPACE); _key("sprint", KEY_SHIFT)
	_key("crouch", KEY_CTRL); _key("crouch", KEY_C)
	_key("interact", KEY_E)
	_key("map", KEY_M); _key("pause", KEY_ESCAPE)
	_key("debug_hud", KEY_F3); _key("debug_fly", KEY_V)
	_key("debug_hour", KEY_T)
	_key("debug_time_slower", KEY_BRACKETLEFT); _key("debug_time_faster", KEY_BRACKETRIGHT)
	# Геймпад: левый стик — ходьба, правый — обзор (в player.gd)
	_axis("move_forward", JOY_AXIS_LEFT_Y, -1.0); _axis("move_back", JOY_AXIS_LEFT_Y, 1.0)
	_axis("move_left", JOY_AXIS_LEFT_X, -1.0); _axis("move_right", JOY_AXIS_LEFT_X, 1.0)
	_axis("look_up", JOY_AXIS_RIGHT_Y, -1.0); _axis("look_down", JOY_AXIS_RIGHT_Y, 1.0)
	_axis("look_left", JOY_AXIS_RIGHT_X, -1.0); _axis("look_right", JOY_AXIS_RIGHT_X, 1.0)
	_pad("jump", JOY_BUTTON_A); _pad("sprint", JOY_BUTTON_LEFT_STICK)
	_pad("crouch", JOY_BUTTON_B); _pad("interact", JOY_BUTTON_X)
	_pad("map", JOY_BUTTON_BACK); _pad("pause", JOY_BUTTON_START)

func _ensure(action: String) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action, 0.3)

func _key(action: String, keycode: Key) -> void:
	_ensure(action)
	var ev := InputEventKey.new()
	ev.physical_keycode = keycode
	InputMap.action_add_event(action, ev)

func _pad(action: String, button: JoyButton) -> void:
	_ensure(action)
	var ev := InputEventJoypadButton.new()
	ev.button_index = button
	InputMap.action_add_event(action, ev)

func _axis(action: String, axis: JoyAxis, value: float) -> void:
	_ensure(action)
	var ev := InputEventJoypadMotion.new()
	ev.axis = axis
	ev.axis_value = value
	InputMap.action_add_event(action, ev)
