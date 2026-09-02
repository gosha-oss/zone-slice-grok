extends StaticBody3D
class_name ClosedDoor

@export var prompt_text: String = "закрыто"


func _ready() -> void:
	set_meta("prompt", "E — " + prompt_text)
	set_meta("closed", true)


func interact(_who: Node) -> void:
	var world := get_tree().current_scene
	if world and world.has_method("set_hint"):
		world.set_hint(prompt_text)
