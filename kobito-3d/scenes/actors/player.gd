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
const HP_REGEN_DELAY := 2.5    # 最後に被弾してから この秒数で自然回復が始まる
const HP_REGEN_RATE := 7.0     # 1秒あたりの自然回復量
var _since_dmg := 999.0
var _invuln := 0.0        # 無敵時間（被弾直後・復活直後）＝連続でハメられない＝ストレス減
var revive_time := 2.5    # ダウン→復活までの秒数（家族が近いと短くなる）。HUDのカウント表示にも使う
var _last_ground := Vector3.ZERO   # 直近で地面に居た位置（場外落下からの復帰用）
var _shake := 0.0                  # カメラ微振動の強さ（被弾・攻撃で立ち、毎フレーム減衰）
var _regen_frac := 0.0
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
var _help_label: Label3D = null   # ダウン中の「たすけて！」
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
		# ★Webは超軽量ドールに★ 子ども・敵は簡易化済みなのにプレイヤーだけフルクレイ
		# (約90部品)で、Web描画の約4割を主役2体が食っていた。攻撃は _remote_swing の
		# スケールtweenフォールバックで成立するので見た目上も問題なし。きれい版(PC)はフル。
		if OS.has_feature("web"):
			KobitoLook.decorate_simple(_body, _base_color, "adult", style_name)
		else:
			KobitoLook.decorate(_body, _base_color, true, "adult", style_name)   # 親：武器を持つ
	_label.text = pname

	# ダウン中に頭上へ出す「たすけて！」ビーコン＝相方/なかまが近づくと復活が速まる
	# （＝協力の合図）。全員の画面で見える。
	_help_label = Label3D.new()
	_help_label.name = "HelpLabel"
	_help_label.text = "たすけて！"
	_help_label.font_size = 44
	_help_label.outline_size = 14
	_help_label.outline_modulate = Color(0.2, 0.05, 0.05)
	_help_label.modulate = Color(1.0, 0.85, 0.3)
	_help_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_help_label.no_depth_test = true
	_help_label.pixel_size = 0.006
	_help_label.position = Vector3(0.0, 1.6, 0.0)
	_help_label.visible = false
	add_child(_help_label)

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
	_invuln = maxf(0.0, _invuln - delta)   # 無敵時間を減らす（全員の画面で同じに）
	if is_local:
		_local_step(delta)
		_regen_hp(delta)
		_push_state(delta)
	else:
		_remote_step(delta)
	_update_look()


## HPは「しばらく攻撃を受けていないと じわっと自然回復」する（＝回復場所を探さなくていい）。
## さらに 敵を癒やすと自分も少し回復する（heal_hp）。＝“回復が分かりにくい”を解消。
func _regen_hp(delta: float) -> void:
	_since_dmg += delta
	if hp <= 0 or hp >= max_hp or state == State.DOWN or state == State.HURT:
		return
	if _since_dmg < HP_REGEN_DELAY:
		return
	_regen_frac += HP_REGEN_RATE * delta
	var add := int(_regen_frac)
	if add > 0:
		_regen_frac -= float(add)
		hp = mini(max_hp, hp + add)
		stats_changed.emit()


## このRPCが「サーバ発（またはローカルのcall_local）」かを確かめる。
## HP・XP・復活はサーバ権威。プレイヤーノードの権威は所有クライアントなので、
## @rpc("authority") だとサーバ→ゲスト宛が権限違反で落ちる（＝2人プレイでゲストが
## 被弾・XP・復活しない不具合の原因）。any_peer にして、ここで送信元を1(サーバ)/0(ローカル)に限定する。
func _from_server() -> bool:
	var sender := multiplayer.get_remote_sender_id()
	return sender == 0 or sender == 1


## 敵を癒やしたとき、サーバから呼ばれる：自分も少し回復（癒やす＝自分も癒やされる）。
@rpc("any_peer", "call_local", "reliable")
func heal_hp(amount: int) -> void:
	if not _from_server():
		return
	if hp <= 0:
		return
	hp = mini(max_hp, hp + amount)
	stats_changed.emit()


# ------------------------------------------------------------ 自分の小人

func _local_step(delta: float) -> void:
	_attack_cd = maxf(0.0, _attack_cd - delta)
	# ★場外落下の詰み防止★ 何かの拍子に世界の外へ落ちたら、最後に地面に居た場所へ戻す。
	if global_position.y < -8.0:
		global_position = _last_ground + Vector3(0.0, 1.0, 0.0)
		velocity = Vector3.ZERO
		state = State.IDLE
		return
	if is_on_floor():
		_last_ground = global_position   # 直近の安全地点を覚えておく
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

	# ゲームパッドの右スティックでカメラを回す（つないでいない時は 0＝無反応）。
	var look_x := Input.get_joy_axis(0, JOY_AXIS_RIGHT_X)
	if absf(look_x) > 0.2:
		orbit_camera(-look_x * 2.6 * delta)
	var look_y := Input.get_joy_axis(0, JOY_AXIS_RIGHT_Y)
	if absf(look_y) > 0.2:
		orbit_camera_pitch(look_y * 1.6 * delta)

	if Input.is_action_just_pressed("act_attack"):
		_try_attack()
	if Input.is_action_just_pressed("act_grab"):
		_do_clean()


func can_fly() -> bool:
	return WorldState.has_flight()


func _try_attack() -> void:
	if _attack_cd > 0.0:
		return
	_attack_cd = ATTACK_COOLDOWN
	if state != State.FLY:
		state = State.ATTACK
	# 当たり判定はサーバが取る。ここは「殴った」という申告だけ。
	# ソロ／ホスト（自分がサーバ）は自分宛RPCが禁止なので直接呼ぶ。参加者だけサーバへ送る。
	if multiplayer.is_server():
		_server_attack(global_position, _yaw)
	else:
		rpc_id(1, "_server_attack", global_position, _yaw)
	rpc("_remote_swing")


const CLEAN_RANGE := 2.6   # この距離内の いちばん近いゴミを「つかむ」で片づける

## 「つかむ」＝近くの光るゴミに近づいて押すと、その場で きれいに片づく（運ぶ必要なし）。
## ＝“どこへ運ぶの？”という迷いを無くす。当たり判定・実際の除去はサーバが行う。
func _do_clean() -> void:
	# ソロ／ホスト（自分がサーバ）は自分宛RPCが禁止なので直接呼ぶ。参加者だけサーバへ送る。
	if multiplayer.is_server():
		_server_clean_near(global_position)
	else:
		rpc_id(1, "_server_clean_near", global_position)


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
	_spawn_slash()   # モデル種別に依存しない斬撃＝Web簡易版でも「振った」が分かる
	shake(0.06)      # 振った手応え（ごく軽く）


## 前方に三日月の光の斬撃を一瞬。攻撃=金色。1メッシュ・unshaded＝どの機種でも軽く読める。
func _spawn_slash() -> void:
	var arc := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.9
	tm.outer_radius = 1.25
	arc.mesh = tm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.92, 0.5, 0.9)
	m.emission_enabled = true
	m.emission = Color(1.0, 0.88, 0.45)
	m.emission_energy_multiplier = 2.4
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	arc.material_override = m
	add_child(arc)
	# 体の前方(-Z)に、地面と平行の弧を寝かせて出す
	arc.position = -global_transform.basis.z * 1.1 + Vector3(0.0, 0.9, 0.0)
	arc.rotation = Vector3(deg_to_rad(90.0), rotation.y, 0.0)
	var tw := create_tween()
	tw.tween_property(arc, "scale", Vector3(1.6, 1.6, 1.6), 0.16)
	tw.parallel().tween_property(m, "albedo_color:a", 0.0, 0.16)
	tw.tween_callback(arc.queue_free)


## 被弾の見た目：赤フラッシュ＋のけぞり。apply_damage(全員で実行)から呼ぶ。
func _play_hurt_fx() -> void:
	shake(0.16)   # 被弾＝しっかりゆれる
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
	if _help_label != null:
		_help_label.visible = down
		if down:
			_help_label.position.y = 1.6 + 0.08 * sin(_age * 5.0)   # ふわふわ＝目を引く
	if down:
		_body.transparency = 0.6
	elif _invuln > 0.0:
		# 無敵の間は点滅＝「今は安全」が見て分かる
		_body.transparency = 0.3 + 0.3 * (0.5 + 0.5 * sin(_age * 28.0))
	else:
		_body.transparency = 0.0


const CAM_DIST := 6.05          # 既定オフセット(0,2.3,5.6)と同じ距離
var _cam_pitch := 0.39          # 見下ろし角(rad)。sin*D=2.3 / cos*D=5.6 と一致＝従来の見え方
const CAM_PITCH_MIN := 0.12     # ほぼ真後ろ（少し見上げ）
const CAM_PITCH_MAX := 1.0      # 見下ろし（俯瞰）

func _follow_camera() -> void:
	# 追従カメラ。バネで寄せるだけ。SpringArm3D を使わないのは、
	# スマホで壁にめり込む挙動を自分で調整したいときに分かりやすいから。
	# 距離一定の球面オフセット＝ヨー(左右)＋ピッチ(上下)で回せる。
	var off := Vector3(0.0, sin(_cam_pitch), cos(_cam_pitch)) * CAM_DIST
	off = off.rotated(Vector3.UP, _cam_rig.rotation.y)
	var want := global_position + off
	_cam_rig.global_position = _cam_rig.global_position.lerp(want, 0.14)
	# 被弾・浄化の手応え：ごく短いカメラ微振動（時間停止なし＝固まる不具合とは無縁）。
	if _shake > 0.001:
		_cam_rig.global_position += Vector3(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * _shake
		_shake = maxf(0.0, _shake - 0.02)
	_camera.look_at(global_position + Vector3.UP * 0.8, Vector3.UP)


## カメラを一瞬ゆらす（被弾・攻撃ヒットの手応え）。次のフレームから自然に減衰。
func shake(amount: float) -> void:
	_shake = maxf(_shake, amount)


func orbit_camera(amount: float) -> void:
	## 画面ドラッグでカメラを左右に回す（TouchPad から呼ばれる）
	_cam_rig.rotation.y -= amount


func orbit_camera_pitch(amount: float) -> void:
	## 縦ドラッグでカメラの見上げ／見下ろし（TouchPad から呼ばれる）
	_cam_pitch = clampf(_cam_pitch + amount, CAM_PITCH_MIN, CAM_PITCH_MAX)


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
func _server_clean_near(from: Vector3) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	var best: Node = null
	# ★carry の力を“本物”に★ 授かると 片づけの届く範囲が広がる（＝押す・運ぶが強い）。
	# 以前は付与されるだけで効果ゼロの死に報酬だった（物語の約束と機構の不一致を解消）。
	var bd := CLEAN_RANGE * (1.5 if WorldState.has_power("carry") else 1.0)
	for t in get_tree().get_nodes_in_group("trash"):
		var d: float = (t as Node3D).global_position.distance_to(from)
		if d < bd:
			bd = d
			best = t
	if best != null and best.has_method("mark_removed"):
		best.mark_removed()   # その場で片づく（poof＋音）。“外へ運ぶ”は不要に。


## サーバから呼ばれる：被弾
@rpc("any_peer", "call_local", "reliable")
func apply_damage(amount: int) -> void:
	if not _from_server():
		return
	if state == State.DOWN or _invuln > 0.0:
		return   # 無敵時間中は無効＝連続被弾でハメられない
	hp = maxi(0, hp - amount)
	_hurt_time = 0.35
	_since_dmg = 0.0   # 被弾したので自然回復のクールダウンをリセット
	_invuln = 0.7      # 被弾直後は少しだけ無敵（立て直す間）
	state = State.HURT if hp > 0 else State.DOWN
	_play_hurt_fx()
	stats_changed.emit()
	if hp == 0:
		# ★守る動機★ 家族・相方・なかまが近くに居ると 早く起き上がれる（母「手をはなさないで」）。
		# ひとりぼっちだと遅い＝“はぐれない”動機になる（罰ではなく協力の報酬）。
		revive_time = 1.5 if _help_near() else 3.5
		if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
			get_tree().create_timer(revive_time).timeout.connect(func() -> void:
				if is_instance_valid(self):
					rpc("revive"))


## 近くに 別のプレイヤー か なかま が居るか（ダウン時の復活速度に使う）。
## 家族(child/母)は常に追従して必ず近くに居るため“助け”に数えない＝
## ソロでも「なかまを増やす／相方とはぐれない」動機が実際に働く。
func _help_near() -> bool:
	for grp in ["player", "ally"]:
		for n in get_tree().get_nodes_in_group(grp):
			if n == self or not is_instance_valid(n):
				continue
			if (n as Node3D).global_position.distance_to(global_position) < 4.5:
				return true
	return false


@rpc("any_peer", "call_local", "reliable")
func revive() -> void:
	if not _from_server():
		return
	hp = max_hp
	state = State.IDLE
	_invuln = 2.5   # 復活直後はしっかり無敵＝起き上がりを一方的に殴られない
	stats_changed.emit()


## サーバから呼ばれる：経験値
@rpc("any_peer", "call_local", "reliable")
func gain_xp(amount: int) -> void:
	if not _from_server():
		return
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
