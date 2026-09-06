extends Control
## タイトル画面 兼 ロビー
##
## 「ひとりで始める」も中身はホスト。あとから join できる（1人用→多人数の作り直しが不要）。
## ブラウザ版（iPhone想定）だけは待ち受け不可＝必ず「参加する」側。
##
## 見た目は“絵本の表紙”：手描きふうの空と丘の背景＋大きな題字＋生成りのパネル。
## 背景はすべて手続き描画（外部素材ゼロ・軽い）。なまえは前回ぶんを思い出す。

@onready var _name_edit: LineEdit = $Panel/VBox/NameEdit
@onready var _addr_edit: LineEdit = $Panel/VBox/AddrEdit
@onready var _status: Label = $Panel/VBox/Status
@onready var _transport: OptionButton = $Panel/VBox/Transport
@onready var _solo: Button = $Panel/VBox/SoloButton
@onready var _host: Button = $Panel/VBox/HostButton
@onready var _join: Button = $Panel/VBox/JoinButton
@onready var _panel: PanelContainer = $Panel
@onready var _vbox: VBoxContainer = $Panel/VBox
@onready var _title_lbl: Label = $Panel/VBox/Title

var _biome: OptionButton = null
var _difficulty: OptionButton = null
var _credits: Control = null
var _t := 0.0
var _seeds: Array[Vector2] = []


func _ready() -> void:
	# 背景は _draw で描くので、真っ黒の下地は消す
	var bg := get_node_or_null("Bg")
	if bg is ColorRect:
		bg.color = Color(0, 0, 0, 0)

	_build_backdrop_seeds()
	_dress_title()
	_dress_panel()

	# 舞台セレクタ（庭/遺跡）
	_biome = OptionButton.new()
	_biome.add_item("庭（家族の巣・緑がよく戻る）", 0)
	_biome.add_item("遺跡（薄暗い石の世界・石版パズル）", 1)
	_vbox.add_child(_biome)
	_vbox.move_child(_biome, 2)

	# むずかしさ（敵の強さ）。やさしい=お子さん向け / つよい=クリア後の遊び直し。
	_difficulty = OptionButton.new()
	_difficulty.add_item("やさしい（のんびり）", 0)
	_difficulty.add_item("ふつう", 1)
	_difficulty.add_item("つよい（歯ごたえ）", 2)
	# 初回は やさしい を既定に（低ストレスが売り＝初見の離脱を防ぐ）。あとで変更可。
	_difficulty.selected = 0 if Net.is_web() else 1
	_vbox.add_child(_difficulty)
	_vbox.move_child(_difficulty, 3)

	# 音量スライダー（保存される）
	var vol_label := Label.new()
	vol_label.text = "音量"
	UIKit.style_label(vol_label, 18, UIKit.INK)
	_vbox.add_child(vol_label)
	_vbox.move_child(vol_label, 3)
	var vol := HSlider.new()
	vol.min_value = 0.0
	vol.max_value = 1.0
	vol.step = 0.05
	vol.value = Sfx.get_master_volume()
	vol.custom_minimum_size = Vector2(0, 44)
	_vbox.add_child(vol)
	_vbox.move_child(vol, 4)
	vol.value_changed.connect(func(v: float) -> void: Sfx.set_master_volume(v))

	_transport.add_item("ENet（PC/Android・低遅延・おすすめ）", Net.Transport.ENET)
	_transport.add_item("WebSocket（ブラウザでも動く）", Net.Transport.WEBSOCKET)
	_transport.selected = 1 if Net.transport == Net.Transport.WEBSOCKET else 0

	# 前回の なまえ を思い出して入れておく
	_name_edit.text = Net.my_display_name

	_solo.pressed.connect(_on_solo)
	_host.pressed.connect(_on_host)
	_join.pressed.connect(_on_join)
	Net.status_changed.connect(func(t: String) -> void: _status.text = t)

	_refresh_title_state()
	# 遊び終えてタイトルへ戻ったら「つづきから」やクリア表示を出し直す。
	Net.session_ended.connect(func(_r: String) -> void: _refresh_title_state())
	_build_credits_button()

	if Net.is_web():
		_setup_for_browser()
	else:
		_setup_for_app()


# ------------------------------------------------------------ 見た目（絵本の表紙）

func _dress_title() -> void:
	# パネル内の小さな題字は隠し、画面上部に大きな題字＋サブタイトルを置く。
	if _title_lbl != null:
		_title_lbl.visible = false

	var title := Label.new()
	title.name = "BigTitle"
	title.text = "小人一家と汚れた世界"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.anchor_left = 0.0
	title.anchor_right = 1.0
	title.anchor_top = 0.0
	title.offset_top = 54.0
	title.offset_bottom = 120.0
	title.add_theme_font_size_override("font_size", 52)
	title.add_theme_color_override("font_color", Color(1.0, 0.99, 0.92))
	title.add_theme_color_override("font_outline_color", Color(0.2, 0.32, 0.2))
	title.add_theme_constant_override("outline_size", 14)
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(title)

	var sub := Label.new()
	sub.name = "SubTitle"
	sub.text = "〜 えほん『みどりのはじまり』 〜"
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.anchor_left = 0.0
	sub.anchor_right = 1.0
	sub.anchor_top = 0.0
	sub.offset_top = 118.0
	sub.offset_bottom = 152.0
	sub.add_theme_font_size_override("font_size", 22)
	sub.add_theme_color_override("font_color", Color(1.0, 0.96, 0.86))
	sub.add_theme_color_override("font_outline_color", Color(0.25, 0.2, 0.15))
	sub.add_theme_constant_override("outline_size", 8)
	sub.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(sub)


func _dress_panel() -> void:
	# 生成りの絵本パネルへ。少し下寄せして題字の下に置く。
	_panel.offset_top = -150.0
	_panel.offset_bottom = 250.0
	var sb := UIKit.panel(UIKit.CREAM, UIKit.GREEN_DK, 22, 4, 18)
	_panel.add_theme_stylebox_override("panel", sb)
	_vbox.add_theme_constant_override("separation", 12)

	# ボタンを絵本テイストに
	_solo.text = "ひとりで始める"
	_host.text = "みんなで遊ぶ（ホスト）"
	_join.text = "参加する"
	UIKit.style_button(_solo, UIKit.GREEN, UIKit.GREEN_DK)
	UIKit.style_button(_host, UIKit.GOLD, Color(0.82, 0.6, 0.24))
	UIKit.style_button(_join, Color(0.62, 0.8, 1.0), Color(0.42, 0.6, 0.9))
	for b in [_solo, _host, _join]:
		b.custom_minimum_size = Vector2(0, 56)
	UIKit.style_label(_status, 16, UIKit.INK_SOFT)


func _build_backdrop_seeds() -> void:
	# ふわふわ舞う種のかけら（背景の動き）。位置は 0..1 の相対で持つ。
	var rng := RandomNumberGenerator.new()
	rng.seed = 424242
	_seeds.clear()
	for i in 14:
		_seeds.append(Vector2(rng.randf(), rng.randf()))


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


## 絵本の表紙の背景：夜明けの空 → 太陽 → やわらかい丘 → 舞う種。すべて手続き描画。
func _draw() -> void:
	var w := size.x
	var h := size.y
	# 空（縦グラデを帯で）：本編のマジックアワー配色に合わせる＝“同じ1冊の絵本”に見せる。
	# 上＝青紫、中＝金桃、下＝みどり（garden の sky_top/horizon と同系）。
	var top := Color(0.24, 0.36, 0.60)
	var mid := Color(0.96, 0.72, 0.46)
	var bot := Color(0.42, 0.62, 0.40)
	var bands := 48
	for i in bands:
		var t0 := float(i) / float(bands)
		var col: Color
		if t0 < 0.5:
			col = top.lerp(mid, t0 / 0.5)
		else:
			col = mid.lerp(bot, (t0 - 0.5) / 0.5)
		draw_rect(Rect2(0, h * t0, w, h / float(bands) + 1.0), col)

	# 太陽（右上・にじむ光）
	var sun := Vector2(w * 0.76, h * 0.30)
	for r in [150.0, 110.0, 78.0]:
		draw_circle(sun, r, Color(1.0, 0.95, 0.8, 0.06))
	draw_circle(sun, 54.0, Color(1.0, 0.96, 0.85, 0.9))

	# 遠くの丘（3枚重ね・奥ほど淡い）
	_draw_hill(h * 0.62, Color(0.46, 0.56, 0.44), 46.0, 0.7)
	_draw_hill(h * 0.72, Color(0.38, 0.5, 0.34), 60.0, 1.1)
	_draw_hill(h * 0.82, Color(0.3, 0.44, 0.27), 74.0, 1.6)

	# 舞う種のかけら（金色の粒＋淡い光）
	for i in _seeds.size():
		var s := _seeds[i]
		var x := fposmod(s.x + _t * 0.02 * (0.5 + s.y), 1.0) * w
		var y := (s.y * 0.7 + 0.05) * h + sin(_t * 0.8 + i) * 8.0
		draw_circle(Vector2(x, y), 4.0, Color(1.0, 0.9, 0.6, 0.85))
		draw_circle(Vector2(x, y), 8.0, Color(1.0, 0.9, 0.6, 0.18))


## なだらかな丘を1枚。baseline=丘のてっぺんの高さ、amp=うねりの大きさ、freq=波の細かさ。
func _draw_hill(baseline: float, col: Color, amp: float, freq: float) -> void:
	var w := size.x
	var h := size.y
	var pts := PackedVector2Array()
	var steps := 24
	for i in steps + 1:
		var tx := float(i) / float(steps)
		var y := baseline + sin(tx * TAU * freq + baseline) * amp * 0.5 - amp * 0.5
		pts.append(Vector2(tx * w, y))
	pts.append(Vector2(w, h))
	pts.append(Vector2(0, h))
	draw_colored_polygon(pts, col)


# ------------------------------------------------------------ クレジット

## 「つづきから」ボタンとクリア表示を、いまのセーブ状況に合わせて出し直す（何度呼んでもOK）。
func _refresh_title_state() -> void:
	# つづきから（途中経過があれば「はじめから」の上に出す）
	var existing := _vbox.get_node_or_null("ContinueButton")
	if Chapter.has_save():
		if existing == null:
			var cont := Button.new()
			cont.name = "ContinueButton"
			cont.custom_minimum_size = Vector2(0, 56)
			UIKit.style_button(cont, UIKit.GOLD, Color(0.82, 0.6, 0.24))
			_vbox.add_child(cont)
			_vbox.move_child(cont, _solo.get_index())
			cont.pressed.connect(_on_continue)
			existing = cont
		(existing as Button).text = "つづきから（%s）" % Chapter.save_label()
		_solo.text = "はじめから"
	else:
		if existing != null:
			existing.queue_free()
		_solo.text = "ひとりで始める"

	# 一度でも通しクリアしていたら、小さく誇らしく表示（左上）
	if Chapter.cleared and get_node_or_null("ClearedBadge") == null:
		var badge := Label.new()
		badge.name = "ClearedBadge"
		badge.text = "★ クリア済み"
		badge.add_theme_font_size_override("font_size", 20)
		badge.add_theme_color_override("font_color", Color(1.0, 0.9, 0.5))
		badge.add_theme_color_override("font_outline_color", Color(0.2, 0.16, 0.1))
		badge.add_theme_constant_override("outline_size", 6)
		badge.position = Vector2(20, 16)
		badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(badge)


func _build_credits_button() -> void:
	var btn := Button.new()
	btn.name = "CreditsButton"
	btn.text = "クレジット"
	btn.anchor_left = 1.0
	btn.anchor_right = 1.0
	btn.anchor_top = 1.0
	btn.anchor_bottom = 1.0
	btn.offset_left = -160.0
	btn.offset_top = -56.0
	btn.offset_right = -16.0
	btn.offset_bottom = -16.0
	UIKit.style_button(btn, UIKit.CREAM_SOLID, UIKit.GREEN_DK)
	btn.add_theme_color_override("font_color", UIKit.INK)
	btn.pressed.connect(_show_credits)
	add_child(btn)


func _show_credits() -> void:
	if _credits != null:
		_credits.visible = true
		return
	_credits = Control.new()
	_credits.name = "Credits"
	_credits.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_credits)

	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.5)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_credits.add_child(dim)

	var box := Panel.new()
	box.anchor_left = 0.5
	box.anchor_top = 0.5
	box.anchor_right = 0.5
	box.anchor_bottom = 0.5
	box.offset_left = -320.0
	box.offset_top = -220.0
	box.offset_right = 320.0
	box.offset_bottom = 220.0
	box.add_theme_stylebox_override("panel", UIKit.panel(UIKit.CREAM, UIKit.GREEN_DK, 20, 4, 22))
	_credits.add_child(box)

	var text := Label.new()
	text.set_anchors_preset(Control.PRESET_FULL_RECT)
	text.offset_left = 28
	text.offset_top = 22
	text.offset_right = -28
	text.offset_bottom = -76
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text.add_theme_font_size_override("font_size", 20)
	text.add_theme_color_override("font_color", UIKit.INK)
	text.text = "小人一家と汚れた世界\n〜 えほん『みどりのはじまり』 〜\n\n" \
		+ "小さな家族が、汚れた世界を そうじして、\nみどりを とりもどす おはなし。\n\n" \
		+ "フォント：IPAゴシック（IPAフォントライセンス v1.0）\n" \
		+ "エンジン：Godot Engine\n" \
		+ "3D・音：すべて手続き生成（外部素材なし）\n\n" \
		+ "あそんでくれて ありがとう。"
	box.add_child(text)

	var close := Button.new()
	close.text = "とじる"
	close.anchor_left = 0.5
	close.anchor_right = 0.5
	close.anchor_top = 1.0
	close.anchor_bottom = 1.0
	close.offset_left = -90.0
	close.offset_top = -60.0
	close.offset_right = 90.0
	close.offset_bottom = -16.0
	UIKit.style_button(close, UIKit.GREEN, UIKit.GREEN_DK)
	close.pressed.connect(func() -> void: _credits.visible = false)
	box.add_child(close)


# ------------------------------------------------------------ 開始

func _setup_for_app() -> void:
	_addr_edit.text = "127.0.0.1"
	_status.text = "このPC/スマホのIP: %s" % Net.local_ip_hint()


func _setup_for_browser() -> void:
	_transport.visible = false
	_host.visible = false
	if _biome != null:
		_biome.visible = false
	# ★参加を1タップに★ 接続先はページ配信元から自動補完されるので、IP入力欄は隠す。
	# （同じURLを開いた2台なら、住所を打たずに「参加する」だけでつながる。）
	_addr_edit.text = Net.web_default_address()
	_addr_edit.visible = false
	_solo.text = "ひとりで始める（通信なし）"
	_join.text = "ふたりで遊ぶ（ホストに参加）"
	_status.text = "ふたりで遊ぶには、同じ画面（このURL）を開いたPC/Android側で先に\n「みんなで遊ぶ」を押してもらってください。あとは「参加する」だけ。"


func _sync_settings() -> void:
	var typed := _name_edit.text.strip_edges()
	Net.save_name(typed if not typed.is_empty() else "小人")   # なまえを覚える
	if not Net.is_web():
		Net.transport = _transport.get_item_id(_transport.selected) as Net.Transport
	if _biome != null:
		Net.world_biome = "ruins" if _biome.selected == 1 else "garden"
	if _difficulty != null:
		Net.difficulty = [0.6, 1.0, 1.5][_difficulty.selected]


func _on_continue() -> void:
	_sync_settings()
	Net.world_biome = "garden"   # つづきは庭専用＝遺跡が選ばれていても庭に戻して復元する
	Chapter.continue_game()
	Net.start_solo()


func _on_solo() -> void:
	_sync_settings()
	Chapter.start_new()   # 「はじめから」＝つづきを使わず最初から
	Net.start_solo()


func _on_host() -> void:
	_sync_settings()
	Chapter.start_new()
	if Net.host() == OK:
		_status.text = "待ち受け中。相手の端末に %s を入力してもらう" % Net.local_ip_hint()


func _on_join() -> void:
	_sync_settings()
	Net.join(_addr_edit.text.strip_edges())
