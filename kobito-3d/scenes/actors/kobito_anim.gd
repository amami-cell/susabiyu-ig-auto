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

# 戦闘の芝居（残り時間 >0 の間だけ、歩き振りより優先して上体を動かす）
const ATTACK_DUR := 0.30
const HURT_DUR := 0.34
var _attack_t := 0.0
var _hurt_t := 0.0


## 攻撃：腕を振りかぶって振り下ろす（player から呼ばれる。全員の画面で再生）
func attack() -> void:
	_attack_t = ATTACK_DUR


## 被弾：うしろへのけぞって震える（apply_damage から呼ばれる）
func hurt() -> void:
	_hurt_t = HURT_DUR


func setup(body: Node3D, head: Node3D, arm_l: Node3D, arm_r: Node3D, eyes: Array[Node3D]) -> void:
	_body = body
	_head = head
	_arm_l = arm_l
	_arm_r = arm_r
	_eyes = eyes
	_base_y = body.position.y
	_actor = body.get_parent()   # Body の親＝プレイヤー/子どもの本体
	_blink = randf_range(1.5, 4.0)
	# 個体差：呼吸・まばたきの位相をずらして、全員が同じ動きにならないように
	_t = randf_range(0.0, 6.28)
	_phase = randf_range(0.0, 6.28)


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

	# 腕と上体：通常＝歩きの振り／攻撃＝振り下ろし／被弾＝のけぞり、で切り替える。
	var arm_l_rot := sin(_phase) * (0.55 * walk + 0.06)
	var arm_r_rot := -arm_l_rot
	var lean_x := 0.0     # 前後の傾き（＋うしろ／−前）
	var lean_z := 0.0     # 左右の震え

	if _hurt_t > 0.0:
		# くらってる：うしろへのけぞり＋小刻みに震える＋両腕を上げてかばう
		_hurt_t -= delta
		var h := clampf(_hurt_t / HURT_DUR, 0.0, 1.0)
		lean_x = 0.5 * h
		lean_z = sin(_t * 60.0) * 0.09 * h
		arm_l_rot = 1.4 * h
		arm_r_rot = 1.4 * h
	elif _attack_t > 0.0:
		# 攻撃：振りかぶり(うしろ)→振り下ろし(前へ大きく)。踏み込みで前傾。
		_attack_t -= delta
		var k := clampf(1.0 - _attack_t / ATTACK_DUR, 0.0, 1.0)
		var punch := lerpf(-0.9, 2.0, k)
		arm_r_rot = punch
		arm_l_rot = punch * 0.35
		lean_x = -0.32 * sin(k * PI)

	if _arm_l != null:
		_arm_l.rotation.x = arm_l_rot
	if _arm_r != null:
		_arm_r.rotation.x = arm_r_rot
	# 上体の傾き：芝居中はそのまま当て、終わったら0へなめらかに戻す
	if _hurt_t > 0.0 or _attack_t > 0.0:
		_body.rotation.x = lean_x
		_body.rotation.z = lean_z
	else:
		_body.rotation.x = lerp_angle(_body.rotation.x, 0.0, clampf(delta * 12.0, 0.0, 1.0))
		_body.rotation.z = lerp_angle(_body.rotation.z, 0.0, clampf(delta * 12.0, 0.0, 1.0))

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
