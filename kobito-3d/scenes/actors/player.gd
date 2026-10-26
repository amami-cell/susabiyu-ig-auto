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

const SPEED := 5.0
const ACCEL := 24.0

# 浄化のきらめき粒は全員で同一形状＝1本のリソースを共有（毎回作らない）。
static var _clean_mesh: SphereMesh
static func _shared_clean_mesh() -> SphereMesh:
	if _clean_mesh == null:
		_clean_mesh = SphereMesh.new()
		_clean_mesh.radius = 0.06
		_clean_mesh.height = 0.12
		_clean_mesh.radial_segments = 6
		_clean_mesh.rings = 4
	return _clean_mesh
const GRAVITY := 14.0
const JUMP_SPEED := 5.2
const COYOTE_TIME := 0.10       # 地面を離れた直後でも 少しの間ジャンプできる＝ふちで跳べず落ちる取りこぼしを減らす
const JUMP_BUFFER := 0.12       # 着地の直前に押したジャンプを 少し覚えておく＝着地ジャンプの取りこぼしを減らす
const FLY_LIFT := 7.5          # 飛行中の上昇速度（ぐんぐん上がる）
const FLY_CEILING := 16.0      # 上がりすぎ防止
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

# ダウン救済（理不尽よけ）：短時間に何度も倒れる＝苦戦。次の復活で しばらく手厚く守る。
# ＝“詰み”を作らず、下手でも前へ進める（罰ではなく やさしさ）。サーバ権威の判定に同期。
const MERCY_WINDOW := 12.0   # 前回ダウンからこの秒数以内に また倒れたら「苦戦」とみなす
const MERCY_INVULN := 4.5    # 苦戦時の復活後 無敵（通常2.5より長い）
const MERCY_TIME := 6.0      # 苦戦時の復活後 しばらく被ダメ半減
const MERCY_DR := 0.5        # その間の被ダメ倍率
var _since_down := 999.0     # 前回ダウンからの経過（苦戦判定用）
var _struggle := 0           # 短時間の連続ダウン数
var _mercy_t := 0.0          # >0＝被ダメ半減の加護中
var _last_ground := Vector3.ZERO   # 直近で地面に居た位置（場外落下からの復帰用）
var _shake := 0.0                  # カメラ微振動の強さ（被弾・攻撃で立ち、毎フレーム減衰）
var _fov_kick := 0.0               # 画角の“キュッ”（攻撃=寄る/被弾=引く）。0へ自然に戻る
var _base_fov := 0.0               # 平常時の画角（初回に取得）
var _cam_lead := Vector3.ZERO      # 進行方向へのカメラ先読み（なめらかに追従＝映画的な間）
var _cam_speed_fov := 0.0          # 速度で広がる画角（スピード感）。0へ自然に戻る
var _boss_cam_t := 0.0             # ボス出現の演出カメラ 残り秒（>0で注視点をボスへ寄せる）
var _boss_cam_pos := Vector3.ZERO  # そのとき見せるボスのワールド位置
var _regen_frac := 0.0
var level: int = 1
var xp: int = 0
var attack_power: int = 6

var is_local := false

var _yaw := 0.0
var _attack_cd := 0.0
var _atk_buffer := 0.0   # 直近のタップを少し覚えておく＝CD中の入力を取りこぼさない
var _hurt_time := 0.0
var _sync_accum := 0.0
var _age := 0.0
var _held_trash: Node3D = null
var _base_color := Color.WHITE   # 被弾フラッシュから戻す元の色
var _step_t := 0.0               # 足音の間隔タイマー
var _was_airborne := false       # 前フレーム空中だったか（着地/ジャンプ音の判定）
var _coyote := 0.0               # 地面を離れてからの猶予（コヨーテタイム）
var _jump_buffer := 0.0          # 着地前に押したジャンプの先行入力

# 他人の小人を滑らかに寄せるための目標値
var _net_pos := Vector3.ZERO
var _net_yaw := 0.0

@onready var _body: MeshInstance3D = $Body
var _wings: Node3D = null       # 飛行を映えさせる妖精の羽（背中・飛行中だけ）
var _wing_l: Node3D = null      # 左右の羽ピボット（ひらひら羽ばたき用）
var _wing_r: Node3D = null
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
			KobitoLook.decorate_simple(_body, _base_color, "adult", style_name, true)
		else:
			KobitoLook.decorate(_body, _base_color, true, "adult", style_name)   # 親：武器を持つ
	_build_wings()
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
	_since_down += delta
	_mercy_t = maxf(0.0, _mercy_t - delta)
	if is_local:
		_local_step(delta)
		_regen_hp(delta)
		_push_state(delta)
	else:
		_remote_step(delta)
	_update_look(delta)


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

	# コヨーテタイム＆ジャンプ先行入力＝ふち／着地ぎわの取りこぼしを減らす（操作の手ざわり）。
	if is_on_floor():
		_coyote = COYOTE_TIME
	else:
		_coyote = maxf(0.0, _coyote - delta)
	if Input.is_action_just_pressed("act_jump"):
		_jump_buffer = JUMP_BUFFER
	else:
		_jump_buffer = maxf(0.0, _jump_buffer - delta)

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
		# 地面 or 離れた直後(コヨーテ)に、押し続け or 直前バッファがあれば跳ぶ。
		if _coyote > 0.0 and velocity.y <= 0.1 and (wants_up or _jump_buffer > 0.0):
			velocity.y = JUMP_SPEED
			_coyote = 0.0
			_jump_buffer = 0.0

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
		_jump_stretch()                 # ぐーんと伸びる＝跳んだ手応え
	elif grounded and _was_airborne:
		Sfx.play("land", -12.0)         # 空中→着地
		_land_squash()                  # ぺしゃっと潰れて戻る＝着地の重み
		_spawn_ground_puff(1.0)         # 着地の土ぼこり＝ドスッと降りた手応え
	_was_airborne = not grounded

	# 飛行中のポーズ：ぐっと前傾（スーパーマン風）＋ゆらぎ。降りたら戻す。
	# ※攻撃中(ATTACK)は攻撃モーションが体の傾きを使うので触らない。
	var t := clampf(delta * 6.0, 0.0, 1.0)
	if state == State.FLY:
		# しっかり前傾＝“空を飛んでる”スーパーマン姿勢（直立に見えないよう大きく倒す）＋ゆらぎ。
		_body.rotation.x = lerp_angle(_body.rotation.x, deg_to_rad(-72.0), t)
		_body.rotation.z = lerp_angle(_body.rotation.z, sin(_age * 4.0) * deg_to_rad(9.0), t)
	elif state != State.ATTACK:
		_body.rotation.x = lerp_angle(_body.rotation.x, 0.0, t)
		_body.rotation.z = lerp_angle(_body.rotation.z, 0.0, t)
	# 妖精の羽：飛行中だけ出して ひらひら 羽ばたく。地上では隠す＝ふだんは素の見た目。
	if _wings != null:
		_wings.visible = state == State.FLY
		if state == State.FLY:
			var flap := sin(_age * 17.0) * deg_to_rad(26.0)   # 速い羽ばたき＝ひらひら
			if _wing_l != null:
				_wing_l.rotation.z = deg_to_rad(10.0) + flap
			if _wing_r != null:
				_wing_r.rotation.z = -deg_to_rad(10.0) - flap
			_wings.rotation.x = sin(_age * 5.0) * deg_to_rad(6.0)   # 全体もふわり
	if grounded and hspeed > 1.0 and state != State.FLY:
		_step_t -= delta
		if _step_t <= 0.0:
			_step_t = 0.34
			Sfx.play("step", -22.0)
			_spawn_ground_puff(0.32)    # 走ると小さく土ぼこり＝地面を蹴っている手触り
	else:
		_step_t = 0.0

	# ゲームパッドの右スティックでカメラを回す（つないでいない時は 0＝無反応）。
	var look_x := Input.get_joy_axis(0, JOY_AXIS_RIGHT_X)
	if absf(look_x) > 0.2:
		orbit_camera(-look_x * 2.6 * delta)
	var look_y := Input.get_joy_axis(0, JOY_AXIS_RIGHT_Y)
	if absf(look_y) > 0.2:
		orbit_camera_pitch(look_y * 1.6 * delta)

	# 「きれいに」は押しっぱなしで連続浄化＝子どもの連打でも指を離さず続けられる。
	# さらに直近のタップを 0.15秒 覚えて CD 明けに発火＝タップの取りこぼしをゼロに。
	_atk_buffer = maxf(0.0, _atk_buffer - delta)
	if Input.is_action_just_pressed("act_attack"):
		_atk_buffer = 0.15
	if _attack_cd <= 0.0 and (_atk_buffer > 0.0 or Input.is_action_pressed("act_attack")):
		_atk_buffer = 0.0
		_try_attack()
	if Input.is_action_just_pressed("act_grab"):
		_do_clean()
	if Input.is_action_just_pressed("act_whistle"):
		_do_whistle()


## 跳んだ瞬間：ぐーんと縦に伸びる（アンティシペーション→伸び）＝跳んだ手応え。
func _jump_stretch() -> void:
	var tw := create_tween()
	tw.tween_property(_body, "scale", Vector3(0.8, 1.28, 0.8), 0.09).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(_body, "scale", Vector3.ONE, 0.22).set_trans(Tween.TRANS_SINE)


## 着地：ぺしゃっと潰れて ぽよんと戻る＝着地の重み。
func _land_squash() -> void:
	var tw := create_tween()
	tw.tween_property(_body, "scale", Vector3(1.28, 0.7, 1.28), 0.07).set_ease(Tween.EASE_OUT)
	tw.tween_property(_body, "scale", Vector3.ONE, 0.24).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)


func can_fly() -> bool:
	return WorldState.has_flight()


## 今 飛行中か（KobitoAnim がスーパーマン姿勢に切り替えるのに使う）。
func is_flying() -> bool:
	return state == State.FLY


## 背中の妖精の羽（飛行を映えさせる・虫を癒やす本作テーマに合う透明の羽）。前＝-Z＝背中は+Z側。
func _build_wings() -> void:
	_wings = Node3D.new()
	_wings.name = "Wings"
	_wings.position = Vector3(0.0, 0.66, 0.12)   # 肩のうしろ
	_wings.visible = false                        # 飛行中だけ出す＝ふだんは絵本の雰囲気を保つ
	_body.add_child(_wings)
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color(0.72, 0.92, 1.0, 0.5)   # 透明な水色
	fm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	fm.cull_mode = BaseMaterial3D.CULL_DISABLED
	fm.emission_enabled = true
	fm.emission = Color(0.6, 0.9, 1.0)
	fm.emission_energy_multiplier = 0.35            # ほのかに光る
	for sx in [-1.0, 1.0]:
		var piv := Node3D.new()
		piv.position = Vector3(0.05 * sx, 0.0, 0.0)
		_wings.add_child(piv)
		_wing_blade(piv, fm, 0.26, Vector3(0.24 * sx, 0.05, -0.02), deg_to_rad(22.0) * sx)   # 上の羽（大）
		_wing_blade(piv, fm, 0.19, Vector3(0.2 * sx, -0.06, 0.14), deg_to_rad(30.0) * sx)    # 下の羽（小）
		if sx < 0.0:
			_wing_l = piv
		else:
			_wing_r = piv


func _wing_blade(parent: Node3D, mat: StandardMaterial3D, r: float, pos: Vector3, roll: float) -> void:
	var mi := MeshInstance3D.new()
	var m := SphereMesh.new()
	m.radius = r
	m.height = r * 2.0
	m.radial_segments = 10
	m.rings = 6
	mi.mesh = m
	mi.material_override = mat
	mi.position = pos
	mi.scale = Vector3(1.0, 0.12, 0.68)   # 平たい羽
	mi.rotation.z = roll
	parent.add_child(mi)


func _try_attack() -> void:
	if _attack_cd > 0.0:
		return
	_attack_cd = ATTACK_COOLDOWN
	# 狙い補正：ほぼ止まって振るとき、射程内の最寄りの虫へ向きを合わせる＝斬撃の光と当たりが
	# 一致して「狙って澄ませた」満足感。移動中は移動の向きを優先＝操作を邪魔しない。
	if Vector2(velocity.x, velocity.z).length() < 1.5:
		var tgt := _nearest_bug_in_reach()
		if tgt != null:
			var to: Vector3 = tgt.global_position - global_position
			if Vector2(to.x, to.z).length() > 0.05:
				_yaw = atan2(-to.x, -to.z)
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


## 笛：救った なかまを 自分の周りに呼び集める（“率いる”手触り）。合図の音とリングは全員に。
func _do_whistle() -> void:
	if multiplayer.is_server():
		_server_whistle(global_position)
	else:
		rpc_id(1, "_server_whistle", global_position)
	rpc("_remote_whistle_fx")   # 合図の音＋足元のリング（全員の画面で）


@rpc("any_peer", "reliable")
func _server_whistle(from: Vector3) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	for a in get_tree().get_nodes_in_group("ally"):
		if a.has_method("rally"):
			a.rally(from)


@rpc("any_peer", "call_local", "unreliable")
func _remote_whistle_fx() -> void:
	Sfx.play_at("whistle", global_position + Vector3(0, 0.7, 0), -5.0)
	_spawn_whistle_ring()


## 笛の合図：足元から やわらかい光の輪が ひろがって消える＝“呼んだ”のが見える。
func _spawn_whistle_ring() -> void:
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.5
	tm.outer_radius = 0.62
	tm.rings = 24
	tm.ring_segments = 8
	ring.mesh = tm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.92, 0.55, 0.9)
	m.emission_enabled = true
	m.emission = Color(1.0, 0.86, 0.5)
	m.emission_energy_multiplier = 1.2
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring.material_override = m
	add_child(ring)
	ring.rotation = Vector3(deg_to_rad(90.0), 0.0, 0.0)
	ring.position = Vector3(0.0, 0.2, 0.0)
	ring.scale = Vector3(0.4, 0.4, 0.4)
	var tw := create_tween()
	tw.tween_property(ring, "scale", Vector3(6.0, 6.0, 6.0), 0.6).set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(m, "albedo_color:a", 0.0, 0.6)
	tw.tween_callback(ring.queue_free)


## 足元の土ぼこり／花粉パフ。着地で大・走行で小。地面に残す（足元に貼り付かない）＝
## 既にある足音・着地音の“見た目の裏打ち”。汚れ時＝土色、回復で＝あたたかな花粉色。純見た目・自分だけ。
func _spawn_ground_puff(strength: float) -> void:
	if not is_local:
		return
	var world := get_parent()
	if world == null:
		return
	var soft := UIKit.reduce_fx()
	var puff := MeshInstance3D.new()
	var pm := PlaneMesh.new()      # XZ平面・法線+Y＝地面に寝た円盤として使う
	pm.size = Vector2(1.0, 1.0)
	puff.mesh = pm
	var r := clampf(WorldState.recovery, 0.0, 1.0)
	var col := Color(0.62, 0.54, 0.40, 0.5).lerp(Color(0.86, 0.92, 0.55, 0.55), r)  # 土→花粉
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	puff.material_override = m
	world.add_child(puff)
	puff.global_position = global_position + Vector3(0.0, 0.05, 0.0)
	var s0 := (0.5 + 0.4 * strength) * (0.7 if soft else 1.0)
	var s1 := s0 * (2.6 + 0.8 * strength)
	puff.scale = Vector3(s0, 1.0, s0)
	var dur := 0.45 + 0.1 * strength
	var tw := create_tween()
	tw.tween_property(puff, "scale", Vector3(s1, 1.0, s1), dur).set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(puff, "global_position:y", global_position.y + 0.2, dur)   # ふわっと舞い上がる
	tw.parallel().tween_property(m, "albedo_color:a", 0.0, dur)
	tw.tween_callback(puff.queue_free)


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
	# 体：ためて→ぐっと横に振り抜く（ひねり）＋踏み込みのつぶれ＝“ちゃんと振った”アクション。
	# _body は見た目だけ（向きは親が持つ）なので、ここを回しても操作の向きは狂わない。
	# 背後カメラでもハッキリ分かるよう、体の“振り”を大きく：ためて→前へ踏み込み＋横ひねり。
	var sw := create_tween()
	sw.tween_property(_body, "rotation:y", deg_to_rad(42.0), 0.06).set_trans(Tween.TRANS_SINE)   # ため（逆へ）
	sw.tween_property(_body, "rotation:y", deg_to_rad(-58.0), 0.07).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)  # 振り抜き
	sw.tween_property(_body, "rotation:y", 0.0, 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var lean := create_tween()   # 前へのめり込む（ピッチ）＝踏み込みが見える
	lean.tween_property(_body, "rotation:x", deg_to_rad(-8.0), 0.06)
	lean.tween_property(_body, "rotation:x", deg_to_rad(20.0), 0.07)
	lean.tween_property(_body, "rotation:x", 0.0, 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var sq := create_tween()
	sq.tween_property(_body, "scale", Vector3(0.9, 1.14, 0.9), 0.06)
	sq.tween_property(_body, "scale", Vector3(1.2, 0.82, 1.2), 0.07)
	sq.tween_property(_body, "scale", Vector3.ONE, 0.2).set_trans(Tween.TRANS_BACK)
	_spawn_slash()          # 浄化のひとはらい（光の輪＋きらめき）
	_spawn_clean_sparkles()
	# 手応えは“当たったか”で変える：空振りは軽く、虫に届いた振りはしっかり。
	# ＝クライアント側の見た目予測（判定はサーバが正）。当てた実感が段違いになる。
	var connected := is_local and _target_in_reach()
	shake(0.12 if connected else 0.06)
	fov_kick(-5.5 if connected else -2.5)   # 届いた＝ぐっと寄る／空振り＝控えめ
	if connected:
		Input.vibrate_handheld(28)   # 触覚：当たった手応え（未対応端末では無害に無視）


## 浄化のひとはらい：前方に“澄んだ光の輪”がパッと広がって消える。攻撃＝倒すではなく
## 「きれいにする」ので、白緑〜金の加算光で“汚れが払われる”手応えに。1メッシュ＝軽い。
func _spawn_slash() -> void:
	var arc := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.55
	tm.outer_radius = 1.15
	tm.rings = 20
	tm.ring_segments = 8
	arc.mesh = tm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.85, 1.0, 0.75, 0.95)
	m.emission_enabled = true
	m.emission = Color(0.6, 0.95, 0.55)
	m.emission_energy_multiplier = 1.4   # 画面全体を焼かない控えめな光
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	arc.material_override = m
	add_child(arc)
	# 体の前方(-Z)に、地面と平行の輪を寝かせて出す
	arc.position = -global_transform.basis.z * 1.0 + Vector3(0.0, 0.85, 0.0)
	arc.rotation = Vector3(deg_to_rad(90.0), rotation.y, 0.0)
	arc.scale = Vector3(0.5, 0.5, 0.5)
	var tw := create_tween()
	tw.tween_property(arc, "scale", Vector3(1.9, 1.9, 1.9), 0.2).set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(m, "albedo_color:a", 0.0, 0.2)
	tw.tween_callback(arc.queue_free)


## 浄化のきらめき：前方へ小さな光の粒がパッと散って上がって消える＝“きれいにした”爽快感。
func _spawn_clean_sparkles() -> void:
	var fwd := -global_transform.basis.z
	var right := global_transform.basis.x
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.95, 1.0, 0.8)
	mat.emission_enabled = true
	mat.emission = Color(0.8, 1.0, 0.65)
	mat.emission_energy_multiplier = 1.6
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var count := 3 if OS.has_feature("web") else 6   # web は粒を半分に（描画予算）
	for i in count:
		var s := MeshInstance3D.new()
		s.mesh = _shared_clean_mesh()
		s.material_override = mat
		add_child(s)
		var base := fwd * 0.9 + Vector3(0.0, 0.8, 0.0)
		s.position = base
		var spread := right * randf_range(-0.7, 0.7) + fwd * randf_range(0.0, 0.6)
		var up := Vector3(0.0, randf_range(0.5, 1.0), 0.0)
		var tw := create_tween()
		tw.tween_property(s, "position", base + spread + up, 0.28).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(s, "scale", Vector3.ZERO, 0.28)
		tw.tween_callback(s.queue_free)


## 被弾の見た目：赤フラッシュ＋のけぞり。apply_damage(全員で実行)から呼ぶ。
func _play_hurt_fx() -> void:
	shake(0.16)   # 被弾＝しっかりゆれる
	fov_kick(7.0)   # ぐっと“引く”＝突き放される衝撃（攻撃の“寄り”と逆向き）
	if is_local:
		Input.vibrate_handheld(45)   # 触覚：くらった（自分の小人だけ）
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


func _update_look(delta := 0.0) -> void:
	rotation.y = _yaw
	if is_local:
		_follow_camera(delta)
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

func _follow_camera(delta := 0.0) -> void:
	# 追従カメラ。バネで寄せるだけ。SpringArm3D を使わないのは、
	# スマホで壁にめり込む挙動を自分で調整したいときに分かりやすいから。
	# 距離一定の球面オフセット＝ヨー(左右)＋ピッチ(上下)で回せる。
	var off := Vector3(0.0, sin(_cam_pitch), cos(_cam_pitch)) * CAM_DIST
	off = off.rotated(Vector3.UP, _cam_rig.rotation.y)
	# 進行方向へカメラをわずかに“先読み”＝行く先が見え、止まった絵より映画的に動く。
	# 生の速度でなく なめらかに追う（急な向き変えでカメラが暴れない）。ひかえめ時は控えめに。
	var soft := UIKit.reduce_fx()
	var vel_h := Vector3(velocity.x, 0.0, velocity.z)
	var lead_scale := 0.10 if soft else 0.20
	var lead_target := vel_h.limit_length(SPEED) * lead_scale
	_cam_lead = _cam_lead.lerp(lead_target, clampf(delta * 3.5, 0.0, 1.0))
	var want := global_position + off + _cam_lead
	_cam_rig.global_position = _cam_rig.global_position.lerp(want, 0.14)
	# 被弾・浄化の手応え：ごく短いカメラ微振動（時間停止なし＝固まる不具合とは無縁）。
	if _shake > 0.001:
		_cam_rig.global_position += Vector3(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * _shake
		_shake = maxf(0.0, _shake - 0.02)
	# 注視点も少し先読み側へ寄せる＝「行く先を見ている」意図的なフレーミング。
	# 静止時はごく淡い上下の“呼吸”＝止め絵にならず画面が生きる（ひかえめ時は止める）。
	var look_at_pt := global_position + Vector3.UP * 0.8 + _cam_lead * 0.6
	if not soft:
		look_at_pt.y += sin(_age * 1.4) * 0.03
	# ボス出現の演出：数秒だけ 注視点をボスへ寄せる＝“来た！”を映画的に見せる。
	# 山なりに強→弱（sin）で入って戻る。ひかえめ時は寄せを弱める（乗り物酔い配慮）。
	if _boss_cam_t > 0.0:
		_boss_cam_t = maxf(0.0, _boss_cam_t - delta)
		var e := sin(clampf(_boss_cam_t / 1.3, 0.0, 1.0) * PI)
		var bias := (0.18 if soft else 0.42) * e
		look_at_pt = look_at_pt.lerp(_boss_cam_pos + Vector3.UP * 0.8, bias)
	_camera.look_at(look_at_pt, Vector3.UP)
	# 画角の“キュッ”：攻撃で少し寄り、被弾で少し引く。0へなめらかに戻る＝一撃ごとに奥行きの手応え。
	if _base_fov <= 0.0:
		_base_fov = _camera.fov
	# 速度でほんのり広角＝スピード感（走ると世界が少し広がる）。ひかえめ時は無効。
	var spd_target := 0.0 if soft else clampf(vel_h.length() / SPEED, 0.0, 1.0) * 2.2
	_cam_speed_fov = lerp(_cam_speed_fov, spd_target, clampf(delta * 4.0, 0.0, 1.0))
	_camera.fov = _base_fov + _fov_kick + _cam_speed_fov
	if absf(_fov_kick) > 0.01:
		_fov_kick = move_toward(_fov_kick, 0.0, delta * 45.0)   # physics tick 固定＝機種によらず一定
	else:
		_fov_kick = 0.0


## 攻撃が“届く範囲”に虫が居るか（見た目の手応えを変えるためのクライアント側予測。判定はサーバが正）。
func _target_in_reach() -> bool:
	var reach := ATTACK_RANGE * 1.15
	for b in get_tree().get_nodes_in_group("bug"):
		if global_position.distance_to(b.global_position) <= reach:
			return true
	return false


## 射程内でいちばん近い虫（狙い補正用）。居なければ null。
func _nearest_bug_in_reach() -> Node3D:
	var reach := ATTACK_RANGE * 1.15
	var best: Node3D = null
	var bd := reach
	for b in get_tree().get_nodes_in_group("bug"):
		var d: float = global_position.distance_to(b.global_position)
		if d <= bd:
			bd = d
			best = b as Node3D
	return best


## カメラを一瞬ゆらす（被弾・攻撃ヒットの手応え）。次のフレームから自然に減衰。
func shake(amount: float) -> void:
	if UIKit.reduce_fx():
		amount *= 0.2   # えんしゅつ ひかえめ：ゆれを大きく抑える（光/揺れ過敏へ）
	_shake = maxf(_shake, amount)


## 画角を一瞬だけ動かす（マイナス=寄る/プラス=引く）。奥行きの手応え。0へ自然に戻る。
func fov_kick(amount: float) -> void:
	if UIKit.reduce_fx():
		amount *= 0.3
	_fov_kick = clampf(_fov_kick + amount, -8.0, 10.0)


## 浄化が成功した“やった！”の間：近くで虫が澄んだ瞬間、ふわっと寄って戻る小さなごほうび。
## strength=大きいほど寄りと揺れが強い（ボス浄化などの山場で大きく）。
func reward_pulse(strength: float = 1.0) -> void:
	fov_kick(-3.0 * strength)
	shake(0.05 * strength)
	if strength >= 2.0:
		Input.vibrate_handheld(60)   # 触覚：ボス浄化など山場の“やった！”


## ボス出現の映画的カメラ：数秒だけ注視点をボスへ寄せ、画角を引いて“大きさ”を見せ、
## 低い地鳴りのランブル。カメラ操作は奪わない（注視点の寄せのみ）＝酔いにくい。ひかえめ時は控えめ。
func boss_entrance(boss_pos: Vector3) -> void:
	if not is_local:
		return
	_boss_cam_pos = boss_pos
	_boss_cam_t = 1.3
	fov_kick(6.0)                    # ＋＝引く＝ボスの大きさを見せる
	shake(0.05)                      # 地鳴りのような ひと揺れ
	if not UIKit.reduce_fx():
		Input.vibrate_handheld(90)   # 触覚：ボス登場の“来た！”


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
	# おそうじリレー：近くの“おおきな汚れ”を「きれいに」でみがく（押さえてる間だけ効く）。
	for blob in get_tree().get_nodes_in_group("scrub_blob"):
		var to_blob: Vector3 = (blob as Node3D).global_position - from
		to_blob.y = 0.0
		if to_blob.length() <= ATTACK_RANGE + 0.6 and blob.has_method("scrub"):
			blob.scrub(name.to_int())
	# きれいの輪：近くの汚れの点を「きれいに」で澄ませる（時間で汚れ直す＝段取りの謎解き）。
	for ring in get_tree().get_nodes_in_group("cleanable_ring"):
		if ring.has_method("cleanse_near"):
			ring.cleanse_near(from, name.to_int())


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
	# おそうじリレー：近くの“おおきな汚れ”を「つかむ」で押さえる（数秒だけ みがける）。
	var pin_range := CLEAN_RANGE * (1.5 if WorldState.has_power("carry") else 1.0) + 0.8
	for blob in get_tree().get_nodes_in_group("scrub_blob"):
		if (blob as Node3D).global_position.distance_to(from) <= pin_range and blob.has_method("pin"):
			blob.pin(name.to_int())
	# 中ボス：「つかむ」で怯ませる＝暴れを止めて 味方の「きれいに」を通す（役割分担のキモ）。
	for b in get_tree().get_nodes_in_group("bug"):
		var st: Variant = b.get("stats")
		if st != null and st.is_midboss and b.has_method("stagger"):
			if (b as Node3D).global_position.distance_to(from) <= pin_range + 1.2:
				b.stagger(name.to_int())


## サーバから呼ばれる：被弾
@rpc("any_peer", "call_local", "reliable")
func apply_damage(amount: int) -> void:
	if not _from_server():
		return
	if state == State.DOWN or _invuln > 0.0:
		return   # 無敵時間中は無効＝連続被弾でハメられない
	if _mercy_t > 0.0:
		amount = maxi(1, int(round(amount * MERCY_DR)))   # 加護中は被ダメ半減＝立て直しやすい
	hp = maxi(0, hp - amount)
	_hurt_time = 0.35
	_since_dmg = 0.0   # 被弾したので自然回復のクールダウンをリセット
	_invuln = 0.7      # 被弾直後は少しだけ無敵（立て直す間）
	state = State.HURT if hp > 0 else State.DOWN
	_play_hurt_fx()
	stats_changed.emit()
	if hp == 0:
		# 短時間に何度も倒れている＝苦戦とみなして数える（次の復活で手厚く守る）。
		_struggle = (_struggle + 1) if _since_down < MERCY_WINDOW else 1
		_since_down = 0.0
		# ★守る動機★ 家族・相方・なかまが近くに居ると 早く起き上がれる（母「手をはなさないで」）。
		# ひとりぼっちだと遅い＝“はぐれない”動機になる（罰ではなく協力の報酬）。
		# 家族/なかまが近い＝早い(1.5)。ひとりでも 2.5秒に短縮（赤い“死に時間”を減らす＝
		# 幼い子に罰と感じさせない・低ストレス方針）。“はぐれない”動機は 1.5 との差で保つ。
		revive_time = 1.5 if _help_near() else 2.5
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
	# 苦戦（短時間に2回以上ダウン）していたら、復活後しばらく手厚く守る＝“詰み”防止。
	if _struggle >= 2:
		_invuln = MERCY_INVULN
		_mercy_t = MERCY_TIME
	else:
		_invuln = 2.5   # 通常：起き上がりを一方的に殴られない程度
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
		if is_local:
			fov_kick(-5.0)   # レベルアップの“やった！”＝画角がキュッと寄る達成の間
			shake(0.06)
	stats_changed.emit()


func xp_to_next() -> int:
	return 20 + (level - 1) * 15
