extends Control
## 遊んでいる最中の表示
##
## 一番大きく出しているのは HP でも XP でもなく「環境回復度」。
## このゲームで一番気持ちいいのは “自分の行動で世界が緑に戻る” ことなので、
## そこに常に目が行くようにしておく。

var _player: Node = null

const DEX_TOTAL := 19   # なかま図鑑の全種数（lobby.gd DEX_SPECIES と一致・第6章で ワタムシ＋オオアゲハ）
var _progress: Label = null   # 中期目標（飛行パーツ・図鑑）の常設表示

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

var _recovery_ticks: Control = null


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
	_build_pause_button()
	_build_progress()
	# 集める中期目標（飛行パーツ・図鑑）が増えたら表示を更新する
	WorldState.powers_changed.connect(_update_progress)
	WorldState.creature_healed.connect(_update_progress)
	_on_recovery(WorldState.recovery)
	_on_roster()
	_update_progress()
	_notice.modulate.a = 0.0


## 素っぽいデフォルトUIを絵本テイストに整える。
func _skin() -> void:
	# 回復メーター（左上）＝一番の主役。緑バー＋芽アイコン＋パネル。
	UIKit.style_label(_recovery_label, 22, Color(1, 1, 1), 5, Color(0.16, 0.3, 0.18, 0.95))
	UIKit.style_bar(_recovery_bar, UIKit.GREEN)
	_recovery_bar.custom_minimum_size.y = 26
	# 25/50/75% の節目（＝環境回復の“お祝い”が起きる位置）を目盛りで見せる。
	# 「あと少しで次のごほうび」が分かって、掃除を続ける動機になる。
	_recovery_ticks = Control.new()
	_recovery_ticks.name = "Ticks"
	_recovery_ticks.set_anchors_preset(Control.PRESET_FULL_RECT)
	_recovery_ticks.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_recovery_bar.add_child(_recovery_ticks)
	_recovery_ticks.draw.connect(_draw_recovery_ticks)
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
	# ダウン暗転：ふだんは赤く沈める。えんしゅつ ひかえめ時は やわらかい低彩度で（刺激を抑える）。
	_downed_dim.color = Color(0.2, 0.2, 0.25, 0.25) if UIKit.reduce_fx() else Color(0.45, 0.06, 0.06, 0.4)
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
		# えんしゅつ ひかえめ：中央全面の赤い明滅をやめ、周縁だけ ごく淡い低彩度に（光過敏配慮）。
		if UIKit.reduce_fx():
			_hurt_flash.color = Color(0.55, 0.35, 0.4, 0.14)
		else:
			_hurt_flash.color = Color(0.8, 0.1, 0.1, 0.32)
		var tw := create_tween()
		tw.tween_property(_hurt_flash, "color:a", 0.0, 0.35)
	_last_hp = _player.hp
	# HPが3割以下は枠を脈打たせて「危ない」を伝える
	if _hurt_flash != null and _player.hp > 0:
		var low := float(_player.hp) / float(maxi(1, _player.max_hp)) < 0.3
		_hp_bar.modulate = Color(1, 0.6, 0.6) if low else Color(1, 1, 1)
	var fly := "　／ とべる！" if _player.can_fly() else ""
	var allies := get_tree().get_nodes_in_group("ally").size()
	var mates := "　なかま ●×%d" % allies if allies > 0 else ""
	_level_label.text = "Lv.%d　XP %d/%d　HP %d/%d%s%s" % [
		_player.level, _player.xp, _player.xp_to_next(), _player.hp, _player.max_hp, fly, mates
	]

	# 死んだとき＝はっきり見せる（赤く沈める＋「たおれた…」＋復活までの数字）。
	var downed: bool = _player.hp <= 0
	if downed:
		_down_t += delta
		var secs: float = _player.revive_time if "revive_time" in _player else REVIVE_SECS
		var remain := maxf(0.0, secs - _down_t)
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


## スマホ用のポーズボタン（右上）。ブラウザには Esc も戻るキーも当てにできないので、
## 画面に必ず出しておく＝いつでも「タイトルへ戻る／つづける」を開ける安心感。
func _build_pause_button() -> void:
	var btn := Button.new()
	btn.name = "PauseButton"
	btn.text = "‖"
	btn.anchor_left = 1.0
	btn.anchor_right = 1.0
	btn.offset_left = -66.0
	btn.offset_top = 54.0
	btn.offset_right = -14.0
	btn.offset_bottom = 106.0
	UIKit.style_button(btn, UIKit.CREAM_SOLID, UIKit.GREEN_DK)
	btn.add_theme_color_override("font_color", UIKit.INK)
	btn.add_theme_font_size_override("font_size", 26)
	btn.pressed.connect(func() -> void:
		var root := get_tree().current_scene
		if root != null and root.has_method("_toggle_pause"):
			root._toggle_pause())
	add_child(btn)
	btn.add_to_group("play_ui_extra")   # 会話中は他のプレイUIと一緒に隠す


## 中期目標の常設表示（回復メーターの下）。飛行は recovery バーだけでは見えない
## 「あと◯個で飛べる」を、図鑑は「あと何種で完成か」を、遊んでいる最中に伝える。
func _build_progress() -> void:
	_progress = Label.new()
	_progress.name = "Progress"
	_progress.anchor_right = 0.55
	_progress.offset_left = 24.0
	_progress.offset_top = 104.0
	_progress.offset_right = -24.0
	_progress.offset_bottom = 134.0
	_progress.mouse_filter = Control.MOUSE_FILTER_IGNORE
	UIKit.style_label(_progress, 18, Color(1, 1, 0.92), 4, Color(0.16, 0.3, 0.18, 0.9))
	_progress.add_to_group("play_ui_extra")   # 会話中は他のプレイUIと一緒に隠す
	add_child(_progress)


func _update_progress() -> void:
	if _progress == null:
		return
	var got := 0
	for p in WorldState.FLIGHT_PARTS:
		if WorldState.has_power(p):
			got += 1
	var total: int = WorldState.FLIGHT_PARTS.size()
	var dots := ""
	for i in total:
		dots += "●" if i < got else "○"
	var wings := "つばさ %s とべる！" % dots if got >= total else "つばさ %s %d/%d" % [dots, got, total]
	var dex: int = Chapter.dex_counts().size()
	_progress.text = "%s　　ずかん %d/%d" % [wings, dex, DEX_TOTAL]


func _find_local_player() -> Node:
	for p in get_tree().get_nodes_in_group("player"):
		if p.is_local:
			return p
	return null


func _on_recovery(value: float) -> void:
	_recovery_bar.value = value * 100.0
	_recovery_label.text = "みどり回復　%d%%" % int(round(value * 100.0))
	if _recovery_ticks != null:
		_recovery_ticks.queue_redraw()


## 回復メーターに“成長の節目”を刻む＝芽→つぼみ→花→満開。
## 到達すると色づき、これからの節目はうっすら。「あと少しで次の姿（満開）」が
## ひと目で分かって、掃除を続ける動機になる。
func _draw_recovery_ticks() -> void:
	var sz := _recovery_ticks.size
	if sz.x <= 0.0:
		return
	var rec := WorldState.recovery
	# [位置, 種類]。1.0＝右端の満開は少し内側に寄せて欠けないように。
	var stages := [
		[0.25, "sprout"],   # 芽（二葉）
		[0.5,  "bud"],      # つぼみ
		[0.75, "flower"],   # 花
		[1.0,  "bloom"],    # 満開
	]
	for st: Array in stages:
		var at: float = st[0]
		var kind: String = st[1]
		var x: float = clampf(sz.x * at, 9.0, sz.x - 9.0)
		var reached: bool = rec >= at - 0.001
		if at < 1.0:
			var lcol := Color(1.0, 0.85, 0.35, 0.9) if reached else Color(1, 1, 1, 0.3)
			_recovery_ticks.draw_line(Vector2(x, 3.0), Vector2(x, sz.y - 3.0), lcol, 2.0)
		_draw_stage_icon(x, sz.y * 0.5, kind, reached)


## 成長段階アイコン（バー内に小さく描く）。到達＝色づき、未到達＝うっすら白。
func _draw_stage_icon(cx: float, cy: float, kind: String, reached: bool) -> void:
	# 到達時は 明るい緑バーの上でも埋もれないよう“濃い緑”にする（コントラスト確保）。
	var leaf := Color(0.14, 0.44, 0.16) if reached else Color(1, 1, 1, 0.28)
	var stem := Color(0.10, 0.36, 0.13) if reached else Color(1, 1, 1, 0.24)
	var petal := Color(1.0, 0.52, 0.68) if reached else Color(1, 1, 1, 0.30)
	var core := Color(1.0, 0.84, 0.32) if reached else Color(1, 1, 1, 0.34)
	var shade := Color(0.12, 0.2, 0.12, 0.45)   # どの背景でも読めるよう暗い縁を敷く
	match kind:
		"sprout":
			_recovery_ticks.draw_line(Vector2(cx, cy + 5.0), Vector2(cx, cy - 1.0), stem, 2.0)
			for dx: float in [-3.4, 3.4]:
				_recovery_ticks.draw_circle(Vector2(cx + dx, cy - 2.0), 3.4, shade)
				_recovery_ticks.draw_circle(Vector2(cx + dx, cy - 2.0), 2.7, leaf)
		"bud":
			_recovery_ticks.draw_line(Vector2(cx, cy + 5.0), Vector2(cx, cy - 1.0), stem, 2.0)
			_recovery_ticks.draw_circle(Vector2(cx, cy - 3.0), 4.0, shade)
			_recovery_ticks.draw_circle(Vector2(cx, cy - 3.0), 3.3, leaf)
			_recovery_ticks.draw_circle(Vector2(cx, cy - 4.5), 2.0, petal)
		"flower":
			for i in 5:
				var pa := TAU * float(i) / 5.0 - PI * 0.5
				_recovery_ticks.draw_circle(Vector2(cx + cos(pa) * 4.4, cy - 2.0 + sin(pa) * 4.4), 3.0, shade)
			for i in 5:
				var pb := TAU * float(i) / 5.0 - PI * 0.5
				_recovery_ticks.draw_circle(Vector2(cx + cos(pb) * 4.4, cy - 2.0 + sin(pb) * 4.4), 2.4, petal)
			_recovery_ticks.draw_circle(Vector2(cx, cy - 2.0), 2.2, core)
		"bloom":
			for i in 6:
				var ba := TAU * float(i) / 6.0
				_recovery_ticks.draw_circle(Vector2(cx + cos(ba) * 5.4, cy - 1.0 + sin(ba) * 5.4), 3.6, shade)
			for i in 6:
				var bb := TAU * float(i) / 6.0
				_recovery_ticks.draw_circle(Vector2(cx + cos(bb) * 5.4, cy - 1.0 + sin(bb) * 5.4), 2.9, petal)
			_recovery_ticks.draw_circle(Vector2(cx, cy - 1.0), 3.0, core)


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
