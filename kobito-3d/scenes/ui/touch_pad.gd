extends Control
## スマホ操作パッド（本命の入力方法）
##
## ★設計の勘所★
##   ここで押したボタンは Input.action_press() を叩く。
##   つまり player.gd から見るとキーボードと完全に同じ。
##   「スマホ版の分岐」がゲーム側に一切生えないので、後で操作を足すのがラクになる。
##
##   左半分 … 仮想スティック（移動）
##   右半分 … ドラッグでカメラ旋回 ＋ ボタン3つ（攻撃・つかむ・ジャンプ/飛行）
##   ボタンを3つに絞っているのは、親指2本で届く範囲に収めるため。

const STICK_RADIUS := 110.0
const DEAD_ZONE := 0.14
const ORBIT_SPEED := 0.006

var _stick_touch := -1
var _stick_origin := Vector2.ZERO
var _stick_now := Vector2.ZERO
var _stick_value := Vector2.ZERO

var _orbit_touch := -1

@onready var _stick_area: Control = $StickArea
@onready var _camera_area: Control = $CameraArea


func _ready() -> void:
	_stick_area.gui_input.connect(_on_stick_input)
	_camera_area.gui_input.connect(_on_camera_input)
	_bind_button($Buttons/BtnAttack, "act_attack")
	_bind_button($Buttons/BtnGrab, "act_grab")
	_bind_button($Buttons/BtnJump, "act_jump")


func _bind_button(btn: BaseButton, action: String) -> void:
	btn.button_down.connect(func() -> void: Input.action_press(action))
	btn.button_up.connect(func() -> void: Input.action_release(action))


# ------------------------------------------------------------ 仮想スティック

func _on_stick_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and _stick_touch == -1:
			_stick_touch = event.index
			_stick_origin = event.position
			_stick_now = event.position
		elif not event.pressed and event.index == _stick_touch:
			_stick_touch = -1
			_stick_value = Vector2.ZERO
			_apply_move(Vector2.ZERO)
			queue_redraw()
	elif event is InputEventScreenDrag and event.index == _stick_touch:
		_stick_now = event.position
		var offset := _stick_now - _stick_origin
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


# ------------------------------------------------------------ 見た目

func _draw() -> void:
	if _stick_touch == -1:
		return
	var base := _stick_area.position + _stick_origin
	draw_circle(base, STICK_RADIUS, Color(1, 1, 1, 0.10))
	draw_circle(base, STICK_RADIUS, Color(1, 1, 1, 0.35), false, 3.0)
	draw_circle(base + _stick_value * STICK_RADIUS, 38.0, Color(1, 1, 1, 0.45))
