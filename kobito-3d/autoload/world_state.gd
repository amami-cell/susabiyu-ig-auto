extends Node
## 環境回復度（自動読み込み: WorldState）— このゲームの魂
##
## 「自分の行動で世界が目に見えて回復する」を1つの数値(0.0〜1.0)に集約する。
## 見た目・敵の湧き・BGM…すべてこの値を見て変わる。
## ここが server-authoritative なので、夫婦のどちらの画面でも同じ緑になる。

signal recovery_changed(value: float)
signal notice(text: String)

## 行動 -> 上がる量。数値はここ一箇所。バランス調整はこの表だけ触ればいい。
const GAIN := {
	"bug_defeated": 0.01,     # 虫を倒す … ちょっと
	"trash_removed": 0.06,    # ゴミを排水溝から出す … しっかり
	"drain_cleared": 0.20,    # 排水溝が1つ開通 … 大きく
	"source_purified": 0.30,  # 汚染源を浄化 … 大きく
}

var recovery: float = 0.0


## サーバだけが呼ぶ。クライアントが勝手に上げても効かない。
func add(kind: String, times: int = 1) -> void:
	if not multiplayer.has_multiplayer_peer() or not multiplayer.is_server():
		return
	var gain: float = GAIN.get(kind, 0.0) * times
	if is_zero_approx(gain):
		return
	_apply(clampf(recovery + gain, 0.0, 1.0))
	rpc("_remote_apply", recovery)


func reset() -> void:
	_apply(0.0)
	if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		rpc("_remote_apply", 0.0)


## 後から参加した人にも今の回復度を伝える（サーバから個別に送る）
func send_to(id: int) -> void:
	if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		rpc_id(id, "_remote_apply", recovery)


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
