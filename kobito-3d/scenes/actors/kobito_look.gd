extends RefCounted
class_name KobitoLook
## カプセル1体型を“人型の小人”に組み直す（頭・首・胸・腰・骨盤・腕・脚＋顔＋服＋髪型）。
##
## 当たり判定のカプセル(body)は透明にして残し、見た目は人型パーツで作る。
## なめらかで人間らしいシルエット＋服（半袖・ベルト・えり）＋家族ごとに違う髪型/髪色。
## role="adult"（親）は肩幅広め＋無精ひげ、"child"（子）は名前ごとに髪型・髪色が変わる。
## 頭は少し縦長、腕はひじ・脚はひざで軽く曲げ、腕は自然に外へ下ろす。輪郭線つき。

# --- 体つきの比率（half=カプセル半身, br=半径 を基準にする）---
const HEAD_R := 0.54
const HEAD_Y := 1.10
const CHEST_Y := 0.52
const WAIST_Y := 0.14
const SHOULDER_Y := 0.72
const SHOULDER_X := 0.72
const ARM_SPLAY := 0.16
const UPPER_ARM_H := 0.50
const FOREARM_H := 0.46
const ELBOW_BEND := 0.16
const HIP_Y := -0.14
const HIP_X := 0.36
const THIGH_H := 0.50
const SHIN_H := 0.48
const KNEE_BEND := 0.10

# --- 人らしい配色 ---
const SKIN := Color(0.97, 0.80, 0.68)
const PANTS := Color(0.27, 0.30, 0.42)
const SHOES := Color(0.19, 0.15, 0.12)
const BELT := Color(0.15, 0.12, 0.10)
# 髪色パレット（名前から決める）
const HAIR_PALETTE := [
	Color(0.20, 0.13, 0.08),  # こげ茶
	Color(0.10, 0.08, 0.07),  # ほぼ黒
	Color(0.34, 0.21, 0.11),  # 栗色
	Color(0.45, 0.30, 0.14),  # 明るい茶
]
const HAIR_WHITE := Color(0.9, 0.9, 0.88)


## body=当たり判定カプセル, color=シャツ色, with_weapon=武器を持つか,
## role="adult"/"child", char_name=キャラ名（髪型・髪色を決める）
static func decorate(body: MeshInstance3D, color: Color, with_weapon: bool = false, role: String = "child", char_name: String = "") -> void:
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
	var adult := role == "adult"
	var shoulder_x := SHOULDER_X * (1.18 if adult else 1.0)   # 親は肩幅広め
	var chest_wide := 1.3 if adult else 1.18

	# 当たり判定のカプセルは透明化（見た目は人型パーツが担う）
	var inv := StandardMaterial3D.new()
	inv.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	inv.albedo_color = Color(0, 0, 0, 0)
	body.material_override = inv

	# --- 胴：胸→腰 のなだらかなテーパー（前後に薄い）---
	var chest := _cap(body, color, br, br * 0.5, half * 0.72,
		Vector3(0.0, half * CHEST_Y, 0.0), Vector3(chest_wide, 1.0, 0.62))
	chest.name = "Torso"
	_cap(body, color, br, br * 0.42, half * 0.56,
		Vector3(0.0, half * WAIST_Y, 0.0), Vector3(1.0, 1.0, 0.6))

	# えり（首もと）＝シャツ色を少し暗く
	_cap(body, color.darkened(0.25), br, br * 0.28, half * 0.14,
		Vector3(0.0, half * 0.86, 0.0), Vector3(1.2, 0.5, 0.9))

	# ベルト（腰）
	var belt := MeshInstance3D.new()
	var beltm := BoxMesh.new()
	beltm.size = Vector3(br * 0.92, half * 0.1, br * 0.66)
	belt.mesh = beltm
	var belt_mat := _mat(BELT, 0.7)
	belt_mat.next_pass = _outline(br)
	belt.material_override = belt_mat
	belt.position = Vector3(0.0, half * (HIP_Y + 0.14), 0.0)
	body.add_child(belt)

	# --- 骨盤（腰）＝ズボン色 ---
	_cap(body, PANTS, br, br * 0.44, half * 0.42,
		Vector3(0.0, half * (HIP_Y + 0.05), 0.0), Vector3(1.1, 0.9, 0.64))

	# --- 頭（少し縦長）＝肌色 ---
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
	head.scale = Vector3(0.94, 1.12, 0.98)
	body.add_child(head)

	# 首
	var neck := MeshInstance3D.new()
	var ncm := CylinderMesh.new()
	ncm.top_radius = br * 0.2
	ncm.bottom_radius = br * 0.24
	ncm.height = half * 0.18
	neck.mesh = ncm
	neck.material_override = _mat(SKIN.darkened(0.05), 0.7)
	neck.position = Vector3(0.0, half * (HEAD_Y - 0.18), 0.0)
	body.add_child(neck)

	var style := _hair_style(char_name, role)
	var hair_col := _hair_color(char_name, role)
	_build_face(head, head_r, hair_col, style, adult)

	# --- 腕・脚 ---
	var arm_l := _make_arm(body, color, br, half, -1.0, shoulder_x)
	var arm_r := _make_arm(body, color, br, half, 1.0, shoulder_x)
	var legs: Array[Node3D] = []
	legs.append(_make_leg(body, color, br, half, -1.0))
	legs.append(_make_leg(body, color, br, half, 1.0))

	# --- 武器（プレイヤーだけ・右手）---
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


# ---- 家族の差（髪型・髪色を名前/役割から決める）----

static func _hair_style(char_name: String, role: String) -> String:
	if "じい" in char_name or "祖" in char_name or "翁" in char_name:
		return "elder"
	match char_name:
		"つぼみ": return "sprout"   # 末っ子＝芽（つぼみ）
		"スミレ": return "long"
		"カヤ": return "spiky"
		"ソラ": return "short"
		"シズク": return "twin"
		"リン": return "long"
		"ラン": return "twin"
		"マメ": return "spiky"
	if role == "adult":
		return "short"
	var styles := ["short", "spiky", "long", "twin"]
	return styles[absi(char_name.hash()) % styles.size()]


static func _hair_color(char_name: String, role: String) -> Color:
	if "じい" in char_name or "祖" in char_name or "翁" in char_name:
		return HAIR_WHITE
	return HAIR_PALETTE[absi(char_name.hash()) % HAIR_PALETTE.size()]


static func _cap(parent: Node3D, c: Color, br: float, radius: float, height: float, pos: Vector3, sc: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := CapsuleMesh.new()
	m.radius = radius
	m.height = height
	mi.mesh = m
	var mat := _mat(c, 0.85)
	mat.next_pass = _outline(br)
	mi.material_override = mat
	mi.position = pos
	mi.scale = sc
	parent.add_child(mi)
	return mi


## 顔（髪型別の髪＋眉＋大きな目＋ハイライト・ほっぺ・口・鼻＋無精ひげ/あごひげ）。
static func _build_face(head: MeshInstance3D, hr: float, hair_col: Color, style: String, adult: bool) -> void:
	_face_eyes = []
	_build_hair(head, hr, hair_col, style)

	# 眉（顔つきが出る）
	var brow_mat := _mat(hair_col.darkened(0.1), 0.7)
	for sx in [-1.0, 1.0]:
		var brow := MeshInstance3D.new()
		var bxm := BoxMesh.new()
		bxm.size = Vector3(hr * 0.28, hr * 0.07, hr * 0.12)
		brow.mesh = bxm
		brow.material_override = brow_mat
		brow.position = Vector3(hr * 0.42 * sx, hr * 0.44, hr * 0.82)
		brow.rotation.z = -0.12 * sx
		head.add_child(brow)

	var eyemat := _mat(Color(0.1, 0.08, 0.09), 0.25)
	var hi_mat := StandardMaterial3D.new()
	hi_mat.albedo_color = Color(1, 1, 1)
	hi_mat.emission_enabled = true
	hi_mat.emission = Color(1, 1, 1)
	hi_mat.emission_energy_multiplier = 0.4
	var eye_r := hr * (0.26 if adult else 0.3)   # 大人は目を少し小さく＝リアル寄り
	for sx in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		eye.name = "Eye%s" % ("L" if sx < 0 else "R")
		var em := SphereMesh.new()
		em.radius = eye_r
		em.height = eye_r * 2.0
		eye.mesh = em
		eye.material_override = eyemat
		eye.position = Vector3(hr * 0.42 * sx, hr * 0.16, hr * 0.84)
		head.add_child(eye)
		_face_eyes.append(eye)
		var hi := MeshInstance3D.new()
		var him := SphereMesh.new()
		him.radius = eye_r * 0.32
		him.height = eye_r * 0.64
		hi.mesh = him
		hi.material_override = hi_mat
		hi.position = Vector3(eye_r * 0.4, eye_r * 0.45, eye_r * 0.8)
		eye.add_child(hi)

	var cheek_mat := _mat(Color(1.0, 0.6, 0.62), 0.7)
	for sx in [-1.0, 1.0]:
		var cheek := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = hr * 0.16
		cm.height = hr * 0.18
		cheek.mesh = cm
		cheek.material_override = cheek_mat
		cheek.position = Vector3(hr * 0.6 * sx, -hr * 0.18, hr * 0.72)
		head.add_child(cheek)

	var mouth := MeshInstance3D.new()
	var mo := SphereMesh.new()
	mo.radius = hr * 0.12
	mo.height = hr * 0.12
	mouth.mesh = mo
	mouth.material_override = _mat(Color(0.35, 0.14, 0.14), 0.6)
	mouth.scale = Vector3(1.5, 0.5, 1.0)
	mouth.position = Vector3(0.0, -hr * 0.4, hr * 0.9)
	head.add_child(mouth)

	var nose := MeshInstance3D.new()
	var nm := SphereMesh.new()
	nm.radius = hr * 0.1
	nm.height = hr * 0.2
	nose.mesh = nm
	nose.material_override = _mat(SKIN.darkened(0.06), 0.6)
	nose.position = Vector3(0.0, -hr * 0.08, hr * 0.96)
	head.add_child(nose)

	# あごひげ（お年寄り）／無精ひげ（大人）
	if style == "elder":
		var beard := MeshInstance3D.new()
		var bdm := SphereMesh.new()
		bdm.radius = hr * 0.5
		bdm.height = hr * 1.0
		beard.mesh = bdm
		beard.material_override = _mat(HAIR_WHITE, 0.6)
		beard.scale = Vector3(0.9, 0.9, 0.55)
		beard.position = Vector3(0.0, -hr * 0.62, hr * 0.5)
		head.add_child(beard)
	elif adult:
		var stub := MeshInstance3D.new()
		var stm := SphereMesh.new()
		stm.radius = hr * 0.46
		stm.height = hr * 0.92
		stub.mesh = stm
		stub.material_override = _mat(SKIN.darkened(0.28), 0.8)
		stub.scale = Vector3(0.92, 0.5, 0.5)
		stub.position = Vector3(0.0, -hr * 0.42, hr * 0.66)
		head.add_child(stub)


## 髪型（髪色つき）を頭に付ける。style: short/spiky/long/twin/sprout/elder
static func _build_hair(head: MeshInstance3D, hr: float, hair_col: Color, style: String) -> void:
	# 土台のキャップ（芽っ子は薄め）
	var cap := MeshInstance3D.new()
	cap.name = "Hair"
	var capm := SphereMesh.new()
	capm.radius = hr * 1.0
	capm.height = hr * 2.0
	cap.mesh = capm
	var hair_mat := _mat(hair_col, 0.6)
	hair_mat.next_pass = _outline(hr)
	cap.material_override = hair_mat
	if style == "sprout":
		cap.scale = Vector3(1.03, 0.66, 1.03)
		cap.position = Vector3(0.0, hr * 0.42, -hr * 0.08)
	else:
		cap.scale = Vector3(1.05, 0.9, 1.05)
		cap.position = Vector3(0.0, hr * 0.32, -hr * 0.16)
	head.add_child(cap)

	match style:
		"spiky":
			for i in 5:
				var sp := MeshInstance3D.new()
				var spm := CylinderMesh.new()
				spm.top_radius = 0.0
				spm.bottom_radius = hr * 0.2
				spm.height = hr * 0.5
				spm.radial_segments = 5
				sp.mesh = spm
				sp.material_override = _mat(hair_col, 0.6)
				var ang := -0.6 + 0.3 * i
				sp.position = Vector3(hr * 0.5 * (ang), hr * 0.95, -hr * 0.1 + hr * 0.1 * (i % 2))
				sp.rotation = Vector3(0.2, 0.0, ang * 0.5)
				head.add_child(sp)
		"long":
			for sx in [-1.0, 1.0]:
				var side := MeshInstance3D.new()
				var sm := CapsuleMesh.new()
				sm.radius = hr * 0.26
				sm.height = hr * 1.3
				side.mesh = sm
				side.material_override = _mat(hair_col, 0.6)
				side.scale = Vector3(0.7, 1.0, 0.7)
				side.position = Vector3(hr * 0.88 * sx, -hr * 0.05, -hr * 0.18)
				head.add_child(side)
		"twin":
			for sx in [-1.0, 1.0]:
				var bun := MeshInstance3D.new()
				var bm := SphereMesh.new()
				bm.radius = hr * 0.32
				bm.height = hr * 0.64
				bun.mesh = bm
				bun.material_override = _mat(hair_col, 0.6)
				bun.position = Vector3(hr * 0.98 * sx, hr * 0.25, -hr * 0.1)
				head.add_child(bun)
		"sprout":
			# 茎（緑）＋葉2枚＝つぼみらしい芽
			var stem := MeshInstance3D.new()
			var stm := CylinderMesh.new()
			stm.top_radius = hr * 0.05
			stm.bottom_radius = hr * 0.07
			stm.height = hr * 0.5
			stem.mesh = stm
			stem.material_override = _mat(Color(0.45, 0.62, 0.28), 0.7)
			stem.position = Vector3(0.0, hr * 0.95, 0.0)
			head.add_child(stem)
			for sx in [-1.0, 1.0]:
				var leaf := MeshInstance3D.new()
				var lm := SphereMesh.new()
				lm.radius = hr * 0.16
				lm.height = hr * 0.32
				leaf.mesh = lm
				leaf.material_override = _mat(Color(0.5, 0.72, 0.32), 0.7)
				leaf.scale = Vector3(1.4, 0.4, 0.8)
				leaf.position = Vector3(hr * 0.18 * sx, hr * 1.12, 0.0)
				leaf.rotation.z = -0.6 * sx
				head.add_child(leaf)


## 腕：肩ピボット→外へ開くlean→上腕(袖=シャツ)→ひじ→前腕(肌)→手。
static func _make_arm(body: MeshInstance3D, color: Color, br: float, half: float, side: float, shoulder_x: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Arm%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * shoulder_x * side, half * SHOULDER_Y, 0.0)
	body.add_child(pivot)

	var lean := Node3D.new()
	lean.name = "Lean"
	lean.rotation.z = ARM_SPLAY * side
	pivot.add_child(lean)

	# 上腕＝半袖（シャツ色）
	_cap(lean, color, br, br * 0.17, half * UPPER_ARM_H * 0.9,
		Vector3(0.0, half * UPPER_ARM_H * -0.45, 0.0))

	var elbow := Node3D.new()
	elbow.name = "Elbow"
	elbow.position = Vector3(0.0, half * -UPPER_ARM_H, 0.0)
	elbow.rotation.x = ELBOW_BEND
	lean.add_child(elbow)

	# 前腕＝肌
	_cap(elbow, SKIN, br, br * 0.13, half * FOREARM_H,
		Vector3(0.0, half * FOREARM_H * -0.5, 0.0))

	var hand := Node3D.new()
	hand.name = "Hand"
	hand.position = Vector3(0.0, half * -FOREARM_H, 0.0)
	elbow.add_child(hand)
	var hmesh := MeshInstance3D.new()
	var hgm := SphereMesh.new()
	hgm.radius = br * 0.16
	hgm.height = br * 0.32
	hmesh.mesh = hgm
	hmesh.material_override = _mat(SKIN.lightened(0.04), 0.7)
	hmesh.scale = Vector3(1.0, 1.1, 0.85)
	hand.add_child(hmesh)
	return pivot


## 脚：股ピボット→太もも→ひざ→すね→足。ズボン＋靴。
static func _make_leg(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Leg%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * HIP_X * side, half * HIP_Y, 0.0)
	body.add_child(pivot)

	_cap(pivot, PANTS, br, br * 0.2, half * THIGH_H,
		Vector3(0.0, half * THIGH_H * -0.5, 0.0))

	var knee := Node3D.new()
	knee.name = "Knee"
	knee.position = Vector3(0.0, half * -THIGH_H, 0.0)
	knee.rotation.x = KNEE_BEND
	pivot.add_child(knee)

	_cap(knee, PANTS.darkened(0.08), br, br * 0.17, half * SHIN_H,
		Vector3(0.0, half * SHIN_H * -0.5, 0.0))

	var foot := MeshInstance3D.new()
	var fm := BoxMesh.new()
	fm.size = Vector3(br * 0.42, br * 0.28, br * 0.82)
	foot.mesh = fm
	var foot_mat := _mat(SHOES, 0.6)
	foot_mat.next_pass = _outline(br)
	foot.material_override = foot_mat
	foot.position = Vector3(0.0, half * -SHIN_H - br * 0.02, br * 0.2)
	knee.add_child(foot)
	return pivot


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


static func _outline(br: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(0.08, 0.09, 0.11)
	m.cull_mode = BaseMaterial3D.CULL_FRONT
	m.grow = true
	m.grow_amount = br * 0.08
	return m
