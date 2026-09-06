extends Node3D
class_name StonePuzzle
## 遺跡の石版パズル（順番に踏む）。
##
## 各石版に刻まれた数(1→N)の順に踏むと、奥の壁画が光る＝「昔ここは緑だった」証拠。
## 間違えるとリセット。左から右へ歩けば自然に 1→N を踏めるので、初見でも解ける。
##
## サーバが正（踏み判定・進行・解決を決める）。見た目は全員へ配る。ソロでも解ける。
## 子ども(group="child")では反応しない＝プレイヤーだけがトリガー。

const PLATE_COUNT := 4
const REWARD := "drain_cleared"     # 解けたら大きく緑が戻る

signal solved_changed

var solved := false
var _progress := 0
var _plates: Array[MeshInstance3D] = []
var _mural: MeshInstance3D = null


func _ready() -> void:
	add_to_group("solvable")   # 章の進行が solved を見にくる
	_build()


func _build() -> void:
	for i in PLATE_COUNT:
		var plate := MeshInstance3D.new()
		plate.name = "Plate%d" % i
		var bm := BoxMesh.new()
		bm.size = Vector3(0.9, 0.15, 0.9)
		plate.mesh = bm
		plate.material_override = _plate_mat(false)
		plate.position = Vector3(i * 1.1 - (PLATE_COUNT - 1) * 0.55, 0.08, 0.0)
		add_child(plate)
		_plates.append(plate)

		# 踏む順の“大きな数字”（1→N）。点だけだと読めないので数字で はっきり。
		var num := Label3D.new()
		num.text = str(i + 1)
		num.font_size = 90
		num.outline_size = 16
		num.outline_modulate = Color(0.05, 0.05, 0.05)
		num.modulate = Color(1.0, 0.95, 0.7)
		num.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		num.no_depth_test = true
		num.pixel_size = 0.006
		num.position = Vector3(0.0, 0.8, 0.0)
		plate.add_child(num)

		# 踏み検出（プレイヤーだけ）
		var area := Area3D.new()
		area.collision_layer = 0
		area.collision_mask = 2                 # player レイヤー
		var cs := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(0.9, 0.7, 0.9)
		cs.shape = box
		cs.position = Vector3(0.0, 0.35, 0.0)
		area.add_child(cs)
		plate.add_child(area)
		area.body_entered.connect(_on_step.bind(i))

	# 壁画（奥）。解けると緑に光る。
	_mural = MeshInstance3D.new()
	_mural.name = "Mural"
	var qm := QuadMesh.new()
	qm.size = Vector2(4.0, 2.4)
	_mural.mesh = qm
	_mural.position = Vector3(0.0, 1.4, -1.2)
	_mural.material_override = _mural_mat(false)
	add_child(_mural)

	# やることの案内（石版の上に大きく）。＝「何したらいいか分からん」を無くす。
	var guide := Label3D.new()
	guide.text = "数字の順に ふもう（1→4）"
	guide.font_size = 40
	guide.outline_size = 12
	guide.outline_modulate = Color(0.05, 0.05, 0.05)
	guide.modulate = Color(1, 1, 0.85)
	guide.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	guide.no_depth_test = true
	guide.pixel_size = 0.0055
	guide.position = Vector3(0.0, 2.1, 0.0)
	add_child(guide)


func _on_step(body: Node, index: int) -> void:
	if solved:
		return
	if not (multiplayer.has_multiplayer_peer() and multiplayer.is_server()):
		return
	if not body.is_in_group("player"):
		return
	_advance(index)


## サーバ内で進行を1歩進める（Area からも、自己点検からも呼べる）。
func _advance(index: int) -> void:
	if index == _progress:
		_progress += 1
		rpc("_light", index)
		if _progress >= PLATE_COUNT:
			_solve()
	else:
		_progress = 0
		rpc("_reset")


func _solve() -> void:
	solved = true
	WorldState.add(REWARD)
	WorldState.notice.emit("石版が光った——昔、ここは緑だった")
	rpc("_solved")


## 後から参加した人へ、今の光り具合と解決状態を配る。
func sync_to(id: int) -> void:
	if not (multiplayer.has_multiplayer_peer() and multiplayer.is_server()):
		return
	for i in _progress:
		rpc_id(id, "_light", i)
	if solved:
		rpc_id(id, "_solved")


## 自己点検用：正しい順に全部踏んで解く（サーバのみ）。
func debug_solve() -> void:
	if not (multiplayer.has_multiplayer_peer() and multiplayer.is_server()):
		return
	for i in PLATE_COUNT:
		_advance(i)


# ---------------------------------------------------------------- 見た目(全員)

@rpc("authority", "call_local", "reliable")
func _light(index: int) -> void:
	if index >= 0 and index < _plates.size():
		_plates[index].material_override = _plate_mat(true)


@rpc("authority", "call_local", "reliable")
func _reset() -> void:
	for p in _plates:
		p.material_override = _plate_mat(false)


@rpc("authority", "call_local", "reliable")
func _solved() -> void:
	solved = true
	for p in _plates:
		p.material_override = _plate_mat(true)
	if _mural != null:
		_mural.material_override = _mural_mat(true)
	solved_changed.emit()


func _plate_mat(lit: bool) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.roughness = 0.9
	if lit:
		m.albedo_color = Color(0.45, 0.7, 0.4)
		m.emission_enabled = true
		m.emission = Color(0.3, 0.9, 0.4)
		m.emission_energy_multiplier = 0.6
	else:
		m.albedo_color = Color(0.4, 0.38, 0.34)
	return m


func _mural_mat(lit: bool) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	if lit:
		m.albedo_color = Color(0.3, 0.6, 0.3)
		m.emission_enabled = true
		m.emission = Color(0.35, 0.85, 0.4)
		m.emission_energy_multiplier = 0.7
	else:
		m.albedo_color = Color(0.22, 0.2, 0.18)
	m.roughness = 0.8
	return m


func _mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	return m
