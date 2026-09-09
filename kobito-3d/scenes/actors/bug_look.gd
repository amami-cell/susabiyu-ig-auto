extends RefCounted
class_name BugLook
## 横倒しカプセル1個の敵を“虫らしく”見せる最小リグ。
## 頭・目・触角・6本脚（＋コガネムシは甲羅）を手続きで足す。素材ゼロ・低ポリ・スマホ安全。
##
## パーツは Bug ルート直下の "InsectRig"（=虫の向きに素直な座標系）に置く。
## Bug は look_at で -Z を進行方向に向けるので、-Z を“前(頭側)”として組む。
## 胴体(Body)はそのまま腹として使い、攻撃/被弾のスケール芝居はこれまで通り効く。

static func decorate(bug_root: Node3D, color: Color, scale_v: float, shell: bool) -> void:
	if bug_root.has_node("InsectRig"):
		return
	var rig := Node3D.new()
	rig.name = "InsectRig"
	rig.scale = Vector3.ONE * scale_v
	bug_root.add_child(rig)

	var skin := color.darkened(0.15)
	var dark := color.darkened(0.5)

	# --- 頭（前＝-Z）---
	var head := _sphere(rig, "Head", 0.15, skin)
	head.position = Vector3(0.0, 0.24, -0.30)

	# --- 目 x2（頭の前・こげ茶）---
	for sx in [-1.0, 1.0]:
		var eye := _sphere(head, "Eye", 0.055, Color(0.05, 0.04, 0.04))
		eye.position = Vector3(0.08 * sx, 0.03, -0.10)

	# --- 触角 x2（頭から前上へ）---
	var antennae: Array[Node3D] = []
	for sx in [-1.0, 1.0]:
		var pivot := Node3D.new()
		pivot.name = "Antenna"
		pivot.position = Vector3(0.05 * sx, 0.12, -0.08)
		pivot.rotation = Vector3(-0.7, 0.0, 0.3 * sx)
		head.add_child(pivot)
		var ant := _capsule(pivot, "AntStem", 0.018, 0.24, dark)
		ant.position = Vector3(0.0, 0.12, 0.0)
		antennae.append(pivot)

	# --- 脚 x6（腹の下から下外へ。付け根ピボットを回すと振れる）---
	var legs: Array[Node3D] = []
	var zs := [-0.12, 0.03, 0.18]     # 前・中・後ろ
	for zi in zs:
		for sx in [-1.0, 1.0]:
			var hip := Node3D.new()
			hip.name = "Leg"
			hip.position = Vector3(0.12 * sx, 0.14, zi)
			hip.rotation = Vector3(0.0, 0.0, (0.9) * sx)   # 外へ張り出す
			rig.add_child(hip)
			var leg := _capsule(hip, "LegSeg", 0.022, 0.26, dark)
			leg.position = Vector3(0.0, -0.13, 0.0)
			legs.append(hip)

	# --- コガネムシ等：甲羅（つやのあるドーム）---
	if shell:
		var sh := _sphere(rig, "Shell", 0.3, color.darkened(0.05))
		sh.scale = Vector3(1.05, 0.62, 1.35)
		sh.position = Vector3(0.0, 0.28, 0.04)
		var m := sh.material_override as StandardMaterial3D
		if m != null:
			m.metallic = 0.35
			m.roughness = 0.35

	# --- 生きてる感（脚・触角の小刻み）---
	var anim := BugAnim.new()
	anim.name = "BugAnim"
	rig.add_child(anim)
	anim.setup(legs, antennae)


## Web用の超軽量版：頭＋目2（＋甲羅）だけ。脚6・触角2・BugAnim を省いてドローコールを
## 約12→約4に激減。gl_compatibility(Web)は1部品=1ドローコールなので、ボス戦で敵が
## 十数体出ると効く。見た目は「目のある小さな虫」で成立する。
static func decorate_simple(bug_root: Node3D, color: Color, scale_v: float, shell: bool, flies: bool = false) -> void:
	if bug_root.has_node("InsectRig"):
		return
	var rig := Node3D.new()
	rig.name = "InsectRig"
	rig.scale = Vector3.ONE * scale_v
	bug_root.add_child(rig)
	# “顔が主役”の丸い生きもの。暗い体で潰れないよう頭は体色を持ち上げた明るめの色に。
	var skin := color.lerp(Color(0.72, 0.64, 0.62), 0.4)
	var dark := color.darkened(0.28)

	# --- 大きな頭（胴より大きいチビ体型＝かわいい・顔が主役）---
	var head := _sphere(rig, "Head", 0.34, skin)
	head.position = Vector3(0.0, 0.34, -0.04)
	head.scale = Vector3(1.06, 0.96, 1.0)

	# --- 触角2＋先の丸い節（頭の上へ）---
	var knob_mat := _mat(skin.lightened(0.12))
	for sx in [-1.0, 1.0]:
		var ant := _capsule(head, "Antenna", 0.02, 0.3, dark)
		ant.position = Vector3(0.16 * sx, 0.34, -0.02)
		ant.rotation = Vector3(deg_to_rad(-26.0), 0.0, deg_to_rad(20.0) * sx)
		var knob := _sphere(ant, "Knob", 0.06, skin.lightened(0.12))
		knob.material_override = knob_mat
		knob.position = Vector3(0.0, 0.17, 0.0)

	# --- 目2（白目＋小さめの黒目＋ハイライト）＝うるんだ“助けたくなる”眼。
	# ※黒目は必ず白目より小さく。以前は黒目(0.62)が白目(0.155)より大きく、
	#   顔全体が“黒い固まり”に潰れて見えていた不具合を修正。
	var eye_mat := _eye_mat()
	var sclera_mat := _mat(Color(0.96, 0.97, 0.94))
	var cat_mat := _mat(Color(1, 1, 1))
	cat_mat.emission_enabled = true
	cat_mat.emission = Color(1, 1, 1)
	cat_mat.emission_energy_multiplier = 1.2
	cat_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	for sx in [-1.0, 1.0]:
		var sclera := _sphere(head, "Sclera", 0.15, Color(0.96, 0.97, 0.94))
		sclera.material_override = sclera_mat
		sclera.position = Vector3(0.145 * sx, 0.02, -0.2)
		sclera.scale = Vector3(1.0, 1.15, 0.78)
		# 黒目（白目より小さく・前面へ）
		var eye := _sphere(head, "Eye", 0.092, Color(0.05, 0.04, 0.05))
		eye.material_override = eye_mat
		eye.position = Vector3(0.15 * sx, 0.0, -0.3)
		# きらっと光るハイライト（生きてる眼）
		var cat := _sphere(head, "Cat", 0.03, Color(1, 1, 1))
		cat.material_override = cat_mat
		cat.position = Vector3(0.12 * sx, 0.05, -0.36)

	# --- 困り眉2（ハの字）---
	for sx in [-1.0, 1.0]:
		var brow := _capsule(head, "Brow", 0.018, 0.14, dark)
		brow.position = Vector3(0.14 * sx, 0.2, -0.3)
		brow.rotation = Vector3(deg_to_rad(90.0), 0.0, deg_to_rad(24.0) * sx)

	# --- ほっぺ2 ---
	var cheek_mat := _mat(Color(0.95, 0.55, 0.55))
	for sx in [-1.0, 1.0]:
		var cheek := _sphere(head, "Cheek", 0.07, Color(0.95, 0.55, 0.55))
		cheek.material_override = cheek_mat
		cheek.position = Vector3(0.24 * sx, -0.08, -0.24)
		cheek.scale = Vector3(1.1, 0.75, 0.5)

	# --- 小さな困り口 ---
	var mouth := _sphere(head, "Mouth", 0.05, Color(0.3, 0.14, 0.16))
	mouth.material_override = _mat(Color(0.3, 0.14, 0.16))
	mouth.position = Vector3(0.0, -0.2, -0.32)
	mouth.scale = Vector3(1.7, 0.7, 0.5)

	if flies:
		# 飛ぶ敵：半透明の羽4枚（左右2対）＝“飛んでる”とひと目で分かる。脚は小さくたらす。
		var wing_mat := StandardMaterial3D.new()
		wing_mat.albedo_color = Color(0.9, 0.95, 1.0, 0.45)
		wing_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		wing_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		wing_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		for sx in [-1.0, 1.0]:
			for zi in [0.02, 0.16]:
				var wing := _sphere(rig, "Wing", 0.18, Color(0.9, 0.95, 1.0))
				wing.material_override = wing_mat
				wing.position = Vector3(0.22 * sx, 0.34, zi)
				wing.scale = Vector3(0.9, 0.12, 0.42)
				wing.rotation = Vector3(0.0, 0.0, deg_to_rad(28.0) * sx)
		for sx in [-1.0, 1.0]:
			var dangle := _capsule(rig, "Leg", 0.02, 0.13, dark)
			dangle.position = Vector3(0.08 * sx, -0.02, 0.06)
	else:
		# --- 歩く敵：ちいさな脚4（下・暗い）＝“立ってる生きもの”に ---
		for zi in [-0.06, 0.14]:
			for sx in [-1.0, 1.0]:
				var leg := _capsule(rig, "Leg", 0.025, 0.16, dark)
				leg.position = Vector3(0.13 * sx, 0.02, zi)
				leg.rotation = Vector3(0.0, 0.0, deg_to_rad(20.0) * sx)

	if shell:
		var sh := _sphere(rig, "Shell", 0.22, color.darkened(0.05))
		sh.scale = Vector3(1.05, 0.62, 1.35)
		sh.position = Vector3(0.0, 0.24, 0.18)


## 中ボス用の固有シルエット：溶けかけのヘドロが盛り上がった塊＋にらむ目＋太い脚。
## “大きいアリ”ではなく“汚れのおおもと”に見せる。素材ゼロ・低ポリ・全機種OK。
static func decorate_boss(bug_root: Node3D, color: Color, scale_v: float) -> void:
	if bug_root.has_node("InsectRig"):
		return
	var rig := Node3D.new()
	rig.name = "InsectRig"
	rig.scale = Vector3.ONE * scale_v
	bug_root.add_child(rig)
	var skin := color.darkened(0.1)
	# ヘドロの盛り：黄金角で大小の球を積む＝溶けた塊のシルエット
	var lumps := [
		[Vector3(0.0, 0.32, 0.0), 0.42],
		[Vector3(0.22, 0.20, 0.06), 0.26],
		[Vector3(-0.20, 0.22, -0.05), 0.28],
		[Vector3(0.05, 0.55, -0.08), 0.24],
		[Vector3(-0.06, 0.16, 0.24), 0.22],
	]
	for lump in lumps:
		var b := _sphere(rig, "Lump", lump[1], skin)
		b.position = lump[0]
		b.scale = Vector3(1.0, 0.85, 1.0)
	# にらむ目2つ（前＝-Z、澄んだ黄で“意思”を感じさせる）
	for sx in [-1.0, 1.0]:
		var eye := _sphere(rig, "Eye", 0.075, Color(0.95, 0.85, 0.4))
		eye.position = Vector3(0.12 * sx, 0.40, -0.34)
		var pup := _sphere(eye, "Pupil", 0.5, Color(0.06, 0.05, 0.05))
		pup.position = Vector3(0.0, 0.0, -0.5)
	# 太い脚4本（どっしり）
	for zi in [-0.18, 0.2]:
		for sx in [-1.0, 1.0]:
			var hip := Node3D.new()
			hip.name = "Leg"
			hip.position = Vector3(0.24 * sx, 0.12, zi)
			hip.rotation = Vector3(0.0, 0.0, 1.0 * sx)
			rig.add_child(hip)
			var leg := _capsule(hip, "LegSeg", 0.06, 0.34, color.darkened(0.45))
			leg.position = Vector3(0.0, -0.15, 0.0)


static func _sphere(parent: Node, node_name: String, r: float, c: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = node_name
	var m := SphereMesh.new()
	m.radius = r
	m.height = r * 2.0
	m.radial_segments = 8
	m.rings = 5
	mi.mesh = m
	mi.material_override = _mat(c)
	parent.add_child(mi)
	return mi


static func _capsule(parent: Node, node_name: String, r: float, h: float, c: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = node_name
	var m := CapsuleMesh.new()
	m.radius = r
	m.height = h
	m.radial_segments = 6
	mi.mesh = m
	mi.material_override = _mat(c)
	parent.add_child(mi)
	return mi


static func _mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.95
	m.metallic_specular = 0.12   # 既定0.5の鏡面が“黒いテカリ玉”の主因→下げてマットに
	m.rim_enabled = true
	m.rim = 0.22
	m.rim_tint = 0.5
	return m


## つやのある目（クリアコートの照り）＝“生きてる・うるんだ”眼。癒やしたくなる表情に。
static func _eye_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.06, 0.05, 0.05)
	m.roughness = 0.14
	m.metallic_specular = 0.7
	m.clearcoat_enabled = true
	m.clearcoat = 1.0
	m.clearcoat_roughness = 0.04
	return m
