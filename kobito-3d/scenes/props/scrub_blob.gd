extends Node3D
class_name ScrubBlob
## おそうじリレー：大きな汚れのかたまり。
##
## テーマ「倒さない・きれいにする」を“協力の謎解き”にした仕掛け。
## - 「つかむ」で 押さえている間（数秒）だけ、「きれいに」で浄化が進む。
## - ソロ：先に虫を癒やして「なかま」を作り、そばに置けば なかまが自動で押さえてくれる。
##   （＝押さえ役をなかまが肩代わり。ひとりでも必ず解ける）
## - 2人：ひとりが「つかむ」で押さえ、もうひとりが「きれいに」＝役割分担がそのまま解法。
##
## サーバ権威（正は1台）。状態(_clean/_pinned)はサーバが決め、10Hzで配信。素材ゼロ・低ポリ。

const PIN_TIME := 3.0        # 「つかむ」で押さえられる秒数
const SCRUB_PER := 0.2       # 「きれいに」1回で進む浄化量
const REWARD := 0.12         # 浄化できた時に戻る みどり(recovery)
const ALLY_HOLD_RANGE := 2.2 # なかまが近くにいれば自動で押さえる距離

var _clean := 0.0            # 0→1 の浄化ぐあい
var _pinned_t := 0.0         # >0 の間は“押さえられている”
var _dead := false
var _sync_accum := 0.0
var _age := 0.0

var _mound: Node3D = null
var _ring: MeshInstance3D = null
var _ring_mat: StandardMaterial3D = null
var _base_pos := Vector3.ZERO
var _dirty := Color(0.26, 0.24, 0.2)


func _ready() -> void:
	add_to_group("scrub_blob")
	_base_pos = position
	_build()
	set_process(true)


func _is_server() -> bool:
	return multiplayer.has_multiplayer_peer() and multiplayer.is_server()


func _build() -> void:
	_mound = Node3D.new()
	_mound.name = "Mound"
	add_child(_mound)
	# ヘドロのかたまり：低ポリ球をいくつか積む（“汚れのおおきな塊”）
	var lumps := [
		[Vector3(0.0, 0.45, 0.0), 0.6],
		[Vector3(0.4, 0.28, 0.1), 0.38],
		[Vector3(-0.36, 0.3, -0.06), 0.4],
		[Vector3(0.08, 0.72, -0.05), 0.34],
	]
	for l in lumps:
		var b := _sphere(0.5, _dirty)
		b.position = l[0]
		b.mesh.radius = l[1]
		b.mesh.height = float(l[1]) * 2.0
		b.scale = Vector3(1.0, 0.85, 1.0)
		_mound.add_child(b)
	# 困り目2つ（前＝-Z）＝“苦しくて暴れている”生きものだと分かる
	for sx in [-1.0, 1.0]:
		var sclera := _sphere(0.12, Color(0.95, 0.96, 0.92))
		sclera.position = Vector3(0.18 * sx, 0.5, -0.5)
		sclera.scale = Vector3(1.0, 1.15, 0.7)
		_mound.add_child(sclera)
		var eye := _sphere(0.07, Color(0.06, 0.05, 0.05))
		eye.position = Vector3(0.18 * sx, 0.47, -0.6)
		_mound.add_child(eye)

	# 進捗リング（浄化ぐあい）＝地面に寝かせた光の輪。きれいになるほど緑に満ちる。
	_ring = MeshInstance3D.new()
	_ring.name = "Ring"
	var tm := TorusMesh.new()
	tm.inner_radius = 0.62
	tm.outer_radius = 0.74
	tm.rings = 20
	tm.ring_segments = 8
	_ring.mesh = tm
	_ring_mat = StandardMaterial3D.new()
	_ring_mat.albedo_color = Color(0.7, 0.9, 0.6, 0.9)
	_ring_mat.emission_enabled = true
	_ring_mat.emission = Color(0.5, 1.0, 0.5)
	_ring_mat.emission_energy_multiplier = 0.6
	_ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_ring.material_override = _ring_mat
	_ring.rotation.x = deg_to_rad(90.0)
	_ring.position = Vector3(0.0, 0.06, 0.0)
	_ring.scale = Vector3(0.2, 0.2, 0.2)
	add_child(_ring)

	# 案内（何をすればいいか）
	var guide := Label3D.new()
	guide.text = "つかんで おさえて → きれいに！"
	guide.font_size = 40
	guide.outline_size = 12
	guide.outline_modulate = Color(0.05, 0.05, 0.05)
	guide.modulate = Color(1, 1, 0.85)
	guide.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	guide.no_depth_test = true
	guide.pixel_size = 0.0055
	guide.position = Vector3(0.0, 1.5, 0.0)
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


# ------------------------------------------------------------ サーバ：掴む/みがく
## 「つかむ」がそばで押されたら、一定時間“押さえた”状態にする。
func pin(_from_id: int) -> void:
	if not _is_server() or _dead:
		return
	_pinned_t = PIN_TIME
	rpc("_remote_pinned")


## 「きれいに」がそばで押されたら、押さえてる間だけ浄化を進める。
func scrub(from_id: int) -> void:
	if not _is_server() or _dead:
		return
	if _pinned_t <= 0.0:
		rpc("_remote_resist")   # 押さえてないと暴れて効かない
		return
	_clean = minf(1.0, _clean + SCRUB_PER)
	rpc("_remote_progress", _clean)
	if _clean >= 1.0:
		_purify(from_id)


func _process(delta: float) -> void:
	_age += delta
	if _dead:
		return
	if _is_server():
		if _pinned_t > 0.0:
			_pinned_t -= delta
		else:
			# なかまが近くにいれば自動で押さえる（ソロの押さえ役をなかまが肩代わり）
			for a in get_tree().get_nodes_in_group("ally"):
				if (a as Node3D).global_position.distance_to(global_position) < ALLY_HOLD_RANGE:
					_pinned_t = 0.4
					break
		_sync_accum += delta
		if _sync_accum >= 0.1:
			_sync_accum = 0.0
			rpc("_remote_state", _clean, _pinned_t > 0.0)

	# 見た目：押さえてない時は ぶるぶる暴れる／押さえると落ち着く
	if _mound != null:
		var resist := _pinned_t <= 0.0
		var amp := 0.05 if resist else 0.0
		_mound.position = Vector3(sin(_age * 40.0) * amp, 0.0, cos(_age * 33.0) * amp)


func _apply_visual(clean: float, pinned: bool) -> void:
	# 汚れ色→澄んだ緑へ。リングも満ちていく。
	var clean_col := Color(0.55, 0.85, 0.5)
	for c in _mound.get_children():
		var mi := c as MeshInstance3D
		if mi == null:
			continue
		var mat := mi.material_override as StandardMaterial3D
		# 目・白目は塗り替えない（暗い/白のまま）
		if mat == null or mat.albedo_color.v > 0.85 or mat.albedo_color.v < 0.12:
			continue
		mat.albedo_color = _dirty.lerp(clean_col, clean)
	if _ring != null:
		var s := 0.2 + clean * 0.9
		_ring.scale = Vector3(s, s, s)
		_ring_mat.emission_energy_multiplier = (1.4 if pinned else 0.5) + clean * 1.0


@rpc("authority", "call_local", "unreliable_ordered")
func _remote_state(clean: float, pinned: bool) -> void:
	_clean = clean
	_apply_visual(clean, pinned)


@rpc("authority", "call_local", "reliable")
func _remote_progress(clean: float) -> void:
	_clean = clean
	_apply_visual(clean, true)
	Sfx.play("hit", -6.0)


@rpc("authority", "call_local", "reliable")
func _remote_pinned() -> void:
	Sfx.play("swing", -8.0)


@rpc("authority", "call_local", "reliable")
func _remote_resist() -> void:
	# 押さえてない：ぶるっと大きく暴れる＝「つかんで！」の合図
	var tw := create_tween()
	tw.tween_property(_mound, "position", Vector3(0.14, 0.0, 0.0), 0.05)
	tw.tween_property(_mound, "position", Vector3.ZERO, 0.12)


@rpc("authority", "call_local", "reliable")
func _remote_purified() -> void:
	_dead = true
	remove_from_group("scrub_blob")
	Sfx.play("heal")
	Sfx.play("levelup", -12.0)
	# 澄んだ光にして昇天
	for c in _mound.get_children():
		var mi := c as MeshInstance3D
		if mi != null and mi.material_override is StandardMaterial3D:
			(mi.material_override as StandardMaterial3D).emission_enabled = true
			(mi.material_override as StandardMaterial3D).emission = Color(0.7, 1.0, 0.8)
			(mi.material_override as StandardMaterial3D).emission_energy_multiplier = 2.2
	var tw := create_tween()
	tw.tween_property(self, "position", _base_pos + Vector3(0, 1.4, 0), 0.6)
	tw.parallel().tween_property(self, "scale", Vector3(0.1, 0.1, 0.1), 0.6).set_ease(Tween.EASE_IN)
	tw.tween_callback(queue_free)


## サーバ：浄化完了＝みどりが戻り、なかまが生まれる。
func _purify(from_id: int) -> void:
	if not _is_server():
		return
	WorldState.set_recovery(clampf(WorldState.recovery + REWARD, 0.0, 1.0))
	WorldState.notice.emit("おおきな よごれを きれいにした！")
	var garden := get_tree().get_first_node_in_group("garden")
	if garden != null and garden.has_method("spawn_ally"):
		garden.spawn_ally(global_position + Vector3(0, 0.3, 0), from_id, Color(0.6, 1.0, 0.72))
	rpc("_remote_purified")


## 自己点検・デバッグ用：その場で解く。
func debug_solve() -> void:
	if not _is_server():
		return
	_pinned_t = PIN_TIME
	for i in 6:
		scrub(1)
