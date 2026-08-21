extends RefCounted
class_name KobitoLook
## 箱っぽいカプセルに「頭・目・鼻」を足して“小人”に見せる最小リグ。
##
## 低ポリ・単純形状のまま（VISUAL.md の方針＝顔は点でいい）。素材ゼロ・追加コスト小。
## プレイヤーも子ども8人も、これ1つで同じ姿になる（色だけ違う）。
## Body（カプセル）の子として足すので、殴りの“ぷにっ”スケールも一緒に潰れる。

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

	# 頭（体と同色）。体の上端に載せる。
	var head := MeshInstance3D.new()
	head.name = "Head"
	var hm := SphereMesh.new()
	hm.radius = br * 0.95
	hm.height = br * 1.9
	head.mesh = hm
	var hmat := StandardMaterial3D.new()
	hmat.albedo_color = color
	hmat.roughness = 0.85
	head.material_override = hmat
	head.position = Vector3(0.0, half, 0.0)
	body.add_child(head)

	# 目 x2（前向き・こげ茶）。顔は点2つで十分“生きて”見える。
	var eyemat := StandardMaterial3D.new()
	eyemat.albedo_color = Color(0.12, 0.09, 0.08)
	for sx in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		var em := SphereMesh.new()
		em.radius = br * 0.20
		em.height = br * 0.40
		eye.mesh = em
		eye.material_override = eyemat
		eye.position = Vector3(br * 0.42 * sx, half + br * 0.16, br * 0.80)
		body.add_child(eye)

	# 鼻（ほんの少し明るい点）。あるだけで“顔”がぐっと決まる。
	var nose := MeshInstance3D.new()
	var nm := SphereMesh.new()
	nm.radius = br * 0.13
	nm.height = br * 0.26
	nose.mesh = nm
	var nmat := StandardMaterial3D.new()
	nmat.albedo_color = color.lightened(0.25)
	nose.material_override = nmat
	nose.position = Vector3(0.0, half - br * 0.02, br * 0.9)
	body.add_child(nose)
