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

## 中継(Cloudflare Worker)経由の協力プレイ。携帯どうしは直接つながれない
## （ブラウザは待ち受けできない）ので、両方が中継へ出ていって橋渡ししてもらう。
## ここに自分の Worker の URL を入れると、携帯2台だけで協力プレイができる。
##   例: "wss://kobito-relay.<あなたのサブドメイン>.workers.dev"
## デプロイ手順は relay/README.md（push で自動デプロイ）。空なら user://settings.cfg の
## [net] relay で上書きもできる（作り直しなしで差し替え可）。
const RELAY_BASE := ""

# 自動つなぎ直し（スマホは電波が一瞬切れるのが日常）。
# 参加(client)側だけが対象。切れたら、覚えておいた相手へ数回つなぎ直す。
const RECONNECT_TRIES := 3       # つなぎ直しを試す回数
const RECONNECT_GAP := 1.5       # 各試行の前に置く間（秒）
const RECONNECT_TIMEOUT := 6.0   # 1回の接続確立を待つ上限（秒）

## この2つは「誰が何色の小人か」を決めるだけの飾り。増やせば3人目以降も遊べる。
const ROLE_NAMES := ["夫", "妻", "こども1", "こども2"]
const ROLE_COLORS := [Color(0.45, 0.78, 0.5), Color(0.95, 0.55, 0.7), Color(0.6, 0.7, 0.95), Color(0.95, 0.85, 0.5)]

var transport: Transport = Transport.ENET

## 点検用: true にすると「ブラウザと同じ扱い」（待ち受けできない）を再現できる。
## ブラウザ版の1人プレイが壊れていないかを、PC上のCIで確かめるために使う。
var force_offline := false
var my_display_name := "夫"
var world_biome := "garden"   # 舞台。ロビーで選ぶ（庭/遺跡）。ホストが決めて全員に配る

# むずかしさ。0 やさしい / 1 ふつう / 2 つよい。ホスト(サーバ)が決めて全員へ配る。
# 「敵の攻撃力・体力・湧きの速さ」の3つをまとめて動かす＝やさしいは のんびり、つよいは 歯ごたえ。
# ★HPと湧きも全員一致させたいので、参加者にも difficulty を配る（_on_peer_connected）。
var diff_index := 1
var difficulty := 1.0         # 敵の攻撃力の倍率（後方互換で残す：bug.gd が参照）。サーバ基準
# 4段目「たつじん」＝つよくてニューゲーム（通しクリア後にロビーで解禁）。上級/大人向けの手ごたえ。
const DIFF_ATTACK := [0.6, 1.0, 1.5, 2.0]   # 攻撃力の倍率
const DIFF_HP := [0.8, 1.0, 1.25, 1.6]      # 体力の倍率（やさしいは少ない手数で癒やせる／つよいは手ごたえ）
const DIFF_SPAWN := [1.30, 1.0, 0.80, 0.62] # 湧き間隔の倍率（小さいほど速い＝つよいは にぎやか）
var is_online := false

## peer_id -> { "name": String, "role": int }
var roster: Dictionary = {}

var _peer: MultiplayerPeer = null

# つなぎ直し用：最後に参加した相手を覚えておき、意図しない切断のときだけ試す。
var _last_address := ""
var _last_port := DEFAULT_PORT
var _intentional := false     # ユーザーが自分で退出した＝つなぎ直さない
var _reconnecting := false    # つなぎ直しの最中（この間は通常の切断処理を止める）

# 中継(RELAY)経由のとき用。つなぎ直しで同じ部屋へ戻れるように覚えておく。
var _conn_kind := "enet"      # "enet" / "ws" / "relay"
var _relay_code := ""


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
	_intentional = false
	_reconnecting = false
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
	# つなぎ直し用に相手を覚える。ユーザー操作の参加なので「意図した接続」。
	_last_address = address
	_last_port = port
	_intentional = false
	_reconnecting = false
	var err := _open_client(address, port)
	if err != OK:
		return err
	_emit_status("%s へ接続中…" % address)
	return OK


# ---------------------------------------------------------------- 中継(Cloudflare)協力プレイ
#
# 携帯2台“だけ”で遊ぶための道。両方が中継へ client 接続し、中継が橋渡しする。
# ホスト側の携帯が Godot上の peer id=1（＝進行の正）になる。中継URLは RELAY_BASE。

## 中継が使えるか（URLが設定済みか）。
func relay_ready() -> bool:
	return not _relay_base().is_empty()


func _relay_base() -> String:
	var base := RELAY_BASE
	var cfg := ConfigFile.new()
	if cfg.load(CFG_PATH) == OK:
		base = String(cfg.get_value("net", "relay", base))
	return base.strip_edges()


func _relay_url(code: String, role: String) -> String:
	var base := _relay_base().trim_suffix("/")
	return "%s/r?room=%s&role=%s" % [base, code.uri_encode(), role]


## 合言葉（部屋コード）を作る。読み違えにくい文字だけ・4桁。
func make_room_code() -> String:
	const POOL := "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"   # 0/O/1/I を除く
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var s := ""
	for i in 4:
		s += POOL[rng.randi() % POOL.length()]
	return s


## 中継ごしにホストになる（携帯でもOK）。合言葉を相手に伝える。
func host_relay(code: String) -> Error:
	if not relay_ready():
		_emit_status("中継URLが未設定です（relay/README.md でデプロイ→URL設定）")
		return ERR_UNAVAILABLE
	_intentional = false
	_reconnecting = false
	_conn_kind = "relay"
	_relay_code = code
	_shutdown_peer()
	var peer := RelayMultiplayerPeer.over_url(_relay_url(code, "host"), "host")
	_peer = peer
	multiplayer.multiplayer_peer = _peer
	is_online = true
	roster.clear()
	_register(1, my_display_name)
	_emit_status("あいことば「%s」で待っています（相手に伝えてね）" % code)
	session_started.emit()
	return OK


## 中継ごしに参加する（携帯でもOK）。ホストと同じ合言葉を入れる。
func join_relay(code: String) -> Error:
	if not relay_ready():
		_emit_status("中継URLが未設定です（relay/README.md でデプロイ→URL設定）")
		return ERR_UNAVAILABLE
	_conn_kind = "relay"
	_relay_code = code
	_last_address = code   # つなぎ直しの目印（中継では合言葉が住所）
	_intentional = false
	_reconnecting = false
	_shutdown_peer()
	var peer := RelayMultiplayerPeer.over_url(_relay_url(code, "join"), "join")
	_peer = peer
	multiplayer.multiplayer_peer = _peer
	is_online = true
	_emit_status("あいことば「%s」で つないでいます…" % code)
	return OK


## クライアントとして接続を開く低レベル部（join と つなぎ直しで共用）。
func _open_client(address: String, port: int) -> Error:
	_shutdown_peer()
	# 中継(RELAY)経由のつなぎ直しは、同じ合言葉の部屋へ参加し直す。
	if _conn_kind == "relay":
		_peer = RelayMultiplayerPeer.over_url(_relay_url(_relay_code, "join"), "join")
		multiplayer.multiplayer_peer = _peer
		is_online = true
		return OK
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
	return OK


## 最後に参加した相手の住所（ロビーの入力欄を埋め直す用）。
func last_join_address() -> String:
	return _last_address


func leave(reason: String = "退出しました", intentional: bool = true) -> void:
	_intentional = intentional
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
	rpc_id(id, "_remote_difficulty", diff_index)   # 敵HP・湧きも全員一致させる
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
	if _reconnecting:
		return   # つなぎ直しの最中は、その流れの中で扱う（ここでは畳まない）
	leave("接続できませんでした（IPとポート、同じWi-Fiかを確認）", false)


func _on_server_disconnected() -> void:
	if _reconnecting:
		return
	# 意図しない切断で、参加していた相手が分かっているなら、自動でつなぎ直す。
	if _intentional or _last_address == "":
		leave("ホストとの接続が切れました", false)
		return
	_reconnect_flow()


## 電波が一瞬切れた等でホストとの接続が落ちたとき、覚えておいた相手へ数回つなぎ直す。
## つなぎ直しは「一度きれいに畳んで → 参加し直す」＝通常経路そのままなので、
## 途中状態の作り直し（虫の重複など）が起きず安全。成功すればサーバが全状態を配り直す。
func _reconnect_flow() -> void:
	_reconnecting = true
	var addr := _last_address
	var port := _last_port
	# いったんきれいに畳む（フリーズした画面を残さない）。session_ended でロビーへ。
	_shutdown_peer()
	roster.clear()
	is_online = false
	roster_changed.emit()
	session_ended.emit("reconnecting")

	for k in RECONNECT_TRIES:
		if _intentional:
			break   # 途中でユーザーが退出したら中断
		_emit_status("つうしんが 切れました。つなぎ直しています…（%d/%d）" % [k + 1, RECONNECT_TRIES])
		await get_tree().create_timer(RECONNECT_GAP).timeout
		if _intentional:
			break
		if _open_client(addr, port) != OK:
			continue
		if await _await_connected(RECONNECT_TIMEOUT):
			_reconnecting = false
			_emit_status("つなぎ直しました")
			return   # 接続成功。connected_to_server が session_started を出して復帰する。
		_shutdown_peer()

	_reconnecting = false
	is_online = false
	_emit_status("つなぎ直せませんでした。ロビーに もどりました（IPは 入力ずみ＝「参加する」ですぐ再挑戦できます）")


## 接続が確立（or 失敗）するまで待つ。確立＝true、時間切れ/切断＝false。
func _await_connected(timeout: float) -> bool:
	var t := 0.0
	while t < timeout:
		if _intentional:
			return false
		if _peer != null:
			match _peer.get_connection_status():
				MultiplayerPeer.CONNECTION_CONNECTED:
					return true
				MultiplayerPeer.CONNECTION_DISCONNECTED:
					return false
		await get_tree().create_timer(0.2).timeout
		t += 0.2
	return false


@rpc("any_peer", "reliable")
func _request_register(display_name: String) -> void:
	if not multiplayer.is_server():
		return
	var id := multiplayer.get_remote_sender_id()
	var role := _register(id, display_name)
	# 全員（自分含む）へ通知
	rpc("_remote_register", id, display_name, role)


## むずかしさを決める（ロビーで選ぶ）。3つの倍率をまとめて設定し、参加者へも配る。
## サーバが正。ソロは自分＝サーバなので即反映。
func set_difficulty(idx: int) -> void:
	diff_index = clampi(idx, 0, DIFF_ATTACK.size() - 1)
	difficulty = DIFF_ATTACK[diff_index]
	if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		rpc("_remote_difficulty", diff_index)


## 敵の体力の倍率（やさしい0.8／ふつう1.0／つよい1.25）。bug.gd が出現時に掛ける。
func enemy_hp_mult() -> float:
	return DIFF_HP[clampi(diff_index, 0, DIFF_HP.size() - 1)]


## 敵の湧き間隔の倍率（やさしいは長め＝のんびり／つよいは短め＝にぎやか）。world_state が掛ける。
func spawn_mult() -> float:
	return DIFF_SPAWN[clampi(diff_index, 0, DIFF_SPAWN.size() - 1)]


@rpc("authority", "reliable")
func _remote_difficulty(idx: int) -> void:
	diff_index = clampi(idx, 0, DIFF_ATTACK.size() - 1)
	difficulty = DIFF_ATTACK[diff_index]


## 遊んでいる途中で舞台を切り替える（章が進んで別の場所へ＝第3章で みずべ 等）。
## サーバが正。自分にも即反映し、参加者へは _remote_biome で配る。
func set_world_biome(b: String) -> void:
	if world_biome == b:
		return
	world_biome = b
	biome_changed.emit(b)
	if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
		rpc("_remote_biome", b)


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
