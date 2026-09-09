extends CharacterBody3D
class_name Ally
## なかま虫：浄化された虫が仲間になった姿。
##
## プレイヤーについてきて、近くの“暴れ虫”を見つけると寄っていって 一緒に癒やす。
## テーマ「敵は悪者じゃない。救えば仲間になる」を、遊びで見せるための存在。
##
## 中身はサーバだけが動かし、クライアントは 10Hz で届く位置へ寄せるだけ（bug と同じ設計）。
## HP は持たない（仲間は倒れない）。当たり判定は地面だけ＝誰ともぶつからずすり抜ける。

const SYNC_HZ := 10.0
const GRAVITY := 14.0
const SPEED := 3.6
const FOLLOW_DIST := 2.8      # これ以上プレイヤーから離れたら追う
const HELP_RANGE := 10.0      # この距離内の暴れ虫を手伝いに行く
const HELP_REACH := 1.7       # ここまで近づいたら癒やしのパルスを出す
const HELP_INTERVAL := 1.0
const HELP_AMOUNT := 4

var owner_id: int = 1
var tint: Color = Color(0.6, 1.0, 0.72)
var species := ""              # 癒やした虫の種類id（例 "beetle"）。空なら仕掛け由来の汎用なかま。

# 種ごとの役割（＝集めた種がゲーム内で活きる）。
#   飛ぶ種  … 空の暴れ虫にも 届く（地上のなかまは 届かない）＝飛ぶ敵対策の切り札
#   甲羅種  … じょうぶ。癒やしの力が強く、少し広く届く
var _role_fly := false
var _role_shell := false
var _heal_amt := HELP_AMOUNT
var _reach := HELP_REACH

var _sync_accum := 0.0
var _net_pos := Vector3.ZERO
var _help_cd := 0.0
var _bob := 0.0
var _body: Node3D = null


func _ready() -> void:
	add_to_group("ally")
	var col := CollisionShape3D.new()
	var sh := SphereShape3D.new()
	sh.radius = 0.32
	col.shape = sh
	col.position.y = 0.4
	add_child(col)
	collision_layer = 0    # 誰も“なかま”にはぶつからない（すり抜けOK・見た目重視）
	collision_mask = 1     # 地面(world=layer1)にだけ乗る
	_build_look()
	_net_pos = global_position
	set_physics_process(true)


func _build_look() -> void:
	_body = Node3D.new()
	add_child(_body)
	# 明るい発光オーブの体
	var orb := MeshInstance3D.new()
	var m := SphereMesh.new()
	m.radius = 0.3
	m.height = 0.6
	m.radial_segments = 10
	m.rings = 6
	orb.mesh = m
	var mat := StandardMaterial3D.new()
	mat.albedo_color = tint
	mat.emission_enabled = true
	mat.emission = tint
	mat.emission_energy_multiplier = 0.7
	mat.rim_enabled = true
	mat.rim = 0.8
	orb.material_override = mat
	_body.add_child(orb)
	# 目（つやのある黒＋白ハイライト＝“うれしそうに生きてる”眼）
	var emat := StandardMaterial3D.new()
	emat.albedo_color = Color(0.1, 0.09, 0.11)
	emat.roughness = 0.15
	emat.metallic_specular = 0.7
	emat.clearcoat_enabled = true
	emat.clearcoat = 0.9
	var catmat := StandardMaterial3D.new()
	catmat.albedo_color = Color(1, 1, 1)
	catmat.emission_enabled = true
	catmat.emission = Color(1, 1, 1)
	catmat.emission_energy_multiplier = 1.2
	catmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	for sx in [-0.12, 0.12]:
		var e := MeshInstance3D.new()
		var em := SphereMesh.new()
		em.radius = 0.07
		em.height = 0.14
		em.radial_segments = 8
		em.rings = 5
		e.mesh = em
		e.material_override = emat
		e.position = Vector3(sx, 0.06, -0.26)
		_body.add_child(e)
		var cat := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = 0.028
		cm.height = 0.056
		cm.radial_segments = 5
		cm.rings = 3
		cat.mesh = cm
		cat.material_override = catmat
		cat.position = Vector3(sx - 0.02, 0.1, -0.31)
		_body.add_child(cat)
	# ちいさな笑顔
	var mmat := StandardMaterial3D.new()
	mmat.albedo_color = Color(0.32, 0.16, 0.18)
	var mouth := MeshInstance3D.new()
	var mmesh := SphereMesh.new()
	mmesh.radius = 0.05
	mmesh.height = 0.1
	mmesh.radial_segments = 6
	mmesh.rings = 3
	mouth.mesh = mmesh
	mouth.material_override = mmat
	mouth.position = Vector3(0.0, -0.06, -0.28)
	mouth.scale = Vector3(1.5, 0.5, 0.5)
	_body.add_child(mouth)
	# 半透明の羽。飛ぶ種のなかまは 大きくはっきり（＝空の敵に届く子だと見分けられる）。
	var wmat := StandardMaterial3D.new()
	wmat.albedo_color = Color(1, 1, 1, 0.65)
	wmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	wmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var wing_s := 1.5 if _role_fly else 0.85
	for sx in [-0.3, 0.3]:
		var w := MeshInstance3D.new()
		var wm := SphereMesh.new()
		wm.radius = 0.16
		wm.height = 0.32
		wm.radial_segments = 6
		wm.rings = 4
		w.mesh = wm
		w.material_override = wmat
		w.position = Vector3(sx * wing_s, 0.12, 0.06)
		w.scale = Vector3(0.5 * wing_s, 1.0 * wing_s, 0.2)
		_body.add_child(w)

	# 甲羅の種のなかまは 背中に つやのあるドーム（＝じょうぶな子だと見分けられる）。
	if _role_shell:
		var shell := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.26
		sm.height = 0.52
		sm.radial_segments = 10
		sm.rings = 6
		shell.mesh = sm
		var smat := StandardMaterial3D.new()
		smat.albedo_color = tint.darkened(0.28)
		smat.roughness = 0.35
		smat.metallic_specular = 0.6
		smat.clearcoat_enabled = true
		smat.clearcoat = 0.7
		shell.material_override = smat
		shell.position = Vector3(0.0, 0.16, 0.08)
		shell.scale = Vector3(1.05, 0.7, 1.15)
		_body.add_child(shell)


## _ready() より前に呼ばれる（garden が add_child する直前）＝見た目づくりに間に合う。
func setup(o_id: int, col: Color, sp: String = "") -> void:
	owner_id = o_id
	tint = col
	species = sp
	_heal_amt = HELP_AMOUNT
	_reach = HELP_REACH
	if sp != "":
		var path := "res://data/%s.tres" % sp
		if ResourceLoader.exists(path):
			var st: Variant = load(path)
			if st != null:
				_role_fly = bool(st.flies)
				_role_shell = bool(st.shell)
	if _role_shell:
		_heal_amt = 6      # 甲羅のなかま＝じょうぶ。癒やしの力が強い
		_reach = 2.1


func _physics_process(delta: float) -> void:
	# ふわふわ上下（見た目・全員の画面で）
	_bob += delta * 4.0
	if _body != null:
		_body.position.y = 0.45 + sin(_bob) * 0.06
	if not multiplayer.has_multiplayer_peer():
		return
	if multiplayer.is_server():
		_think(delta)
		_sync_accum += delta
		if _sync_accum >= 1.0 / SYNC_HZ:
			_sync_accum = 0.0
			rpc("_remote_state", global_position)
	else:
		global_position = global_position.lerp(_net_pos, clampf(delta * 10.0, 0.0, 1.0))


func _think(delta: float) -> void:
	_help_cd = maxf(0.0, _help_cd - delta)

	var goto := Vector3.ZERO
	var has_goto := false
	var helping_bug := false
	var bug_y := 0.0

	# ⓪ 中ボスがいれば“押さえ役”に回る＝癒やしはプレイヤー主体（見せ場を残す）。
	# ソロでも「押さえる人」ができるので、ひとりでも中ボスを癒やしきれる。
	var boss := _nearest_midboss()
	if boss != null:
		var dbo: Vector3 = boss.global_position - global_position
		dbo.y = 0.0
		if dbo.length() <= HELP_RANGE:
			has_goto = true
			goto = boss.global_position
			if _role_fly:
				helping_bug = true
				bug_y = boss.global_position.y
			if dbo.length() < _reach + 0.8 and _help_cd <= 0.0:
				_help_cd = HELP_INTERVAL
				if boss.has_method("stagger"):
					boss.stagger(owner_id)   # 押さえる＝暴れを止め、プレイヤーの「きれいに」を通す

	# ① 近くに暴れ虫がいれば、手伝いに行く（中ボスに向かっていない時だけ）
	var bug := _nearest_bug() if not has_goto else null
	if bug != null:
		var db: Vector3 = bug.global_position - global_position
		db.y = 0.0
		if db.length() <= HELP_RANGE:
			has_goto = true
			helping_bug = true
			bug_y = bug.global_position.y
			goto = bug.global_position
			if db.length() < _reach and _help_cd <= 0.0:
				_help_cd = HELP_INTERVAL
				if bug.has_method("cleanse"):
					bug.cleanse(_heal_amt, owner_id)   # 一緒に癒やす（手柄はプレイヤーへ）

	# ② いなければ、プレイヤーについていく
	if not has_goto:
		var p := _nearest_player()
		if p != null:
			var dp: Vector3 = p.global_position - global_position
			dp.y = 0.0
			if dp.length() > FOLLOW_DIST:
				has_goto = true
				goto = p.global_position

	# 上下：飛ぶ種は 宙に浮いて 空の暴れ虫にも届く。地上の種は 重力で地面を歩く。
	if _role_fly:
		var want_y := (bug_y + 0.2) if helping_bug else 1.3
		velocity.y = clampf((want_y - global_position.y) * 3.0, -5.0, 5.0)
	else:
		velocity.y -= GRAVITY * delta
		if is_on_floor():
			velocity.y = -0.1

	if has_goto:
		var dir: Vector3 = goto - global_position
		dir.y = 0.0
		dir = dir.normalized()
		velocity.x = dir.x * SPEED
		velocity.z = dir.z * SPEED
		if _body != null:
			var yaw := atan2(-dir.x, -dir.z)
			_body.rotation.y = lerp_angle(_body.rotation.y, yaw, clampf(delta * 10.0, 0.0, 1.0))
	else:
		velocity.x = move_toward(velocity.x, 0.0, 10.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 10.0 * delta)

	move_and_slide()


func _nearest_bug() -> Node3D:
	var best: Node3D = null
	var bd := 1.0e9
	for b in get_tree().get_nodes_in_group("bug"):
		# 中ボスは手伝わない＝ボスの見せ場はプレイヤー主体で（なかま6体で勝手に浄化されない）。
		var st: Variant = b.get("stats")
		if st != null and st.is_midboss:
			continue
		# 空を飛ぶ暴れ虫は、飛べるなかま だけが手伝える（地上の子は届かない）＝飛ぶ種を集める意味。
		if st != null and st.flies and not _role_fly:
			continue
		var dd: float = b.global_position.distance_to(global_position)
		if dd < bd:
			bd = dd
			best = b
	return best


## いちばん近い中ボス（＝押さえに行く相手）。癒やしはしない＝見せ場はプレイヤー主体。
func _nearest_midboss() -> Node3D:
	var best: Node3D = null
	var bd := 1.0e9
	for b in get_tree().get_nodes_in_group("bug"):
		var st: Variant = b.get("stats")
		if st == null or not st.is_midboss:
			continue
		var dd: float = b.global_position.distance_to(global_position)
		if dd < bd:
			bd = dd
			best = b
	return best


func _nearest_player() -> Node3D:
	var best: Node3D = null
	var bd := 1.0e9
	for p in get_tree().get_nodes_in_group("player"):
		var dd: float = p.global_position.distance_to(global_position)
		if dd < bd:
			bd = dd
			best = p
	return best


@rpc("authority", "unreliable_ordered")
func _remote_state(pos: Vector3) -> void:
	_net_pos = pos
