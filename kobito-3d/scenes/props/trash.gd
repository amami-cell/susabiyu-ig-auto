extends RigidBody3D
## ゴミ（吸い殻・空き缶・葉っぱ）
##
## 押したり引いたりできる＝物理ボディ。
## 物理はサーバだけが回し、結果の姿勢を配る。物理を各自で回すと必ずズレるので、
## 「正は1台」に寄せておくのがオンラインの鉄則。

const SYNC_HZ := 12.0
const PUSH_FORCE := 6.0

@export var cleanup_zone_group := "cleanup_zone"

var _sync_accum := 0.0
var _net_xform := Transform3D.IDENTITY
var _removed := false
var _marker: MeshInstance3D = null
var _marker_t := 0.0


func _ready() -> void:
	add_to_group("trash")
	add_to_group("trash_all")   # 片づけ後も残す＝後発参加者へ「もう無い」と伝えるため
	_net_xform = global_transform
	# サーバ以外は物理を止めて、届いた姿勢に従うだけにする
	freeze = not (multiplayer.has_multiplayer_peer() and multiplayer.is_server())
	_build_marker()
	set_physics_process(true)


## ゴミの上に ふわっと浮く 金色の光の粒。＝地面のゴミが 遠くからでも 見つかる。
func _build_marker() -> void:
	_marker = MeshInstance3D.new()
	_marker.name = "Marker"
	var m := SphereMesh.new()
	m.radius = 0.13
	m.height = 0.26
	m.radial_segments = 8
	m.rings = 5
	_marker.mesh = m
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.86, 0.4)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.8, 0.3)
	mat.emission_energy_multiplier = 2.6
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_marker.material_override = mat
	_marker.top_level = true   # 親（ゴミ）の物理回転を受けない＝常にまっすぐ浮く
	add_child(_marker)


func _process(delta: float) -> void:
	if _marker == null or _removed:
		return
	_marker_t += delta
	_marker.global_position = global_position + Vector3(0.0, 0.55 + sin(_marker_t * 3.0) * 0.08, 0.0)


func _physics_process(delta: float) -> void:
	if _removed or not multiplayer.has_multiplayer_peer():
		return
	if multiplayer.is_server():
		_sync_accum += delta
		if _sync_accum >= 1.0 / SYNC_HZ:
			_sync_accum = 0.0
			rpc("_remote_xform", global_transform)
	else:
		global_transform = global_transform.interpolate_with(_net_xform, clampf(delta * 12.0, 0.0, 1.0))


## プレイヤーが「つかむ／押す」をしたときにサーバが呼ぶ
func grab_by(from: Vector3) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server() or _removed:
		return
	var dir: Vector3 = global_position - from
	dir.y = 0.0
	if dir.length_squared() < 0.001:
		return
	apply_central_impulse(dir.normalized() * PUSH_FORCE + Vector3.UP * 1.5)


## 排水溝の外（回収ゾーン）へ出たら「掃除できた」
func mark_removed() -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server() or _removed:
		return
	_removed = true
	WorldState.add("trash_removed")
	rpc("_remote_removed")


## 後から参加した人へ「このゴミはもう片づけ済み」を伝える（サーバのみ）。
func sync_to(id: int) -> void:
	if _removed:
		rpc_id(id, "_remote_removed")


@rpc("authority", "unreliable_ordered")
func _remote_xform(xform: Transform3D) -> void:
	_net_xform = xform


@rpc("authority", "call_local", "reliable")
func _remote_removed() -> void:
	_removed = true
	remove_from_group("trash")   # 目的判定(trash)からは外す。trash_all には残す
	Sfx.play("heal")            # 片づいた合図（気持ちいい音）
	if _marker != null:
		_marker.queue_free()
		_marker = null
	_spawn_poof()               # ぽん、と光の粒がはじけて消える
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3.ZERO, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)
	# ★後発参加の亡霊ゴミ対策★ サーバはノードを破棄せず「隠して当たり判定を切る」だけにする。
	# こうすると _on_peer_connected の sync_to が、片づけ済みゴミを列挙して新規参加者へ
	# 「もう無い」と伝えられる（queue_free してしまうと列挙できず、参加者側で5個復活していた）。
	if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		freeze = true
		tween.tween_callback(func() -> void:
			visible = false
			for c in get_children():
				if c is CollisionShape3D:
					c.disabled = true)
	else:
		tween.tween_callback(queue_free)


## 片づけたときの ぱっと弾ける光（金色）。
func _spawn_poof() -> void:
	var world := get_parent()
	if world == null:
		return
	var origin := global_position + Vector3(0.0, 0.4, 0.0)
	for i in 8:
		var s := MeshInstance3D.new()
		var m := SphereMesh.new()
		m.radius = 0.05
		m.height = 0.1
		m.radial_segments = 6
		m.rings = 3
		s.mesh = m
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(1.0, 0.9, 0.6)
		mat.emission_enabled = true
		mat.emission = Color(1.0, 0.82, 0.4)
		mat.emission_energy_multiplier = 3.0
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		s.material_override = mat
		world.add_child(s)
		s.global_position = origin
		var ang := TAU * float(i) / 8.0
		var target := origin + Vector3(cos(ang) * 0.7, randf_range(0.5, 1.1), sin(ang) * 0.7)
		var tw := create_tween()
		tw.tween_property(s, "global_position", target, 0.45).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(mat, "albedo_color:a", 0.0, 0.5)
		tw.tween_callback(s.queue_free)
