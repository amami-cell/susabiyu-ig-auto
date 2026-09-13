extends Node3D
class_name CleanRing
## きれいの輪：輪に並んだ汚れを“ぜんぶ同時に”きれいに保つ謎解き。
##
## テーマ「倒さない・きれいにする」を“段取りの謎解き”にした仕掛け（専門家おすすめ #2）。
## - 汚れは「きれいに」で澄むが、少し経つと また汚れ直す（再汚染）。
## - だから 1つずつ片づけても間に合わない＝「どの順で・どう手分けするか」を考える。
## - ソロ：先に癒やした なかまが そばの汚れを押さえ続けてくれる（＝もう一人の手）。
##   なかまに何ヶ所か任せ、残りを自分で回れば必ず解ける。
## - 2人：輪を左右で手分けして同時に澄ませる＝役割分担がそのまま解法。
##
## サーバ権威（正は1台）。各点の澄みぐあいはサーバが決め、10Hzで配信。素材ゼロ・低ポリ。

const SPOTS := 3             # 輪に並ぶ汚れの数
const RADIUS := 2.6          # 輪の半径（点の間隔＝走って回れる距離）
const KEEP_FRESH := 4.0      # きれいにした後、澄んだまま保てる猶予（この間は汚れ直さない）
const DECAY := 0.5           # 猶予を過ぎたら 1秒あたり これだけ汚れ直す（再汚染）
const SOLVE_THRESH := 0.9    # 全点がこれ以上澄めば解けた
const REACH := 2.2           # プレイヤーが「きれいに」で届く距離
const ALLY_HOLD := 2.2       # なかまが近くにいれば その点を押さえ続ける距離
const REWARD := 0.16         # 解けた時に戻る みどり(recovery)

var solved := false
var _clean := PackedFloat32Array()   # 各点 0→1 の澄みぐあい
var _fresh := PackedFloat32Array()   # >0 の間は汚れ直さない（きれいにした直後の猶予）
var _spots: Array[MeshInstance3D] = []
var _ring: MeshInstance3D = null
var _ring_mat: StandardMaterial3D = null
var _sync_accum := 0.0
var _age := 0.0
var _dirty := Color(0.3, 0.27, 0.2)


func _ready() -> void:
	add_to_group("solvable")        # 章の進行が solved を見にくる（任意の寄り道パズル）
	add_to_group("cleanable_ring")  # プレイヤーの「きれいに」がここへ届く
	_clean.resize(SPOTS)
	_fresh.resize(SPOTS)
	_build()
	set_process(true)


func _is_server() -> bool:
	return multiplayer.has_multiplayer_peer() and multiplayer.is_server()


func spot_pos(i: int) -> Vector3:
	var a := TAU * float(i) / float(SPOTS) - PI * 0.5
	return Vector3(cos(a) * RADIUS, 0.0, sin(a) * RADIUS)


func _build() -> void:
	for i in SPOTS:
		var spot := Node3D.new()
		spot.name = "Spot%d" % i
		spot.position = spot_pos(i)
		add_child(spot)
		# 汚れの小山（低ポリ球を2つ）
		var mound := _sphere(0.4, _dirty)
		mound.position = Vector3(0.0, 0.3, 0.0)
		mound.scale = Vector3(1.0, 0.8, 1.0)
		spot.add_child(mound)
		var mound2 := _sphere(0.26, _dirty)
		mound2.position = Vector3(0.18, 0.2, -0.08)
		spot.add_child(mound2)
		_spots.append(mound)
		# 「きれいに」案内
		var tag := Label3D.new()
		tag.text = "きれいに"
		tag.font_size = 44
		tag.outline_size = 12
		tag.outline_modulate = Color(0.05, 0.05, 0.05)
		tag.modulate = Color(1, 1, 0.85)
		tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		tag.no_depth_test = true
		tag.pixel_size = 0.005
		tag.position = Vector3(0.0, 0.95, 0.0)
		spot.add_child(tag)

	# 中央の輪（澄んだ点が増えるほど満ちて光る）
	_ring = MeshInstance3D.new()
	_ring.name = "Ring"
	var tm := TorusMesh.new()
	tm.inner_radius = RADIUS - 0.18
	tm.outer_radius = RADIUS - 0.02
	tm.rings = 28
	tm.ring_segments = 8
	_ring.mesh = tm
	_ring_mat = StandardMaterial3D.new()
	_ring_mat.albedo_color = Color(0.7, 0.9, 0.6, 0.85)
	_ring_mat.emission_enabled = true
	_ring_mat.emission = Color(0.5, 1.0, 0.5)
	_ring_mat.emission_energy_multiplier = 0.3
	_ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_ring.material_override = _ring_mat
	_ring.rotation.x = deg_to_rad(90.0)
	_ring.position = Vector3(0.0, 0.06, 0.0)
	add_child(_ring)

	# やることの案内（中央の上に大きく）
	var guide := Label3D.new()
	guide.text = "ぜんぶ 同時に きれいに！（ソロは なかまが手伝う）"
	guide.font_size = 34
	guide.outline_size = 12
	guide.outline_modulate = Color(0.05, 0.05, 0.05)
	guide.modulate = Color(1, 1, 0.85)
	guide.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	guide.no_depth_test = true
	guide.pixel_size = 0.0055
	guide.position = Vector3(0.0, 2.0, 0.0)
	add_child(guide)


func _sphere(r: float, c: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := SphereMesh.new()
	m.radius = r
	m.height = r * 2.0
	m.radial_segments = 10
	m.rings = 6
	mi.mesh = m
	var mat := StandardMaterial3D.new()
	mat.albedo_color = c
	mat.roughness = 0.95
	mat.metallic_specular = 0.12
	mat.rim_enabled = true
	mat.rim = 0.2
	mi.material_override = mat
	return mi


# ------------------------------------------------------------ サーバ：きれいに
## プレイヤーの「きれいに」が近くで出たら、いちばん近い点を澄ませる。
func cleanse_near(from: Vector3, _id: int) -> void:
	if not _is_server() or solved:
		return
	var best := -1
	var best_d := REACH
	for i in SPOTS:
		var d: float = to_global(spot_pos(i)).distance_to(from)
		if d < best_d:
			best_d = d
			best = i
	if best < 0:
		return
	_clean[best] = 1.0
	_fresh[best] = KEEP_FRESH
	rpc("_remote_spot", best, 1.0)
	Sfx.play("hit", -6.0)
	_check_solved()


func _process(delta: float) -> void:
	_age += delta
	if not _is_server() or solved:
		_spin_ring(delta)
		return

	# なかまが近くにいる点は押さえ続ける（ソロの手＝もう一人ぶんの役割）
	var ally_hold := {}
	for a in get_tree().get_nodes_in_group("ally"):
		var ap: Vector3 = (a as Node3D).global_position
		for i in SPOTS:
			if to_global(spot_pos(i)).distance_to(ap) < ALLY_HOLD:
				ally_hold[i] = true

	for i in SPOTS:
		if ally_hold.has(i):
			_clean[i] = 1.0
			_fresh[i] = maxf(_fresh[i], 0.4)
		if _fresh[i] > 0.0:
			_fresh[i] -= delta
		else:
			_clean[i] = maxf(0.0, _clean[i] - DECAY * delta)   # 再汚染

	_sync_accum += delta
	if _sync_accum >= 0.1:
		_sync_accum = 0.0
		rpc("_remote_state", _clean)

	_apply_visual()
	_spin_ring(delta)
	_check_solved()


func _spin_ring(delta: float) -> void:
	if _ring != null:
		_ring.rotation.y += delta * 0.4


func _check_solved() -> void:
	if solved:
		return
	for i in SPOTS:
		if _clean[i] < SOLVE_THRESH:
			return
	_solve()


func _apply_visual() -> void:
	var clean_col := Color(0.55, 0.85, 0.5)
	var lit := 0
	for i in SPOTS:
		if i < _spots.size():
			var mat := _spots[i].material_override as StandardMaterial3D
			if mat != null:
				mat.albedo_color = _dirty.lerp(clean_col, _clean[i])
				mat.emission_enabled = _clean[i] > 0.05
				mat.emission = Color(0.4, 1.0, 0.5)
				mat.emission_energy_multiplier = _clean[i] * 0.8
		if _clean[i] >= SOLVE_THRESH:
			lit += 1
	if _ring_mat != null:
		var frac := float(lit) / float(SPOTS)
		_ring_mat.emission_energy_multiplier = 0.3 + frac * 1.6


# ------------------------------------------------------------ 配信（見た目）
@rpc("authority", "call_local", "unreliable_ordered")
func _remote_state(clean: PackedFloat32Array) -> void:
	_clean = clean
	_apply_visual()


@rpc("authority", "call_local", "reliable")
func _remote_spot(i: int, v: float) -> void:
	if i >= 0 and i < SPOTS:
		_clean[i] = v
	_apply_visual()


@rpc("authority", "call_local", "reliable")
func _remote_solved() -> void:
	solved = true
	for m in _spots:
		var mat := m.material_override as StandardMaterial3D
		if mat != null:
			mat.emission_enabled = true
			mat.emission = Color(0.7, 1.0, 0.8)
			mat.emission_energy_multiplier = 2.2
	if _ring_mat != null:
		_ring_mat.emission_energy_multiplier = 2.4
	Sfx.play("heal")
	Sfx.play("levelup", -12.0)
	# 澄んだ点が ふわっと浮いて弾ける
	for m in _spots:
		var tw := create_tween()
		tw.tween_property(m, "position:y", m.position.y + 0.6, 0.4)
		tw.parallel().tween_property(m, "scale", Vector3(0.1, 0.1, 0.1), 0.5).set_ease(Tween.EASE_IN)


func sync_to(id: int) -> void:
	if not _is_server():
		return
	if solved:
		rpc_id(id, "_remote_solved")
	else:
		rpc_id(id, "_remote_state", _clean)


## サーバ：全点そろって澄んだ＝みどりが戻り、なかまが生まれる。
func _solve() -> void:
	if solved:
		return
	solved = true
	WorldState.set_recovery(clampf(WorldState.recovery + REWARD, 0.0, 1.0))
	WorldState.notice.emit("よごれの輪を ぜんぶ きれいにした！")
	var garden := get_tree().get_first_node_in_group("garden")
	if garden != null and garden.has_method("spawn_ally"):
		garden.spawn_ally(global_position + Vector3(0, 0.3, 0), 1, Color(0.6, 1.0, 0.72))
	rpc("_remote_solved")


## 自己点検・デバッグ用：その場で解く。
func debug_solve() -> void:
	if not _is_server():
		return
	for i in SPOTS:
		_clean[i] = 1.0
		_fresh[i] = KEEP_FRESH
	_check_solved()
