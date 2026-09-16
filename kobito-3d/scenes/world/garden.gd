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
const SeedScene := preload("res://scenes/props/seed.tscn")
const StonePuzzleScript := preload("res://scenes/props/stone_puzzle.gd")
const SwitchPairScript := preload("res://scenes/props/switch_pair.gd")
const ScrubBlobScript := preload("res://scenes/props/scrub_blob.gd")
const CleanRingScript := preload("res://scenes/props/clean_ring.gd")

var _puzzle: Node3D = null
var _switch: Node3D = null
var _blob: Node3D = null
var _ring: Node3D = null

## 8人の子ども（CHARACTERS.md 準拠）。頭のスミレが親を追い、あとはぞろぞろ続く。
## 色・大きさはここ一箇所。順番＝隊列の並び（末尾のつぼみがいちばん小さい）。
const CHILDREN := [
	{"name": "スミレ", "color": Color(0.55, 0.40, 0.70), "scale": 0.68},
	{"name": "カヤ", "color": Color(0.85, 0.50, 0.25), "scale": 0.66},
	{"name": "ソラ", "color": Color(0.50, 0.75, 0.95), "scale": 0.62},
	{"name": "シズク", "color": Color(0.55, 0.80, 0.85), "scale": 0.60},
	{"name": "リン", "color": Color(0.95, 0.55, 0.32), "scale": 0.58},
	{"name": "ラン", "color": Color(0.30, 0.72, 0.66), "scale": 0.58},
	{"name": "マメ", "color": Color(0.93, 0.80, 0.34), "scale": 0.56},
	{"name": "つぼみ", "color": Color(0.95, 0.65, 0.75), "scale": 0.46},
]

## 母（妻）。家族の隊列の先頭で父（プレイヤー）を追い、子どもたちは母に続く。
## role="adult" で大人の見た目＝ロングヘア・スカート・無精ひげなし（kobito_look）。
const MOTHER := {"name": "母", "color": Color(0.88, 0.44, 0.52), "scale": 0.82}

const SPAWN_POINTS := [
	Vector3(0.0, 0.6, 0.0),
	Vector3(1.6, 0.6, 0.6),
	Vector3(-1.6, 0.6, 0.6),
	Vector3(0.0, 0.6, 1.8),
]
const BUG_SPAWN_POINTS := [
	Vector3(22.0, 0.6, -14.0),
	Vector3(-20.0, 0.6, -18.0),
	Vector3(24.0, 0.6, 16.0),
	Vector3(-24.0, 0.6, 14.0),
	Vector3(0.0, 0.6, -26.0),
	Vector3(14.0, 0.6, 24.0),
]
const MAX_BUGS := 8
const MAX_ALLIES := 6      # 画面が味方だらけにならない上限（軽さ優先）

var _bug_serial := 0
var _ally_serial := 0
var _spawn_timer := 0.0
var _antisoftlock_t := 0.0   # 詰み防止の即湧きクールダウン
var _allies: Node3D = null   # なかま虫の入れ物（_ready で作る＝シーン編集不要）

@onready var _players: Node3D = $Players
@onready var _bugs: Node3D = $Bugs
@onready var _children: Node3D = $Children
@onready var _ground: MeshInstance3D = $Ground
@onready var _env: WorldEnvironment = $WorldEnvironment
@onready var _sun: DirectionalLight3D = $Sun

# 見た目（すべて手続き生成＝外部素材ゼロ・スマホ安全）
const GRASS_COUNT := 5200        # グラフィック最大：芝を密に（MultiMesh 1ドローコール）
const FLOWER_COUNT := 240
var _sky_mat: ProceduralSkyMaterial = null
var _cloud_mat: ShaderMaterial = null   # 空のやわらかい雲（回復で色・量が変わる）
var _cloud_mmi: MeshInstance3D = null
var _mote_mm: MultiMesh = null          # 空気に舞う花粉/ちり（回復で色・数が変わる）
var _mote_mat: ShaderMaterial = null
var _mote_n := 0
var _crit_mm: MultiMesh = null          # 地面の小さな生き物（回復で数が増える）
var _crit_n := 0
var _ground_shader: ShaderMaterial = null
var _grass_mm: MultiMesh = null
var _flower_mm: MultiMesh = null
var _grass_pos := PackedVector3Array()
var _grass_h := PackedFloat32Array()
var _grass_yaw := PackedFloat32Array()
var _grass_col := PackedColorArray()   # 各草の“みずみずしい緑”。回復で枯れ色→この色へ寄せる
var _plant_mm: MultiMesh = null
var _plant_base := PackedVector3Array()
var _plant_rot := PackedFloat32Array()
var _grass_mmi: MultiMeshInstance3D = null
var _flower_mmi: MultiMeshInstance3D = null
var _grass_mat: ShaderMaterial = null   # 踏み分け（プレイヤー位置）を毎フレーム渡すため保持
var _pillars: Node3D = null

# 遠景（オープンワールドの“広さ”を出す背景）：山なみ・水面・木立・うねる丘。
# すべて壁(半径24)の外＝背景専用。MultiMeshで各1ドローコール＝スマホでも軽い。
const TREE_COUNT := 150       # 広葉樹（まるい木）
const CONIFER_COUNT := 130    # 針葉樹（とがった木）
const BOULDER_COUNT := 110    # 岩
var _hills: MultiMeshInstance3D = null
var _house: Node3D = null   # 第5章「いえの中」の手続き屋内（床/壁/窓/梁/家具）。house舞台だけ表示
var _sky_clouds: MultiMeshInstance3D = null   # 第6章「そら」の雲の床（ふわふわの雲海）。sky舞台だけ表示
var _sky_rays: Node3D = null   # 第6章「そら」＝雲を貫くサンシャフト（光芒）。sky舞台だけ表示
var _sky_ray_mat: StandardMaterial3D = null   # 光芒の共有マテリアル（回復で濃さを変える）
var _water_mat: ShaderMaterial = null
# 第3章の“浅い水”：プレイ面をおおう軽い半透明シート（web でも軽い1メッシュ）。
# にごり→すきとおる を 回復度で表現。水辺(biome=="water")のときだけ出す。
var _water_lite: MeshInstance3D = null
var _water_lite_mat: StandardMaterial3D = null
var _fish_t := 2.0   # 次の魚の跳ねまでのカウント
var _trees: Node3D = null
# 木の葉を回復度で塗り替えるための保持（葉の色は建てたとき1回きりだと、
# 汚れた世界でも森が青々として矛盾する→回復にあわせて病んだ色↔みずみずしい緑へ）。
var _leaf_mm: MultiMesh = null
var _cone_mm: MultiMesh = null
var _leaf_tints := PackedFloat32Array()
var _cone_tints := PackedFloat32Array()
var _terrain_noise: FastNoiseLite = null

# 蝶（回復するほど増えて舞う“命”）。純見た目・非同期（各自の画面でふわふわ飛ぶ）。
# MultiMesh 1体＝1ドローコール。羽ばたきは頂点シェーダ（CPU負荷なし）、
# 飛行経路だけ毎フレームCPUで更新（数十匹＝軽い）。
const BUTTERFLY_COUNT := 30
var _bfly_mm: MultiMesh = null
var _bfly_center := PackedVector3Array()
var _bfly_radius := PackedFloat32Array()
var _bfly_speed := PackedFloat32Array()
var _bfly_phase := PackedFloat32Array()
var _bfly_bob := PackedFloat32Array()
var _anim_t := 0.0

# 接地影（ブロブシャドウ）。Webは実影オフで“紙人形が浮いて見える”のを、
# 足元のやわらかい影で解消。全員ぶんを MultiMesh 1個＝1ドローコールで描く（軽い）。
const SHADOW_MAX := 48
const SHADOW_GROUPS := ["player", "child", "ally", "bug"]   # 毎フレーム配列を作らない＝GCポーズを減らす
var _shadow_mm: MultiMesh = null

# 舞台(biome)。"garden"=庭 / "ruins"=遺跡。main が session 開始時に設定。
var biome := "garden"

# 舞台ごとの見た目パラメータを1箇所に集約（＝新しい舞台は1エントリ追加で足せる）。
# 数値の意味は _apply_biome / _update_sky_fog / _update_flowers / _update_butterfly_count 参照。
# 回復で変化する色は [汚れ(r=0), 満開(r=1)] の2点、静的な値は単体で持つ。
# ※太陽の“回復リンク”だけは Net.world_biome を見る既存仕様のため別扱い（_on_recovery_changed）。
const BIOMES := {
	"garden": {
		"pillars": false, "grass_frac": 1.0, "flowers": true, "tree_frac": 1.0, "bfly_frac": 1.0,
		"soil": Color(0.30, 0.31, 0.26), "grass_col": Color(0.30, 0.55, 0.25),
		"sun_c": Color(1.0, 0.95, 0.86), "sun_e": 1.15,
		"water_shallow": Color(0.20, 0.45, 0.52), "water_deep": Color(0.06, 0.16, 0.24),
		"sky_top": [Color(0.34, 0.38, 0.44), Color(0.20, 0.34, 0.62)],
		"sky_horizon": [Color(0.58, 0.58, 0.56), Color(0.95, 0.66, 0.45)],
		"fog_col": [Color(0.56, 0.58, 0.57), Color(0.95, 0.8, 0.66)],
		"fog_d": [0.028, 0.006],
	},
	"water": {
		# 第3章「にごった みずべ」：砂の岸辺＋浅い水。回復で水が澄む（にごり→すきとおる）。
		"pillars": false, "grass_frac": 0.5, "flowers": true, "tree_frac": 0.5, "bfly_frac": 0.7,
		"soil": Color(0.44, 0.41, 0.31), "grass_col": Color(0.34, 0.52, 0.34),
		"sun_c": Color(0.90, 0.95, 1.0), "sun_e": 1.1,
		"water_shallow": Color(0.24, 0.50, 0.55), "water_deep": Color(0.08, 0.20, 0.28),
		"sky_top": [Color(0.30, 0.40, 0.52), Color(0.34, 0.55, 0.72)],
		"sky_horizon": [Color(0.55, 0.62, 0.62), Color(0.76, 0.86, 0.86)],
		"fog_col": [Color(0.50, 0.58, 0.60), Color(0.72, 0.83, 0.86)],
		"fog_d": [0.03, 0.008],
	},
	"sky": {
		# 第6章「そら」：雲の上の高い空。飛行で巡る。きれいにするほど 青空〜金色の夕やけへ。
		"pillars": false, "grass_frac": 0.0, "flowers": false, "tree_frac": 0.0, "bfly_frac": 1.0,
		# 雲の床は 少し青く・濃いめに＝白い小人が埋もれず、雪原でなく“空の上”に見える。
		"soil": Color(0.70, 0.80, 0.95), "grass_col": Color(0.80, 0.88, 1.0),
		"sun_c": Color(1.0, 0.96, 0.86), "sun_e": 1.2,
		"water_shallow": Color(0.55, 0.7, 0.85), "water_deep": Color(0.4, 0.55, 0.75),
		"sky_top": [Color(0.34, 0.5, 0.76), Color(0.45, 0.63, 0.92)],
		"sky_horizon": [Color(0.7, 0.78, 0.85), Color(0.99, 0.82, 0.58)],
		# もや(汚れ時)は 白飛びしないよう 灰青く・薄めに＝キャラとゴミの輪郭が残る。
		"fog_col": [Color(0.64, 0.72, 0.84), Color(0.99, 0.9, 0.78)],
		"fog_d": [0.014, 0.006],
	},
	"house": {
		# 第5章「いえの なか」：小人サイズの薄暗い室内（木の床・ホコリ）。掃除すると 明るく澄む。
		"pillars": false, "grass_frac": 0.0, "flowers": false, "tree_frac": 0.0, "bfly_frac": 0.6,
		"soil": Color(0.46, 0.35, 0.23), "grass_col": Color(0.42, 0.32, 0.22),
		"sun_c": Color(1.0, 0.9, 0.74), "sun_e": 0.75,
		"water_shallow": Color(0.30, 0.28, 0.24), "water_deep": Color(0.14, 0.12, 0.10),
		"sky_top": [Color(0.18, 0.15, 0.13), Color(0.27, 0.23, 0.19)],
		"sky_horizon": [Color(0.34, 0.28, 0.22), Color(0.52, 0.44, 0.34)],
		"fog_col": [Color(0.33, 0.27, 0.22), Color(0.52, 0.45, 0.37)],
		"fog_d": [0.05, 0.02],
	},
	"night": {
		# 第4章「よるの もり」：暗い夜の森。きれいにするほど 月あかりが差して 明るくなる。
		"pillars": false, "grass_frac": 0.6, "flowers": false, "tree_frac": 1.0, "bfly_frac": 0.4,
		# 汚れ時でも 真っ黒に潰れないよう 床・月あかり・空(＝環境光源)を底上げ＝
		# キャラ/地面/ゴミが見える“暗い夜”に（黒画面ではなく）。きれいにすると さらに月が差す。
		"soil": Color(0.20, 0.22, 0.25), "grass_col": Color(0.18, 0.30, 0.24),
		"sun_c": Color(0.5, 0.55, 0.72), "sun_e": 0.72,
		"water_shallow": Color(0.10, 0.16, 0.22), "water_deep": Color(0.04, 0.08, 0.14),
		"sky_top": [Color(0.10, 0.11, 0.17), Color(0.10, 0.12, 0.22)],
		"sky_horizon": [Color(0.16, 0.18, 0.26), Color(0.22, 0.24, 0.36)],
		"fog_col": [Color(0.13, 0.15, 0.22), Color(0.18, 0.22, 0.34)],
		"fog_d": [0.05, 0.02],
	},
	"ruins": {
		"pillars": true, "grass_frac": 0.28, "flowers": false, "tree_frac": 0.35, "bfly_frac": 0.4,
		"soil": Color(0.28, 0.28, 0.26), "grass_col": Color(0.30, 0.42, 0.28),
		"sun_c": Color(0.7, 0.78, 0.72), "sun_e": 0.8,
		"water_shallow": Color(0.22, 0.30, 0.28), "water_deep": Color(0.06, 0.12, 0.12),
		"sky_top": [Color(0.16, 0.20, 0.20), Color(0.22, 0.34, 0.30)],
		"sky_horizon": [Color(0.30, 0.34, 0.30), Color(0.42, 0.52, 0.42)],
		"gnd_h": Color(0.24, 0.26, 0.22), "gnd_b": Color(0.2, 0.22, 0.2),
		"fog_col": [Color(0.32, 0.40, 0.34), Color(0.45, 0.58, 0.48)],
		"fog_d": [0.07, 0.03],
	},
}


## 現在の舞台の設定辞書。未知の舞台は庭にフォールバック。
func _cfg() -> Dictionary:
	return BIOMES.get(biome, BIOMES["garden"])

# ── 画質ティア（サクサク優先）───────────────────────────────
# 実行環境ごとに草花・木・蝶の“実際に作る数”を落とす。Web は特に軽く。
# きれい版(Forward+/PC)だけフル密度。ドローコールは MultiMesh で各1のままなので、
# 効くのは主に「頂点数・生成コスト・影・MSAA」＝体感のサクサクさ。
var _q := 1.0
var _grass_n := GRASS_COUNT
var _flower_n := FLOWER_COUNT
var _tree_n := TREE_COUNT
var _conifer_n := CONIFER_COUNT
var _boulder_n := BOULDER_COUNT
var _bfly_n := BUTTERFLY_COUNT


## 実行環境を見て密度スケール _q を決め、各“実数”を確定する。
func _detect_quality() -> void:
	var method := RenderingServer.get_current_rendering_method()
	if OS.has_feature("web"):
		_q = 0.12                       # ブラウザは最優先で軽く（固まり防止）
	elif method == "forward_plus":
		_q = 1.0                        # PCきれい版＝フル密度
	elif method == "mobile":
		_q = 0.4                        # スマホ/Vulkanモバイル
	else:
		_q = 0.5                        # その他（互換モードのPCなど）
	_grass_n = maxi(400, int(GRASS_COUNT * _q))
	_flower_n = maxi(24, int(FLOWER_COUNT * _q))
	_tree_n = maxi(24, int(TREE_COUNT * _q))
	_conifer_n = maxi(18, int(CONIFER_COUNT * _q))
	_boulder_n = maxi(16, int(BOULDER_COUNT * _q))
	_bfly_n = maxi(8, int(BUTTERFLY_COUNT * maxf(_q, 0.4)))
	# Web の軽量化：MSAA オフ／蝶を最小／“揺れる草”は完全オフ（cull_disabled の頂点アニメが重い）。
	# ※レンダー解像度スケーリング(scaling_3d)は互換レンダラー(Web)で3D画面が真っ黒になり
	#   “始まらない”ように見える不具合があるため使わない。
	if OS.has_feature("web"):
		_grass_n = 150   # 0にすると花の配置(_grass_pos参照)がゼロ除算で庭ごと落ちる。少数で軽く保つ。
		_bfly_n = 6
		var vp := get_viewport()
		if vp != null:
			vp.msaa_3d = Viewport.MSAA_DISABLED


func _ready() -> void:
	add_to_group("garden")   # bug.gd が「なかま」を湧かす時に呼び出せるように
	_allies = Node3D.new()
	_allies.name = "Allies"
	add_child(_allies)
	_setup_visuals()
	WorldState.recovery_changed.connect(_on_recovery_changed)
	Net.roster_changed.connect(_reconcile_players)
	$CleanupZone.body_entered.connect(_on_cleanup_zone_entered)
	if multiplayer.has_multiplayer_peer():
		multiplayer.peer_connected.connect(_on_peer_connected)
	# 章の山場：群れ(ウェーブ)と女王アリ(中ボス)は Chapter からの合図で湧かす
	Chapter.spawn_wave.connect(_on_chapter_wave)
	Chapter.spawn_boss.connect(_on_chapter_boss)
	_spawn_puzzle()
	_build_beacon()
	Chapter.guide_changed.connect(_on_guide_changed)
	_on_recovery_changed(WorldState.recovery)
	_reconcile_players()
	if _is_server():
		_spawn_children()
		_spawn_seeds()


## 遺跡の石版パズル（順番に踏む）を庭の一角に置く。全員がローカルに組み立て、
## 判定はサーバが持つ。まずは1つで“謎解きの手触り”を確かめる（M5の入口）。
func _spawn_puzzle() -> void:
	_puzzle = Node3D.new()
	_puzzle.set_script(StonePuzzleScript)
	_puzzle.name = "StonePuzzle"
	_puzzle.position = Vector3(-27.0, 0.0, 20.0)   # 西の奥（探索の目的地）
	add_child(_puzzle)

	# 同時スイッチ（協力／ソロは子NPCが相方）
	_switch = Node3D.new()
	_switch.set_script(SwitchPairScript)
	_switch.name = "SwitchPair"
	_switch.position = Vector3(28.0, 0.0, -8.0)    # 東の奥
	add_child(_switch)

	# おそうじリレー（つかむ→きれいに）。ソロはなかまが押さえ役、2人は役割分担。
	_blob = Node3D.new()
	_blob.set_script(ScrubBlobScript)
	_blob.name = "ScrubBlob"
	_blob.position = Vector3(6.0, 0.0, 14.0)       # 拠点の近く（最初に出会う謎解き）
	add_child(_blob)

	# きれいの輪（ぜんぶ同時にきれいに保つ段取りの謎解き）。ソロはなかまが押さえ役。
	_ring = Node3D.new()
	_ring.set_script(CleanRingScript)
	_ring.name = "CleanRing"
	_ring.position = Vector3(-14.0, 0.0, -22.0)    # 北西の広場（少し歩いた先）
	add_child(_ring)


func _process(delta: float) -> void:
	_update_butterflies(delta)   # 見た目だけ＝全員の画面で回す（サーバ判定の前）
	_update_beacon(delta)        # 道しるべの光の柱をふわっと動かす（見た目・全員）
	_update_actor_shadows()      # 足元の接地影（全アクター・見た目のみ）
	_update_water_life(delta)    # みずべ：魚の跳ね＋波紋（見た目・全員）＝生きた水面
	_update_grass_tread()        # 草の踏み分け：プレイヤー位置をシェーダへ（見た目・全員）
	if not _is_server():
		return
	_spawn_timer -= delta
	if _spawn_timer <= 0.0:
		_spawn_timer = WorldState.spawn_interval()
		# 掃除・会話の“静かな場面”では まわりから虫を湧かせない＝落ち着いて進められる。
		if Chapter.ambient_spawn_ok():
			_spawn_bug()

	# ★詰み防止★「虫を癒やす目的」なのに敵がほぼ居ない → プレイヤーの近くへ即湧き。
	# 以前は遠い固定地点にゆっくり湧き、最後の数体が見つからず“詰んだ”ように見えた。
	if Chapter.wants_enemies() and _live_bug_count() < 2:
		_antisoftlock_t -= delta
		if _antisoftlock_t <= 0.0:
			_antisoftlock_t = 1.5
			_spawn_bug_near_player()
	else:
		_antisoftlock_t = 0.0


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
		# 現在HPも渡す＝後から参加した画面で「ボスが一瞬 満タン」に見えるのを防ぐ。
		# レア個体フラグも渡す＝後から参加した画面でも 金のオーラが正しく出る（漏れ修正）。
		rpc_id(id, "_remote_spawn_bug", int(bug.name.trim_prefix("Bug")), bug.stats_path, bug.global_position, int(bug.hp), bool(bug.get("_rare")))
	# 今いる「なかま虫」も配る（後から参加した人の画面にも味方が居るように）
	if _allies != null:
		for ally in _allies.get_children():
			rpc_id(id, "_remote_spawn_ally", int(ally.name.trim_prefix("Ally")), ally.owner_id, ally.tint, ally.global_position, ally.species)
	# 母＋子ども。母は専用RPC、子は番号だけ送れば相手が同じ子を組み立てられる。
	if _children.has_node("Mother"):
		rpc_id(id, "_remote_spawn_mother")
	for child in _children.get_children():
		if child.name == "Mother":
			continue
		rpc_id(id, "_remote_spawn_child", int(child.name.trim_prefix("Child")))
	# 石版パズル・同時スイッチの今の状態も配る
	if _puzzle != null and _puzzle.has_method("sync_to"):
		_puzzle.sync_to(id)
	if _switch != null and _switch.has_method("sync_to"):
		_switch.sync_to(id)
	if _ring != null and _ring.has_method("sync_to"):
		_ring.sync_to(id)
	# まだ拾われていない種のかけらを配る
	for s in get_tree().get_nodes_in_group("seed"):
		if s.get_parent() == self:
			rpc_id(id, "_remote_spawn_seed", int(s.name.trim_prefix("Seed")), s.global_position)
	# 片づけ済みのゴミを「もう無い」と伝える（新規ロードの庭には5個とも復活しているため）
	for t in get_tree().get_nodes_in_group("trash_all"):
		if t.has_method("sync_to"):
			t.sync_to(id)
	# 今の章の目的・道しるべを配る（後発参加者にも「何をすべきか」を出す）
	if Chapter.has_method("send_to"):
		Chapter.send_to(id)


# ------------------------------------------------------------ 子ども（追従隊列）

func _spawn_children() -> void:
	if _children.get_child_count() > 0:
		return
	rpc("_remote_spawn_mother")
	for i in CHILDREN.size():
		rpc("_remote_spawn_child", i)


@rpc("authority", "call_local", "reliable")
func _remote_spawn_mother() -> void:
	if _children.has_node("Mother"):
		return
	var mom := ChildScene.instantiate()
	mom.name = "Mother"
	mom.child_name = MOTHER["name"]
	mom.body_color = MOTHER["color"]
	mom.body_scale = MOTHER["scale"]
	mom.role = "adult"
	mom.follows_player = true          # 母は父（いちばん近いプレイヤー）を追う
	mom.follow_spacing = 3.4           # しっかり離れて追う＝カメラ（後方）を家族でふさがない
	_children.add_child(mom)
	mom.global_position = SPAWN_POINTS[0] + Vector3(0.6, 0.0, 0.8)


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
	# 頭（0番＝スミレ）は母を追い（母が居なければ親）、あとは前の子を追う
	if index == 0:
		if _children.has_node("Mother"):
			child.leader_path = NodePath("../Mother")
		else:
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


# ------------------------------------------------------------ 収集（種のかけら）
#
# マップの各所に散らばる“寄り道のご褒美”。集めると少し緑が戻り、章の進行が数える。

const SEED_POINTS := [
	Vector3(26.0, 0.6, 22.0),
	Vector3(-24.0, 0.6, 26.0),
	Vector3(28.0, 0.6, -22.0),
	Vector3(-28.0, 0.6, -18.0),
	Vector3(12.0, 0.6, 30.0),
	Vector3(-10.0, 0.6, -30.0),
]


func _spawn_seeds() -> void:
	for i in SEED_POINTS.size():
		rpc("_remote_spawn_seed", i, SEED_POINTS[i])


@rpc("authority", "call_local", "reliable")
func _remote_spawn_seed(index: int, pos: Vector3) -> void:
	if has_node("Seed%d" % index):
		return
	var s := SeedScene.instantiate()
	s.name = "Seed%d" % index
	add_child(s)
	s.global_position = pos


# ------------------------------------------------------------ 章の山場（群れ・中ボス）

## 静かな場面（会話・エンディング・みどり回復）に入るとき、残っている雑魚を静かに浄化して
## 片づける＝ボス撃破後のミニオンが余韻やエンディングまで攻撃し続けるのを防ぐ。中ボスは残す。
func purify_lingering_bugs() -> void:
	if not _is_server():
		return
	for b in get_tree().get_nodes_in_group("bug"):
		var st: Variant = b.get("stats")
		if st != null and not st.is_midboss:
			b.rpc("_remote_healed")


## 群れ（ウェーブ）：一気に敵を湧かせる。Chapter の合図で。
func _on_chapter_wave(n: int) -> void:
	if not _is_server():
		return
	for i in n:
		_spawn_bug()


## ボス（女王アリ）を1体。Chapter の合図で。
## ★プレイヤーの目の前に出す★ 以前は舞台の奥(z=-30／北の壁ぎわ)に湧いていたため
## 「ラスボスが出てこない」ように見えていた。必ず視界に入る手前へ、迫り上がるように出す。
func _on_chapter_boss() -> void:
	if not _is_server():
		return
	_bug_serial += 1
	var pos := Vector3(0.0, 1.0, -14.0)   # 保険（プレイヤーが取れないとき）
	var pl := _any_player()
	if pl != null:
		var fwd: Vector3 = -pl.global_transform.basis.z   # プレイヤーが向いている前方
		fwd.y = 0.0
		if fwd.length() < 0.1:
			fwd = Vector3(0.0, 0.0, -1.0)
		pos = pl.global_position + fwd.normalized() * 9.0
		pos.y = 1.0
		pos.x = clampf(pos.x, -30.0, 30.0)   # 壁にめり込まない範囲へ
		pos.z = clampf(pos.z, -30.0, 30.0)
	# 章ごとのボス：第1章＝女王アリ、第2章＝ヘドロの主、第3章(みずべ)＝タガメ。
	# 舞台(biome)と章(beat)で出し分け＝クライマックスごとに“ちがう主”。
	var boss_path := "res://data/queen_ant.tres"
	if Net.world_biome == "water":
		boss_path = "res://data/tagame.tres"
	elif Net.world_biome == "night":
		boss_path = "res://data/moth.tres"
	elif Net.world_biome == "house":
		boss_path = "res://data/dustlord.tres"
	elif Net.world_biome == "sky":
		boss_path = "res://data/ageha.tres"
	elif Chapter.beat >= 10:
		boss_path = "res://data/sludge_lord.tres"
	rpc("_remote_spawn_bug", _bug_serial, boss_path, pos)


## サーバ側で「誰か1人」のプレイヤーを返す（ボスの出現位置決め用）。
func _any_player() -> Node3D:
	for p in get_tree().get_nodes_in_group("player"):
		return p as Node3D
	return null


## ボスが生み出す小さな虫（アリ）。戦闘を賑やかにしつつ、増えすぎて理不尽/重く
## ならないよう「雑魚の数」に上限を設ける。指定位置(ボスの周り)に1体湧かせる。
const MAX_BOSS_MINIONS := 14
const MAX_BOSS_MINIONS_WEB := 9   # Webは描画負荷を抑えるため少なめ
func spawn_minion(pos: Vector3) -> bool:
	if not _is_server():
		return false
	var cap := MAX_BOSS_MINIONS_WEB if OS.has_feature("web") else MAX_BOSS_MINIONS
	if _live_bug_count() >= cap:
		return false
	_bug_serial += 1
	pos.x = clampf(pos.x, -33.0, 33.0)
	pos.z = clampf(pos.z, -33.0, 33.0)
	rpc("_remote_spawn_bug", _bug_serial, "res://data/ant.tres", pos)
	return true


# ------------------------------------------------------------ 敵

func _spawn_bug() -> void:
	if _bugs.get_child_count() >= MAX_BUGS:
		return
	_bug_serial += 1
	# ★プレイヤーの周りに湧かせる★（遠い固定地点だと最後の数体が見つからず“詰み”に見えた）。
	var pos := _ring_pos_near_player(10.0, 16.0)
	var rare := randf() < 0.03   # 約3%＝たまに出会える隠しレア個体（普通の湧きのみ・ボス/雑魚召喚は除外）
	rpc("_remote_spawn_bug", _bug_serial, _pick_stats_path(), pos, -1, rare)


## 湧かせる虫の種類を選ぶ。
## ★まだ授かっていない「飛行パーツ」を持つ虫を優先的に混ぜる★
## ＝バッタ/テントウ/チョウ/トンボ/ハチ を癒やすと飛行が段階解禁される（以前は
## アリ/コガネムシしか湧かず、飛行が永久に解禁されない死にコードだった）。
const PART_BUGS := {
	"hop": "batta", "float": "tentou", "glide": "chou", "hover": "tonbo", "lift": "hachi",
}
func _pick_stats_path() -> String:
	# 章の進行で「今 出てよい種類」に限定＝章ごとに敵が少しずつ増える導入。
	var allowed: Array = ["ant"]
	if Chapter.has_method("allowed_bugs"):
		var a: Array = Chapter.allowed_bugs()
		if not a.is_empty():
			allowed = a
	# ① まだ授かっていない飛行パーツを持つ虫が pool にいれば、4割で優先（段階解禁）。
	var missing: Array = []
	for part in PART_BUGS:
		if not WorldState.has_power(part) and PART_BUGS[part] in allowed:
			missing.append(PART_BUGS[part])
	if not missing.is_empty() and randf() < 0.4:
		return "res://data/%s.tres" % missing[randi() % missing.size()]
	# ② 序盤(recovery<0.2)はアリ多めで優しく。
	if WorldState.recovery < 0.2 and "ant" in allowed and randf() < 0.7:
		return "res://data/ant.tres"
	# ③ 硬いコガネムシは回復が進むほど出にくく＝掃除の手応え。
	var pool: Array = allowed.duplicate()
	if "beetle" in pool and randf() > 0.35 + WorldState.recovery * 0.5:
		pool.erase("beetle")
	if pool.is_empty():
		return "res://data/ant.tres"
	return "res://data/%s.tres" % pool[randi() % pool.size()]


## 詰み防止：プレイヤーのすぐ近くにアリを1体。すぐ見つかる距離に出す。
func _spawn_bug_near_player() -> void:
	if _live_bug_count() >= MAX_BUGS:
		return
	_bug_serial += 1
	rpc("_remote_spawn_bug", _bug_serial, "res://data/ant.tres", _ring_pos_near_player(7.0, 11.0))


## プレイヤーを中心にした円周上の湧き位置（壁の内側にclamp）。プレイヤーが居なければ中央。
func _ring_pos_near_player(min_r: float, max_r: float) -> Vector3:
	var center := Vector3.ZERO
	var pl := _any_player()
	if pl != null:
		center = pl.global_position
	var a := randf() * TAU
	var r := randf_range(min_r, max_r)
	var p := center + Vector3(cos(a) * r, 0.6, sin(a) * r)
	p.x = clampf(p.x, -33.0, 33.0)
	p.z = clampf(p.z, -33.0, 33.0)
	return p


## 中ボス以外（＝ふつうの虫）の生存数。
func _live_bug_count() -> int:
	var n := 0
	for b in _bugs.get_children():
		var st: Variant = b.get("stats")
		if st != null and not st.is_midboss:
			n += 1
	return n


@rpc("authority", "call_local", "reliable")
func _remote_spawn_bug(serial: int, stats_path: String, pos: Vector3, hp: int = -1, rare: bool = false) -> void:
	if _bugs.has_node("Bug%d" % serial):
		return   # 二重生成ガード（他のspawn RPCと同じ形＝再送/順序入替でも重複しない）
	var bug := BugScene.instantiate()
	bug.name = "Bug%d" % serial
	bug.stats = load(stats_path)
	bug.stats_path = stats_path
	_bugs.add_child(bug)
	bug.global_position = pos
	if rare and bug.has_method("make_rare"):
		bug.make_rare()   # 隠し要素：きらめくレア個体（全員の画面で同じ個体がレアに）
	if hp >= 0:
		bug.set_hp(hp)   # 参加時の再送＝現在HPを反映（満タン表示のちらつき防止）
	# 中ボス出現は“来た！”の警告音を全員に（新規出現時のみ＝参加時の再送 hp>=0 では鳴らさない）。
	elif bug.stats != null and bug.stats.is_midboss:
		Sfx.play("alert", -5.0)
		# 各自の画面で ボス出現の映画的カメラ（注視点をボスへ寄せる＋画角引き＋ランブル）。
		for p in get_tree().get_nodes_in_group("player"):
			if p.get("is_local") and p.has_method("boss_entrance"):
				p.boss_entrance(pos)


# ------------------------------------------------------------ なかま（浄化された虫）
#
# 虫を癒やしきると、その場に「なかま虫」が生まれてプレイヤーについてくる。
# テーマ「敵は救えば味方になる」を遊びで見せる。bug.gd が cleanse 完了時に spawn_ally を呼ぶ。

## species＝癒やした虫の種類id（例 "beetle"）。空なら仕掛け由来の汎用なかま。
## 種によって見た目（甲羅・羽）と手伝い方（飛ぶ敵に届く／じょうぶ）が変わる。
func spawn_ally(pos: Vector3, owner_id: int, col: Color, species: String = "") -> void:
	if not _is_server():
		return
	if _allies == null or _allies.get_child_count() >= MAX_ALLIES:
		return
	_ally_serial += 1
	rpc("_remote_spawn_ally", _ally_serial, owner_id, col, pos, species)


@rpc("authority", "call_local", "reliable")
func _remote_spawn_ally(serial: int, owner_id: int, col: Color, pos: Vector3, species: String = "") -> void:
	if _allies == null or _allies.has_node("Ally%d" % serial):
		return
	var a := Ally.new()
	a.name = "Ally%d" % serial
	a.setup(owner_id, col, species)
	_allies.add_child(a)
	a.global_position = pos + Vector3(0.0, 0.4, 0.0)
	WorldState.notice.emit("なかまが ふえた！")   # 全員の画面で同時に（call_local）


# ------------------------------------------------------------ 道しるべ（光の柱）
#
# 「次にどこへ行けばいいか」を世界の中で光の柱＋足元の輪で示す。Chapter が対象位置を配る。
# 見た目だけ＝各自の画面で位置を追う。ふわっと上下＋ゆっくり回転で“ここだよ”と主張する。

var _beacon: Node3D = null
var _beacon_beam: MeshInstance3D = null
var _beacon_ring: MeshInstance3D = null
var _beacon_beam_mat: StandardMaterial3D = null
var _beacon_ring_mat: StandardMaterial3D = null
var _beacon_t := 0.0

func _build_beacon() -> void:
	_beacon = Node3D.new()
	_beacon.name = "Beacon"
	add_child(_beacon)
	# 光の柱（ごく細く高い・発光・裏面も見える）。遠くからでも“あそこ”と分かる細い光。
	_beacon_beam = MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.04
	cyl.bottom_radius = 0.09
	cyl.height = 4.4
	cyl.radial_segments = 8
	_beacon_beam.mesh = cyl
	_beacon_beam.position.y = 2.3
	_beacon_beam_mat = StandardMaterial3D.new()
	_beacon_beam_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_beacon_beam_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_beacon_beam_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	_beacon_beam_mat.emission_enabled = true
	_beacon_beam.material_override = _beacon_beam_mat
	_beacon.add_child(_beacon_beam)
	# 足元の光の輪
	_beacon_ring = MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.7
	tm.outer_radius = 1.0
	tm.rings = 6
	tm.ring_segments = 20
	_beacon_ring.mesh = tm
	_beacon_ring.position.y = 0.12
	_beacon_ring_mat = StandardMaterial3D.new()
	_beacon_ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_beacon_ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_beacon_ring_mat.emission_enabled = true
	_beacon_ring.material_override = _beacon_ring_mat
	_beacon.add_child(_beacon_ring)
	_beacon.visible = false


func _on_guide_changed(on: bool, pos: Vector3, kind: String) -> void:
	if _beacon == null:
		return
	_beacon.visible = on
	if not on:
		return
	_beacon.global_position = pos
	var col := _beacon_color(kind)
	var beam_col := Color(col.r, col.g, col.b, 0.32)
	_beacon_beam_mat.albedo_color = beam_col
	_beacon_beam_mat.emission = col
	_beacon_beam_mat.emission_energy_multiplier = 2.2
	var ring_col := Color(col.r, col.g, col.b, 0.85)
	_beacon_ring_mat.albedo_color = ring_col
	_beacon_ring_mat.emission = col
	_beacon_ring_mat.emission_energy_multiplier = 2.6


func _beacon_color(kind: String) -> Color:
	match kind:
		"clean": return Color(1.0, 0.82, 0.32)     # ゴミ＝あたたかい金
		"heal": return Color(0.62, 1.0, 0.72)      # 虫＝澄んだ緑
		"boss": return Color(1.0, 0.5, 0.55)       # ボス＝赤
		"collect": return Color(0.55, 0.85, 1.0)   # 種＝水色
		"puzzle": return Color(0.75, 0.7, 1.0)     # 石版＝紫
		"switch": return Color(0.8, 0.95, 0.5)     # スイッチ＝黄緑
	return Color(1, 1, 1)


func _update_beacon(delta: float) -> void:
	if _beacon == null or not _beacon.visible:
		return
	_beacon_t += delta
	_beacon_beam.position.y = 2.3 + sin(_beacon_t * 2.2) * 0.2
	_beacon_ring.rotation.y = _beacon_t * 1.2
	var pulse := 0.85 + sin(_beacon_t * 3.0) * 0.15
	_beacon_ring.scale = Vector3(pulse, 1.0, pulse)
	# 近づいたら光の柱を薄く消す＝画面を覆わない（足元の輪＋画面の矢印で足りる）。
	# 遠いときだけ しっかり光る＝“あそこへ行く”を遠くから示す。
	var cam := get_viewport().get_camera_3d()
	if cam != null and _beacon_beam_mat != null:
		var d := cam.global_position.distance_to(_beacon.global_position)
		var f := clampf((d - 6.0) / 8.0, 0.0, 1.0)   # 6m以下=消える / 14m以上=全開
		var base := _beacon_beam_mat.emission
		_beacon_beam_mat.albedo_color = Color(base.r, base.g, base.b, 0.30 * f)
		_beacon_beam.visible = f > 0.02


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
	_detect_quality()
	_setup_sky_fog()
	_setup_sun()
	_build_ground()
	_build_pebbles()
	_build_plants()
	_build_grass()
	_build_flowers()
	_build_pillars()
	_build_terrain_skirt()
	# 遠景の山なみは MultiMesh 1ドローコールで軽い＝Webでも“広い世界”を残す（第一印象の要）。
	_build_distant_hills()
	_build_clouds()   # 空に流れる雲（回復で 灰→白→夕やけ）＝空の間延びを解消・絵本感UP
	# 水面は頂点アニメで重めなので Web ではスキップ（サクサク優先）。
	if not OS.has_feature("web"):
		_build_water()
	_build_trees()
	_build_boulders()
	_build_butterflies()
	_build_motes()   # 空気に舞う花粉/ちり（回復で 灰のちり→金の花粉）＝“生きた空気”
	_build_critters()   # 地面を ちょこちょこ歩く 小さな生き物＝“戻ってきた命”
	_build_actor_shadows()
	_build_bloom()
	_build_house_interior()   # 第5章「いえの中」＝手続きの屋内（house舞台だけ表示）
	_build_sky_clouds()       # 第6章「そら」＝ふわふわの雲の床（sky舞台だけ表示）
	_build_sky_rays()         # 第6章「そら」＝雲を貫くサンシャフト（光芒／sky舞台だけ表示）
	_build_water_lite()
	_apply_biome()


## 第3章の浅い水：プレイ面をおおう半透明シート1枚（1ドローコール＝web でも軽い）。
## 頂点アニメなし＝サクサク。ゆっくりUVを流して“水面”感だけ出す（_process、負荷ごく小）。
func _build_water_lite() -> void:
	var plane := PlaneMesh.new()
	plane.size = Vector2(72.0, 72.0)   # 壁(半径24)の内側をおおう
	_water_lite_mat = StandardMaterial3D.new()
	_water_lite_mat.albedo_color = Color(0.22, 0.34, 0.30, 0.72)   # 初期＝にごり（回復で澄む）
	_water_lite_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_water_lite_mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	_water_lite_mat.roughness = 0.18
	_water_lite_mat.metallic = 0.0
	_water_lite_mat.metallic_specular = 0.6
	_water_lite_mat.rim_enabled = false
	_water_lite_mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_ALWAYS
	_water_lite = MeshInstance3D.new()
	_water_lite.name = "WaterLite"
	_water_lite.mesh = plane
	_water_lite.material_override = _water_lite_mat
	_water_lite.position = Vector3(0.0, 0.07, 0.0)   # 地面のすぐ上＝浅い水に見える
	_water_lite.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_water_lite.visible = false
	add_child(_water_lite)


## みずべの生き物：水面のどこかで ときどき 魚が跳ねて 波紋がひろがる＝“生きた水”。純見た目・全員。
func _update_water_life(delta: float) -> void:
	if biome != "water" or _water_lite == null or not _water_lite.visible:
		return
	_fish_t -= delta
	if _fish_t > 0.0:
		return
	_fish_t = randf_range(1.8, 3.8)
	var c := Vector3.ZERO
	var pl := _any_player()
	if pl != null:
		c = pl.global_position
	var a := randf() * TAU
	var r := randf_range(4.0, 14.0)
	var p := c + Vector3(cos(a) * r, 0.07, sin(a) * r)
	p.x = clampf(p.x, -33.0, 33.0)
	p.z = clampf(p.z, -33.0, 33.0)
	_spawn_fish_jump(p)


## 魚が水面から跳ねて弧を描き、着水で波紋。回復ほど 澄んだ水に映える。
func _spawn_fish_jump(pos: Vector3) -> void:
	var fish := MeshInstance3D.new()
	var body := SphereMesh.new()
	body.radius = 0.11
	body.height = 0.22
	body.radial_segments = 7
	body.rings = 4
	fish.mesh = body
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.75, 0.82, 0.9)
	m.metallic = 0.4
	m.metallic_specular = 0.7
	m.roughness = 0.25
	m.emission_enabled = true
	m.emission = Color(0.7, 0.82, 0.95)
	m.emission_energy_multiplier = 0.25
	fish.material_override = m
	fish.scale = Vector3(0.7, 0.55, 1.7)   # 魚らしく細長く
	add_child(fish)
	fish.position = pos
	var fwd := Vector3(randf_range(-0.7, 0.7), 0.0, randf_range(-0.7, 0.7)).normalized()
	var apex := pos + fwd * 0.7 + Vector3(0.0, randf_range(1.1, 1.8), 0.0)
	var land := pos + fwd * 1.4
	land.y = 0.07
	fish.look_at(apex, Vector3.UP)
	_spawn_ripple(pos)   # 跳ねた所の波紋
	var tw := create_tween()
	tw.tween_property(fish, "position", apex, 0.34).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(fish, "rotation:x", fish.rotation.x + 0.9, 0.34)
	tw.tween_property(fish, "position", land, 0.34).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	tw.parallel().tween_property(fish, "rotation:x", fish.rotation.x + 1.8, 0.34)
	tw.tween_callback(func() -> void:
		_spawn_ripple(land)
		fish.queue_free())


## 水面にひろがって消える波紋の輪（水面に寝かせる）。
func _spawn_ripple(pos: Vector3) -> void:
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.14
	tm.outer_radius = 0.2
	tm.rings = 18
	tm.ring_segments = 6
	ring.mesh = tm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.72, 0.9, 1.0, 0.55)
	m.emission_enabled = true
	m.emission = Color(0.62, 0.85, 1.0)
	m.emission_energy_multiplier = 0.6
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring.material_override = m
	add_child(ring)
	ring.rotation.x = deg_to_rad(90.0)   # 水面に寝かせる
	ring.position = Vector3(pos.x, 0.085, pos.z)
	ring.scale = Vector3(0.5, 0.5, 0.5)
	var tw := create_tween()
	tw.tween_property(ring, "scale", Vector3(4.5, 4.5, 4.5), 0.95).set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(m, "albedo_color:a", 0.0, 0.95)
	tw.tween_callback(ring.queue_free)


# ------------------------------------------------------------ 浄化の“あと”に咲く花
#
# 虫をきれいにした その場所に、小さな花が永続で咲く＝「自分がここを治した」あとが世界に残る。
# 本作の核（きれいにする→世界がよみがえる）を“自分の手あと”として見せる。
# プール制の MultiMesh 1個＝1ドローコール。上限を超えたら古いものから使い回す（青天井にしない）。
const BLOOM_POOL := 96
var _bloom_mm: MultiMesh = null
var _bloom_next := 0
var _bloom_count := 0   # これまでに咲かせた回数（自己点検・確認用）


## これまでに咲かせた花の“回数”（浄化/片づけの手あと）。selftest の確認に使う。
func blooms_placed() -> int:
	return _bloom_count
const _BLOOM_COLS := [
	Color(0.98, 0.42, 0.55), Color(1.0, 0.86, 0.38),
	Color(0.95, 0.97, 0.99), Color(0.78, 0.56, 0.95), Color(0.55, 0.86, 0.6),
]

func _build_bloom() -> void:
	var head := _flower_head_mesh()   # 野の花と同じ花びらの星形＝“手あと”も花らしく
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.55
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.emission_enabled = true
	mat.emission = Color(1, 1, 1)
	mat.emission_energy_multiplier = 0.5   # 今治した所が淡く灯る＝“手あと”を強調
	head.surface_set_material(0, mat)
	_bloom_mm = MultiMesh.new()
	_bloom_mm.transform_format = MultiMesh.TRANSFORM_3D
	_bloom_mm.use_colors = true
	_bloom_mm.mesh = head
	_bloom_mm.instance_count = BLOOM_POOL
	# 最初は全部“地面の下”に隠しておく（scaleゼロ）。咲いた時だけ地上へ出す。
	for i in BLOOM_POOL:
		_bloom_mm.set_instance_transform(i, Transform3D(Basis().scaled(Vector3.ZERO), Vector3(0, -100, 0)))
		_bloom_mm.set_instance_color(i, Color.WHITE)
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Bloom"
	mmi.multimesh = _bloom_mm
	add_child(mmi)


## 指定の場所に小さな花のかたまりを永続で咲かせる（浄化・片づけの“手あと”）。
## 全クライアントが同じ位置で呼ぶ（bug の _remote_healed は call_local）＝見た目は揃う。
func bloom_at(world_pos: Vector3) -> void:
	if _bloom_mm == null:
		return
	_bloom_count += 1
	for _j in 3:
		var i := _bloom_next
		_bloom_next = (_bloom_next + 1) % BLOOM_POOL
		var ang := randf() * TAU
		var rad := randf() * 0.55
		var origin := Vector3(world_pos.x + cos(ang) * rad, 0.16, world_pos.z + sin(ang) * rad)
		var sc := randf_range(0.8, 1.35)
		var basis := Basis(Vector3.UP, randf() * TAU).scaled(Vector3.ONE * sc)
		_bloom_mm.set_instance_transform(i, Transform3D(basis, origin))
		_bloom_mm.set_instance_color(i, _BLOOM_COLS[randi() % _BLOOM_COLS.size()])


## 接地影：やわらかい放射グラデの円を足元に敷く。全アクターぶんを 1 MultiMesh＝1ドローコール。
func _build_actor_shadows() -> void:
	var grad := Gradient.new()
	grad.set_color(0, Color(0.05, 0.06, 0.04, 0.5))   # 中心：やや濃い
	grad.set_color(1, Color(0.05, 0.06, 0.04, 0.0))   # 外周：透明
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(0.5, 1.0)
	tex.width = 64
	tex.height = 64
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = tex
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true   # インスタンス色のαで高さフェード
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED   # z-fight回避
	var quad := QuadMesh.new()
	quad.size = Vector2(1.0, 1.0)
	_shadow_mm = MultiMesh.new()
	_shadow_mm.transform_format = MultiMesh.TRANSFORM_3D
	_shadow_mm.use_colors = true
	_shadow_mm.mesh = quad
	_shadow_mm.instance_count = SHADOW_MAX
	_shadow_mm.visible_instance_count = 0
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "ActorShadows"
	mmi.multimesh = _shadow_mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mmi)


## 毎フレーム：各アクターの真下へ影を置く（見た目だけ＝全員の画面で回す）。
func _update_actor_shadows() -> void:
	if _shadow_mm == null:
		return
	var flat := Basis(Vector3.RIGHT, -PI / 2.0)   # 板を地面へ寝かす
	var i := 0
	for grp in SHADOW_GROUPS:
		for a in get_tree().get_nodes_in_group(grp):
			if i >= SHADOW_MAX:
				break
			var n := a as Node3D
			if n == null or not is_instance_valid(n):
				continue
			var p: Vector3 = n.global_position
			var base := 0.72
			match grp:
				"child": base = 0.5
				"ally": base = 0.55
				"bug":
					var st: Variant = a.get("stats")
					base = 0.62 * (float(st.body_scale) if st != null else 1.0)
			# 高い所（飛行）ほど 影は小さく薄く
			var h := maxf(0.0, p.y)
			var fade := clampf(1.0 - h * 0.14, 0.12, 1.0)
			var sc := base * clampf(1.0 - h * 0.05, 0.45, 1.0)
			var xf := Transform3D(flat.scaled(Vector3(sc, sc, sc)), Vector3(p.x, 0.03, p.z))
			_shadow_mm.set_instance_transform(i, xf)
			_shadow_mm.set_instance_color(i, Color(1, 1, 1, fade))
			i += 1
	_shadow_mm.visible_instance_count = i


func _is_ruins() -> bool:
	return biome == "ruins"


## 舞台を切り替える（庭⇔遺跡）。色・霧・草花の密度・石柱をまとめて変える。
func set_biome(b: String) -> void:
	biome = b
	_apply_biome()


func _apply_biome() -> void:
	var cfg := _cfg()
	if _pillars != null:
		_pillars.visible = cfg["pillars"]
	# 遺跡は草まばら・花なし。庭は満開まで戻る。
	if _grass_mmi != null:
		_grass_mmi.multimesh.visible_instance_count = int(_grass_n * float(cfg["grass_frac"]))
	if not cfg["flowers"] and _flower_mm != null:
		_flower_mm.visible_instance_count = 0
	# 地面の色（遺跡＝苔むした石／庭＝くすんだ青緑のヘドロ）
	if _ground_shader != null:
		_ground_shader.set_shader_parameter("soil", cfg["soil"])
		_ground_shader.set_shader_parameter("grass", cfg["grass_col"])
	if _sun != null:
		_sun.light_color = cfg["sun_c"]
		_sun.light_energy = cfg["sun_e"]
	# 遺跡は森まばら・水は淀む。庭は森が茂り水は澄む。
	if _trees != null:
		var frac := float(cfg["tree_frac"])
		for mmi in _trees.get_children():
			if mmi is MultiMeshInstance3D and mmi.multimesh != null:
				mmi.multimesh.visible_instance_count = int(mmi.multimesh.instance_count * frac)
	if _water_mat != null:
		_water_mat.set_shader_parameter("shallow", cfg["water_shallow"])
		_water_mat.set_shader_parameter("deep", cfg["water_deep"])
	if _water_lite != null:
		_water_lite.visible = biome == "water"   # 水辺のときだけ浅い水を出す
	# 第5章「いえの中」＝屋内一式を出し、屋外の背景（遠景の丘）は隠す＝“部屋の中”に見せる。
	var indoors := biome == "house"
	if _house != null:
		_house.visible = indoors
	# 第6章「そら」＝雲の床を出す。
	if _sky_clouds != null:
		_sky_clouds.visible = biome == "sky"
	if _sky_rays != null:
		_sky_rays.visible = biome == "sky"
	# 遠景の丘は 屋内・そら では隠す（部屋の中／雲の上に 山が出ると おかしいため）。
	if _hills != null:
		_hills.visible = not (indoors or biome == "sky")
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
	var rise := clampf((r - 52.0) / 30.0, 0.0, 1.0)   # 遊べる島(72四方)の外からせり上がる
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
	var rings := 56
	var segs := 96
	var r0 := 0.0
	var r1 := 130.0
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
uniform vec3 sky_reflect : source_color = vec3(0.64, 0.80, 0.93);   // 水面が映す空の色（GDScriptで空と揃える）
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
	// 空を映す：浅い角度（水平方向）ほど 空の色を反射。澄むほど反射が強い＝鏡のような水面。
	float rk = clamp(fres * (0.55 + 0.45 * clarity), 0.0, 1.0);
	vec3 col = mix(base, sky_reflect, rk);
	// きらめき：波の法線にのった高周波の散乱光（太陽のきらめき）。澄んだ水ほど強い。
	float glint = pow(fres, 2.0) * (0.5 + 0.5 * sin(TIME * 3.0 + VERTEX.x * 3.1 + VERTEX.z * 2.7));
	col += vec3(0.9, 0.95, 1.0) * glint * 0.16 * clarity;
	ALBEDO = col;
	ROUGHNESS = mix(0.16, 0.03, clarity);   // 澄むほど滑らか＝空をくっきり映す
	SPECULAR = 1.0;
	METALLIC = mix(0.0, 0.25, clarity);     // 澄むと少し鏡面寄り
	ALPHA = mix(0.86, 0.95, clarity);
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
		var rad := rng.randf_range(95.0, 175.0)
		var w := rng.randf_range(14.0, 40.0)
		var h := rng.randf_range(14.0, 46.0)
		var b := Basis(Vector3.UP, rng.randf_range(0.0, TAU)).scaled(Vector3(w, h, w))
		# 根元を地平線下に沈めて“連なり”に見せる
		mm.set_instance_transform(i, Transform3D(b, Vector3(cos(ang) * rad, h * 0.5 - 3.0, sin(ang) * rad)))
		var t := clampf((rad - 95.0) / 80.0, 0.0, 1.0)
		mm.set_instance_color(i, near.lerp(far, t))
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "DistantHills"
	mmi.multimesh = mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_hills = mmi
	add_child(mmi)


## 第5章「いえの中」＝手続きの屋内。床/壁/窓（あたたかい昼の光）/天井の梁/家具のシルエットで
## 「部屋の中」に見せる（以前は 茶色の平原＝草原と同構図で 屋内に見えなかった）。house舞台だけ表示。
## 当たり判定は持たない背景＝プレイに干渉しない。梁だけ（天井は塞がない）＝飛行の邪魔をしない。全手続き・追加アセットゼロ。
func _build_house_interior() -> void:
	_house = Node3D.new()
	_house.name = "HouseInterior"
	add_child(_house)
	var R := 22.0
	var H := 12.0
	# 床（あたたかい木）
	var floor_mi := MeshInstance3D.new()
	var fpm := PlaneMesh.new()
	fpm.size = Vector2(R * 2.1, R * 2.1)
	floor_mi.mesh = fpm
	floor_mi.position = Vector3(0.0, 0.05, 0.0)
	floor_mi.material_override = _wood_mat(Color(0.60, 0.47, 0.33))
	floor_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_house.add_child(floor_mi)
	# 壁 4枚（内向き）
	var wall_col := Color(0.82, 0.70, 0.54)
	_house_box(Vector3(R * 2.0, H, 0.4), Vector3(0.0, H * 0.5, -R), wall_col)   # 北
	_house_box(Vector3(R * 2.0, H, 0.4), Vector3(0.0, H * 0.5, R), wall_col)    # 南
	_house_box(Vector3(0.4, H, R * 2.0), Vector3(-R, H * 0.5, 0.0), wall_col)   # 西
	_house_box(Vector3(0.4, H, R * 2.0), Vector3(R, H * 0.5, 0.0), wall_col)    # 東
	# 北壁の窓（あたたかい昼の光）＝“おうち”の要。十字の枠付き。
	var win := MeshInstance3D.new()
	var wq := QuadMesh.new()
	wq.size = Vector2(10.0, 6.5)
	win.mesh = wq
	win.position = Vector3(0.0, 5.5, -R + 0.35)
	var wm := StandardMaterial3D.new()
	wm.albedo_color = Color(1.0, 0.95, 0.82)
	wm.emission_enabled = true
	wm.emission = Color(1.0, 0.93, 0.74)
	wm.emission_energy_multiplier = 1.6
	wm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	win.material_override = wm
	win.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_house.add_child(win)
	var frame_col := Color(0.40, 0.28, 0.18)
	_house_box(Vector3(11.0, 0.5, 0.3), Vector3(0.0, 5.5, -R + 0.3), frame_col)    # 窓の横桟
	_house_box(Vector3(0.5, 7.5, 0.3), Vector3(0.0, 5.5, -R + 0.3), frame_col)     # 窓の縦桟
	_house_box(Vector3(11.6, 0.6, 0.4), Vector3(0.0, 9.1, -R + 0.28), frame_col)   # 窓の上枠
	# 天井の梁（rafters）＝屋内の証。塞がず梁だけ＝飛んでも邪魔にならない。
	var beam_col := Color(0.44, 0.31, 0.21)
	for bz in [-14.0, -6.0, 2.0, 10.0, 18.0]:
		_house_box(Vector3(R * 2.0, 0.5, 0.7), Vector3(0.0, H - 0.6, float(bz)), beam_col)
	# 家具のシルエット（あたたかい木）＝生活感。
	var fur := Color(0.50, 0.36, 0.24)
	_house_box(Vector3(3.4, 1.4, 2.0), Vector3(11.0, 0.7, -9.0), fur)    # テーブル
	_house_box(Vector3(3.0, 6.0, 1.2), Vector3(-15.0, 3.0, 12.0), fur)   # 棚
	_house_box(Vector3(1.4, 1.4, 1.4), Vector3(-8.0, 0.7, 4.0), fur)     # 箱/スツール
	_house_box(Vector3(1.4, 2.6, 1.4), Vector3(13.0, 1.3, 6.0), fur)     # たんす（東寄り）
	_house_box(Vector3(2.2, 0.5, 1.4), Vector3(-12.0, 0.25, -8.0), fur)  # ローテーブル/踏み台
	_house_box(Vector3(0.5, 3.0, 0.5), Vector3(9.0, 1.5, -13.0), fur.darkened(0.1))  # 帽子掛け/柱
	# 床の敷物（あたたかい色の四角）＝部屋の中心を締める。
	var rug := MeshInstance3D.new()
	var rpm := PlaneMesh.new()
	rpm.size = Vector2(9.0, 7.0)
	rug.mesh = rpm
	rug.position = Vector3(0.0, 0.09, 2.0)
	rug.material_override = _wood_mat(Color(0.62, 0.40, 0.34))   # 赤茶の敷物
	rug.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_house.add_child(rug)
	# 壁の絵（額）＝おうちらしさ。北壁・窓の横に。
	_house_box(Vector3(2.4, 1.8, 0.2), Vector3(-9.0, 6.0, -R + 0.3), Color(0.86, 0.78, 0.6))  # 額（明るい）
	_house_box(Vector3(2.7, 2.1, 0.12), Vector3(-9.0, 6.0, -R + 0.24), Color(0.34, 0.24, 0.16))  # 額縁（濃い・背面）

	# 窓から差す光の帯（サンビーム）＝あたたかい部屋の主役。加算合成の うすい光のリボン。
	var win_pt := Vector3(-1.0, 6.0, -R + 0.6)   # 窓の中あたり
	var floor_pt := Vector3(3.5, 0.1, -11.0)     # 床の着地点
	var beam := MeshInstance3D.new()
	var bmesh := BoxMesh.new()
	bmesh.size = Vector3(4.6, 0.14, win_pt.distance_to(floor_pt))   # 幅・薄さ・（窓→床の）長さ
	beam.mesh = bmesh
	var beam_m := StandardMaterial3D.new()
	beam_m.albedo_color = Color(1.0, 0.92, 0.66, 0.10)
	beam_m.emission_enabled = true
	beam_m.emission = Color(1.0, 0.9, 0.6)
	beam_m.emission_energy_multiplier = 0.6
	beam_m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	beam_m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD     # 加算＝光として背景に足される
	beam_m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	beam_m.cull_mode = BaseMaterial3D.CULL_DISABLED
	beam.material_override = beam_m
	beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_house.add_child(beam)
	beam.position = (win_pt + floor_pt) * 0.5
	beam.look_at_from_position(beam.position, floor_pt, Vector3.UP)   # 箱の長さ(-Z)を床の着地点へ向ける
	# 床の光だまり（着地点の あたたかい光）。
	var pool := MeshInstance3D.new()
	var ppm := PlaneMesh.new()
	ppm.size = Vector2(6.0, 4.2)
	pool.mesh = ppm
	pool.position = Vector3(3.5, 0.12, -11.0)
	var pool_m := StandardMaterial3D.new()
	pool_m.albedo_color = Color(1.0, 0.9, 0.62, 0.34)
	pool_m.emission_enabled = true
	pool_m.emission = Color(1.0, 0.88, 0.55)
	pool_m.emission_energy_multiplier = 0.5
	pool_m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	pool_m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	pool_m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	pool.material_override = pool_m
	pool.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_house.add_child(pool)

	# 小物＝生活のディテール。テーブルの上に 本とマグ、たんすの上に 植木鉢。
	_house_box(Vector3(1.1, 0.28, 0.8), Vector3(10.5, 1.55, -9.2), Color(0.70, 0.30, 0.28))   # 赤い本
	_house_box(Vector3(1.0, 0.24, 0.72), Vector3(10.7, 1.82, -9.1), Color(0.30, 0.48, 0.68))  # 青い本（重ね）
	_house_box(Vector3(0.42, 0.55, 0.42), Vector3(11.7, 1.68, -8.5), Color(0.92, 0.92, 0.88))  # マグ
	_house_box(Vector3(0.8, 0.8, 0.8), Vector3(13.0, 2.95, 6.0), Color(0.60, 0.36, 0.26))      # 植木鉢
	var leaf := MeshInstance3D.new()
	var lsphere := SphereMesh.new()
	lsphere.radius = 0.75
	lsphere.height = 1.3
	lsphere.radial_segments = 8
	lsphere.rings = 5
	leaf.mesh = lsphere
	leaf.position = Vector3(13.0, 3.95, 6.0)
	leaf.material_override = _wood_mat(Color(0.32, 0.55, 0.30))   # 緑の葉
	leaf.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_house.add_child(leaf)

	_house.visible = false   # house舞台のときだけ _apply_biome で出す


## 屋内用の箱（当たり判定なし・toon木材）。
func _house_box(sz: Vector3, pos: Vector3, col: Color) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = sz
	mi.mesh = bm
	mi.position = pos
	mi.material_override = _wood_mat(col)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_house.add_child(mi)


## 屋内のあたたかい木材（つや消し・セル陰影で絵本トゥーンに馴染む）。
func _wood_mat(col: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 0.92
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	return m


## 第6章「そら」＝ふわふわの雲の床。中央の遊び場は空け、外側ほど密に置いて“雲海に浮かぶ広場”に見せる
## （以前は 白い地面＝雪原に見えていた）。フラット球のMultiMesh＝1ドローコールで軽い。sky舞台だけ表示。
func _build_sky_clouds() -> void:
	var puff := SphereMesh.new()
	puff.radius = 1.0
	puff.height = 2.0
	puff.radial_segments = 10
	puff.rings = 6
	# ゆっくり流れる雲＝生きた空。各パフを 位置で位相をずらして 上下＋横に ゆらす（頂点シェーダ＝CPU負荷ゼロ）。
	var mat := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
uniform vec3 cloud_col : source_color = vec3(0.95, 0.97, 1.0);
uniform float glow = 0.35;
void vertex() {
	float ph = MODEL_MATRIX[3].x * 0.10 + MODEL_MATRIX[3].z * 0.13;
	VERTEX.y += sin(TIME * 0.25 + ph) * 0.5;        // ゆっくり上下
	VERTEX.x += sin(TIME * 0.18 + ph * 1.3) * 0.7;  // ゆっくり横へ流れる
}
void fragment() {
	ALBEDO = cloud_col;
	EMISSION = cloud_col * glow;
	ROUGHNESS = 1.0;
}
"""
	mat.shader = sh
	mat.set_shader_parameter("cloud_col", Color(0.95, 0.97, 1.0))
	mat.set_shader_parameter("glow", 0.35)
	puff.material = mat

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = puff
	var n := 60 if OS.has_feature("web") else 110
	# 遠景の低い雲バンク＝地平まで続く“雲海”の奥行き。大きく・低く・沈めて広げる（同じMultiMesh＝1描画のまま）。
	var far := 26 if OS.has_feature("web") else 46
	mm.instance_count = n + far
	var rng := RandomNumberGenerator.new()
	rng.seed = 60606
	for i in n:
		var ang := rng.randf() * TAU
		var rad := rng.randf_range(9.0, 46.0)                       # 中央(遊び場)は空ける
		var s := rng.randf_range(2.0, 5.5) * clampf(rad / 20.0, 0.7, 1.8)   # 遠いほど大きな雲塊
		var y := rng.randf_range(-0.8, 0.4)
		if rad >= 22.0:
			y += rng.randf_range(0.0, 2.5)                          # 遠景は少し浮かせて“雲海”の起伏
		var b := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s * rng.randf_range(0.32, 0.5), s))
		mm.set_instance_transform(i, Transform3D(b, Vector3(cos(ang) * rad, y, sin(ang) * rad)))
	for j in far:
		var ang2 := rng.randf() * TAU
		var rad2 := rng.randf_range(48.0, 86.0)                     # 手前の雲の さらに外側＝地平線側
		var s2 := rng.randf_range(6.0, 11.0)                        # 遠いので大きな雲塊にして“層”に見せる
		var y2 := rng.randf_range(-4.0, -1.2)                       # 低く沈めて 手前より下＝雲海の水平が奥へ続く
		var b2 := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s2, s2 * rng.randf_range(0.24, 0.38), s2))
		mm.set_instance_transform(n + j, Transform3D(b2, Vector3(cos(ang2) * rad2, y2, sin(ang2) * rad2)))

	var mmi := MultiMeshInstance3D.new()
	mmi.name = "SkyClouds"
	mmi.multimesh = mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mmi.visible = false   # sky舞台のときだけ _apply_biome で出す
	_sky_clouds = mmi
	add_child(mmi)


## 第6章「そら」＝雲を貫くサンシャフト（光芒）。屋内サンビームと同じ“加算合成の光の帯”を
## 何本か斜めに平行に並べ、雲海の上から斜めに差し込ませる。回復で濃くなる（もや→強い陽射し）。
func _build_sky_rays() -> void:
	_sky_rays = Node3D.new()
	_sky_rays.name = "SkyRays"
	# 共有マテリアル（1本の光の帯）。回復で albedo.a / emission を _update_sky_rays が動かす。
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.96, 0.78, 0.05)
	m.emission_enabled = true
	m.emission = Color(1.0, 0.95, 0.72)
	m.emission_energy_multiplier = 0.5
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD          # 加算＝光として空に足される
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	_sky_ray_mat = m
	# 斜め上（太陽の方向）から 雲海へ差し込む平行光。少しずつ位置・幅・長さを散らして自然に。
	var top := Vector3(-13.0, 26.0, -14.0)     # 光源側（高い空）
	var down := Vector3(4.0, -2.0, 5.0)         # 着地側（雲海）＝平行方向
	var rng := RandomNumberGenerator.new()
	rng.seed = 70707
	var n := 6 if OS.has_feature("web") else 9
	for i in n:
		var off := Vector3(
			rng.randf_range(-15.0, 15.0),
			rng.randf_range(-2.0, 3.0),
			rng.randf_range(-15.0, 15.0))
		var a := top + off                       # この帯の“上端”
		var b := down + off + Vector3(rng.randf_range(-3.0, 3.0), 0.0, rng.randf_range(-3.0, 3.0))
		var beam := MeshInstance3D.new()
		var bm := BoxMesh.new()
		var w := rng.randf_range(1.6, 3.2)
		bm.size = Vector3(w, 0.12, a.distance_to(b))   # 幅・薄さ・（上→下の）長さ
		beam.mesh = bm
		beam.material_override = m
		beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_sky_rays.add_child(beam)
		beam.position = (a + b) * 0.5
		beam.look_at_from_position(beam.position, b, Vector3.UP)   # 箱の長さ(-Z)を着地点へ向ける
	_sky_rays.visible = false   # sky舞台のときだけ _apply_biome で出す
	add_child(_sky_rays)


## 光芒の濃さを回復度で動かす（もや＝うすい／澄む＝強い陽射し）。
func _update_sky_rays(r: float) -> void:
	if _sky_ray_mat == null:
		return
	var a := _sky_ray_mat.albedo_color
	a.a = lerpf(0.035, 0.11, r)                 # 汚れ＝ぼんやり／回復＝くっきり
	_sky_ray_mat.albedo_color = a
	_sky_ray_mat.emission_energy_multiplier = lerpf(0.35, 0.7, r)


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
	var trunk_mm := _new_mm(trunk, _tree_n + _conifer_n, false)

	# --- 広葉樹の葉（まるい塊） ---
	var leaf := SphereMesh.new()
	leaf.radius = 1.0
	leaf.height = 2.0
	leaf.radial_segments = 6
	leaf.rings = 4
	leaf.material = _vcol_mat()
	var leaf_mm := _new_mm(leaf, _tree_n, true)

	# --- 針葉樹の葉（とがった円錐） ---
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 1.0
	cone.height = 2.6
	cone.radial_segments = 6
	cone.material = _vcol_mat()
	var cone_mm := _new_mm(cone, _conifer_n, true)

	var ti := 0
	# 広葉樹
	for i in _tree_n:
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(56.0, 120.0)
		var base := _tree_base(cos(ang) * rad, sin(ang) * rad)
		var s := rng.randf_range(1.3, 2.6)
		var yaw := rng.randf_range(0.0, TAU)
		trunk_mm.set_instance_transform(ti, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3(s, s, s)), base + Vector3(0.0, s * 0.5, 0.0)))
		ti += 1
		var ls := s * rng.randf_range(0.9, 1.2)
		leaf_mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3(ls, ls * 1.1, ls)), base + Vector3(0.0, s + ls * 0.5, 0.0)))
		var lt := rng.randf()
		_leaf_tints.append(lt)
		leaf_mm.set_instance_color(i, _leaf_color(lt, WorldState.recovery))
	# 針葉樹（少し外側・高地に多い＝森の奥）
	for i in _conifer_n:
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(58.0, 125.0)
		var base := _tree_base(cos(ang) * rad, sin(ang) * rad)
		var s := rng.randf_range(1.6, 3.4)
		var yaw := rng.randf_range(0.0, TAU)
		trunk_mm.set_instance_transform(ti, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3(s * 0.7, s * 0.7, s * 0.7)), base + Vector3(0.0, s * 0.35, 0.0)))
		ti += 1
		var cs := s * rng.randf_range(0.8, 1.1)
		cone_mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3(cs, cs, cs)), base + Vector3(0.0, s * 0.6 + cs * 1.3, 0.0)))
		var ct := rng.randf()
		_cone_tints.append(ct)
		cone_mm.set_instance_color(i, _cone_color(ct, WorldState.recovery))

	_leaf_mm = leaf_mm
	_cone_mm = cone_mm
	_add_mmi("TreeTrunks", trunk_mm)
	_add_mmi("TreeFoliage", leaf_mm)
	_add_mmi("Conifers", cone_mm)


## 広葉樹の葉の色：汚れ(r=0)は病んだ黄枯れ、回復(r=1)でみずみずしい緑。t=個体差。
func _leaf_color(t: float, r: float) -> Color:
	var sick := Color(0.36, 0.33, 0.18).lerp(Color(0.42, 0.40, 0.22), t)
	var lush := Color(0.20, 0.38, 0.16).lerp(Color(0.34, 0.52, 0.22), t)
	return sick.lerp(lush, r)


## 針葉樹の葉の色（同上、常緑寄りなので枯れは控えめ）。
func _cone_color(t: float, r: float) -> Color:
	var sick := Color(0.26, 0.27, 0.18).lerp(Color(0.32, 0.33, 0.22), t)
	var lush := Color(0.14, 0.30, 0.16).lerp(Color(0.22, 0.40, 0.20), t)
	return sick.lerp(lush, r)


## 回復度にあわせて木の葉を塗り替える（_on_recovery_changed から呼ぶ）。
func _update_tree_leaves(r: float) -> void:
	if _leaf_mm != null:
		for i in _leaf_tints.size():
			_leaf_mm.set_instance_color(i, _leaf_color(_leaf_tints[i], r))
	if _cone_mm != null:
		for i in _cone_tints.size():
			_cone_mm.set_instance_color(i, _cone_color(_cone_tints[i], r))


## 岩（丘の上のごろた石・大きめ）。地面ディテールを立体にして“自然物”を増やす。
func _build_boulders() -> void:
	var rock := SphereMesh.new()
	rock.radius = 1.0
	rock.height = 1.6
	rock.radial_segments = 6
	rock.rings = 4
	rock.material = _vcol_mat()
	var mm := _new_mm(rock, _boulder_n, true)
	var rng := RandomNumberGenerator.new()
	rng.seed = 135791
	for i in _boulder_n:
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(54.0, 116.0)
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
	mm.instance_count = maxi(120, int(760 * _q))

	var rng := RandomNumberGenerator.new()
	rng.seed = 424242
	for i in mm.instance_count:
		var x := rng.randf_range(-35.0, 35.0)
		var z := rng.randf_range(-35.0, 35.0)
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
	mm.instance_count = maxi(120, int(640 * _q))

	var rng := RandomNumberGenerator.new()
	rng.seed = 71717171
	_plant_mm = mm
	_plant_base = PackedVector3Array()
	_plant_rot = PackedFloat32Array()
	for i in mm.instance_count:
		var x := rng.randf_range(-35.0, 35.0)
		var z := rng.randf_range(-35.0, 35.0)
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


## 空に流れる雲を作る（大きな半球ドーム＋スクロールする fbm ノイズ）。unshaded・透明・1ドロー。
## 回復で 灰の曇天 → 白い浮き雲 → 夕やけの淡いピンク。屋外biome(庭/みずべ/そら)だけ表示。
func _build_clouds() -> void:
	var dome := SphereMesh.new()
	dome.radius = 150.0
	dome.height = 300.0
	dome.is_hemisphere = true
	dome.radial_segments = 24
	dome.rings = 12
	var mat := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_front, depth_draw_never, depth_test_disabled;
uniform vec3 cloud_col : source_color = vec3(1.0);
uniform float coverage = 0.5;
uniform float alpha = 0.9;
varying vec3 vpos;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
	vec2 i = floor(p); vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
			   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
	float v = 0.0; float a = 0.5;
	for(int k = 0; k < 3; k++){ v += a * vnoise(p); p *= 2.0; a *= 0.5; }
	return v;
}
void vertex(){ vpos = VERTEX; }
void fragment(){
	vec3 d = normalize(vpos);
	// 空の“平らな雲の層”へ射影＝遠近がついて自然に広がる。ゆっくり流れる。
	vec2 uv = d.xz / (d.y + 0.55) * 0.5 + vec2(TIME * 0.008, TIME * 0.005);
	float n = fbm(uv * 1.3);
	float c = smoothstep(1.0 - coverage, 1.0 - coverage + 0.2, n);
	// 雲に陰影＝立体感（濃い所はやや暗く、盛り上がりは明るく）。
	float shade = mix(0.72, 1.05, smoothstep(0.35, 0.95, n));
	// 低い三人称カメラでは 空は“地平のすぐ上の帯”しか見えない＝そこに雲を出す。
	float horizon = smoothstep(-0.02, 0.10, d.y);
	ALBEDO = cloud_col * shade;
	ALPHA = c * alpha * horizon;
}
"""
	mat.shader = sh
	dome.surface_set_material(0, mat)
	_cloud_mat = mat
	var mmi := MeshInstance3D.new()
	mmi.name = "Clouds"
	mmi.mesh = dome
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mmi.extra_cull_margin = 200.0   # 常に描く（カメラが中に居るため）
	add_child(mmi)
	_cloud_mmi = mmi


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

	# ACESフィルミック寄りのトーン。露出は控えめ＝ハイライトの白飛びを抑える。
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 0.85
	env.tonemap_white = 1.4

	# ブルームは“強い光だけ”に絞る（しきい値を上げ・量を下げ）＝全体の白もやを防ぐ。
	env.glow_enabled = true
	env.glow_intensity = 0.16
	env.glow_strength = 0.9
	env.glow_bloom = 0.02
	env.glow_hdr_threshold = 1.7

	# カラーグレーディング：明るさは上げず、コントラストと彩度で締める＝色が濁らず映える。
	env.adjustment_enabled = true
	env.adjustment_brightness = 1.0
	env.adjustment_contrast = 1.16
	env.adjustment_saturation = 1.2

	env.fog_enabled = true
	env.fog_light_energy = 0.8

	# PC「きれい版」(Forward+/Vulkan)だけ：接触影(AO)と反射で立体感を一段上げる。
	# スマホ(Mobile)・古いPC(gl_compatibility)では無効＝カクつかせない。写真に一番近い見た目はここ。
	if _is_high_fidelity():
		# === グラフィック最大（PCきれい版・Forward+）===
		# 接触影(AO)・面反射光(SSIL)を強めに
		env.ssao_enabled = true
		env.ssao_radius = 2.0
		env.ssao_intensity = 3.0
		env.ssao_detail = 1.5
		env.ssao_power = 2.0
		env.ssil_enabled = true
		env.ssil_intensity = 1.2
		# スクリーンスペース反射（濡れた地面・水面に景色が映る）
		env.ssr_enabled = true
		env.ssr_max_steps = 96
		env.ssr_fade_in = 0.2
		env.ssr_fade_out = 4.0
		# リアルタイム大域照明（光が回り込み・色がにじむ＝写真的な陰影）
		env.sdfgi_enabled = true
		env.sdfgi_use_occlusion = true
		env.sdfgi_bounce_feedback = 0.5
		# ボリューメトリック・フォグ（空気の立体感・光の柱／木漏れ日）
		env.volumetric_fog_enabled = true
		env.volumetric_fog_density = 0.018
		env.volumetric_fog_albedo = Color(0.92, 0.88, 0.82)
		env.volumetric_fog_length = 96.0
		env.volumetric_fog_gi_inject = 1.0
		env.glow_bloom = 0.06
		# 被写界深度＋自動露出（映画的な絵）
		var cam_attr := CameraAttributesPractical.new()
		cam_attr.dof_blur_far_enabled = true
		cam_attr.dof_blur_far_distance = 34.0
		cam_attr.dof_blur_far_transition = 22.0
		cam_attr.dof_blur_amount = 0.05
		cam_attr.auto_exposure_enabled = true
		_env.camera_attributes = cam_attr

	_env.environment = env


## 今この瞬間、Forward+（Vulkan・PCきれい版）で描いているか。
## AO等の重い効果は“きれい版”だけで有効にする判定に使う。
func _is_high_fidelity() -> bool:
	return RenderingServer.get_current_rendering_method() == "forward_plus"


## 太陽。夕方寄りの暖色＋やわらかい影で、のっぺりを避ける。
func _setup_sun() -> void:
	if _sun == null:
		return
	# マジックアワー（夕方寄り）：低い角度の金色の光＋長い影＝いちばん“映える”。
	_sun.rotation_degrees = Vector3(-24.0, 128.0, 0.0)
	_sun.light_color = Color(1.0, 0.86, 0.68)   # 金色（少しだけ白めで濁らせない）
	_sun.light_energy = 1.12
	# 影は重いので軽い機種では簡素化：Web=影オフ、モバイル/互換=1分割、きれい版=4分割。
	_sun.shadow_enabled = _q >= 0.35
	_sun.directional_shadow_blend_splits = _q >= 0.9
	_sun.directional_shadow_mode = (
		DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS if _q >= 0.9
		else DirectionalLight3D.SHADOW_ORTHOGONAL
	)
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
uniform vec3 soil : source_color = vec3(0.30, 0.31, 0.26);
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
## 草の刃：先細りの十字クアッド（2枚直交）。BoxMesh(角材)より“芝”に見える＝目線の高さの安っぽさ解消。
## MultiMeshなのでドローコールは1のまま。y∈[-0.15,0.15]（既存の伸長トランスフォームに合わせる）。
func _grass_blade_mesh() -> ArrayMesh:
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	var uvs := PackedVector2Array()
	var idx := PackedInt32Array()
	_grass_quad(verts, norms, uvs, idx, false)   # +Z 向きの面
	_grass_quad(verts, norms, uvs, idx, true)    # +X 向きの面（直交）
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = norms
	arr[Mesh.ARRAY_TEX_UV] = uvs
	arr[Mesh.ARRAY_INDEX] = idx
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return m


func _grass_quad(verts: PackedVector3Array, norms: PackedVector3Array, uvs: PackedVector2Array, idx: PackedInt32Array, cross: bool) -> void:
	var w0 := 0.032   # 根元の半幅
	var w1 := 0.008   # 穂先の半幅（先細り）
	var y0 := -0.15
	var y1 := 0.15
	var base := verts.size()
	var n := Vector3(0, 0, 1)
	if cross:
		n = Vector3(1, 0, 0)
		verts.append(Vector3(0, y0, -w0)); verts.append(Vector3(0, y0, w0))
		verts.append(Vector3(0, y1, w1)); verts.append(Vector3(0, y1, -w1))
	else:
		verts.append(Vector3(-w0, y0, 0)); verts.append(Vector3(w0, y0, 0))
		verts.append(Vector3(w1, y1, 0)); verts.append(Vector3(-w1, y1, 0))
	for _k in 4:
		norms.append(n)
	# UV.y：根元=1(暗い)、穂先=0(明るい)＝既存フラグメントの陰影に合わせる
	uvs.append(Vector2(0, 1)); uvs.append(Vector2(1, 1))
	uvs.append(Vector2(1, 0)); uvs.append(Vector2(0, 0))
	idx.append(base + 0); idx.append(base + 1); idx.append(base + 2)
	idx.append(base + 0); idx.append(base + 2); idx.append(base + 3)


func _build_grass() -> void:
	var blade := _grass_blade_mesh()

	var mat := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_disabled;
uniform float wind = 0.10;
// 踏み分け：xyz=プレイヤーのワールド位置 / w=有効(1)。近くの草の穂先を外へ倒し少し沈める。
uniform vec4 treaders[4];
uniform float tread_r = 1.35;   // この半径内の草が反応する
void vertex() {
	float base_x = MODEL_MATRIX[3].x;
	float base_z = MODEL_MATRIX[3].z;
	float h = clamp((VERTEX.y + 0.15) / 0.3, 0.0, 1.0);   // 0=根元 1=穂先
	float s = sin(TIME * 1.6 + base_x * 0.6 + base_z * 0.4);
	float c = cos(TIME * 1.2 + base_z * 0.7);
	VERTEX.x += s * wind * h;
	VERTEX.z += c * wind * 0.6 * h;
	// プレイヤーが近い草を踏み分ける（ワールド押しをモデル空間へ変換して当てる）。
	vec3 wpush = vec3(0.0);
	float sink = 0.0;
	for (int i = 0; i < 4; i++) {
		if (treaders[i].w < 0.5) { continue; }
		vec2 d = vec2(base_x, base_z) - treaders[i].xz;
		float dist = length(d);
		if (dist < tread_r) {
			float k = 1.0 - dist / tread_r;          // 近いほど強い 0..1
			vec2 dir = dist > 0.001 ? d / dist : vec2(1.0, 0.0);
			wpush += vec3(dir.x, 0.0, dir.y) * (k * 0.6);   // 外向きに倒す
			sink += k * k * 0.22;                            // ぺたんと沈む
		}
	}
	if (sink > 0.0) {
		vec3 mpush = wpush * mat3(MODEL_MATRIX);   // ワールド押し→モデルX/Z（回転の逆写像）
		VERTEX.x += mpush.x * h;
		VERTEX.z += mpush.z * h;
		VERTEX.y -= min(sink, 0.35) * h;
	}
}
void fragment() {
	float h = clamp((UV.y), 0.0, 1.0);
	// COLOR＝MultiMeshのインスタンス色。根元を暗く、穂先を明るく。
	ALBEDO = COLOR.rgb * mix(0.55, 1.15, 1.0 - UV.y);
	ROUGHNESS = 1.0;
}
"""
	mat.shader = sh
	# Webは 頂点のTIMEアニメ（cull_disabled 150本）が重い＝揺れをオフにして負荷を下げる。
	# ※踏み分けは TIME 非依存・実プレイヤー数ぶんだけ（1〜2）＝軽いので Web でも残す。
	if OS.has_feature("web"):
		mat.set_shader_parameter("wind", 0.0)
	_grass_mat = mat
	blade.surface_set_material(0, mat)

	_grass_mm = MultiMesh.new()
	_grass_mm.transform_format = MultiMesh.TRANSFORM_3D
	_grass_mm.use_colors = true
	_grass_mm.mesh = blade
	_grass_mm.instance_count = _grass_n

	var rng := RandomNumberGenerator.new()
	rng.seed = 20260821   # 固定シード＝毎回同じ配置（クライアント間でも揃う）
	for i in _grass_n:
		var x := rng.randf_range(-35.0, 35.0)
		var z := rng.randf_range(-35.0, 35.0)
		var h := rng.randf_range(0.6, 1.5)
		if x > -3.6 and x < 3.6 and z > -11.5 and z < -6.5:
			h = 0.0   # 排水溝の上には生やさない
		_grass_pos.append(Vector3(x, 0.0, z))
		_grass_h.append(h)
		_grass_yaw.append(rng.randf_range(0.0, TAU))
		var c := Color(0.26, 0.42, 0.16).lerp(Color(0.5, 0.72, 0.32), rng.randf())
		_grass_col.append(c)
		_grass_mm.set_instance_color(i, c)

	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Grass"
	mmi.multimesh = _grass_mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF   # 草の影は重い＆汚いので切る
	_grass_mmi = mmi
	add_child(mmi)
	_update_grass(WorldState.recovery)


## 花の頭：平たい円盤（＝コインに見える）をやめ、6枚の花びらの“星形”＋少し盛り上げた中心へ。
## 目線の高さに来る掃除のごほうびを 花らしく格上げ。単色（インスタンス色）で MultiMesh を維持。
func _flower_head_mesh() -> ArrayMesh:
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	var idx := PackedInt32Array()
	verts.append(Vector3(0.0, 0.03, 0.0))   # 中心（少し盛り上げる＝ドーム感で光を拾う）
	norms.append(Vector3.UP)
	var petals := 6
	var seg := petals * 2
	for k in seg:
		var a := TAU * float(k) / float(seg)
		var rad := 0.14 if (k % 2 == 0) else 0.055   # 山=花びらの先 / 谷=花びらの間
		verts.append(Vector3(cos(a) * rad, 0.0, sin(a) * rad))
		norms.append(Vector3.UP)
	for k in seg:
		idx.append(0)
		idx.append(1 + ((k + 1) % seg))
		idx.append(1 + k)
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = norms
	arr[Mesh.ARRAY_INDEX] = idx
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return m


## 花。花びららしい星形。回復30%から咲き始め100%で満開。
func _build_flowers() -> void:
	var head := _flower_head_mesh()
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.6
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED   # 上下どちらから見ても花びらが見える
	mat.emission_enabled = true
	mat.emission = Color(1, 1, 1)
	mat.emission_energy_multiplier = 0.3   # ブルームでほんのり光る
	head.surface_set_material(0, mat)

	_flower_mm = MultiMesh.new()
	_flower_mm.transform_format = MultiMesh.TRANSFORM_3D
	_flower_mm.use_colors = true
	_flower_mm.mesh = head
	# 花は草の位置を再利用して置く。草が無い（_grass_pos が空）と割り算でゼロ除算になるので、
	# その場合は花を出さない（＝安全に空で返す）。
	if _grass_pos.is_empty():
		_flower_n = 0
		_flower_mm.instance_count = 0
		var empty_mmi := MultiMeshInstance3D.new()
		empty_mmi.name = "Flowers"
		empty_mmi.multimesh = _flower_mm
		_flower_mmi = empty_mmi
		add_child(empty_mmi)
		return
	_flower_mm.instance_count = _flower_n

	var cols := [Color(0.98, 0.42, 0.55), Color(1.0, 0.86, 0.38), Color(0.95, 0.95, 0.98), Color(0.78, 0.56, 0.95)]
	var rng := RandomNumberGenerator.new()
	rng.seed = 99887766
	for i in _flower_n:
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
	# 汚れ時も草を消さず“枯れた短い草”を残す＝「空っぽ」でなく「汚い」に見せ、緑化の落差を最大化。
	var grow := lerpf(0.42, 1.0, clampf(r * 1.2, 0.0, 1.0))
	# 枯草(灰茶)→ みずみずしい緑（各草の基準色）へ。回復イベント時だけのループ＝毎フレーム負荷なし。
	var withered := Color(0.44, 0.42, 0.26)
	var recolor := _grass_col.size() == _grass_pos.size()
	for i in _grass_pos.size():
		var h := _grass_h[i] * grow
		var basis := Basis(Vector3.UP, _grass_yaw[i]).scaled(Vector3(1.0, maxf(0.001, h), 1.0))
		var origin: Vector3 = _grass_pos[i] + Vector3(0.0, 0.15 * h, 0.0)
		_grass_mm.set_instance_transform(i, Transform3D(basis, origin))
		if recolor and _grass_h[i] > 0.0:
			_grass_mm.set_instance_color(i, withered.lerp(_grass_col[i], clampf(r * 1.1, 0.0, 1.0)))


## 草の踏み分け：プレイヤー全員のワールド位置を草シェーダの treaders[] へ毎フレーム渡す。
## 見た目のみ・全員の画面で回る（位置は既に同期済み）＝netcode不要。最大4人ぶん。
func _update_grass_tread() -> void:
	if _grass_mat == null:
		return
	var arr := [Vector4.ZERO, Vector4.ZERO, Vector4.ZERO, Vector4.ZERO]
	var n := 0
	for p in get_tree().get_nodes_in_group("player"):
		if n >= 4:
			break
		var pos: Vector3 = (p as Node3D).global_position
		arr[n] = Vector4(pos.x, pos.y, pos.z, 1.0)
		n += 1
	_grass_mat.set_shader_parameter("treaders", arr)


func _update_flowers(r: float) -> void:
	if _flower_mm == null:
		return
	if not _cfg()["flowers"]:
		_flower_mm.visible_instance_count = 0   # 遺跡に花は咲かない
		return
	var t := clampf((r - 0.2) / 0.8, 0.0, 1.0)   # 早めに咲き始める＝達成感を前倒し
	_flower_mm.visible_instance_count = int(round(_flower_n * t))


func _update_sky_fog(r: float) -> void:
	var cfg := _cfg()
	var sky_t0: Color = cfg["sky_top"][0]
	var sky_t1: Color = cfg["sky_top"][1]
	var sky_h0: Color = cfg["sky_horizon"][0]
	var sky_h1: Color = cfg["sky_horizon"][1]
	var fog0: Color = cfg["fog_col"][0]
	var fog1: Color = cfg["fog_col"][1]
	var fd0: float = cfg["fog_d"][0]
	var fd1: float = cfg["fog_d"][1]
	# 水面が映す空の色を 今の空と同期（水平方向の反射＝主に地平の色＋少し上空）。
	# 汚れた空は くすんだ反射、澄んだ空は 明るい反射＝水が「今の空」を映す。
	if _water_mat != null:
		var horizon := sky_h0.lerp(sky_h1, r)
		var top := sky_t0.lerp(sky_t1, r)
		_water_mat.set_shader_parameter("sky_reflect", horizon.lerp(top, 0.35))
	# 雲：屋外(庭/みずべ/そら)だけ表示。汚れ時は灰色の曇天で多め、回復で白い浮き雲→夕やけの淡いピンクへ。
	if _cloud_mmi != null:
		var outdoor := biome == "garden" or biome == "water" or biome == "sky"
		_cloud_mmi.visible = outdoor
		if outdoor and _cloud_mat != null:
			var base := Color(0.55, 0.56, 0.60).lerp(Color(1.0, 0.99, 0.96), clampf(r * 1.3, 0.0, 1.0))
			var warm := base.lerp(Color(1.0, 0.85, 0.72), smoothstep(0.65, 1.0, r) * 0.6)
			_cloud_mat.set_shader_parameter("cloud_col", warm)
			_cloud_mat.set_shader_parameter("coverage", lerpf(0.62, 0.42, r))
			_cloud_mat.set_shader_parameter("alpha", lerpf(0.85, 0.7, r))
	if _is_ruins():
		# 遺跡：薄暗く苔むした空気。回復しても“青空”にはならず、澄んだ翠に。
		if _sky_mat != null:
			_sky_mat.sky_top_color = sky_t0.lerp(sky_t1, r)
			_sky_mat.sky_horizon_color = sky_h0.lerp(sky_h1, r)
			_sky_mat.ground_horizon_color = cfg["gnd_h"]
			_sky_mat.ground_bottom_color = cfg["gnd_b"]
		var e := _env.environment
		if e != null:
			e.fog_light_color = fog0.lerp(fog1, r)
			e.fog_density = lerpf(fd0, fd1, r)   # 常にうっすら霧が残る
		return
	if _sky_mat != null:
		# 汚: くすんだ曇天 → 回復: 夕方のマジックアワー（上は青紫、地平は金/桃）
		_sky_mat.sky_top_color = sky_t0.lerp(sky_t1, r)
		_sky_mat.sky_horizon_color = sky_h0.lerp(sky_h1, r)
		_sky_mat.sun_angle_max = 22.0
		_sky_mat.sky_energy_multiplier = 1.0
		_sky_mat.ground_horizon_color = WorldState.ground_color()
		_sky_mat.ground_bottom_color = WorldState.ground_color()
	var env := _env.environment
	if env != null:
		# 遠景に金色のもや（大気遠近）で奥行きを出す。回復で澄んで遠くまで見える。
		env.fog_light_color = fog0.lerp(fog1, r)
		env.fog_density = lerpf(fd0, fd1, r)   # 濃い茶霧を薄め、手前の濁りを抜く


## 空気に舞う花粉/ちり：目線の高さの空間に 小さな光の粒がゆっくり漂う＝“生きた空気”。
## 頂点シェーダで漂わせる（CPU負荷ゼロ・1ドローコール）。回復で 灰のちり→金の花粉、数も増える。
func _build_motes() -> void:
	var dot := SphereMesh.new()
	dot.radius = 0.05
	dot.height = 0.1
	dot.radial_segments = 5
	dot.rings = 3
	var mat := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never;
uniform vec3 mote_col : source_color = vec3(1.0, 0.95, 0.7);
uniform float glow = 1.6;
varying float tw;
void vertex(){
	float ph = INSTANCE_CUSTOM.r * 6.2831;
	float sp = 0.3 + INSTANCE_CUSTOM.g * 0.6;
	// ゆるやかな漂い（水平の8の字＋上下のふわり）
	VERTEX.x += sin(TIME * sp + ph) * 0.5;
	VERTEX.z += cos(TIME * sp * 0.8 + ph) * 0.5;
	VERTEX.y += sin(TIME * 0.4 + ph) * 0.3;
	tw = 0.45 + 0.55 * sin(TIME * (1.0 + INSTANCE_CUSTOM.b * 3.0) + INSTANCE_CUSTOM.a * 6.2831);
}
void fragment(){
	ALBEDO = mote_col;
	EMISSION = mote_col * glow;
	ALPHA = tw;   // きらめき（明滅）＝光を拾う粒
}
"""
	mat.shader = sh
	mat.set_shader_parameter("mote_col", Color(0.7, 0.72, 0.66))
	dot.surface_set_material(0, mat)
	_mote_mat = mat

	_mote_n = 40 if OS.has_feature("web") else 90
	_mote_mm = MultiMesh.new()
	_mote_mm.transform_format = MultiMesh.TRANSFORM_3D
	_mote_mm.use_custom_data = true
	_mote_mm.mesh = dot
	_mote_mm.instance_count = _mote_n
	var rng := RandomNumberGenerator.new()
	rng.seed = 424242
	for i in _mote_n:
		var pos := Vector3(rng.randf_range(-30.0, 30.0), rng.randf_range(0.6, 4.5), rng.randf_range(-30.0, 30.0))
		_mote_mm.set_instance_transform(i, Transform3D(Basis.IDENTITY, pos))
		_mote_mm.set_instance_custom_data(i, Color(rng.randf(), rng.randf(), rng.randf(), rng.randf()))
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Motes"
	mmi.multimesh = _mote_mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mmi.extra_cull_margin = 40.0
	add_child(mmi)
	_update_motes(WorldState.recovery)


## 回復で 花粉/ちり の色と数を変える。汚れ時は少なめの灰のちり、回復で金の花粉が増えて舞う。
func _update_motes(r: float) -> void:
	if _mote_mm == null:
		return
	# 屋内(house)は“ホコリ”＝汚れているほど 多く舞い、きれいにすると 消える（屋外の花粉とは逆）。
	if biome == "house":
		_mote_mm.visible_instance_count = int(_mote_n * lerpf(1.0, 0.10, clampf(r * 1.1, 0.0, 1.0)))
		if _mote_mat != null:
			_mote_mat.set_shader_parameter("mote_col", Color(0.55, 0.50, 0.44))   # くすんだホコリ色
			_mote_mat.set_shader_parameter("glow", 0.45)
		return
	# 屋外：回復で 花粉が増える（灰のちり→金の花粉）。遺跡はうっすら胞子。
	_mote_mm.visible_instance_count = int(_mote_n * lerpf(0.35, 1.0, r))
	if _mote_mat != null:
		var dust := Color(0.62, 0.63, 0.58)      # くすんだ灰のちり
		var pollen := Color(1.0, 0.9, 0.55)       # あたたかい金の花粉
		_mote_mat.set_shader_parameter("mote_col", dust.lerp(pollen, clampf(r * 1.15, 0.0, 1.0)))
		_mote_mat.set_shader_parameter("glow", lerpf(0.6, 1.3, r))


## 地面の小さな生き物：小さな甲虫が ちょこちょこ歩き回る＝“戻ってきた命”。
## 頂点シェーダで各個体を小さな楕円軌道に歩かせる（CPU負荷ゼロ・1ドローコール）。回復で数が増える。
func _build_critters() -> void:
	var body := SphereMesh.new()
	body.radius = 0.07
	body.height = 0.09       # 少し平たい甲虫の胴
	body.radial_segments = 6
	body.rings = 4
	var mat := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_disabled;
uniform vec3 body_col : source_color = vec3(0.22, 0.15, 0.11);
void vertex(){
	float ph = INSTANCE_CUSTOM.r * 6.2831;
	float sp = 0.25 + INSTANCE_CUSTOM.g * 0.45;
	float rad = 0.8 + INSTANCE_CUSTOM.b * 1.8;
	// 楕円軌道でうろうろ＋ちょこちょこ小刻みに上下（歩く感じ）
	VERTEX.x += cos(TIME * sp + ph) * rad;
	VERTEX.z += sin(TIME * sp * 1.1 + ph) * rad * 0.7;
	VERTEX.y += abs(sin(TIME * sp * 5.0 + ph)) * 0.025;
}
void fragment(){
	// 上面を少し明るく＝甲虫のつや（真っ黒に潰れない）
	float top = clamp(NORMAL.y * 0.5 + 0.5, 0.0, 1.0);
	ALBEDO = body_col * mix(0.8, 1.35, top);
	ROUGHNESS = 0.6;
}
"""
	mat.shader = sh
	body.surface_set_material(0, mat)

	_crit_n = 12 if OS.has_feature("web") else 24
	_crit_mm = MultiMesh.new()
	_crit_mm.transform_format = MultiMesh.TRANSFORM_3D
	_crit_mm.use_custom_data = true
	_crit_mm.mesh = body
	_crit_mm.instance_count = _crit_n
	var rng := RandomNumberGenerator.new()
	rng.seed = 90210
	for i in _crit_n:
		var pos := Vector3(rng.randf_range(-28.0, 28.0), 0.09, rng.randf_range(-28.0, 28.0))
		# 胴を少し平たく（甲虫らしく）
		var basis := Basis().scaled(Vector3(1.0, 0.6, 1.3))
		_crit_mm.set_instance_transform(i, Transform3D(basis, pos))
		_crit_mm.set_instance_custom_data(i, Color(rng.randf(), rng.randf(), rng.randf(), rng.randf()))
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Critters"
	mmi.multimesh = _crit_mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mmi.extra_cull_margin = 40.0
	add_child(mmi)
	_update_critters(WorldState.recovery)


## 回復で 地面の生き物の数を増やす（汚れ時は少し、緑で にぎやか）。空(sky)には出さない。
func _update_critters(r: float) -> void:
	if _crit_mm == null:
		return
	var on := biome != "sky"
	_crit_mm.visible_instance_count = int(_crit_n * lerpf(0.2, 1.0, r)) if on else 0


## 蝶。回復するほど数が増える“命”。羽ばたきは頂点シェーダ、飛行はCPUで軽く。
func _build_butterflies() -> void:
	var wing := PlaneMesh.new()
	wing.size = Vector2(0.28, 0.2)
	wing.subdivide_width = 6

	var mat := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_disabled, unshaded;
varying float vx;
void vertex() {
	vx = abs(VERTEX.x);   // 羽ばたきで動かす前の“中心からの距離”を渡す
	float phase = INSTANCE_CUSTOM.r * 6.2831;
	float spd = 7.0 + INSTANCE_CUSTOM.g * 9.0;
	float flap = 0.5 + 0.5 * sin(TIME * spd + phase);
	// 中心線(x=0)から外へいくほど上下に折る＝羽ばたき
	VERTEX.y += -abs(VERTEX.x) * (0.5 + 1.1 * flap);
}
void fragment() {
	// 羽の外ふちを明るく2トーンに＝遠目でも“ひらひら”感が増す（羽の縁取り）。
	float edge = clamp(vx / 0.14, 0.0, 1.0);
	vec3 col = mix(COLOR.rgb, COLOR.rgb * 1.4, step(0.55, edge));
	ALBEDO = col;
	EMISSION = col * 0.35;
}
"""
	mat.shader = sh
	wing.material = mat

	_bfly_mm = MultiMesh.new()
	_bfly_mm.transform_format = MultiMesh.TRANSFORM_3D
	_bfly_mm.use_colors = true
	_bfly_mm.use_custom_data = true
	_bfly_mm.mesh = wing
	_bfly_mm.instance_count = _bfly_n

	var cols := [
		Color(1.0, 0.85, 0.35),   # 黄
		Color(1.0, 0.6, 0.72),    # 桃
		Color(0.98, 0.98, 1.0),   # 白
		Color(0.62, 0.8, 1.0),    # 水色
		Color(0.9, 0.55, 0.95),   # 藤
	]
	var rng := RandomNumberGenerator.new()
	rng.seed = 8008135
	for i in _bfly_n:
		var ang := rng.randf_range(0.0, TAU)
		var rad := rng.randf_range(6.0, 30.0)
		_bfly_center.append(Vector3(cos(ang) * rad, rng.randf_range(0.7, 2.0), sin(ang) * rad))
		_bfly_radius.append(rng.randf_range(1.2, 3.6))
		_bfly_speed.append(rng.randf_range(0.5, 1.3))
		_bfly_phase.append(rng.randf_range(0.0, TAU))
		_bfly_bob.append(rng.randf_range(0.2, 0.6))
		_bfly_mm.set_instance_color(i, cols[rng.randi() % cols.size()])
		_bfly_mm.set_instance_custom_data(i, Color(rng.randf(), rng.randf(), 0.0, 0.0))
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Butterflies"
	mmi.multimesh = _bfly_mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mmi)
	_update_butterfly_count(WorldState.recovery)


func _update_butterflies(delta: float) -> void:
	if _bfly_mm == null:
		return
	_anim_t += delta
	var vis := _bfly_mm.visible_instance_count
	if vis < 0:
		vis = _bfly_n
	for i in mini(vis, _bfly_center.size()):
		var ang: float = _bfly_phase[i] + _anim_t * _bfly_speed[i]
		var c: Vector3 = _bfly_center[i]
		var rad: float = _bfly_radius[i]
		var pos := c + Vector3(cos(ang) * rad, sin(_anim_t * 2.2 + _bfly_phase[i]) * _bfly_bob[i], sin(ang) * rad * 0.7)
		var yaw := ang + PI * 0.5
		var basis := Basis(Vector3.UP, yaw) * Basis(Vector3.RIGHT, -0.5)   # 少し前傾＝上から羽が見える
		_bfly_mm.set_instance_transform(i, Transform3D(basis, pos))


## 回復（と舞台）で蝶の数を決める。汚れた最初でも数匹は舞い、みどりが戻ると賑やかに。
func _update_butterfly_count(r: float) -> void:
	if _bfly_mm == null:
		return
	var t := clampf((r - 0.05) / 0.6, 0.0, 1.0)
	var vis := mini(_bfly_n, 4 + int(round((_bfly_n - 4) * t)))
	vis = int(vis * float(_cfg()["bfly_frac"]))   # 遺跡は命がまばら（庭は×1.0で不変）
	_bfly_mm.visible_instance_count = vis


func _on_recovery_changed(_value: float) -> void:
	var r := WorldState.recovery
	if _ground_shader != null:
		# 開始(r=0)でも わずかに緑の気配を残す＝“泥”に見えない。回復でぐっと緑へ。
		_ground_shader.set_shader_parameter("greenness", clampf(r * 0.86 + 0.12, 0.0, 1.0))
	# 太陽も回復で“晴れて”いく：汚れ時は白茶けて弱く、満開で金色マジックアワー＝payoffが跳ねる。
	# 夜の森は「暗い→月あかりが差して明るく」＝クールで控えめに（浄化の光が映える）。
	if _sun != null and biome == "night":
		_sun.light_color = Color(0.42, 0.47, 0.66).lerp(Color(0.72, 0.80, 0.98), r)
		_sun.light_energy = lerpf(0.35, 0.95, r)
	elif _sun != null and biome == "house":
		# 室内：薄暗い電球色 → 掃除して 明るく澄む（外の金色にはしない）。
		_sun.light_color = Color(0.9, 0.82, 0.68).lerp(Color(1.0, 0.95, 0.86), r)
		_sun.light_energy = lerpf(0.6, 1.05, r)
	elif _sun != null and Net.world_biome != "ruins":
		_sun.light_color = Color(0.86, 0.85, 0.82).lerp(Color(1.0, 0.86, 0.62), r)
		_sun.light_energy = lerpf(0.95, 1.25, r)
	_update_butterfly_count(r)
	if _water_mat != null:
		_water_mat.set_shader_parameter("clarity", r)   # 回復ほど水が澄む
	# 第3章の浅い水：回復で にごり(緑茶けた濃い)→ すきとおる(淡く青い)へ。
	if _water_lite_mat != null:
		var murky := Color(0.22, 0.34, 0.30, 0.72)
		var clear := Color(0.42, 0.62, 0.68, 0.34)
		_water_lite_mat.albedo_color = murky.lerp(clear, r)
	_update_sky_fog(r)
	_update_sky_rays(r)
	_update_grass(r)
	_update_flowers(r)
	_update_motes(r)
	_update_critters(r)
	_update_plants(r)
	_update_tree_leaves(r)
	var env := _env.environment
	if env != null:
		env.background_color = WorldState.sky_color()
		# （ambient は AMBIENT_SOURCE_SKY のため ambient_light_color は無視される＝設定しない）
		# ★色を取り戻す★ 汚れ時は彩度・コントラストを落として澱ませ、回復でパッと発色させる。
		# 画面全体のグレーディング1本で「掃除で世界がよみがえる」の before→after を劇的にする。
		# 暗所(夜/家)は沈みすぎないよう回復量を頭打ちに。
		var gr := r if (biome != "night" and biome != "house") else minf(r, 0.85)
		env.adjustment_saturation = lerpf(0.66, 1.28, gr)
		env.adjustment_contrast = lerpf(1.04, 1.18, gr)
