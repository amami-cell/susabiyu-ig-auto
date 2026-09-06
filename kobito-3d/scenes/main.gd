extends Node
## 入口。ロビー ⇄ ゲーム を切り替えるだけの薄い層。

const GardenScene := preload("res://scenes/world/garden.tscn")
const StoryUIScript := preload("res://scenes/ui/story_ui.gd")

var _garden: Node3D = null

@onready var _lobby: Control = $UI/Lobby
@onready var _hud: Control = $UI/Hud
@onready var _pad: Control = $UI/TouchPad


func _ready() -> void:
	_setup_gamepad()
	_show_lobby(true)
	_build_vignette()
	# 物語UI（目的・会話・章クリア）を最前面に敷く
	var story := StoryUIScript.new()
	story.name = "StoryUI"
	$UI.add_child(story)
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


## ゲームパッド対応：既存の操作（キーボード／タッチと同じアクション）に、
## コントローラの入力を後付けする。コードだけ＝設定ファイルを壊さず安全。
## 左スティック/十字＝移動、A＝ジャンプ、X＝きれいに（攻撃）、B＝つかむ、START＝ポーズ。
## 右スティックのカメラは player 側で読む。
func _setup_gamepad() -> void:
	_joy_axis("move_left", JOY_AXIS_LEFT_X, -1.0)
	_joy_axis("move_right", JOY_AXIS_LEFT_X, 1.0)
	_joy_axis("move_forward", JOY_AXIS_LEFT_Y, -1.0)
	_joy_axis("move_back", JOY_AXIS_LEFT_Y, 1.0)
	_joy_btn("move_left", JOY_BUTTON_DPAD_LEFT)
	_joy_btn("move_right", JOY_BUTTON_DPAD_RIGHT)
	_joy_btn("move_forward", JOY_BUTTON_DPAD_UP)
	_joy_btn("move_back", JOY_BUTTON_DPAD_DOWN)
	_joy_btn("act_jump", JOY_BUTTON_A)
	_joy_btn("act_attack", JOY_BUTTON_X)
	_joy_btn("act_grab", JOY_BUTTON_B)
	_joy_btn("ui_cancel", JOY_BUTTON_START)


func _joy_axis(action: String, axis: int, value: float) -> void:
	if not InputMap.has_action(action):
		return
	var e := InputEventJoypadMotion.new()
	e.axis = axis
	e.axis_value = value
	InputMap.action_add_event(action, e)


func _joy_btn(action: String, button: int) -> void:
	if not InputMap.has_action(action):
		return
	var e := InputEventJoypadButton.new()
	e.button_index = button
	InputMap.action_add_event(action, e)


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
	# 庭が組み上がったので、「つづきから」を選んでいたらここで復元する。
	Chapter.apply_pending_continue()


func _on_session_ended(_reason: String) -> void:
	if _garden != null:
		_garden.queue_free()
		_garden = null
	if _pause != null:
		_pause.queue_free()
		_pause = null
	WorldState.reset()
	_show_lobby(true)


func _unhandled_input(event: InputEvent) -> void:
	# スマホの「戻る」キー / PCの Esc でポーズメニュー（遊んでいる間だけ）
	if event.is_action_pressed("ui_cancel") and _garden != null:
		_toggle_pause()
		get_viewport().set_input_as_handled()


# ---------------------------------------------------------------- ポーズメニュー
#
# 遊んでいる最中に Esc／戻る で開く。オンライン協力なので“時間は止めない”（相手は動き続ける）。
# メニューを重ねて出すだけ＝ソロでもオンラインでも同じ挙動で安全。

var _pause: Control = null

func _toggle_pause() -> void:
	if _pause == null:
		_build_pause()
		return
	_pause.visible = not _pause.visible


func _build_pause() -> void:
	_pause = Control.new()
	_pause.name = "PauseMenu"
	_pause.set_anchors_preset(Control.PRESET_FULL_RECT)
	$UI.add_child(_pause)

	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.5)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_pause.add_child(dim)

	var box := Panel.new()
	box.anchor_left = 0.5
	box.anchor_top = 0.5
	box.anchor_right = 0.5
	box.anchor_bottom = 0.5
	box.offset_left = -220.0
	box.offset_top = -180.0
	box.offset_right = 220.0
	box.offset_bottom = 180.0
	box.add_theme_stylebox_override("panel", UIKit.panel(UIKit.CREAM, UIKit.GREEN_DK, 22, 4, 20))
	_pause.add_child(box)

	var vb := VBoxContainer.new()
	vb.set_anchors_preset(Control.PRESET_FULL_RECT)
	vb.offset_left = 26
	vb.offset_top = 24
	vb.offset_right = -26
	vb.offset_bottom = -24
	vb.add_theme_constant_override("separation", 14)
	box.add_child(vb)

	var title := Label.new()
	title.text = "ポーズ"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	UIKit.style_label(title, 30, UIKit.INK)
	vb.add_child(title)

	var vol_label := Label.new()
	vol_label.text = "音量"
	UIKit.style_label(vol_label, 18, UIKit.INK)
	vb.add_child(vol_label)
	var vol := HSlider.new()
	vol.min_value = 0.0
	vol.max_value = 1.0
	vol.step = 0.05
	vol.value = Sfx.get_master_volume()
	vol.custom_minimum_size = Vector2(0, 40)
	vb.add_child(vol)
	vol.value_changed.connect(func(v: float) -> void: Sfx.set_master_volume(v))

	var resume := Button.new()
	resume.text = "つづける"
	resume.custom_minimum_size = Vector2(0, 54)
	UIKit.style_button(resume, UIKit.GREEN, UIKit.GREEN_DK)
	vb.add_child(resume)
	resume.pressed.connect(func() -> void: _pause.visible = false)

	var quit := Button.new()
	quit.text = "タイトルへ戻る"
	quit.custom_minimum_size = Vector2(0, 54)
	UIKit.style_button(quit, Color(0.95, 0.72, 0.72), Color(0.8, 0.45, 0.45))
	quit.add_theme_color_override("font_color", UIKit.INK)
	vb.add_child(quit)
	quit.pressed.connect(func() -> void:
		_pause.visible = false
		Net.leave("タイトルに戻りました"))


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
	# 開始直後（掃除の章）は まわりから虫が湧かない設計なので、戦闘系の確認用に手動で湧かす。
	if _garden != null and _garden.has_method("_spawn_bug"):
		_garden._spawn_bug()
		_garden._spawn_bug()
		await get_tree().create_timer(1.0).timeout
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

	# 虫を癒やすと「なかま虫」が生まれて一緒に戦う経路を確認する
	var ally_ok: bool = get_tree().get_nodes_in_group("ally").size() > 0

	# セーブ（つづきから）：章を進めるとチェックポイントが書かれるかを確認する
	Chapter.rpc("_set_beat", 2)
	await get_tree().create_timer(0.3).timeout
	var save_ok: bool = Chapter.has_save() and Chapter.save_label() != ""

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

	# 母（妻）が家族の先頭に居るか
	var mother: Node = _garden.get_node_or_null("Children/Mother") if _garden != null else null
	var mother_ok: bool = mother != null

	# ボスが「小さな虫を生み出す」経路を確認する（2人プレイの役割分担のキモ）。
	# ボスを目の前に出し→交戦→召喚で雑魚が増えることを見る。
	var boss_ok := false
	if _garden != null and _garden.has_method("_on_chapter_boss") and not players.is_empty():
		var ants_before := _count_minions()
		_garden._on_chapter_boss()
		# 0.5秒ごとに最大14秒ポーリング＝CIランナーが遅くても取りこぼさない
		# （固定待ちだと、ヘッドレス物理が実時間より遅い環境で召喚前に判定してしまう）。
		for _i in 28:
			await get_tree().create_timer(0.5).timeout
			var has_boss := false
			for b in get_tree().get_nodes_in_group("bug"):
				var st: Variant = b.get("stats")
				if st != null and st.is_midboss:
					has_boss = true
					break
			if has_boss and _count_minions() > ants_before:
				boss_ok = true
				break

	var ok: bool = _garden != null and players.size() == 1 and bugs.size() > 0 \
		and WorldState.recovery > 0.0 and xp_gained and flight_ok and kids_ok and mother_ok and puzzle_ok and switch_ok and ally_ok and save_ok and boss_ok
	print("[selftest] 回復度=%.2f XP=%d 経験値=%s 飛行解禁=%s 子ども=%d(最寄り%.1f) 母=%s 石版=%s 扉=%s なかま=%s セーブ=%s ボス召喚=%s" % [
		WorldState.recovery, xp_now, xp_gained, flight_ok, children.size(), nearest, mother_ok, puzzle_ok, switch_ok, ally_ok, save_ok, boss_ok])
	print("[selftest] %s" % ("OK" if ok else "NG"))
	get_tree().quit(0 if ok else 1)


## 中ボス以外（＝ボスが生み出す小さな虫）の数を数える。
func _count_minions() -> int:
	var n := 0
	for b in get_tree().get_nodes_in_group("bug"):
		var st: Variant = b.get("stats")
		if st != null and not st.is_midboss:
			n += 1
	return n


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
	# --attack を付けると、プレイヤーの攻撃を振らせて実カメラ(背後)から連写する（振りの確認）
	if OS.get_cmdline_user_args().has("--attack") and _garden != null:
		var p: Node = _garden.local_player()
		var times := [0.06, 0.13, 0.22, 0.30]   # 背後の実カメラで、薙ぎが横に振れる各時点を撮る
		if p != null:
			p.call("_remote_swing")
		var elapsed := 0.0
		for i in times.size():
			var want: float = times[i]
			while elapsed < want:
				await get_tree().create_timer(0.02).timeout
				elapsed += 0.02
			await RenderingServer.frame_post_draw
			get_viewport().get_texture().get_image().save_png("/tmp/shot_attack%d.png" % i)
	# --face を付けると、プレイヤーの正面に寄って撮る（キャラの顔・見た目確認）
	if OS.get_cmdline_user_args().has("--face") and _garden != null:
		var pf: Node = _garden.local_player()
		var fc := Vector3.ZERO
		if pf != null:
			fc = pf.global_position
		var fcam := Camera3D.new()
		add_child(fcam)
		fcam.global_position = fc + Vector3(0.35, 0.85, 1.9)   # 顔は+Z側（追従カメラと同じ向き）
		fcam.look_at(fc + Vector3(0.0, 0.6, 0.0), Vector3.UP)
		fcam.current = true
		await get_tree().create_timer(0.6).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_face.png")
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
		# ヒット演出（火花＋ダメージ数字＋つぶれ）の確認：アリを非致死で叩く
		for b in get_tree().get_nodes_in_group("bug"):
			b.call("_remote_hit", 6)
		await get_tree().create_timer(0.08).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_hit.png")
	# --family を付けると、家族を一列に並べて撮る（家族ごとの見た目差の確認）
	if OS.get_cmdline_user_args().has("--family"):
		var fam := [
			{"name": "父", "color": Color(0.30, 0.55, 0.95), "scale": 1.0, "role": "adult"},
			{"name": "母", "color": Color(0.88, 0.44, 0.52), "scale": 0.92, "role": "adult"},
			{"name": "スミレ", "color": Color(0.55, 0.40, 0.70), "scale": 0.68, "role": "child"},
			{"name": "カヤ", "color": Color(0.85, 0.50, 0.25), "scale": 0.66, "role": "child"},
			{"name": "ソラ", "color": Color(0.50, 0.75, 0.95), "scale": 0.62, "role": "child"},
			{"name": "シズク", "color": Color(0.55, 0.80, 0.85), "scale": 0.60, "role": "child"},
			{"name": "リン", "color": Color(0.58, 0.82, 0.42), "scale": 0.58, "role": "child"},
			{"name": "ラン", "color": Color(0.50, 0.74, 0.38), "scale": 0.58, "role": "child"},
			{"name": "マメ", "color": Color(0.66, 0.70, 0.35), "scale": 0.56, "role": "child"},
			{"name": "つぼみ", "color": Color(0.95, 0.65, 0.75), "scale": 0.46, "role": "child"},
			{"name": "おじい", "color": Color(0.70, 0.70, 0.72), "scale": 0.9, "role": "adult"},
		]
		var root := Node3D.new()
		add_child(root)
		root.global_position = Vector3(0.0, 0.0, -40.0)
		var x := -(fam.size() - 1) * 0.58
		for d in fam:
			var holder := Node3D.new()
			root.add_child(holder)
			holder.position = Vector3(x, 0.0, 0.0)
			holder.scale = Vector3.ONE * float(d["scale"])
			var mi := MeshInstance3D.new()
			var cap := CapsuleMesh.new()
			cap.radius = 0.25
			cap.height = 1.0
			mi.mesh = cap
			holder.add_child(mi)
			KobitoLook.decorate(mi, d["color"], false, d["role"], d["name"])
			var lbl := Label3D.new()
			lbl.text = d["name"]
			lbl.position = Vector3(0.0, 1.1, 0.0)
			lbl.pixel_size = 0.006
			lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			holder.add_child(lbl)
			x += 1.16
		var lightp := DirectionalLight3D.new()
		lightp.rotation = Vector3(deg_to_rad(-45.0), deg_to_rad(30.0), 0.0)
		root.add_child(lightp)
		var fcam := Camera3D.new()
		add_child(fcam)
		fcam.global_position = Vector3(0.0, 1.1, -30.0)
		fcam.look_at(Vector3(0.0, 0.5, -40.0), Vector3.UP)
		fcam.fov = 70.0
		fcam.current = true
		await get_tree().create_timer(1.0).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_family.png")
	# --patterns：本物モデルを“誇張ちがい”6パターン並べて撮る（デフォルメの方向決め）
	if OS.get_cmdline_user_args().has("--patterns") and ResourceLoader.exists("res://assets/human_base.glb"):
		var defs := [
			{"n": "1 リアル寄り", "head": 1.3, "hand": 1.0, "foot": 1.0, "body": 1.0, "leg": 1.0, "col": Color(0.5, 0.7, 1.0), "lit": 0.05},
			{"n": "2 標準チビ", "head": 2.0, "hand": 1.3, "foot": 1.3, "body": 1.05, "leg": 1.0, "col": Color(1.0, 0.7, 0.4), "lit": 0.1},
			{"n": "3 デカ頭2頭身", "head": 2.8, "hand": 1.4, "foot": 1.4, "body": 1.0, "leg": 0.95, "col": Color(0.7, 0.9, 0.5), "lit": 0.12},
			{"n": "4 まんまる", "head": 2.3, "hand": 1.6, "foot": 1.6, "body": 1.45, "leg": 0.75, "col": Color(1.0, 0.6, 0.72), "lit": 0.2},
			{"n": "5 ぷにデフォルメ", "head": 2.4, "hand": 1.9, "foot": 1.9, "body": 1.2, "leg": 0.7, "col": Color(0.7, 0.85, 1.0), "lit": 0.16},
			{"n": "6 小顔スタイリッシュ", "head": 1.55, "hand": 1.05, "foot": 1.1, "body": 0.95, "leg": 1.2, "col": Color(0.9, 0.55, 0.95), "lit": 0.03},
		]
		var proot := Node3D.new()
		add_child(proot)
		proot.global_position = Vector3(0.0, 0.0, -40.0)
		var packed: PackedScene = load("res://assets/human_base.glb")
		var pending: Array = []   # [[skel, defDict], ...] 撮影直前にボーンスケール再適用
		var px := -(defs.size() - 1) * 0.75
		for d in defs:
			var holder := Node3D.new()
			proot.add_child(holder)
			holder.position = Vector3(px, 0.0, 0.0)
			var m: Node3D = packed.instantiate()
			holder.add_child(m)
			m.scale = Vector3.ONE * 0.052
			m.position = Vector3(0.0, 0.0, 0.0)
			m.rotation.y = PI   # 顔をカメラ(-Z前方)へ向ける
			var ap: AnimationPlayer = m.find_child("AnimationPlayer", true, false)
			if ap != null and ap.has_animation("Idle"):
				ap.play("Idle")
			var skel: Skeleton3D = m.find_child("Skeleton3D", true, false)
			_pattern_tint(m, d["col"], d["lit"])
			pending.append([skel, d])
			var lbl := Label3D.new()
			lbl.text = d["n"]
			lbl.position = Vector3(px, 1.75, 0.0)
			lbl.pixel_size = 0.005
			lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			proot.add_child(lbl)
			px += 1.5
		var lightp := DirectionalLight3D.new()
		lightp.rotation = Vector3(deg_to_rad(-40.0), deg_to_rad(20.0), 0.0)
		proot.add_child(lightp)
		var pcam := Camera3D.new()
		add_child(pcam)
		pcam.global_position = Vector3(0.0, 1.5, -46.5)   # 行の手前(-Z)から顔を見る
		pcam.look_at(Vector3(0.0, 1.0, -40.0), Vector3.UP)
		pcam.fov = 52.0
		pcam.current = true
		await get_tree().create_timer(0.8).timeout
		for pr in pending:      # アニメ適用後にボーンスケールを効かせる
			_pattern_bones(pr[0], pr[1])
		await RenderingServer.frame_post_draw
		_pattern_bones_all(pending)
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_patterns.png")
	# --faces：同じチビ体型に“顔パターン”6種を乗せて撮る（目・口・ほっぺの表情ちがい）
	if OS.get_cmdline_user_args().has("--faces") and ResourceLoader.exists("res://assets/human_base.glb"):
		var styles := ["まる目", "キラキラ", "ジト目", "にっこり^^", "たれ目", "点目まめ"]
		var froot := Node3D.new()
		add_child(froot)
		froot.global_position = Vector3(0.0, 0.0, -40.0)
		var fpacked: PackedScene = load("res://assets/human_base.glb")
		var body := {"head": 2.3, "hand": 1.3, "foot": 1.3, "body": 1.05, "leg": 0.95}
		var faces_pending: Array = []   # [holder, skel, style]
		var fx := -(styles.size() - 1) * 0.75
		for st in styles:
			var holder := Node3D.new()
			froot.add_child(holder)
			holder.position = Vector3(fx, 0.0, 0.0)
			var m: Node3D = fpacked.instantiate()
			holder.add_child(m)
			m.scale = Vector3.ONE * 0.052
			m.rotation.y = PI
			var ap: AnimationPlayer = m.find_child("AnimationPlayer", true, false)
			if ap != null and ap.has_animation("Idle"):
				ap.play("Idle")
			var skel: Skeleton3D = m.find_child("Skeleton3D", true, false)
			var lbl := Label3D.new()
			lbl.text = st
			lbl.position = Vector3(fx, 1.7, 0.0)
			lbl.pixel_size = 0.004
			lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			froot.add_child(lbl)
			faces_pending.append([holder, skel, st])
			fx += 1.5
		var flight := DirectionalLight3D.new()
		flight.rotation = Vector3(deg_to_rad(-35.0), deg_to_rad(15.0), 0.0)
		froot.add_child(flight)
		var fcam2 := Camera3D.new()
		add_child(fcam2)
		fcam2.global_position = Vector3(0.0, 1.15, -45.4)
		fcam2.look_at(Vector3(0.0, 1.05, -40.0), Vector3.UP)
		fcam2.fov = 44.0
		fcam2.current = true
		await get_tree().create_timer(0.8).timeout
		for fp in faces_pending:
			_pattern_bones(fp[1], body)               # チビ体型を適用
		await RenderingServer.frame_post_draw
		for fp in faces_pending:
			_pattern_bones(fp[1], body)
			_build_overlay_face(fp[0], fp[1], fp[2])  # 頭の位置に顔パーツを乗せる
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_faces.png")
	# --facepat：本物モデル＋大きなアニメ目の“表情パターン”6種（本採用の仕様で確認）
	if OS.get_cmdline_user_args().has("--facepat") and ResourceLoader.exists("res://assets/human_base.glb"):
		$UI.visible = false   # HUD/会話を隠してキャラだけ見せる
		var fstyles := ["まる目", "キラキラ", "うるうる", "たれ目", "ジト目", "にっこり^^"]
		var fr := Node3D.new()
		add_child(fr)
		fr.global_position = Vector3(0.0, 0.0, -40.0)
		var fpk: PackedScene = load("res://assets/human_base.glb")
		var bodyd := {"head": 2.3, "hand": 1.3, "foot": 1.3, "body": 1.05, "leg": 0.95}
		var fpend: Array = []
		var fxp := -(fstyles.size() - 1) * 0.75
		for st in fstyles:
			var h := Node3D.new()
			fr.add_child(h)
			h.position = Vector3(fxp, 0.0, 0.0)
			var m: Node3D = fpk.instantiate()
			h.add_child(m)
			m.scale = Vector3.ONE * 0.052
			m.rotation.y = PI
			var ap: AnimationPlayer = m.find_child("AnimationPlayer", true, false)
			if ap != null and ap.has_animation("Idle"):
				ap.play("Idle")
			var sk: Skeleton3D = m.find_child("Skeleton3D", true, false)
			var lb := Label3D.new()
			lb.text = st
			lb.position = Vector3(fxp, 1.7, 0.0)
			lb.pixel_size = 0.004
			lb.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			fr.add_child(lb)
			fpend.append([h, sk, st])
			fxp += 1.5
		var fl := DirectionalLight3D.new()
		fl.rotation = Vector3(deg_to_rad(-35.0), deg_to_rad(15.0), 0.0)
		fr.add_child(fl)
		var fcp := Camera3D.new()
		add_child(fcp)
		fcp.global_position = Vector3(0.0, 1.25, -47.0)
		fcp.look_at(Vector3(0.0, 1.02, -40.0), Vector3.UP)
		fcp.fov = 40.0
		fcp.current = true
		await get_tree().create_timer(0.8).timeout
		for fp in fpend:
			_pattern_bones(fp[1], bodyd)
		await RenderingServer.frame_post_draw
		for fp in fpend:
			_pattern_bones(fp[1], bodyd)
			_facepat(fp[0], fp[1], fp[2])
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_facepat.png")
	# --stylepat：本物モデル(自然頭身)の“絵づくり”6パターン（シェーディング違い）
	if OS.get_cmdline_user_args().has("--stylepat") and ResourceLoader.exists("res://assets/human_base.glb"):
		$UI.visible = false
		var sdefs := [
			{"n": "1 標準", "k": "std"},
			{"n": "2 トゥーン", "k": "toon"},
			{"n": "3 トゥーン+輪郭線", "k": "toon_ol"},
			{"n": "4 アニメ強め", "k": "anime"},
			{"n": "5 水彩絵本", "k": "water"},
			{"n": "6 リアル寄り", "k": "real"},
		]
		var sr := Node3D.new()
		add_child(sr)
		sr.global_position = Vector3(0.0, 0.0, -40.0)
		var spk: PackedScene = load("res://assets/human_base.glb")
		var sbody := {"head": 1.32, "hand": 1.1, "foot": 1.1, "body": 1.0, "leg": 1.0}
		var spend: Array = []
		var sxp := -(sdefs.size() - 1) * 0.8
		for d in sdefs:
			var h := Node3D.new()
			sr.add_child(h)
			h.position = Vector3(sxp, 0.0, 0.0)
			var m: Node3D = spk.instantiate()
			h.add_child(m)
			m.scale = Vector3.ONE * 0.052
			m.rotation.y = PI
			var ap: AnimationPlayer = m.find_child("AnimationPlayer", true, false)
			if ap != null and ap.has_animation("Idle"):
				ap.play("Idle")
			var sk: Skeleton3D = m.find_child("Skeleton3D", true, false)
			_apply_style(m, d["k"])
			var lb := Label3D.new()
			lb.text = d["n"]
			lb.position = Vector3(sxp, 1.85, 0.0)
			lb.pixel_size = 0.0045
			lb.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			sr.add_child(lb)
			spend.append([sk, sbody])
			sxp += 1.6
		var sl := DirectionalLight3D.new()
		sl.rotation = Vector3(deg_to_rad(-38.0), deg_to_rad(20.0), 0.0)
		sr.add_child(sl)
		var scp := Camera3D.new()
		add_child(scp)
		scp.global_position = Vector3(0.0, 1.2, -46.8)
		scp.look_at(Vector3(0.0, 1.02, -40.0), Vector3.UP)
		scp.fov = 46.0
		scp.current = true
		await get_tree().create_timer(0.8).timeout
		for sp in spend:
			_pattern_bones(sp[0], sp[1])
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_stylepat.png")
	# --exprpat：表情管理のデモ（本採用のトゥーン+輪郭線キャラで5表情）
	if OS.get_cmdline_user_args().has("--exprpat") and KobitoModel.has_model():
		$UI.visible = false
		var exprs := ["happy", "neutral", "sad", "surprised", "angry"]
		var er := Node3D.new()
		add_child(er)
		er.global_position = Vector3(0.0, 0.0, -40.0)
		var exp := -(exprs.size() - 1) * 0.65
		for ex in exprs:
			var h := Node3D.new()
			er.add_child(h)
			h.position = Vector3(exp, 0.0, 0.0)
			var body := MeshInstance3D.new()
			var cap := CapsuleMesh.new()
			cap.radius = 0.25
			cap.height = 1.0
			body.mesh = cap
			h.add_child(body)
			var km := KobitoModel.new()
			body.add_child(km)
			km.setup(body, Color(0.55, 0.72, 1.0), "adult", "")
			km.set_expression(ex)
			var lb := Label3D.new()
			lb.text = ex
			lb.position = Vector3(exp, 1.55, 0.0)
			lb.pixel_size = 0.004
			lb.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			er.add_child(lb)
			exp += 1.3
		var el := DirectionalLight3D.new()
		el.rotation = Vector3(deg_to_rad(-35.0), deg_to_rad(15.0), 0.0)
		er.add_child(el)
		var ecp := Camera3D.new()
		add_child(ecp)
		ecp.global_position = Vector3(0.0, 1.02, -44.6)
		ecp.look_at(Vector3(0.0, 0.92, -40.0), Vector3.UP)
		ecp.fov = 34.0
		ecp.current = true
		await get_tree().create_timer(1.0).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("/tmp/shot_expr.png")
	get_tree().quit()


## 本物モデルの材質に“絵づくり”を適用（--stylepat 用）。std/toon/toon_ol/anime/water/real。
func _apply_style(model: Node, style: String) -> void:
	for n in model.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		var cnt := mi.mesh.get_surface_count() if mi.mesh != null else 0
		for s in cnt:
			var base := mi.get_active_material(s)
			if base == null:
				continue
			var m := base.duplicate() as BaseMaterial3D
			if m == null:
				continue
			if style in ["toon", "toon_ol", "anime", "water"]:
				m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
				m.specular_mode = BaseMaterial3D.SPECULAR_TOON
				m.rim_enabled = true
				m.rim = 0.35
			if style == "water":
				m.albedo_color = m.albedo_color.lightened(0.14)
				m.roughness = 1.0
				m.rim = 0.6
				m.rim_tint = 0.5
			if style == "real":
				m.metallic_specular = 0.5
			if style in ["toon_ol", "anime", "water"]:
				var ol := StandardMaterial3D.new()
				ol.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
				ol.cull_mode = BaseMaterial3D.CULL_FRONT
				ol.grow = true
				if style == "anime":
					ol.grow_amount = 0.6
					ol.albedo_color = Color(0.06, 0.05, 0.06)
				elif style == "water":
					ol.grow_amount = 0.12
					ol.albedo_color = Color(0.34, 0.27, 0.24)
				else:
					ol.grow_amount = 0.3
					ol.albedo_color = Color(0.1, 0.08, 0.09)
				m.next_pass = ol
			mi.set_surface_override_material(s, m)


## 本採用の“大きなアニメ目”仕様で、表情スタイル別に顔を乗せる（--facepat 用）。
func _facepat(holder: Node3D, skel: Skeleton3D, style: String) -> void:
	if skel == null:
		return
	var hidx := skel.find_bone("mixamorig_Head")
	if hidx < 0:
		return
	var ht: Transform3D = skel.global_transform * skel.get_bone_global_pose(hidx)
	var ho: Vector3 = ht.origin - holder.global_position
	var r := 0.12
	var eye_c := ho + Vector3(0.0, 0.28, -0.18)
	var mouth_c := ho + Vector3(0.0, 0.12, -0.2)
	var cheek_c := ho + Vector3(0.0, 0.17, -0.18)
	var white := Color(0.98, 0.98, 0.97)
	var blk := Color(0.09, 0.07, 0.09)
	# ほっぺ（共通）
	for sx in [-1.0, 1.0]:
		_wball(holder, Color(1.0, 0.56, 0.6), r * 0.42, cheek_c + Vector3(0.16 * sx, -0.04, 0), Vector3(1.2, 0.9, 0.5), 0.15)
	match style:
		"まる目":
			for sx in [-1.0, 1.0]:
				var e := _wball(holder, white, r * 0.8, eye_c + Vector3(0.095 * sx, 0, 0), Vector3(1.0, 1.25, 0.5), 0.0)
				_wball(e, blk, r * 0.5, Vector3(0, 0, -r * 0.35), Vector3.ONE, 0.0)
				_wball(e, Color(1, 1, 1), r * 0.2, Vector3(r * 0.28, r * 0.3, -r * 0.55), Vector3.ONE, 0.7)
			_face_smile(holder, mouth_c, r, 0.09)
		"キラキラ":
			for sx in [-1.0, 1.0]:
				var e2 := _wball(holder, white, r * 0.9, eye_c + Vector3(0.1 * sx, 0, 0), Vector3(1.0, 1.3, 0.5), 0.0)
				_wball(e2, Color(0.16, 0.1, 0.28), r * 0.62, Vector3(0, 0, -r * 0.3), Vector3.ONE, 0.0)
				_wball(e2, Color(1, 1, 1), r * 0.3, Vector3(r * 0.24, r * 0.3, -r * 0.55), Vector3.ONE, 0.8)
				_wball(e2, Color(1, 1, 1), r * 0.15, Vector3(-r * 0.24, -r * 0.28, -r * 0.5), Vector3.ONE, 0.7)
			_face_smile(holder, mouth_c, r, 0.1)
		"うるうる":
			for sx in [-1.0, 1.0]:
				var e3 := _wball(holder, white, r * 1.02, eye_c + Vector3(0.105 * sx, 0, 0), Vector3(1.0, 1.35, 0.5), 0.0)
				_wball(e3, blk, r * 0.66, Vector3(0, -r * 0.05, -r * 0.28), Vector3.ONE, 0.0)
				_wball(e3, Color(1, 1, 1), r * 0.34, Vector3(r * 0.2, r * 0.34, -r * 0.5), Vector3.ONE, 0.85)
				_wball(e3, Color(1, 1, 1), r * 0.22, Vector3(-r * 0.24, -r * 0.18, -r * 0.5), Vector3.ONE, 0.8)
			_face_smile(holder, mouth_c, r, 0.07)
		"たれ目":
			for sx in [-1.0, 1.0]:
				var e4 := _wball(holder, white, r * 0.82, eye_c + Vector3(0.1 * sx, 0, 0), Vector3(1.2, 1.0, 0.5), 0.0)
				e4.rotation.z = 0.45 * sx
				_wball(e4, blk, r * 0.5, Vector3(0, -r * 0.06, -r * 0.35), Vector3.ONE, 0.0)
				_wball(e4, Color(1, 1, 1), r * 0.2, Vector3(r * 0.24, r * 0.24, -r * 0.5), Vector3.ONE, 0.7)
			_face_smile(holder, mouth_c, r, 0.09)
		"ジト目":
			for sx in [-1.0, 1.0]:
				var e5 := _wball(holder, white, r * 0.78, eye_c + Vector3(0.1 * sx, -r * 0.05, 0), Vector3(1.2, 0.7, 0.5), 0.0)
				_wball(e5, blk, r * 0.42, Vector3(0, 0, -r * 0.35), Vector3.ONE, 0.0)
				# 上まぶたの線
				_wbox(holder, Color(0.1, 0.08, 0.09), Vector3(0.13, 0.02, 0.02), eye_c + Vector3(0.1 * sx, r * 0.28, -0.02), Vector3.ZERO)
			_wbox(holder, Color(0.5, 0.25, 0.25), Vector3(0.09, 0.02, 0.02), mouth_c, Vector3.ZERO)
		"にっこり^^":
			for sx in [-1.0, 1.0]:
				_wbox(holder, Color(0.1, 0.08, 0.09), Vector3(0.09, 0.03, 0.02), eye_c + Vector3(0.1 * sx + 0.035, 0, 0), Vector3.ZERO, 0.7 * sx)
				_wbox(holder, Color(0.1, 0.08, 0.09), Vector3(0.09, 0.03, 0.02), eye_c + Vector3(0.1 * sx - 0.035, 0, 0), Vector3.ZERO, -0.7 * sx)
			_face_smile(holder, mouth_c, r, 0.12)


func _face_smile(holder: Node3D, c: Vector3, r: float, w: float) -> void:
	var col := Color(0.72, 0.34, 0.36)
	_wball(holder, col, r * 0.17, c, Vector3(2.2, 0.7, 0.6), 0.0)
	for sx in [-1.0, 1.0]:
		_wball(holder, col, r * 0.11, c + Vector3(w * 0.5 * sx, r * 0.28, 0), Vector3.ONE, 0.0)


## モデルの頭ボーン位置に、アニメ顔（目・口・ほっぺ）を world 空間で乗せる。style で表情を変える。
func _build_overlay_face(holder: Node3D, skel: Skeleton3D, style: String) -> void:
	if skel == null:
		return
	var hidx := skel.find_bone("mixamorig_Head")
	if hidx < 0:
		return
	var ht: Transform3D = skel.global_transform * skel.get_bone_global_pose(hidx)
	# holder は回転・スケールなしの平行移動のみ＝world→local は引き算でよい
	var ho: Vector3 = ht.origin - holder.global_position
	# 顔は -Z 側（カメラ向き）。頭の基準点から少し上・前へ。
	var fwd := Vector3(0, 0, -1)
	var up := Vector3(0, 1, 0)
	var right := Vector3(1, 0, 0)
	var eye_c := ho + up * 0.30 + fwd * 0.215         # 目の高さ・前面（頭ボーンは首元なので高めに）
	var mouth_c := ho + up * 0.15 + fwd * 0.215
	var cheek_c := ho + up * 0.19 + fwd * 0.2

	# ほっぺ（共通・ピンク）
	for sx in [-1.0, 1.0]:
		_wball(holder, Color(1.0, 0.55, 0.6), 0.05, cheek_c + right * (0.13 * sx), Vector3(1.2, 0.9, 0.5), 0.15)

	match style:
		"まる目":
			for sx in [-1.0, 1.0]:
				var e := _wball(holder, Color(0.97, 0.97, 0.97), 0.07, eye_c + right * (0.1 * sx), Vector3(1.0, 1.2, 0.4), 0.0)
				_wball(e, Color(0.08, 0.06, 0.07), 0.05, fwd * 0.02, Vector3(1, 1, 1), 0.0)
				_wball(e, Color(1, 1, 1), 0.018, fwd * 0.05 + up * 0.02 + right * 0.02, Vector3.ONE, 0.6)
			_smile(holder, mouth_c, right, up, fwd, 0.09)
		"キラキラ":
			for sx in [-1.0, 1.0]:
				var e2 := _wball(holder, Color(0.98, 0.98, 1.0), 0.085, eye_c + right * (0.1 * sx), Vector3(1.0, 1.25, 0.4), 0.0)
				_wball(e2, Color(0.15, 0.1, 0.25), 0.06, fwd * 0.02, Vector3.ONE, 0.0)
				_wball(e2, Color(1, 1, 1), 0.032, fwd * 0.05 + up * 0.025, Vector3.ONE, 0.7)
				_wball(e2, Color(1, 1, 1), 0.016, fwd * 0.05 - up * 0.03, Vector3.ONE, 0.7)
			_smile(holder, mouth_c, right, up, fwd, 0.1)
		"ジト目":
			for sx in [-1.0, 1.0]:
				_wbox(holder, Color(0.1, 0.08, 0.09), Vector3(0.11, 0.03, 0.02), eye_c + right * (0.1 * sx), fwd)
			_wbox(holder, Color(0.5, 0.25, 0.25), Vector3(0.08, 0.02, 0.02), mouth_c, fwd)
		"にっこり^^":
			for sx in [-1.0, 1.0]:
				# ^ 形＝2本の傾いた短い線
				_wbox(holder, Color(0.1, 0.08, 0.09), Vector3(0.07, 0.025, 0.02), eye_c + right * (0.1 * sx) + right * 0.03, fwd, 0.6 * sx)
				_wbox(holder, Color(0.1, 0.08, 0.09), Vector3(0.07, 0.025, 0.02), eye_c + right * (0.1 * sx) - right * 0.03, fwd, -0.6 * sx)
			_smile(holder, mouth_c, right, up, fwd, 0.11)
		"たれ目":
			for sx in [-1.0, 1.0]:
				var e3 := _wball(holder, Color(0.97, 0.97, 0.97), 0.075, eye_c + right * (0.11 * sx) - up * 0.01, Vector3(1.2, 1.0, 0.4), 0.0)
				e3.rotation.z = 0.4 * sx
				_wball(e3, Color(0.08, 0.06, 0.07), 0.05, fwd * 0.02 - up * 0.02, Vector3.ONE, 0.0)
				_wball(e3, Color(1, 1, 1), 0.02, fwd * 0.05 + up * 0.01, Vector3.ONE, 0.6)
			_smile(holder, mouth_c, right, up, fwd, 0.1)
		"点目まめ":
			for sx in [-1.0, 1.0]:
				_wball(holder, Color(0.1, 0.08, 0.09), 0.035, eye_c + right * (0.09 * sx), Vector3.ONE, 0.0)
			for sx in [-1.0, 1.0]:
				_wball(holder, Color(1.0, 0.5, 0.55), 0.07, cheek_c + right * (0.14 * sx), Vector3(1.2, 1.0, 0.5), 0.2)
			_wball(holder, Color(0.5, 0.25, 0.25), 0.022, mouth_c, Vector3(1.6, 1.0, 1.0), 0.0)


## にっこりの口（口角を上げた小さな弧＝3つの点）
func _smile(holder: Node3D, c: Vector3, right: Vector3, up: Vector3, fwd: Vector3, w: float) -> void:
	var col := Color(0.55, 0.25, 0.28)
	_wball(holder, col, 0.02, c, Vector3(2.2, 0.7, 0.6), 0.0)
	_wball(holder, col, 0.016, c + right * (w * 0.5) + up * 0.02, Vector3.ONE, 0.0)
	_wball(holder, col, 0.016, c - right * (w * 0.5) + up * 0.02, Vector3.ONE, 0.0)


func _wball(parent: Node3D, col: Color, r: float, pos: Vector3, sc: Vector3 = Vector3.ONE, emit: float = 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * 2.0
	mi.mesh = sm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = col
	mat.roughness = 0.6
	if emit > 0.0:
		mat.emission_enabled = true
		mat.emission = Color(1, 1, 1)
		mat.emission_energy_multiplier = emit
	mi.material_override = mat
	mi.position = pos
	mi.scale = sc
	parent.add_child(mi)
	return mi


func _wbox(parent: Node3D, col: Color, size: Vector3, pos: Vector3, _fwd: Vector3, roll: float = 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = col
	mat.roughness = 0.6
	mi.material_override = mat
	mi.position = pos
	mi.rotation.z = roll
	parent.add_child(mi)
	return mi


func _pattern_tint(root: Node, col: Color, lit: float) -> void:
	for n in root.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		var cnt := mi.mesh.get_surface_count() if mi.mesh != null else 0
		for s in cnt:
			var base := mi.get_active_material(s)
			if base == null:
				continue
			var mm := base.duplicate() as BaseMaterial3D
			if mm == null:
				continue
			mm.albedo_color = mm.albedo_color.lerp(col, 0.25).lightened(lit)
			mi.set_surface_override_material(s, mm)


func _pattern_bones(skel: Skeleton3D, d: Dictionary) -> void:
	if skel == null:
		return
	_set_bone(skel, "mixamorig_Head", Vector3.ONE * float(d["head"]))
	for b in ["mixamorig_LeftHand", "mixamorig_RightHand"]:
		_set_bone(skel, b, Vector3.ONE * float(d["hand"]))
	for b in ["mixamorig_LeftFoot", "mixamorig_RightFoot"]:
		_set_bone(skel, b, Vector3.ONE * float(d["foot"]))
	# 体の丸みは1ボーン(Spine1)だけ（3つに掛けると指数的に膨張して壊れる）
	_set_bone(skel, "mixamorig_Spine1", Vector3(float(d["body"]), 1.0, float(d["body"])))
	# 脚の短さは太もも(UpLeg)だけ
	for b in ["mixamorig_LeftUpLeg", "mixamorig_RightUpLeg"]:
		_set_bone(skel, b, Vector3(1.0, float(d["leg"]), 1.0))


func _pattern_bones_all(pending: Array) -> void:
	for pr in pending:
		_pattern_bones(pr[0], pr[1])


func _set_bone(skel: Skeleton3D, bone_name: String, s: Vector3) -> void:
	var idx := skel.find_bone(bone_name)
	if idx >= 0:
		skel.set_bone_pose_scale(idx, s)
