extends Node
## オンライン協力プレイの受け口（自動読み込み: Net）
##
## 設計の芯:
##   「1人プレイ」も “自分ひとりのホスト” として同じ経路を通す。
##   だから後から多人数化するときに作り直しが起きない。
##   ＝ start_solo() も host() の薄いラッパーでしかない。
##
## 通信路は2つ用意してある:
##   ENET      … UDP。低遅延で本命。Android / PC 用。Webエクスポートでは使えない。
##   WEBSOCKET … TCP。ブラウザでも動く。無料枠の中継サーバに載せやすい。
## 迷ったら ENET。奥さんのスマホがブラウザで遊ぶ段になったら WEBSOCKET に切り替える。

signal status_changed(text: String)
signal roster_changed
signal session_started
signal session_ended(reason: String)

enum Transport { ENET, WEBSOCKET }

const DEFAULT_PORT := 24567
const MAX_PLAYERS := 4

## この2つは「誰が何色の小人か」を決めるだけの飾り。増やせば3人目以降も遊べる。
const ROLE_NAMES := ["夫", "妻", "こども1", "こども2"]
const ROLE_COLORS := [Color(0.45, 0.78, 0.5), Color(0.95, 0.55, 0.7), Color(0.6, 0.7, 0.95), Color(0.95, 0.85, 0.5)]

var transport: Transport = Transport.ENET
var my_display_name := "夫"
var is_online := false

## peer_id -> { "name": String, "role": int }
var roster: Dictionary = {}

var _peer: MultiplayerPeer = null


func _ready() -> void:
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)


# ---------------------------------------------------------------- 開始・終了

## ひとりで遊ぶ。中身は「自分だけのホスト」。あとから誰かが join できる。
func start_solo() -> Error:
	return host(DEFAULT_PORT)


func host(port: int = DEFAULT_PORT) -> Error:
	_shutdown_peer()
	var peer := _make_peer()
	var err: Error
	if transport == Transport.ENET:
		err = (peer as ENetMultiplayerPeer).create_server(port, MAX_PLAYERS)
	else:
		err = (peer as WebSocketMultiplayerPeer).create_server(port)
	if err != OK:
		_emit_status("ホストに失敗しました（ポート %d が使用中かも）: %d" % [port, err])
		return err

	_peer = peer
	multiplayer.multiplayer_peer = _peer
	is_online = true
	roster.clear()
	_register(1, my_display_name)
	_emit_status("ホスト中（ポート %d）" % port)
	session_started.emit()
	return OK


func join(address: String, port: int = DEFAULT_PORT) -> Error:
	_shutdown_peer()
	var peer := _make_peer()
	var err: Error
	if transport == Transport.ENET:
		err = (peer as ENetMultiplayerPeer).create_client(address, port)
	else:
		var url := address
		if not url.begins_with("ws://") and not url.begins_with("wss://"):
			url = "ws://%s:%d" % [address, port]
		err = (peer as WebSocketMultiplayerPeer).create_client(url)
	if err != OK:
		_emit_status("接続に失敗しました: %d" % err)
		return err

	_peer = peer
	multiplayer.multiplayer_peer = _peer
	is_online = true
	_emit_status("%s へ接続中…" % address)
	return OK


func leave(reason: String = "退出しました") -> void:
	_shutdown_peer()
	roster.clear()
	is_online = false
	roster_changed.emit()
	session_ended.emit(reason)
	_emit_status(reason)


func _make_peer() -> MultiplayerPeer:
	return ENetMultiplayerPeer.new() if transport == Transport.ENET else WebSocketMultiplayerPeer.new()


func _shutdown_peer() -> void:
	if _peer != null:
		_peer.close()
		_peer = null
	multiplayer.multiplayer_peer = null


# ---------------------------------------------------------------- 名簿の同期
#
# 誰が居るかの正は「サーバの roster」。クライアントは受け取るだけ。
# ここを server-authoritative にしておくと、後で不正対策を足すときに困らない。

func _on_peer_connected(id: int) -> void:
	if not multiplayer.is_server():
		return
	# 新規参加者へ、今いる全員と、今の環境回復度を教える
	for pid in roster:
		rpc_id(id, "_remote_register", pid, roster[pid]["name"], roster[pid]["role"])
	WorldState.send_to(id)


func _on_peer_disconnected(id: int) -> void:
	if not multiplayer.is_server():
		return
	_unregister(id)
	rpc("_remote_unregister", id)


func _on_connected_to_server() -> void:
	_emit_status("接続しました")
	rpc_id(1, "_request_register", my_display_name)
	session_started.emit()


func _on_connection_failed() -> void:
	leave("接続できませんでした（IPとポート、同じWi-Fiかを確認）")


func _on_server_disconnected() -> void:
	leave("ホストとの接続が切れました")


@rpc("any_peer", "reliable")
func _request_register(display_name: String) -> void:
	if not multiplayer.is_server():
		return
	var id := multiplayer.get_remote_sender_id()
	var role := _register(id, display_name)
	# 全員（自分含む）へ通知
	rpc("_remote_register", id, display_name, role)


@rpc("authority", "call_local", "reliable")
func _remote_register(id: int, display_name: String, role: int) -> void:
	roster[id] = {"name": display_name, "role": role}
	roster_changed.emit()


@rpc("authority", "call_local", "reliable")
func _remote_unregister(id: int) -> void:
	roster.erase(id)
	roster_changed.emit()


func _register(id: int, display_name: String) -> int:
	var used := {}
	for pid in roster:
		used[roster[pid]["role"]] = true
	var role := 0
	while used.has(role) and role < ROLE_NAMES.size() - 1:
		role += 1
	roster[id] = {"name": display_name, "role": role}
	roster_changed.emit()
	return role


func _unregister(id: int) -> void:
	roster.erase(id)
	roster_changed.emit()


# ---------------------------------------------------------------- 小物

func role_of(id: int) -> int:
	return roster.get(id, {}).get("role", 0)


func color_of(id: int) -> Color:
	return ROLE_COLORS[role_of(id) % ROLE_COLORS.size()]


func local_ip_hint() -> String:
	for ip in IP.get_local_addresses():
		if ip.begins_with("192.168.") or ip.begins_with("10.") or ip.begins_with("172."):
			return ip
	return "127.0.0.1"


func _emit_status(text: String) -> void:
	print("[Net] ", text)
	status_changed.emit(text)
