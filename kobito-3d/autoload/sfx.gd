extends Node
## 効果音＋BGM（自動読み込み: Sfx）— すべてコードで波形を合成する。外部音源ファイルはゼロ。
##
## なぜ合成か：無料・容量ほぼゼロ・配信元に依存しない（＝このリポの方針どおり）。
## 全機種（iPhone Web / Android / PC）で鳴る。呼び出しは Sfx.play("hit") の1行。
##
## 効果音は「振る/当てる/癒やす/噛む/被弾/歩く/跳ぶ/着地/昇格/節目」。
## BGMは2層（土台パッド＋きらめき）で、環境回復度が上がるほど“きらめき”が増して明るくなる。

const RATE := 32000
const VOICES := 10          # 同時発音数（足りなければ古い声から使い回す）

var _players: Array[AudioStreamPlayer] = []
var _next := 0
var _bank := {}             # name -> AudioStreamWAV

var _bgm_pad: AudioStreamPlayer
var _bgm_shine: AudioStreamPlayer
var _bgm_battle: AudioStreamPlayer
var _bgm_on := false
var _battle := 0.0             # 戦闘度 0..1（敵が近いと上がる。曲をなめらかに切替）
const BATTLE_RANGE := 9.0      # この距離に敵が来たら“戦闘”

const CFG_PATH := "user://settings.cfg"
var _master := 0.8          # 全体音量（0.0〜1.0）。設定スライダーで変える。保存される。


func _ready() -> void:
	for i in VOICES:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)
	_bgm_pad = AudioStreamPlayer.new()
	_bgm_pad.bus = "Master"
	add_child(_bgm_pad)
	_bgm_shine = AudioStreamPlayer.new()
	_bgm_shine.bus = "Master"
	add_child(_bgm_shine)
	_bgm_battle = AudioStreamPlayer.new()
	_bgm_battle.bus = "Master"
	add_child(_bgm_battle)
	_build_bank()
	_load_settings()

	# BGMはゲーム中だけ。回復度で“きらめき”の音量を上げる。
	Net.session_started.connect(start_bgm)
	Net.session_ended.connect(func(_reason: String) -> void: stop_bgm())
	WorldState.recovery_changed.connect(_on_recovery_changed)
	# 環境回復の節目・飛行解禁など“いい知らせ”でキラッと鳴らす。
	WorldState.notice.connect(func(_text: String) -> void: play("milestone", -2.0))


## 名前で鳴らす。音量(db)を少し変えられる。存在しない名前は無視。
func play(sound_name: String, volume_db: float = -7.0) -> void:
	var stream: AudioStreamWAV = _bank.get(sound_name)
	if stream == null:
		return
	var p := _players[_next]
	_next = (_next + 1) % _players.size()
	p.stream = stream
	p.volume_db = volume_db
	p.pitch_scale = randf_range(0.97, 1.04)   # 毎回わずかに変えて機械的な連打感を消す
	p.play()


# ---------------------------------------------------------------- 全体音量（設定）
#
# Master バスの音量を1本のスライダーで調整。user://settings.cfg に保存し、次回も復元。
# Web でも user:// は保持される（Godotが IndexedDB に保存）。

func get_master_volume() -> float:
	return _master


func set_master_volume(v: float) -> void:
	_master = clampf(v, 0.0, 1.0)
	_apply_master()
	var cfg := ConfigFile.new()
	cfg.load(CFG_PATH)                    # 既存の他設定は残す
	cfg.set_value("audio", "master", _master)
	cfg.save(CFG_PATH)


func _load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(CFG_PATH) == OK:
		_master = clampf(float(cfg.get_value("audio", "master", 0.8)), 0.0, 1.0)
	_apply_master()


func _apply_master() -> void:
	var idx := AudioServer.get_bus_index("Master")
	if _master <= 0.001:
		AudioServer.set_bus_mute(idx, true)
	else:
		AudioServer.set_bus_mute(idx, false)
		AudioServer.set_bus_volume_db(idx, linear_to_db(_master))


# ---------------------------------------------------------------- BGM

func start_bgm() -> void:
	if _bgm_on:
		return
	_bgm_on = true
	_battle = 0.0
	_bgm_pad.stream = _bank.get("bgm_pad")
	_bgm_shine.stream = _bank.get("bgm_shine")
	_bgm_battle.stream = _bank.get("bgm_battle")
	_bgm_pad.volume_db = -14.0
	_bgm_shine.volume_db = -60.0    # 最初は聞こえない（汚れている）
	_bgm_battle.volume_db = -60.0   # 最初は聞こえない（戦闘してない）
	_bgm_pad.play()
	_bgm_shine.play()
	_bgm_battle.play()


func stop_bgm() -> void:
	_bgm_on = false
	_bgm_pad.stop()
	_bgm_shine.stop()
	_bgm_battle.stop()


func _on_recovery_changed(_r: float) -> void:
	pass   # 音量は _process でまとめて（回復度＋戦闘度から）決める


## 毎フレーム、BGMの3層をなめらかに混ぜる：
## 回復度で“きらめき”を上げ、敵が近いと“戦闘曲”を前に出す（近づく＝すっと切替）。
func _process(delta: float) -> void:
	if not _bgm_on:
		return
	var target := 1.0 if _enemy_near() else 0.0
	# 戦闘へは素早く(0.5秒)、平和へはゆっくり(2秒)戻す＝ピリッと入り、余韻を残す
	var rate := (1.0 / 0.5) if target > _battle else (1.0 / 2.0)
	_battle = move_toward(_battle, target, delta * rate)

	var r := clampf(WorldState.recovery, 0.0, 1.0)
	_bgm_battle.volume_db = lerpf(-60.0, -7.0, _battle)
	# 戦闘中は穏やかな層を少し下げて、戦闘曲を主役に
	_bgm_shine.volume_db = lerpf(-60.0, -10.0, r) - _battle * 10.0
	_bgm_pad.volume_db = lerpf(-16.0, -11.0, r) - _battle * 3.0


## 敵（虫）がどれかのプレイヤーの近くにいるか＝戦闘中か。各自の端末で判定。
func _enemy_near() -> bool:
	var players := get_tree().get_nodes_in_group("player")
	if players.is_empty():
		return false
	for b in get_tree().get_nodes_in_group("bug"):
		for p in players:
			if b.global_position.distance_to(p.global_position) < BATTLE_RANGE:
				return true
	return false


# ---------------------------------------------------------------- 音づくり
#
# float サンプル[-1,1]の配列で作り、16bit WAV に変換して貯める。
# 「リアルで可愛い」= 立ち上がりの一撃(トランジェント)＋やわらかい胴鳴り＋鐘のような倍音、を層にする。

func _build_bank() -> void:
	_bank["swing"] = _make(_swing())
	_bank["hit"] = _make(_hit())
	_bank["heal"] = _make(_heal())
	_bank["bite"] = _make(_bite())
	_bank["hurt"] = _make(_hurt())
	_bank["step"] = _make(_step())
	_bank["jump"] = _make(_jump())
	_bank["land"] = _make(_land())
	_bank["levelup"] = _make(_levelup())
	_bank["milestone"] = _make(_milestone())
	_bank["pickup"] = _make(_pickup())
	_bank["bgm_pad"] = _make_loop(_bgm_pad_wave())
	_bank["bgm_shine"] = _make_loop(_bgm_shine_wave())
	_bank["bgm_battle"] = _make_loop(_bgm_battle_wave())


## 立ち上がり(attack)→やわらかく減衰する共通エンベロープ。t は 0..1。
func _adsr(t: float, attack: float, decay_pow: float) -> float:
	if t < attack:
		return t / maxf(attack, 0.0001)
	return pow(1.0 - (t - attack) / maxf(1.0 - attack, 0.0001), decay_pow)


## 剣を振る：やわらかい“ヒュンッ”。風のノイズ＋高→低へすべる可愛い音程。
func _swing() -> PackedFloat32Array:
	var n := int(RATE * 0.2)
	var out := PackedFloat32Array()
	out.resize(n)
	var prev := 0.0
	for i in n:
		var t := float(i) / n
		var env := _adsr(t, 0.12, 2.4)
		var white := randf() * 2.0 - 1.0
		prev = lerpf(prev, white, 0.25)                       # ローパスで“空気”に
		var whistle := sin(TAU * lerpf(1500.0, 520.0, t) * (float(i) / RATE))
		out[i] = (prev * 0.5 + whistle * 0.5) * env * 0.5
	return out


## 当たる：可愛い“ポフッ！”。短い一撃＋やわらかい木のような胴鳴り（倍音つき）。
func _hit() -> PackedFloat32Array:
	var n := int(RATE * 0.16)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var click := (randf() * 2.0 - 1.0) * pow(1.0 - t, 12.0)   # 最初だけパチッ
		var f := lerpf(430.0, 240.0, t)                           # ぽわんと下がる
		var body := sin(TAU * f * (float(i) / RATE)) + sin(TAU * f * 2.0 * (float(i) / RATE)) * 0.4
		var env := _adsr(t, 0.02, 3.0)
		out[i] = (click * 0.5 + body * 0.5 * env) * 0.85
	return out


## 癒やし完了：オルゴール風“キラーン↑”。基音＋オクターブ＋5度で澄んだ鐘。上へすべる。
func _heal(scale := 1.0) -> PackedFloat32Array:
	var n := int(RATE * 0.5 * scale)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 1.4)
		var f := lerpf(740.0, 1100.0, sqrt(t))
		var tone := sin(TAU * f * (float(i) / RATE))
		tone += sin(TAU * f * 2.0 * (float(i) / RATE)) * 0.4       # オクターブ
		tone += sin(TAU * f * 3.0 * (float(i) / RATE)) * 0.2       # さらに上
		var shimmer := sin(TAU * 8.0 * t) * 0.05                   # ほのかな揺れ
		out[i] = tone * (env + shimmer) * 0.3
	return out


## 敵が噛む：可愛い“むぐっ”。低くこもった二段の胴鳴り（角のとれた鋸）。
func _bite() -> PackedFloat32Array:
	var n := int(RATE * 0.16)
	var out := PackedFloat32Array()
	out.resize(n)
	var prev := 0.0
	for i in n:
		var t := float(i) / n
		var chomp := clampf(1.0 - absf(t - 0.4) * 2.2, 0.0, 1.0)
		var f := 150.0 - 45.0 * t
		var saw := fposmod(f * (float(i) / RATE), 1.0) * 2.0 - 1.0
		prev = lerpf(prev, saw, 0.5)                              # 角を丸めて可愛く
		out[i] = prev * chomp * 0.5
	return out


## 被弾：やわらかい“ぽすっ”。低い衝撃＋ごく軽いノイズ（痛々しくしすぎない）。
func _hurt() -> PackedFloat32Array:
	var n := int(RATE * 0.18)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 2.2)
		var thud := sin(TAU * lerpf(210.0, 70.0, sqrt(t)) * (float(i) / RATE))
		var grit := (randf() * 2.0 - 1.0) * 0.2 * pow(1.0 - t, 6.0)
		out[i] = (thud * 0.8 + grit) * env * 0.8
	return out


## 歩く：短くやわらかい“ぽ”。土を踏むイメージ（低いノイズの一瞬）。
func _step() -> PackedFloat32Array:
	var n := int(RATE * 0.07)
	var out := PackedFloat32Array()
	out.resize(n)
	var prev := 0.0
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 5.0)
		var noise := randf() * 2.0 - 1.0
		prev = lerpf(prev, noise, 0.3)
		var low := sin(TAU * 120.0 * (float(i) / RATE))
		out[i] = (prev * 0.5 + low * 0.5) * env * 0.7
	return out


## 跳ぶ：可愛い“ぴょんっ↑”。音程が上へすべる。
func _jump() -> PackedFloat32Array:
	var n := int(RATE * 0.16)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var env := _adsr(t, 0.05, 2.0)
		var f := lerpf(300.0, 720.0, t)
		var tone := sin(TAU * f * (float(i) / RATE)) + sin(TAU * f * 2.0 * (float(i) / RATE)) * 0.3
		out[i] = tone * env * 0.4
	return out


## 着地：やわらかい“とすっ↓”。音程が下へ、短く。
func _land() -> PackedFloat32Array:
	var n := int(RATE * 0.12)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 3.0)
		var f := lerpf(360.0, 150.0, t)
		var tone := sin(TAU * f * (float(i) / RATE))
		var dust := (randf() * 2.0 - 1.0) * 0.15 * pow(1.0 - t, 4.0)
		out[i] = (tone * 0.8 + dust) * env * 0.6
	return out


## 昇格（レベルアップ）：明るい上昇アルペジオ ド-ミ-ソ-ド（鐘の音）。
func _levelup() -> PackedFloat32Array:
	var notes := [523.25, 659.25, 783.99, 1046.5]
	return _arp(notes, 0.11, 0.42)


## 環境回復の節目：きらめく和音（ド・ミ・ソ・上のド）＋ゆらぎ。
func _milestone() -> PackedFloat32Array:
	var n := int(RATE * 0.7)
	var out := PackedFloat32Array()
	out.resize(n)
	var chord := [523.25, 659.25, 783.99, 1046.5]
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 1.3)
		var s := 0.0
		for f in chord:
			s += sin(TAU * f * (float(i) / RATE))
		s /= chord.size()
		var sparkle := sin(TAU * 1568.0 * (float(i) / RATE)) * 0.15 * (0.6 + 0.4 * sin(TAU * 9.0 * t))
		out[i] = (s + sparkle) * env * 0.34
	return out


## 拾う等の軽い合図：短い上昇2音。
func _pickup() -> PackedFloat32Array:
	return _arp([659.25, 987.77], 0.08, 0.18)


## 音階を順に鳴らす小さなアルペジオを作る共通関数（鐘＝基音＋オクターブ）。
func _arp(notes: Array, note_dur: float, total: float) -> PackedFloat32Array:
	var n := int(RATE * total)
	var out := PackedFloat32Array()
	out.resize(n)
	var step := int(RATE * note_dur)
	for i in n:
		var idx := mini(int(i / step), notes.size() - 1)
		var lt := float(i - idx * step) / maxf(step, 1.0)
		var env := pow(clampf(1.0 - lt, 0.0, 1.0), 1.8)
		var f: float = notes[idx]
		var tone := sin(TAU * f * (float(i) / RATE)) + sin(TAU * f * 2.0 * (float(i) / RATE)) * 0.35
		out[i] = tone * env * 0.32
	return out


# --- BGM（4秒ループ・ペンタトニックでやさしく） ---

## 土台のパッド：低いドローン（C+G）＋ゆっくりトレモロ。常時流れる。
func _bgm_pad_wave() -> PackedFloat32Array:
	var dur := 4.0
	var n := int(RATE * dur)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / RATE
		var tr := 0.85 + 0.15 * sin(TAU * 0.25 * t)
		var pad := sin(TAU * 130.81 * t) * 0.5 + sin(TAU * 196.0 * t) * 0.35 + sin(TAU * 261.63 * t) * 0.2
		# ループ継ぎ目のプチノイズ防止に、両端を短くフェード
		var edge := clampf(minf(t, dur - t) / 0.05, 0.0, 1.0)
		out[i] = pad * tr * 0.5 * edge
	return out


## きらめき層：やさしいオルゴール風アルペジオ。回復度で音量が上がる。
func _bgm_shine_wave() -> PackedFloat32Array:
	var dur := 4.0
	var n := int(RATE * dur)
	var out := PackedFloat32Array()
	out.resize(n)
	var notes := [523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 659.25]  # Cメジャー펜타風
	var step := dur / notes.size()
	for i in n:
		var t := float(i) / RATE
		var idx := int(t / step) % notes.size()
		var lt := t - float(idx) * step
		var env := pow(clampf(1.0 - lt / step, 0.0, 1.0), 1.6)
		var f: float = notes[idx]
		var bell := sin(TAU * f * t) * 0.6 + sin(TAU * f * 2.0 * t) * 0.25
		var edge := clampf(minf(t, dur - t) / 0.05, 0.0, 1.0)
		out[i] = bell * env * 0.5 * edge
	return out


## 戦闘BGM：敵と対峙したとき用の、少し緊張感のある駆けるループ（イ短調）。
## 低音の刻み＋短調のアルペジオ。可愛さは残しつつ“来た！”と分かる。
func _bgm_battle_wave() -> PackedFloat32Array:
	var dur := 3.2
	var n := int(RATE * dur)
	var out := PackedFloat32Array()
	out.resize(n)
	# イ短調ペンタの駆けるアルペジオ（16分の刻み）
	var notes := [440.0, 523.25, 659.25, 523.25, 587.33, 523.25, 440.0, 392.0]
	var step := dur / 16.0
	for i in n:
		var t := float(i) / RATE
		# 低音の刻み（8分）＝鼓動
		var beat := fmod(t, 0.4) / 0.4
		var pulse := sin(TAU * 110.0 * t) * pow(1.0 - beat, 3.0) * 0.5
		# アルペジオ
		var idx := int(t / step) % notes.size()
		var lt := t - float(int(t / step)) * step
		var env := pow(clampf(1.0 - lt / step, 0.0, 1.0), 1.4)
		var f: float = notes[idx]
		var arp := (sin(TAU * f * t) * 0.5 + fposmod(f * t, 1.0) * 0.2) * env
		var edge := clampf(minf(t, dur - t) / 0.04, 0.0, 1.0)
		out[i] = (pulse + arp * 0.5) * 0.5 * edge
	return out


func _make(samples: PackedFloat32Array) -> AudioStreamWAV:
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = RATE
	wav.stereo = false
	wav.data = _to_pcm(samples)
	return wav


func _make_loop(samples: PackedFloat32Array) -> AudioStreamWAV:
	var wav := _make(samples)
	wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
	wav.loop_begin = 0
	wav.loop_end = samples.size()
	return wav


func _to_pcm(samples: PackedFloat32Array) -> PackedByteArray:
	var data := PackedByteArray()
	data.resize(samples.size() * 2)
	for i in samples.size():
		var v := int(clampf(samples[i], -1.0, 1.0) * 32767.0)
		data.encode_s16(i * 2, v)
	return data
