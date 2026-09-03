extends Control
## スマホ操作パッド（本命の入力方法）
##
## ★設計の勘所★
##   ここで押したボタンは Input.action_press() を叩く。
##   つまり player.gd から見るとキーボードと完全に同じ。
##   「スマホ版の分岐」がゲーム側に一切生えないので、後で操作を足すのがラクになる。
##
##   左下 … 常時見える丸スティック（プニコン）で移動。ふれた指の向きへ倒す。
##   右半分 … ドラッグでカメラ旋回 ＋ ボタン3つ（きれいに・つかむ・ジャンプ）
##   ボタンを3つに絞っているのは、親指2本で届く範囲に収めるため。

const STICK_RADIUS := 120.0
const DEAD_ZONE := 0.14
const ORBIT_SPEED := 0.006

var _stick_touch := -1
var _stick_origin := Vector2.ZERO   # プニコンの中心（左下に固定）
var _stick_value := Vector2.ZERO

var _orbit_touch := -1

@onready var _stick_area: Control = $StickArea
@onready var _camera_area: Control = $CameraArea

var _move_lbl: Label = null
var _cam_lbl: Label = null


func _ready() -> void:
	_stick_area.gui_input.connect(_on_stick_input)
	_camera_area.gui_input.connect(_on_camera_input)
	_bind_button($Buttons/BtnAttack, "act_attack")
	_bind_button($Buttons/BtnGrab, "act_grab")
	_bind_button($Buttons/BtnJump, "act_jump")
	_skin_buttons()
	_build_hints()
	_update_home()
	get_viewport().size_changed.connect(_update_home)


## プニコンの中心を左下に固定。画面サイズが変わっても左下に置き直す。
func _update_home() -> void:
	var vp := get_viewport_rect().size
	_stick_origin = Vector2(STICK_RADIUS + 70.0, vp.y - STICK_RADIUS - 110.0)
	if _move_lbl != null:
		_move_lbl.position = _stick_origin + Vector2(-90.0, STICK_RADIUS + 6.0)
	if _cam_lbl != null:
		_cam_lbl.position = Vector2(vp.x * 0.5 + 40.0, vp.y * 0.5 - 40.0)
	queue_redraw()


## 「うごく」「ドラッグでカメラ」の常時ヒント（初めてでも どこを触るか分かる）。
func _build_hints() -> void:
	_move_lbl = Label.new()
	_move_lbl.text = "うごく"
	_move_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	UIKit.style_label(_move_lbl, 22, Color(1, 1, 1, 0.85), 5, Color(0.1, 0.15, 0.1, 0.9))
	add_child(_move_lbl)

	_cam_lbl = Label.new()
	_cam_lbl.text = "▽ ドラッグで カメラ ▽"
	_cam_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	UIKit.style_label(_cam_lbl, 20, Color(1, 1, 1, 0.7), 5, Color(0.1, 0.15, 0.1, 0.85))
	add_child(_cam_lbl)


## 素っぽいボタンを絵本テイスト（ぷにっと角丸・アイコン付き）に整える。
func _skin_buttons() -> void:
	var a: Button = $Buttons/BtnAttack
	var g: Button = $Buttons/BtnGrab
	var j: Button = $Buttons/BtnJump
	a.text = "きれいに"
	g.text = "つかむ"
	j.text = "ジャンプ"
	UIKit.style_button(a, UIKit.GREEN, UIKit.GREEN_DK)
	UIKit.style_button(g, UIKit.GOLD, Color(0.82, 0.6, 0.24))
	UIKit.style_button(j, Color(0.62, 0.8, 1.0), Color(0.42, 0.6, 0.9))
	for b in [a, g, j]:
		b.custom_minimum_size = Vector2(124, 124)
		b.autowrap_mode = TextServer.AUTOWRAP_OFF
		b.add_theme_constant_override("outline_size", 0)


func _bind_button(btn: BaseButton, action: String) -> void:
	btn.button_down.connect(func() -> void: Input.action_press(action))
	btn.button_up.connect(func() -> void: Input.action_release(action))


# ------------------------------------------------------------ 仮想スティック（プニコン）

func _on_stick_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and _stick_touch == -1:
			_stick_touch = event.index
			_update_stick(event.position)
		elif not event.pressed and event.index == _stick_touch:
			_stick_touch = -1
			_stick_value = Vector2.ZERO
			_apply_move(Vector2.ZERO)
			queue_redraw()
	elif event is InputEventScreenDrag and event.index == _stick_touch:
		_update_stick(event.position)


## 触れた位置を、左下に固定したプニコン中心からの傾きに変換する。
func _update_stick(pos: Vector2) -> void:
	var offset := pos - _stick_origin
	_stick_value = offset / STICK_RADIUS
	if _stick_value.length() > 1.0:
		_stick_value = _stick_value.normalized()
	_apply_move(_stick_value)
	queue_redraw()


func _apply_move(v: Vector2) -> void:
	# アナログ量つきで押す＝そっと倒せばゆっくり歩く
	_press_axis("move_left", "move_right", v.x)
	_press_axis("move_forward", "move_back", v.y)


func _press_axis(neg: String, pos: String, value: float) -> void:
	if value < -DEAD_ZONE:
		Input.action_press(neg, minf(1.0, -value))
		Input.action_release(pos)
	elif value > DEAD_ZONE:
		Input.action_press(pos, minf(1.0, value))
		Input.action_release(neg)
	else:
		Input.action_release(neg)
		Input.action_release(pos)


# ------------------------------------------------------------ カメラ旋回

func _on_camera_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and _orbit_touch == -1:
			_orbit_touch = event.index
		elif not event.pressed and event.index == _orbit_touch:
			_orbit_touch = -1
	elif event is InputEventScreenDrag and event.index == _orbit_touch:
		var player := _find_local_player()
		if player != null and player.has_method("orbit_camera"):
			player.orbit_camera(-event.relative.x * ORBIT_SPEED)


func _find_local_player() -> Node:
	for p in get_tree().get_nodes_in_group("player"):
		if p.is_local:
			return p
	return null


# ------------------------------------------------------------ 見た目（プニコンは常時表示）

func _draw() -> void:
	var home := _stick_origin
	# 土台（うすい丸）＝ここに親指を置けば動く、と一目で分かる
	draw_circle(home, STICK_RADIUS, Color(1, 1, 1, 0.09))
	draw_circle(home, STICK_RADIUS, Color(1, 1, 1, 0.30), false, 3.0)
	# つまみ（倒した向きへ動く）。触れている間は明るく。
	var knob := home + _stick_value * STICK_RADIUS
	var kcol := Color(1, 1, 1, 0.5) if _stick_touch != -1 else Color(1, 1, 1, 0.30)
	draw_circle(knob, 42.0, kcol)
	draw_circle(knob, 42.0, Color(1, 1, 1, 0.5), false, 2.0)
