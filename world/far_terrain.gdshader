shader_type spatial;
// Дальняя земля: рисуется только там, где подробные квадраты ещё не подгружены.
uniform vec3 cam_pos = vec3(0.0);
uniform float near_r = 0.0;
varying vec3 wpos;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	if (distance(wpos.xz, cam_pos.xz) < near_r) {
		discard;
	}
	ALBEDO = pow(COLOR.rgb, vec3(2.2)) * 0.7;
	ROUGHNESS = 1.0;
}
