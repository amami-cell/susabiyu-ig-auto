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
		# アニメ風の大きな目の貼り付けは廃止（ディズニー/ジブリ寄り＝モデル本来の顔を活かす）

	_ap = model.find_child("AnimationPlayer", true, false)
	if _ap != null and _ap.has_animation("Idle"):
		_ap.play("Idle")


func _add_cute_bone(bone_name: String, s: float) -> void:
	var idx := _skel.find_bone(bone_name)
	if idx >= 0:
		_cute_bones.append([idx, s])


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
			mi.set_surface_override_material(s, m)


func _process(_delta: float) -> void:
	# アニメが上書きしても“チビ体型”を保つため毎フレーム再適用（スケールはアニメが触らない）
	if _skel != null:
		_apply_cute()
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
