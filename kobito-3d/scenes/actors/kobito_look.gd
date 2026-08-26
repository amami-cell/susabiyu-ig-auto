extends RefCounted
class_name KobitoLook
## カプセル1体型を“クレイ（粘土）風の人型の小人”に組み直す。
##
## 当たり判定のカプセル(body)は透明にして残し、見た目は人型パーツで作る。
## マット質感・白Tシャツ＋襟/袖の白トリム・半ズボン・ブーツ・耳。脚は長めで下半身が
## しっかり見える 4頭身くらい。顔はリアル寄り（白目＋虹彩＋瞳孔＋ハイライト・まぶた・
## 鼻筋/小鼻・上下くちびる）。家族ごとに髪型/髪色/目の色/体格が変わる（role/char_name）。

# --- 体つきの比率（half=カプセル半身, br=半径 を基準にする）---
const HEAD_R := 0.68
const HEAD_Y := 1.24
const CHEST_Y := 0.72
const WAIST_Y := 0.34
const SHOULDER_Y := 0.90
const SHOULDER_X := 0.7
const ARM_SPLAY := 0.16
const UPPER_ARM_H := 0.52
const FOREARM_H := 0.48
const ELBOW_BEND := 0.14
const HIP_Y := 0.04           # 股（脚の付け根）を高めに＝脚が長く見える
const HIP_X := 0.34
const THIGH_H := 0.58         # 太もも（長め）
const SHIN_H := 0.54          # すね（長め）
const KNEE_BEND := 0.08

# --- クレイ風の配色 ---
const SKIN := Color(0.98, 0.82, 0.71)
const SHORTS := Color(0.24, 0.27, 0.40)   # 紺の半ズボン
const TRIM := Color(0.97, 0.97, 0.95)     # 襟・袖口の白トリム
const PANTS_BLACK := Color(0.11, 0.11, 0.13)   # 黒の長ズボン（父）
const SWEATER := Color(0.86, 0.84, 0.78)       # 生成りのセーター（父）
const FUR := Color(0.66, 0.62, 0.54)           # フードのファー（父）
const HAIR_PALETTE := [
	Color(0.92, 0.66, 0.20),  # ブロンド/オレンジ
	Color(0.30, 0.19, 0.10),  # こげ茶
	Color(0.12, 0.10, 0.09),  # ほぼ黒
	Color(0.55, 0.36, 0.18),  # 明るい茶
]
const HAIR_WHITE := Color(0.9, 0.9, 0.88)
const EYE_PALETTE := [
	Color(0.28, 0.18, 0.10),  # 茶
	Color(0.14, 0.10, 0.08),  # こげ茶
	Color(0.22, 0.32, 0.22),  # 緑がかった茶
	Color(0.20, 0.30, 0.44),  # 青灰
]


## Web など軽い環境向けの“かわいい こけし人形風”の小人。部品を絞りつつ（体・頭・髪・目2・
## ほっぺ2＝約7部品）、髪と顔をつけて「顔なしの卵」に見えないようにする。フルの手続きクレイ
## (1体100部品超)は9人で固まる原因なので、こちらで軽さと“ちゃんと人に見える”を両立する。
static func decorate_simple(body: MeshInstance3D, color: Color, role: String = "child", char_name: String = "") -> void:
	var inv := StandardMaterial3D.new()
	inv.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	inv.albedo_color = Color(0, 0, 0, 0)
	body.material_override = inv

	var root := Node3D.new()
	root.name = "SimpleLook"
	body.add_child(root)

	var is_adult := role == "adult"

	# 体（家族色の服）。丸めのカプセルで“ぷっくり”＝かわいい。足元 y=-0.52。
	var torso := MeshInstance3D.new()
	var cap := CapsuleMesh.new()
	cap.radius = 0.36
	cap.height = 1.0
	cap.radial_segments = 10
	cap.rings = 3
	torso.mesh = cap
	torso.material_override = _flat(color, 0.95)
	torso.position = Vector3(0.0, 0.12, 0.0)
	root.add_child(torso)

	# 頭（肌色）＝少し大きめでチビ可愛く
	var head := MeshInstance3D.new()
	var sph := SphereMesh.new()
	sph.radius = 0.42
	sph.height = 0.84
	sph.radial_segments = 12
	sph.rings = 7
	head.mesh = sph
	head.material_override = _flat(SKIN, 0.85)
	head.position = Vector3(0.0, 1.02, 0.0)
	root.add_child(head)

	# 髪（こげ茶）＝頭のうしろ・上を覆うキャップ。顔(前=-Z)は出す。これで後ろ姿も“人”に見える。
	var hair := MeshInstance3D.new()
	var hs := SphereMesh.new()
	hs.radius = 0.46
	hs.height = 0.92
	hs.radial_segments = 12
	hs.rings = 7
	hair.mesh = hs
	var hair_col: Color = HAIR_WHITE if char_name == "おじい" else HAIR_PALETTE[abs(char_name.hash()) % HAIR_PALETTE.size()]
	hair.material_override = _flat(hair_col, 0.8)
	# うしろ・上へ寄せて、前おでこと顔を出す。大人は少し長めに下げる。
	hair.position = Vector3(0.0, 1.06 + (0.0 if is_adult else 0.02), 0.12)
	hair.scale = Vector3(1.0, 1.02 if is_adult else 0.92, 1.0)
	root.add_child(hair)

	# 目（黒い点2つ）
	var emat := _flat(Color(0.12, 0.1, 0.1), 0.5)
	for sx in [-0.16, 0.16]:
		var eye := MeshInstance3D.new()
		var e := SphereMesh.new()
		e.radius = 0.08
		e.height = 0.16
		e.radial_segments = 6
		e.rings = 4
		eye.mesh = e
		eye.material_override = emat
		eye.position = Vector3(sx, 1.06, -0.35)
		root.add_child(eye)

	# ほっぺ（桃色）2つ＝ぐっと可愛くなる
	var cmat := _flat(Color(1.0, 0.66, 0.68), 0.7)
	for cx in [-0.26, 0.26]:
		var cheek := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = 0.08
		cm.height = 0.16
		cm.radial_segments = 6
		cm.rings = 4
		cheek.mesh = cm
		cheek.material_override = cmat
		cheek.position = Vector3(cx, 0.96, -0.3)
		cheek.scale = Vector3(1.0, 0.7, 0.5)
		root.add_child(cheek)


## 単色マット材質を1つ作る小ヘルパ（簡易NPC用）。
static func _flat(col: Color, rough: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	return m


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
	var female := _is_female(char_name)
	var dad := _is_dad(char_name)
	var jacket: Color = color.darkened(0.32)
	var shoulder_x := SHOULDER_X * (1.16 if adult else 1.0)
	var chest_wide := 1.28 if adult else 1.16
	var boots := color.darkened(0.18)

	# 当たり判定のカプセルは透明化
	var inv := StandardMaterial3D.new()
	inv.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	inv.albedo_color = Color(0, 0, 0, 0)
	body.material_override = inv

	if dad:
		# --- 父：もこもこフード付きパーカー＋生成りセーター（Zepeto風の私服）---
		# セーター（前中央にのぞく）＝ジャケットの内側
		_cap(body, SWEATER, br * 0.44, half * 0.6,
			Vector3(0.0, half * (CHEST_Y - 0.04), br * 0.18), Vector3(1.0, 1.0, 0.7))
		# パーカー本体（少し太め）
		var chest := _cap(body, jacket, br * 0.58, half * 0.72,
			Vector3(0.0, half * CHEST_Y, 0.0), Vector3(chest_wide * 1.06, 1.0, 0.74))
		chest.name = "Torso"
		_cap(body, jacket, br * 0.52, half * 0.48,
			Vector3(0.0, half * WAIST_Y, 0.0), Vector3(1.12, 1.0, 0.72))
		# ファーの襟（もこもこ）
		_ring(body, FUR, br * 0.28, br * 0.5, Vector3(0.0, half * 1.0, 0.0), Vector3(1.15, 0.9, 1.15))
		# ファスナーの線
		_cap(body, jacket.darkened(0.35), br * 0.045, half * 0.7,
			Vector3(0.0, half * 0.44, br * 0.46), Vector3(1.0, 1.0, 0.5))
		# ポケット2つ
		for sx in [-1.0, 1.0]:
			_cap(body, jacket.darkened(0.12), br * 0.16, half * 0.22,
				Vector3(br * 0.36 * sx, half * 0.14, br * 0.42), Vector3(1.3, 1.0, 0.4))
	else:
		# --- 胴：Tシャツ（胸→腰のなだらかテーパー・前後に薄い）---
		var chest := _cap(body, color, br * 0.52, half * 0.66,
			Vector3(0.0, half * CHEST_Y, 0.0), Vector3(chest_wide, 1.0, 0.66))
		chest.name = "Torso"
		_cap(body, color, br * 0.46, half * 0.44,
			Vector3(0.0, half * WAIST_Y, 0.0), Vector3(1.05, 1.0, 0.64))
		# 襟（首もとの白トリム）
		_ring(body, TRIM, br * 0.26, br * 0.36, Vector3(0.0, half * 1.0, 0.0))
		# --- 半ズボン（腰）---
		_cap(body, SHORTS, br * 0.46, half * 0.36,
			Vector3(0.0, half * (HIP_Y + 0.06), 0.0), Vector3(1.12, 0.95, 0.68))
		# 女性（母）はワンピース風スカート＝シャツ色。短めにして脚を見せる。
		if female:
			var skirt := MeshInstance3D.new()
			var skm := CylinderMesh.new()
			skm.top_radius = br * 0.5
			skm.bottom_radius = br * 0.9
			skm.height = half * 0.42
			skm.radial_segments = 14
			skirt.mesh = skm
			skirt.material_override = _clay(color)
			skirt.position = Vector3(0.0, half * (HIP_Y + 0.02), 0.0)
			body.add_child(skirt)

	# --- 頭 ＝肌色 ---
	var head := MeshInstance3D.new()
	head.name = "Head"
	var hm := SphereMesh.new()
	hm.radius = head_r
	hm.height = head_r * 2.0
	head.mesh = hm
	head.material_override = _skin_mat(SKIN)
	head.position = Vector3(0.0, half * HEAD_Y, 0.0)
	head.scale = Vector3(0.96, 1.06, 0.98)
	body.add_child(head)

	# あご（丸い頭を崩して人らしい輪郭に）
	_ball(head, SKIN, head_r * 0.34, Vector3(0.0, -head_r * 0.62, head_r * 0.52),
		Vector3(0.95, 0.7, 0.72), _skin_mat(SKIN))

	# 耳（左右・内側の影つき）
	for sx in [-1.0, 1.0]:
		var ear := _ball(head, SKIN, head_r * 0.22, Vector3(head_r * 0.97 * sx, 0.0, -head_r * 0.05),
			Vector3(0.6, 1.0, 0.8), _skin_mat(SKIN))
		_ball(ear, SKIN.darkened(0.18), head_r * 0.12, Vector3(head_r * 0.06 * sx, 0.0, head_r * 0.14))

	# 首
	var neck := MeshInstance3D.new()
	var ncm := CylinderMesh.new()
	ncm.top_radius = br * 0.2
	ncm.bottom_radius = br * 0.24
	ncm.height = half * 0.18
	neck.mesh = ncm
	neck.material_override = _skin_mat(SKIN.darkened(0.05))
	neck.position = Vector3(0.0, half * (HEAD_Y - 0.18), 0.0)
	body.add_child(neck)

	var style := _hair_style(char_name, role)
	var hair_col := _hair_color(char_name, role)
	var eye_col: Color = EYE_PALETTE[absi(char_name.hash()) % EYE_PALETTE.size()]
	var beard := "none"
	if style == "elder":
		beard = "full"
	elif dad:
		beard = "goatee"
	elif adult and not female:
		beard = "stubble"
	_build_face(head, head_r, hair_col, eye_col, style, adult, beard)

	# --- 腕・脚 ---（父は長袖パーカー＝ジャケット色、脚は黒パンツ＋スニーカー）
	var sleeve: Color = jacket if dad else color
	var arm_l := _make_arm(body, sleeve, br, half, -1.0, shoulder_x, dad)
	var arm_r := _make_arm(body, sleeve, br, half, 1.0, shoulder_x, dad)
	var legs: Array[Node3D] = []
	legs.append(_make_leg(body, boots, br, half, -1.0, dad))
	legs.append(_make_leg(body, boots, br, half, 1.0, dad))

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


## 父（夫）＝Zepeto風の私服（パーカー＋長ズボン＋スニーカー＋くるくる髪＋あごひげ）。
static func _is_dad(char_name: String) -> bool:
	for k in ["父", "夫", "パパ", "とう"]:
		if k in char_name:
			return true
	return false


static func _hair_style(char_name: String, role: String) -> String:
	if "じい" in char_name or "祖" in char_name or "翁" in char_name:
		return "elder"
	if _is_dad(char_name):
		return "curly"
	if _is_female(char_name):
		return "long"
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
	if _is_dad(char_name):
		return Color(0.17, 0.12, 0.09)   # 父＝黒に近いこげ茶（参考のくるくる）
	return HAIR_PALETTE[absi(char_name.hash()) % HAIR_PALETTE.size()]


# ---- パーツ生成ヘルパ（すべてクレイ質感）----

static func _cap(parent: Node3D, c: Color, radius: float, height: float, pos: Vector3, sc: Vector3 = Vector3.ONE, mat: StandardMaterial3D = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := CapsuleMesh.new()
	m.radius = radius
	m.height = height
	mi.mesh = m
	mi.material_override = mat if mat != null else _clay(c)
	mi.position = pos
	mi.scale = sc
	parent.add_child(mi)
	return mi


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


static func _ball(parent: Node3D, c: Color, r: float, pos: Vector3, sc: Vector3 = Vector3.ONE, mat: StandardMaterial3D = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * 2.0
	mi.mesh = sm
	mi.material_override = mat if mat != null else _clay(c)
	mi.position = pos
	mi.scale = sc
	parent.add_child(mi)
	return mi


## 肌の微細な凹凸（毛穴風）ノーマルマップ。全機種で効く表面ディテール（1枚を共有）。
static var _skin_normal: Texture2D = null
static func _skin_normal_tex() -> Texture2D:
	if _skin_normal == null:
		var n := FastNoiseLite.new()
		n.frequency = 0.85
		n.fractal_octaves = 3
		var t := NoiseTexture2D.new()
		t.width = 128
		t.height = 128
		t.seamless = true
		t.as_normal_map = true
		t.bump_strength = 0.5
		t.noise = n
		_skin_normal = t
	return _skin_normal


## 肌：表面下散乱(SSS)＋毛穴風の微細ノーマル＋リム。やわらかい本物っぽい肌質感。
## （SSSはForward+のPCきれい版で最大。rim/spec/ノーマルはスマホ・webでも効く）
static func _skin_mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.5
	m.metallic_specular = 0.42
	m.subsurf_scatter_enabled = true
	m.subsurf_scatter_strength = 0.4
	m.rim_enabled = true
	m.rim = 0.3
	m.rim_tint = 0.4
	m.normal_enabled = true
	m.normal_texture = _skin_normal_tex()
	m.normal_scale = 0.22
	m.uv1_scale = Vector3(5.0, 5.0, 5.0)
	return m


## 濡れた質感（目・くちびる）：クリアコートの照り＋低ラフネス。
static func _wet_mat(c: Color, rough: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic_specular = 0.6
	m.clearcoat_enabled = true
	m.clearcoat = 0.9
	m.clearcoat_roughness = 0.04
	return m


## 髪：絹の照り（シーン）＋適度なラフネス。
static func _hair_mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.48
	m.metallic_specular = 0.45
	m.rim_enabled = true
	m.rim = 0.5
	m.rim_tint = 0.2
	return m


## 顔（髪＋眉＋リアルな目＋鼻筋/小鼻＋上下くちびる）。hr=頭の半径。
static func _build_face(head: MeshInstance3D, hr: float, hair_col: Color, eye_col: Color, style: String, adult: bool, beard: String) -> void:
	_face_eyes = []
	_build_hair(head, hr, hair_col, style)

	# 眉（毛束＝リアルな反り）
	var brow_mat := _hair_mat(hair_col.darkened(0.05))
	for sx in [-1.0, 1.0]:
		for i in 4:
			var t := float(i) / 3.0
			var strand := MeshInstance3D.new()
			var cm := CapsuleMesh.new()
			cm.radius = hr * 0.022
			cm.height = hr * 0.13
			strand.mesh = cm
			strand.material_override = brow_mat
			strand.position = Vector3(hr * (0.26 + 0.12 * t) * sx, hr * (0.34 + 0.05 * t), hr * 0.9)
			strand.rotation = Vector3(deg_to_rad(90.0), 0.0, (-0.35 - 0.25 * t) * sx)
			head.add_child(strand)

	# 目（白目＋虹彩＋瞳孔＋二重キャッチライト＋まつげ＋上下まぶた）。少し小さめ＝大人っぽい。
	# まばたきは目の根＝白目をつぶす（子ノードごと閉じる）。
	var eye_r := hr * (0.17 if adult else 0.2)
	var skin_face := _skin_mat(SKIN)
	for sx in [-1.0, 1.0]:
		var eye := _ball(head, Color(0.95, 0.94, 0.93), eye_r,
			Vector3(hr * 0.4 * sx, hr * 0.12, hr * 0.82), Vector3(1.12, 0.72, 0.5),
			_wet_mat(Color(0.95, 0.94, 0.93), 0.16))
		eye.name = "Eye%s" % ("L" if sx < 0 else "R")
		_face_eyes.append(eye)
		# リムバルリング（虹彩の外周を暗く＝生きた目）
		_ball(eye, eye_col.darkened(0.6), eye_r * 0.74, Vector3(0.0, 0.0, eye_r * 0.48), Vector3(1.0, 1.12, 0.66))
		# 虹彩（濡れた質感・目の色）
		var iris := _ball(eye, eye_col, eye_r * 0.66, Vector3(0.0, 0.0, eye_r * 0.55),
			Vector3(1.0, 1.1, 0.7), _wet_mat(eye_col, 0.12))
		# 瞳孔
		_ball(iris, Color(0.04, 0.04, 0.05), eye_r * 0.42, Vector3(0.0, 0.0, eye_r * 0.5))
		# キャッチライト（大＋小）＝生きた目
		var hi := _ball(eye, Color(1, 1, 1), eye_r * 0.22, Vector3(eye_r * 0.32, eye_r * 0.42, eye_r * 0.62))
		var him := hi.material_override as StandardMaterial3D
		him.emission_enabled = true
		him.emission = Color(1, 1, 1)
		him.emission_energy_multiplier = 0.7
		_ball(eye, Color(0.9, 0.95, 1.0), eye_r * 0.1, Vector3(-eye_r * 0.28, -eye_r * 0.22, eye_r * 0.6))
		# まつげ（上ふち・こげ茶）＝目の子＝まばたきで一緒に閉じる
		_ball(eye, Color(0.09, 0.06, 0.06), eye_r * 0.9, Vector3(0.0, eye_r * 0.5, eye_r * 0.32), Vector3(1.35, 0.16, 0.6))
		# 上まぶた（肌）
		_ball(eye, SKIN, eye_r * 1.05, Vector3(0.0, eye_r * 0.66, -eye_r * 0.05), Vector3(1.15, 0.62, 0.72), skin_face)
		# 下まぶたのふくらみ（涙袋）
		_ball(head, SKIN.darkened(0.03), eye_r * 0.5, Vector3(hr * 0.4 * sx, hr * 0.02, hr * 0.86),
			Vector3(2.0, 0.5, 0.6), _skin_mat(SKIN.darkened(0.03)))

	# ほっぺ（控えめ）
	for sx in [-1.0, 1.0]:
		var cheek := MeshInstance3D.new()
		var cm := SphereMesh.new()
		cm.radius = hr * 0.13
		cm.height = hr * 0.14
		cheek.mesh = cm
		var chm := _skin_mat(Color(0.98, 0.66, 0.62))
		chm.subsurf_scatter_strength = 0.5
		cheek.material_override = chm
		cheek.position = Vector3(hr * 0.58 * sx, -hr * 0.14, hr * 0.78)
		head.add_child(cheek)

	# 鼻（鼻筋＋丸い先＋小鼻＋穴）＝肌質感
	_ball(head, SKIN, hr * 0.08, Vector3(0.0, hr * 0.02, hr * 0.94), Vector3(0.55, 1.6, 0.8), _skin_mat(SKIN))
	_ball(head, SKIN, hr * 0.1, Vector3(0.0, -hr * 0.12, hr * 0.99), Vector3(1.0, 0.85, 0.9), _skin_mat(SKIN))
	for sx in [-1.0, 1.0]:
		_ball(head, SKIN.darkened(0.06), hr * 0.06, Vector3(hr * 0.1 * sx, -hr * 0.14, hr * 0.95),
			Vector3(0.8, 0.9, 0.9), _skin_mat(SKIN.darkened(0.06)))       # 小鼻
		_ball(head, Color(0.42, 0.3, 0.27), hr * 0.026, Vector3(hr * 0.07 * sx, -hr * 0.17, hr * 1.0))  # 穴

	# 口（上下くちびる＝濡れた質感＋口角上げ＋口の線）
	_ball(head, Color(0.4, 0.2, 0.2), hr * 0.09, Vector3(0.0, -hr * 0.35, hr * 0.93), Vector3(1.6, 0.08, 0.3))  # 口の線
	_ball(head, Color(0.76, 0.4, 0.4), hr * 0.1, Vector3(0.0, -hr * 0.32, hr * 0.9), Vector3(1.4, 0.24, 0.5),
		_wet_mat(Color(0.76, 0.4, 0.4), 0.35))
	_ball(head, Color(0.85, 0.5, 0.48), hr * 0.12, Vector3(0.0, -hr * 0.39, hr * 0.9), Vector3(1.5, 0.32, 0.55),
		_wet_mat(Color(0.85, 0.5, 0.48), 0.35))
	for sx in [-1.0, 1.0]:
		_ball(head, Color(0.7, 0.36, 0.36), hr * 0.045, Vector3(hr * 0.2 * sx, -hr * 0.33, hr * 0.91))

	# ひげ：full=あごひげ(白/お年寄り), goatee=ヤギひげ+口ひげ(父), stubble=無精ひげ
	if beard == "full":
		_ball(head, HAIR_WHITE, hr * 0.5, Vector3(0.0, -hr * 0.58, hr * 0.5), Vector3(0.9, 0.9, 0.55))
	elif beard == "goatee":
		var gcol := Color(0.32, 0.22, 0.13)
		_ball(head, gcol, hr * 0.2, Vector3(0.0, -hr * 0.6, hr * 0.66), Vector3(1.0, 1.15, 0.7), _hair_mat(gcol))    # あご
		_ball(head, gcol, hr * 0.12, Vector3(0.0, -hr * 0.28, hr * 0.94), Vector3(1.9, 0.5, 0.6), _hair_mat(gcol))   # 口ひげ
	elif beard == "stubble":
		_ball(head, SKIN.darkened(0.22), hr * 0.44, Vector3(0.0, -hr * 0.38, hr * 0.66), Vector3(0.92, 0.5, 0.5))


## 髪型（髪色つき・クレイ質感）を頭に付ける。
static func _build_hair(head: MeshInstance3D, hr: float, hair_col: Color, style: String) -> void:
	var cap := MeshInstance3D.new()
	cap.name = "Hair"
	var capm := SphereMesh.new()
	capm.radius = hr * 1.0
	capm.height = hr * 2.0
	cap.mesh = capm
	cap.material_override = _hair_mat(hair_col)
	if style == "sprout":
		cap.scale = Vector3(1.02, 0.62, 1.02)
		cap.position = Vector3(0.0, hr * 0.44, -hr * 0.06)
	else:
		cap.scale = Vector3(1.04, 0.86, 1.04)
		cap.position = Vector3(0.0, hr * 0.34, -hr * 0.14)
	head.add_child(cap)

	if style != "sprout" and style != "elder" and style != "curly":
		for i in 3:
			var bang := MeshInstance3D.new()
			var bm := SphereMesh.new()
			bm.radius = hr * 0.26
			bm.height = hr * 0.52
			bang.mesh = bm
			bang.material_override = _hair_mat(hair_col)
			bang.scale = Vector3(0.9, 0.7, 0.6)
			bang.position = Vector3(hr * (0.4 * (i - 1)), hr * 0.52, hr * 0.64)
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
				sp.material_override = _hair_mat(hair_col)
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
				side.material_override = _hair_mat(hair_col)
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
				bun.material_override = _hair_mat(hair_col)
				bun.position = Vector3(hr * 1.0 * sx, hr * 0.22, -hr * 0.08)
				head.add_child(bun)
		"curly":
			# くるくる＝小さな球を頭頂〜前に散らす（黄金角で均等・決定的に）
			for i in 16:
				var a := float(i) * 2.399963
				var rad := hr * (0.28 + 0.52 * fmod(float(i) * 0.137, 1.0))
				var cx := cos(a) * rad
				var cz := sin(a) * rad * 0.85 - hr * 0.08
				var cy := hr * (0.5 + 0.32 * fmod(float(i) * 0.29, 1.0))
				var curl := _ball(head, hair_col, hr * 0.21, Vector3(cx, cy, cz), Vector3.ONE, _hair_mat(hair_col))
				curl.scale = Vector3(1.0, 1.0, 0.9)
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
static func _make_arm(body: MeshInstance3D, color: Color, br: float, half: float, side: float, shoulder_x: float, dad: bool = false) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Arm%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * shoulder_x * side, half * SHOULDER_Y, 0.0)
	body.add_child(pivot)

	var lean := Node3D.new()
	lean.name = "Lean"
	lean.rotation.z = ARM_SPLAY * side
	pivot.add_child(lean)

	# 上腕（父はパーカー袖で少し太め）
	_cap(lean, color, br * (0.23 if dad else 0.19), half * UPPER_ARM_H * 0.85,
		Vector3(0.0, half * UPPER_ARM_H * -0.42, 0.0))
	if not dad:
		_ring(lean, TRIM, br * 0.16, br * 0.24, Vector3(0.0, half * -UPPER_ARM_H * 0.78, 0.0))

	var elbow := Node3D.new()
	elbow.name = "Elbow"
	elbow.position = Vector3(0.0, half * -UPPER_ARM_H, 0.0)
	elbow.rotation.x = ELBOW_BEND
	lean.add_child(elbow)

	# 前腕＝父はパーカー袖（長袖）、子/母は肌（半袖）
	if dad:
		_cap(elbow, color, br * 0.2, half * FOREARM_H, Vector3(0.0, half * FOREARM_H * -0.5, 0.0))
	else:
		_cap(elbow, SKIN, br * 0.16, half * FOREARM_H,
			Vector3(0.0, half * FOREARM_H * -0.5, 0.0), Vector3.ONE, _skin_mat(SKIN))

	var hand := Node3D.new()
	hand.name = "Hand"
	hand.position = Vector3(0.0, half * -FOREARM_H, 0.0)
	elbow.add_child(hand)
	_ball(hand, SKIN.lightened(0.03), br * 0.18, Vector3.ZERO, Vector3.ONE, _skin_mat(SKIN.lightened(0.03)))
	return pivot


## 脚：股ピボット→太もも→ひざ→すね→足。子/母＝素肌＋ブーツ、父＝黒の長ズボン＋スニーカー。
static func _make_leg(body: MeshInstance3D, boots: Color, br: float, half: float, side: float, dad: bool = false) -> Node3D:
	var pivot := Node3D.new()
	pivot.name = "Leg%s" % ("L" if side < 0 else "R")
	pivot.position = Vector3(br * HIP_X * side, half * HIP_Y, 0.0)
	body.add_child(pivot)

	# 太もも：父は黒パンツ（少し太め）、他は素肌
	if dad:
		_cap(pivot, PANTS_BLACK, br * 0.26, half * THIGH_H, Vector3(0.0, half * THIGH_H * -0.5, 0.0))
	else:
		_cap(pivot, SKIN, br * 0.22, half * THIGH_H,
			Vector3(0.0, half * THIGH_H * -0.5, 0.0), Vector3.ONE, _skin_mat(SKIN))

	var knee := Node3D.new()
	knee.name = "Knee"
	knee.position = Vector3(0.0, half * -THIGH_H, 0.0)
	knee.rotation.x = KNEE_BEND
	pivot.add_child(knee)

	# すね：父は黒パンツ、他はブーツ色
	_cap(knee, PANTS_BLACK if dad else boots, br * (0.24 if dad else 0.21), half * SHIN_H,
		Vector3(0.0, half * SHIN_H * -0.5, 0.0))

	if dad:
		# スニーカー（黒本体＋白ソール＋白いつま先）
		var shoe := MeshInstance3D.new()
		var shm := BoxMesh.new()
		shm.size = Vector3(br * 0.44, br * 0.28, br * 0.86)
		shoe.mesh = shm
		shoe.material_override = _clay(Color(0.1, 0.1, 0.12))
		shoe.position = Vector3(0.0, half * -SHIN_H + br * 0.04, br * 0.2)
		knee.add_child(shoe)
		var sole := MeshInstance3D.new()
		var som := BoxMesh.new()
		som.size = Vector3(br * 0.48, br * 0.12, br * 0.92)
		sole.mesh = som
		sole.material_override = _clay(Color(0.95, 0.95, 0.93))
		sole.position = Vector3(0.0, half * -SHIN_H - br * 0.08, br * 0.22)
		knee.add_child(sole)
	else:
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
