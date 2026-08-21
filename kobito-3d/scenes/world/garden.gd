extends Node3D
## 庭（縦切り＝バーティカルスライスの舞台）
##
## 広い世界はまだ作らない。ここに「面白さの全部」を詰める:
##   歩く / 戦う / 育つ / ゴミを押して掃除する / 緑が戻る / 夫婦で一緒にいる
## 世界を広げるのは M5。今はこの1エリアだけを何度も遊んで詰める。
##
## ● 誰の小人をどこに出すか
##   Net.roster（サーバが正、全員に配布済み）を毎回見比べて、
##   「名簿にいるのにノードが無い人」を足し、「名簿から消えた人」を消すだけ。
##   これなら参加・退出・再接続のどれでも同じ1本の道で処理できる。

const PlayerScene := preload("res://scenes/actors/player.tscn")
const BugScene := preload("res://scenes/actors/bug.tscn")
const ChildScene := preload("res://scenes/actors/child.tscn")

## 8人の子ども（CHARACTERS.md 準拠）。頭のスミレが親を追い、あとはぞろぞろ続く。
## 色・大きさはここ一箇所。順番＝隊列の並び（末尾のつぼみがいちばん小さい）。
const CHILDREN := [
	{"name": "スミレ", "color": Color(0.55, 0.40, 0.70), "scale": 0.68},
	{"name": "カヤ", "color": Color(0.85, 0.50, 0.25), "scale": 0.66},
	{"name": "ソラ", "color": Color(0.50, 0.75, 0.95), "scale": 0.62},
	{"name": "シズク", "color": Color(0.55, 0.80, 0.85), "scale": 0.60},
	{"name": "リン", "color": Color(0.58, 0.82, 0.42), "scale": 0.58},
	{"name": "ラン", "color": Color(0.50, 0.74, 0.38), "scale": 0.58},
	{"name": "マメ", "color": Color(0.66, 0.70, 0.35), "scale": 0.56},
	{"name": "つぼみ", "color": Color(0.95, 0.65, 0.75), "scale": 0.46},
]

const SPAWN_POINTS := [
	Vector3(0.0, 0.6, 0.0),
	Vector3(1.6, 0.6, 0.6),
	Vector3(-1.6, 0.6, 0.6),
	Vector3(0.0, 0.6, 1.8),
]
const BUG_SPAWN_POINTS := [
	Vector3(9.0, 0.6, -6.0),
	Vector3(-8.0, 0.6, -8.0),
	Vector3(10.0, 0.6, 7.0),
	Vector3(-10.0, 0.6, 6.0),
]
const MAX_BUGS := 8

var _bug_serial := 0
var _spawn_timer := 0.0

@onready var _players: Node3D = $Players
@onready var _bugs: Node3D = $Bugs
@onready var _children: Node3D = $Children
@onready var _ground: MeshInstance3D = $Ground
@onready var _ground_mat := StandardMaterial3D.new()
@onready var _env: WorldEnvironment = $WorldEnvironment

# 見た目（すべて手続き生成＝外部素材ゼロ・スマホ安全）
const GRASS_COUNT := 500
const FLOWER_COUNT := 60
var _sky_mat: ProceduralSkyMaterial = null
var _grass_mm: MultiMesh = null
var _flower_mm: MultiMesh = null
var _grass_pos := PackedVector3Array()
var _grass_h := PackedFloat32Array()
var _grass_yaw := PackedFloat32Array()


func _ready() -> void:
	_ground.material_override = _ground_mat
	_setup_visuals()
	WorldState.recovery_changed.connect(_on_recovery_changed)
	Net.roster_changed.connect(_reconcile_players)
	$CleanupZone.body_entered.connect(_on_cleanup_zone_entered)
	if multiplayer.has_multiplayer_peer():
		multiplayer.peer_connected.connect(_on_peer_connected)
	_on_recovery_changed(WorldState.recovery)
	_reconcile_players()
	if _is_server():
		_spawn_children()


func _process(delta: float) -> void:
	if not _is_server():
		return
	_spawn_timer -= delta
	if _spawn_timer <= 0.0:
		_spawn_timer = WorldState.spawn_interval()
		_spawn_bug()


# ------------------------------------------------------------ プレイヤー

func _reconcile_players() -> void:
	var wanted := {}
	for id in Net.roster:
		wanted[str(id)] = true
		if _players.has_node(str(id)):
			continue
		var p := PlayerScene.instantiate()
		p.name = str(id)
		_players.add_child(p)
		var role: int = Net.role_of(id)
		p.global_position = SPAWN_POINTS[role % SPAWN_POINTS.size()]

	for child in _players.get_children():
		if not wanted.has(child.name):
			child.queue_free()


func local_player() -> Node:
	if not multiplayer.has_multiplayer_peer():
		return null
	return _players.get_node_or_null(str(multiplayer.get_unique_id()))


## 「つないでいる最中」「切れた直後」でも落ちないための共通ガード。
## multiplayer.is_server() は peer が無いとエラーを出すので、必ずこれ経由で呼ぶ。
func _is_server() -> bool:
	return multiplayer.has_multiplayer_peer() and multiplayer.is_server()


## 後から参加した人に「今いる虫」を配る。
## これが無いと、参加者の画面に虫が居ないまま位置だけ飛んできて壊れる
## （2台つなぐ自己点検で最初に見つかった不具合がこれ）。
func _on_peer_connected(id: int) -> void:
	if not _is_server():
		return
	for bug in _bugs.get_children():
		rpc_id(id, "_remote_spawn_bug", int(bug.name.trim_prefix("Bug")), bug.stats_path, bug.global_position)
	# 子どもは決まった8人。番号だけ送れば相手が同じ子を組み立てられる。
	for child in _children.get_children():
		rpc_id(id, "_remote_spawn_child", int(child.name.trim_prefix("Child")))


# ------------------------------------------------------------ 子ども（追従隊列）

func _spawn_children() -> void:
	if _children.get_child_count() > 0:
		return
	for i in CHILDREN.size():
		rpc("_remote_spawn_child", i)


@rpc("authority", "call_local", "reliable")
func _remote_spawn_child(index: int) -> void:
	if _children.has_node("Child%d" % index):
		return
	var data: Dictionary = CHILDREN[index]
	var child := ChildScene.instantiate()
	child.name = "Child%d" % index
	child.child_name = data["name"]
	child.body_color = data["color"]
	child.body_scale = data["scale"]
	# 頭（0番＝スミレ）は親を追い、あとは前の子を追う
	if index == 0:
		child.follows_player = true
	else:
		child.leader_path = NodePath("../Child%d" % (index - 1))
	_children.add_child(child)
	# 初期位置は巣のうしろに一列。すぐ隊列に整う。
	child.global_position = SPAWN_POINTS[0] + Vector3(0.0, 0.0, 1.0 + index * 0.6)


# ------------------------------------------------------------ 敵

func _spawn_bug() -> void:
	if _bugs.get_child_count() >= MAX_BUGS:
		return
	_bug_serial += 1
	# 回復が進むほどコガネムシ（強いほう）が減る＝掃除の手応え
	var stats_path := "res://data/ant.tres"
	if randf() > 0.35 + WorldState.recovery * 0.5:
		stats_path = "res://data/beetle.tres"
	var pos: Vector3 = BUG_SPAWN_POINTS[_bug_serial % BUG_SPAWN_POINTS.size()]
	pos += Vector3(randf_range(-1.5, 1.5), 0.0, randf_range(-1.5, 1.5))
	rpc("_remote_spawn_bug", _bug_serial, stats_path, pos)


@rpc("authority", "call_local", "reliable")
func _remote_spawn_bug(serial: int, stats_path: String, pos: Vector3) -> void:
	var bug := BugScene.instantiate()
	bug.name = "Bug%d" % serial
	bug.stats = load(stats_path)
	bug.stats_path = stats_path
	_bugs.add_child(bug)
	bug.global_position = pos


# ------------------------------------------------------------ 掃除

func _on_cleanup_zone_entered(body: Node3D) -> void:
	if not _is_server():
		return
	if body.is_in_group("trash") and body.has_method("mark_removed"):
		body.mark_removed()
		if get_tree().get_nodes_in_group("trash").size() <= 1:
			WorldState.add("drain_cleared")


# ------------------------------------------------------------ 見た目
#
# このゲームの魂＝「掃除するほど世界が緑に還る」を、目に見えるところまで作る。
# 空・霧・草・花、すべて環境回復度に連動。手続き生成なので外部素材は要らず、
# 草500本＋花60個も MultiMesh で各1ドローコール＝スマホでも軽い。

func _setup_visuals() -> void:
	_setup_sky_fog()
	_build_grass()
	_build_flowers()


## 空と霧。汚れているほど灰色・濃い霧（近くしか見えない＝澱んだ空気）、
## 回復するほど青空・霧が晴れる。霧は「小人視点のジオラマ感」も出す。
func _setup_sky_fog() -> void:
	var env := Environment.new()
	_sky_mat = ProceduralSkyMaterial.new()
	var sky := Sky.new()
	sky.sky_material = _sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.75
	env.fog_enabled = true
	env.fog_light_energy = 1.0
	_env.environment = env


## 草。回復度で「伸びる」。汚れているうちは生えていない（高さ0）。
func _build_grass() -> void:
	var blade := BoxMesh.new()
	blade.size = Vector3(0.05, 0.3, 0.05)
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 1.0
	blade.material = mat

	_grass_mm = MultiMesh.new()
	_grass_mm.transform_format = MultiMesh.TRANSFORM_3D
	_grass_mm.use_colors = true
	_grass_mm.mesh = blade
	_grass_mm.instance_count = GRASS_COUNT

	var rng := RandomNumberGenerator.new()
	rng.seed = 20260821   # 固定シード＝毎回同じ配置（クライアント間でも揃う）
	for i in GRASS_COUNT:
		var x := rng.randf_range(-21.0, 21.0)
		var z := rng.randf_range(-21.0, 21.0)
		var h := rng.randf_range(0.6, 1.4)
		# 排水溝の上には生やさない
		if x > -3.6 and x < 3.6 and z > -11.5 and z < -6.5:
			h = 0.0
		_grass_pos.append(Vector3(x, 0.0, z))
		_grass_h.append(h)
		_grass_yaw.append(rng.randf_range(0.0, TAU))
		_grass_mm.set_instance_color(i, Color(0.28, 0.45, 0.18).lerp(Color(0.45, 0.7, 0.3), rng.randf()))

	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Grass"
	mmi.multimesh = _grass_mm
	add_child(mmi)
	_update_grass(WorldState.recovery)


## 花。回復30%を超えたあたりから咲き始め、100%で満開。草の上に散らす。
func _build_flowers() -> void:
	var head := SphereMesh.new()
	head.radius = 0.07
	head.height = 0.14
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.8
	head.material = mat

	_flower_mm = MultiMesh.new()
	_flower_mm.transform_format = MultiMesh.TRANSFORM_3D
	_flower_mm.use_colors = true
	_flower_mm.mesh = head
	_flower_mm.instance_count = FLOWER_COUNT

	var cols := [Color(0.95, 0.4, 0.5), Color(0.98, 0.85, 0.35), Color(0.92, 0.92, 0.96), Color(0.75, 0.55, 0.9)]
	var rng := RandomNumberGenerator.new()
	rng.seed = 99887766
	for i in FLOWER_COUNT:
		var src: Vector3 = _grass_pos[(i * 7) % _grass_pos.size()]
		var origin := src + Vector3(0.0, 0.34, 0.0)
		_flower_mm.set_instance_transform(i, Transform3D(Basis(), origin))
		_flower_mm.set_instance_color(i, cols[rng.randi() % cols.size()])

	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Flowers"
	mmi.multimesh = _flower_mm
	add_child(mmi)
	_update_flowers(WorldState.recovery)


func _update_grass(r: float) -> void:
	if _grass_mm == null:
		return
	var grow := clampf(r * 1.2, 0.0, 1.0)
	for i in _grass_pos.size():
		var h := _grass_h[i] * grow
		var basis := Basis(Vector3.UP, _grass_yaw[i]).scaled(Vector3(1.0, maxf(0.001, h), 1.0))
		var origin: Vector3 = _grass_pos[i] + Vector3(0.0, 0.15 * h, 0.0)
		_grass_mm.set_instance_transform(i, Transform3D(basis, origin))


func _update_flowers(r: float) -> void:
	if _flower_mm == null:
		return
	var t := clampf((r - 0.3) / 0.7, 0.0, 1.0)
	_flower_mm.visible_instance_count = int(round(FLOWER_COUNT * t))


func _update_sky_fog(r: float) -> void:
	if _sky_mat != null:
		_sky_mat.sky_top_color = Color(0.34, 0.34, 0.40).lerp(Color(0.25, 0.5, 0.85), r)
		_sky_mat.sky_horizon_color = Color(0.62, 0.57, 0.5).lerp(Color(0.72, 0.86, 0.95), r)
		_sky_mat.ground_horizon_color = WorldState.ground_color()
		_sky_mat.ground_bottom_color = WorldState.ground_color()
	var env := _env.environment
	if env != null:
		env.fog_light_color = Color(0.6, 0.56, 0.5).lerp(Color(0.78, 0.86, 0.9), r)
		env.fog_density = lerpf(0.06, 0.012, r)   # 澱んだ濃霧 → 澄んだ空気


func _on_recovery_changed(_value: float) -> void:
	var r := WorldState.recovery
	_ground_mat.albedo_color = WorldState.ground_color()
	_update_sky_fog(r)
	_update_grass(r)
	_update_flowers(r)
	var env := _env.environment
	if env != null:
		env.background_color = WorldState.sky_color()
		env.ambient_light_color = WorldState.sky_color()
