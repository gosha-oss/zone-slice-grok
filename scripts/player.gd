extends CharacterBody3D

const WALK_SPEED := 3.15
const SPRINT_SPEED := 5.05
const JUMP_VELOCITY := 4.15
const ACCEL := 10.0
const AIR_ACCEL := 3.0
const MOUSE_SENS := 0.00215
const BOB_FREQ := 8.4
const BOB_AMP := 0.035

var _pitch := 0.0
var _bob := 0.0
var _flashlight_on := true

@onready var _head: Node3D = $Head
@onready var _camera: Camera3D = $Head/Camera3D
@onready var _flashlight: SpotLight3D = $Head/Camera3D/Flashlight


func _ready() -> void:
	add_to_group("player")
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	_apply_flashlight()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * MOUSE_SENS)
		_pitch = clampf(_pitch - event.relative.y * MOUSE_SENS, deg_to_rad(-78.0), deg_to_rad(78.0))
		_head.rotation.x = _pitch

	if event.is_action_pressed("pause"):
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			Game.go_lobby()
		get_viewport().set_input_as_handled()

	if event.is_action_pressed("flashlight"):
		_flashlight_on = not _flashlight_on
		_apply_flashlight()
		get_viewport().set_input_as_handled()

	if event.is_action_pressed("interact"):
		_try_interact()
		get_viewport().set_input_as_handled()

	if event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		get_viewport().set_input_as_handled()


func _physics_process(delta: float) -> void:
	var gravity: float = float(ProjectSettings.get_setting("physics/3d/default_gravity"))
	if not is_on_floor():
		velocity.y -= gravity * delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = JUMP_VELOCITY

	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var wish := (transform.basis * Vector3(input_dir.x, 0.0, input_dir.y)).normalized()
	var speed := SPRINT_SPEED if Input.is_action_pressed("sprint") and is_on_floor() else WALK_SPEED
	var accel := ACCEL if is_on_floor() else AIR_ACCEL
	var target := wish * speed
	velocity.x = move_toward(velocity.x, target.x, accel * delta * maxf(speed, 1.0))
	velocity.z = move_toward(velocity.z, target.z, accel * delta * maxf(speed, 1.0))
	move_and_slide()
	_head_bob(delta, wish.length() > 0.1 and is_on_floor())


func _head_bob(delta: float, moving: bool) -> void:
	if moving:
		_bob += delta * BOB_FREQ * (1.35 if Input.is_action_pressed("sprint") else 1.0)
	else:
		_bob = 0.0
	var offset := sin(_bob) * BOB_AMP if moving else 0.0
	_camera.position = Vector3(0.0, offset, 0.0)


func _apply_flashlight() -> void:
	if _flashlight == null:
		return
	_flashlight.visible = _flashlight_on
	_flashlight.light_energy = 6.5 if _flashlight_on else 0.0


func _try_interact() -> void:
	var space := get_world_3d().direct_space_state
	var from := _camera.global_position
	var to := from + (-_camera.global_transform.basis.z) * 2.6
	var query := PhysicsRayQueryParameters3D.create(from, to)
	query.collision_mask = 1
	query.exclude = [get_rid()]
	var hit := space.intersect_ray(query)
	if hit.is_empty():
		return
	var col := hit.collider as Node
	if col != null and col.has_method("interact"):
		col.interact(self)
	elif col != null and col.get_parent() != null and col.get_parent().has_method("interact"):
		col.get_parent().interact(self)
