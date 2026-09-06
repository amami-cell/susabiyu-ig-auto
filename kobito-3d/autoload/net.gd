extends Node
## オンライン協力プレイの受け口（自動読み込み: Net）
##
## 設計の芯:
##   「1人プレイ」も “自分ひとりのホスト” として同じ経路を通す。
##   だから後から多人数化するときに作り直しが起きない。
##   ＝ start_solo() も host() の薄いラッパーでしかない。
##
## 通信路は2つ用意してある:
##   ENET      … UDP。低遅延で本命。Android / PC 用。ブラウザでは使えない。
##   WEBSOCKET … TCP。ブラウザでも動く。iPhone(Web版)はこちら一択。
## Web版で起動したときは自動で WEBSOCKET になるので、遊ぶ側は何も選ばなくてよい。
##
## ★ブラウザはホストになれない★
##   WebSocketの待ち受け(サーバ)はブラウザでは作れない。
##   つまり iPhone(Web版) は必ず「参加する」側。ホストは Android か PC が務める。
##   ひとりで試すときだけは OfflineMultiplayerPeer を使って、通信なしで同じ道を通す。

signal status_changed(text: String)
signal biome_changed(biome: String)
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

## 点検用: true にすると「ブラウザと同じ扱い」（待ち受けできない）を再現できる。
## ブラウザ版の1人プレイが壊れていないかを、PC上のCIで確かめるために使う。
var force_offline := false
var my_display_name := "夫"
var world_biome := "garden"   # 舞台。ロビーで選ぶ（庭/遺跡）。ホストが決めて全員に配る
var difficulty := 1.0         # 敵の攻撃力の倍率（やさしい0.6/ふつう1.0/つよい1.5）。サーバ基準
var is_online := false

## peer_id -> { "name": String, "role": int }
var roster: Dictionary = {}

var _peer: MultiplayerPeer = null


const CFG_PATH := "user://settings.cfg"


func _ready() -> void:
	# ブラウザで動いているなら ENet は使えないので、問答無用で WebSocket にする
	if is_web():
		transport = Transport.WEBSOCKET
	_load_name()   # 前回の なまえ を思い出す（次回から入力しなくていい＝製品らしさ）
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)


# ---------------------------------------------------------------- なまえの保存

## なまえを覚える（user://settings.cfg。Webでも IndexedDB に残る）。
func save_name(n: String) -> void:
	my_display_name = n
	var cfg := ConfigFile.new()
	cfg.load(CFG_PATH)                       # 音量など他設定は残す
	cfg.set_value("player", "name", n)
	cfg.save(CFG_PATH)


func _load_name() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(CFG_PATH) == OK:
		var n := String(cfg.get_value("player", "name", my_display_name))
		if not n.strip_edges().is_empty():
			my_display_name = n


# ---------------------------------------------------------------- 開始・終了

func is_web() -> bool:
	return OS.has_feature("web")


## ブラウザは待ち受けできない。それ以外(PC/Android)はホストになれる。
func can_host() -> bool:
	return not is_web() and not force_offline


## ひとりで遊ぶ。
## PC/Android … 「自分だけのホスト」。遊んでいる途中で相手が join できる。
## ブラウザ    … 待ち受けできないので通信なしのピアを挿す。処理の道筋は同じ。
func start_solo() -> Error:
	if can_host():
		return host(DEFAULT_PORT)

	_shutdown_peer()
	_peer = OfflineMultiplayerPeer.new()
	multiplayer.multiplayer_peer = _peer
	is_online = false
	roster.clear()
	_register(1, my_display_name)
	_emit_status("ひとりで遊んでいます（ブラウザ版は待ち受けができないので、2人で遊ぶときは参加側になります）")
	session_started.emit()
	return OK


func host(port: int = DEFAULT_PORT) -> Error:
	if not can_host():
		_emit_status("ブラウザ版はホストになれません。PCかAndroid側でホストして、こちらは「参加する」を使ってください")
		return ERR_UNAVAILABLE
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
	rpc_id(id, "_remote_biome", world_biome)
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


@rpc("authority", "reliable")
func _remote_biome(biome: String) -> void:
	world_biome = biome
	biome_changed.emit(biome)


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


## Web版で「今このページを配っている相手」を参加先の初期値にする。
## 同じ機械がゲームのホストも兼ねている構成なら、これで住所の入力が要らなくなる。
##
## 注意: https のページからは ws:// を張れない（ブラウザがブロックする）。
## 家の中で遊ぶぶんには、ホスト機が http でWeb版を配れば同一オリジンなので素通り。
## 外から繋ぐときだけ wss（＝証明書）が要る。tools/serve_web.py と README を参照。
func web_default_address() -> String:
	if not is_web():
		return "127.0.0.1"
	var host_name := str(JavaScriptBridge.eval("location.hostname", true))
	var protocol := str(JavaScriptBridge.eval("location.protocol", true))
	if host_name.is_empty():
		return "127.0.0.1"
	var scheme := "wss" if protocol == "https:" else "ws"
	return "%s://%s:%d" % [scheme, host_name, DEFAULT_PORT]


func local_ip_hint() -> String:
	if is_web():
		return "（ブラウザ版）"
	for ip in IP.get_local_addresses():
		if ip.begins_with("192.168.") or ip.begins_with("10.") or ip.begins_with("172."):
			return ip
	return "127.0.0.1"


func _emit_status(text: String) -> void:
	print("[Net] ", text)
	status_changed.emit(text)
