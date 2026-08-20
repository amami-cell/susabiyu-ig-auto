extends CharacterBody3D
## 虫（敵）
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

@onready var _body: MeshInstance3D = $Body


func _ready() -> void:
	add_to_group("bug")
	if stats == null:
		stats = load("res://data/ant.tres")
	hp = stats.max_hp
	_net_pos = global_position

	var mat := StandardMaterial3D.new()
	mat.albedo_color = stats.body_color
	_body.material_override = mat
	_body.scale = Vector3.ONE * stats.body_scale

	# 敵の頭脳はサーバにしか無い
	set_physics_process(true)


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
		look_at(global_position - dir, Vector3.UP)
	else:
		velocity.x = 0.0
		velocity.z = 0.0
		if _attack_cd <= 0.0:
			_attack_cd = stats.attack_interval
			if _target.has_method("apply_damage"):
				_target.rpc("apply_damage", stats.attack_power)

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


## サーバ側でのみ意味を持つ
func take_damage(amount: int, attacker_id: int) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server() or _dead:
		return
	hp -= amount
	rpc("_remote_hit")
	if hp > 0:
		return

	_dead = true
	WorldState.add("bug_defeated")
	for p in get_tree().get_nodes_in_group("player"):
		if p.name.to_int() == attacker_id:
			p.rpc("gain_xp", stats.xp_reward)
			break
	rpc("_remote_die")


@rpc("authority", "unreliable_ordered")
func _remote_state(pos: Vector3, remote_hp: int) -> void:
	_net_pos = pos
	hp = remote_hp


@rpc("authority", "call_local", "unreliable")
func _remote_hit() -> void:
	var tween := create_tween()
	tween.tween_property(_body, "position:y", 0.25, 0.05)
	tween.tween_property(_body, "position:y", 0.0, 0.1)


@rpc("authority", "call_local", "reliable")
func _remote_die() -> void:
	_dead = true
	remove_from_group("bug")
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3.ZERO, 0.25)
	tween.tween_callback(queue_free)
