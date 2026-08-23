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

# 第1章「たどり着いた隙間」。しっかり遊べる長さ＝掃除→癒やし→謎解き→協力→群れ→回復。
# goal: clean / heal(n:累計) / puzzle / switch / green(v) / clear
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
		],
	},
	{
		"goal": "heal", "n": 4,
		"lines": [
			"カヤ「なんで こんな汚い所 掃除すんだよ…」",
			"スミレ「文句言わないの。……虫が あばれてる！」",
			"父「虫は ヘドロで苦しんでるだけ。“きれいに”して 正気に戻すんだ」",
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
		],
	},
	{
		"goal": "heal", "n": 12,
		"lines": [
			"——奥から ヘドロに侵された虫が どっと あふれてきた。",
			"父「みんな、下がって！ ここは 父さんと母さんが 癒やす」",
			"カヤ「…俺も やる。ここ、俺たちの 家に するんだろ」",
		],
	},
	{
		"goal": "green", "v": 0.55,
		"lines": [
			"——掃除して 癒やすほど、茶色い地面に みどりが 差してきた。",
			"つぼみ「わあ…！ みどり、ほんとに あった！」",
			"おじい「な？　言ったろう」",
		],
	},
	{
		"goal": "clear", "clear": true,
		"lines": [
			"父「この汚れた場所を、いつか“家”って 呼べるように」",
			"カヤ「……まあ、少しは マシに なったかもな」",
			"（力を授かった：押す・運ぶが 強くなった）",
			"——第2章へ つづく",
		],
	},
]

var beat := -1
var _healed := 0
var _active := false
var _last_obj := "￿"


func _ready() -> void:
	Net.session_started.connect(_on_session_started)
	Net.session_ended.connect(func(_r: String) -> void: _active = false)
	WorldState.creature_healed.connect(_on_creature_healed)


func _on_session_started() -> void:
	# 庭(ハブ)＝第1章の舞台のときだけ物語を回す（遺跡は今は自由プレイ）
	if Net.world_biome != "garden":
		_active = false
		objective_changed.emit("")
		return
	_active = true
	_healed = 0
	beat = -1
	_last_obj = "￿"
	if _is_server():
		rpc("_set_beat", 0)


func _process(_delta: float) -> void:
	if not _active or not _is_server() or beat < 0 or beat >= CH1.size():
		return
	var b: Dictionary = CH1[beat]
	var goal: String = b.get("goal", "")
	var done := false
	match goal:
		"clean":
			_push_objective("はいすいこうの ゴミを きれいに（のこり %d）" % _trash_count())
			done = _trash_count() == 0
		"heal":
			var need: int = b.get("n", 1)
			_push_objective("あばれる虫を いやす（のこり %d）" % maxi(0, need - _healed))
			done = _healed >= need
		"puzzle":
			_push_objective("石版を 順番に踏んで 昔のしるしを 灯す")
			done = _prop_solved("StonePuzzle")
		"switch":
			_push_objective("はなれた2つの台に 同時に乗って とびらを開く（ソロは子が手伝う）")
			done = _prop_solved("SwitchPair")
		"green":
			var v: float = b.get("v", 0.5)
			_push_objective("みどりを もどす（%d%%）" % int(clampf(WorldState.recovery / v, 0.0, 1.0) * 100.0))
			done = WorldState.recovery >= v
		"clear":
			done = false   # クリアビートは終端
	if done:
		rpc("_set_beat", beat + 1)


func _push_objective(text: String) -> void:
	if text == _last_obj:
		return
	_last_obj = text
	rpc("_set_ui_objective", text)


# ---- サーバ → 全員 ----

@rpc("authority", "call_local", "reliable")
func _set_beat(i: int) -> void:
	if i < 0 or i >= CH1.size():
		return
	beat = i
	var data: Dictionary = CH1[i]
	dialogue.emit(PackedStringArray(data.get("lines", [])))
	if data.get("clear", false):
		objective_changed.emit("")
		banner.emit("第1章 クリア  「たどり着いた隙間」")
		# 章の報酬：力（押す・運ぶが強くなる）。サーバだけが実際に付与・複製する。
		WorldState.grant_power("carry")


@rpc("authority", "call_local", "reliable")
func _set_ui_objective(text: String) -> void:
	objective_changed.emit(text)


# ---- 進行の材料 ----

func _on_creature_healed() -> void:
	if _is_server():
		_healed += 1


func _trash_count() -> int:
	return get_tree().get_nodes_in_group("trash").size()


## パズル/スイッチが解けたか。プロップは "solvable" グループに入り solved を持つ。
func _prop_solved(node_name: String) -> bool:
	for p in get_tree().get_nodes_in_group("solvable"):
		if p.name == node_name:
			return bool(p.get("solved"))
	return false


func _is_server() -> bool:
	return multiplayer.has_multiplayer_peer() and multiplayer.is_server()
