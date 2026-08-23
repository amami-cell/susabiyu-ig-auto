extends RefCounted
class_name KobitoLook
## カプセル1体型を“人型の小人”に組み直す（頭・胴・腕2・脚2＋顔）＋芝居アニメ。
##
## 当たり判定のカプセル(body)は透明にして残し、見た目は人型パーツで作る。
## 「頭小さめ・脚長め」の 4頭身くらいの子どもっぽい人型。絵本風の輪郭線つき。
## プレイヤーは右手に武器（光の棒）を持つ。脚は歩くと交互に振る（KobitoAnim）。

# --- 体つきの比率（half=カプセル半身, br=半径 を基準にする）---
const HEAD_R := 0.60          # 頭の半径（br倍）＝小さめ
const HEAD_Y := 1.06          # 頭の高さ（half倍）
const TORSO_R := 0.66         # 胴の太さ（br倍）＝スリム
const TORSO_H := 1.02         # 胴の縦長（half倍）
const TORSO_Y := 0.34         # 胴の高さ（half倍）
const SHOULDER_Y := 0.66      # 肩の高さ（half倍）
const ARM_H := 0.95           # 腕の長さ（half倍）
const HAND_Y := -0.9          # 手の位置（half倍・肩から）
const HIP_Y := -0.16          # 股の高さ（half倍）＝高め＝脚が長く見える
const HIP_X := 0.32           # 股の左右間隔（br倍）＝せまめ
const LEG_H := 0.98           # 脚の長さ（half倍）＝長め
const FOOT_Y := -0.86         # 足の位置（half倍・股から）


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

	var head_r := br * HEAD_R

	# 当たり判定のカプセルは透明化（見た目は人型パーツが担う）
	var inv := StandardMaterial3D.new()
	inv.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	inv.albedo_color = Color(0, 0, 0, 0)
	body.material_override = inv

	# --- 胴（トルソ）：スリムな縦長 ---
	var torso := MeshInstance3D.new()
	torso.name = "Torso"
	var tm := CapsuleMesh.new()
	tm.radius = br * TORSO_R
	tm.height = half * TORSO_H
	torso.mesh = tm
	var torso_mat := _mat(color, 0.85)
	torso_mat.next_pass = _outline(br)
	torso.material_override = torso_mat
	torso.position = Vector3(0.0, half * TORSO_Y, 0.0)
	body.add_child(torso)

	# --- 頭（小さめ・胴の上）---
	var head := MeshInstance3D.new()
	head.name = "Head"
	var hm := SphereMesh.new()
	hm.radius = head_r
	hm.height = head_r * 2.0
	head.mesh = hm
	var head_mat := _mat(color, 0.85)
	head_mat.next_pass = _outline(br)
	head.material_override = head_mat
	head.position = Vector3(0.0, half * HEAD_Y, 0.0)
	body.add_child(head)

	# 細い首（頭と胴のつなぎ）
	var neck := MeshInstance3D.new()
	var ncm := CylinderMesh.new()
	ncm.top_radius = br * 0.24
	ncm.bottom_radius = br * 0.28
	ncm.height = half * 0.14
	neck.mesh = ncm
	neck.material_override = _mat(color.darkened(0.05), 0.85)
	neck.position = Vector3(0.0, half * (HEAD_Y - 0.14), 0.0)
	body.add_child(neck)

	_build_face(head, color, head_r)

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
		weapon = _make_weapon(arm_r, br, half * HAND_Y)
		trail = weapon.get_node_or_null("Trail")

	# --- 芝居アニメ ---
	var anim := KobitoAnim.new()
	anim.name = "Anim"
	body.add_child(anim)
	anim.setup(body, head, arm_l, arm_r, _face_eyes, weapon, trail, legs)


static var _face_eyes: Array[Node3D] = []


## 顔（大きな目＋ハイライト・ほっぺ・口・鼻）を頭に付ける。hr=頭の半径。
static func _build_face(head: MeshInstance3D, color: Color, hr: float) -> void:
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
		em.radius = hr * 0.34
		em.height = hr * 0.68
		eye.mesh = em
		eye.material_override = eyemat
		eye.position = Vector3(hr * 0.44 * sx, hr * 0.18, hr * 0.82)
		head.add_child(eye)
		_face_eyes.append(eye)
		var hi := MeshInstance3D.new()
		var him := SphereMesh.new()
		him.radius = hr * 0.11
		him.height = hr * 0.22
		hi.mesh = him
		hi.material_override = hi_mat
		hi.position = Vector3(hr * 0.12, hr * 0.14, hr * 0.26)
		eye.add_child(hi)

	var cheek_mat := _mat(Color(1.0, 0.6, 0.62), 0.7)
	for sx in [-1.0, 1.0]:
		var cheek := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = hr * 0.2
		cm.height = hr * 0.24
		cheek.mesh = cm
		cheek.material_override = cheek_mat
		cheek.position = Vector3(hr * 0.66 * sx, -hr * 0.16, hr * 0.68)
		head.add_child(cheek)

	var mouth := MeshInstance3D.new()
	var mo := SphereMesh.new()
	mo.radius = hr * 0.14
	mo.height = hr * 0.13
	mouth.mesh = mo
	mouth.material_override = _mat(Color(0.35, 0.14, 0.14), 0.6)
	mouth.scale = Vector3(1.6, 0.5, 1.0)
	mouth.position = Vector3(0.0, -hr * 0.36, hr * 0.88)
	head.add_child(mouth)

	var nose := MeshInstance3D.new()
	var nm := SphereMesh.new()
	nm.radius = hr * 0.12
	nm.height = hr * 0.24
	nose.mesh = nm
	nose.material_override = _mat(color.lightened(0.25), 0.6)
	nose.position = Vector3(0.0, -hr * 0.05, hr * 0.95)
	head.add_child(nose)


static func _make_arm(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Arm%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * 0.82 * side, half * SHOULDER_Y, 0.0)   # 肩
	body.add_child(pivot)

	var arm := MeshInstance3D.new()
	var am := CapsuleMesh.new()
	am.radius = br * 0.18
	am.height = half * ARM_H
	arm.mesh = am
	var arm_mat := _mat(color.darkened(0.06), 0.9)
	arm_mat.next_pass = _outline(br)
	arm.material_override = arm_mat
	arm.position = Vector3(0.0, half * ARM_H * -0.5, 0.0)
	pivot.add_child(arm)

	var hand := MeshInstance3D.new()
	var hgm := SphereMesh.new()
	hgm.radius = br * 0.22
	hgm.height = br * 0.44
	hand.mesh = hgm
	hand.material_override = _mat(color.lightened(0.12), 0.85)
	hand.position = Vector3(0.0, half * HAND_Y, 0.0)
	pivot.add_child(hand)
	return pivot


## 脚（股ピボットからぶら下げる。足＝丸い靴つき）。歩くと KobitoAnim が振る。
static func _make_leg(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Leg%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * HIP_X * side, half * HIP_Y, 0.0)   # 股
	body.add_child(pivot)

	var leg := MeshInstance3D.new()
	var lm := CapsuleMesh.new()
	lm.radius = br * 0.23
	lm.height = half * LEG_H
	leg.mesh = lm
	var leg_mat := _mat(color.darkened(0.18), 0.9)
	leg_mat.next_pass = _outline(br)
	leg.material_override = leg_mat
	leg.position = Vector3(0.0, half * LEG_H * -0.5, 0.0)
	pivot.add_child(leg)

	var foot := MeshInstance3D.new()
	var fm := SphereMesh.new()
	fm.radius = br * 0.3
	fm.height = br * 0.44
	foot.mesh = fm
	foot.material_override = _mat(color.darkened(0.28), 0.9)
	foot.scale = Vector3(1.0, 0.7, 1.4)
	foot.position = Vector3(0.0, half * FOOT_Y, br * 0.15)
	pivot.add_child(foot)
	return pivot


## 右手に握る棒（前方へ伸びる明るい刃）。攻撃時は水平に薙ぐので、刃は前(-Z)へ長く伸ばす。
## hand_y=手の高さ（肩ピボットから見た位置）。武器は手の位置に付ける。
static func _make_weapon(arm_pivot: Node3D, br: float, hand_y: float) -> Node3D:
	var holder := Node3D.new()
	holder.name = "Weapon"
	holder.position = Vector3(0.0, hand_y, 0.0)   # 手の位置（腕の先）
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
