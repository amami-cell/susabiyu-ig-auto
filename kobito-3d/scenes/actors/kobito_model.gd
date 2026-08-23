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

var _actor: Object = null
var _ap: AnimationPlayer = null
var _walking := false


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

	_ap = model.find_child("AnimationPlayer", true, false)
	if _ap != null:
		if _ap.has_animation("Idle"):
			_ap.play("Idle")
		_ap.get_animation("Walking")   # 触っておく（存在確認は play 時にガード）


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
			m.albedo_color = m.albedo_color.lerp(color, 0.22)
			mi.set_surface_override_material(s, m)


func _process(_delta: float) -> void:
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
