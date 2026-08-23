extends RefCounted
class_name KobitoLook
## カプセル1体型を“人型の小人”に組み直す（頭・胴・腕2・脚2＋顔）＋芝居アニメ。
##
## 当たり判定のカプセル(body)は透明にして残し、見た目は人型パーツで作る。
## 低ポリ・素材ゼロのまま「ちゃんと脚のある人」に見せる。絵本風の輪郭線つき。
## プレイヤーは右手に武器（光の棒）を持つ。脚は歩くと交互に振る（KobitoAnim）。

static func decorate(body: MeshInstance3D, color: Color, with_weapon: bool = false) -> void:
	if body == null or body.mesh == null:
		return
	if body.has_node("Torso"):
		return

	var half := 0.5
	var br := 0.25
	if body.mesh is CapsuleMesh:
		half = body.mesh.height * 0.5
		br = body.mesh.radius

	# 当たり判定のカプセルは透明化（見た目は人型パーツが担う）
	var inv := StandardMaterial3D.new()
	inv.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	inv.albedo_color = Color(0, 0, 0, 0)
	body.material_override = inv

	# --- 胴（トルソ）：丸みのある縦長。人の体つき ---
	var torso := MeshInstance3D.new()
	torso.name = "Torso"
	var tm := CapsuleMesh.new()
	tm.radius = br * 0.82
	tm.height = half * 1.25
	torso.mesh = tm
	var torso_mat := _mat(color, 0.85)
	torso_mat.next_pass = _outline(br)
	torso.material_override = torso_mat
	torso.position = Vector3(0.0, half * 0.12, 0.0)
	body.add_child(torso)

	# --- 頭（胴の上）---
	var head := MeshInstance3D.new()
	head.name = "Head"
	var hm := SphereMesh.new()
	hm.radius = br * 0.82
	hm.height = br * 1.64
	head.mesh = hm
	var head_mat := _mat(color, 0.85)
	head_mat.next_pass = _outline(br)
	head.material_override = head_mat
	head.position = Vector3(0.0, half * 0.92, 0.0)
	body.add_child(head)

	_build_face(head, color, br)

	# --- 腕 x2（肩・手つき）---
	var arm_l := _make_arm(body, color, br, half, -1.0)
	var arm_r := _make_arm(body, color, br, half, 1.0)

	# --- 脚 x2（股から下・足つき。歩くと振る）---
	var legs: Array[Node3D] = []
	legs.append(_make_leg(body, color, br, half, -1.0))
	legs.append(_make_leg(body, color, br, half, 1.0))

	# --- 武器（プレイヤーだけ）---
	var weapon: Node3D = null
	var trail: Node3D = null
	if with_weapon:
		weapon = _make_weapon(arm_r, br)
		trail = weapon.get_node_or_null("Trail")

	# --- 芝居アニメ ---
	var anim := KobitoAnim.new()
	anim.name = "Anim"
	body.add_child(anim)
	anim.setup(body, head, arm_l, arm_r, _face_eyes, weapon, trail, legs)


static var _face_eyes: Array[Node3D] = []


## 顔（大きな目＋ハイライト・ほっぺ・口・鼻）を頭に付ける。
static func _build_face(head: MeshInstance3D, color: Color, br: float) -> void:
	_face_eyes = []
	var eyemat := _mat(Color(0.1, 0.08, 0.09), 0.25)
	var hi_mat := StandardMaterial3D.new()
	hi_mat.albedo_color = Color(1, 1, 1)
	hi_mat.emission_enabled = true
	hi_mat.emission = Color(1, 1, 1)
	hi_mat.emission_energy_multiplier = 0.4
	for sx in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		eye.name = "Eye%s" % ("L" if sx < 0 else "R")
		var em := SphereMesh.new()
		em.radius = br * 0.26
		em.height = br * 0.52
		eye.mesh = em
		eye.material_override = eyemat
		eye.position = Vector3(br * 0.38 * sx, br * 0.16, br * 0.72)
		head.add_child(eye)
		_face_eyes.append(eye)
		var hi := MeshInstance3D.new()
		var him := SphereMesh.new()
		him.radius = br * 0.085
		him.height = br * 0.17
		hi.mesh = him
		hi.material_override = hi_mat
		hi.position = Vector3(br * 0.09, br * 0.11, br * 0.2)
		eye.add_child(hi)

	var cheek_mat := _mat(Color(1.0, 0.6, 0.62), 0.7)
	for sx in [-1.0, 1.0]:
		var cheek := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = br * 0.15
		cm.height = br * 0.18
		cheek.mesh = cm
		cheek.material_override = cheek_mat
		cheek.position = Vector3(br * 0.58 * sx, -br * 0.14, br * 0.6)
		head.add_child(cheek)

	var mouth := MeshInstance3D.new()
	var mo := SphereMesh.new()
	mo.radius = br * 0.11
	mo.height = br * 0.1
	mouth.mesh = mo
	mouth.material_override = _mat(Color(0.35, 0.14, 0.14), 0.6)
	mouth.scale = Vector3(1.6, 0.5, 1.0)
	mouth.position = Vector3(0.0, -br * 0.32, br * 0.78)
	head.add_child(mouth)

	var nose := MeshInstance3D.new()
	var nm := SphereMesh.new()
	nm.radius = br * 0.09
	nm.height = br * 0.18
	nose.mesh = nm
	nose.material_override = _mat(color.lightened(0.25), 0.6)
	nose.position = Vector3(0.0, -br * 0.04, br * 0.84)
	head.add_child(nose)


static func _make_arm(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Arm%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * 0.95 * side, half * 0.42, 0.0)   # 肩
	body.add_child(pivot)

	var arm := MeshInstance3D.new()
	var am := CapsuleMesh.new()
	am.radius = br * 0.22
	am.height = half * 0.9
	arm.mesh = am
	var arm_mat := _mat(color.darkened(0.06), 0.9)
	arm_mat.next_pass = _outline(br)
	arm.material_override = arm_mat
	arm.position = Vector3(0.0, -half * 0.42, 0.0)
	pivot.add_child(arm)

	var hand := MeshInstance3D.new()
	var hgm := SphereMesh.new()
	hgm.radius = br * 0.26
	hgm.height = br * 0.52
	hand.mesh = hgm
	hand.material_override = _mat(color.lightened(0.12), 0.85)
	hand.position = Vector3(0.0, -half * 0.85, 0.0)
	pivot.add_child(hand)
	return pivot


## 脚（股ピボットからぶら下げる。足＝丸い靴つき）。歩くと KobitoAnim が振る。
static func _make_leg(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Leg%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * 0.42 * side, -half * 0.4, 0.0)   # 股
	body.add_child(pivot)

	var leg := MeshInstance3D.new()
	var lm := CapsuleMesh.new()
	lm.radius = br * 0.26
	lm.height = half * 0.7
	leg.mesh = lm
	var leg_mat := _mat(color.darkened(0.18), 0.9)
	leg_mat.next_pass = _outline(br)
	leg.material_override = leg_mat
	leg.position = Vector3(0.0, -half * 0.32, 0.0)
	pivot.add_child(leg)

	var foot := MeshInstance3D.new()
	var fm := SphereMesh.new()
	fm.radius = br * 0.3
	fm.height = br * 0.44
	foot.mesh = fm
	foot.material_override = _mat(color.darkened(0.28), 0.9)
	foot.scale = Vector3(1.0, 0.7, 1.4)
	foot.position = Vector3(0.0, -half * 0.62, br * 0.15)
	pivot.add_child(foot)
	return pivot


## 右手に握る棒（前方へ伸びる明るい刃）。攻撃時は水平に薙ぐので、刃は前(-Z)へ長く伸ばす。
static func _make_weapon(arm_pivot: Node3D, br: float) -> Node3D:
	var holder := Node3D.new()
	holder.name = "Weapon"
	holder.position = Vector3(0.0, -br * 3.2, 0.0)   # 手の位置（腕の先）
	arm_pivot.add_child(holder)

	var handle := MeshInstance3D.new()
	var hm := CylinderMesh.new()
	hm.top_radius = br * 0.08
	hm.bottom_radius = br * 0.08
	hm.height = br * 0.4
	hm.radial_segments = 6
	handle.mesh = hm
	handle.material_override = _mat(Color(0.42, 0.28, 0.16), 0.9)
	handle.rotation = Vector3(deg_to_rad(90.0), 0.0, 0.0)
	handle.position = Vector3(0.0, 0.0, -br * 0.2)
	holder.add_child(handle)

	var blade := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(br * 0.45, br * 0.14, br * 4.2)
	blade.mesh = bm
	var bmat := StandardMaterial3D.new()
	bmat.albedo_color = Color(0.85, 1.0, 0.7)
	bmat.emission_enabled = true
	bmat.emission = Color(0.6, 1.0, 0.55)
	bmat.emission_energy_multiplier = 2.4
	bmat.rim_enabled = true
	blade.material_override = bmat
	blade.position = Vector3(0.0, 0.0, -br * 2.4)
	holder.add_child(blade)
	return holder


static func _mat(c: Color, rough: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.rim_enabled = true
	m.rim = 0.5
	m.rim_tint = 0.4
	return m


## 絵本風の輪郭線（トゥーンアウトライン）。裏面をふくらませて黒く塗る＝縁取り。
static func _outline(br: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(0.08, 0.09, 0.11)
	m.cull_mode = BaseMaterial3D.CULL_FRONT
	m.grow = true
	m.grow_amount = br * 0.08
	return m
