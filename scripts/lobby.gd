extends Control


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_build_ui()


func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.42, 0.44, 0.46, 1.0)
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 16)
	center.add_child(col)

	var title := Label.new()
	title.text = "PRIPYAT SLICE"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 48)
	title.add_theme_color_override("font_color", Color(0.92, 0.62, 0.22, 1.0))
	col.add_child(title)

	var sub := Label.new()
	sub.text = "Пасмурный день. Квартал. Контракт."
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_font_size_override("font_size", 18)
	sub.add_theme_color_override("font_color", Color(0.22, 0.22, 0.22, 1.0))
	col.add_child(sub)

	var ng := Button.new()
	ng.text = "Новая игра"
	ng.custom_minimum_size = Vector2(300, 46)
	ng.pressed.connect(Game.go_world)
	col.add_child(ng)

	var q := Button.new()
	q.text = "Выход"
	q.custom_minimum_size = Vector2(300, 46)
	q.pressed.connect(func() -> void: get_tree().quit())
	col.add_child(q)

	ng.grab_focus()
