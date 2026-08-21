extends RefCounted
class_name KobitoLook
## 箱っぽいカプセルを“小人”に見せる最小リグ（頭・目・鼻・腕）＋芝居アニメ。
##
## 低ポリ・単純形状のまま（VISUAL.md／顔は点でいい）。素材ゼロ・追加コスト小。
## プレイヤーも子ども8人も、これ1つで同じ姿になる（色だけ違う）。
## 腕は肩ピボットからぶら下げ、歩くと振る（KobitoAnim が動かす）。
## 脚は付けない（体がそのまま地面に接するチビ体型。地面へのめり込みを避ける）。

static func decorate(body: MeshInstance3D, color: Color) -> void:
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
	head.material_override = _mat(color, 0.85)
	head.position = Vector3(0.0, half, 0.0)
	body.add_child(head)

	# --- 目 x2（前向き・こげ茶）---
	var eyes: Array[Node3D] = []
	var eyemat := _mat(Color(0.12, 0.09, 0.08), 0.5)
	for sx in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		eye.name = "Eye%s" % ("L" if sx < 0 else "R")
		var em := SphereMesh.new()
		em.radius = br * 0.20
		em.height = br * 0.40
		eye.mesh = em
		eye.material_override = eyemat
		eye.position = Vector3(br * 0.42 * sx, br * 0.16, br * 0.82)
		head.add_child(eye)          # 頭の子＝呼吸で一緒に動く
		eyes.append(eye)

	# --- 鼻 ---
	var nose := MeshInstance3D.new()
	var nm := SphereMesh.new()
	nm.radius = br * 0.13
	nm.height = br * 0.26
	nose.mesh = nm
	nose.material_override = _mat(color.lightened(0.25), 0.6)
	nose.position = Vector3(0.0, -br * 0.02, br * 0.92)
	head.add_child(nose)

	# --- 腕 x2（肩ピボットからぶら下げる）---
	var arm_l := _make_arm(body, color, br, half, -1.0)
	var arm_r := _make_arm(body, color, br, half, 1.0)

	# --- 芝居アニメ ---
	var anim := KobitoAnim.new()
	anim.name = "Anim"
	body.add_child(anim)
	anim.setup(body, head, arm_l, arm_r, eyes)


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
	arm.material_override = _mat(color.darkened(0.08), 0.9)
	arm.position = Vector3(0.0, -br * 0.55, 0.0)                  # 肩からぶら下げる
	pivot.add_child(arm)
	return pivot


static func _mat(c: Color, rough: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	return m
