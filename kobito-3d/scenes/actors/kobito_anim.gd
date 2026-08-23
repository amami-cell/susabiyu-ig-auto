extends Node
class_name KobitoAnim
## 小人の“芝居”。歩き(上下バウンド＋腕振り)・待機の呼吸・まばたき、そして戦闘。
##
## 大事な方針：どの芝居も「上体を固めて止める」ことはしない（＝攻撃後に固まらない）。
## 攻撃は“右腕の大振り”だけで表現し、体のバウンドも歩きも止めない。被弾は頭の弾きだけ。

var _body: Node3D = null
var _actor: Object = null
var _head: Node3D = null
var _arm_l: Node3D = null
var _arm_r: Node3D = null
var _eyes: Array[Node3D] = []
var _weapon: Node3D = null      # 右手の武器（あれば）
var _trail: Node3D = null       # 振りのトレイル（攻撃中だけ表示）
var _legs: Array[Node3D] = []   # 脚 [左, 右]（歩くと交互に振る）

var _t := 0.0
var _blink := 2.0
var _base_y := 0.0
var _phase := 0.0

# 戦闘の芝居（残り時間 >0 の間だけ再生。終わったら自然に歩き/待機へ戻る）
const ATTACK_DUR := 0.34
const HURT_DUR := 0.26
var _attack_t := 0.0
var _hurt_t := 0.0

const WEAPON_REST := 0.35       # 武器を構える基本角度


func setup(body: Node3D, head: Node3D, arm_l: Node3D, arm_r: Node3D, eyes: Array[Node3D], weapon: Node3D = null, trail: Node3D = null, legs: Array[Node3D] = []) -> void:
	_body = body
	_head = head
	_arm_l = arm_l
	_arm_r = arm_r
	_eyes = eyes
	_weapon = weapon
	_trail = trail
	_legs = legs
	_base_y = body.position.y
	_actor = body.get_parent()
	_blink = randf_range(1.5, 4.0)
	_t = randf_range(0.0, 6.28)
	_phase = randf_range(0.0, 6.28)


## 攻撃：右腕を大きく振り上げて振り下ろす（player から呼ばれる。全員の画面で再生）
func attack() -> void:
	_attack_t = ATTACK_DUR


## 被弾：頭をうしろへ弾く（動きは止めない）
func hurt() -> void:
	_hurt_t = HURT_DUR


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

	# 上下バウンド（常時＝攻撃中でも止まらない）
	_body.position.y = _base_y + absf(sin(_phase)) * 0.045 * walk

	# 左腕：いつも歩きの振り
	var walk_swing := sin(_phase) * (0.55 * walk + 0.06)
	if _arm_l != null:
		_arm_l.rotation.x = walk_swing

	# 脚：歩くと左右交互に前後へ振る（止まると自然にまっすぐへ戻る）
	var leg_swing := sin(_phase) * (0.7 * walk)
	for i in _legs.size():
		var leg := _legs[i]
		if leg != null:
			# 右脚(奇数)は逆位相＝腕とちぐはぐにならず「歩き」に見える
			leg.rotation.x = leg_swing if (i % 2 == 0) else -leg_swing

	# 右腕：攻撃中は「前方水平に構えて右→左へ大きく薙ぐ」。ふだんは 武器持ち=構え / 素手=歩き振り。
	if _attack_t > 0.0:
		_attack_t -= delta
		var k := clampf(1.0 - _attack_t / ATTACK_DUR, 0.0, 1.0)
		var sweep := smoothstep(0.0, 1.0, k)
		if _arm_r != null:
			_arm_r.rotation.x = -1.35                          # 腕を前方水平へ上げる
			_arm_r.rotation.y = lerpf(1.5, -1.7, sweep)        # 右→左へ大きく薙ぐ（横振り＝背後からも見える）
			_arm_r.rotation.z = 0.0
		# トレイルは薙ぎの間ずっと光らせる（刃の軌跡）
		if _trail != null:
			_trail.visible = k > 0.08 and k < 0.9
	else:
		if _trail != null and _trail.visible:
			_trail.visible = false
		if _arm_r != null:
			_arm_r.rotation.y = lerp_angle(_arm_r.rotation.y, 0.0, clampf(delta * 14.0, 0.0, 1.0))
			_arm_r.rotation.z = lerp_angle(_arm_r.rotation.z, 0.0, clampf(delta * 12.0, 0.0, 1.0))
			if _weapon != null:
				_arm_r.rotation.x = WEAPON_REST + sin(_phase) * 0.06 * walk   # 構えて小さく揺れる
			else:
				_arm_r.rotation.x = -walk_swing

	# 被弾：頭をうしろへ弾いてすぐ戻す（体・移動は止めない）
	if _head != null:
		var head_tilt := 0.0
		if _hurt_t > 0.0:
			_hurt_t -= delta
			head_tilt = 0.6 * clampf(_hurt_t / HURT_DUR, 0.0, 1.0)
		_head.rotation.x = lerp_angle(_head.rotation.x, head_tilt, clampf(delta * 18.0, 0.0, 1.0))
		# 待機の呼吸（頭スケール）
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
