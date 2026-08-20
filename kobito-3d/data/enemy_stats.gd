extends Resource
class_name EnemyStats
## 敵1種類ぶんの数値。コードに直書きせず .tres ファイルに出す＝データ駆動。
##
## あなたのスプレッドシート運用と同じ感覚で、
## data/*.tres を増やす・数字をいじるだけでバランス調整できる。
## 将来 Google Sheets から .tres を生成する CI を足すのも簡単。

@export var display_name: String = "むし"
@export var max_hp: int = 16
@export var move_speed: float = 1.5
@export var attack_power: int = 4
@export var attack_interval: float = 1.2
@export var detect_range: float = 8.0
@export var xp_reward: int = 5
@export var body_color: Color = Color(0.35, 0.25, 0.2)
@export var body_scale: float = 1.0

## 癒やしたときに授ける力（空なら無し）。飛行5パーツは hop/float/glide/hover/lift。
## 例：バッタ.tres なら "hop"、トンボ.tres なら "hover"。
@export var grants_power: String = ""

## 中ボスか（湧き対象から外す・演出を変える等、後で使う）。
@export var is_midboss: bool = false
