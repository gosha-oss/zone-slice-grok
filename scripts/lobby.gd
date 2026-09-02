extends Control

var _root: Control
var _title: Label
var _new_game: Button
var _quit: Button


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_build_ui()
	_new_game.pressed.connect(_on_new_game)
	_quit.pressed.connect(_on_quit)
	_new_game.grab_focus()


func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.04, 0.035, 0.03, 1.0)
	add_child(bg)

	_root = CenterContainer.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_root)

	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 18)
	_root.add_child(col)

	_title = Label.new()
	_title.text = "ZONE SLICE"
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title.add_theme_font_size_override("font_size", 42)
	_title.add_theme_color_override("font_color", Color(0.86, 0.62, 0.28, 1.0))
	col.add_child(_title)

	var sub := Label.new()
	sub.text = "Ночь. Дождь. Улица."
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_font_size_override("font_size", 18)
	sub.add_theme_color_override("font_color", Color(0.62, 0.58, 0.5, 1.0))
	col.add_child(sub)

	_new_game = Button.new()
	_new_game.text = "Новая игра"
	_new_game.custom_minimum_size = Vector2(280, 44)
	col.add_child(_new_game)

	_quit = Button.new()
	_quit.text = "Выход"
	_quit.custom_minimum_size = Vector2(280, 44)
	col.add_child(_quit)


func _on_new_game() -> void:
	Game.go_world()


func _on_quit() -> void:
	get_tree().quit()
