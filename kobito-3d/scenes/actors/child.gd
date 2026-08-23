extends CharacterBody3D
## 子ども（追従NPC）— 家族の隊列
##
## 頭の子は「いちばん近い親（プレイヤー）」を追い、あとの子は「前の子」を追う。
## これだけで、親のあとをぞろぞろ付いてくる可愛い隊列になる。
##
## 動かすのはサーバだけ。10Hzで位置を配り、クライアントは寄せるだけ（虫と同じ流儀）。
## 戦わない・HPもない。ぶつかって列を乱さないよう、当たり判定は地面とだけ。

const SYNC_HZ := 10.0
const GRAVITY := 14.0
const SPACING := 0.62       # 前の子（親）との保つ距離
const SPEED := 4.4          # 追いつく最高速。親より少し速く、離れても追いつける
const CATCHUP := 6.0        # 離れているほど速く追う係数

var follows_player := false     # true＝頭の子。いちばん近い親を追う
var leader_path: NodePath       # follows_player=false のとき、追う前の子

# 協力ギミックの“相方”役。helping中は親ではなく指定地点へ向かう
# （ソロ時、子NPCが同時スイッチの片方に乗ってくれる）。
var helping := false
var helper_target := Vector3.ZERO

# 隊列パラメータ（子ごとに変えられる）。末っ子つぼみは spacing を広げ speed を下げると
# 少し遅れて、ちょこちょこ追いつく“末っ子”らしい芝居になる。
var follow_spacing := SPACING
var follow_speed := SPEED
var follow_catchup := CATCHUP

var child_name := "こども"
var body_color := Color.WHITE
var body_scale := 0.6
var role := "child"        # "adult"＝母などの大人（見た目が変わる）

var _sync_accum := 0.0
var _net_pos := Vector3.ZERO

@onready var _body: MeshInstance3D = $Body
@onready var _label: Label3D = $NameLabel


func _ready() -> void:
	# 大人（母）は "child" ではなく "family" に入れる（子ども8人の判定を汚さない）。
	add_to_group("family")
	if role != "adult":
		add_to_group("child")
	_net_pos = global_position

	var mat := StandardMaterial3D.new()
	mat.albedo_color = body_color
	mat.roughness = 0.9
	_body.material_override = mat
	KobitoLook.decorate(_body, body_color, false, role, child_name)
	scale = Vector3.ONE * body_scale
	_label.text = child_name
	set_physics_process(true)


func _physics_process(delta: float) -> void:
	if not multiplayer.has_multiplayer_peer():
		return
	if multiplayer.is_server():
		_follow(delta)
		_sync_accum += delta
		if _sync_accum >= 1.0 / SYNC_HZ:
			_sync_accum = 0.0
			rpc("_remote_state", global_position, rotation.y)
	else:
		global_position = global_position.lerp(_net_pos, clampf(delta * 12.0, 0.0, 1.0))


func _follow(delta: float) -> void:
	velocity.y -= GRAVITY * delta
	if is_on_floor():
		velocity.y = -0.1

	# 相方役なら指定地点へ。そうでなければ親/前の子を追う。
	var target_pos: Vector3
	var stop_dist := follow_spacing
	if helping:
		target_pos = helper_target
		stop_dist = 0.25          # 台の上でしっかり止まる
	else:
		var leader := _current_leader()
		if leader == null:
			velocity.x = move_toward(velocity.x, 0.0, 8.0 * delta)
			velocity.z = move_toward(velocity.z, 0.0, 8.0 * delta)
			move_and_slide()
			return
		target_pos = leader.global_position

	var to_leader: Vector3 = target_pos - global_position
	to_leader.y = 0.0
	var dist := to_leader.length()
	if dist > stop_dist:
		var dir := to_leader / dist
		var speed := minf(follow_speed, (dist - follow_spacing) * follow_catchup)
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed
		rotation.y = atan2(-dir.x, -dir.z)
	else:
		velocity.x = move_toward(velocity.x, 0.0, 10.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 10.0 * delta)

	move_and_slide()


func _current_leader() -> Node3D:
	if follows_player:
		return _nearest_player()
	return get_node_or_null(leader_path)


func _nearest_player() -> Node3D:
	var best: Node3D = null
	var best_dist := 9999.0
	for p in get_tree().get_nodes_in_group("player"):
		var d: float = p.global_position.distance_to(global_position)
		if d < best_dist:
			best_dist = d
			best = p
	return best


@rpc("authority", "unreliable_ordered")
func _remote_state(pos: Vector3, yaw: float) -> void:
	_net_pos = pos
	rotation.y = yaw


## 協力ギミックから呼ばれる：指定地点へ相方として向かう（サーバのみ有効）
func help_go(pos: Vector3) -> void:
	helping = true
	helper_target = pos


func help_stop() -> void:
	helping = false
