extends Node3D
class_name KobitoModel
## 本物のリグ付き3Dモデル（assets/human_base.glb）で小人を表示する差し替え版。
##
## 使い方：当たり判定カプセル(body=MeshInstance3D)の子として add_child し、setup() を呼ぶ。
## - body の見た目は透明化し、代わりにスケルトンアニメ付きの本物モデルを立てる。
## - 移動速度で Idle ⇔ Walking を自動で切り替える（全員の画面で・非同期の見た目）。
## - 色替え＝家族の色でモデルをうっすら色付け（“できる範囲の作り分け”）。大きさは body_scale。
## モデルが無い環境ではプレイヤー/子側がフォールバックして手続きのクレイ小人を使う。

const MODEL_PATH := "res://assets/human_base.glb"
const BASE_SCALE := 0.052       # HVGirl の素の大きさ→小人サイズへ
const FEET_Y := -0.52           # body ローカルでの足元（クレイ版と揃える）
const WALK_SPEED_ON := 0.4      # この速さ以上で歩きアニメ
# ディズニー/ジブリ寄り＝アニメ風の誇張をやめ、自然な頭身（頭ほんの少し大きめ）。
const HEAD_SCALE := 1.32        # 頭をほんの少しだけ大きく（あたたかみ・ボブルヘッドにしない）
const HAND_SCALE := 1.1
const FOOT_SCALE := 1.1

var _actor: Object = null
var _ap: AnimationPlayer = null
var _walking := false
var _skel: Skeleton3D = null
var _cute_bones: Array = []     # [[bone_idx, scale], ...] 毎フレーム再適用してチビ体型を保つ
var _face_mi: MeshInstance3D = null   # 表情モーフ(ブレンドシェイプ)を持つ顔メッシュ（あれば）
var _blink_t := 3.0


static func has_model() -> bool:
	return ResourceLoader.exists(MODEL_PATH)


func setup(body: MeshInstance3D, color: Color, _role: String = "child", _char_name: String = "") -> void:
	_actor = body.get_parent()

	# 当たり判定カプセルの見た目は消す（モデルが見た目を担う）
	var inv := StandardMaterial3D.new()
	inv.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	inv.albedo_color = Color(0, 0, 0, 0)
	body.material_override = inv

	var packed: PackedScene = load(MODEL_PATH)
	if packed == null:
		return
	var model: Node3D = packed.instantiate()
	add_child(model)
	model.scale = Vector3.ONE * BASE_SCALE
	model.position = Vector3(0.0, FEET_Y, 0.0)
	model.rotation.y = PI            # 追従カメラへ正面を向ける（必要なら調整）

	# 家族の色でうっすら色付け（服・肌をまとめて軽くトーン）
	_tint(model, color)

	# チビ化：頭を大きく・手足も少し大きく（可愛い3頭身）。毎フレーム再適用して保つ。
	_skel = model.find_child("Skeleton3D", true, false)
	if _skel != null:
		_add_cute_bone("mixamorig_Head", HEAD_SCALE)
		_add_cute_bone("mixamorig_LeftHand", HAND_SCALE)
		_add_cute_bone("mixamorig_RightHand", HAND_SCALE)
		_add_cute_bone("mixamorig_LeftFoot", FOOT_SCALE)
		_add_cute_bone("mixamorig_RightFoot", FOOT_SCALE)
		_apply_cute()
		# 表情モーフ(ブレンドシェイプ)付きモデルなら、その顔メッシュを掴んでモーフで表情管理する。
		# 無ければ従来どおり素の顔（浮いた貼り付けはしない）。
		_face_mi = _find_morph_mesh(model)
		if _face_mi == null:
			_build_expression()
		set_expression("none")

	_ap = model.find_child("AnimationPlayer", true, false)
	if _ap != null and _ap.has_animation("Idle"):
		_ap.play("Idle")


func _add_cute_bone(bone_name: String, s: float) -> void:
	var idx := _skel.find_bone(bone_name)
	if idx >= 0:
		_cute_bones.append([idx, s])


# ---- 表情モーフ（ARKit系ブレンドシェイプ）で表情管理。モーフ付きモデルを入れると有効化 ----

func _find_morph_mesh(root: Node) -> MeshInstance3D:
	for n in root.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		if mi.mesh != null and mi.mesh.get_blend_shape_count() > 0:
			return mi
	return null


func _set_morph(bs_name: String, v: float) -> void:
	if _face_mi == null:
		return
	var idx := _face_mi.find_blend_shape_by_name(bs_name)
	if idx >= 0:
		_face_mi.set_blend_shape_value(idx, v)


## ARKit系モーフ名の組み合わせで表情を作る（RPM/VRoid等の標準名）。
func _apply_morph(name: String) -> void:
	for nm in ["mouthSmileLeft", "mouthSmileRight", "mouthFrownLeft", "mouthFrownRight",
			"jawOpen", "browInnerUp", "browDownLeft", "browDownRight", "eyeWideLeft", "eyeWideRight"]:
		_set_morph(nm, 0.0)
	match name:
		"happy":
			_set_morph("mouthSmileLeft", 0.85)
			_set_morph("mouthSmileRight", 0.85)
		"sad":
			_set_morph("mouthFrownLeft", 0.6)
			_set_morph("mouthFrownRight", 0.6)
			_set_morph("browInnerUp", 0.7)
		"surprised":
			_set_morph("jawOpen", 0.45)
			_set_morph("eyeWideLeft", 0.6)
			_set_morph("eyeWideRight", 0.6)
			_set_morph("browInnerUp", 0.7)
		"angry":
			_set_morph("browDownLeft", 0.7)
			_set_morph("browDownRight", 0.7)
			_set_morph("mouthFrownLeft", 0.3)
			_set_morph("mouthFrownRight", 0.3)
		_:
			pass   # none / neutral は全部 0（素の顔）


func _do_blink() -> void:
	_set_morph("eyeBlinkLeft", 1.0)
	_set_morph("eyeBlinkRight", 1.0)
	get_tree().create_timer(0.12).timeout.connect(func() -> void:
		if is_instance_valid(self):
			_set_morph("eyeBlinkLeft", 0.0)
			_set_morph("eyeBlinkRight", 0.0))


# ---- 表情管理（眉＋口のフラットな線を切替。トゥーンに馴染む控えめな表情）----

var _brows: Array = []          # [brow_l, brow_r]
var _mouth_mid: MeshInstance3D = null
var _mouth_l: MeshInstance3D = null
var _mouth_r: MeshInstance3D = null
var _mouth_o: MeshInstance3D = null
var _eye_c := Vector3.ZERO      # 目の高さ（表情の基準）
var _expression := "happy"


func _build_expression() -> void:
	var hidx := _skel.find_bone("mixamorig_Head")
	if hidx < 0:
		return
	var hc: Vector3 = to_local((_skel.global_transform * _skel.get_bone_global_pose(hidx)).origin)
	_eye_c = hc + Vector3(0.0, 0.19, -0.14)
	var brow_y := hc + Vector3(0.0, 0.24, -0.14)
	var mouth_c := hc + Vector3(0.0, 0.06, -0.15)
	# 眉（細い暗い線）
	for sx in [-1.0, 1.0]:
		var b := _mk_box(Vector3(0.09, 0.018, 0.02), brow_y + Vector3(0.075 * sx, 0, 0))
		_brows.append(b)
	# 口（中央の線＋左右の口角＋おどろき用のまる）
	_mouth_mid = _mk_box(Vector3(0.1, 0.02, 0.02), mouth_c)
	_mouth_l = _mk_box(Vector3(0.03, 0.02, 0.02), mouth_c + Vector3(-0.06, 0.02, 0))
	_mouth_r = _mk_box(Vector3(0.03, 0.02, 0.02), mouth_c + Vector3(0.06, 0.02, 0))
	_mouth_o = _mk_ball(0.035, mouth_c, Vector3(1.0, 1.2, 0.5))


## 表情を切り替える：none（素の顔）/ happy / neutral / sad / surprised / angry。
## 表情モーフ付きモデルならモーフで、無ければ眉/口マーク（既定は none で非表示）で。
func set_expression(name: String) -> void:
	_expression = name
	if _face_mi != null:
		_apply_morph(name)
		return
	if _brows.size() < 2 or _mouth_mid == null:
		return
	# none＝すべて隠してモデル本来の顔にする
	var show := name != "none"
	for b in _brows:
		(b as MeshInstance3D).visible = show
	_mouth_mid.visible = show
	_mouth_l.visible = show
	_mouth_r.visible = show
	_mouth_o.visible = false
	if not show:
		return
	var bl: MeshInstance3D = _brows[0]   # 左（x<0）
	var br: MeshInstance3D = _brows[1]   # 右（x>0）
	var corner_y := 0.02      # 口角の上下（＋で笑顔）
	var brow_dy := 0.0        # 眉の上下
	var brow_inner := 0.0     # 眉の内側の傾き（＋で内側が上がる＝困り眉）
	match name:
		"happy":
			corner_y = 0.03
			brow_dy = 0.0
		"neutral":
			corner_y = 0.0
		"sad":
			corner_y = -0.03
			brow_inner = 0.5
			brow_dy = 0.01
		"surprised":
			_mouth_mid.visible = false
			_mouth_o.visible = true
			brow_dy = 0.05
		"angry":
			corner_y = -0.01
			brow_inner = -0.6
			brow_dy = -0.02
	# 眉：内側の傾き＝左右で符号反転（内側＝中央寄り）
	bl.rotation.z = -brow_inner
	br.rotation.z = brow_inner
	bl.position.y = _eye_c.y + 0.05 + brow_dy
	br.position.y = _eye_c.y + 0.05 + brow_dy
	# 口角
	_mouth_l.position.y = _mouth_mid.position.y + corner_y
	_mouth_r.position.y = _mouth_mid.position.y + corner_y


func _mk_box(size: Vector3, pos: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = _face_line_mat()
	mi.position = pos
	add_child(mi)
	return mi


func _mk_ball(r: float, pos: Vector3, sc: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * 2.0
	mi.mesh = sm
	mi.material_override = _face_line_mat()
	mi.position = pos
	mi.scale = sc
	add_child(mi)
	return mi


func _face_line_mat() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(0.16, 0.12, 0.12)   # 暗い線（真っ黒すぎない）
	return m


func _apply_cute() -> void:
	for pair in _cute_bones:
		_skel.set_bone_pose_scale(pair[0], Vector3.ONE * pair[1])


func _tint(root: Node, color: Color) -> void:
	# スキンメッシュの材質を複製して、家族色を薄く混ぜる（元の質感は残す）。
	for n in root.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		var surfaces := mi.mesh.get_surface_count() if mi.mesh != null else 0
		for s in surfaces:
			var base := mi.get_active_material(s)
			if base == null:
				continue
			var m := base.duplicate() as BaseMaterial3D
			if m == null:
				continue
			# 家族色は“ごく薄く”混ぜるだけ＝肌が緑っぽくならないように
			m.albedo_color = m.albedo_color.lerp(color, 0.12)
			m.roughness = maxf(m.roughness, 0.7)   # つや消し＝やわらか
			# トゥーン（セル）シェーディング＝陰影が段階になる絵づくり（ジブリ/ディズニー寄り）
			m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
			m.specular_mode = BaseMaterial3D.SPECULAR_TOON
			m.rim_enabled = true
			m.rim = 0.35
			m.rim_tint = 0.3
			# 黒い輪郭線（裏面を膨らませて黒く塗る）。Vulkan/Mobile・PCきれい版で表示。
			var ol := StandardMaterial3D.new()
			ol.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
			ol.albedo_color = Color(0.08, 0.07, 0.08)
			ol.cull_mode = BaseMaterial3D.CULL_FRONT
			ol.grow = true
			ol.grow_amount = 0.16
			m.next_pass = ol
			mi.set_surface_override_material(s, m)


func _process(delta: float) -> void:
	# アニメが上書きしても“チビ体型”を保つため毎フレーム再適用（スケールはアニメが触らない）
	if _skel != null:
		_apply_cute()
	# 表情モーフ付きモデルなら、時々まばたき（自然さ）
	if _face_mi != null:
		_blink_t -= delta
		if _blink_t <= 0.0:
			_blink_t = randf_range(2.5, 5.0)
			_do_blink()
	if _actor == null or _ap == null:
		return
	var speed := 0.0
	var v = _actor.get("velocity")
	if v is Vector3:
		speed = Vector2(v.x, v.z).length()
	var want_walk := speed > WALK_SPEED_ON
	if want_walk != _walking:
		_walking = want_walk
		var anim := "Walking" if want_walk else "Idle"
		if _ap.has_animation(anim):
			_ap.play(anim, 0.2)
