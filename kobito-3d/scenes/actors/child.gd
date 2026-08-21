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

var child_name := "こども"
var body_color := Color.WHITE
var body_scale := 0.6

var _sync_accum := 0.0
var _net_pos := Vector3.ZERO

@onready var _body: MeshInstance3D = $Body
@onready var _label: Label3D = $NameLabel


func _ready() -> void:
	add_to_group("child")
	_net_pos = global_position

	var mat := StandardMaterial3D.new()
	mat.albedo_color = body_color
	mat.roughness = 0.9
	_body.material_override = mat
	KobitoLook.decorate(_body, body_color)
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

	var leader := _current_leader()
	if leader == null:
		velocity.x = move_toward(velocity.x, 0.0, 8.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 8.0 * delta)
		move_and_slide()
		return

	var to_leader: Vector3 = leader.global_position - global_position
	to_leader.y = 0.0
	var dist := to_leader.length()
	if dist > SPACING:
		var dir := to_leader / dist
		var speed := minf(SPEED, (dist - SPACING) * CATCHUP)
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
