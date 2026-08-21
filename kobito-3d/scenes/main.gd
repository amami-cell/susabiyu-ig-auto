extends Node
## 入口。ロビー ⇄ ゲーム を切り替えるだけの薄い層。

const GardenScene := preload("res://scenes/world/garden.tscn")

var _garden: Node3D = null

@onready var _lobby: Control = $UI/Lobby
@onready var _hud: Control = $UI/Hud
@onready var _pad: Control = $UI/TouchPad


func _ready() -> void:
	_show_lobby(true)
	_build_vignette()
	Net.session_started.connect(_on_session_started)
	Net.session_ended.connect(_on_session_ended)
	Net.biome_changed.connect(func(b: String) -> void:
		if _garden != null and _garden.has_method("set_biome"):
			_garden.set_biome(b))

	var args := OS.get_cmdline_user_args()
	if args.has("--ws"):
		Net.transport = Net.Transport.WEBSOCKET
	if args.has("--offline"):
		Net.force_offline = true
	if args.has("--ruins"):
		Net.world_biome = "ruins"
	if args.has("--shot"):
		_run_shot()
		return
	if args.has("--selftest"):
		_run_selftest()
	elif args.has("--selftest-host"):
		_run_selftest_host()
	elif args.has("--selftest-join"):
		_run_selftest_join()


## 映画的なビネット（周辺減光）。全機種で効く軽い画面演出＝“今っぽさ”が出る。
## 3Dの上・HUDの下に敷く。中央は透明、周辺だけ暗い放射グラデ。
func _build_vignette() -> void:
	var grad := Gradient.new()
	grad.set_offset(0, 0.62)
	grad.set_color(0, Color(0, 0, 0, 0))
	grad.add_point(1.0, Color(0.02, 0.02, 0.04, 0.30))
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.25, 1.25)
	tex.width = 256
	tex.height = 256

	var rect := TextureRect.new()
	rect.name = "Vignette"
	rect.texture = tex
	rect.stretch_mode = TextureRect.STRETCH_SCALE
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$UI.add_child(rect)
	$UI.move_child(rect, 0)   # 3Dの上・他UIの下


func _show_lobby(lobby_visible: bool) -> void:
	_lobby.visible = lobby_visible
	_hud.visible = not lobby_visible
	_pad.visible = not lobby_visible


func _on_session_started() -> void:
	if _garden != null:
		return
	_garden = GardenScene.instantiate()
	_garden.biome = Net.world_biome
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

	# 石版パズル・同時スイッチが「解ける→緑が戻る」経路を確認する
	var puzzle := _garden.get_node_or_null("StonePuzzle") if _garden != null else null
	var switch := _garden.get_node_or_null("SwitchPair") if _garden != null else null
	var puzzle_ok := false
	if puzzle != null:
		var rec_before := WorldState.recovery
		puzzle.debug_solve()
		await get_tree().create_timer(0.3).timeout
		puzzle_ok = puzzle.solved and WorldState.recovery > rec_before
	var switch_ok := false
	if switch != null:
		var rec2 := WorldState.recovery
		switch.debug_solve()
		await get_tree().create_timer(0.3).timeout
		switch_ok = switch.solved and WorldState.recovery > rec2

	# 飛行が「癒やして集めた5パーツ」で解禁されるかを確認する
	var could_fly_before: bool = players.is_empty() or players[0].can_fly()
	for part in WorldState.FLIGHT_PARTS:
		WorldState.grant_power(part)
	await get_tree().create_timer(0.3).timeout
	var can_fly_after: bool = not players.is_empty() and players[0].can_fly()
	var flight_ok: bool = (not could_fly_before) and can_fly_after and WorldState.has_flight()

	# 子どもNPCが8人そろっているか（生成・後発同期の経路を確認する）。
	# 追従の“寄り具合”はヘッドレスのtick差で揺れるので数値では縛らない
	# ＝ここは 8人いること だけを見る。見え方はスクショで確認する。
	var children := get_tree().get_nodes_in_group("child")
	var nearest := 9999.0
	if not players.is_empty():
		for c in children:
			nearest = minf(nearest, c.global_position.distance_to(players[0].global_position))
	var kids_ok: bool = children.size() == 8

	var ok: bool = _garden != null and players.size() == 1 and bugs.size() > 0 \
		and WorldState.recovery > 0.0 and xp_gained and flight_ok and kids_ok and puzzle_ok and switch_ok
	print("[selftest] 回復度=%.2f XP=%d 経験値=%s 飛行解禁=%s 子ども=%d(最寄り%.1f) 石版=%s 扉=%s" % [
		WorldState.recovery, xp_now, xp_gained, flight_ok, children.size(), nearest, puzzle_ok, switch_ok])
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
	# --green を付けると、回復後（緑）の見た目も撮る（開発確認用）
	if OS.get_cmdline_user_args().has("--green"):
		WorldState.add("source_purified", 3)
		await get_tree().create_timer(1.5).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_green.png")
	# --puzzle を付けると石版パズルを専用カメラで撮る（開発確認用）
	if OS.get_cmdline_user_args().has("--puzzle"):
		var puzzle := _garden.get_node_or_null("StonePuzzle")
		if puzzle != null:
			puzzle.debug_solve()   # 解けた光り方も確認する
		var cam := Camera3D.new()
		add_child(cam)
		cam.global_position = Vector3(-9.0, 3.2, 10.0)
		cam.look_at(Vector3(-9.0, 0.6, 6.0), Vector3.UP)
		cam.current = true
		await get_tree().create_timer(1.0).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_puzzle.png")
	# --bugs を付けると、アリとコガネムシを近くに出して寄りで撮る（虫の見た目確認）
	if OS.get_cmdline_user_args().has("--bugs") and _garden != null:
		_garden.call("_remote_spawn_bug", 901, "res://data/ant.tres", Vector3(-0.8, 0.6, -1.2))
		_garden.call("_remote_spawn_bug", 902, "res://data/beetle.tres", Vector3(0.9, 0.6, -1.4))
		var cam := Camera3D.new()
		add_child(cam)
		cam.global_position = Vector3(0.0, 1.1, 0.6)
		cam.look_at(Vector3(0.0, 0.4, -1.3), Vector3.UP)
		cam.current = true
		await get_tree().create_timer(1.2).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_bugs.png")
	get_tree().quit()
