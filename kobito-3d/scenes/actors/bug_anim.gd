extends Node
class_name BugAnim
## 虫の“生きてる感”。脚と触角を時間で小刻みに動かすだけ（軽い三角関数）。
## サーバ/クライアント問わず全員の画面で回る（見た目だけなので同期は不要）。

var _legs: Array[Node3D] = []       # 脚の付け根ピボット（回すと脚が振れる）
var _antennae: Array[Node3D] = []   # 触角の付け根
var _t := 0.0
var _base_leg: Array[float] = []


func setup(legs: Array[Node3D], antennae: Array[Node3D]) -> void:
	_legs = legs
	_antennae = antennae
	_base_leg.clear()
	for l in _legs:
		_base_leg.append(l.rotation.x)
	_t = randf_range(0.0, 6.28)   # 個体ごとに位相をずらす


func _process(delta: float) -> void:
	_t += delta
	# 脚：左右前後で位相をずらして、わちゃわちゃ動かす
	for i in _legs.size():
		var l := _legs[i]
		if is_instance_valid(l):
			l.rotation.x = _base_leg[i] + sin(_t * 9.0 + i * 1.7) * 0.35
	# 触角：ゆっくり揺れる
	for i in _antennae.size():
		var a := _antennae[i]
		if is_instance_valid(a):
			a.rotation.z = sin(_t * 2.2 + i * 3.14) * 0.18
