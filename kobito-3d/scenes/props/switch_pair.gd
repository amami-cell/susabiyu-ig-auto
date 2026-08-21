extends Node3D
class_name SwitchPair
## 同時スイッチ（協力ギミック）。
##
## 離れた2つの台。両方に同時に乗ると扉がひらく＝2人協力の基本形。
## ソロのときは、片方に乗ると **子NPCが相方として空いた台へ来てくれる**
## （AREAS.md：協力謎はソロ時に子どもが手伝う）。
##
## サーバが占有と解決を判定し、見た目は全員へ配る。台の判定は player か child。

const REWARD := "drain_cleared"

var solved := false
var _plate_a: MeshInstance3D
var _plate_b: MeshInstance3D
var _gate: MeshInstance3D
var _on_a: Array[Node] = []
var _on_b: Array[Node] = []
var _helper: Node = null


func _ready() -> void:
	_plate_a = _make_plate("PlateA", Vector3(-1.6, 0.08, 0.0), _on_a)
	_plate_b = _make_plate("PlateB", Vector3(1.6, 0.08, 0.0), _on_b)

	# 扉（解けると下がる）
	_gate = MeshInstance3D.new()
	_gate.name = "Gate"
	var gm := BoxMesh.new()
	gm.size = Vector3(2.4, 1.6, 0.35)
	_gate.mesh = gm
	_gate.material_override = _mat(Color(0.3, 0.28, 0.25), false)
	_gate.position = Vector3(0.0, 0.8, -2.2)
	add_child(_gate)


func _make_plate(pname: String, pos: Vector3, bucket: Array) -> MeshInstance3D:
	var plate := MeshInstance3D.new()
	plate.name = pname
	var bm := BoxMesh.new()
	bm.size = Vector3(1.0, 0.15, 1.0)
	plate.mesh = bm
	plate.material_override = _mat(Color(0.5, 0.45, 0.3), false)
	plate.position = pos
	add_child(plate)

	var area := Area3D.new()
	area.collision_layer = 0
	area.collision_mask = 2 | 16          # player(2) と child(16)
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(1.0, 0.8, 1.0)
	cs.shape = box
	cs.position = Vector3(0.0, 0.4, 0.0)
	area.add_child(cs)
	plate.add_child(area)
	area.body_entered.connect(_on_enter.bind(bucket, plate))
	area.body_exited.connect(_on_exit.bind(bucket, plate))
	return plate


func _is_server() -> bool:
	return multiplayer.has_multiplayer_peer() and multiplayer.is_server()


func _on_enter(body: Node, bucket: Array, plate: MeshInstance3D) -> void:
	if not _is_server() or solved:
		return
	if not (body.is_in_group("player") or body.is_in_group("child")):
		return
	if body not in bucket:
		bucket.append(body)
	_evaluate()


func _on_exit(body: Node, bucket: Array, _plate: MeshInstance3D) -> void:
	if not _is_server() or solved:
		return
	bucket.erase(body)
	_evaluate()


func _has_player(bucket: Array) -> bool:
	for b in bucket:
		if is_instance_valid(b) and b.is_in_group("player"):
			return true
	return false


func _evaluate() -> void:
	var a_used := not _on_a.is_empty()
	var b_used := not _on_b.is_empty()
	rpc("_light", 0, a_used)
	rpc("_light", 1, b_used)

	if a_used and b_used:
		_solve()
		return

	# ソロの手伝い：片方にプレイヤーが乗っていて、もう片方が空なら子を送る
	var target := Vector3.INF
	if _has_player(_on_a) and not b_used:
		target = _plate_b.global_position
	elif _has_player(_on_b) and not a_used:
		target = _plate_a.global_position

	if target != Vector3.INF:
		_dispatch_helper(target)
	else:
		_recall_helper()


func _dispatch_helper(pos: Vector3) -> void:
	if _helper == null or not is_instance_valid(_helper):
		_helper = _nearest_free_child(pos)
	if _helper != null and _helper.has_method("help_go"):
		_helper.help_go(pos)


func _recall_helper() -> void:
	if _helper != null and is_instance_valid(_helper) and _helper.has_method("help_stop"):
		_helper.help_stop()
	_helper = null


func _nearest_free_child(pos: Vector3) -> Node:
	var best: Node = null
	var best_d := 9999.0
	for c in get_tree().get_nodes_in_group("child"):
		var d: float = c.global_position.distance_to(pos)
		if d < best_d:
			best_d = d
			best = c
	return best


func _solve() -> void:
	solved = true
	_recall_helper()
	WorldState.add(REWARD)
	WorldState.notice.emit("二人で押した——扉がひらいた")
	rpc("_solved")


func sync_to(id: int) -> void:
	if not _is_server():
		return
	if solved:
		rpc_id(id, "_solved")


func debug_solve() -> void:
	if not _is_server():
		return
	_solve()


@rpc("authority", "call_local", "reliable")
func _light(which: int, on: bool) -> void:
	var plate := _plate_a if which == 0 else _plate_b
	if plate != null:
		plate.material_override = _mat(Color(0.5, 0.45, 0.3), on)


@rpc("authority", "call_local", "reliable")
func _solved() -> void:
	solved = true
	_plate_a.material_override = _mat(Color(0.5, 0.45, 0.3), true)
	_plate_b.material_override = _mat(Color(0.5, 0.45, 0.3), true)
	# 扉を下げて開く
	var tween := create_tween()
	tween.tween_property(_gate, "position:y", -1.0, 0.8).set_trans(Tween.TRANS_CUBIC)


func _mat(base: Color, lit: bool) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.roughness = 0.85
	if lit:
		m.albedo_color = base.lerp(Color(0.4, 0.8, 0.5), 0.6)
		m.emission_enabled = true
		m.emission = Color(0.3, 0.9, 0.45)
		m.emission_energy_multiplier = 0.6
	else:
		m.albedo_color = base
	return m
