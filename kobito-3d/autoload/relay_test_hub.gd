class_name RelayTestHub
extends RefCounted
## テスト専用のメモリ内“中継”。Cloudflare Worker(relay/worker.js)と同じルーティングを
## GDScript で再現し、ソケットなしで RelayMultiplayerPeer の契約を検証する。
## （worker.js と挙動を必ず一致させること）
##
## 本番では使わない。RelayMultiplayerPeer とは別ファイルにしてあるのは、
## Godot で inner class を MultiplayerPeerExtension 継承スクリプト内に置くと
## 生成時に固まる不具合を踏むため（分離すれば安全）。

const MAX_PLAYERS := 4

var _links: Dictionary = {}   # id -> LoopLink
var _host_taken := false


func attach(role: String) -> LoopLink:
	var link := LoopLink.new()
	link._hub = self
	var new_id := 0
	if role == "host":
		if _host_taken:
			link._deliver_text(JSON.stringify({"t": "error", "code": "taken"}))
			link._open = false
			return link
		new_id = 1
		_host_taken = true
	else:
		new_id = _next_client_id()
		if new_id == 0:
			link._deliver_text(JSON.stringify({"t": "error", "code": "full"}))
			link._open = false
			return link
	link.id = new_id
	var existing := _links.keys()
	_links[new_id] = link
	link._deliver_text(JSON.stringify({"t": "welcome", "id": new_id, "peers": existing}))
	for pid in existing:
		(_links[pid] as LoopLink)._deliver_text(JSON.stringify({"t": "join", "id": new_id}))
	return link


func _next_client_id() -> int:
	for cand in range(2, MAX_PLAYERS + 1):
		if not _links.has(cand):
			return cand
	return 0


func route(from_id: int, bytes: PackedByteArray) -> void:
	if bytes.size() < 6:
		return
	var sp := StreamPeerBuffer.new()
	sp.data_array = bytes
	sp.big_endian = false
	var target := sp.get_32()
	var out := bytes.duplicate()
	var w := StreamPeerBuffer.new()
	w.big_endian = false
	w.put_32(from_id)
	var head := w.data_array
	out[0] = head[0]
	out[1] = head[1]
	out[2] = head[2]
	out[3] = head[3]
	for pid in _links.keys():
		if pid == from_id:
			continue
		if target > 0 and pid != target:
			continue
		if target < 0 and pid == -target:
			continue
		(_links[pid] as LoopLink)._deliver_bin(out)


func drop(id: int) -> void:
	if not _links.has(id):
		return
	_links.erase(id)
	if id == 1:
		_host_taken = false
	for pid in _links.keys():
		(_links[pid] as LoopLink)._deliver_text(JSON.stringify({"t": "leave", "id": id}))


## RelayMultiplayerPeer が期待する橋(link)のメモリ内版。
class LoopLink extends RefCounted:
	var _hub: RefCounted = null
	var id := 0
	var _open := true
	var _q: Array = []

	func poll() -> void:
		pass

	func status() -> int:
		if not _open:
			return MultiplayerPeer.CONNECTION_DISCONNECTED
		return MultiplayerPeer.CONNECTION_CONNECTED if id != 0 else MultiplayerPeer.CONNECTION_CONNECTING

	func send_bin(bytes: PackedByteArray) -> void:
		if _hub != null:
			_hub.route(id, bytes)

	func pop_all() -> Array:
		var out := _q
		_q = []
		return out

	func close() -> void:
		_open = false
		if _hub != null:
			_hub.drop(id)

	func _deliver_text(s: String) -> void:
		_q.push_back({"is_text": true, "data": s})

	func _deliver_bin(b: PackedByteArray) -> void:
		_q.push_back({"is_text": false, "data": b})
