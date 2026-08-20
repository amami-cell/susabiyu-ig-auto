extends Control
## タイトル兼ロビー
##
## 「ひとりで始める」も中身はホスト。あとから奥さんが join できる。
## だから “1人用を作ってから多人数化する” という作り直しが発生しない。
##
## 接続先の入れ方（無料でやる順番）:
##   1) 同じWi-Fi … ホスト側に出ている IP をそのまま入れる。追加費用ゼロ。ここから始める。
##   2) 離れた場所 … 中継サーバが要る。README の「オンラインを外に出す」を参照。

@onready var _name_edit: LineEdit = $Panel/VBox/NameEdit
@onready var _addr_edit: LineEdit = $Panel/VBox/AddrEdit
@onready var _status: Label = $Panel/VBox/Status
@onready var _transport: OptionButton = $Panel/VBox/Transport


func _ready() -> void:
	_transport.add_item("ENet（PC/Android・低遅延・おすすめ）", Net.Transport.ENET)
	_transport.add_item("WebSocket（ブラウザでも動く）", Net.Transport.WEBSOCKET)
	_transport.selected = 0

	_addr_edit.text = "127.0.0.1"
	_status.text = "このスマホ/PCのIP: %s" % Net.local_ip_hint()

	$Panel/VBox/SoloButton.pressed.connect(_on_solo)
	$Panel/VBox/HostButton.pressed.connect(_on_host)
	$Panel/VBox/JoinButton.pressed.connect(_on_join)
	Net.status_changed.connect(func(t: String) -> void: _status.text = t)


func _sync_settings() -> void:
	Net.my_display_name = _name_edit.text.strip_edges() if not _name_edit.text.strip_edges().is_empty() else "小人"
	Net.transport = _transport.get_item_id(_transport.selected) as Net.Transport


func _on_solo() -> void:
	_sync_settings()
	Net.start_solo()


func _on_host() -> void:
	_sync_settings()
	Net.host()
	_status.text = "待ち受け中。相手のスマホに %s を入力してもらう" % Net.local_ip_hint()


func _on_join() -> void:
	_sync_settings()
	Net.join(_addr_edit.text.strip_edges())
