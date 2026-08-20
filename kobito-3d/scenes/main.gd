extends Node
## 入口。ロビー ⇄ ゲーム を切り替えるだけの薄い層。

const GardenScene := preload("res://scenes/world/garden.tscn")

var _garden: Node3D = null

@onready var _lobby: Control = $UI/Lobby
@onready var _hud: Control = $UI/Hud
@onready var _pad: Control = $UI/TouchPad


func _ready() -> void:
	_show_lobby(true)
	Net.session_started.connect(_on_session_started)
	Net.session_ended.connect(_on_session_ended)

	var args := OS.get_cmdline_user_args()
	if args.has("--ws"):
		Net.transport = Net.Transport.WEBSOCKET
	if args.has("--offline"):
		Net.force_offline = true
	if args.has("--shot"):
		_run_shot()
		return
	if args.has("--selftest"):
		_run_selftest()
	elif args.has("--selftest-host"):
		_run_selftest_host()
	elif args.has("--selftest-join"):
		_run_selftest_join()


func _show_lobby(lobby_visible: bool) -> void:
	_lobby.visible = lobby_visible
	_hud.visible = not lobby_visible
	_pad.visible = not lobby_visible


func _on_session_started() -> void:
	if _garden != null:
		return
	_garden = GardenScene.instantiate()
	$World.add_child(_garden)
	_show_lobby(false)


func _on_session_ended(_reason: String) -> void:
	if _garden != null:
		_garden.queue_free()
		_garden = null
	WorldState.reset()
	_show_lobby(true)


func _unhandled_input(event: InputEvent) -> void:
	# スマホの「戻る」キー / PCの Esc で退出
	if event.is_action_pressed("ui_cancel") and Net.is_online:
		Net.leave("ロビーに戻りました")


# ---------------------------------------------------------------- 自己点検
#
# 「pushしたら壊れていないか自動で分かる」状態を最初から作っておく。
# GitHub Actions から下のように呼ぶ（詳細は .github/workflows/kobito_build.yml）:
#   godot --headless --path kobito-3d -- --selftest        … ひとりぶんの通し確認
#   godot --headless --path kobito-3d -- --selftest-host   … 2台つなぐ確認（ホスト側）
#   godot --headless --path kobito-3d -- --selftest-join   … 2台つなぐ確認（参加側）

func _run_selftest() -> void:
	print("[selftest] ホスト開始")
	Net.start_solo()
	await get_tree().create_timer(4.0).timeout
	var players := get_tree().get_nodes_in_group("player")
	var bugs := get_tree().get_nodes_in_group("bug")
	print("[selftest] 庭=%s プレイヤー=%d 虫=%d" % [_garden != null, players.size(), bugs.size()])

	# 戦闘→経験値→レベルの一本道が通っているかを確認する
	var xp_before := 0
	if not players.is_empty():
		xp_before = players[0].xp
	if not bugs.is_empty():
		bugs[0].cleanse(9999, players[0].name.to_int())
		await get_tree().create_timer(0.5).timeout

	WorldState.add("drain_cleared")
	await get_tree().create_timer(0.5).timeout

	var xp_gained := false
	var xp_now := 0
	if not players.is_empty():
		xp_now = players[0].xp
		xp_gained = xp_now > xp_before
	var ok: bool = _garden != null and players.size() == 1 and bugs.size() > 0 \
		and WorldState.recovery > 0.0 and xp_gained
	print("[selftest] 回復度=%.2f XP=%d 経験値入った=%s" % [WorldState.recovery, xp_now, xp_gained])
	print("[selftest] %s" % ("OK" if ok else "NG"))
	get_tree().quit(0 if ok else 1)


func _run_selftest_host() -> void:
	Net.my_display_name = "夫"
	Net.host()
	var ok := await _wait_until(func() -> bool:
		return Net.roster.size() == 2 and get_tree().get_nodes_in_group("player").size() == 2, 20.0)
	# ここで即 quit すると、参加側がまだ自分の庭を組み立て終える前に切断され、
	# 参加側が roster をクリアしてしまう（＝参加側だけ 0 に見える）。
	# 参加側が同期を終える猶予を残してから落ちる。
	await get_tree().create_timer(6.0).timeout
	print("[selftest-host] 名簿=%d プレイヤーノード=%d" % [Net.roster.size(), get_tree().get_nodes_in_group("player").size()])
	print("[selftest-host] %s" % ("OK" if ok else "NG"))
	get_tree().quit(0 if ok else 1)


func _run_selftest_join() -> void:
	Net.my_display_name = "妻"
	Net.join("127.0.0.1")
	var ok := await _wait_until(func() -> bool:
		return Net.roster.size() == 2 \
			and get_tree().get_nodes_in_group("player").size() == 2 \
			and get_tree().get_nodes_in_group("bug").size() > 0, 20.0)
	print("[selftest-join] 名簿=%d プレイヤーノード=%d 虫=%d" % [
		Net.roster.size(),
		get_tree().get_nodes_in_group("player").size(),
		get_tree().get_nodes_in_group("bug").size()])
	print("[selftest-join] %s" % ("OK" if ok else "NG"))
	# ホスト側が名簿=2 を確認する時間を残してから落ちる
	await get_tree().create_timer(3.0).timeout
	get_tree().quit(0 if ok else 1)


## 条件が満たされるまで待つ（最大 timeout 秒）。満たされたら true。
func _wait_until(cond: Callable, timeout: float) -> bool:
	var waited := 0.0
	while waited < timeout:
		if cond.call():
			return true
		await get_tree().create_timer(0.25).timeout
		waited += 0.25
	return false


func _run_shot() -> void:
	await get_tree().create_timer(1.5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("/tmp/shot_lobby.png")
	Net.start_solo()
	await get_tree().create_timer(3.0).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("/tmp/shot_game.png")
	get_tree().quit()
