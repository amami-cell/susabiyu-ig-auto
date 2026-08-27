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


const GuideArrowScript := preload("res://scenes/ui/guide_arrow.gd")


func _ready() -> void:
	WorldState.recovery_changed.connect(_on_recovery)
	WorldState.notice.connect(_on_notice)
	Net.roster_changed.connect(_on_roster)
	Net.status_changed.connect(_on_notice)
	# 道しるべの矢印（画面）。HUDの子＝ロビーでは一緒に隠れる。
	var guide := Control.new()
	guide.set_script(GuideArrowScript)
	guide.name = "GuideArrow"
	add_child(guide)
	_skin()
	_on_recovery(WorldState.recovery)
	_on_roster()
	_notice.modulate.a = 0.0


## 素っぽいデフォルトUIを絵本テイストに整える。
func _skin() -> void:
	# 回復メーター（左上）＝一番の主役。緑バー＋芽アイコン＋パネル。
	UIKit.style_label(_recovery_label, 22, Color(1, 1, 1), 5, Color(0.16, 0.3, 0.18, 0.95))
	UIKit.style_bar(_recovery_bar, UIKit.GREEN)
	_recovery_bar.custom_minimum_size.y = 26
	_panel_behind($Top, Color(0.36, 0.5, 0.33, 0.5), UIKit.GREEN_DK, 16)
	# HP・レベル（左下）
	UIKit.style_label(_level_label, 18, Color(1, 1, 1), 4, Color(0.3, 0.18, 0.18, 0.95))
	UIKit.style_bar(_hp_bar, UIKit.PINK)
	_hp_bar.custom_minimum_size.y = 18
	var hp_panel := _panel_behind($Bottom, Color(0.42, 0.32, 0.33, 0.46), UIKit.PINK.darkened(0.25), 14)
	hp_panel.add_to_group("play_ui_extra")   # 会話中は $Bottom と一緒に隠す
	# 名簿・お知らせ
	UIKit.style_label(_roster, 18, Color(1, 1, 1), 4, Color(0.2, 0.2, 0.2, 0.9))
	UIKit.style_label(_notice, 26, Color(1, 1, 0.9), 8, Color(0.1, 0.15, 0.1))


## 対象コントロールと同じ位置に、少し大きめの角丸パネルを“背面”に敷く。
func _panel_behind(target: Control, bg: Color, border: Color, radius: int) -> Panel:
	var p := Panel.new()
	p.anchor_left = target.anchor_left
	p.anchor_top = target.anchor_top
	p.anchor_right = target.anchor_right
	p.anchor_bottom = target.anchor_bottom
	p.offset_left = target.offset_left - 14
	p.offset_top = target.offset_top - 10
	p.offset_right = target.offset_right + 14
	p.offset_bottom = target.offset_bottom + 10
	p.grow_horizontal = target.grow_horizontal
	p.grow_vertical = target.grow_vertical
	p.add_theme_stylebox_override("panel", UIKit.panel(bg, border, radius, 3, 0))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(p)
	move_child(p, 0)
	return p


func _process(_delta: float) -> void:
	if _player == null or not is_instance_valid(_player):
		_player = _find_local_player()
		if _player == null:
			return
	_hp_bar.max_value = _player.max_hp
	_hp_bar.value = _player.hp
	var fly := "　／ とべる！" if _player.can_fly() else ""
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
	_recovery_label.text = "みどり回復　%d%%" % int(round(value * 100.0))


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
