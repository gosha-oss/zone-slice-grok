extends CharacterBody3D
## Герой от первого лица: шаг, бег, присед, прыжок. Клавиатура и геймпад.

const WALK_SPEED := 3.2
const SPRINT_SPEED := 6.2
const CROUCH_SPEED := 1.5
const JUMP_VELOCITY := 4.3
const ACCEL := 14.0
const AIR_ACCEL := 3.0
const MOUSE_SENS := 0.0022
const PAD_SENS := 2.6
const STAND_HEIGHT := 1.8
const CROUCH_HEIGHT := 1.1
const EYE_OFFSET := 0.15
const FLY_SPEED := 40.0

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var shape: CollisionShape3D = $Shape

var frozen: bool = true        # пока город под ногами не построен
var fly: bool = false          # тестовый полёт (V)
var input_enabled: bool = true
var _height: float = STAND_HEIGHT
var _gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

func _ready() -> void:
	floor_snap_length = 0.35
	floor_max_angle = deg_to_rad(48.0)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
	if not input_enabled:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_look(-event.relative.x * MOUSE_SENS, -event.relative.y * MOUSE_SENS)
	elif event.is_action_pressed("debug_fly"):
		fly = not fly
		velocity = Vector3.ZERO
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _look(yaw: float, pitch: float) -> void:
	rotate_y(yaw)
	head.rotation.x = clampf(head.rotation.x + pitch, deg_to_rad(-88.0), deg_to_rad(88.0))

func _physics_process(delta: float) -> void:
	if frozen:
		return
	if input_enabled:
		var look := Input.get_vector("look_left", "look_right", "look_up", "look_down")
		if look.length_squared() > 0.0:
			_look(-look.x * PAD_SENS * delta, -look.y * PAD_SENS * delta)
	var move := Input.get_vector("move_left", "move_right", "move_forward", "move_back") if input_enabled else Vector2.ZERO
	if fly:
		_fly(move, delta)
		return
	var crouching := input_enabled and Input.is_action_pressed("crouch")
	_set_height(CROUCH_HEIGHT if crouching else STAND_HEIGHT, delta)
	var speed := WALK_SPEED
	if crouching:
		speed = CROUCH_SPEED
	elif Input.is_action_pressed("sprint") and move.y < -0.1:
		speed = SPRINT_SPEED
	var dir := (transform.basis * Vector3(move.x, 0.0, move.y))
	if dir.length() > 1.0:
		dir = dir.normalized()
	var target := dir * speed
	var a := ACCEL if is_on_floor() else AIR_ACCEL
	velocity.x = move_toward(velocity.x, target.x, a * delta * speed / WALK_SPEED)
	velocity.z = move_toward(velocity.z, target.z, a * delta * speed / WALK_SPEED)
	if is_on_floor():
		if input_enabled and Input.is_action_just_pressed("jump") and not crouching:
			velocity.y = JUMP_VELOCITY
	else:
		velocity.y -= _gravity * delta
	move_and_slide()
	# страховка: если провалился под землю (квадрат ещё не готов) — вернуть на поверхность
	var ground := CityData.height_at(global_position.x, global_position.z)
	if global_position.y < ground - 6.0:
		global_position.y = ground + 1.0
		velocity = Vector3.ZERO

func _fly(move: Vector2, delta: float) -> void:
	var speed := FLY_SPEED * (5.0 if Input.is_action_pressed("sprint") else 1.0)
	var dir := camera.global_transform.basis * Vector3(move.x, 0.0, move.y)
	if Input.is_action_pressed("jump"):
		dir.y += 1.0
	if Input.is_action_pressed("crouch"):
		dir.y -= 1.0
	global_position += dir * speed * delta
	var ground := CityData.height_at(global_position.x, global_position.z)
	if global_position.y < ground + 0.5:
		global_position.y = ground + 0.5

func _set_height(h: float, delta: float) -> void:
	if is_equal_approx(_height, h):
		return
	if h > _height and test_move(global_transform, Vector3.UP * (h - _height)):
		return   # над головой потолок — не встаём
	_height = move_toward(_height, h, 4.0 * delta)
	var capsule := shape.shape as CapsuleShape3D
	capsule.height = _height
	shape.position.y = _height * 0.5
	head.position.y = _height - EYE_OFFSET

func teleport(pos: Vector3) -> void:
	global_position = pos
	velocity = Vector3.ZERO

func speed_kmh() -> float:
	return Vector2(velocity.x, velocity.z).length() * 3.6
