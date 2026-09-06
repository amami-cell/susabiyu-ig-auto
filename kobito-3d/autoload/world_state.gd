extends Node
## 環境回復度（自動読み込み: WorldState）— このゲームの魂
##
## 「自分の行動で世界が目に見えて回復する」を1つの数値(0.0〜1.0)に集約する。
## 見た目・敵の湧き・BGM…すべてこの値を見て変わる。
## ここが server-authoritative なので、夫婦のどちらの画面でも同じ緑になる。

signal recovery_changed(value: float)
signal notice(text: String)
signal powers_changed
signal creature_healed             # 虫を1匹癒やすたび（章の進行が数える）
signal seed_collected              # 種のかけらを1つ拾うたび（章の進行が数える）

## 飛行を組み上げる5パーツ。癒やした空の虫がそれぞれ授ける（STORY/AREAS参照）。
## 5つ全部そろうと自由飛行が解禁される（＝物語の約2/3地点）。
## 昔の「Lv3で飛行」から、この“癒やして力を集める”方式へ置き換えた。
const FLIGHT_PARTS := ["hop", "float", "glide", "hover", "lift"]

## 行動 -> 上がる量。数値はここ一箇所。バランス調整はこの表だけ触ればいい。
# ★みどり回復の配分★ 以前は掃除だけで第1章中盤に100%到達し、物語の山場（群れ→ボス→
# 満開）が「すでに緑の世界」で進んで payoff が消えていた。全体を圧縮し、癒やしの比重を
# 上げて、最後まで少しずつ緑が戻る＝クライマックスで満開になる曲線にする。
const GAIN := {
	"bug_healed": 0.015,      # 虫を癒やす … 積み重ねが効く（癒やしが主役）
	"trash_removed": 0.03,    # ゴミを片づける … 掃除で目に見えて動く
	"drain_cleared": 0.09,    # パズル/スイッチ開通 … 大きめ
	"source_purified": 0.30,  # 汚染源を浄化 … 大きく（未使用の予備）
	"seed": 0.02,             # 種のかけらを拾う … ちょっと
}

var recovery: float = 0.0

## 授かった力の集合（癒やした生き物が残す）。例: {"hop": true, "float": true}
var powers: Dictionary = {}


# ---------------------------------------------------------------- 授かる力
#
# 癒やした生き物が「力」を残す。飛行はこの集まりで解禁する（Lv依存をやめた）。
# サーバが正。クライアントは配られたものを受け取るだけ。

## サーバだけが呼ぶ。癒やした生き物の力を1つ足す。
func grant_power(power: String) -> void:
	if power.is_empty():
		return
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	if powers.has(power):
		return
	_apply_power(power)
	rpc("_remote_power", power)


func has_power(power: String) -> bool:
	return powers.has(power)


## 飛行が解禁されたか＝5パーツが全部そろったか。
func has_flight() -> bool:
	for part in FLIGHT_PARTS:
		if not powers.has(part):
			return false
	return true


@rpc("authority", "reliable")
func _remote_power(power: String) -> void:
	_apply_power(power)


func _apply_power(power: String) -> void:
	if powers.has(power):
		return
	var could_fly := has_flight()
	powers[power] = true
	powers_changed.emit()
	if not could_fly and has_flight():
		notice.emit("空を飛べるようになった！")


## サーバだけが呼ぶ。クライアントが勝手に上げても効かない。
func add(kind: String, times: int = 1) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	if kind == "bug_healed":
		for _i in times:
			creature_healed.emit()
	elif kind == "seed":
		for _i in times:
			seed_collected.emit()
	var gain: float = GAIN.get(kind, 0.0) * times
	if is_zero_approx(gain):
		return
	_apply(clampf(recovery + gain, 0.0, 1.0))
	rpc("_remote_apply", recovery)


## エンディング等でみどりを一気に満開へ。サーバが全員へ反映する。
func set_full() -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	_apply(1.0)
	rpc("_remote_apply", 1.0)


## みどり回復度を指定値へ（第2章開始で“新しい汚れた世界”に落とす等）。サーバが全員へ反映。
func set_recovery(value: float) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	_apply(clampf(value, 0.0, 1.0))
	rpc("_remote_apply", clampf(value, 0.0, 1.0))


func reset() -> void:
	_apply(0.0)
	powers.clear()
	powers_changed.emit()
	if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		rpc("_remote_apply", 0.0)


## セーブから復元：回復度と授かった力をまとめて戻す（サーバが全員へ反映）。
func restore(value: float, power_list: Array) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	powers.clear()
	_apply(clampf(value, 0.0, 1.0))
	rpc("_remote_apply", recovery)
	for p in power_list:
		grant_power(String(p))


## 今持っている力を配列で（セーブ用）。
func powers_list() -> Array:
	return powers.keys()


## 後から参加した人にも今の回復度と授かった力を伝える（サーバから個別に送る）
func send_to(id: int) -> void:
	if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		rpc_id(id, "_remote_apply", recovery)
		for power in powers:
			rpc_id(id, "_remote_power", power)


@rpc("authority", "reliable")
func _remote_apply(value: float) -> void:
	_apply(value)


func _apply(value: float) -> void:
	var before := recovery
	recovery = value
	recovery_changed.emit(recovery)
	for step in [0.25, 0.5, 0.75, 1.0]:
		if before < step and recovery >= step:
			notice.emit("環境回復 %d%%" % int(step * 100.0))


## 地面の色。茶(汚)→緑(回復) を補間するだけ。シェーダーを書く前の“見えるフィードバック”。
func ground_color() -> Color:
	return Color(0.35, 0.28, 0.20).lerp(Color(0.30, 0.55, 0.25), recovery)


func sky_color() -> Color:
	return Color(0.55, 0.50, 0.42).lerp(Color(0.45, 0.70, 0.95), recovery)


## 回復するほど敵の湧きは遅くなる（＝掃除の報酬）。
func spawn_interval() -> float:
	return lerpf(3.0, 12.0, recovery)
