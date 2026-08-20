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


func _ready() -> void:
	add_to_group("trash")
	_net_xform = global_transform
	# サーバ以外は物理を止めて、届いた姿勢に従うだけにする
	freeze = not (multiplayer.has_multiplayer_peer() and multiplayer.is_server())
	set_physics_process(true)


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


@rpc("authority", "unreliable_ordered")
func _remote_xform(xform: Transform3D) -> void:
	_net_xform = xform


@rpc("authority", "call_local", "reliable")
func _remote_removed() -> void:
	_removed = true
	remove_from_group("trash")
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3.ZERO, 0.3)
	tween.tween_callback(queue_free)
