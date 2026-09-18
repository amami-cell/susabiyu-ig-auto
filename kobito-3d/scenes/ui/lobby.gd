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
var _dex: Control = null
var _qr: Control = null

# なかま図鑑の全種（id は data/*.tres のファイル名。色は見分け用の近似）。
const DEX_SPECIES := [
	{"id": "ant", "name": "アリ", "color": Color(0.42, 0.32, 0.26), "role": "すばしっこい：手数でついてくる"},
	{"id": "beetle", "name": "コガネムシ", "color": Color(0.28, 0.46, 0.32), "role": "がんじょうな盾：癒やしが強い"},
	{"id": "batta", "name": "バッタ", "color": Color(0.52, 0.66, 0.32), "role": "よくはねる：広めにとどく"},
	{"id": "tentou", "name": "テントウ", "color": Color(0.82, 0.24, 0.22), "role": "がんじょうな盾：癒やしが強い"},
	{"id": "chou", "name": "チョウ", "color": Color(0.72, 0.52, 0.86), "role": "ひらひら：飛べて ひろくとどく"},
	{"id": "tonbo", "name": "トンボ", "color": Color(0.32, 0.62, 0.72), "role": "空の担当：空の敵にとどく"},
	{"id": "hachi", "name": "ハチ", "color": Color(0.92, 0.76, 0.24), "role": "すばやい手数：何度も癒やす"},
	{"id": "amenbo", "name": "アメンボ", "color": Color(0.5, 0.56, 0.62), "role": "すいすい：水辺を すばやく"},
	{"id": "gengoro", "name": "ゲンゴロウ", "color": Color(0.18, 0.32, 0.24), "role": "がんじょうな盾：癒やしが強い"},
	{"id": "queen_ant", "name": "女王アリ", "color": Color(0.55, 0.2, 0.22), "role": "女王の加護：とても強い癒やし"},
	{"id": "tagame", "name": "タガメ", "color": Color(0.36, 0.31, 0.2), "role": "みずべの ぬし：大きくて力強い"},
	{"id": "hotaru", "name": "ホタル", "color": Color(0.85, 1.0, 0.5), "role": "ともしび：くらやみを 照らす"},
	{"id": "moth", "name": "オオガ", "color": Color(0.42, 0.36, 0.3), "role": "よるの ぬし：大きな羽で 力強い"},
	{"id": "dango", "name": "ダンゴムシ", "color": Color(0.4, 0.42, 0.46), "role": "がんじょうな盾：癒やしが強い"},
	{"id": "kumo", "name": "クモ", "color": Color(0.3, 0.26, 0.3), "role": "すばしっこい：8本足で 速い"},
	{"id": "dustlord", "name": "ホコリのぬし", "color": Color(0.5, 0.47, 0.44), "role": "いえの ぬし：大きくて力強い"},
	{"id": "wata", "name": "ワタムシ", "color": Color(0.9, 0.92, 0.96), "role": "ふわふわ：飛べて 風にのる"},
	{"id": "ageha", "name": "オオアゲハ", "color": Color(0.95, 0.86, 0.3), "role": "そらの ぬし：大きな羽で 力強い"},
	{"id": "sludge_lord", "name": "ヘドロの主", "color": Color(0.28, 0.34, 0.26), "role": "汚れのおおもと"},
]
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
	_biome.custom_minimum_size = Vector2(0, 52)   # 指で押しやすい高さ（子ども・年配の方の誤タップ防止）
	_vbox.add_child(_biome)
	_vbox.move_child(_biome, 2)

	# むずかしさ（敵の強さ）。やさしい=お子さん向け / つよい=クリア後の遊び直し。
	_difficulty = OptionButton.new()
	_difficulty.add_item("やさしい（のんびり）", 0)
	_difficulty.add_item("ふつう", 1)
	_difficulty.add_item("つよい（歯ごたえ）", 2)
	# つよくてニューゲーム＝通しクリア後だけ 4段目「たつじん」を解禁（上級/大人向けのごほうび）。
	if Chapter.cleared:
		_difficulty.add_item("たつじん（クリア後）", 3)
	# 初回は やさしい を既定に（低ストレスが売り＝初見の離脱を防ぐ）。あとで変更可。
	_difficulty.selected = 0 if Net.is_web() else 1
	_difficulty.custom_minimum_size = Vector2(0, 52)
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

	# BGM／効果音の個別スライダー（バス分割済みなので別々に上下できる）。全体スライダーの下に置く。
	var music_s := _add_sub_volume("BGM 音量", Sfx.get_music_volume(), func(v: float) -> void: Sfx.set_music_volume(v), vol)
	var sfx_s := _add_sub_volume("効果音 音量", Sfx.get_sfx_volume(), func(v: float) -> void: Sfx.set_sfx_volume(v), music_s)

	# もじの大きさ（アクセシビリティ）：UI全体を一律で拡大＝小さなお子さん・年配の方にやさしく。
	var size_label := Label.new()
	size_label.text = "もじの 大きさ"
	UIKit.style_label(size_label, 18, UIKit.INK)   # 視認性を上げる機能なので、他の設定と同格の濃さ・大きさに
	_vbox.add_child(size_label)
	_vbox.move_child(size_label, sfx_s.get_index() + 1)
	var size_opt := OptionButton.new()
	size_opt.add_item("ふつう", 0)
	size_opt.add_item("大きい", 1)
	size_opt.add_item("とても大きい", 2)
	size_opt.custom_minimum_size = Vector2(0, 52)
	var cur := UIKit.load_ui_scale()
	size_opt.selected = UIKit.UI_SCALES.find(cur) if UIKit.UI_SCALES.has(cur) else 0
	_vbox.add_child(size_opt)
	_vbox.move_child(size_opt, size_label.get_index() + 1)
	size_opt.item_selected.connect(func(idx: int) -> void: UIKit.save_ui_scale(UIKit.UI_SCALES[idx]))

	# えんしゅつ ひかえめ（光過敏・刺激に敏感な子へ）：赤い被弾フラッシュ・画面ゆれ・記号ふぶきを弱める。
	var fx_btn := CheckButton.new()
	fx_btn.text = "えんしゅつ ひかえめ（ひかり・ゆれ）"
	fx_btn.custom_minimum_size = Vector2(0, 52)
	fx_btn.add_theme_font_size_override("font_size", 18)
	UIKit.load_reduce_fx()
	fx_btn.button_pressed = UIKit.reduce_fx()
	_vbox.add_child(fx_btn)
	_vbox.move_child(fx_btn, size_opt.get_index() + 1)
	fx_btn.toggled.connect(func(on: bool) -> void: UIKit.save_reduce_fx(on))

	_transport.add_item("ENet（PC/Android・低遅延・おすすめ）", Net.Transport.ENET)
	_transport.add_item("WebSocket（ブラウザでも動く）", Net.Transport.WEBSOCKET)
	_transport.selected = 1 if Net.transport == Net.Transport.WEBSOCKET else 0

	# 前回の なまえ を思い出して入れておく
	_name_edit.text = Net.my_display_name

	_solo.pressed.connect(_on_solo)
	_host.pressed.connect(_on_host)
	_join.pressed.connect(_on_join)
	Net.status_changed.connect(func(t: String) -> void: _status.text = t)

	# 初見のつかみ：主役の「はじめる」をなまえの すぐ下＝設定より上へ。
	# 以前は 舞台/むずかしさ/音量/文字サイズ… の下に埋もれ、初見が スクロールしないと 始められなかった。
	# 設定は下に残す（既定のままでも すぐ遊べる）。つづき/れんしゅう は _refresh_title_state が
	# _solo の周りに並べるので、先に solo を上げておけば ひとかたまりで 上に来る。
	_vbox.move_child(_solo, 2)

	_refresh_title_state()
	# 遊び終えてタイトルへ戻ったら「つづきから」やクリア表示を出し直す。
	Net.session_ended.connect(func(_r: String) -> void: _refresh_title_state())
	_build_credits_button()
	_build_dex_button()
	_build_qr_button()

	if Net.is_web():
		_setup_for_browser()
	else:
		_setup_for_app()


# ------------------------------------------------------------ 見た目（絵本の表紙）

## ラベル＋スライダーを1組、基準ノード(after)の直後に差し込む共通処理（音量の小スライダー用）。
## 差し込んだスライダーを返す＝続けて次を その直後に置ける（順番を保つ）。
func _add_sub_volume(label_text: String, initial: float, on_change: Callable, after: Control) -> Control:
	var lbl := Label.new()
	lbl.text = label_text
	UIKit.style_label(lbl, 15, UIKit.INK_SOFT)
	_vbox.add_child(lbl)
	_vbox.move_child(lbl, after.get_index() + 1)
	var s := HSlider.new()
	s.min_value = 0.0
	s.max_value = 1.0
	s.step = 0.05
	s.value = initial
	s.custom_minimum_size = Vector2(0, 34)
	_vbox.add_child(s)
	_vbox.move_child(s, lbl.get_index() + 1)
	s.value_changed.connect(on_change)
	return s


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

	# 初見のつかみ：この game の“独自の売り”を ひとことで。＝倒さない・掃除して みどりを取り戻す。
	# 題字/サブタイトルだけでは伝わらない「たたかわない やさしいゲーム」を 一行で伝える。
	var hook := Label.new()
	hook.name = "Hook"
	hook.text = "たたかわない。よごれを おとして、みどりを とりもどす。"
	hook.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hook.anchor_left = 0.0
	hook.anchor_right = 1.0
	hook.anchor_top = 0.0
	hook.offset_top = 154.0
	hook.offset_bottom = 182.0
	hook.add_theme_font_size_override("font_size", 18)
	hook.add_theme_color_override("font_color", Color(1.0, 0.98, 0.90))
	hook.add_theme_color_override("font_outline_color", Color(0.2, 0.3, 0.2))
	hook.add_theme_constant_override("outline_size", 8)
	hook.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hook)


func _dress_panel() -> void:
	# 生成りの絵本パネルへ。少し下寄せして題字＋ひとことフックの下に置く。縦は設定が入りやすい高さに。
	_panel.offset_top = -176.0
	_panel.offset_bottom = 300.0
	var sb := UIKit.panel(UIKit.CREAM, UIKit.GREEN_DK, 22, 4, 18)
	_panel.add_theme_stylebox_override("panel", sb)
	_vbox.add_theme_constant_override("separation", 12)

	# 設定が多く 画面下で見切れる（最後のトグル/ボタンが押せない）ため、VBox をスクロール領域に入れる。
	# 以降の _vbox.add_child(...) はそのまま効く（_vbox の参照は不変・親が変わるだけ）。
	if _vbox.get_parent() == _panel:
		var scroll := ScrollContainer.new()
		scroll.name = "MenuScroll"
		scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		_panel.add_child(scroll)
		_vbox.reparent(scroll, false)
		_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL

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

	# 生きた表紙：小人の家族が 丘を のんびり歩く（左→右へ、少し速さを変えて隊列に）。
	# 親は大きく・こどもは小さく・いちばん後ろに ちいさな子＝“家族の体温”を表紙に。
	var walk_y := h * 0.80
	var fam := [
		{"c": Color(0.45, 0.78, 0.5), "s": 1.18},   # とうさん（大きい）
		{"c": Color(0.95, 0.55, 0.7), "s": 1.10},   # かあさん
		{"c": Color(0.6, 0.7, 0.95), "s": 0.92},    # こども
		{"c": Color(0.95, 0.85, 0.5), "s": 0.85},   # こども
		{"c": Color(0.8, 0.62, 0.95), "s": 0.68},   # いちばん ちいさな子
	]
	for i in fam.size():
		var speed := 20.0 + i * 4.0
		var wx := fposmod(_t * speed + i * (w * 0.2), w + 80.0) - 40.0
		var sc: float = fam[i]["s"]
		var bob := absf(sin(_t * 4.0 + i)) * 3.0 * sc
		_draw_walker(Vector2(wx, walk_y - bob), fam[i]["c"], _t * 6.0 + i * 1.7, sc)

	# ちょうちょ が 1匹 ひらひら横切る＝空にも動きを。
	var bx := fposmod(_t * 42.0 + w * 0.3, w + 60.0) - 30.0
	var by := h * 0.46 + sin(_t * 1.8) * 46.0
	_draw_butterfly(Vector2(bx, by), Color(0.96, 0.78, 0.9), _t)


## 小さな小人がてくてく歩く（頭＋体＋振れる脚＋足元の影）。手描きふうの表紙に生きた動きを。
## sc＝大きさ（親は大きく・こどもは小さく＝“家族”に見せる）。
func _draw_walker(p: Vector2, col: Color, phase: float, sc: float = 1.0) -> void:
	draw_circle(p + Vector2(0, 11 * sc), 7.0 * sc, Color(0.0, 0.0, 0.0, 0.12))   # 足元の影
	var sw := sin(phase) * 3.0 * sc
	draw_line(p + Vector2(-2 * sc, 5 * sc), p + Vector2(-3 * sc + sw, 13 * sc), col.darkened(0.35), 2.5 * sc)
	draw_line(p + Vector2(2 * sc, 5 * sc), p + Vector2(3 * sc - sw, 13 * sc), col.darkened(0.35), 2.5 * sc)
	draw_circle(p, 7.0 * sc, col)                                          # 体
	draw_circle(p + Vector2(0, -11 * sc), 5.5 * sc, col.lightened(0.12))   # 頭
	# ちいさな目（進行方向＝右向き）
	draw_circle(p + Vector2(2.2 * sc, -12 * sc), 1.1 * sc, Color(0.1, 0.1, 0.12))


## ひらひら舞うちょうちょ（羽ばたきで羽の開き具合が変わる）。加算なしの軽い円で。
func _draw_butterfly(p: Vector2, col: Color, t: float) -> void:
	var f := 0.45 + 0.55 * absf(sin(t * 11.0))   # 羽ばたき（開閉）
	draw_circle(p, 2.0, Color(0.3, 0.2, 0.28))   # 胴
	for sx in [-1.0, 1.0]:
		draw_circle(p + Vector2(6.5 * sx * f, -3.0), 5.0, col)          # 上ばね
		draw_circle(p + Vector2(5.5 * sx * f, 3.5), 3.8, col.darkened(0.08))   # 下ばね


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

	# クリア後のごほうび「のんびり庭」＝章の進行なし・最初からみどり豊かな平和サンドボックス。
	if Chapter.cleared and _vbox.get_node_or_null("FreePlayButton") == null:
		var fp := Button.new()
		fp.name = "FreePlayButton"
		fp.text = "のんびり庭（すきなだけ）"
		fp.custom_minimum_size = Vector2(0, 52)
		UIKit.style_button(fp, Color(0.6, 0.85, 0.62), UIKit.GREEN_DK)
		_vbox.add_child(fp)
		_vbox.move_child(fp, _join.get_index() + 1)
		fp.pressed.connect(_on_free_play)

	# れんしゅう（たたかいなし）＝いつでも選べる やさしい入口。小さな子・初見・刺激に敏感な子へ。
	if _vbox.get_node_or_null("PeacefulButton") == null:
		var pc := Button.new()
		pc.name = "PeacefulButton"
		pc.text = "れんしゅう（たたかいなし）"
		pc.custom_minimum_size = Vector2(0, 52)
		UIKit.style_button(pc, Color(0.72, 0.88, 0.78), UIKit.GREEN_DK)
		_vbox.add_child(pc)
		_vbox.move_child(pc, _solo.get_index() + 1)
		pc.pressed.connect(_on_peaceful)

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


## 「なかま図鑑」ボタン（左下）。癒やした種類を集める＝リプレイ動機。
func _build_dex_button() -> void:
	var btn := Button.new()
	btn.name = "DexButton"
	btn.text = "なかま図鑑"
	btn.anchor_top = 1.0
	btn.anchor_bottom = 1.0
	btn.offset_left = 16.0
	btn.offset_top = -56.0
	btn.offset_right = 160.0
	btn.offset_bottom = -16.0
	UIKit.style_button(btn, UIKit.CREAM_SOLID, UIKit.GREEN_DK)
	btn.add_theme_color_override("font_color", UIKit.INK)
	btn.pressed.connect(_show_dex)
	add_child(btn)


## 「QRでつなぐ」ボタン（下・中央）。別のスマホ/タブレットでこのQRを読むと
## 同じゲームが開く＝ふたりで遊ぶ前の「URLをどう渡すか」を一気に解消する。
func _build_qr_button() -> void:
	var btn := Button.new()
	btn.name = "QrButton"
	btn.text = "QRでつなぐ"
	btn.anchor_left = 0.5
	btn.anchor_right = 0.5
	btn.anchor_top = 1.0
	btn.anchor_bottom = 1.0
	btn.offset_left = -78.0
	btn.offset_top = -56.0
	btn.offset_right = 78.0
	btn.offset_bottom = -16.0
	UIKit.style_button(btn, UIKit.CREAM_SOLID, UIKit.GREEN_DK)
	btn.add_theme_color_override("font_color", UIKit.INK)
	btn.pressed.connect(_show_qr)
	add_child(btn)


func _show_qr() -> void:
	if _qr != null:
		_qr.visible = true
		return
	_qr = Control.new()
	_qr.name = "QrOverlay"
	_qr.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_qr)

	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.5)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_qr.add_child(dim)

	var box := Panel.new()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.offset_left = -230.0
	box.offset_top = -240.0
	box.offset_right = 230.0
	box.offset_bottom = 240.0
	box.add_theme_stylebox_override("panel", UIKit.panel(UIKit.CREAM, UIKit.GREEN_DK, 20, 4, 22))
	_qr.add_child(box)

	var vb := VBoxContainer.new()
	vb.set_anchors_preset(Control.PRESET_FULL_RECT)
	vb.offset_left = 24
	vb.offset_top = 20
	vb.offset_right = -24
	vb.offset_bottom = -20
	vb.add_theme_constant_override("separation", 12)
	box.add_child(vb)

	var head := Label.new()
	head.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.text = "べつの端末で ひらく"
	UIKit.style_label(head, 26, UIKit.GREEN_DK)
	vb.add_child(head)

	var note := Label.new()
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.text = "スマホのカメラで よみとると、同じゲームが ひらくよ。\n（ふたりで遊ぶとき用）"
	UIKit.style_label(note, 18, UIKit.INK)
	vb.add_child(note)

	var center := CenterContainer.new()
	vb.add_child(center)
	var qr_tex := TextureRect.new()
	qr_tex.texture = load("res://assets/join_qr.png")
	qr_tex.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST   # ドットをくっきり（読み取り安定）
	qr_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE         # 元画像サイズに縛られず縮められる
	qr_tex.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	qr_tex.custom_minimum_size = Vector2(230, 230)
	# 白い余白（クワイエットゾーン）を確保して読み取りやすく。
	var qr_bg := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(1, 1, 1)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(10)
	qr_bg.add_theme_stylebox_override("panel", sb)
	qr_bg.add_child(qr_tex)
	center.add_child(qr_bg)

	var close := Button.new()
	close.text = "とじる"
	close.custom_minimum_size = Vector2(0, 48)
	UIKit.style_button(close, UIKit.GREEN, UIKit.GREEN_DK)
	close.pressed.connect(func() -> void:
		if _qr != null:
			_qr.visible = false)
	vb.add_child(close)


func _show_dex() -> void:
	if _dex != null:
		_dex.queue_free()   # 開くたび最新の集計で作り直す
		_dex = null
	var counts := Chapter.dex_counts()
	var found := 0
	var total_caught := 0
	for sp in DEX_SPECIES:
		var c := int(counts.get(sp["id"], 0))
		if c > 0:
			found += 1
		total_caught += c
	var comp := int(round(100.0 * float(found) / float(DEX_SPECIES.size())))

	_dex = Control.new()
	_dex.name = "Dex"
	_dex.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_dex)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.5)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_dex.add_child(dim)

	var box := Panel.new()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.offset_left = -300.0
	box.offset_top = -260.0
	box.offset_right = 300.0
	box.offset_bottom = 260.0
	box.add_theme_stylebox_override("panel", UIKit.panel(UIKit.CREAM, UIKit.GREEN_DK, 20, 4, 22))
	_dex.add_child(box)

	var vb := VBoxContainer.new()
	vb.set_anchors_preset(Control.PRESET_FULL_RECT)
	vb.offset_left = 26
	vb.offset_top = 20
	vb.offset_right = -26
	vb.offset_bottom = -70
	vb.add_theme_constant_override("separation", 6)
	box.add_child(vb)

	var complete := found >= DEX_SPECIES.size()
	var head := Label.new()
	head.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.text = "なかま図鑑　%d / %d しゅるい　コンプ %d%%" % [found, DEX_SPECIES.size(), comp]
	if complete:
		head.text += "　★コンプリート！★"
	UIKit.style_label(head, 26, UIKit.GREEN_DK)
	vb.add_child(head)

	# 達成感：あつめた種類の進み具合を “のびる帯”で見える化（数字だけより 集めたくなる）。
	# コンプで 金色に変わる＝やり込みのごほうびが 一目で分かる。
	var bar := ProgressBar.new()
	bar.min_value = 0.0
	bar.max_value = float(DEX_SPECIES.size())
	bar.value = float(found)
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(0, 20)
	var bar_bg := StyleBoxFlat.new()
	bar_bg.bg_color = Color(0.86, 0.84, 0.74)          # 生成りの受け皿
	bar_bg.set_corner_radius_all(10)
	var bar_fg := StyleBoxFlat.new()
	bar_fg.bg_color = UIKit.GOLD if complete else UIKit.GREEN   # 進み＝緑／コンプ＝金
	bar_fg.set_corner_radius_all(10)
	bar.add_theme_stylebox_override("background", bar_bg)
	bar.add_theme_stylebox_override("fill", bar_fg)
	vb.add_child(bar)

	# 累計とバッジの凡例＝「同じ種を集めるほど バッジが育つ」やり込みを一目で伝える。
	var sub := Label.new()
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.text = "あつめた なかま ぜんぶで ×%d　／　バッジ：◆5 ◆◆15 ◆◆◆40" % total_caught
	UIKit.style_label(sub, 15, UIKit.INK_SOFT)
	vb.add_child(sub)

	# 19種ぶんは1画面に収まらない＝スクロールできる一覧にする（溢れ・見切れの解消）。
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	vb.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 6)
	scroll.add_child(list)

	var tier_cols := [Color(0.74, 0.52, 0.34), Color(0.68, 0.71, 0.76), UIKit.GOLD]  # 銅/銀/金
	for sp in DEX_SPECIES:
		var n := int(counts.get(sp["id"], 0))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		list.add_child(row)
		var sw := ColorRect.new()
		sw.custom_minimum_size = Vector2(30, 30)
		sw.color = (sp["color"] as Color) if n > 0 else Color(0.5, 0.5, 0.5, 0.5)
		row.add_child(sw)
		# 名前＋役割（見つけていれば）を縦に。役割を見せる＝「この虫を集める意味」が伝わる。
		var col := VBoxContainer.new()
		col.custom_minimum_size = Vector2(258, 0)
		col.add_theme_constant_override("separation", 0)
		row.add_child(col)
		var nm := Label.new()
		nm.text = str(sp["name"]) if n > 0 else "？？？"
		UIKit.style_label(nm, 22, UIKit.INK)
		col.add_child(nm)
		if n > 0:
			var role := Label.new()
			role.text = str(sp.get("role", ""))
			UIKit.style_label(role, 15, UIKit.INK_SOFT)
			col.add_child(role)
		# バッジ（段位）＝同じ種の累計で 銅→銀→金。集める手ごたえを見える化。
		var tier := Chapter.dex_tier(n)
		var badge := Label.new()
		badge.custom_minimum_size = Vector2(96, 0)
		if n <= 0:
			badge.text = ""
		elif tier == 0:
			badge.text = "なかま"
			UIKit.style_label(badge, 16, UIKit.INK_SOFT)
		else:
			badge.text = "◆".repeat(tier) + " " + str(Chapter.DEX_TIER_NAMES[tier - 1])
			UIKit.style_label(badge, 16, tier_cols[tier - 1])
		row.add_child(badge)
		var cnt := Label.new()
		cnt.text = ("×%d" % n) if n > 0 else "まだ"
		UIKit.style_label(cnt, 20, UIKit.GREEN_DK if n > 0 else Color(0.5, 0.5, 0.5))
		row.add_child(cnt)

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
	close.pressed.connect(func() -> void:
		if _dex != null:
			_dex.queue_free()
			_dex = null)
	box.add_child(close)


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
	# 直前につないだ相手を覚えていれば入れておく＝切れた後の再参加が1タップ。
	var last := Net.last_join_address()
	_addr_edit.text = last if last != "" else "127.0.0.1"
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
		# 攻撃力・体力・湧きの速さの3つをまとめて設定（参加者へも配られる）。
		Net.set_difficulty(_difficulty.selected)


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


## のんびり庭（クリア後のごほうび）：舞台は庭に固定・章オフで始める。ひとりでも相手が来てもOK。
func _on_free_play() -> void:
	_sync_settings()
	Net.world_biome = "garden"   # のんびり庭は 庭に固定
	Chapter.start_free_play()
	Net.start_solo()


## れんしゅう（たたかいなし）：庭に固定・章オフ・敵ゼロで始める。掃除と収集だけの安心の入口。
func _on_peaceful() -> void:
	_sync_settings()
	Net.world_biome = "garden"
	Chapter.start_peaceful()
	Net.start_solo()


func _on_join() -> void:
	_sync_settings()
	# 参加側は ホストの進行に従う＝直前の のんびり庭/れんしゅう のフラグを持ち越さない
	# （持ち越すと 参加直後だけ 目的表示や 本を開く導入が おかしくなる）。
	Chapter.free_play = false
	Chapter.peaceful = false
	Net.join(_addr_edit.text.strip_edges())
