extends Control
## 遊んでいる最中の表示
##
## 一番大きく出しているのは HP でも XP でもなく「環境回復度」。
## このゲームで一番気持ちいいのは “自分の行動で世界が緑に戻る” ことなので、
## そこに常に目が行くようにしておく。

var _player: Node = null

# 「やられた→復活」をはっきり見せるための表示
const REVIVE_SECS := 2.5     # player.gd のダウン→復活の時間に合わせる
var _was_downed := false
var _down_t := 0.0
var _downed_dim: ColorRect = null
var _downed_lbl: Label = null
var _hurt_flash: ColorRect = null   # 被弾の赤フラッシュ
var _last_hp := -1                   # 前フレームのHP（減少検知用）

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
	_build_downed()
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


## 「やられた…／もうすぐ 起きあがる（数字）」の中央表示。復活したら「ふっかつ！」。
func _build_downed() -> void:
	_downed_dim = ColorRect.new()
	_downed_dim.color = Color(0.45, 0.06, 0.06, 0.4)   # 画面を赤く沈める＝“やられた”が一目で
	_downed_dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_downed_dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_downed_dim.visible = false
	add_child(_downed_dim)
	move_child(_downed_dim, 0)   # いちばん後ろ（他のUIは上に出す）

	_downed_lbl = Label.new()
	_downed_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_downed_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_downed_lbl.set_anchors_preset(Control.PRESET_CENTER)
	_downed_lbl.offset_left = -420
	_downed_lbl.offset_right = 420
	_downed_lbl.offset_top = -80
	_downed_lbl.offset_bottom = 80
	_downed_lbl.add_theme_font_size_override("font_size", 46)
	_downed_lbl.add_theme_color_override("font_color", Color(1, 1, 1))
	_downed_lbl.add_theme_color_override("font_outline_color", Color(0.2, 0.05, 0.05))
	_downed_lbl.add_theme_constant_override("outline_size", 12)
	_downed_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_downed_lbl.visible = false
	add_child(_downed_lbl)

	# 被弾した瞬間、画面をパッと赤くする＝「今ダメージを受けた」が中央視界で分かる
	# （HPバーは左下で、戦闘中は減りに気づきにくい）。
	_hurt_flash = ColorRect.new()
	_hurt_flash.color = Color(0.8, 0.1, 0.1, 0.0)
	_hurt_flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hurt_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_hurt_flash)
	move_child(_hurt_flash, 1)   # ダウン暗転の上・他UIの下


func _process(delta: float) -> void:
	if _player == null or not is_instance_valid(_player):
		_player = _find_local_player()
		if _player == null:
			if _downed_dim != null:
				_downed_dim.visible = false
			if _downed_lbl != null:
				_downed_lbl.visible = false
			return
	_hp_bar.max_value = _player.max_hp
	_hp_bar.value = _player.hp
	# HPが減った瞬間＝赤フラッシュ（中央視界で被弾が分かる）。復活での回復は無視。
	if _last_hp >= 0 and _player.hp < _last_hp and _player.hp > 0 and _hurt_flash != null:
		_hurt_flash.color.a = 0.32
		var tw := create_tween()
		tw.tween_property(_hurt_flash, "color:a", 0.0, 0.35)
	_last_hp = _player.hp
	# HPが3割以下は枠を脈打たせて「危ない」を伝える
	if _hurt_flash != null and _player.hp > 0:
		var low := float(_player.hp) / float(maxi(1, _player.max_hp)) < 0.3
		_hp_bar.modulate = Color(1, 0.6, 0.6) if low else Color(1, 1, 1)
	var fly := "　／ とべる！" if _player.can_fly() else ""
	_level_label.text = "Lv.%d　XP %d/%d　HP %d/%d%s" % [
		_player.level, _player.xp, _player.xp_to_next(), _player.hp, _player.max_hp, fly
	]

	# 死んだとき＝はっきり見せる（赤く沈める＋「たおれた…」＋復活までの数字）。
	var downed: bool = _player.hp <= 0
	if downed:
		_down_t += delta
		var remain := maxf(0.0, REVIVE_SECS - _down_t)
		_downed_dim.visible = true
		_downed_lbl.visible = true
		_downed_lbl.text = "たおれた…\nもうすぐ 起きあがる（%d）" % int(ceil(remain))
		# ゆっくり点滅させて“待ち”を伝える
		_downed_lbl.modulate.a = 0.75 + 0.25 * sin(_down_t * 5.0)
	else:
		if _was_downed:
			# 復活した瞬間：はっきり「ふっかつ！」
			_down_t = 0.0
			_downed_dim.visible = false
			_downed_lbl.visible = false
			_flash_center("ふっかつ！", Color(0.6, 1.0, 0.7))
		_down_t = 0.0
	_was_downed = downed


## 中央に一瞬 大きく出して すっと消す（復活・大事な合図用）。
func _flash_center(text: String, col: Color) -> void:
	_notice.text = text
	_notice.add_theme_color_override("font_color", col)
	_notice.modulate.a = 1.0
	var tween := create_tween()
	tween.tween_interval(0.7)
	tween.tween_property(_notice, "modulate:a", 0.0, 0.6)


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
	_notice.add_theme_color_override("font_color", Color(1, 1, 0.9))   # 通常色に戻す（復活の緑を残さない）
	_notice.modulate.a = 1.0
	var tween := create_tween()
	tween.tween_interval(2.0)
	tween.tween_property(_notice, "modulate:a", 0.0, 0.8)
