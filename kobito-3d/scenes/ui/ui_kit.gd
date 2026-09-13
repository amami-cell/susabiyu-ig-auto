extends RefCounted
class_name UIKit
## 全UI共通の“絵本テイスト”スタイル。クリーム地・こげ茶文字・やわらかい緑/桃のアクセント、
## 角丸・影・アイコンで、素っぽいデフォルトUIを可愛く整える。各UIから呼んで適用する。

const CREAM := Color(0.99, 0.96, 0.89, 0.96)   # パネル地（生成り）
const CREAM_SOLID := Color(0.99, 0.96, 0.89)
const INK := Color(0.32, 0.25, 0.18)           # 文字（こげ茶）
const INK_SOFT := Color(0.45, 0.38, 0.3)
const GREEN := Color(0.53, 0.78, 0.42)         # 回復＝みどり
const GREEN_DK := Color(0.34, 0.58, 0.3)
const PINK := Color(0.97, 0.53, 0.58)          # HP
const GOLD := Color(1.0, 0.82, 0.42)
const SHADOW := Color(0.2, 0.16, 0.1, 0.28)


static func panel(bg: Color, border: Color, radius: int = 18, bw: int = 3, pad: int = 14) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(radius)
	s.set_border_width_all(bw)
	s.border_color = border
	s.set_content_margin_all(pad)
	s.shadow_color = SHADOW
	s.shadow_size = 6
	s.shadow_offset = Vector2(0, 3)
	return s


static func bar_bg() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0.24, 0.2, 0.16, 0.55)
	s.set_corner_radius_all(12)
	s.set_border_width_all(2)
	s.border_color = Color(1, 1, 1, 0.25)
	return s


static func bar_fill(c: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.set_corner_radius_all(12)
	return s


static func style_bar(bar: ProgressBar, fill: Color) -> void:
	bar.add_theme_stylebox_override("background", bar_bg())
	bar.add_theme_stylebox_override("fill", bar_fill(fill))


## ボタンを“ぷにっと角丸”に。押すと少し沈む色。アイコン＋文字。
static func style_button(btn: Button, bg: Color, border: Color) -> void:
	var n := panel(bg, border, 26, 3, 8)
	n.shadow_size = 8
	var h := panel(bg.lightened(0.06), border, 26, 3, 8)
	var p := panel(bg.darkened(0.14), border.darkened(0.1), 26, 3, 8)
	p.shadow_size = 2
	p.shadow_offset = Vector2(0, 1)
	btn.add_theme_stylebox_override("normal", n)
	btn.add_theme_stylebox_override("hover", h)
	btn.add_theme_stylebox_override("pressed", p)
	btn.add_theme_stylebox_override("focus", n)
	btn.add_theme_color_override("font_color", INK)
	btn.add_theme_color_override("font_pressed_color", INK)
	btn.add_theme_color_override("font_hover_color", INK)
	btn.add_theme_font_size_override("font_size", 22)


static func style_label(l: Label, size: int, color: Color = INK, outline: int = 0, ocol: Color = Color(1, 1, 1, 0.9)) -> void:
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if outline > 0:
		l.add_theme_constant_override("outline_size", outline)
		l.add_theme_color_override("font_outline_color", ocol)
