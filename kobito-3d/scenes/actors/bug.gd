extends CharacterBody3D
## 虫（ヘドロに侵された生き物）
##
## この世界の「敵」は悪者ではない。ヘドロに侵されて苦しく、暴れているだけ。
## プレイヤーの攻撃は駆除ではなく「汚れを叩き落として正気に戻す＝癒やす」行為。
## 癒やされた虫は澄んだ色になって昇っていく（将来は仲間になって力を授ける）。
##
## 中身はサーバだけが動かす。クライアントは 10Hz で届く位置に寄せるだけ。
## 敵の数が増えても通信量が線形にしか増えないので、スマホ回線でも耐える。
##
## 種類ごとの違いは data/*.tres（EnemyStats）に外出し。
## 「アリを速くしたい」ならスクリプトではなく ant.tres の数字を触る。

const SYNC_HZ := 10.0
const GRAVITY := 14.0

@export var stats: EnemyStats

## どの .tres から作られたか。後から参加した人へ同じ虫を作り直してもらうために持っておく。
var stats_path: String = "res://data/ant.tres"

var hp: int = 16
var _target: Node3D = null
var _attack_cd := 0.0
var _sync_accum := 0.0
var _net_pos := Vector3.ZERO
var _dead := false
var _age := 0.0
var _knockback := Vector3.ZERO   # 叩かれて弾き飛ぶ勢い（減衰する）

@onready var _body: MeshInstance3D = $Body

var _hpbar: Node3D = null        # 頭上のHPバー（ダメージが目で分かる）
var _hpbar_fill: Node3D = null   # 緑の残量（xスケールで減る）


func _ready() -> void:
	add_to_group("bug")
	if stats == null:
		stats = load("res://data/ant.tres")
	hp = stats.max_hp
	_net_pos = global_position

	var mat := StandardMaterial3D.new()
	mat.albedo_color = stats.body_color
	mat.roughness = 0.8
	mat.rim_enabled = true
	mat.rim = 0.4
	_body.material_override = mat
	_body.scale = Vector3.ONE * stats.body_scale

	# 横倒しカプセル1個を“虫”に見せる（頭・目・触角・6本脚・甲羅）
	BugLook.decorate(self, stats.body_color, stats.body_scale, stats.shell)

	_build_hpbar()

	# 敵の頭脳はサーバにしか無い
	set_physics_process(true)


## 頭上のHPバー。ダメージを受けると緑が減る＝“くらってる・HPが減ってる”が一目で分かる。
## いつもカメラを向く（ビルボード）。満タン／癒やし済みのときは隠す。
func _build_hpbar() -> void:
	const W := 1.0
	const H := 0.14
	_hpbar = Node3D.new()
	_hpbar.name = "HpBar"
	_hpbar.position = Vector3(0.0, 1.15, 0.0)
	add_child(_hpbar)
	# 背景（濃い赤）
	var bg := MeshInstance3D.new()
	var bgm := QuadMesh.new()
	bgm.size = Vector2(W, H)
	bg.mesh = bgm
	bg.material_override = _bar_mat(Color(0.5, 0.12, 0.12))
	_hpbar.add_child(bg)
	# 残量（緑）：左端を軸にして x スケールで減らす
	_hpbar_fill = Node3D.new()
	_hpbar_fill.position = Vector3(-W * 0.5, 0.0, 0.01)
	_hpbar.add_child(_hpbar_fill)
	var fill := MeshInstance3D.new()
	var fm := QuadMesh.new()
	fm.size = Vector2(W, H * 0.82)
	fill.mesh = fm
	fill.position = Vector3(W * 0.5, 0.0, 0.0)   # 左端(親原点)から右へ伸びる
	fill.material_override = _bar_mat(Color(0.36, 0.85, 0.34))
	_hpbar_fill.add_child(fill)
	_hpbar.visible = false   # 満タンのうちは出さない


func _bar_mat(col: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.billboard_keep_scale = true
	m.no_depth_test = true   # 体に隠れず常に見える
	return m


func _update_hpbar() -> void:
	if _hpbar == null or _hpbar_fill == null:
		return
	var maxhp: int = maxi(1, stats.max_hp)
	var ratio := clampf(float(hp) / float(maxhp), 0.0, 1.0)
	_hpbar_fill.scale.x = ratio
	_hpbar.visible = _dead == false and hp > 0 and hp < maxhp


func _physics_process(delta: float) -> void:
	if _dead:
		return
	if not multiplayer.has_multiplayer_peer():
		return
	_age += delta
	if multiplayer.is_server():
		_think(delta)
		_sync_accum += delta
		# 生成直後は位置を送らない。「作って」の通知(確実便)が相手に着く前に
		# 位置(速達便)が着くと、まだ居ないノード宛になって警告の山になる。
		if _age > 0.5 and _sync_accum >= 1.0 / SYNC_HZ:
			_sync_accum = 0.0
			rpc("_remote_state", global_position, hp)
	else:
		global_position = global_position.lerp(_net_pos, clampf(delta * 10.0, 0.0, 1.0))


func _think(delta: float) -> void:
	_attack_cd = maxf(0.0, _attack_cd - delta)
	_target = _nearest_player()

	velocity.y -= GRAVITY * delta
	if is_on_floor():
		velocity.y = -0.1

	if _target == null:
		velocity.x = move_toward(velocity.x, 0.0, 8.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 8.0 * delta)
		move_and_slide()
		return

	var to_target: Vector3 = _target.global_position - global_position
	to_target.y = 0.0
	var dist := to_target.length()

	if dist > 0.9:
		# M2ではまっすぐ寄るだけ。障害物を避けたくなったら
		# NavigationAgent3D をここに差し込む（世界を広げる M5 で）。
		var dir := to_target.normalized()
		velocity.x = dir.x * stats.move_speed
		velocity.z = dir.z * stats.move_speed
		look_at(global_position + dir, Vector3.UP)   # 頭(前=-Z)を進行方向へ向ける
	else:
		velocity.x = 0.0
		velocity.z = 0.0
		if _attack_cd <= 0.0:
			_attack_cd = stats.attack_interval
			rpc("_remote_lunge")   # 見た目：噛みつきの予備動作＋赤フラッシュ
			if _target.has_method("apply_damage"):
				_target.rpc("apply_damage", stats.attack_power)

	# 叩かれた勢い（ノックバック）を上乗せして減衰＝弾き飛ぶ手応え
	velocity.x += _knockback.x
	velocity.z += _knockback.z
	_knockback = _knockback.move_toward(Vector3.ZERO, 26.0 * delta)

	move_and_slide()


func _nearest_player() -> Node3D:
	var best: Node3D = null
	var best_dist := stats.detect_range
	for p in get_tree().get_nodes_in_group("player"):
		if p.hp <= 0:
			continue
		var d: float = p.global_position.distance_to(global_position)
		if d < best_dist:
			best_dist = d
			best = p
	return best


## サーバ側でのみ意味を持つ。amount ぶん「汚れ」を落とす。
## 汚れが尽きたら癒やし完了＝浄化。
## （関数名は cleanse。以前の take_damage から改名。中身は同じく“HPを削る”）
func cleanse(amount: int, healer_id: int) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server() or _dead:
		return
	hp -= amount
	if hp > 0:
		# 叩いた小人と反対方向へ弾き飛ばす（＝当たった手応え）
		var src := _player_by_id(healer_id)
		if src != null:
			var away: Vector3 = global_position - src.global_position
			away.y = 0.0
			if away.length() > 0.01:
				_knockback = away.normalized() * 9.0   # 強めに弾く＝当たった手応え
		rpc("_remote_hit", amount)   # まだ倒れない＝くらった芝居＋火花＋ダメージ数字
		return

	_dead = true
	WorldState.add("bug_healed")
	# 癒やした生き物は「力」を残す（飛行5パーツなど）
	WorldState.grant_power(stats.grants_power)
	# 中ボス（女王アリ等）を癒やしたら章の進行へ知らせる
	if stats.is_midboss:
		Chapter.notify_boss_cleared()
	for p in get_tree().get_nodes_in_group("player"):
		if p.name.to_int() == healer_id:
			p.rpc("gain_xp", stats.xp_reward)
			break
	rpc("_remote_healed")


@rpc("authority", "unreliable_ordered")
func _remote_state(pos: Vector3, remote_hp: int) -> void:
	_net_pos = pos
	hp = remote_hp
	_update_hpbar()


@rpc("authority", "call_local", "unreliable")
func _remote_hit(amount: int = 0) -> void:
	# くらった：赤フラッシュ＋大きくのけぞって跳ね潰れ＋火花＋ダメージ数字＋HPバー＋音
	# ＝はっきりした手応え。（※ヒットストップは時間停止が戻らず固まる不具合の元なので不使用）
	Sfx.play("hit")
	_flash_bug(Color(1.0, 0.5, 0.45))   # 赤めのフラッシュ＝ダメージが伝わる
	# サーバは cleanse() で既に減算済み。クライアントは _remote_state を待たず即バーを減らす。
	var is_server := multiplayer.has_multiplayer_peer() and multiplayer.is_server()
	if amount > 0 and not is_server:
		hp = maxi(0, hp - amount)
	_update_hpbar()
	var base := Vector3.ONE * stats.body_scale
	var tw := create_tween()
	tw.tween_property(_body, "scale", base * Vector3(1.7, 0.5, 1.7), 0.04)   # 大きくつぶれる
	tw.tween_property(_body, "scale", base, 0.18).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var tw2 := create_tween()
	tw2.tween_property(_body, "position:y", 0.7, 0.06)   # 大きく跳ねる
	tw2.tween_property(_body, "position:y", 0.0, 0.2).set_trans(Tween.TRANS_BOUNCE).set_ease(Tween.EASE_OUT)
	_spawn_hit_spark()
	if amount > 0:
		_spawn_damage_number(amount)


## ヒット火花：叩いた瞬間、白〜黄の光がパッと弾けて消える（当たった位置＝虫の中心上）。
func _spawn_hit_spark() -> void:
	var spark := MeshInstance3D.new()
	var m := SphereMesh.new()
	m.radius = 0.18
	m.height = 0.36
	m.radial_segments = 8
	m.rings = 4
	spark.mesh = m
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 1.0, 0.7)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.95, 0.6)
	mat.emission_energy_multiplier = 3.0
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	spark.material_override = mat
	add_child(spark)
	spark.position = Vector3(0.0, 0.5, 0.0)
	var tw := create_tween()
	tw.tween_property(spark, "scale", Vector3.ONE * 2.6, 0.12)
	tw.parallel().tween_property(mat, "albedo_color:a", 0.0, 0.14)
	tw.tween_callback(spark.queue_free)


## ダメージ数字：叩いた量が「-N」でポップし、上へ浮かんで消える。
func _spawn_damage_number(amount: int) -> void:
	var label := Label3D.new()
	label.text = "-%d" % amount
	label.font_size = 64
	label.modulate = Color(1.0, 0.95, 0.5)
	label.outline_size = 10
	label.outline_modulate = Color(0.1, 0.1, 0.1)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.pixel_size = 0.006
	add_child(label)
	label.position = Vector3(randf_range(-0.2, 0.2), 0.9, 0.0)
	var tw := create_tween()
	tw.tween_property(label, "position:y", 1.7, 0.5)
	tw.parallel().tween_property(label, "modulate:a", 0.0, 0.5)
	tw.tween_callback(label.queue_free)


func _player_by_id(id: int) -> Node3D:
	for p in get_tree().get_nodes_in_group("player"):
		if p.name.to_int() == id:
			return p
	return null


## 敵の攻撃モーション：振りかぶって噛みつく＋怒りの赤フラッシュ（＝これから攻撃する予告）。
## 向きに依存しないスケールの伸縮で表すので、どの角度から見ても「噛んだ」が分かる。
@rpc("authority", "call_local", "unreliable")
func _remote_lunge() -> void:
	if _dead:
		return
	Sfx.play("bite")
	_flash_bug(Color(1.0, 0.4, 0.3))
	var base := Vector3.ONE * stats.body_scale
	var tw := create_tween()
	tw.tween_property(_body, "scale", base * Vector3(0.8, 1.2, 0.8), 0.09)    # 振りかぶり（縮む）
	tw.tween_property(_body, "scale", base * Vector3(1.3, 0.8, 1.3), 0.07)    # 噛みつき（のびる）
	tw.tween_property(_body, "scale", base, 0.14)
	var tw2 := create_tween()
	tw2.tween_property(_body, "position:y", 0.22, 0.16)                       # ぐっと持ち上げて
	tw2.tween_property(_body, "position:y", 0.0, 0.14)                        # 噛みつく


## 汚れ色（stats.body_color）を base に、一瞬 c に光らせて戻す共通処理。
func _flash_bug(c: Color) -> void:
	var mat := _body.material_override as StandardMaterial3D
	if mat == null:
		return
	var tw := create_tween()
	tw.tween_property(mat, "albedo_color", c, 0.04)
	tw.tween_property(mat, "albedo_color", stats.body_color, 0.18)


@rpc("authority", "call_local", "reliable")
func _remote_healed() -> void:
	# 癒やし完了：汚れた色 → 澄んだ色になって、光るように昇って消える。
	# 「倒した（潰れて消える）」ではなく「救われて還っていく」見え方にする。
	_dead = true
	remove_from_group("bug")
	Sfx.play("heal")
	var tween := create_tween()
	var mat := _body.material_override as StandardMaterial3D
	if mat != null:
		tween.tween_property(mat, "albedo_color", Color(0.85, 1.0, 0.8), 0.2)
	tween.parallel().tween_property(self, "global_position:y", global_position.y + 0.9, 0.55)
	tween.parallel().tween_property(self, "scale", scale * 0.2, 0.55)
	tween.tween_callback(queue_free)
