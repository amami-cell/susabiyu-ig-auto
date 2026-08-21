extends Control
## タイトル兼ロビー
##
## 「ひとりで始める」も中身はホスト。あとから奥さんが join できる。
## だから “1人用を作ってから多人数化する” という作り直しが発生しない。
##
## ブラウザ版（iPhone想定）だけは事情が違う:
##   ブラウザは待ち受けができない＝ホストになれない。必ず「参加する」側になる。
##   参加先は、このページを配っている相手を初期値に入れておくので、普通は触らなくていい。

@onready var _name_edit: LineEdit = $Panel/VBox/NameEdit
@onready var _addr_edit: LineEdit = $Panel/VBox/AddrEdit
@onready var _status: Label = $Panel/VBox/Status
@onready var _transport: OptionButton = $Panel/VBox/Transport
@onready var _solo: Button = $Panel/VBox/SoloButton
@onready var _host: Button = $Panel/VBox/HostButton
@onready var _join: Button = $Panel/VBox/JoinButton


var _biome: OptionButton = null

func _ready() -> void:
	# 舞台セレクタを名前欄の下に差し込む（庭/遺跡）
	_biome = OptionButton.new()
	_biome.add_item("庭（家族の巣・緑がよく戻る）", 0)
	_biome.add_item("遺跡（薄暗い石の世界・石版パズル）", 1)
	var vbox := $Panel/VBox
	vbox.add_child(_biome)
	vbox.move_child(_biome, 2)   # なまえ／通信路 の下あたり

	_transport.add_item("ENet（PC/Android・低遅延・おすすめ）", Net.Transport.ENET)
	_transport.add_item("WebSocket（ブラウザでも動く）", Net.Transport.WEBSOCKET)
	_transport.selected = 1 if Net.transport == Net.Transport.WEBSOCKET else 0

	_solo.pressed.connect(_on_solo)
	_host.pressed.connect(_on_host)
	_join.pressed.connect(_on_join)
	Net.status_changed.connect(func(t: String) -> void: _status.text = t)

	if Net.is_web():
		_setup_for_browser()
	else:
		_setup_for_app()


## PC / Android（＝ホストを務められる側）
func _setup_for_app() -> void:
	_addr_edit.text = "127.0.0.1"
	_status.text = "このPC/スマホのIP: %s" % Net.local_ip_hint()


## ブラウザ（＝iPhone想定。参加専用）
func _setup_for_browser() -> void:
	# 通信路は WebSocket 固定。選ばせても間違えるだけなので隠す。
	_transport.visible = false
	_host.visible = false
	if _biome != null:
		_biome.visible = false
	_solo.text = "ひとりで試す（通信なし）"
	_join.text = "ホストに参加する"
	_addr_edit.text = Net.web_default_address()
	_status.text = "ブラウザ版は参加専用です。PCかAndroid側で「ホストする」を押してもらってください。"


func _sync_settings() -> void:
	var typed := _name_edit.text.strip_edges()
	Net.my_display_name = typed if not typed.is_empty() else "小人"
	if not Net.is_web():
		Net.transport = _transport.get_item_id(_transport.selected) as Net.Transport
	if _biome != null:
		Net.world_biome = "ruins" if _biome.selected == 1 else "garden"


func _on_solo() -> void:
	_sync_settings()
	Net.start_solo()


func _on_host() -> void:
	_sync_settings()
	if Net.host() == OK:
		_status.text = "待ち受け中。相手の端末に %s を入力してもらう" % Net.local_ip_hint()


func _on_join() -> void:
	_sync_settings()
	Net.join(_addr_edit.text.strip_edges())
