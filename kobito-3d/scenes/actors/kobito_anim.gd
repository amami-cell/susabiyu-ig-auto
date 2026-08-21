extends Node
class_name KobitoAnim
## 小人の“芝居”。毎フレーム、親(CharacterBody3D)の速度を見て
## 歩き(上下バウンド＋腕振り)・待機の呼吸・まばたき を付ける。
## スクリプトは軽い三角関数だけ。プレイヤーも子ども8人も同じ。

var _body: Node3D = null
var _actor: Object = null
var _head: Node3D = null
var _arm_l: Node3D = null
var _arm_r: Node3D = null
var _eyes: Array[Node3D] = []

var _t := 0.0
var _blink := 2.0
var _base_y := 0.0
var _phase := 0.0


func setup(body: Node3D, head: Node3D, arm_l: Node3D, arm_r: Node3D, eyes: Array[Node3D]) -> void:
	_body = body
	_head = head
	_arm_l = arm_l
	_arm_r = arm_r
	_eyes = eyes
	_base_y = body.position.y
	_actor = body.get_parent()   # Body の親＝プレイヤー/子どもの本体
	_blink = randf_range(1.5, 4.0)


func _process(delta: float) -> void:
	if _body == null or _actor == null:
		return
	_t += delta

	var speed := 0.0
	var v = _actor.get("velocity")
	if v is Vector3:
		speed = Vector2(v.x, v.z).length()
	var walk := clampf(speed / 3.0, 0.0, 1.0)
	_phase += delta * (4.0 + speed * 2.2)

	# 歩き：上下にぴょこぴょこ（body.scale は殴りの潰しが使うので触らない＝位置で弾む）
	_body.position.y = _base_y + absf(sin(_phase)) * 0.045 * walk

	# 腕振り（待機でもほんの少し揺れる）
	var swing := sin(_phase) * (0.55 * walk + 0.06)
	if _arm_l != null:
		_arm_l.rotation.x = swing
	if _arm_r != null:
		_arm_r.rotation.x = -swing

	# 待機の呼吸は頭でやる（body.scale を避ける）
	if _head != null:
		var breathe := 1.0 + sin(_t * 1.6) * 0.03 * (1.0 - walk)
		_head.scale = Vector3(1.0, breathe, 1.0)

	# まばたき
	_blink -= delta
	if _blink <= 0.0:
		_blink = randf_range(2.0, 5.0)
		for e in _eyes:
			if is_instance_valid(e):
				var tw := create_tween()
				tw.tween_property(e, "scale:y", 0.1, 0.05)
				tw.tween_property(e, "scale:y", 1.0, 0.09)
