extends Node
## Автопроверка (запуск: godot --path . -- --autotest=ПАПКА). Делает снимки и проверяет ходьбу.

var out_dir := ""
var main: Node
var fails: Array[String] = []

func start(main_node: Node, dir: String) -> void:
	main = main_node
	out_dir = dir
	DirAccess.make_dir_recursive_absolute(out_dir)
	_run.call_deferred()

func _wait_city(timeout: float = 90.0) -> void:
	var city: Node = main.city
	var t := 0.0
	while t < timeout:
		await get_tree().process_frame
		t += get_process_delta_time()
		if city.is_ready and city.queue.is_empty() and city.pending.is_empty() and t > 0.5:
			break
	for _i in 6:
		await get_tree().process_frame

func _shot(name_: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(out_dir.path_join(name_ + ".png"))
	print("[autotest] снимок ", name_, " кадров/с ", Engine.get_frames_per_second(), " квадратов ", main.city.loaded.size(), " треуг ", main.city.tris_total, " деталей ", main.city.tris_detail, " нарисовано ", RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME))

func _goto(x: float, z: float, up: float, yaw_deg: float, pitch_deg: float, hour: float, fly: bool) -> void:
	var p: CharacterBody3D = main.player
	p.fly = fly
	p.frozen = true
	main.city.is_ready = false
	p.teleport(Vector3(x, CityData.height_at(x, z) + up, z))
	p.rotation.y = deg_to_rad(yaw_deg)
	p.head.rotation.x = deg_to_rad(pitch_deg)
	GameClock.minutes = hour * 60.0
	await _wait_city()
	p.frozen = false

func _check(cond: bool, text: String) -> void:
	print("[autotest] ", "OK   " if cond else "FAIL ", text)
	if not cond:
		fails.append(text)

func _run() -> void:
	GameClock.paused = true
	var p: CharacterBody3D = main.player
	await _wait_city()
	_check(main.city.is_ready, "город построен вокруг героя")
	var home := CityData.place("home")
	# 1. ходьба: 4 секунды вперёд
	p.frozen = false
	for _i in 30:
		await get_tree().physics_frame
	_check(p.is_on_floor(), "герой стоит на земле (y=%.2f, земля=%.2f)" % [p.global_position.y, CityData.height_at(p.global_position.x, p.global_position.z)])
	var start := p.global_position
	Input.action_press("move_forward")
	for _i in 240:
		await get_tree().physics_frame
	Input.action_release("move_forward")
	var walked := Vector2(p.global_position.x - start.x, p.global_position.z - start.z).length()
	_check(walked > 8.0 and walked < 16.0, "ходьба: за 4 с пройдено %.1f м" % walked)
	Input.action_press("move_forward"); Input.action_press("sprint")
	start = p.global_position
	for _i in 240:
		await get_tree().physics_frame
	Input.action_release("move_forward"); Input.action_release("sprint")
	var ran := Vector2(p.global_position.x - start.x, p.global_position.z - start.z).length()
	_check(ran > walked * 1.5, "бег быстрее шага: %.1f м за 4 с" % ran)
	Input.action_press("jump")
	await get_tree().physics_frame
	await get_tree().physics_frame
	Input.action_release("jump")
	var y0 := p.global_position.y
	var peak := y0
	for _i in 60:
		await get_tree().physics_frame
		peak = maxf(peak, p.global_position.y)
	_check(peak - y0 > 0.5, "прыжок: высота %.2f м" % (peak - y0))
	# 2. часы
	GameClock.paused = false
	var d0 := GameClock.day
	GameClock.minutes = 22.0 * 60.0 + 50.0
	GameClock.advance(20.0)
	_check(GameClock.curfew, "комендантский час включается в 23:00")
	GameClock.advance(60.0)
	_check(GameClock.day == d0 + 1, "после полуночи наступает следующий день")
	GameClock.advance(6.0 * 60.0)
	_check(not GameClock.curfew, "комендантский час заканчивается в 05:00")
	GameClock.paused = true
	# 3. снимки
	await _goto(home.x, home.z, 1.0, float(CityData.meta.get("spawn_yaw", 0.0)), 0.0, 10.0, false)
	await _shot("01_home_street_day")
	await _goto(home.x, home.z, 1.0, float(CityData.meta.get("spawn_yaw", 0.0)) + 90.0, 0.0, 19.6, false)
	await _shot("02_home_evening")
	await _goto(home.x, home.z, 1.0, float(CityData.meta.get("spawn_yaw", 0.0)), 5.0, 1.0, false)
	await _shot("03_home_night")
	await _goto(home.x, home.z, 120.0, -100.0, -22.0, 14.0, true)
	await _shot("04_lunacharka_from_above")
	await _goto(370.0, -1140.0, 1.0, 45.0, 0.0, 12.0, false)
	await _shot("05_center_street")
	await _goto(370.0, -1140.0, 260.0, -45.0, -30.0, 16.0, true)
	await _shot("06_center_from_above")
	var e: Dictionary = CityData.meta.exits[2]
	await _goto(float(e.x) + 22.0, float(e.z) + 22.0, 9.0, 45.0, -18.0, 9.0, true)
	await _shot("07_checkpoint_dam")
	# дороги: переход со светофором на бульваре, вид с земли, сверху и план
	await _goto(680.3, -1121.1, 0.9, 319.2, -6.0, 11.0, false)
	await _shot("08_crossing_ground")
	await _goto(672.0, -1111.0, 16.0, 319.2, -28.0, 15.0, true)
	await _shot("09_crossing_above")
	await _goto(652.0, -1097.0, 1.7, 139.2, 6.0, 11.0, true)
	await _shot("12_signals")
	await _goto(652.0, -1097.0, 1.7, 139.2, 6.0, 23.0, true)
	await _shot("15_signals_night")
	await _goto(672.0, -1111.0, 40.0, 319.2, -22.0, 23.0, true)
	await _shot("16_boulevard_night_above")
	await _goto(652.0, -1097.0, 1.7, 139.2, 6.0, 20.6, true)
	await _shot("17_signals_dusk")
	await _goto(790.0, 3100.0, 7.0, 304.5, -14.0, 12.0, true)
	await _shot("18_private_fences_above")
	await _goto(809.0, 3084.8, 1.7, 48.7, 0.0, 12.0, true)
	await _shot("19_private_street")
	await _goto(694.0, -1222.0, 1.7, 133.0, -5.0, 12.0, true)
	await _shot("20_playground")
	await _goto(660.0, -1180.0, 1.7, 141.0, -5.0, 12.0, true)
	await _shot("21_containers")
	await _goto(599.0, -1221.0, 1.7, 45.0, 0.0, 12.0, true)
	await _shot("22_bar_fence")
	await _goto(671.5, -1167.0, 1.7, 228.9, 2.0, 12.0, true)
	await _shot("23_entrance")
	await _goto(671.5, -1167.0, 1.7, 228.9, 2.0, 22.5, true)
	await _shot("23b_entrance_night")
	await _goto(644.5, -1090.0, 1.7, 48.8, 2.0, 12.0, true)
	await _shot("24_shop_entrance")
	await _goto(651.0, -1191.0, 1.7, 138.7, 0.0, 12.0, true)
	await _shot("25_garages")
	await _goto(-5843.9, 7704.4, 22.0, 0.0, -28.0, 12.0, true)
	await _shot("26_exit_road_trees")
	await _goto(503.5, -1165.0, 1.7, 139.3, 0.0, 11.0, true)
	await _shot("13_bus_stop")
	await _goto(1346.0, 1925.0, 1.7, 139.2, 5.0, 13.0, true)
	await _shot("14_junction_low")
	await _goto(694.7, -1137.7, 70.0, 319.2, -89.0, 12.0, true)
	await _shot("10_crossing_plan")
	await _goto(1339.0, 1944.0, 45.0, 0.0, -50.0, 13.0, true)
	await _shot("11_junction_south")




	print("[autotest] ИТОГ: ", "все проверки пройдены" if fails.is_empty() else "провалено: " + str(fails))
	get_tree().quit(0 if fails.is_empty() else 1)
