extends RefCounted
class_name KobitoLook
## 箱っぽいカプセルを“小人”に見せる最小リグ（頭・目・鼻・腕）＋芝居アニメ。
## プレイヤーには武器（癒やしの葉つきの棒＝木刀のように大きく振る）を持たせる。
##
## 低ポリ・単純形状のまま（VISUAL.md／顔は点でいい）。素材ゼロ・追加コスト小。
## 腕は肩ピボットからぶら下げ、歩くと振る（KobitoAnim が動かす）。攻撃は右腕で大振り。

static func decorate(body: MeshInstance3D, color: Color, with_weapon: bool = false) -> void:
	if body == null or body.mesh == null:
		return
	if body.has_node("Head"):
		return

	var half := 0.5
	var br := 0.25
	if body.mesh is CapsuleMesh:
		half = body.mesh.height * 0.5
		br = body.mesh.radius

	# --- 頭（体と同色）---
	var head := MeshInstance3D.new()
	head.name = "Head"
	var hm := SphereMesh.new()
	hm.radius = br * 0.95
	hm.height = br * 1.9
	head.mesh = hm
	var head_mat := _mat(color, 0.85)
	head_mat.next_pass = _outline(br)                # 絵本風の輪郭線
	head.material_override = head_mat
	head.position = Vector3(0.0, half, 0.0)
	body.add_child(head)

	# 胴体にも輪郭線を足す（プレイヤー/子どもが設定済みの material_override に相乗り）
	if body.material_override is StandardMaterial3D:
		(body.material_override as StandardMaterial3D).next_pass = _outline(br)

	# --- 目 x2（大きめ・つやのハイライトつき＝ぐっと可愛く）---
	var eyes: Array[Node3D] = []
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
		em.radius = br * 0.28
		em.height = br * 0.56
		eye.mesh = em
		eye.material_override = eyemat
		eye.position = Vector3(br * 0.40 * sx, br * 0.18, br * 0.80)
		head.add_child(eye)
		eyes.append(eye)
		# ひとみのハイライト（白い点）。目の子なのでまばたきで一緒に動く。
		var hi := MeshInstance3D.new()
		var him := SphereMesh.new()
		him.radius = br * 0.09
		him.height = br * 0.18
		hi.mesh = him
		hi.material_override = hi_mat
		hi.position = Vector3(br * 0.1, br * 0.12, br * 0.22)
		eye.add_child(hi)

	# --- ほっぺ（ほんのり桃色）---
	var cheek_mat := _mat(Color(1.0, 0.6, 0.62), 0.7)
	for sx in [-1.0, 1.0]:
		var cheek := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = br * 0.16
		cm.height = br * 0.2
		cheek.mesh = cm
		cheek.material_override = cheek_mat
		cheek.position = Vector3(br * 0.62 * sx, -br * 0.16, br * 0.66)
		head.add_child(cheek)

	# --- 口（小さな笑み）---
	var mouth := MeshInstance3D.new()
	var mm2 := SphereMesh.new()
	mm2.radius = br * 0.12
	mm2.height = br * 0.1
	mouth.mesh = mm2
	mouth.material_override = _mat(Color(0.35, 0.14, 0.14), 0.6)
	mouth.scale = Vector3(1.6, 0.5, 1.0)
	mouth.position = Vector3(0.0, -br * 0.34, br * 0.86)
	head.add_child(mouth)

	# --- 鼻（小さめ）---
	var nose := MeshInstance3D.new()
	var nm := SphereMesh.new()
	nm.radius = br * 0.1
	nm.height = br * 0.2
	nose.mesh = nm
	nose.material_override = _mat(color.lightened(0.25), 0.6)
	nose.position = Vector3(0.0, -br * 0.06, br * 0.94)
	head.add_child(nose)

	# --- 腕 x2 ---
	var arm_l := _make_arm(body, color, br, half, -1.0)
	var arm_r := _make_arm(body, color, br, half, 1.0)

	# --- 武器（プレイヤーだけ）＋大きな振りトレイル ---
	var weapon: Node3D = null
	var trail: Node3D = null
	if with_weapon:
		weapon = _make_weapon(arm_r, br)
		trail = weapon.get_node_or_null("Trail")

	# --- 芝居アニメ ---
	var anim := KobitoAnim.new()
	anim.name = "Anim"
	body.add_child(anim)
	anim.setup(body, head, arm_l, arm_r, eyes, weapon, trail)


static func _make_arm(body: MeshInstance3D, color: Color, br: float, half: float, side: float) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Arm%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * 1.05 * side, half * 0.5, 0.0)   # 肩の位置
	body.add_child(pivot)

	var arm := MeshInstance3D.new()
	var am := CapsuleMesh.new()
	am.radius = br * 0.26
	am.height = br * 1.1
	arm.mesh = am
	var arm_mat := _mat(color.darkened(0.08), 0.9)
	arm_mat.next_pass = _outline(br)                             # 絵本風の輪郭線
	arm.material_override = arm_mat
	arm.position = Vector3(0.0, -br * 0.55, 0.0)                  # 肩からぶら下げる
	pivot.add_child(arm)

	# 手（丸いおてて・肌は少し明るい）
	var hand := MeshInstance3D.new()
	var hgm := SphereMesh.new()
	hgm.radius = br * 0.3
	hgm.height = br * 0.6
	hand.mesh = hgm
	hand.material_override = _mat(color.lightened(0.12), 0.85)
	hand.position = Vector3(0.0, -br * 1.1, 0.0)
	pivot.add_child(hand)
	return pivot


## 右手に握る棒（前方へ伸びる明るい刃）。攻撃時は水平に薙ぐので、刃は前(-Z)へ長く伸ばす。
## 大きな半透明トレイルを刃に沿って水平に敷き、薙ぎの軌跡をはっきり見せる（背後からも見える）。
static func _make_weapon(arm_pivot: Node3D, br: float) -> Node3D:
	var holder := Node3D.new()
	holder.name = "Weapon"
	holder.position = Vector3(0.0, -br * 1.0, 0.0)   # 手の位置（腕の先）
	arm_pivot.add_child(holder)

	# 柄（前方へ倒す）
	var handle := MeshInstance3D.new()
	var hm := CylinderMesh.new()
	hm.top_radius = br * 0.08
	hm.bottom_radius = br * 0.08
	hm.height = br * 0.4
	hm.radial_segments = 6
	handle.mesh = hm
	handle.material_override = _mat(Color(0.42, 0.28, 0.16), 0.9)
	handle.rotation = Vector3(deg_to_rad(90.0), 0.0, 0.0)   # 前方(-Z)へ倒す
	handle.position = Vector3(0.0, 0.0, -br * 0.2)
	holder.add_child(handle)

	# 刃（大きく・明るく発光する光の剣＝振れば必ず見える）
	var blade := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(br * 0.45, br * 0.14, br * 4.2)   # 長く太い。z方向に伸びる
	blade.mesh = bm
	var bmat := StandardMaterial3D.new()
	bmat.albedo_color = Color(0.85, 1.0, 0.7)
	bmat.emission_enabled = true
	bmat.emission = Color(0.6, 1.0, 0.55)
	bmat.emission_energy_multiplier = 2.4
	bmat.rim_enabled = true
	blade.material_override = bmat
	blade.position = Vector3(0.0, 0.0, -br * 2.4)   # 手の前方へ大きく突き出す
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
## next_pass に差すと、その面の外周に線が出る。gl_compatibility でも効く軽い方法。
static func _outline(br: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(0.08, 0.09, 0.11)
	m.cull_mode = BaseMaterial3D.CULL_FRONT
	m.grow = true
	m.grow_amount = br * 0.09
	return m
