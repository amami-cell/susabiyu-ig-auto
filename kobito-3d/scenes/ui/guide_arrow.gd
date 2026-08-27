extends Control
## 道しるべの矢印（画面）
##
## 「次にどこへ行けばいいか」を画面上でも示す。Chapter が配る目的地(guide_pos)へ、
## ・目的地が画面に見えていれば：その上にぴょこぴょこ跳ねる印＋距離
## ・見えていない／後ろにあれば：画面中央から目的地の方向を指す大きな矢印＋距離
## ＝「何をすればいいか分からない・どこに行けばいいか分からない」を無くす、いちばんの要。
##
## 見た目だけ＝ローカルのカメラを見て毎フレーム描き直す。ゲーム判定には一切関わらない。

const FONT := preload("res://fonts/ipag.ttf")
const R := 210.0   # 画面中央からの矢印の距離

var _t := 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)
	z_index = 40


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	if not Chapter.guide_on:
		return
	var cam := get_viewport().get_camera_3d()
	if cam == null:
		return
	var target: Vector3 = Chapter.guide_pos
	var col := _kind_color(Chapter.guide_kind)
	var origin := cam.global_position
	var pl := _local_player()
	if pl != null:
		origin = (pl as Node3D).global_position
	var dist := origin.distance_to(target)

	var vp := size
	var behind := cam.is_position_behind(target)
	var sp := cam.unproject_position(target + Vector3.UP * 0.6)
	var margin_x := 60.0
	var on_screen := (not behind) and sp.x > margin_x and sp.x < vp.x - margin_x and sp.y > 80.0 and sp.y < vp.y - 200.0

	if on_screen:
		_draw_here(sp, col, dist)
	else:
		_draw_edge(cam, target, vp, col, dist)


## 目的地が画面内：その真上に、ぴょこぴょこ跳ねる下向き矢印＋距離。
func _draw_here(sp: Vector2, col: Color, dist: float) -> void:
	var bob := sin(_t * 5.0) * 8.0
	var tip := Vector2(sp.x, sp.y - 26.0 + bob)
	var w := 22.0
	var h := 26.0
	var pts := PackedVector2Array([
		Vector2(tip.x, tip.y),
		Vector2(tip.x - w, tip.y - h),
		Vector2(tip.x + w, tip.y - h),
	])
	draw_colored_polygon(pts, Color(0, 0, 0, 0.35))            # 影
	var pts2 := PackedVector2Array([
		Vector2(tip.x, tip.y - 3.0),
		Vector2(tip.x - w + 3.0, tip.y - h + 2.0),
		Vector2(tip.x + w - 3.0, tip.y - h + 2.0),
	])
	draw_colored_polygon(pts2, col)
	_label("%dm" % int(round(dist)), Vector2(sp.x, tip.y - h - 8.0), col, true)


## 目的地が画面外／後ろ：画面中央から“その方向”を指す大きな矢印＋距離。
func _draw_edge(cam: Camera3D, target: Vector3, vp: Vector2, col: Color, dist: float) -> void:
	# カメラ空間で目的地の向きを取り、画面の2D方向（右+x・下+y）に落とす。後ろでも安定。
	var to: Vector3 = target - cam.global_position
	var local: Vector3 = cam.global_transform.basis.inverse() * to
	var dir := Vector2(local.x, -local.y)
	if dir.length() < 0.001:
		dir = Vector2(0, -1)
	dir = dir.normalized()
	var center := Vector2(vp.x * 0.5, vp.y * 0.5)
	var pos := center + dir * R
	var ang := dir.angle()
	# 矢印（三角）を進行方向へ回して描く
	var L := 34.0
	var Wd := 22.0
	var p0 := pos + Vector2(L, 0).rotated(ang)
	var p1 := pos + Vector2(-L * 0.6, Wd).rotated(ang)
	var p2 := pos + Vector2(-L * 0.6, -Wd).rotated(ang)
	var pulse := 1.0 + sin(_t * 6.0) * 0.08
	p0 = pos + (p0 - pos) * pulse
	p1 = pos + (p1 - pos) * pulse
	p2 = pos + (p2 - pos) * pulse
	draw_colored_polygon(PackedVector2Array([p0 + Vector2(0, 3), p1 + Vector2(0, 3), p2 + Vector2(0, 3)]), Color(0, 0, 0, 0.35))
	draw_colored_polygon(PackedVector2Array([p0, p1, p2]), col)
	_label("%dm" % int(round(dist)), pos - dir * 34.0, col, true)


func _label(text: String, at: Vector2, col: Color, centered: bool) -> void:
	var fs := 22
	var w := FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var p := at
	if centered:
		p.x -= w * 0.5
	# 縁取り（黒）で背景に負けないように
	for off in [Vector2(-1.5, 0), Vector2(1.5, 0), Vector2(0, -1.5), Vector2(0, 1.5)]:
		draw_string(FONT, p + off + Vector2(0, 8), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0.05, 0.05, 0.05))
	draw_string(FONT, p + Vector2(0, 8), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1))


func _local_player() -> Node:
	for p in get_tree().get_nodes_in_group("player"):
		if p.is_local:
			return p
	return null


func _kind_color(kind: String) -> Color:
	match kind:
		"clean": return Color(1.0, 0.82, 0.32)
		"heal": return Color(0.62, 1.0, 0.72)
		"boss": return Color(1.0, 0.5, 0.55)
		"collect": return Color(0.55, 0.85, 1.0)
		"puzzle": return Color(0.75, 0.7, 1.0)
		"switch": return Color(0.8, 0.95, 0.5)
	return Color(1, 1, 1)
