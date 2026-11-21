extends Node
## Игровые часы: день, время, комендантский час.

signal minute_changed(day: int, hour: int, minute: int)
signal hour_changed(day: int, hour: int)
signal day_changed(day: int)
signal curfew_changed(active: bool)

const CURFEW_START_H := 23.0
const CURFEW_END_H := 5.0
## Сколько игровых минут проходит за 1 реальную секунду (0.5 = игровой час за 2 минуты).
const DEFAULT_SCALE := 0.5

var day: int = 1
var minutes: float = 8.0 * 60.0   # старт в 08:00
var time_scale: float = DEFAULT_SCALE
var paused: bool = false
var curfew: bool = false

var _last_minute: int = -1
var _last_hour: int = -1

func _process(delta: float) -> void:
	if paused:
		return
	advance(delta * time_scale)

func advance(game_minutes: float) -> void:
	minutes += game_minutes
	while minutes >= 1440.0:
		minutes -= 1440.0
		day += 1
		day_changed.emit(day)
	var m := int(minutes)
	if m != _last_minute:
		_last_minute = m
		minute_changed.emit(day, m / 60, m % 60)
		var h := m / 60
		if h != _last_hour:
			_last_hour = h
			hour_changed.emit(day, h)
		var c := is_curfew_time(hours())
		if c != curfew:
			curfew = c
			curfew_changed.emit(curfew)

func hours() -> float:
	return minutes / 60.0

static func is_curfew_time(h: float) -> bool:
	return h >= CURFEW_START_H or h < CURFEW_END_H

func text() -> String:
	var m := int(minutes)
	return "%02d:%02d" % [m / 60, m % 60]
