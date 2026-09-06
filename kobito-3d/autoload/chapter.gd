extends Node
## 章の進行（自動読み込み: Chapter）— 物語を「頭から終わりまで」遊べる形にする骨組み。
##
## サーバが進行の正。ビート(場面)を進めるたびに全員へ配り、各自の画面で
## 会話・目的・章クリアを表示する（StoryUI が受け取って描く）。
## 各ビートは goal(達成条件)を1つ持ち、満たすと次へ。まずは第1章を通しで実装。
## 章のボリュームは goal の数と目標値で決まる（＝ここを増やすだけで長くできる）。

signal dialogue(lines: PackedStringArray)   # 会話（1行ずつ送る）
signal objective_changed(text: String)      # 画面上の目的表示（""で消す）
signal banner(text: String)                 # 章クリア等の大きな中央表示
signal spawn_wave(n: int)                   # 群れ(ウェーブ)を湧かせる合図
signal spawn_boss                           # 中ボスを湧かせる合図
signal guide_changed(on: bool, pos: Vector3, kind: String)  # 「次にどこへ行くか」の道しるべ

# 道しるべ（今この瞬間、どこへ向かえばいいか）。サーバが対象の位置を計算して全員へ配り、
# HUDの矢印＋距離と、世界の光の柱がそこを指す。＝「何をすればいいか分からない」を無くす。
var guide_on := false
var guide_pos := Vector3.ZERO
var guide_kind := ""
var _guide_accum := 0.0

# セーブ（つづきから）。章の切れ目ごとに user://save.cfg へ書き、タイトルで続きを選べる。
const SAVE_PATH := "user://save.cfg"
var cleared := false            # 一度でも通しクリアしたか（タイトルに小さく出す）
var _want_continue := false     # タイトルで「つづきから」を押した
var _pending_continue := false  # セッション開始後、庭が組み上がってから復元する合図

# 第1章「たどり着いた隙間」。しっかり遊べる長さ＝掃除→癒やし→探索(収集)→謎解き→
# 協力→群れ(ウェーブ)→女王アリ(中ボス)→みどり回復→クリア。
# goal: clean / heal(n:累計) / collect(n) / puzzle / switch / wave(n)+heal / boss / green(v) / clear
const CH1 := [
	{
		"goal": "clean",
		"lines": [
			"絵本『みどりのはじまり』",
			"おじい「昔はな、地面は緑で、花が咲いておった…」",
			"みんな「（また はじまった…）」  つぼみ「ほんと！？」",
			"——もっとひどい場所から逃げてきた家族は、",
			"この排水溝のすきまに たどり着いた。",
			"父「ここを 家にしよう。まずは 掃除だ」",
			"母「つぼみ、こわくないよ。かあさんが そばにいる」",
			"母「……さあ、みんなで やれば、ここも あったかい 家になるわ」",
		],
	},
	{
		"goal": "heal", "n": 4,
		"lines": [
			"カヤ「なんで こんな汚い所 掃除すんだよ…」",
			"スミレ「文句言わないの。……虫が あばれてる！」",
			"父「虫は ヘドロで苦しんでるだけ。“きれいに”して 正気に戻すんだ」",
			"母「痛いのを 抱えてるだけなの。……こわがらないで、そっとね」",
		],
	},
	{
		"goal": "collect", "n": 4,
		"lines": [
			"つぼみ「きらきらしてる…なに これ？」",
			"おじい「“種のかけら”じゃ。緑を 取り戻す かぎ。",
			"　このあたりに 散らばっとる。拾っておいで」",
			"母「はぐれちゃ だめよ。見つけたら かあさんに 教えてね」",
		],
	},
	{
		"goal": "puzzle",
		"lines": [
			"つぼみ「ねえ、この石…なにか もようが ある」",
			"おじい「それは 昔ここが 緑だった しるしじゃ」",
			"スミレ「順番に 踏んでみよう。数の とおりに」",
		],
	},
	{
		"goal": "switch",
		"lines": [
			"カヤ「うわ、重い とびら… ひとりじゃ 無理だ」",
			"父「ふたつの台に 同時に乗るんだ。ひとりなら——」",
			"スミレ「わたしが 手伝う！ 家族だもん」",
			"母「そう、ひとりで 抱えないの。手を つなげば 重い扉も 動くわ」",
		],
	},
	{
		"goal": "heal", "n": 10, "wave": 6,
		"lines": [
			"——奥から ヘドロに侵された虫が どっと あふれてきた！",
			"父「群れだ…！ みんな、癒やすんだ！」",
			"カヤ「上等だ。ここは 俺たちの 家に するんだからな！」",
			"母「かあさんも いっしょよ。……こわい子は うしろに、でも 手は はなさないで」",
		],
	},
	{
		"goal": "boss", "boss": true,
		"lines": [
			"——地ひびき。大きな影が あらわれる。",
			"スミレ「あれは…女王アリ！ ヘドロに 一番 侵されてる」",
			"父「いちばん 苦しんでるんだ。みんなで 癒やそう！」",
			"母「あんなに 大きな体で、ずっと 痛かったのね。……今 助けるからね」",
		],
	},
	{
		"goal": "green", "v": 0.6,
		"lines": [
			"——女王が 正気に もどり、隙間に みどりが あふれた。",
			"つぼみ「わあ…！ みどり、ほんとに あった！」",
			"おじい「な？　言ったろう」",
			"母「つぼみ、見て。……あなたの手で もどった みどりよ」",
		],
	},
	{
		"goal": "story", "banner": "第1章 クリア  「たどり着いた隙間」", "power": "carry",
		"lines": [
			"父「この汚れた場所を、いつか“家”って 呼べるように」",
			"カヤ「……まあ、少しは マシに なったかもな」",
			"母「“おかえり”って 言える場所が できたわね」",
			"（力を授かった：押す・運ぶが 強くなった）",
		],
	},
	# ───────────── 第2章「そとの世界へ」 ─────────────
	{
		"goal": "story", "banner": "第2章  「そとの世界へ」", "reset_recovery": 0.3,
		"lines": [
			"つぼみ「ねえ、すきまの そとにも 世界が あるの？」",
			"おじい「あるとも。じゃが 外は もっと ひどく 汚れておる…」",
			"父「だからこそ 行くんだ。みどりを もっと 広げに」",
			"母「みんな 一緒なら こわくない。……いきましょう」",
		],
	},
	{
		"goal": "heal", "n": 18, "wave": 8,
		"lines": [
			"——外の地面は 見わたすかぎり ヘドロだらけ。虫たちが うめいている。",
			"カヤ「うわ…数が ぜんぜん ちがう」",
			"父「ひるむな。一匹ずつ、ちゃんと 癒やしていこう」",
			"母「あわてないで。みんなの ペースで だいじょうぶ」",
		],
	},
	{
		"goal": "boss", "boss": true,
		"lines": [
			"——地の底から、山のような ヘドロの主が もちあがる。",
			"スミレ「あれが…この 汚れの おおもと！」",
			"父「いちばん 深く 苦しんでる。……家族 ぜんぶの 力で 癒やすぞ！」",
			"つぼみ「こわくない！ みんな いるもん！」",
		],
	},
	{
		"goal": "story", "banner": "みどりが よみがえる", "full_green": true,
		"lines": [
			"——主が 静かに ほどけ、地の すみずみまで みどりが 走った。",
			"おじい「見ろ…これが “みどりのはじまり” じゃ」",
			"母「わたしたちの 手で、世界が 息を ふきかえした」",
		],
	},
	{
		"goal": "ending", "ending": true,
		"lines": [
			"——花が 咲き、風が 通り、遠くの 空まで 澄んでいく。",
			"父「ここを “家”って 呼ぼう。……いや、“世界ぜんぶ”を な」",
			"カヤ「ふん。……悪くない ながめだ」",
			"つぼみ「ねえ！ また 汚れた 場所が あったら、」",
			"みんな「——みんなで、みどりを とりもどしに いこう！」",
			"『みどりのはじまり』  〜おわり〜",
			"あそんでくれて ありがとう。",
		],
	},
]

var beat := -1
var _healed := 0
var _beat_heal_base := 0   # 今のhealビートに入った時点の累計。ビート内の達成数を測る基準
var _seeds := 0
var _beat_seed_base := 0   # 今のcollectビートに入った時点の累計（種の事前達成スキップ防止）
var _boss_cleared := false
var _active := false
var _last_obj := "￿"
var _beat_t := 0.0        # 今のビートの経過時間（会話ビートの送り用）
var _last_beat := -99     # ビートが変わった瞬間を検知してタイマをリセット
var _talk_done := false   # 会話ビートで、プレイヤーが会話を読み終えたか


func _ready() -> void:
	Net.session_started.connect(_on_session_started)
	Net.session_ended.connect(func(_r: String) -> void:
		_active = false
		guide_on = false
		guide_changed.emit(false, Vector3.ZERO, ""))
	WorldState.creature_healed.connect(_on_creature_healed)
	WorldState.seed_collected.connect(_on_seed_collected)
	_load_meta()


## サーバから：中ボスを癒やし終えた（bug.gd が呼ぶ）。
func notify_boss_cleared() -> void:
	if _is_server():
		_boss_cleared = true


func _on_session_started() -> void:
	# 庭(ハブ)＝第1章の舞台のときだけ物語を回す。遺跡は自由あそび（目的だけ出す＝空に見えない）。
	if Net.world_biome != "garden":
		_active = false
		objective_changed.emit("じゆうあそび：虫を「きれいに」で いやして なかまを ふやそう")
		return
	_active = true
	_healed = 0
	_seeds = 0
	_boss_cleared = false
	beat = -1
	_last_obj = "￿"
	if not _is_server():
		return
	if _want_continue and _has_progress():
		# 「つづきから」：庭が組み上がってから復元する（wave/boss の合図を庭が受け取れるように）。
		_pending_continue = true
	else:
		rpc("_set_beat", 0, false)


## main が庭を組み立て終えた直後に呼ぶ：保留していた「つづきから」を実際に復元する。
func apply_pending_continue() -> void:
	if not _pending_continue or not _is_server():
		return
	_pending_continue = false
	_want_continue = false
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		rpc("_set_beat", 0, false)
		return
	var b := int(cfg.get_value("progress", "beat", 0))
	_healed = int(cfg.get_value("progress", "healed", 0))
	_seeds = int(cfg.get_value("progress", "seeds", 0))
	var rec := float(cfg.get_value("progress", "recovery", 0.0))
	var pl: Array = cfg.get_value("progress", "powers", [])
	WorldState.restore(rec, pl)
	rpc("_set_beat", clampi(b, 0, CH1.size() - 1), true)


func _process(delta: float) -> void:
	if not _active or not _is_server() or beat < 0 or beat >= CH1.size():
		return
	if beat != _last_beat:
		_last_beat = beat
		_beat_t = 0.0
		_talk_done = false
		_beat_heal_base = _healed   # このビートに入ってから癒やした数で判定する
		_beat_seed_base = _seeds    # 種も同様＝寄り道で先に拾ってもcollectビートが即完了しない
	_beat_t += delta
	var b: Dictionary = CH1[beat]
	var goal: String = b.get("goal", "")
	var done := false
	match goal:
		"story":
			# 会話だけのビート。読み終えたら（または保険で25秒で）次へ。
			_push_objective("")
			done = _talk_done or _beat_t >= 25.0
		"ending":
			_push_objective("")
			done = false   # エンディングは終端
		"clean":
			_push_objective("めあて：光る ゴミに 近づいて「つかむ」で かたづける（のこり %d）" % _trash_count())
			done = _trash_count() == 0
		"heal":
			var need: int = b.get("n", 1)
			var done_here: int = _healed - _beat_heal_base   # このビートで癒やした数
			_push_objective("めあて：あばれる虫を「きれいに」で いやす（のこり %d）" % maxi(0, need - done_here))
			done = done_here >= need
		"collect":
			var need2: int = b.get("n", 1)
			var got: int = _seeds - _beat_seed_base   # このビートで拾った数
			_push_objective("めあて：光る“種のかけら”に ふれて あつめる（%d / %d）" % [mini(got, need2), need2])
			done = got >= need2
		"puzzle":
			_push_objective("めあて：石版を 数の順に ふんで 灯す")
			done = _prop_solved("StonePuzzle")
		"switch":
			_push_objective("めあて：はなれた2つの台に 同時に のる（ソロは子が手伝う）")
			done = _prop_solved("SwitchPair")
		"boss":
			_push_objective("めあて：ボスを「きれいに」で いやす")
			done = _boss_cleared
		"green":
			var v: float = b.get("v", 0.5)
			_push_objective("めあて：虫を いやして みどりを もどす（%d%%）" % int(clampf(WorldState.recovery / v, 0.0, 1.0) * 100.0))
			done = WorldState.recovery >= v
		"clear":
			done = false   # クリアビートは終端
	if done:
		rpc("_set_beat", beat + 1, false)

	# 道しるべ（次の目的地）を計算して、変化したら全員へ配る（0.2秒ごと＝軽い）。
	_guide_accum += delta
	if _guide_accum >= 0.2:
		_guide_accum = 0.0
		var g := _guide_target(goal)
		if g["on"] != guide_on or g["kind"] != guide_kind or (g["pos"] as Vector3).distance_to(guide_pos) > 0.4:
			rpc("_set_guide", g["on"], g["pos"], g["kind"])


## 今のゴールに応じて「向かうべき場所」を返す。{on, pos, kind}
## clean=いちばん近いゴミ / heal・green=いちばん近い虫 / boss=ボス / collect=近い種 /
## puzzle=石版 / switch=スイッチ台。会話・エンディング中は道しるべ無し。
func _guide_target(goal: String) -> Dictionary:
	var ref := _nearest_player_pos()
	match goal:
		"clean":
			var t := _nearest_in_group("trash", ref)
			if t != null:
				return {"on": true, "pos": t.global_position, "kind": "clean"}
		"heal", "green":
			var g := _nearest_in_group("bug", ref)
			if g != null:
				return {"on": true, "pos": g.global_position, "kind": "heal"}
		"boss":
			# ★ボスだけを指す★ まわりの雑魚ではなく、中ボス本体へ矢印を向ける
			# （以前は最寄りの虫を指し、プレイヤーがボスから離れてしまっていた）。
			var gb := _find_boss()
			if gb == null:
				gb = _nearest_in_group("bug", ref)   # 保険：まだ出ていない一瞬など
			if gb != null:
				return {"on": true, "pos": gb.global_position, "kind": "boss"}
		"collect":
			var s := _nearest_in_group("seed", ref)
			if s != null:
				return {"on": true, "pos": s.global_position, "kind": "collect"}
		"puzzle":
			var pp := _prop_pos("StonePuzzle")
			if pp.y < 1.0e8:
				return {"on": true, "pos": pp, "kind": "puzzle"}
		"switch":
			var sp := _prop_pos("SwitchPair")
			if sp.y < 1.0e8:
				return {"on": true, "pos": sp, "kind": "switch"}
	return {"on": false, "pos": Vector3.ZERO, "kind": ""}


func _nearest_player_pos() -> Vector3:
	var players := get_tree().get_nodes_in_group("player")
	if players.is_empty():
		return Vector3.ZERO
	return (players[0] as Node3D).global_position


## 中ボス本体（EnemyStats.is_midboss）を1体さがす。道しるべをボスへ向けるため。
func _find_boss() -> Node3D:
	for n in get_tree().get_nodes_in_group("bug"):
		var n3 := n as Node3D
		if n3 == null:
			continue
		var st: Variant = n3.get("stats")
		if st != null and st.is_midboss:
			return n3
	return null


func _nearest_in_group(group: String, ref: Vector3) -> Node3D:
	var best: Node3D = null
	var bd := 1.0e18
	for n in get_tree().get_nodes_in_group(group):
		var n3 := n as Node3D
		if n3 == null:
			continue
		var d := n3.global_position.distance_to(ref)
		if d < bd:
			bd = d
			best = n3
	return best


func _prop_pos(node_name: String) -> Vector3:
	var garden := get_tree().get_first_node_in_group("garden")
	if garden != null:
		var p := garden.get_node_or_null(node_name) as Node3D
		if p != null:
			return p.global_position
	return Vector3(0, 1.0e9, 0)   # 見つからない印


## StoryUI から呼ばれる：会話を最後まで読み終えた。会話だけのビートを次へ進める合図。
## サーバだけが進行を握るのでサーバ側でだけ立てる（参加者の読み終わりでは進めない）。
func notify_dialogue_done() -> void:
	if _is_server():
		_talk_done = true


func _push_objective(text: String) -> void:
	if text == _last_obj:
		return
	_last_obj = text
	rpc("_set_ui_objective", text)


## 後から参加した人へ「今の目的・道しるべ」を配る（サーバのみ）。
## _set_beat 全体は wave/boss の合図を再発火させてしまうので、演出を起こさない
## 「現状配布」だけに絞る。
func send_to(id: int) -> void:
	if not _is_server():
		return
	var obj := _last_obj if _last_obj != "￿" else ""
	rpc_id(id, "_set_ui_objective", obj)
	rpc_id(id, "_set_guide", guide_on, guide_pos, guide_kind)


# ---- サーバ → 全員 ----

@rpc("authority", "call_local", "reliable")
func _set_beat(i: int, silent: bool = false) -> void:
	if i < 0 or i >= CH1.size():
		return
	beat = i
	var data: Dictionary = CH1[i]
	# silent=つづきから復元。会話・バナー・力通知・満開・wave・セーブを再発火させない
	# （＝二重演出の防止）。ただしボスは“居ないと倒せない”ので復元でも湧かせる。
	if not silent:
		dialogue.emit(PackedStringArray(data.get("lines", [])))
	if _is_server():
		if data.get("boss", false):
			_boss_cleared = false   # 新しいボスに備えて判定をリセット
			spawn_boss.emit()
		if not silent:
			if data.has("wave"):
				spawn_wave.emit(int(data["wave"]))
			if data.has("power"):
				WorldState.grant_power(String(data["power"]))
			if data.get("full_green", false) or data.get("ending", false):
				WorldState.set_full()   # みどりを一気に満開へ
			if data.has("reset_recovery"):
				# 第2章＝“新しい汚れた世界”。回復を落として、また緑に戻す payoff を作る。
				WorldState.set_recovery(float(data["reset_recovery"]))
			# 静かな場面に入るときは残った雑魚を浄化して片づける（余韻/エンディングを汚さない）。
			if data.get("goal", "") in ["story", "ending", "green"]:
				var g := get_tree().get_first_node_in_group("garden")
				if g != null and g.has_method("purify_lingering_bugs"):
					g.purify_lingering_bugs()
	# 大バナー（章クリア・章タイトル・エンディング等）は全員の画面に出す。
	if not silent:
		if data.has("banner"):
			objective_changed.emit("")
			banner.emit(String(data["banner"]))
		if data.get("ending", false):
			objective_changed.emit("")
			banner.emit("『みどりのはじまり』  〜おわり〜")
	# 章の切れ目でセーブ（サーバのみ・庭のときだけ）。エンディングまで来たら「クリア」を記録。
	# ★R2★ beat0（＝はじめから直後）では書かない＝「はじめから」で旧セーブを即消ししない。
	if _is_server() and Net.world_biome == "garden" and not silent:
		if data.get("ending", false):
			cleared = true
			_save_meta()
			_clear_progress()   # 通しクリアしたら“つづき”は消す（また最初から遊べる）
		elif i >= 1:
			_write_checkpoint()


@rpc("authority", "call_local", "reliable")
func _set_ui_objective(text: String) -> void:
	objective_changed.emit(text)


## 道しるべの更新をサーバから全員へ。位置は速達でよいので unreliable。
@rpc("authority", "call_local", "unreliable_ordered")
func _set_guide(on: bool, pos: Vector3, kind: String) -> void:
	guide_on = on
	guide_pos = pos
	guide_kind = kind
	guide_changed.emit(on, pos, kind)


# ---- 進行の材料 ----

func _on_creature_healed() -> void:
	if _is_server():
		_healed += 1


func _on_seed_collected() -> void:
	if _is_server():
		_seeds += 1


func _trash_count() -> int:
	return get_tree().get_nodes_in_group("trash").size()


## パズル/スイッチが解けたか。プロップは "solvable" グループに入り solved を持つ。
func _prop_solved(node_name: String) -> bool:
	for p in get_tree().get_nodes_in_group("solvable"):
		if p.name == node_name:
			return bool(p.get("solved"))
	return false


## 今このビートで「まわりから虫が湧いてくる（アンビエント湧き）」を許すか。
## 掃除・会話・エンディングの場面は 静かに保つ＝虫に邪魔されず、落ち着いて進められる。
## （群れ・ボスは Chapter の専用合図で別途湧くので、ここでは関係ない。）
## 今このビートは「虫を癒やして減らすのが目的」か（heal/green/wave）。
## ＝敵がいないと進めないので、庭は“詰み防止”に敵を切らさないようにする。
## ボスは専用に沸かせ続けるので含めない。
func wants_enemies() -> bool:
	if not _active or beat < 0 or beat >= CH1.size():
		return false
	return CH1[beat].get("goal", "") in ["heal", "green", "wave"]


func ambient_spawn_ok() -> bool:
	if not _active:
		return true   # 自由プレイ（遺跡など）は従来どおり
	if beat < 0 or beat >= CH1.size():
		return true
	var goal: String = CH1[beat].get("goal", "")
	# boss はボス本体＋召喚minionで敵を供給するので、周辺アンビエント湧きは止める
	# （でないとボス＋雑魚8＋召喚14でソロが理不尽になる）。
	return not (goal in ["clean", "story", "ending", "boss"])


# ---------------------------------------------------------------- セーブ／つづきから

## タイトルの「つづきから」を押した合図（この後 Net.start_solo/host する）。
func continue_game() -> void:
	_want_continue = true


func start_new() -> void:
	_want_continue = false


## 途中経過のセーブがあるか（タイトルで「つづきから」を出すか）。
func has_save() -> bool:
	return _has_progress()


## タイトルに出す短い説明（「第2章のとちゅう」など）。
func save_label() -> String:
	if not _has_progress():
		return ""
	var cfg := ConfigFile.new()
	cfg.load(SAVE_PATH)
	var b := int(cfg.get_value("progress", "beat", 0))
	var ch := 2 if b >= 9 else 1
	return "第%d章のとちゅうから" % ch


func _has_progress() -> bool:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		return false
	return cfg.has_section_key("progress", "beat")


func _write_checkpoint() -> void:
	var cfg := ConfigFile.new()
	cfg.load(SAVE_PATH)   # meta（cleared）は残す
	cfg.set_value("progress", "beat", beat)
	cfg.set_value("progress", "healed", _healed)
	cfg.set_value("progress", "seeds", _seeds)
	cfg.set_value("progress", "recovery", WorldState.recovery)
	cfg.set_value("progress", "powers", WorldState.powers_list())
	cfg.save(SAVE_PATH)


func _clear_progress() -> void:
	var cfg := ConfigFile.new()
	cfg.load(SAVE_PATH)
	if cfg.has_section("progress"):
		cfg.erase_section("progress")
	cfg.save(SAVE_PATH)


func _save_meta() -> void:
	var cfg := ConfigFile.new()
	cfg.load(SAVE_PATH)
	cfg.set_value("meta", "cleared", cleared)
	cfg.save(SAVE_PATH)


func _load_meta() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) == OK:
		cleared = bool(cfg.get_value("meta", "cleared", false))


func _is_server() -> bool:
	return multiplayer.has_multiplayer_peer() and multiplayer.is_server()
