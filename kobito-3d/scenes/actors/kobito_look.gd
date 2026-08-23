extends RefCounted
class_name KobitoLook
## カプセル1体型を“クレイ（粘土）風の人型の小人”に組み直す。
##
## 当たり判定のカプセル(body)は透明にして残し、見た目は人型パーツで作る。
## 参考＝やわらかいクレイ人形：マットな質感（つや控えめ・発光/輪郭線なし）、
## 白Tシャツ＋襟/袖の白トリム、半ズボン、色つきブーツ、耳、大きな丸い目・ピンクほっぺ。
## 家族ごとに髪型・髪色・体格が変わる（role/char_name）。頭やや大きめの3.3頭身くらい。

# --- 体つきの比率（half=カプセル半身, br=半径 を基準にする）---
const HEAD_R := 0.60
const HEAD_Y := 1.02
const CHEST_Y := 0.50
const WAIST_Y := 0.12
const SHOULDER_Y := 0.68
const SHOULDER_X := 0.7
const ARM_SPLAY := 0.18
const UPPER_ARM_H := 0.46
const FOREARM_H := 0.42
const ELBOW_BEND := 0.14
const HIP_Y := -0.16
const HIP_X := 0.36
const THIGH_H := 0.44
const SHIN_H := 0.44
const KNEE_BEND := 0.08

# --- クレイ風の配色 ---
const SKIN := Color(0.98, 0.82, 0.71)
const SHORTS := Color(0.24, 0.27, 0.40)   # 紺の半ズボン
const TRIM := Color(0.97, 0.97, 0.95)     # 襟・袖口の白トリム
const HAIR_PALETTE := [
	Color(0.92, 0.66, 0.20),  # ブロンド/オレンジ（参考の子）
	Color(0.30, 0.19, 0.10),  # こげ茶
	Color(0.12, 0.10, 0.09),  # ほぼ黒
	Color(0.55, 0.36, 0.18),  # 明るい茶
]
const HAIR_WHITE := Color(0.9, 0.9, 0.88)


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
	var shoulder_x := SHOULDER_X * (1.16 if adult else 1.0)
	var chest_wide := 1.28 if adult else 1.16
	var boots := color.darkened(0.18)   # ブーツ＝シャツ色を少し暗く（識別のアクセント）

	# 当たり判定のカプセルは透明化
	var inv := StandardMaterial3D.new()
	inv.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	inv.albedo_color = Color(0, 0, 0, 0)
	body.material_override = inv

	# --- 胴：Tシャツ（胸→腰のなだらかテーパー・前後に薄い）---
	var chest := _cap(body, color, br * 0.52, half * 0.7,
		Vector3(0.0, half * CHEST_Y, 0.0), Vector3(chest_wide, 1.0, 0.66))
	chest.name = "Torso"
	_cap(body, color, br * 0.46, half * 0.5,
		Vector3(0.0, half * WAIST_Y, 0.0), Vector3(1.05, 1.0, 0.64))

	# 襟（首もとの白トリム）
	_ring(body, TRIM, br * 0.26, br * 0.36, Vector3(0.0, half * 0.82, 0.0))

	# --- 半ズボン（腰）---
	_cap(body, SHORTS, br * 0.46, half * 0.4,
		Vector3(0.0, half * (HIP_Y + 0.04), 0.0), Vector3(1.12, 0.95, 0.68))

	# 女性（母）はワンピース風スカート＝シャツ色。腰から広がる。
	var female := _is_female(char_name)
	if female:
		var skirt := MeshInstance3D.new()
		var skm := CylinderMesh.new()
		skm.top_radius = br * 0.5
		skm.bottom_radius = br * 0.98
		skm.height = half * 0.52
		skm.radial_segments = 14
		skirt.mesh = skm
		skirt.material_override = _clay(color)
		skirt.position = Vector3(0.0, half * (HIP_Y - 0.04), 0.0)
		body.add_child(skirt)

	# --- 頭（少し縦長）＝肌色 ---
	var head := MeshInstance3D.new()
	head.name = "Head"
	var hm := SphereMesh.new()
	hm.radius = head_r
	hm.height = head_r * 2.0
	head.mesh = hm
	head.material_override = _clay(SKIN)
	head.position = Vector3(0.0, half * HEAD_Y, 0.0)
	head.scale = Vector3(0.96, 1.08, 0.98)
	body.add_child(head)

	# 耳（左右）
	for sx in [-1.0, 1.0]:
		var ear := MeshInstance3D.new()
		var erm := SphereMesh.new()
		erm.radius = head_r * 0.24
		erm.height = head_r * 0.48
		ear.mesh = erm
		ear.material_override = _clay(SKIN)
		ear.scale = Vector3(0.6, 1.0, 0.8)
		ear.position = Vector3(head_r * 0.97 * sx, head_r * 0.02, -head_r * 0.05)
		head.add_child(ear)

	# 首
	var neck := MeshInstance3D.new()
	var ncm := CylinderMesh.new()
	ncm.top_radius = br * 0.2
	ncm.bottom_radius = br * 0.24
	ncm.height = half * 0.16
	neck.mesh = ncm
	neck.material_override = _clay(SKIN.darkened(0.05))
	neck.position = Vector3(0.0, half * (HEAD_Y - 0.17), 0.0)
	body.add_child(neck)

	var style := _hair_style(char_name, role)
	var hair_col := _hair_color(char_name, role)
	_build_face(head, head_r, hair_col, style, adult, adult and not female)

	# --- 腕・脚 ---
	var arm_l := _make_arm(body, color, br, half, -1.0, shoulder_x)
	var arm_r := _make_arm(body, color, br, half, 1.0, shoulder_x)
	var legs: Array[Node3D] = []
	legs.append(_make_leg(body, boots, br, half, -1.0))
	legs.append(_make_leg(body, boots, br, half, 1.0))

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


# ---- 家族の差 ----

static func _is_female(char_name: String) -> bool:
	for k in ["母", "妻", "ママ", "かあ", "おかん"]:
		if k in char_name:
			return true
	return false


static func _hair_style(char_name: String, role: String) -> String:
	if "じい" in char_name or "祖" in char_name or "翁" in char_name:
		return "elder"
	if _is_female(char_name):
		return "long"   # 母＝ロングヘア
	match char_name:
		"つぼみ": return "sprout"
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


# ---- パーツ生成ヘルパ（すべてクレイ質感）----

static func _cap(parent: Node3D, c: Color, radius: float, height: float, pos: Vector3, sc: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := CapsuleMesh.new()
	m.radius = radius
	m.height = height
	mi.mesh = m
	mi.material_override = _clay(c)
	mi.position = pos
	mi.scale = sc
	parent.add_child(mi)
	return mi


## リング（襟・袖口）。TorusMesh は Y軸まわりの輪＝首や腕（縦方向）に巻ける。
static func _ring(parent: Node3D, c: Color, inner: float, outer: float, pos: Vector3, sc: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := TorusMesh.new()
	m.inner_radius = inner
	m.outer_radius = outer
	mi.mesh = m
	mi.material_override = _clay(c)
	mi.position = pos
	mi.scale = sc
	parent.add_child(mi)
	return mi


## 顔（髪＋耳の内側なし・眉＋大きな丸い目＋小ハイライト・ピンクほっぺ・にっこり口・鼻）。
static func _build_face(head: MeshInstance3D, hr: float, hair_col: Color, style: String, adult: bool, stubble: bool) -> void:
	_face_eyes = []
	_build_hair(head, hr, hair_col, style)

	# 眉（うっすら）
	var brow_mat := _clay(hair_col.darkened(0.1))
	for sx in [-1.0, 1.0]:
		var brow := MeshInstance3D.new()
		var bxm := BoxMesh.new()
		bxm.size = Vector3(hr * 0.24, hr * 0.06, hr * 0.1)
		brow.mesh = bxm
		brow.material_override = brow_mat
		brow.position = Vector3(hr * 0.38 * sx, hr * 0.4, hr * 0.86)
		brow.rotation.z = -0.1 * sx
		head.add_child(brow)

	var eyemat := _clay(Color(0.09, 0.08, 0.09))
	var hi_mat := StandardMaterial3D.new()
	hi_mat.albedo_color = Color(1, 1, 1)
	hi_mat.roughness = 0.4
	var eye_r := hr * (0.2 if adult else 0.23)
	for sx in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		eye.name = "Eye%s" % ("L" if sx < 0 else "R")
		var em := SphereMesh.new()
		em.radius = eye_r
		em.height = eye_r * 2.0
		eye.mesh = em
		eye.material_override = eyemat
		eye.position = Vector3(hr * 0.4 * sx, hr * 0.14, hr * 0.88)
		head.add_child(eye)
		_face_eyes.append(eye)
		var hi := MeshInstance3D.new()
		var him := SphereMesh.new()
		him.radius = eye_r * 0.3
		him.height = eye_r * 0.6
		hi.mesh = him
		hi.material_override = hi_mat
		hi.position = Vector3(eye_r * 0.35, eye_r * 0.45, eye_r * 0.82)
		eye.add_child(hi)

	var cheek_mat := _clay(Color(1.0, 0.62, 0.62))
	for sx in [-1.0, 1.0]:
		var cheek := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = hr * 0.15
		cm.height = hr * 0.16
		cheek.mesh = cm
		cheek.material_override = cheek_mat
		cheek.position = Vector3(hr * 0.56 * sx, -hr * 0.16, hr * 0.78)
		head.add_child(cheek)

	# にっこり口（小さく横長・口角を少し上げる）
	var mouth := MeshInstance3D.new()
	var mo := SphereMesh.new()
	mo.radius = hr * 0.14
	mo.height = hr * 0.14
	mouth.mesh = mo
	mouth.material_override = _clay(Color(0.72, 0.3, 0.3))
	mouth.scale = Vector3(1.5, 0.42, 0.6)
	mouth.position = Vector3(0.0, -hr * 0.36, hr * 0.92)
	head.add_child(mouth)
	for sx in [-1.0, 1.0]:
		var corner := MeshInstance3D.new()
		var com := SphereMesh.new()
		com.radius = hr * 0.06
		com.height = hr * 0.12
		corner.mesh = com
		corner.material_override = _clay(Color(0.72, 0.3, 0.3))
		corner.position = Vector3(hr * 0.2 * sx, -hr * 0.31, hr * 0.93)   # 口角を上げてにっこり
		head.add_child(corner)

	var nose := MeshInstance3D.new()
	var nm := SphereMesh.new()
	nm.radius = hr * 0.09
	nm.height = hr * 0.18
	nose.mesh = nm
	nose.material_override = _clay(SKIN.darkened(0.05))
	nose.position = Vector3(0.0, -hr * 0.06, hr * 0.99)
	head.add_child(nose)

	# あごひげ（お年寄り）／無精ひげ（大人）
	if style == "elder":
		var beard := MeshInstance3D.new()
		var bdm := SphereMesh.new()
		bdm.radius = hr * 0.5
		bdm.height = hr * 1.0
		beard.mesh = bdm
		beard.material_override = _clay(HAIR_WHITE)
		beard.scale = Vector3(0.9, 0.9, 0.55)
		beard.position = Vector3(0.0, -hr * 0.6, hr * 0.5)
		head.add_child(beard)
	elif stubble:
		var stub := MeshInstance3D.new()
		var stm := SphereMesh.new()
		stm.radius = hr * 0.44
		stm.height = hr * 0.88
		stub.mesh = stm
		stub.material_override = _clay(SKIN.darkened(0.22))
		stub.scale = Vector3(0.92, 0.5, 0.5)
		stub.position = Vector3(0.0, -hr * 0.4, hr * 0.68)
		head.add_child(stub)


## 髪型（髪色つき・クレイ質感）を頭に付ける。
static func _build_hair(head: MeshInstance3D, hr: float, hair_col: Color, style: String) -> void:
	var cap := MeshInstance3D.new()
	cap.name = "Hair"
	var capm := SphereMesh.new()
	capm.radius = hr * 1.0
	capm.height = hr * 2.0
	cap.mesh = capm
	cap.material_override = _clay(hair_col)
	if style == "sprout":
		cap.scale = Vector3(1.02, 0.62, 1.02)
		cap.position = Vector3(0.0, hr * 0.44, -hr * 0.06)
	else:
		cap.scale = Vector3(1.04, 0.86, 1.04)
		cap.position = Vector3(0.0, hr * 0.34, -hr * 0.14)
	head.add_child(cap)

	# 前髪（クレイらしいやわらかい房）
	if style != "sprout" and style != "elder":
		for i in 3:
			var bang := MeshInstance3D.new()
			var bm := SphereMesh.new()
			bm.radius = hr * 0.26
			bm.height = hr * 0.52
			bang.mesh = bm
			bang.material_override = _clay(hair_col)
			bang.scale = Vector3(0.9, 0.7, 0.6)
			bang.position = Vector3(hr * (0.4 * (i - 1)), hr * 0.5, hr * 0.66)
			head.add_child(bang)

	match style:
		"spiky":
			for i in 5:
				var sp := MeshInstance3D.new()
				var spm := CylinderMesh.new()
				spm.top_radius = 0.0
				spm.bottom_radius = hr * 0.18
				spm.height = hr * 0.42
				spm.radial_segments = 6
				sp.mesh = spm
				sp.material_override = _clay(hair_col)
				var ang := -0.6 + 0.3 * i
				sp.position = Vector3(hr * 0.5 * ang, hr * 0.95, -hr * 0.05 + hr * 0.1 * (i % 2))
				sp.rotation = Vector3(0.2, 0.0, ang * 0.5)
				head.add_child(sp)
		"long":
			for sx in [-1.0, 1.0]:
				var side := MeshInstance3D.new()
				var sm := CapsuleMesh.new()
				sm.radius = hr * 0.26
				sm.height = hr * 1.3
				side.mesh = sm
				side.material_override = _clay(hair_col)
				side.scale = Vector3(0.7, 1.0, 0.7)
				side.position = Vector3(hr * 0.9 * sx, -hr * 0.05, -hr * 0.16)
				head.add_child(side)
		"twin":
			for sx in [-1.0, 1.0]:
				var bun := MeshInstance3D.new()
				var bm := SphereMesh.new()
				bm.radius = hr * 0.3
				bm.height = hr * 0.6
				bun.mesh = bm
				bun.material_override = _clay(hair_col)
				bun.position = Vector3(hr * 1.0 * sx, hr * 0.22, -hr * 0.08)
				head.add_child(bun)
		"sprout":
			var stem := MeshInstance3D.new()
			var stm := CylinderMesh.new()
			stm.top_radius = hr * 0.05
			stm.bottom_radius = hr * 0.07
			stm.height = hr * 0.5
			stem.mesh = stm
			stem.material_override = _clay(Color(0.45, 0.62, 0.28))
			stem.position = Vector3(0.0, hr * 0.98, 0.0)
			head.add_child(stem)
			for sx in [-1.0, 1.0]:
				var leaf := MeshInstance3D.new()
				var lm := SphereMesh.new()
				lm.radius = hr * 0.16
				lm.height = hr * 0.32
				leaf.mesh = lm
				leaf.material_override = _clay(Color(0.5, 0.72, 0.32))
				leaf.scale = Vector3(1.4, 0.4, 0.8)
				leaf.position = Vector3(hr * 0.18 * sx, hr * 1.14, 0.0)
				leaf.rotation.z = -0.6 * sx
				head.add_child(leaf)


## 腕：肩ピボット→lean→上腕(半袖=シャツ)→袖口(白)→ひじ→前腕(肌)→手。
static func _make_arm(body: MeshInstance3D, color: Color, br: float, half: float, side: float, shoulder_x: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Arm%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * shoulder_x * side, half * SHOULDER_Y, 0.0)
	body.add_child(pivot)

	var lean := Node3D.new()
	lean.name = "Lean"
	lean.rotation.z = ARM_SPLAY * side
	pivot.add_child(lean)

	# 上腕＝半袖（シャツ色・少し太め）
	_cap(lean, color, br * 0.19, half * UPPER_ARM_H * 0.85,
		Vector3(0.0, half * UPPER_ARM_H * -0.42, 0.0))
	# 袖口の白トリム
	_ring(lean, TRIM, br * 0.16, br * 0.24, Vector3(0.0, half * -UPPER_ARM_H * 0.78, 0.0))

	var elbow := Node3D.new()
	elbow.name = "Elbow"
	elbow.position = Vector3(0.0, half * -UPPER_ARM_H, 0.0)
	elbow.rotation.x = ELBOW_BEND
	lean.add_child(elbow)

	# 前腕＝肌
	_cap(elbow, SKIN, br * 0.16, half * FOREARM_H,
		Vector3(0.0, half * FOREARM_H * -0.5, 0.0))

	var hand := Node3D.new()
	hand.name = "Hand"
	hand.position = Vector3(0.0, half * -FOREARM_H, 0.0)
	elbow.add_child(hand)
	var hmesh := MeshInstance3D.new()
	var hgm := SphereMesh.new()
	hgm.radius = br * 0.18
	hgm.height = br * 0.36
	hmesh.mesh = hgm
	hmesh.material_override = _clay(SKIN.lightened(0.03))
	hand.add_child(hmesh)
	return pivot


## 脚：股ピボット→太もも(肌・半ズボンから出た足)→ひざ→すね(ブーツ)→足(ブーツ)。
static func _make_leg(body: MeshInstance3D, boots: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Leg%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * HIP_X * side, half * HIP_Y, 0.0)
	body.add_child(pivot)

	# 太もも＝肌（半ズボンの下）
	_cap(pivot, SKIN, br * 0.22, half * THIGH_H,
		Vector3(0.0, half * THIGH_H * -0.5, 0.0))

	var knee := Node3D.new()
	knee.name = "Knee"
	knee.position = Vector3(0.0, half * -THIGH_H, 0.0)
	knee.rotation.x = KNEE_BEND
	pivot.add_child(knee)

	# すね＝ブーツ
	_cap(knee, boots, br * 0.21, half * SHIN_H,
		Vector3(0.0, half * SHIN_H * -0.5, 0.0))

	# 足＝ブーツ先（前へ丸い）
	var foot := MeshInstance3D.new()
	var fm := SphereMesh.new()
	fm.radius = br * 0.26
	fm.height = br * 0.5
	foot.mesh = fm
	foot.material_override = _clay(boots)
	foot.scale = Vector3(1.0, 0.85, 1.6)
	foot.position = Vector3(0.0, half * -SHIN_H - br * 0.02, br * 0.16)
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
	handle.material_override = _clay(Color(0.42, 0.28, 0.16))
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
	blade.material_override = bmat
	blade.position = Vector3(0.0, 0.0, -br * 2.4)
	holder.add_child(blade)
	return holder


## クレイ質感：マット（つや控えめ・発光/リムなし）。
static func _clay(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.92
	m.metallic = 0.0
	m.metallic_specular = 0.25
	return m
