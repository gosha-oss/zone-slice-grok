extends Node3D
## Блокпосты на четырёх выездах из города. Пока это только серые заглушки с подписью, без логики.

func _ready() -> void:
	if not CityData.ok:
		return
	for e: Dictionary in CityData.meta.get("exits", []):
		_make(e)

func _box(parent: Node3D, size: Vector3, pos: Vector3, color: Color) -> void:
	var body := StaticBody3D.new()
	body.position = pos
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.9
	mi.material_override = m
	body.add_child(mi)
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	body.add_child(cs)
	parent.add_child(body)

func _make(e: Dictionary) -> void:
	var root := Node3D.new()
	var x := float(e.x)
	var z := float(e.z)
	root.position = Vector3(x, CityData.height_at(x, z) + 0.1, z)
	root.rotation.y = deg_to_rad(float(e.get("yaw", 0.0)))
	add_child(root)
	var half := float(e.get("width", 8.0)) * 0.5
	var concrete := Color(0.62, 0.62, 0.60)
	# бетонные блоки «змейкой» и будка
	_box(root, Vector3(half * 1.1, 0.9, 0.7), Vector3(-half * 0.45, 0.45, -6.0), concrete)
	_box(root, Vector3(half * 1.1, 0.9, 0.7), Vector3(half * 0.45, 0.45, 6.0), concrete)
	_box(root, Vector3(2.6, 2.6, 3.2), Vector3(half + 2.6, 1.3, 0.0), Color(0.36, 0.40, 0.33))
	_box(root, Vector3(half * 2.0, 0.14, 0.14), Vector3(0.0, 1.05, 0.0), Color(0.85, 0.25, 0.2))   # шлагбаум
	_box(root, Vector3(0.25, 1.1, 0.25), Vector3(half + 0.4, 0.55, 0.0), concrete)
	var label := Label3D.new()
	label.text = "БЛОКПОСТ\n" + str(e.name)
	label.font_size = 96
	label.pixel_size = 0.012
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.position = Vector3(0, 5.0, 0)
	label.outline_size = 24
	root.add_child(label)
