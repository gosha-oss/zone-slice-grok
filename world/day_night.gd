extends Node3D
## День и ночь: солнце, луна, небо и туман по игровым часам.

const LATITUDE := 49.44      # Черкассы
const DECLINATION := 12.0    # наклон солнца (поздняя весна)

@onready var sun: DirectionalLight3D = $Sun
@onready var moon: DirectionalLight3D = $Moon
@onready var env_node: WorldEnvironment = $WorldEnvironment

var _sky: ProceduralSkyMaterial

func _ready() -> void:
	var env := Environment.new()
	_sky = ProceduralSkyMaterial.new()
	var sky := Sky.new()
	sky.sky_material = _sky
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.ssao_enabled = true
	env.ssao_radius = 2.0
	env.ssao_intensity = 1.5
	env.fog_enabled = true
	env.fog_density = 0.00022
	env.fog_aerial_perspective = 0.7
	env.fog_sky_affect = 0.35
	env_node.environment = env
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_max_distance = 260.0
	moon.shadow_enabled = false
	_apply()

func _process(_delta: float) -> void:
	_apply()

func sun_elevation_azimuth(hours: float) -> Vector2:
	var lat := deg_to_rad(LATITUDE)
	var dec := deg_to_rad(DECLINATION)
	var ha := deg_to_rad((hours - 12.5) * 15.0)   # полдень по солнцу ~12:30
	var sin_el := sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(ha)
	var el := asin(clampf(sin_el, -1.0, 1.0))
	var az := atan2(sin(ha), cos(ha) * sin(lat) - tan(dec) * cos(lat))  # 0 = юг, + к западу
	return Vector2(el, az)

func _dir_from(el: float, az: float) -> Vector3:
	# направление НА светило: юг = +Z, запад = -X, вверх = +Y
	return Vector3(-sin(az) * cos(el), sin(el), cos(az) * cos(el))

func _apply() -> void:
	var ea := sun_elevation_azimuth(GameClock.hours())
	var to_sun := _dir_from(ea.x, ea.y)
	sun.look_at_from_position(Vector3.ZERO, -to_sun, Vector3.UP if absf(to_sun.y) < 0.99 else Vector3.RIGHT)
	var el_deg := rad_to_deg(ea.x)
	var day := smoothstep(-6.0, 8.0, el_deg)          # 0 ночь .. 1 день
	var golden := 1.0 - smoothstep(0.0, 25.0, absf(el_deg))
	sun.light_energy = 1.0 * smoothstep(-2.0, 10.0, el_deg)
	sun.light_color = Color(1.0, 0.96, 0.9).lerp(Color(1.0, 0.62, 0.38), golden)
	sun.visible = sun.light_energy > 0.01
	# луна напротив солнца
	var to_moon := _dir_from(maxf(-ea.x, deg_to_rad(20.0)), ea.y + PI)
	moon.look_at_from_position(Vector3.ZERO, -to_moon, Vector3.UP)
	moon.light_energy = 0.22 * (1.0 - day)
	moon.light_color = Color(0.62, 0.72, 1.0)
	moon.visible = moon.light_energy > 0.005
	# небо
	var top_day := Color(0.30, 0.46, 0.72)
	var hor_day := Color(0.66, 0.74, 0.82)
	var top_night := Color(0.02, 0.03, 0.07)
	var hor_night := Color(0.05, 0.065, 0.11)
	var hor_gold := Color(0.95, 0.60, 0.38)
	var top := top_night.lerp(top_day, day)
	var hor := hor_night.lerp(hor_day, day).lerp(hor_gold, golden * day * 0.7)
	_sky.sky_top_color = top
	_sky.sky_horizon_color = hor
	_sky.ground_horizon_color = hor
	_sky.ground_bottom_color = hor.darkened(0.4)
	var env := env_node.environment
	env.fog_light_color = hor
	env.ambient_light_color = Color(0.13, 0.17, 0.30).lerp(Color(0.72, 0.78, 0.88), day)
	env.ambient_light_energy = lerpf(0.9, 0.45, day)
	env.background_energy_multiplier = lerpf(0.6, 1.0, day)

func is_night() -> bool:
	return sun_elevation_azimuth(GameClock.hours()).x < 0.0
