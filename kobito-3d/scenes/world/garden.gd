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
@onready var _ground: MeshInstance3D = $Ground
@onready var _ground_mat := StandardMaterial3D.new()
@onready var _env: WorldEnvironment = $WorldEnvironment


func _ready() -> void:
	_ground.material_override = _ground_mat
	WorldState.recovery_changed.connect(_on_recovery_changed)
	Net.roster_changed.connect(_reconcile_players)
	$CleanupZone.body_entered.connect(_on_cleanup_zone_entered)
	if multiplayer.has_multiplayer_peer():
		multiplayer.peer_connected.connect(_on_peer_connected)
	_on_recovery_changed(WorldState.recovery)
	_reconcile_players()


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

func _on_recovery_changed(_value: float) -> void:
	_ground_mat.albedo_color = WorldState.ground_color()
	var env := _env.environment
	if env != null:
		env.background_color = WorldState.sky_color()
		env.ambient_light_color = WorldState.sky_color()
