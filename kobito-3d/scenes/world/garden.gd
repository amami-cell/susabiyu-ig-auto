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
const StonePuzzleScript := preload("res://scenes/props/stone_puzzle.gd")
const SwitchPairScript := preload("res://scenes/props/switch_pair.gd")

var _puzzle: Node3D = null
var _switch: Node3D = null

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
@onready var _env: WorldEnvironment = $WorldEnvironment
@onready var _sun: DirectionalLight3D = $Sun

# 見た目（すべて手続き生成＝外部素材ゼロ・スマホ安全）
const GRASS_COUNT := 900
const FLOWER_COUNT := 90
var _sky_mat: ProceduralSkyMaterial = null
var _ground_shader: ShaderMaterial = null
var _grass_mm: MultiMesh = null
var _flower_mm: MultiMesh = null
var _grass_pos := PackedVector3Array()
var _grass_h := PackedFloat32Array()
var _grass_yaw := PackedFloat32Array()
var _plant_mm: MultiMesh = null
var _plant_base := PackedVector3Array()
var _plant_rot := PackedFloat32Array()
var _grass_mmi: MultiMeshInstance3D = null
var _flower_mmi: MultiMeshInstance3D = null
var _pillars: Node3D = null

# 遠景（オープンワールドの“広さ”を出す背景）：山なみ・水面・木立・うねる丘。
# すべて壁(半径24)の外＝背景専用。MultiMeshで各1ドローコール＝スマホでも軽い。
const TREE_COUNT := 96        # 広葉樹（まるい木）
const CONIFER_COUNT := 84     # 針葉樹（とがった木）
const BOULDER_COUNT := 70     # 岩
var _hills: MultiMeshInstance3D = null
var _water_mat: ShaderMaterial = null
var _trees: Node3D = null
var _terrain_noise: FastNoiseLite = null

# 舞台(biome)。"garden"=庭 / "ruins"=遺跡。main が session 開始時に設定。
var biome := "garden"


func _ready() -> void:
	_setup_visuals()
	WorldState.recovery_changed.connect(_on_recovery_changed)
	Net.roster_changed.connect(_reconcile_players)
	$CleanupZone.body_entered.connect(_on_cleanup_zone_entered)
	if multiplayer.has_multiplayer_peer():
		multiplayer.peer_connected.connect(_on_peer_connected)
	_spawn_puzzle()
	_on_recovery_changed(WorldState.recovery)
	_reconcile_players()
	if _is_server():
		_spawn_children()


## 遺跡の石版パズル（順番に踏む）を庭の一角に置く。全員がローカルに組み立て、
## 判定はサーバが持つ。まずは1つで“謎解きの手触り”を確かめる（M5の入口）。
func _spawn_puzzle() -> void:
	_puzzle = Node3D.new()
	_puzzle.set_script(StonePuzzleScript)
	_puzzle.name = "StonePuzzle"
	_puzzle.position = Vector3(-9.0, 0.0, 6.0)
	add_child(_puzzle)

	# 同時スイッチ（協力／ソロは子NPCが相方）
	_switch = Node3D.new()
	_switch.set_script(SwitchPairScript)
	_switch.name = "SwitchPair"
	_switch.position = Vector3(9.0, 0.0, -2.0)
	add_child(_switch)


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
	# 石版パズル・同時スイッチの今の状態も配る
	if _puzzle != null and _puzzle.has_method("sync_to"):
		_puzzle.sync_to(id)
	if _switch != null and _switch.has_method("sync_to"):
		_switch.sync_to(id)


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
	# 末っ子つぼみ（最後尾）は少し遅れて、ちょこちょこ追いつく
	if index == CHILDREN.size() - 1:
		child.follow_spacing = 1.0
		child.follow_speed = 3.4
		child.follow_catchup = 8.0
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
	_setup_sun()
	_build_ground()
	_build_pebbles()
	_build_plants()
	_build_grass()
	_build_flowers()
	_build_pillars()
	_build_terrain_skirt()
	_build_distant_hills()
	_build_trees()
	_build_boulders()
	_apply_biome()


func _is_ruins() -> bool:
	return biome == "ruins"


## 舞台を切り替える（庭⇔遺跡）。色・霧・草花の密度・石柱をまとめて変える。
func set_biome(b: String) -> void:
	biome = b
	_apply_biome()


func _apply_biome() -> void:
	var ruins := _is_ruins()
	if _pillars != null:
		_pillars.visible = ruins
	# 遺跡は草まばら・花なし。庭は満開まで戻る。
	if _grass_mmi != null:
		_grass_mmi.multimesh.visible_instance_count = int(GRASS_COUNT * (0.28 if ruins else 1.0))
	if ruins and _flower_mm != null:
		_flower_mm.visible_instance_count = 0
	# 地面の色（遺跡＝苔むした石）
	if _ground_shader != null:
		if ruins:
			_ground_shader.set_shader_parameter("soil", Color(0.28, 0.28, 0.26))
			_ground_shader.set_shader_parameter("grass", Color(0.30, 0.42, 0.28))
		else:
			_ground_shader.set_shader_parameter("soil", Color(0.34, 0.27, 0.19))
			_ground_shader.set_shader_parameter("grass", Color(0.30, 0.55, 0.25))
	if _sun != null:
		_sun.light_color = Color(0.7, 0.78, 0.72) if ruins else Color(1.0, 0.95, 0.86)
		_sun.light_energy = 0.8 if ruins else 1.15
	# 遺跡は森まばら・水は淀む。庭は森が茂り水は澄む。
	if _trees != null:
		var frac := 0.35 if ruins else 1.0
		for mmi in _trees.get_children():
			if mmi is MultiMeshInstance3D and mmi.multimesh != null:
				mmi.multimesh.visible_instance_count = int(mmi.multimesh.instance_count * frac)
	if _water_mat != null:
		if ruins:
			_water_mat.set_shader_parameter("shallow", Color(0.22, 0.30, 0.28))
			_water_mat.set_shader_parameter("deep", Color(0.06, 0.12, 0.12))
		else:
			_water_mat.set_shader_parameter("shallow", Color(0.20, 0.45, 0.52))
			_water_mat.set_shader_parameter("deep", Color(0.06, 0.16, 0.24))
	_on_recovery_changed(WorldState.recovery)


## 遺跡の石柱（崩れた土管・古い柱のイメージ）。庭では隠す。
func _build_pillars() -> void:
	_pillars = Node3D.new()
	_pillars.name = "Pillars"
	add_child(_pillars)
	var rng := RandomNumberGenerator.new()
	rng.seed = 31337
	for i in 10:
		var h := rng.randf_range(1.5, 3.5)
		var pillar := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.35
		cm.bottom_radius = 0.42
		cm.height = h
		cm.radial_segments = 8
		pillar.mesh = cm
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.32, 0.33, 0.30).lerp(Color(0.26, 0.34, 0.26), rng.randf())
		mat.roughness = 0.95
		pillar.material_override = mat
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(6.0, 18.0)
		pillar.position = Vector3(cos(ang) * rad, h * 0.5, sin(ang) * rad)
		pillar.rotation = Vector3(rng.randf_range(-0.12, 0.12), rng.randf_range(0.0, TAU), rng.randf_range(-0.12, 0.12))
		_pillars.add_child(pillar)


## 地形の高さ関数。遊べる島（半径22内）は平ら＝ゲームに影響なし。
## 外へ向かってなだらかに丘へ盛り上がる。背景の丘・木・岩がこれを共有して“同じ大地”に乗る。
func _ensure_terrain_noise() -> void:
	if _terrain_noise != null:
		return
	_terrain_noise = FastNoiseLite.new()
	_terrain_noise.seed = 777
	_terrain_noise.frequency = 0.016
	_terrain_noise.fractal_octaves = 3


func _terrain_height(x: float, z: float) -> float:
	_ensure_terrain_noise()
	var r := sqrt(x * x + z * z)
	var rise := clampf((r - 22.0) / 30.0, 0.0, 1.0)   # 島の外周からせり上がる
	var n := _terrain_noise.get_noise_2d(x, z)         # -1..1 のうねり
	return rise * rise * 13.0 + n * rise * 5.0


## うねる丘（島を囲む大地）。平らな遊び場の外側を、なだらかな丘で囲って“広さ”を出す。
## 地面と同じシェーダーを使うので継ぎ目が馴染み、回復すると一緒に緑へ戻る。
## 手続き生成のArrayMesh 1枚＝1ドローコール。壁の外＝背景専用でゲーム性に影響なし。
func _build_terrain_skirt() -> void:
	# 四角い地面プレーンは隠し、この丘メッシュ1枚を“見える大地”にする＝角の継ぎ目が消える。
	# 遊べる中心(半径22内)は高さ0で平ら＝ゲームの当たり判定(GroundBody)とズレない。
	if _ground != null:
		_ground.visible = false
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings := 52
	var segs := 96
	var r0 := 0.0
	var r1 := 98.0
	for i in rings:
		var ta := float(i) / float(rings)
		var tb := float(i + 1) / float(rings)
		var ra := lerpf(r0, r1, ta * ta)   # 近くを細かく、遠くは粗く
		var rb := lerpf(r0, r1, tb * tb)
		for j in segs:
			var a0 := TAU * float(j) / float(segs)
			var a1 := TAU * float(j + 1) / float(segs)
			var p00 := _skirt_vertex(ra, a0)
			var p01 := _skirt_vertex(ra, a1)
			var p10 := _skirt_vertex(rb, a0)
			var p11 := _skirt_vertex(rb, a1)
			_skirt_tri(st, p00, p10, p11)
			_skirt_tri(st, p00, p11, p01)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.name = "TerrainSkirt"
	mi.mesh = st.commit()
	# 地面と同じ質感（回復で緑になるシェーダー）を共有
	mi.material_override = _ground_shader
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)


func _skirt_vertex(r: float, a: float) -> Vector3:
	var x := cos(a) * r
	var z := sin(a) * r
	return Vector3(x, _terrain_height(x, z), z)


func _skirt_tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3) -> void:
	for v in [a, b, c]:
		# 地面(48四方)のUVマッピングに合わせて質感を連続させる
		st.set_uv(Vector2(v.x, v.z) / 48.0 + Vector2(0.5, 0.5))
		st.add_vertex(v)


## 世界を囲む水面（湖）。庭(48四方)が水に浮かぶ島のように見え、一気に“広い風景”になる。
## 地面の外側にだけ見える。波は頂点＆法線をTIMEで揺らし、太陽がきらめく（gl_compatibility可）。
## 参考画像の「川・湖が地平まで続く」オープンワールド感を、外部素材ゼロで出す。
func _build_water() -> void:
	var plane := PlaneMesh.new()
	plane.size = Vector2(600.0, 600.0)
	plane.subdivide_width = 40
	plane.subdivide_depth = 40

	_water_mat = ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode specular_schlick_ggx, cull_disabled;
uniform vec3 shallow : source_color = vec3(0.20, 0.45, 0.52);
uniform vec3 deep : source_color = vec3(0.06, 0.16, 0.24);
uniform float clarity = 0.0;
void vertex() {
	VERTEX.y += sin(TIME * 0.6 + VERTEX.x * 0.12) * 0.06
	          + cos(TIME * 0.5 + VERTEX.z * 0.10) * 0.06;
}
void fragment() {
	vec3 n = NORMAL;
	n += vec3(sin(TIME * 1.3 + VERTEX.x * 1.6) * 0.08, 0.0,
	          cos(TIME * 1.1 + VERTEX.z * 1.6) * 0.08);
	NORMAL = normalize(n);
	float fres = pow(1.0 - clamp(dot(normalize(VIEW), NORMAL), 0.0, 1.0), 3.0);
	vec3 base = mix(deep, shallow, clarity);
	ALBEDO = mix(base, base * 1.5 + vec3(0.12), fres);
	ROUGHNESS = mix(0.14, 0.04, clarity);
	SPECULAR = 1.0;
	METALLIC = 0.0;
	ALPHA = 0.92;
}
"""
	_water_mat.shader = sh

	var mi := MeshInstance3D.new()
	mi.name = "Water"
	mi.mesh = plane
	mi.material_override = _water_mat
	mi.position = Vector3(0.0, -0.5, 0.0)   # 丘のあいだの低い谷に水が見える
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)


## 遠景の山なみ。世界の外周をぐるりと囲む低ポリの山を、霧に溶かして“広い世界”の奥行きに。
## 手前は緑がかり、奥は青灰（空気遠近）。壁の外＝背景専用。1ドローコールで軽い。
func _build_distant_hills() -> void:
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 1.0
	cone.height = 2.0
	cone.radial_segments = 6
	cone.rings = 1
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 1.0
	cone.material = mat

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = cone
	mm.instance_count = 46

	var rng := RandomNumberGenerator.new()
	rng.seed = 5150
	var near := Color(0.34, 0.42, 0.34)   # 手前の山＝緑がかる
	var far := Color(0.52, 0.58, 0.70)    # 奥の山＝空気遠近で青灰
	for i in mm.instance_count:
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(70.0, 150.0)
		var w := rng.randf_range(14.0, 40.0)
		var h := rng.randf_range(14.0, 46.0)
		var b := Basis(Vector3.UP, rng.randf_range(0.0, TAU)).scaled(Vector3(w, h, w))
		# 根元を地平線下に沈めて“連なり”に見せる
		mm.set_instance_transform(i, Transform3D(b, Vector3(cos(ang) * rad, h * 0.5 - 3.0, sin(ang) * rad)))
		var t := clampf((rad - 70.0) / 80.0, 0.0, 1.0)
		mm.set_instance_color(i, near.lerp(far, t))
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "DistantHills"
	mmi.multimesh = mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_hills = mmi
	add_child(mmi)


## 低ポリの木立。うねる丘の上に散らす（背景の森）。まるい木＋とがった木の2種で単調さを消す。
## 参考画像の「森が地平まで続く」感じ。回復で葉が濃く茂る（_on_recovery_changed）。
func _build_trees() -> void:
	_trees = Node3D.new()
	_trees.name = "Trees"
	add_child(_trees)

	var rng := RandomNumberGenerator.new()
	rng.seed = 246813

	# --- 幹（広葉樹・針葉樹で共有） ---
	var trunk := CylinderMesh.new()
	trunk.top_radius = 0.12
	trunk.bottom_radius = 0.18
	trunk.height = 1.0
	trunk.radial_segments = 5
	var tmat := StandardMaterial3D.new()
	tmat.albedo_color = Color(0.30, 0.22, 0.14)
	tmat.roughness = 1.0
	trunk.material = tmat
	var trunk_mm := _new_mm(trunk, TREE_COUNT + CONIFER_COUNT, false)

	# --- 広葉樹の葉（まるい塊） ---
	var leaf := SphereMesh.new()
	leaf.radius = 1.0
	leaf.height = 2.0
	leaf.radial_segments = 6
	leaf.rings = 4
	leaf.material = _vcol_mat()
	var leaf_mm := _new_mm(leaf, TREE_COUNT, true)

	# --- 針葉樹の葉（とがった円錐） ---
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 1.0
	cone.height = 2.6
	cone.radial_segments = 6
	cone.material = _vcol_mat()
	var cone_mm := _new_mm(cone, CONIFER_COUNT, true)

	var ti := 0
	# 広葉樹
	for i in TREE_COUNT:
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(26.0, 88.0)
		var base := _tree_base(cos(ang) * rad, sin(ang) * rad)
		var s := rng.randf_range(1.3, 2.6)
		var yaw := rng.randf_range(0.0, TAU)
		trunk_mm.set_instance_transform(ti, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3(s, s, s)), base + Vector3(0.0, s * 0.5, 0.0)))
		ti += 1
		var ls := s * rng.randf_range(0.9, 1.2)
		leaf_mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3(ls, ls * 1.1, ls)), base + Vector3(0.0, s + ls * 0.5, 0.0)))
		leaf_mm.set_instance_color(i, Color(0.20, 0.38, 0.16).lerp(Color(0.34, 0.52, 0.22), rng.randf()))
	# 針葉樹（少し外側・高地に多い＝森の奥）
	for i in CONIFER_COUNT:
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(34.0, 94.0)
		var base := _tree_base(cos(ang) * rad, sin(ang) * rad)
		var s := rng.randf_range(1.6, 3.4)
		var yaw := rng.randf_range(0.0, TAU)
		trunk_mm.set_instance_transform(ti, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3(s * 0.7, s * 0.7, s * 0.7)), base + Vector3(0.0, s * 0.35, 0.0)))
		ti += 1
		var cs := s * rng.randf_range(0.8, 1.1)
		cone_mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3(cs, cs, cs)), base + Vector3(0.0, s * 0.6 + cs * 1.3, 0.0)))
		cone_mm.set_instance_color(i, Color(0.14, 0.30, 0.16).lerp(Color(0.22, 0.40, 0.20), rng.randf()))

	_add_mmi("TreeTrunks", trunk_mm)
	_add_mmi("TreeFoliage", leaf_mm)
	_add_mmi("Conifers", cone_mm)


## 岩（丘の上のごろた石・大きめ）。地面ディテールを立体にして“自然物”を増やす。
func _build_boulders() -> void:
	var rock := SphereMesh.new()
	rock.radius = 1.0
	rock.height = 1.6
	rock.radial_segments = 6
	rock.rings = 4
	rock.material = _vcol_mat()
	var mm := _new_mm(rock, BOULDER_COUNT, true)
	var rng := RandomNumberGenerator.new()
	rng.seed = 135791
	for i in BOULDER_COUNT:
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(26.0, 92.0)
		var x := cos(ang) * rad
		var z := sin(ang) * rad
		var base := _tree_base(x, z)
		var s := rng.randf_range(0.6, 2.4)
		var b := Basis(Vector3(rng.randf(), rng.randf(), rng.randf()).normalized(), rng.randf_range(0.0, TAU)).scaled(Vector3(s, s * rng.randf_range(0.6, 0.9), s))
		mm.set_instance_transform(i, Transform3D(b, base + Vector3(0.0, s * 0.25, 0.0)))
		var g := rng.randf_range(0.38, 0.56)
		mm.set_instance_color(i, Color(g, g * 0.97, g * 0.9))
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Boulders"
	mmi.multimesh = mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mmi)


## 背景の自然物を丘の上に乗せる共通ヘルパ（地形の高さに合わせる）。
func _tree_base(x: float, z: float) -> Vector3:
	return Vector3(x, _terrain_height(x, z), z)


func _vcol_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = 1.0
	return m


func _new_mm(mesh: Mesh, count: int, colors: bool) -> MultiMesh:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = colors
	mm.mesh = mesh
	mm.instance_count = count
	return mm


func _add_mmi(node_name: String, mm: MultiMesh) -> void:
	var mmi := MultiMeshInstance3D.new()
	mmi.name = node_name
	mmi.multimesh = mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_trees.add_child(mmi)


## 小石。常に散らばっている地面ディテール（回復に関係なく“地面らしさ”を足す）。
func _build_pebbles() -> void:
	var mesh := SphereMesh.new()
	mesh.radius = 0.12
	mesh.height = 0.16
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.95
	mesh.material = mat

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = mesh
	mm.instance_count = 220

	var rng := RandomNumberGenerator.new()
	rng.seed = 424242
	for i in mm.instance_count:
		var x := rng.randf_range(-22.0, 22.0)
		var z := rng.randf_range(-22.0, 22.0)
		var s := rng.randf_range(0.5, 1.6)
		var b := Basis(Vector3.UP, rng.randf_range(0.0, TAU)).scaled(Vector3(s, s * 0.55, s))
		mm.set_instance_transform(i, Transform3D(b, Vector3(x, 0.02, z)))
		var g := rng.randf_range(0.35, 0.6)
		mm.set_instance_color(i, Color(g, g * 0.98, g * 0.92))
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Pebbles"
	mmi.multimesh = mm
	add_child(mmi)


## 下草／植物。回復で茂る。
## assets/plant.glb を置けば“本物のCC0モデル”に自動で差し替わる（無ければ手続きの葉）。
## 配布元: Kenney / Quaternius / Poly Pizza（すべてCC0/無料）。詳細は assets/README.md。
func _build_plants() -> void:
	var mesh := _optional_model_mesh("res://assets/plant.glb")
	var procedural := mesh == null
	if procedural:
		# 手続きの下草：平たい葉を1枚（低ポリ）。本物を置くまでのつなぎ。
		var leaf := SphereMesh.new()
		leaf.radius = 0.16
		leaf.height = 0.08
		var mat := StandardMaterial3D.new()
		mat.vertex_color_use_as_albedo = true
		mat.roughness = 0.9
		leaf.material = mat
		mesh = leaf

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = mesh
	mm.instance_count = 160

	var rng := RandomNumberGenerator.new()
	rng.seed = 71717171
	_plant_mm = mm
	_plant_base = PackedVector3Array()
	_plant_rot = PackedFloat32Array()
	for i in mm.instance_count:
		var x := rng.randf_range(-21.0, 21.0)
		var z := rng.randf_range(-21.0, 21.0)
		_plant_base.append(Vector3(x, 0.06, z))
		_plant_rot.append(rng.randf_range(0.0, TAU))
		var c := Color(0.24, 0.42, 0.16).lerp(Color(0.42, 0.66, 0.28), rng.randf())
		mm.set_instance_color(i, c)
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Plants"
	mmi.multimesh = mm
	add_child(mmi)
	_update_plants(WorldState.recovery)


## assets/plant.glb があれば、その中の最初のメッシュを取り出して返す。無ければ null。
func _optional_model_mesh(path: String) -> Mesh:
	if not ResourceLoader.exists(path):
		return null
	var packed := load(path)
	if packed == null:
		return null
	var scene: Node = packed.instantiate()
	var found: Mesh = null
	for node in _iter_nodes(scene):
		if node is MeshInstance3D and node.mesh != null:
			found = node.mesh
			break
	scene.queue_free()
	return found


func _iter_nodes(root: Node) -> Array:
	var out: Array = [root]
	for c in root.get_children():
		out.append_array(_iter_nodes(c))
	return out


func _update_plants(r: float) -> void:
	if _plant_mm == null:
		return
	var grow := clampf((r - 0.15) / 0.85, 0.0, 1.0)
	for i in _plant_base.size():
		var s := 0.4 + grow          # 回復で茂る
		var b := Basis(Vector3.UP, _plant_rot[i]).scaled(Vector3.ONE * s * maxf(0.01, grow))
		_plant_mm.set_instance_transform(i, Transform3D(b, _plant_base[i]))


## 空・霧・トーン・ブルーム。汚れているほど灰色・濃霧、回復で青空・澄んだ空気。
## トーンマップ(フィルミック)とわずかなブルームで、色が“作り込まれて”見える。
func _setup_sky_fog() -> void:
	var env := Environment.new()
	_sky_mat = ProceduralSkyMaterial.new()
	_sky_mat.sun_angle_max = 30.0
	var sky := Sky.new()
	sky.sky_material = _sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.6

	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 0.98
	env.tonemap_white = 1.1

	env.glow_enabled = true
	env.glow_intensity = 0.28
	env.glow_strength = 0.95
	env.glow_bloom = 0.03
	env.glow_hdr_threshold = 1.25

	# カラーグレーディング：コントラストと彩度を上げて“作り込んだ映える絵”に。
	# （gl_compatibility でも使える。SSAO等は Forward+ 専用なので GRAPHICS.md 参照）
	env.adjustment_enabled = true
	env.adjustment_brightness = 1.03
	env.adjustment_contrast = 1.18
	env.adjustment_saturation = 1.22

	env.fog_enabled = true
	env.fog_light_energy = 1.0
	_env.environment = env


## 太陽。夕方寄りの暖色＋やわらかい影で、のっぺりを避ける。
func _setup_sun() -> void:
	if _sun == null:
		return
	# マジックアワー（夕方寄り）：低い角度の金色の光＋長い影＝いちばん“映える”。
	_sun.rotation_degrees = Vector3(-24.0, 128.0, 0.0)
	_sun.light_color = Color(1.0, 0.83, 0.62)   # 金色
	_sun.light_energy = 1.35
	_sun.shadow_enabled = true
	_sun.directional_shadow_blend_splits = true
	_sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	_sun.shadow_bias = 0.04
	_sun.shadow_normal_bias = 1.2
	_sun.light_specular = 0.8

	# 空の反対側から青い“フィル”を足して、影の中を暗く潰さない＝映画的な色対比。
	if not has_node("Fill"):
		var fill := DirectionalLight3D.new()
		fill.name = "Fill"
		fill.rotation_degrees = Vector3(-30.0, -60.0, 0.0)
		fill.light_color = Color(0.5, 0.66, 0.95)
		fill.light_energy = 0.45
		fill.shadow_enabled = false
		add_child(fill)


## 地面。ノイズで土と芝のムラを出し、平面ののっぺりを消す。回復度で土→芝へ。
func _build_ground() -> void:
	var noise := FastNoiseLite.new()
	noise.frequency = 0.03
	noise.fractal_octaves = 4
	var ntex := NoiseTexture2D.new()
	ntex.width = 256
	ntex.height = 256
	ntex.seamless = true
	ntex.noise = noise

	# 凹凸（ノーマルマップ）。地面に細かい起伏の陰影が出て“質感”が一段上がる。
	var nnoise := FastNoiseLite.new()
	nnoise.frequency = 0.08
	nnoise.fractal_octaves = 3
	var normtex := NoiseTexture2D.new()
	normtex.width = 256
	normtex.height = 256
	normtex.seamless = true
	normtex.as_normal_map = true
	normtex.bump_strength = 3.0
	normtex.noise = nnoise

	_ground_shader = ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
uniform sampler2D noisetex : filter_linear_mipmap, repeat_enable;
uniform sampler2D normaltex : hint_normal, filter_linear_mipmap, repeat_enable;
uniform vec3 soil : source_color = vec3(0.34, 0.27, 0.19);
uniform vec3 grass : source_color = vec3(0.30, 0.55, 0.25);
uniform float greenness = 0.0;
void fragment() {
	float n = texture(noisetex, UV * 9.0).r;
	float n2 = texture(noisetex, UV * 40.0).r;
	vec3 dry = mix(soil * 0.75, soil * 1.15, n);
	vec3 wet = mix(grass * 0.65, grass * 1.20, n);
	vec3 col = mix(dry, wet, greenness);
	col *= mix(0.88, 1.05, n2);         // 細かい粒状感
	ALBEDO = col;
	// 近くほど凹凸を強く、遠くは平ら（ちらつき防止）
	float d = clamp(length(VERTEX) / 24.0, 0.0, 1.0);
	NORMAL_MAP = texture(normaltex, UV * 26.0).rgb;
	NORMAL_MAP_DEPTH = mix(0.9, 0.0, d);
	ROUGHNESS = mix(1.0, 0.78, greenness);
	SPECULAR = 0.3;                     // 濡れたような弱い照り（緑ほど）
}
"""
	_ground_shader.shader = sh
	_ground_shader.set_shader_parameter("noisetex", ntex)
	_ground_shader.set_shader_parameter("normaltex", normtex)
	_ground.material_override = _ground_shader


## 草。回復度で「伸びる」。風で揺れ、根元が濃く穂先が明るい。
func _build_grass() -> void:
	var blade := BoxMesh.new()
	blade.size = Vector3(0.045, 0.3, 0.045)

	var mat := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_disabled;
uniform float wind = 0.10;
void vertex() {
	float base_x = MODEL_MATRIX[3].x;
	float base_z = MODEL_MATRIX[3].z;
	float h = clamp((VERTEX.y + 0.15) / 0.3, 0.0, 1.0);   // 0=根元 1=穂先
	float s = sin(TIME * 1.6 + base_x * 0.6 + base_z * 0.4);
	float c = cos(TIME * 1.2 + base_z * 0.7);
	VERTEX.x += s * wind * h;
	VERTEX.z += c * wind * 0.6 * h;
}
void fragment() {
	float h = clamp((UV.y), 0.0, 1.0);
	// COLOR＝MultiMeshのインスタンス色。根元を暗く、穂先を明るく。
	ALBEDO = COLOR.rgb * mix(0.55, 1.15, 1.0 - UV.y);
	ROUGHNESS = 1.0;
}
"""
	mat.shader = sh
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
		var h := rng.randf_range(0.6, 1.5)
		if x > -3.6 and x < 3.6 and z > -11.5 and z < -6.5:
			h = 0.0   # 排水溝の上には生やさない
		_grass_pos.append(Vector3(x, 0.0, z))
		_grass_h.append(h)
		_grass_yaw.append(rng.randf_range(0.0, TAU))
		var c := Color(0.26, 0.42, 0.16).lerp(Color(0.5, 0.72, 0.32), rng.randf())
		_grass_mm.set_instance_color(i, c)

	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Grass"
	mmi.multimesh = _grass_mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF   # 草の影は重い＆汚いので切る
	_grass_mmi = mmi
	add_child(mmi)
	_update_grass(WorldState.recovery)


## 花。花びららしく平たい形。回復30%から咲き始め100%で満開。
func _build_flowers() -> void:
	var head := CylinderMesh.new()
	head.top_radius = 0.11
	head.bottom_radius = 0.11
	head.height = 0.035
	head.radial_segments = 6
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.6
	mat.emission_enabled = true
	mat.emission = Color(1, 1, 1)
	mat.emission_energy_multiplier = 0.25   # ブルームでほんのり光る
	head.material = mat

	_flower_mm = MultiMesh.new()
	_flower_mm.transform_format = MultiMesh.TRANSFORM_3D
	_flower_mm.use_colors = true
	_flower_mm.mesh = head
	_flower_mm.instance_count = FLOWER_COUNT

	var cols := [Color(0.98, 0.42, 0.55), Color(1.0, 0.86, 0.38), Color(0.95, 0.95, 0.98), Color(0.78, 0.56, 0.95)]
	var rng := RandomNumberGenerator.new()
	rng.seed = 99887766
	for i in FLOWER_COUNT:
		var src: Vector3 = _grass_pos[(i * 11) % _grass_pos.size()]
		var tilt := Basis(Vector3.RIGHT, rng.randf_range(-0.2, 0.2)) * Basis(Vector3.UP, rng.randf_range(0.0, TAU))
		var origin := src + Vector3(0.0, 0.36, 0.0)
		_flower_mm.set_instance_transform(i, Transform3D(tilt, origin))
		_flower_mm.set_instance_color(i, cols[rng.randi() % cols.size()])

	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Flowers"
	mmi.multimesh = _flower_mm
	_flower_mmi = mmi
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
	if _is_ruins():
		_flower_mm.visible_instance_count = 0   # 遺跡に花は咲かない
		return
	var t := clampf((r - 0.3) / 0.7, 0.0, 1.0)
	_flower_mm.visible_instance_count = int(round(FLOWER_COUNT * t))


func _update_sky_fog(r: float) -> void:
	if _is_ruins():
		# 遺跡：薄暗く苔むした空気。回復しても“青空”にはならず、澄んだ翠に。
		if _sky_mat != null:
			_sky_mat.sky_top_color = Color(0.16, 0.20, 0.20).lerp(Color(0.22, 0.34, 0.30), r)
			_sky_mat.sky_horizon_color = Color(0.30, 0.34, 0.30).lerp(Color(0.42, 0.52, 0.42), r)
			_sky_mat.ground_horizon_color = Color(0.24, 0.26, 0.22)
			_sky_mat.ground_bottom_color = Color(0.2, 0.22, 0.2)
		var e := _env.environment
		if e != null:
			e.fog_light_color = Color(0.32, 0.40, 0.34).lerp(Color(0.45, 0.58, 0.48), r)
			e.fog_density = lerpf(0.07, 0.03, r)   # 常にうっすら霧が残る
		return
	if _sky_mat != null:
		# 汚: くすんだ曇天 → 回復: 夕方のマジックアワー（上は青紫、地平は金/桃）
		_sky_mat.sky_top_color = Color(0.30, 0.30, 0.36).lerp(Color(0.20, 0.34, 0.62), r)
		_sky_mat.sky_horizon_color = Color(0.55, 0.50, 0.46).lerp(Color(0.95, 0.66, 0.45), r)
		_sky_mat.sun_angle_max = 22.0
		_sky_mat.sky_energy_multiplier = 1.0
		_sky_mat.ground_horizon_color = WorldState.ground_color()
		_sky_mat.ground_bottom_color = WorldState.ground_color()
	var env := _env.environment
	if env != null:
		# 遠景に金色のもや（大気遠近）で奥行きを出す
		env.fog_light_color = Color(0.56, 0.52, 0.47).lerp(Color(1.0, 0.78, 0.60), r)
		env.fog_density = lerpf(0.055, 0.010, r)


func _on_recovery_changed(_value: float) -> void:
	var r := WorldState.recovery
	if _ground_shader != null:
		_ground_shader.set_shader_parameter("greenness", r)
	if _water_mat != null:
		_water_mat.set_shader_parameter("clarity", r)   # 回復ほど水が澄む
	_update_sky_fog(r)
	_update_grass(r)
	_update_flowers(r)
	_update_plants(r)
	var env := _env.environment
	if env != null:
		env.background_color = WorldState.sky_color()
		env.ambient_light_color = WorldState.sky_color()
