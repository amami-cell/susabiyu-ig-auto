extends RefCounted
class_name KobitoLook
## カプセル1体型を“人型の小人”に組み直す（頭・首・胸板・腹・骨盤・腕・脚＋顔）。
##
## 当たり判定のカプセル(body)は透明にして残し、見た目は人型パーツで作る。
## 「丸々」をやめ、体は角ばった箱(ボックス)で構成＝スリムな低ポリ人間。
## 胴は 胸板(広)→腹(細) のV字テーパー、腕はひじ・脚はひざで軽く曲げる。
## 頭だけは球（人の頭は丸い）。絵本風の輪郭線つき。プレイヤーは右手に武器。

# --- 体つきの比率（half=カプセル半身, br=半径 を基準にする）---
const HEAD_R := 0.55          # 頭の半径（br倍）
const HEAD_Y := 1.08          # 頭の高さ（half倍）
const CHEST_Y := 0.56         # 胸板の高さ（half倍）
const WAIST_Y := 0.18         # 腹の高さ（half倍）
const SHOULDER_Y := 0.74      # 肩の高さ（half倍）
const SHOULDER_X := 0.9       # 肩の左右（br倍）
const UPPER_ARM_H := 0.50     # 上腕の長さ（half倍）
const FOREARM_H := 0.46       # 前腕の長さ（half倍）
const ELBOW_BEND := 0.16      # ひじの曲げ（rad）
const HIP_Y := -0.14          # 股の高さ（half倍）
const HIP_X := 0.42           # 股の左右間隔（br倍）
const THIGH_H := 0.48         # 太ももの長さ（half倍）
const SHIN_H := 0.46          # すねの長さ（half倍）
const KNEE_BEND := 0.10       # ひざの曲げ（rad）

# --- 人らしい配色 ---
# プレイヤーの色は「シャツ（胴）」として残す＝誰が誰か分かる。
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

	# --- 胴：胸板(広)→腹(細) のV字テーパー＝スリムな人の胴（箱）---
	var chest := _box(body, color, br,
		Vector3(br * 1.5, half * 0.56, br * 0.62),
		Vector3(0.0, half * CHEST_Y, 0.0))
	chest.name = "Torso"   # 被弾フラッシュ・重複生成チェックの目印
	_box(body, color, br,
		Vector3(br * 1.12, half * 0.5, br * 0.56),
		Vector3(0.0, half * WAIST_Y, 0.0))

	# --- 骨盤（腰）＝ズボン色 ---
	_box(body, PANTS, br,
		Vector3(br * 1.18, half * 0.34, br * 0.58),
		Vector3(0.0, half * (HIP_Y + 0.05), 0.0))

	# --- 頭（球・小さめ）＝肌色 ---
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
	ncm.top_radius = br * 0.2
	ncm.bottom_radius = br * 0.24
	ncm.height = half * 0.16
	neck.mesh = ncm
	neck.material_override = _mat(SKIN.darkened(0.05), 0.7)
	neck.position = Vector3(0.0, half * (HEAD_Y - 0.16), 0.0)
	body.add_child(neck)

	_build_face(head, color, head_r)

	# --- 腕 x2（肩ピボット→上腕→ひじ→前腕→手。すべて角ばった箱）---
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


## 箱パーツを1個作って body(または親)に付けるヘルパ（輪郭線つき）。
static func _box(parent: Node3D, c: Color, br: float, size: Vector3, pos: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := BoxMesh.new()
	m.size = size
	mi.mesh = m
	var mat := _mat(c, 0.85)
	mat.next_pass = _outline(br)
	mi.material_override = mat
	mi.position = pos
	parent.add_child(mi)
	return mi


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
		em.radius = hr * 0.32
		em.height = hr * 0.64
		eye.mesh = em
		eye.material_override = eyemat
		eye.position = Vector3(hr * 0.44 * sx, hr * 0.16, hr * 0.83)
		head.add_child(eye)
		_face_eyes.append(eye)
		var hi := MeshInstance3D.new()
		var him := SphereMesh.new()
		him.radius = hr * 0.1
		him.height = hr * 0.2
		hi.mesh = him
		hi.material_override = hi_mat
		hi.position = Vector3(hr * 0.12, hr * 0.14, hr * 0.26)
		eye.add_child(hi)

	var cheek_mat := _mat(Color(1.0, 0.6, 0.62), 0.7)
	for sx in [-1.0, 1.0]:
		var cheek := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = hr * 0.17
		cm.height = hr * 0.2
		cheek.mesh = cm
		cheek.material_override = cheek_mat
		cheek.position = Vector3(hr * 0.62 * sx, -hr * 0.18, hr * 0.7)
		head.add_child(cheek)

	var mouth := MeshInstance3D.new()
	var mo := SphereMesh.new()
	mo.radius = hr * 0.13
	mo.height = hr * 0.12
	mouth.mesh = mo
	mouth.material_override = _mat(Color(0.35, 0.14, 0.14), 0.6)
	mouth.scale = Vector3(1.6, 0.5, 1.0)
	mouth.position = Vector3(0.0, -hr * 0.38, hr * 0.9)
	head.add_child(mouth)

	var nose := MeshInstance3D.new()
	var nm := SphereMesh.new()
	nm.radius = hr * 0.11
	nm.height = hr * 0.22
	nose.mesh = nm
	nose.material_override = _mat(SKIN.darkened(0.06), 0.6)
	nose.position = Vector3(0.0, -hr * 0.06, hr * 0.96)
	head.add_child(nose)


## 腕：肩ピボット（KobitoAnim が振る）→上腕→ひじ→前腕→手。角ばった箱・肌色（半袖）。
static func _make_arm(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Arm%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * SHOULDER_X * side, half * SHOULDER_Y, 0.0)   # 肩
	body.add_child(pivot)

	_box(pivot, SKIN, br,
		Vector3(br * 0.3, half * UPPER_ARM_H, br * 0.3),
		Vector3(0.0, half * UPPER_ARM_H * -0.5, 0.0))

	# ひじ（軽く前へ曲げる）
	var elbow := Node3D.new()
	elbow.name = "Elbow"
	elbow.position = Vector3(0.0, half * -UPPER_ARM_H, 0.0)
	elbow.rotation.x = ELBOW_BEND
	pivot.add_child(elbow)

	_box(elbow, SKIN, br,
		Vector3(br * 0.26, half * FOREARM_H, br * 0.26),
		Vector3(0.0, half * FOREARM_H * -0.5, 0.0))

	var hand := Node3D.new()
	hand.name = "Hand"
	hand.position = Vector3(0.0, half * -FOREARM_H, 0.0)
	elbow.add_child(hand)
	_box(hand, SKIN.lightened(0.04), br,
		Vector3(br * 0.34, br * 0.3, br * 0.3),
		Vector3(0.0, -br * 0.12, 0.0))
	return pivot


## 脚：股ピボット（KobitoAnim が振る）→太もも→ひざ→すね→足。角ばった箱・ズボン＋靴。
static func _make_leg(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Leg%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * HIP_X * side, half * HIP_Y, 0.0)   # 股
	body.add_child(pivot)

	_box(pivot, PANTS, br,
		Vector3(br * 0.42, half * THIGH_H, br * 0.44),
		Vector3(0.0, half * THIGH_H * -0.5, 0.0))

	# ひざ（軽く曲げる）
	var knee := Node3D.new()
	knee.name = "Knee"
	knee.position = Vector3(0.0, half * -THIGH_H, 0.0)
	knee.rotation.x = KNEE_BEND
	pivot.add_child(knee)

	_box(knee, PANTS.darkened(0.08), br,
		Vector3(br * 0.36, half * SHIN_H, br * 0.38),
		Vector3(0.0, half * SHIN_H * -0.5, 0.0))

	# 足＝靴（前へ長い箱）
	_box(knee, SHOES, br,
		Vector3(br * 0.44, br * 0.3, br * 0.86),
		Vector3(0.0, half * -SHIN_H - br * 0.02, br * 0.2))
	return pivot


## 右手（Hand ノード）に握る棒（前方へ伸びる明るい刃）。攻撃時は水平に薙ぐ。
static func _make_weapon(hand: Node3D, br: float) -> Node3D:
	var holder := Node3D.new()
	holder.name = "Weapon"
	holder.position = Vector3(0.0, -br * 0.14, 0.0)
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
