extends Control
## 物語UI：目的表示(上)・会話ボックス(下・タップで送る)・章クリアの大バナー(中央)。
## Chapter(自動読み込み)の signal を受けて描くだけ。全機種で読める大きめ文字＋フチどり。

var _lines: PackedStringArray = []
var _idx := 0
var _auto := 0.0

var _obj: Label
var _box: Panel
var _text: Label
var _hint: Label
var _catch: Button
var _banner: Label
var _banner_t := 0.0


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
	add_child(_obj)

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

	# 会話ボックスの左上に“おはなし”の名札
	var tag := Label.new()
	tag.text = "  おはなし  "
	tag.add_theme_stylebox_override("normal", UIKit.panel(UIKit.GREEN_DK, UIKit.GREEN, 12, 0, 6))
	UIKit.style_label(tag, 18, Color(1, 1, 1))
	tag.position = Vector2(14, -16)
	tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_box.add_child(tag)

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
	_obj.text = text
	_obj.visible = text != ""


func show_dialogue(lines: PackedStringArray) -> void:
	_lines = lines
	_idx = 0
	if _lines.is_empty():
		_hide_box()
		return
	_box.visible = true
	_catch.visible = true
	_set_play_ui(false)   # お話中は操作ボタン等を隠して重なりを防ぐ
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
	_text.text = _lines[_idx]
	_auto = 6.0   # タップしなくても数秒で自動送り
	Sfx.play("pickup", -22.0)   # 文字送りの小さな合図


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
	_banner.text = text
	_banner.visible = true
	_banner.modulate = Color(1, 1, 1, 0)
	_banner_t = 3.2
	var tw := create_tween()
	tw.tween_property(_banner, "modulate:a", 1.0, 0.4)


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
