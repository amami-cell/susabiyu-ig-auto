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
static func decorate_simple(bug_root: Node3D, color: Color, scale_v: float, shell: bool) -> void:
	if bug_root.has_node("InsectRig"):
		return
	var rig := Node3D.new()
	rig.name = "InsectRig"
	rig.scale = Vector3.ONE * scale_v
	bug_root.add_child(rig)
	var skin := color.darkened(0.15)
	var head := _sphere(rig, "Head", 0.16, skin)
	head.position = Vector3(0.0, 0.24, -0.28)
	for sx in [-1.0, 1.0]:
		var eye := _sphere(head, "Eye", 0.06, Color(0.05, 0.04, 0.04))
		eye.position = Vector3(0.08 * sx, 0.03, -0.10)
	if shell:
		var sh := _sphere(rig, "Shell", 0.3, color.darkened(0.05))
		sh.scale = Vector3(1.05, 0.62, 1.35)
		sh.position = Vector3(0.0, 0.28, 0.04)


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
	m.roughness = 0.8
	m.rim_enabled = true
	m.rim = 0.4
	return m
