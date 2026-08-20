extends Control
## 遊んでいる最中の表示
##
## 一番大きく出しているのは HP でも XP でもなく「環境回復度」。
## このゲームで一番気持ちいいのは “自分の行動で世界が緑に戻る” ことなので、
## そこに常に目が行くようにしておく。

var _player: Node = null

@onready var _recovery_bar: ProgressBar = $Top/RecoveryBar
@onready var _recovery_label: Label = $Top/RecoveryLabel
@onready var _hp_bar: ProgressBar = $Bottom/HpBar
@onready var _level_label: Label = $Bottom/LevelLabel
@onready var _notice: Label = $Notice
@onready var _roster: Label = $Roster


func _ready() -> void:
	WorldState.recovery_changed.connect(_on_recovery)
	WorldState.notice.connect(_on_notice)
	Net.roster_changed.connect(_on_roster)
	Net.status_changed.connect(_on_notice)
	_on_recovery(WorldState.recovery)
	_on_roster()
	_notice.modulate.a = 0.0


func _process(_delta: float) -> void:
	if _player == null or not is_instance_valid(_player):
		_player = _find_local_player()
		if _player == null:
			return
	_hp_bar.max_value = _player.max_hp
	_hp_bar.value = _player.hp
	var fly := "　🕊 飛べる" if _player.can_fly() else ""
	_level_label.text = "Lv.%d　XP %d/%d　HP %d/%d%s" % [
		_player.level, _player.xp, _player.xp_to_next(), _player.hp, _player.max_hp, fly
	]


func _find_local_player() -> Node:
	for p in get_tree().get_nodes_in_group("player"):
		if p.is_local:
			return p
	return null


func _on_recovery(value: float) -> void:
	_recovery_bar.value = value * 100.0
	_recovery_label.text = "環境回復度　%d%%" % int(round(value * 100.0))


func _on_roster() -> void:
	var names: Array[String] = []
	for id in Net.roster:
		var mark := "●" if id == multiplayer.get_unique_id() else "○"
		names.append("%s%s" % [mark, Net.roster[id]["name"]])
	_roster.text = "　".join(names)


func _on_notice(text: String) -> void:
	_notice.text = text
	_notice.modulate.a = 1.0
	var tween := create_tween()
	tween.tween_interval(2.0)
	tween.tween_property(_notice, "modulate:a", 0.0, 0.8)
