extends Node

const LOBBY_SCENE := "res://scenes/lobby.tscn"
const WORLD_SCENE := "res://scenes/world.tscn"


func go_lobby() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().change_scene_to_file(LOBBY_SCENE)


func go_world() -> void:
	get_tree().change_scene_to_file(WORLD_SCENE)
