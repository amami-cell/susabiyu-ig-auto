extends Control
## 物語UI：目的表示(上)・会話ボックス(下・タップで送る)・章クリアの大バナー(中央)。
## Chapter(自動読み込み)の signal を受けて描くだけ。全機種で読める大きめ文字＋フチどり。

var _lines: PackedStringArray = []
var _idx := 0
var _auto := 0.0

# バトル中の会話は自動で出さず、この「おはなし」ボタンで“読みたいとき”に読む＝戦闘の邪魔をしない。
var _pending_lines: PackedStringArray = []
var _talk_btn: Button = null

var _obj: Label
var _box: Panel
var _text: Label
var _speaker_tag: Label = null   # 会話ボックス左上の名札＝“誰のセリフか”を 名前＋色で示す
var _hint: Label
var _catch: Button
var _banner: Label
var _banner_t := 0.0
var _title_btn: Button = null   # エンディング後の「タイトルへ」
var _result_card: Panel = null  # クリア結果カード
var _result_dim: ColorRect = null   # 結果カードの後ろの やわらかい暗幕（余韻）
var _start_msec := 0            # プレイ開始時刻（結果の「じかん」用）


func _ready() -> void:
	# $UI は CanvasLayer なので、Control 側で明示的にビューポート全面へ広げる
	# （0サイズだと子のアンカーが潰れて会話ボックスが崩れるため）。
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	size = get_viewport().get_visible_rect().size
	get_viewport().size_changed.connect(func() -> void:
		size = get_viewport().get_visible_rect().size)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build()
	Chapter.dialogue.connect(show_dialogue)
	Chapter.objective_changed.connect(set_objective)
	Chapter.banner.connect(show_banner)
	Chapter.chapter_cleared.connect(_celebrate_chapter)   # 舞台ごとに違う ごほうび演出
	# プレイ時間の起点（結果カードで「じかん」を出す）。＋物語モードは「本を開く」映画的な入り。
	Net.session_started.connect(func() -> void:
		_start_msec = Time.get_ticks_msec()
		if Net.world_biome == "garden" and not Chapter.free_play:
			_open_cover())
	# セッション終了（タイトルへ戻る）時に、結果カード/ボタンが残らないよう片づける。
	Net.session_ended.connect(func(_r: String) -> void:
		if _result_card != null:
			_result_card.queue_free()
			_result_card = null
		if _title_btn != null:
			_title_btn.queue_free()
			_title_btn = null
		if _result_dim != null:
			_result_dim.queue_free()
			_result_dim = null
		_pending_lines = PackedStringArray()
		if _talk_btn != null:
			_talk_btn.visible = false)


func _build() -> void:
	# 目的（上・中央・HUDバーの下）
	_obj = Label.new()
	_obj.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_obj.anchor_left = 0.0
	_obj.anchor_right = 1.0
	_obj.anchor_top = 0.0
	_obj.anchor_bottom = 0.0
	_obj.offset_left = 220.0
	_obj.offset_right = -220.0
	_obj.offset_top = 92.0
	_obj.offset_bottom = 140.0
	_obj.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_obj.add_theme_stylebox_override("normal", UIKit.panel(Color(0.34, 0.58, 0.3, 0.92), UIKit.GREEN, 18, 3, 10))
	UIKit.style_label(_obj, 24, Color(1, 1, 1), 4, Color(0.12, 0.24, 0.14, 0.95))
	_obj.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_obj.visible = false   # 目的がまだ無いとき（タイトル画面など）は出さない＝空の緑バーを防ぐ
	add_child(_obj)

	# 「おはなし」ボタン（左上・小さめ）。バトル中に会話がたまっているときだけ出る。
	# 押すと そのとき会話を読める＝自動で画面を覆わない（戦闘の視界と操作を守る）。
	_talk_btn = Button.new()
	_talk_btn.text = "▶ おはなし"   # ※同梱フォント(IPAゴシック)に絵文字は無い＝収録記号だけを使う
	_talk_btn.anchor_top = 0.0
	_talk_btn.anchor_bottom = 0.0
	_talk_btn.offset_left = 16.0
	_talk_btn.offset_top = 150.0
	_talk_btn.offset_right = 168.0
	_talk_btn.offset_bottom = 194.0
	UIKit.style_button(_talk_btn, UIKit.GOLD, Color(0.82, 0.6, 0.24))
	_talk_btn.add_theme_font_size_override("font_size", 18)
	_talk_btn.visible = false
	_talk_btn.pressed.connect(_open_pending)
	add_child(_talk_btn)

	_box = Panel.new()
	_box.anchor_left = 0.0
	_box.anchor_right = 1.0
	_box.anchor_top = 1.0
	_box.anchor_bottom = 1.0
	_box.offset_left = 24
	_box.offset_right = -24
	_box.offset_top = -196
	_box.offset_bottom = -24
	_box.add_theme_stylebox_override("panel", UIKit.panel(UIKit.CREAM, UIKit.GREEN, 22, 4, 20))
	_box.visible = false
	add_child(_box)

	# 会話ボックスの左上の名札＝話者名を色つきで（誰のセリフか ひと目で）。地の文は「おはなし」。
	_speaker_tag = Label.new()
	_speaker_tag.text = "  おはなし  "
	_speaker_tag.add_theme_stylebox_override("normal", UIKit.panel(UIKit.GREEN_DK, UIKit.GREEN, 12, 0, 6))
	UIKit.style_label(_speaker_tag, 18, Color(1, 1, 1))
	_speaker_tag.position = Vector2(14, -16)
	_speaker_tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_box.add_child(_speaker_tag)

	# タップ受けは会話ボックスの範囲だけ（画面中央〜左の移動操作は邪魔しない）
	_catch = Button.new()
	_catch.set_anchors_preset(Control.PRESET_FULL_RECT)
	_catch.flat = true
	_catch.modulate = Color(1, 1, 1, 0)
	_catch.pressed.connect(_advance)
	_box.add_child(_catch)

	_text = Label.new()
	_text.anchor_left = 0.0
	_text.anchor_right = 1.0
	_text.anchor_top = 0.0
	_text.anchor_bottom = 1.0
	_text.offset_left = 20
	_text.offset_top = 16
	_text.offset_right = -20
	_text.offset_bottom = -40
	_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_text.add_theme_font_size_override("font_size", 28)
	_text.add_theme_color_override("font_color", UIKit.INK)
	_text.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_box.add_child(_text)

	_hint = Label.new()
	_hint.text = "タップで つぎへ ▶"
	_hint.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	_hint.offset_left = -240
	_hint.offset_top = -34
	_hint.offset_right = -16
	_hint.offset_bottom = -8
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	UIKit.style_label(_hint, 18, UIKit.GREEN_DK)
	_hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_box.add_child(_hint)

	# 章クリア等の大バナー（中央）
	_banner = Label.new()
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.set_anchors_preset(Control.PRESET_CENTER)
	_banner.offset_left = -420
	_banner.offset_right = 420
	_banner.offset_top = -60
	_banner.offset_bottom = 60
	_banner.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_banner.add_theme_font_size_override("font_size", 52)
	_banner.add_theme_color_override("font_color", Color(1, 1, 0.8))
	_banner.add_theme_color_override("font_outline_color", Color(0.1, 0.15, 0.1))
	_banner.add_theme_constant_override("outline_size", 12)
	_banner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_banner.visible = false
	add_child(_banner)


func set_objective(text: String) -> void:
	var was_vis := _obj.visible
	_obj.text = text
	_obj.visible = text != ""
	# 初めて出るときだけ ふわっとフェードイン（残数の更新ごとには点滅させない）。
	if _obj.visible and not was_vis:
		_obj.modulate = Color(1, 1, 1, 0)
		create_tween().tween_property(_obj, "modulate:a", 1.0, 0.25)


## 会話ボックスを ふわっと出す：フェード＋下から少しスライド。ひかえめ時はスライドなし。
func _appear_box() -> void:
	_box.visible = true
	_catch.visible = true
	_box.modulate = Color(1, 1, 1, 1)
	var rest_top := -196.0
	var rest_bot := -24.0
	if UIKit.reduce_fx():
		_box.offset_top = rest_top
		_box.offset_bottom = rest_bot
		_box.modulate = Color(1, 1, 1, 0)
		create_tween().tween_property(_box, "modulate:a", 1.0, 0.2)
		return
	_box.modulate = Color(1, 1, 1, 0)
	_box.offset_top = rest_top + 42.0
	_box.offset_bottom = rest_bot + 42.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(_box, "modulate:a", 1.0, 0.22)
	tw.tween_property(_box, "offset_top", rest_top, 0.30).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(_box, "offset_bottom", rest_bot, 0.30).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func show_dialogue(lines: PackedStringArray) -> void:
	# バトル中の会話は自動で出さない＝戦闘の視界と操作ボタンを覆わない。
	# 代わりに「おはなし」ボタンに ためておき、読みたいときに読める。
	if not lines.is_empty() and Chapter.has_method("is_action_beat") and Chapter.is_action_beat():
		_pending_lines = lines
		if _talk_btn != null:
			_talk_btn.visible = true
		return
	# 落ち着いた場面（物語・掃除・収集・謎解き・エンディング等）は従来どおり自動で出す。
	_pending_lines = PackedStringArray()
	if _talk_btn != null:
		_talk_btn.visible = false
	_lines = lines
	_idx = 0
	if _lines.is_empty():
		_hide_box()
		return
	_appear_box()
	_set_play_ui(false)   # お話中は操作ボタン等を隠して重なりを防ぐ
	_show_line()


## 「おはなし」ボタンで、ためておいたバトル中の会話を読む（読みたいときだけ）。
func _open_pending() -> void:
	if _pending_lines.is_empty():
		return
	if _talk_btn != null:
		_talk_btn.visible = false
	_lines = _pending_lines
	_pending_lines = PackedStringArray()
	_idx = 0
	_appear_box()
	_set_play_ui(false)
	_show_line()


## 会話中だけ、操作ボタン・HP等のプレイUIを隠す（会話ボックスと重ならないように）。
func _set_play_ui(vis: bool) -> void:
	for path in ["../TouchPad/Buttons", "../Hud/Bottom"]:
		var n := get_node_or_null(path)
		if n != null:
			n.visible = vis
	get_tree().call_group("play_ui_extra", "set_visible", vis)


func _show_line() -> void:
	if _idx >= _lines.size():
		_hide_box()
		return
	var line: String = _lines[_idx]
	# 「名前「セリフ」」形式なら 名前を色つき名札に出し、本文はセリフだけに＝“誰のセリフか”が分かる。
	var qi := line.find("「")
	var sp := line.substr(0, qi).strip_edges() if qi > 0 else ""
	if sp != "" and sp.length() <= 6:
		_speaker_tag.text = "  " + sp + "  "
		_speaker_tag.add_theme_stylebox_override("normal", UIKit.panel(_speaker_color(sp), UIKit.GREEN, 12, 0, 6))
		_text.text = line.substr(qi)   # 「…」だけ＝名前の重複を消して読みやすく
	else:
		_speaker_tag.text = "  おはなし  "
		_speaker_tag.add_theme_stylebox_override("normal", UIKit.panel(UIKit.GREEN_DK, UIKit.GREEN, 12, 0, 6))
		_text.text = line
	# 自動送りは文の長さに比例（読み聞かせ・早い読者どちらも置き去りにしない）。タップで即次へ。
	# 以前は一律4秒＝親が読み上げ切る前/子が読み切る前に流れて“えほん”が置き去りになっていた。
	_auto = clampf(3.0 + float(line.length()) * 0.16, 4.5, 11.0)
	Sfx.play("pickup", -22.0)   # 文字送りの小さな合図


## 話者ごとの名札の色（誰のセリフか 色でも分かる）。役割は固定色、子どもらは名前で葉色を少し変える。
func _speaker_color(name: String) -> Color:
	if name in ["父", "夫", "とうさん", "パパ", "おとう"]:
		return Color(0.42, 0.60, 0.90)   # とうさん＝青
	if name in ["母", "かあさん", "ママ", "おかあ"]:
		return Color(0.90, 0.52, 0.68)   # かあさん＝桃
	if name in ["おじい", "じい", "おじいちゃん", "そふ"]:
		return Color(0.72, 0.56, 0.32)   # おじい＝茶
	if name == "みんな":
		return Color(0.5, 0.72, 0.5)     # 家族みんな＝みどり
	# こども達＝葉っぱ色。名前で 色相をわずかに散らして 見分けやすく（緑〜黄緑の帯に収める）。
	var h := absi(name.hash())
	return Color.from_hsv(0.24 + float(h % 60) / 60.0 * 0.14, 0.55, 0.72)


func _advance() -> void:
	if not _box.visible:
		return
	_idx += 1
	_show_line()


func _hide_box() -> void:
	_box.visible = false
	_catch.visible = false
	_set_play_ui(true)
	# 会話を読み終えた合図（会話だけのビート＝章の区切り/エンディングを次へ進める）。
	if Chapter.has_method("notify_dialogue_done"):
		Chapter.notify_dialogue_done()


func show_banner(text: String) -> void:
	# 章の始まりのタイトル（「第X章 …」でクリアでない）は 絵本の“ページめくり”で見せる。
	if ("第" in text) and ("章" in text) and not ("クリア" in text):
		_page_turn(text)
		return
	_banner.text = text
	_banner.visible = true
	_banner.modulate = Color(1, 1, 1, 0)
	_banner_t = 3.2
	var tw := create_tween()
	tw.tween_property(_banner, "modulate:a", 1.0, 0.4)
	# エンディングのバナーには「結果カード」を出す（余韻の後にふわっと・共有の起点）。
	if "おわり" in text:
		Sfx.play("ending", -3.0)   # 最大の頂点＝無音にしない、8.8秒の締めの余韻
		_show_result_card()        # 先に用意（結果カード・暗幕）
		_closing_spread()          # その上に 締めの見開き＝フェードアウトで 結果カードへ開く


## 表紙／裏表紙の一枚（クリーム色のページに 大きなタイトル＋副題）。開始と終了の“映画的な両端”に使う。
func _cover_page(title: String, subtitle: String) -> Panel:
	var page := Panel.new()
	page.set_anchors_preset(Control.PRESET_FULL_RECT)
	page.add_theme_stylebox_override("panel", UIKit.panel(UIKit.CREAM_SOLID, UIKit.GREEN_DK, 0, 0, 0))
	page.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var vb := VBoxContainer.new()
	vb.set_anchors_preset(Control.PRESET_CENTER)
	vb.alignment = BoxContainer.ALIGNMENT_CENTER
	vb.offset_left = -480.0
	vb.offset_right = 480.0
	vb.offset_top = -100.0
	vb.offset_bottom = 100.0
	vb.add_theme_constant_override("separation", 16)
	page.add_child(vb)
	var t := Label.new()
	t.text = title
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_font_size_override("font_size", 60)
	t.add_theme_color_override("font_color", UIKit.GREEN_DK)
	vb.add_child(t)
	var s := Label.new()
	s.text = subtitle
	s.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	s.add_theme_font_size_override("font_size", 26)
	s.add_theme_color_override("font_color", UIKit.GOLD.darkened(0.3))
	vb.add_child(s)
	add_child(page)
	return page


## 本を開く：開始時、表紙が めくれて世界へ（絵本の“映画的な入り”＋シーンの組み上がりも隠す）。
func _open_cover() -> void:
	var w := size.x
	var page := _cover_page("みどりのはじまり", "〜 小人一家の えほん 〜")
	var spine := ColorRect.new()
	spine.color = Color(0.1, 0.14, 0.1, 0.28)
	spine.anchor_top = 0.0
	spine.anchor_bottom = 1.0
	spine.offset_left = 0.0
	spine.offset_right = 26.0
	spine.mouse_filter = Control.MOUSE_FILTER_IGNORE
	page.add_child(spine)
	var tw := create_tween()
	tw.tween_interval(2.0)                                                                                # 表紙を見せる間
	tw.tween_property(page, "position:x", -w, 0.7).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)   # めくって世界へ
	tw.tween_callback(page.queue_free)


## 本を閉じる：エンディングで 締めの見開き（〜おわり〜）を ふわっと出して、結果カードへ渡す。
func _closing_spread() -> void:
	var page := _cover_page("みどりのはじまり", "〜 おわり 〜")
	page.modulate = Color(1, 1, 1, 0)
	var tw := create_tween()
	tw.tween_property(page, "modulate:a", 1.0, 0.9)   # 世界が しずかに 紙へ
	tw.tween_interval(2.4)
	tw.tween_property(page, "modulate:a", 0.0, 0.8)   # 結果カードへ 引き渡す（被り窓を短く＝タイトルが成績に重なる時間を最小化）
	tw.tween_callback(page.queue_free)


## 章の始まりを 絵本の“ページめくり”で見せる：クリーム色のページが右から差し込み、章タイトルを
## 中央に載せて めくり返す。全機種で軽い（Panel＋Label のスライドのみ）。
func _page_turn(title: String) -> void:
	var w := size.x
	var page := Panel.new()
	page.set_anchors_preset(Control.PRESET_FULL_RECT)
	page.add_theme_stylebox_override("panel", UIKit.panel(UIKit.CREAM_SOLID, UIKit.GREEN_DK, 0, 0, 0))
	page.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# 最初から画面を覆う＝この不透明ページの裏で 舞台/回復が切り替わる（＝継ぎ目を一切見せない）。
	# 通信で少し遅れて届くクライアント側の切替も、1.1秒の被覆の内側に収まる＝どの画面でも継ぎ目なし。
	page.position.x = 0.0
	add_child(page)
	# ページの綴じ目（先端）に細い影＝紙をめくる立体感。
	var spine := ColorRect.new()
	spine.color = Color(0.1, 0.14, 0.1, 0.28)
	spine.anchor_top = 0.0
	spine.anchor_bottom = 1.0
	spine.offset_left = 0.0
	spine.offset_right = 26.0
	spine.mouse_filter = Control.MOUSE_FILTER_IGNORE
	page.add_child(spine)
	# 章タイトル（ページの中央）。「第X章」＋「タイトル」＋その章の“一言”を 縦に重ねて 物語へ引き込む。
	var chap := title
	var name := ""
	var b := title.find("「")
	if b >= 0:
		chap = title.substr(0, b).strip_edges()   # 「第X章」
		name = title.substr(b).strip_edges()        # 「…」
	# 章ごとの ひとこと（舞台の情景を そっと予告＝没入）。タイトル文字列で引く。
	var moods := {
		"たどり着いた隙間": "小さな家族の、あたらしい すみか。",
		"そとの世界へ": "とびらの むこうへ、はじめの 一歩。",
		"にごった みずべ": "よどんだ 水を、すきとおる 水に。",
		"よるの もり": "くらい 森に、月あかりを とりもどす。",
		"いえの なか": "ほこりの 部屋に、あたたかい 陽を。",
		"そら": "雲の うえまで、みどりを とどけよう。",
	}
	var mood := ""
	for k in moods.keys():
		if k in title:
			mood = String(moods[k])
			break

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	page.add_child(center)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	center.add_child(col)
	var _pl := func(t: String, sz: int, col_c: Color) -> void:
		if t == "":
			return
		var l := Label.new()
		l.text = t
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		l.add_theme_font_size_override("font_size", sz)
		l.add_theme_color_override("font_color", col_c)
		col.add_child(l)
	_pl.call(chap, 24, UIKit.GREEN)                 # 第X章（小さく）
	_pl.call(name if name != "" else title, 46, UIKit.GREEN_DK)   # 「タイトル」（大きく）
	_pl.call(mood, 20, UIKit.INK_SOFT)             # ひとこと（そっと）
	Sfx.play("pickup", -12.0)   # 紙をめくる小さな合図
	var tw := create_tween()
	tw.tween_interval(1.25)                                                                                # タイトルを見せる間（既に覆っている＝裏で切替）
	tw.tween_property(page, "position:x", -w, 0.55).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)   # めくり切って 新しい世界へ
	tw.tween_callback(page.queue_free)


## エンディング後だけ出すクリア結果カード：なかま数・みどり%・じかん・なまえ＋共有／タイトル。
func _show_result_card() -> void:
	if _result_card != null:
		return
	# 主題歌のリプライズ：エンディングの和音が landing してから、タイトルの旋律を そっと帰す。
	var rt := create_tween()
	rt.tween_interval(3.2)
	rt.tween_callback(Sfx.ending_reprise)
	var allies := get_tree().get_nodes_in_group("ally").size()
	var green := int(round(WorldState.recovery * 100.0))
	var secs := (Time.get_ticks_msec() - _start_msec) / 1000 if _start_msec > 0 else 0
	# 咲かせた花＝「自分が治した手あと」の総数（B1）。クリアの成績に出して達成感を締める。
	var gnode := get_tree().get_first_node_in_group("garden")
	var blooms := int(gnode.blooms_placed()) if gnode != null and gnode.has_method("blooms_placed") else 0

	# 余韻のための やわらかい暗幕＝カードに目が行く（生き返った庭は うっすら透けて見える）。
	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.06, 0.10, 0.06, 0.0)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(dim)
	_result_dim = dim
	create_tween().tween_property(dim, "color:a", 0.34, 1.2)
	var names: Array[String] = []
	for id in Net.roster:
		names.append(str(Net.roster[id]["name"]))
	var who := "・".join(names) if not names.is_empty() else Net.my_display_name

	_result_card = Panel.new()
	_result_card.set_anchors_preset(Control.PRESET_CENTER)
	_result_card.offset_left = -280
	_result_card.offset_right = 280
	_result_card.offset_top = -210
	_result_card.offset_bottom = 210
	_result_card.add_theme_stylebox_override("panel", UIKit.panel(UIKit.CREAM, UIKit.GREEN_DK, 24, 4, 22))
	_result_card.modulate = Color(1, 1, 1, 0)
	# 登場の“ふわっ”：中心から少しだけ大きくなって着地（共有スクショ映え）。ひかえめ時はフェードのみ。
	if not UIKit.reduce_fx():
		_result_card.pivot_offset = Vector2(280, 210)
		_result_card.scale = Vector2(0.9, 0.9)
	add_child(_result_card)

	var vb := VBoxContainer.new()
	vb.set_anchors_preset(Control.PRESET_FULL_RECT)
	vb.offset_left = 26
	vb.offset_top = 22
	vb.offset_right = -26
	vb.offset_bottom = -22
	vb.add_theme_constant_override("separation", 10)
	_result_card.add_child(vb)

	var ttl := Label.new()
	ttl.text = "クリア！ ありがとう"
	ttl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	UIKit.style_label(ttl, 30, UIKit.GREEN_DK)
	vb.add_child(ttl)

	# 本のタイトルを入れて 共有スクショだけで「これは何のゲームか」が分かるように。
	var sub := Label.new()
	sub.text = "絵本『みどりのはじまり』"
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	UIKit.style_label(sub, 18, UIKit.GREEN_DK)
	vb.add_child(sub)

	# みどり回復に応じた ★評価（1〜3）＝一目で伝わる成績・共有の話のタネ。
	var stars_n := 1 + (1 if green >= 70 else 0) + (1 if green >= 95 else 0)
	var stars := Label.new()
	stars.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stars.text = "★".repeat(stars_n) + "☆".repeat(3 - stars_n)
	UIKit.style_label(stars, 34, UIKit.GOLD)
	vb.add_child(stars)

	var stat := Label.new()
	stat.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stat.text = "なかま ●×%d　　みどり %d%%\n咲かせた花 ＊×%d\nじかん %d:%02d　　%s" % [allies, green, blooms, secs / 60, secs % 60, who]
	UIKit.style_label(stat, 22, UIKit.INK)
	vb.add_child(stat)

	# なかま図鑑の進み具合＝もう一周する動機（コンプ）を、達成のこの瞬間に見せる。
	var dex_found := Chapter.dex_counts().size()
	var dex := Label.new()
	dex.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var dex_total := 19   # なかま図鑑の全種数（hud.gd DEX_TOTAL / lobby.gd DEX_SPECIES と一致）
	if dex_found >= dex_total:
		dex.text = "なかま図鑑　%d / %d しゅるい　コンプリート！" % [dex_total, dex_total]
	else:
		dex.text = "なかま図鑑　%d / %d しゅるい　（あと %d しゅるい！）" % [dex_found, dex_total, dex_total - dex_found]
	UIKit.style_label(dex, 20, UIKit.GOLD.darkened(0.35))
	vb.add_child(dex)

	var msg := Label.new()
	msg.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	msg.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	msg.text = "倒さず、みどりを とりもどした。\nこの絵本を だれかに 教えてね。"
	UIKit.style_label(msg, 18, UIKit.GREEN_DK)
	vb.add_child(msg)

	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 14)
	vb.add_child(row)

	if Net.is_web():
		var share := Button.new()
		share.text = "みんなに 教える"
		share.custom_minimum_size = Vector2(0, 50)
		UIKit.style_button(share, UIKit.GOLD, Color(0.82, 0.6, 0.24))
		row.add_child(share)
		share.pressed.connect(_on_share)

	var back := Button.new()
	back.text = "タイトルへ ▶"
	back.custom_minimum_size = Vector2(0, 50)
	UIKit.style_button(back, UIKit.GREEN, UIKit.GREEN_DK)
	row.add_child(back)
	back.pressed.connect(func() -> void: Net.leave("タイトルに戻りました"))

	var tw := create_tween()
	# 締めの見開き(みどりのはじまり/〜おわり〜)が“消え始める”のに合わせてカードを立ち上げる＝
	# タイトルと成績が同時に くっきり重なる時間をなくし、見開き→カードの きれいな溶明にする
	# （共有の一枚が 文字被りで汚れないように）。※ _closing_spread は 0.9+2.4=3.3秒で消え始める。
	tw.tween_interval(3.3)
	# カードが出る瞬間に 競合するHUD（めあて・会話ボックス・中央バナー）を消す＝
	# クリアの“共有の一枚”を すっきり見せる（結果カードに集中させる）。
	tw.tween_callback(func() -> void:
		if _obj != null:
			_obj.visible = false
		if _banner != null:
			_banner.visible = false
		if _box != null:
			_box.visible = false
		if _catch != null:
			_catch.visible = false
		# 画面上のプニコン（移動スティックの輪）や操作ボタンも消す＝“共有の一枚”をすっきり。
		# 結果画面は終端なので操作UIは不要（進むのはカード上の「タイトルへ」だけ）。
		var tp := get_node_or_null("../TouchPad")
		if tp != null:
			tp.visible = false)
	tw.tween_property(_result_card, "modulate:a", 1.0, 0.6)
	if not UIKit.reduce_fx():
		tw.parallel().tween_property(_result_card, "scale", Vector2.ONE, 0.6).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


## 章ごとの ごほうび演出のレシピ（舞台ごとに 記号・色・ひとこと・向きが違う）。
## meadow=第1章の芽ぶき / bloom=第2章の最初の一輪 / water=みずべ / night=よる / house=いえ / sky=そら。
## ★記号は 同梱フォント(IPAゴシック)に収録されているものだけを使う（絵文字は □ になるため不可）。
const CELEBRATE := {
	"meadow": {"marks": ["★", "☆", "◎", "○", "＊", "♪"], "tint": Color(0.6, 0.88, 0.42), "line": "はじまりの みどりが ひろがった", "rise": true},
	"bloom":  {"marks": ["♥", "♡", "★", "☆", "◎", "＊"], "tint": Color(1.0, 0.72, 0.82), "line": "さいしょの 一輪が 咲いた", "rise": true},
	"water":  {"marks": ["○", "◎", "◇", "☆", "♪", "○"], "tint": Color(0.52, 0.82, 1.0), "line": "川が すきとおった", "rise": true},
	"night":  {"marks": ["★", "☆", "◆", "・", "☆", "★"], "tint": Color(1.0, 0.95, 0.6), "line": "よるに ひかりが もどった", "rise": true},
	"house":  {"marks": ["★", "☆", "◆", "◇", "♪", "＊"], "tint": Color(1.0, 0.9, 0.72), "line": "ゆかに ひかりが さした", "rise": true},
	"sky":    {"marks": ["★", "☆", "☁", "○", "♪", "☆"], "tint": Color(1.0, 0.86, 0.42), "line": "そらまで みどりが とどいた", "rise": false},
}


## 章の山場を越えた瞬間に呼ばれる（Chapter.chapter_cleared・全員の画面で同時）。
## 舞台ごとに違う 記号が 画面いっぱいに 舞い、ひとこと が ふわっと出る＝章ごとの締めの差別化。
func _celebrate_chapter(theme: String) -> void:
	var t: Dictionary = CELEBRATE.get(theme, CELEBRATE["meadow"])
	var vp := get_viewport().get_visible_rect().size

	# “光があふれる”瞬間＝中央からふわっと広がる やわらかな光。記号ふぶきの前に、いちばん奥へ。
	# ゆっくり出す(0.35s)＝ストロボにしない。えんしゅつ ひかえめ時は うんと淡く。
	var tint: Color = t["tint"]
	var grad := Gradient.new()
	grad.set_color(0, Color(1, 1, 1, 1))
	grad.set_color(1, Color(1, 1, 1, 0))
	var gtex := GradientTexture2D.new()
	gtex.gradient = grad
	gtex.fill = GradientTexture2D.FILL_RADIAL
	gtex.fill_from = Vector2(0.5, 0.5)
	gtex.fill_to = Vector2(1.0, 0.5)
	gtex.width = 256
	gtex.height = 256
	var glow := TextureRect.new()
	glow.texture = gtex
	glow.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	glow.stretch_mode = TextureRect.STRETCH_SCALE
	# 画面より一回り大きく＝縁のケラレを出さず 全体を淡く満たす。
	glow.size = vp * 1.6
	glow.position = -vp * 0.3
	glow.pivot_offset = glow.size * 0.5
	glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var peak := 0.22 if UIKit.reduce_fx() else 0.5
	glow.modulate = Color(minf(tint.r + 0.25, 1.0), minf(tint.g + 0.25, 1.0), minf(tint.b + 0.25, 1.0), 0.0)
	glow.scale = Vector2(0.72, 0.72)
	add_child(glow)
	var gt := create_tween()
	gt.set_parallel(true)
	gt.tween_property(glow, "modulate:a", peak, 0.35).set_trans(Tween.TRANS_SINE)
	gt.tween_property(glow, "scale", Vector2(1.2, 1.2), 1.1).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	var gt2 := create_tween()
	gt2.tween_interval(0.5)
	gt2.tween_property(glow, "modulate:a", 0.0, 1.1)
	gt2.tween_callback(glow.queue_free)

	# 締めの ひとこと（バナーの少し下）。ふわっと出して、余韻ののち消す。
	var line := Label.new()
	line.text = String(t["line"])
	line.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	line.set_anchors_preset(Control.PRESET_CENTER)
	line.offset_left = -430
	line.offset_right = 430
	line.offset_top = 74
	line.offset_bottom = 134
	line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	line.add_theme_font_size_override("font_size", 30)
	line.add_theme_color_override("font_color", Color(1, 1, 0.92))
	line.add_theme_color_override("font_outline_color", Color(0.1, 0.14, 0.1))
	line.add_theme_constant_override("outline_size", 8)
	line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	line.modulate = Color(1, 1, 1, 0)
	add_child(line)
	var lt := create_tween()
	lt.tween_property(line, "modulate:a", 1.0, 0.5)
	lt.tween_interval(2.6)
	lt.tween_property(line, "modulate:a", 0.0, 0.7)
	lt.tween_callback(line.queue_free)

	# 舞い散る 記号。Webは描画を軽く 少なめに。
	var marks: Array = t["marks"]
	var rise: bool = bool(t.get("rise", true))
	var count := 10 if Net.is_web() else 18
	if UIKit.reduce_fx():
		count = int(count * 0.45)   # えんしゅつ ひかえめ：記号ふぶきを控えめに
	for _i in count:
		var p := Label.new()
		p.text = String(marks[randi() % marks.size()])
		p.add_theme_font_size_override("font_size", randi_range(26, 46))
		# 濃い輪郭を付ける＝白い空／明るい背景でも 記号が埋もれず くっきり浮かぶ（空クリアの白飛び対策）。
		p.add_theme_color_override("font_outline_color", Color(0.12, 0.13, 0.10, 0.9))
		p.add_theme_constant_override("outline_size", 5)
		p.modulate = Color(tint.r, tint.g, tint.b, 0.0)
		p.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(p)
		var x := randf_range(20.0, maxf(40.0, vp.x - 40.0))
		var y0 := (vp.y + 40.0) if rise else -50.0
		var y1 := -50.0 if rise else (vp.y + 40.0)
		p.position = Vector2(x, y0)
		var dur := randf_range(2.4, 3.8)
		var sway := randf_range(-70.0, 70.0)
		# 動き（落下/上昇＋横ゆれ＋回転）
		var mt := create_tween()
		mt.set_parallel(true)
		mt.tween_property(p, "position:y", y1, dur)
		mt.tween_property(p, "position:x", x + sway, dur).set_trans(Tween.TRANS_SINE)
		mt.tween_property(p, "rotation", randf_range(-0.7, 0.7), dur)
		# 明滅（すっと出て、消えぎわに ふっと消す）
		var ft := create_tween()
		ft.tween_interval(randf_range(0.0, 0.6))
		ft.tween_property(p, "modulate:a", 0.95, 0.4)
		ft.tween_interval(maxf(0.2, dur - 1.4))
		ft.tween_property(p, "modulate:a", 0.0, 0.6)
		ft.tween_callback(p.queue_free)

	# 締めのひとことを 記号ふぶきより前面へ＝粒子が字幕に被って読めなくなるのを防ぐ（夜で顕著だった）。
	if is_instance_valid(line):
		move_child(line, get_child_count() - 1)

	# 締めの音＝章クリア専用のファンファーレ（レベルアップ等の汎用音と混ざらない大節目の音）。
	Sfx.play("chapter_clear", -3.0)


## Web：この作品を共有（対応端末はネイティブ共有、無ければURLをコピー）。
func _on_share() -> void:
	if not Net.is_web():
		return
	JavaScriptBridge.eval("""
		(function(){
			var u = location.href;
			var t = 'みどりのはじまり — 倒さない。癒やすと、なかまになる。無料の協力絵本ゲーム';
			if (navigator.share) { navigator.share({title:'みどりのはじまり', text:t, url:u}); }
			else if (navigator.clipboard) { navigator.clipboard.writeText(u); }
		})();
	""", true)
	set_objective("URLを コピー／共有しました！")


func _process(delta: float) -> void:
	if _box.visible and _auto > 0.0:
		_auto -= delta
		if _auto <= 0.0:
			_advance()
	if _banner.visible:
		_banner_t -= delta
		if _banner_t <= 0.0:
			var tw := create_tween()
			tw.tween_property(_banner, "modulate:a", 0.0, 0.6)
			tw.tween_callback(func() -> void: _banner.visible = false)
			_banner_t = 999.0   # 二重起動防止
