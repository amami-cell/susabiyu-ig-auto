extends Node3D
## 種のかけら（収集・寄り道要素）。ふわふわ光って浮かぶ。近づくと拾える。
##
## 拾い判定はサーバが持つ（＝どちらの画面でも同じ数になる）。拾うと少し緑が戻り、
## 章の進行が数える（WorldState.seed_collected）。見た目の消滅演出は全員へ配る。

var _collected := false
var _t := 0.0
var _base_y := 0.6
@onready var _mesh: MeshInstance3D = $Mesh
@onready var _area: Area3D = $Area


func _ready() -> void:
	add_to_group("seed")
	_base_y = position.y
	_t = randf() * 6.28
	# 光る種のかけら（金緑）。透明可＝拾ったとき消える演出に使う。
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.8, 1.0, 0.5, 1.0)
	mat.emission_enabled = true
	mat.emission = Color(0.7, 1.0, 0.45)
	mat.emission_energy_multiplier = 1.6
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.rim_enabled = true
	_mesh.material_override = mat
	if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		_area.body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	# ふわふわ浮く＋くるくる回る（生きてる合図）
	_t += delta
	_mesh.position.y = sin(_t * 2.0) * 0.12
	_mesh.rotation.y += delta * 1.6


func _on_body_entered(body: Node3D) -> void:
	if _collected:
		return
	if not body.is_in_group("player"):
		return
	_collected = true
	WorldState.add("seed")            # サーバ：少し緑が戻る＋章が数える
	rpc("_remote_collected")


@rpc("authority", "call_local", "reliable")
func _remote_collected() -> void:
	_collected = true
	remove_from_group("seed")
	Sfx.play("pickup", -4.0)
	# きらめいて上へ昇って消える
	var mat := _mesh.material_override as StandardMaterial3D
	var tw := create_tween()
	tw.tween_property(self, "position:y", position.y + 1.0, 0.4)
	tw.parallel().tween_property(_mesh, "scale", Vector3.ONE * 1.8, 0.2)
	if mat != null:
		tw.parallel().tween_property(mat, "albedo_color:a", 0.0, 0.4)
	tw.tween_callback(queue_free)
