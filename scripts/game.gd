extends Node

const LOBBY_SCENE := "res://scenes/lobby.tscn"
const WORLD_SCENE := "res://scenes/world.tscn"

var mag: int = 30
var reserve: int = 90
const MAG_SIZE := 30
var bolts: int = 8
var medkits: int = 1
var has_artifact: bool = false
var inventory_open: bool = false
var hp: float = 100.0

signal inventory_changed
signal artifact_taken
signal hint(text: String)
signal subtitle(text: String)


func reset_run() -> void:
	mag = 30
	reserve = 90
	bolts = 8
	medkits = 1
	has_artifact = false
	inventory_open = false
	hp = 100.0
	inventory_changed.emit()


func go_lobby() -> void:
	inventory_open = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().paused = false
	get_tree().change_scene_to_file(LOBBY_SCENE)


func go_world() -> void:
	reset_run()
	get_tree().paused = false
	get_tree().change_scene_to_file(WORLD_SCENE)


func take_artifact() -> void:
	if has_artifact:
		return
	has_artifact = true
	inventory_changed.emit()
	artifact_taken.emit()
	hint.emit("Артефакт у тебя. Tab — рюкзак. Иди в конец улицы.")
	subtitle.emit("Контракт почти закрыт. Выходи на улицу, к дальнему краю.")


func use_medkit() -> void:
	if medkits <= 0:
		return
	medkits -= 1
	hp = minf(100.0, hp + 45.0)
	inventory_changed.emit()


func spend_bolt() -> bool:
	if bolts <= 0:
		return false
	bolts -= 1
	inventory_changed.emit()
	return true


func fire_one() -> bool:
	if mag <= 0:
		return false
	mag -= 1
	inventory_changed.emit()
	return true


func reload_mag() -> void:
	var need := MAG_SIZE - mag
	var take := mini(need, reserve)
	mag += take
	reserve -= take
	inventory_changed.emit()
