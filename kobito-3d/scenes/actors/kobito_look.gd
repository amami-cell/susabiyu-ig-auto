extends RefCounted
class_name KobitoLook
## カプセル1体型を“人型の小人”に組み直す（頭・首・肩・胴・腕(上腕+前腕)・脚(太もも+すね)＋顔）。
##
## 当たり判定のカプセル(body)は透明にして残し、見た目は人型パーツで作る。
## 「頭小さめ・脚長め」の 4頭身くらいの子どもっぽい人型。体は分節して人体らしく：
## 胴は前後に薄く、腕はひじで、脚はひざで軽く曲げる。絵本風の輪郭線つき。
## プレイヤーは右手に武器（光の棒）を持つ。腕・脚は歩くと肩/股から振る（KobitoAnim）。

# --- 体つきの比率（half=カプセル半身, br=半径 を基準にする）---
const HEAD_R := 0.58          # 頭の半径（br倍）＝小さめ
const HEAD_Y := 1.08          # 頭の高さ（half倍）
const TORSO_R := 0.60         # 胴の太さ（br倍）
const TORSO_H := 1.02         # 胴の縦長（half倍）
const TORSO_Y := 0.34         # 胴の高さ（half倍）
const TORSO_FLAT := 0.62      # 胴の前後の薄さ（Zスケール）＝板状の胸板
const TORSO_WIDE := 1.12      # 胴の左右の広さ（Xスケール）＝肩幅
const SHOULDER_Y := 0.66      # 肩の高さ（half倍）
const SHOULDER_X := 0.82      # 肩の左右（br倍）
const UPPER_ARM_H := 0.50     # 上腕の長さ（half倍）
const FOREARM_H := 0.46       # 前腕の長さ（half倍）
const ELBOW_BEND := 0.18      # ひじの曲げ（rad・軽く前へ）
const HIP_Y := -0.16          # 股の高さ（half倍）＝高め＝脚が長く見える
const HIP_X := 0.34           # 股の左右間隔（br倍）
const THIGH_H := 0.46         # 太ももの長さ（half倍）
const SHIN_H := 0.46          # すねの長さ（half倍）
const KNEE_BEND := 0.12       # ひざの曲げ（rad・軽く）

# --- 人らしい配色 ---
# プレイヤーの色は「シャツ（胴・肩）」として残す＝誰が誰か分かる。
# 顔・首・腕・手は肌色、ズボン・靴・髪は人らしい色にする。
const SKIN := Color(0.97, 0.80, 0.68)   # 肌色
const PANTS := Color(0.27, 0.30, 0.42)  # ズボン（デニム調）
const SHOES := Color(0.19, 0.15, 0.12)  # 靴
const HAIR := Color(0.26, 0.17, 0.10)   # 髪（こげ茶）


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

	# --- 胴（トルソ）：前後に薄く・肩幅広く＝板状の人の胴 ---
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
	torso.scale = Vector3(TORSO_WIDE, 1.0, TORSO_FLAT)
	body.add_child(torso)

	# 骨盤（腰）＝ズボン色。胴と脚のつなぎ目を埋める
	var pelvis := MeshInstance3D.new()
	var pm := CapsuleMesh.new()
	pm.radius = br * 0.5
	pm.height = half * 0.4
	pelvis.mesh = pm
	var pelvis_mat := _mat(PANTS, 0.9)
	pelvis_mat.next_pass = _outline(br)
	pelvis.material_override = pelvis_mat
	pelvis.position = Vector3(0.0, half * (HIP_Y + 0.06), 0.0)
	pelvis.scale = Vector3(1.15, 0.7, 0.72)
	body.add_child(pelvis)

	# 肩（左右）＝シャツ色。腕の付け根を人らしく丸める＋肩幅を出す
	for sx in [-1.0, 1.0]:
		var sh := MeshInstance3D.new()
		var shm := SphereMesh.new()
		shm.radius = br * 0.34
		shm.height = br * 0.68
		sh.mesh = shm
		var sh_mat := _mat(color, 0.85)
		sh_mat.next_pass = _outline(br)
		sh.material_override = sh_mat
		sh.position = Vector3(br * SHOULDER_X * sx, half * SHOULDER_Y, 0.0)
		body.add_child(sh)

	# --- 頭（小さめ・胴の上）＝肌色 ---
	var head := MeshInstance3D.new()
	head.name = "Head"
	var hm := SphereMesh.new()
	hm.radius = head_r
	hm.height = head_r * 2.0
	head.mesh = hm
	var head_mat := _mat(SKIN, 0.7)
	head_mat.next_pass = _outline(br)
	head.material_override = head_mat
	head.position = Vector3(0.0, half * HEAD_Y, 0.0)
	body.add_child(head)

	# 細い首（頭と胴のつなぎ）＝肌色
	var neck := MeshInstance3D.new()
	var ncm := CylinderMesh.new()
	ncm.top_radius = br * 0.22
	ncm.bottom_radius = br * 0.26
	ncm.height = half * 0.16
	neck.mesh = ncm
	neck.material_override = _mat(SKIN.darkened(0.05), 0.7)
	neck.position = Vector3(0.0, half * (HEAD_Y - 0.16), 0.0)
	body.add_child(neck)

	_build_face(head, color, head_r)

	# --- 腕 x2（肩ピボット→上腕→ひじ→前腕→手）---
	var arm_l := _make_arm(body, color, br, half, -1.0)
	var arm_r := _make_arm(body, color, br, half, 1.0)

	# --- 脚 x2（股ピボット→太もも→ひざ→すね→足）---
	var legs: Array[Node3D] = []
	legs.append(_make_leg(body, color, br, half, -1.0))
	legs.append(_make_leg(body, color, br, half, 1.0))

	# --- 武器（プレイヤーだけ・右手に付ける）---
	var weapon: Node3D = null
	var trail: Node3D = null
	if with_weapon:
		var hand_r := arm_r.find_child("Hand", true, false) as Node3D
		if hand_r != null:
			weapon = _make_weapon(hand_r, br)
			trail = weapon.get_node_or_null("Trail")

	# --- 芝居アニメ ---
	var anim := KobitoAnim.new()
	anim.name = "Anim"
	body.add_child(anim)
	anim.setup(body, head, arm_l, arm_r, _face_eyes, weapon, trail, legs)


static var _face_eyes: Array[Node3D] = []


## 顔（髪＋大きな目＋ハイライト・ほっぺ・口・鼻）を頭に付ける。hr=頭の半径。
static func _build_face(head: MeshInstance3D, color: Color, hr: float) -> void:
	_face_eyes = []

	# 髪（頭の上〜後ろを覆うキャップ。前(顔)は出す）
	var hair := MeshInstance3D.new()
	hair.name = "Hair"
	var harm := SphereMesh.new()
	harm.radius = hr * 0.98
	harm.height = hr * 1.96
	hair.mesh = harm
	var hair_mat := _mat(HAIR, 0.6)
	hair_mat.next_pass = _outline(hr)
	hair.material_override = hair_mat
	hair.position = Vector3(0.0, hr * 0.34, -hr * 0.16)
	hair.scale = Vector3(1.06, 0.92, 1.06)
	head.add_child(hair)

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
	nose.material_override = _mat(SKIN.darkened(0.06), 0.6)
	nose.position = Vector3(0.0, -hr * 0.05, hr * 0.95)
	head.add_child(nose)


## 腕：肩ピボット（ここを KobitoAnim が振る）→上腕→ひじ→前腕→手。肌色（半袖）。
static func _make_arm(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Arm%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * SHOULDER_X * side, half * SHOULDER_Y, 0.0)   # 肩
	body.add_child(pivot)

	var upper := MeshInstance3D.new()
	var um := CapsuleMesh.new()
	um.radius = br * 0.17
	um.height = half * UPPER_ARM_H
	upper.mesh = um
	var arm_mat := _mat(SKIN, 0.7)
	arm_mat.next_pass = _outline(br)
	upper.material_override = arm_mat
	upper.position = Vector3(0.0, half * UPPER_ARM_H * -0.5, 0.0)
	pivot.add_child(upper)

	# ひじ（軽く前へ曲げる）
	var elbow := Node3D.new()
	elbow.name = "Elbow"
	elbow.position = Vector3(0.0, half * -UPPER_ARM_H, 0.0)
	elbow.rotation.x = ELBOW_BEND
	pivot.add_child(elbow)

	var fore := MeshInstance3D.new()
	var fm := CapsuleMesh.new()
	fm.radius = br * 0.15
	fm.height = half * FOREARM_H
	fore.mesh = fm
	var fore_mat := _mat(SKIN, 0.7)
	fore_mat.next_pass = _outline(br)
	fore.material_override = fore_mat
	fore.position = Vector3(0.0, half * FOREARM_H * -0.5, 0.0)
	elbow.add_child(fore)

	var hand := Node3D.new()
	hand.name = "Hand"
	hand.position = Vector3(0.0, half * -FOREARM_H, 0.0)
	elbow.add_child(hand)
	var hmesh := MeshInstance3D.new()
	var hgm := SphereMesh.new()
	hgm.radius = br * 0.2
	hgm.height = br * 0.4
	hmesh.mesh = hgm
	hmesh.material_override = _mat(SKIN.lightened(0.04), 0.7)
	hand.add_child(hmesh)
	return pivot


## 脚：股ピボット（ここを KobitoAnim が振る）→太もも→ひざ→すね→足。ズボン＋靴。
static func _make_leg(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Leg%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * HIP_X * side, half * HIP_Y, 0.0)   # 股
	body.add_child(pivot)

	var thigh := MeshInstance3D.new()
	var thm := CapsuleMesh.new()
	thm.radius = br * 0.23
	thm.height = half * THIGH_H
	thigh.mesh = thm
	var leg_mat := _mat(PANTS, 0.9)
	leg_mat.next_pass = _outline(br)
	thigh.material_override = leg_mat
	thigh.position = Vector3(0.0, half * THIGH_H * -0.5, 0.0)
	pivot.add_child(thigh)

	# ひざ（軽く曲げる）
	var knee := Node3D.new()
	knee.name = "Knee"
	knee.position = Vector3(0.0, half * -THIGH_H, 0.0)
	knee.rotation.x = KNEE_BEND
	pivot.add_child(knee)

	var shin := MeshInstance3D.new()
	var sm := CapsuleMesh.new()
	sm.radius = br * 0.2
	sm.height = half * SHIN_H
	shin.mesh = sm
	var shin_mat := _mat(PANTS.darkened(0.08), 0.9)
	shin_mat.next_pass = _outline(br)
	shin.material_override = shin_mat
	shin.position = Vector3(0.0, half * SHIN_H * -0.5, 0.0)
	knee.add_child(shin)

	var foot := MeshInstance3D.new()
	var fm := SphereMesh.new()
	fm.radius = br * 0.28
	fm.height = br * 0.4
	foot.mesh = fm
	foot.material_override = _mat(SHOES, 0.6)
	foot.scale = Vector3(1.0, 0.7, 1.5)
	foot.position = Vector3(0.0, half * -SHIN_H, br * 0.28)   # つま先を前へ
	knee.add_child(foot)
	return pivot


## 右手（Hand ノード）に握る棒（前方へ伸びる明るい刃）。攻撃時は水平に薙ぐ。
static func _make_weapon(hand: Node3D, br: float) -> Node3D:
	var holder := Node3D.new()
	holder.name = "Weapon"
	holder.position = Vector3(0.0, -br * 0.1, 0.0)
	hand.add_child(holder)

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
