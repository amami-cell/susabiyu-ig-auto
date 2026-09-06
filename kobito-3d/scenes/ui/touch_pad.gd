extends Control
## スマホ操作パッド（本命の入力方法）
##
## ★設計の勘所★
##   ここで押したボタンは Input.action_press() を叩く。
##   つまり player.gd から見るとキーボードと完全に同じ。
##
##   左下 … 薄い丸スティック（プニコン）で移動。その円の中で触れた指を追う。
##   それ以外の画面ぜんぶ … ドラッグでカメラ旋回。
##   ★2本指の同時操作対応★ … 左下で移動しながら、別の指でカメラを回せる。
##     指ごとに「どこで押したか」で役割を判定し、指(index)ごとに別々に反映する。
##   右下の3ボタン（きれいに・つかむ・ジャンプ）は各自でタッチを受ける。

const STICK_RADIUS := 120.0      # プニコンの見た目の半径
const STICK_ZONE := 210.0        # この円内でタッチ開始したら「移動」とみなす
const DEAD_ZONE := 0.14
const ORBIT_SPEED := 0.0072      # ドラッグ量→カメラ回転（やや速めで軽快に）

var _stick_home := Vector2.ZERO  # プニコンの中心（左下に固定）
var _stick_touch := -1           # 移動を担当している指のindex（-1＝なし）
var _stick_value := Vector2.ZERO
var _cam_touches := {}           # カメラを担当している指のindex集合（複数可）

@onready var _input: Control = $Input


func _ready() -> void:
	_input.gui_input.connect(_on_input)
	_bind_button($Buttons/BtnAttack, "act_attack")
	_bind_button($Buttons/BtnGrab, "act_grab")
	_bind_button($Buttons/BtnJump, "act_jump")
	_skin_buttons()
	_update_home()
	get_viewport().size_changed.connect(_update_home)


## プニコンの中心を左下に固定。画面サイズが変わっても置き直す。
func _update_home() -> void:
	var vp := get_viewport_rect().size
	# 下端(ホームバー/ジェスチャ帯)を避けて少し上げる＝誤爆しにくい
	_stick_home = Vector2(STICK_RADIUS + 60.0, vp.y - STICK_RADIUS - 120.0)
	queue_redraw()


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


# ------------------------------------------------------------ 入力（指ごとに役割分担）

func _on_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			# 押した場所で役割を決める：プニコン円の中＝移動 / それ以外＝カメラ
			if _stick_touch == -1 and event.position.distance_to(_stick_home) <= STICK_ZONE:
				_stick_touch = event.index
				_update_stick(event.position)
			else:
				_cam_touches[event.index] = true
		else:
			if event.index == _stick_touch:
				_stick_touch = -1
				_stick_value = Vector2.ZERO
				_apply_move(Vector2.ZERO)
				queue_redraw()
			else:
				_cam_touches.erase(event.index)
	elif event is InputEventScreenDrag:
		if event.index == _stick_touch:
			_update_stick(event.position)
		elif _cam_touches.has(event.index):
			_orbit(event.relative)
	elif event is InputEventMouseMotion and (event.button_mask & MOUSE_BUTTON_MASK_LEFT):
		# PC/デバッグ：左ドラッグでカメラ（タッチが無い環境の保険）
		_orbit(event.relative)


# ------------------------------------------------------------ 移動（プニコン）

func _update_stick(pos: Vector2) -> void:
	var offset := pos - _stick_home
	_stick_value = offset / STICK_RADIUS
	if _stick_value.length() > 1.0:
		_stick_value = _stick_value.normalized()
	_apply_move(_stick_value)
	queue_redraw()


func _apply_move(v: Vector2) -> void:
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

func _orbit(rel: Vector2) -> void:
	var player := _find_local_player()
	if player != null and player.has_method("orbit_camera"):
		player.orbit_camera(-rel.x * ORBIT_SPEED)


func _find_local_player() -> Node:
	for p in get_tree().get_nodes_in_group("player"):
		if p.is_local:
			return p
	return null


# ------------------------------------------------------------ 見た目（プニコンは薄く常時表示）

func _draw() -> void:
	var home := _stick_home
	draw_circle(home, STICK_RADIUS, Color(1, 1, 1, 0.06))          # 薄い土台
	draw_circle(home, STICK_RADIUS, Color(1, 1, 1, 0.22), false, 3.0)
	var knob := home + _stick_value * STICK_RADIUS
	var kcol := Color(1, 1, 1, 0.4) if _stick_touch != -1 else Color(1, 1, 1, 0.22)
	draw_circle(knob, 40.0, kcol)
	draw_circle(knob, 40.0, Color(1, 1, 1, 0.4), false, 2.0)
