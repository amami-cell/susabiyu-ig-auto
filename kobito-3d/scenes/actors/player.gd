extends CharacterBody3D
class_name Player
## 小人プレイヤー
##
## ● 誰が動かすか（オンラインの肝）
##   ノード名 = そのプレイヤーの peer_id。名前から権限(authority)を決める。
##   自分の小人だけが物理を動かし、その結果を 20Hz で全員へ送る。
##   他人の小人は「送られてきた位置へ滑らかに寄せる」だけ＝ラグでカクつかない。
##
## ● ダメージの正はサーバ
##   攻撃はサーバへ申告し、当たり判定と HP はサーバが決める。
##   クライアントが勝手に「癒やした」と言っても通らない。
##
## ● 操作はキーボードもタッチも同じ道
##   タッチUI(TouchPad)が Input.action_press() を叩くので、
##   このスクリプトには「スマホ用の分岐」が1行も無い。

signal stats_changed

const SPEED := 3.6
const ACCEL := 18.0
const GRAVITY := 14.0
const JUMP_SPEED := 5.2
const FLY_LIFT := 4.2          # 飛行中の上昇速度
const FLY_CEILING := 12.0      # 上がりすぎ防止
# 飛行の解禁は Lv ではなく「癒やして集めた5パーツ」で判定する（WorldState.has_flight）
const ATTACK_RANGE := 2.3
const ATTACK_COOLDOWN := 0.45
const SYNC_HZ := 20.0

enum State { IDLE, MOVE, ATTACK, FLY, HURT, DOWN }

@export var max_hp: int = 40

var state: State = State.IDLE
var hp: int = 40
var level: int = 1
var xp: int = 0
var attack_power: int = 6

var is_local := false

var _yaw := 0.0
var _attack_cd := 0.0
var _hurt_time := 0.0
var _sync_accum := 0.0
var _age := 0.0
var _held_trash: Node3D = null
var _base_color := Color.WHITE   # 被弾フラッシュから戻す元の色
var _step_t := 0.0               # 足音の間隔タイマー
var _was_airborne := false       # 前フレーム空中だったか（着地/ジャンプ音の判定）

# 他人の小人を滑らかに寄せるための目標値
var _net_pos := Vector3.ZERO
var _net_yaw := 0.0

@onready var _body: MeshInstance3D = $Body
@onready var _label: Label3D = $NameLabel
@onready var _cam_rig: Node3D = $CamRig
@onready var _camera: Camera3D = $CamRig/Camera3D
@onready var _grab_area: Area3D = $GrabArea


func _ready() -> void:
	add_to_group("player")
	var owner_id := name.to_int()
	set_multiplayer_authority(owner_id)
	is_local = owner_id == multiplayer.get_unique_id()

	hp = max_hp
	_net_pos = global_position
	_net_yaw = _yaw

	_base_color = Net.color_of(owner_id)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = _base_color
	mat.roughness = 0.9
	_body.material_override = mat
	var pname: String = Net.roster.get(owner_id, {}).get("name", "小人")
	# 見た目の選択：
	#  ・PC/ネイティブ … 本物のリグ付きモデル（きれい版・重い環境向け）
	#  ・Web … 既製モデルは女性で“お父さんに見えない”ため、作り込んだクレイの父
	#          （パーカー・ヤギひげ・パパ髪＋攻撃モーション）に。家族の簡易ドールとも自然。
	# 名前が「母/妻」等でない限り父スタイルにする（＝この二人プレイの主役は父）。
	if KobitoModel.has_model() and KobitoModel.heavy_ok():
		var mdl := KobitoModel.new()
		mdl.name = "Model"
		_body.add_child(mdl)
		mdl.setup(_body, _base_color, "adult", pname)
	else:
		var style_name := pname
		if not _looks_parent(pname):
			style_name = "父"   # 名前から親と分からないときは“父”スタイルを既定に
		KobitoLook.decorate(_body, _base_color, true, "adult", style_name)   # 親：武器を持つ
	_label.text = pname

	# カメラは自分のぶんだけ。他人の小人のカメラは切っておく。
	_camera.current = is_local
	_cam_rig.top_level = true   # 親の回転を受けない＝カメラが小人と一緒に回らない

	if not is_local:
		# 他人の小人の物理は回さない（位置は送られてくる）
		set_physics_process(true)


## 名前から「親（父/母）」と分かるか。分かるならその見た目を尊重し、分からなければ父を既定にする。
func _looks_parent(nm: String) -> bool:
	for k in ["父", "夫", "パパ", "とう", "母", "妻", "ママ", "かあ", "おかん"]:
		if k in nm:
			return true
	return false


func _physics_process(delta: float) -> void:
	if not multiplayer.has_multiplayer_peer():
		return
	_age += delta
	if is_local:
		_local_step(delta)
		_push_state(delta)
	else:
		_remote_step(delta)
	_update_look()


# ------------------------------------------------------------ 自分の小人

func _local_step(delta: float) -> void:
	_attack_cd = maxf(0.0, _attack_cd - delta)
	if state == State.DOWN:
		return

	if _hurt_time > 0.0:
		_hurt_time -= delta
		if _hurt_time <= 0.0 and state == State.HURT:
			state = State.IDLE

	var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	# 入力はカメラの向きを基準にする（＝スマホでも「上に倒したら奥へ」が直感どおり）
	var basis_yaw := _cam_rig.rotation.y
	var dir := Vector3(input.x, 0.0, input.y).rotated(Vector3.UP, basis_yaw)
	if dir.length() > 1.0:
		dir = dir.normalized()

	var flying := state == State.FLY
	var wants_up := Input.is_action_pressed("act_jump")

	if can_fly() and wants_up and not is_on_floor():
		flying = true
	if is_on_floor() and not wants_up:
		flying = false

	if flying:
		state = State.FLY
		velocity.y = FLY_LIFT if wants_up else -1.5
		if global_position.y > FLY_CEILING:
			velocity.y = minf(velocity.y, 0.0)
	else:
		velocity.y -= GRAVITY * delta
		if is_on_floor():
			velocity.y = -0.1
			if wants_up:
				velocity.y = JUMP_SPEED

	var target := dir * SPEED
	velocity.x = move_toward(velocity.x, target.x, ACCEL * delta)
	velocity.z = move_toward(velocity.z, target.z, ACCEL * delta)

	if dir.length_squared() > 0.001:
		_yaw = atan2(-dir.x, -dir.z)

	if state != State.FLY and state != State.HURT:
		state = State.MOVE if dir.length_squared() > 0.001 else State.IDLE

	move_and_slide()

	# 足音・ジャンプ・着地の音（自分の小人だけ）
	var grounded := is_on_floor()
	var hspeed := Vector2(velocity.x, velocity.z).length()
	if not grounded and not _was_airborne and velocity.y > 1.0:
		Sfx.play("jump", -9.0)          # 地面を離れた瞬間＝跳んだ
	elif grounded and _was_airborne:
		Sfx.play("land", -12.0)         # 空中→着地
	_was_airborne = not grounded
	if grounded and hspeed > 1.0 and state != State.FLY:
		_step_t -= delta
		if _step_t <= 0.0:
			_step_t = 0.34
			Sfx.play("step", -22.0)
	else:
		_step_t = 0.0

	if Input.is_action_just_pressed("act_attack"):
		_try_attack()
	if Input.is_action_just_pressed("act_grab"):
		_toggle_grab()


func can_fly() -> bool:
	return WorldState.has_flight()


func _try_attack() -> void:
	if _attack_cd > 0.0:
		return
	_attack_cd = ATTACK_COOLDOWN
	if state != State.FLY:
		state = State.ATTACK
	# 当たり判定はサーバが取る。ここは「殴った」という申告だけ。
	rpc_id(1, "_server_attack", global_position, _yaw)
	rpc("_remote_swing")


func _toggle_grab() -> void:
	if _held_trash != null:
		_held_trash = null
		return
	for area in _grab_area.get_overlapping_bodies():
		if area.is_in_group("trash"):
			_held_trash = area
			rpc_id(1, "_server_grab", area.get_path())
			return


# ------------------------------------------------------------ 他人の小人

func _remote_step(delta: float) -> void:
	# 20Hz で届く点を、60fps で滑らかにつなぐ。これだけでかなり見られる動きになる。
	global_position = global_position.lerp(_net_pos, clampf(delta * 14.0, 0.0, 1.0))
	_yaw = lerp_angle(_yaw, _net_yaw, clampf(delta * 12.0, 0.0, 1.0))


func _push_state(delta: float) -> void:
	_sync_accum += delta
	# 参加直後の 0.5 秒は送らない。相手側にまだ自分のノードが出来ていないため。
	if _age < 0.5 or _sync_accum < 1.0 / SYNC_HZ:
		return
	_sync_accum = 0.0
	rpc("_remote_state", global_position, _yaw, int(state))


@rpc("authority", "unreliable_ordered")
func _remote_state(pos: Vector3, yaw: float, st: int) -> void:
	_net_pos = pos
	_net_yaw = yaw
	state = st as State


@rpc("any_peer", "call_local", "unreliable")
func _remote_swing() -> void:
	# 見た目だけの振り。当たり判定とは無関係なので取りこぼしても実害なし。
	# 本物モデル(KobitoModel)でも手続きモデル(KobitoLook の Anim)でも、
	# attack() を持つ子に振りを頼む＝「攻撃した」が一目で分かる大振り＋斬撃。
	for child in _body.get_children():
		if child.has_method("attack"):
			child.attack()
	Sfx.play("swing")
	var tween := create_tween()
	tween.tween_property(_body, "scale", Vector3(1.15, 0.9, 1.15), 0.06)
	tween.tween_property(_body, "scale", Vector3.ONE, 0.14)


## 被弾の見た目：赤フラッシュ＋のけぞり。apply_damage(全員で実行)から呼ぶ。
func _play_hurt_fx() -> void:
	var anim := _body.get_node_or_null("Anim")
	if anim != null and anim.has_method("hurt"):
		anim.hurt()
	Sfx.play("hurt")
	# 当たり判定カプセルは透明なので、見た目の胴・頭を赤くフラッシュさせる。
	for part_name in ["Torso", "Head"]:
		var part := _body.get_node_or_null(part_name) as MeshInstance3D
		if part == null:
			continue
		var mat := part.material_override as StandardMaterial3D
		if mat == null:
			continue
		var from: Color = mat.albedo_color
		var tw := create_tween()
		tw.tween_property(mat, "albedo_color", Color(1.0, 0.32, 0.28), 0.05)
		tw.tween_property(mat, "albedo_color", from, 0.22)


func _update_look() -> void:
	rotation.y = _yaw
	if is_local:
		_follow_camera()
	var down := state == State.DOWN
	_body.transparency = 0.6 if down else 0.0


func _follow_camera() -> void:
	# 追従カメラ。バネで寄せるだけ。SpringArm3D を使わないのは、
	# スマホで壁にめり込む挙動を自分で調整したいときに分かりやすいから。
	var want := global_position + Vector3(0.0, 2.3, 5.6).rotated(Vector3.UP, _cam_rig.rotation.y)
	_cam_rig.global_position = _cam_rig.global_position.lerp(want, 0.14)
	_camera.look_at(global_position + Vector3.UP * 0.8, Vector3.UP)


func orbit_camera(amount: float) -> void:
	## 画面右側のドラッグでカメラを回す（TouchPad から呼ばれる）
	_cam_rig.rotation.y -= amount


# ------------------------------------------------------------ サーバ側の判定

@rpc("any_peer", "reliable")
func _server_attack(from: Vector3, yaw: float) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	var facing := Vector3(0.0, 0.0, -1.0).rotated(Vector3.UP, yaw)
	for bug in get_tree().get_nodes_in_group("bug"):
		var to_bug: Vector3 = bug.global_position - from
		to_bug.y = 0.0
		if to_bug.length() > ATTACK_RANGE:
			continue
		if facing.dot(to_bug.normalized()) < -0.1:   # ほぼ全周（真後ろだけ当たらない）＝当てやすく
			continue
		bug.cleanse(attack_power, name.to_int())


@rpc("any_peer", "reliable")
func _server_grab(trash_path: NodePath) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	var trash := get_node_or_null(trash_path)
	if trash != null and trash.has_method("grab_by"):
		trash.grab_by(global_position)


## サーバから呼ばれる：被弾
@rpc("authority", "call_local", "reliable")
func apply_damage(amount: int) -> void:
	if state == State.DOWN:
		return
	hp = maxi(0, hp - amount)
	_hurt_time = 0.35
	state = State.HURT if hp > 0 else State.DOWN
	_play_hurt_fx()
	stats_changed.emit()
	if hp == 0 and multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		get_tree().create_timer(4.0).timeout.connect(func() -> void:
			if is_instance_valid(self):
				rpc("revive"))


@rpc("authority", "call_local", "reliable")
func revive() -> void:
	hp = max_hp
	state = State.IDLE
	stats_changed.emit()


## サーバから呼ばれる：経験値
@rpc("authority", "call_local", "reliable")
func gain_xp(amount: int) -> void:
	xp += amount
	var leveled := false
	while xp >= xp_to_next():
		xp -= xp_to_next()
		level += 1
		max_hp += 8
		attack_power += 2
		hp = max_hp
		leveled = true
	if leveled:
		Sfx.play("levelup", -3.0)
	stats_changed.emit()


func xp_to_next() -> int:
	return 20 + (level - 1) * 15
