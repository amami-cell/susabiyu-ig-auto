extends Node
## 効果音（自動読み込み: Sfx）— すべてコードで波形を合成する。外部音源ファイルはゼロ。
##
## なぜ合成か：無料・容量ほぼゼロ・配信元に依存しない（＝このリポの方針どおり）。
## 全機種（iPhone Web / Android / PC）で鳴る。呼び出しは Sfx.play("hit") の1行だけ。
##
## 音は「攻撃を振る/当てる/癒やす/敵が噛む/被弾」など行動ごとに用意。
## RPC の call_local 経由で全員の画面で鳴る（各自ローカル再生）。

const RATE := 22050
const VOICES := 8          # 同時発音数（足りなければ使い回す）

var _players: Array[AudioStreamPlayer] = []
var _next := 0
var _bank := {}            # name -> AudioStreamWAV


func _ready() -> void:
	for i in VOICES:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)
	_build_bank()


## 名前で鳴らす。音量(db)を少し変えられる。存在しない名前は無視。
func play(name: String, volume_db: float = -6.0) -> void:
	var stream: AudioStreamWAV = _bank.get(name)
	if stream == null:
		return
	var p := _players[_next]
	_next = (_next + 1) % _players.size()
	p.stream = stream
	p.volume_db = volume_db
	p.pitch_scale = randf_range(0.96, 1.05)   # 毎回わずかに変えて機械的な繰り返し感を消す
	p.play()


# ---------------------------------------------------------------- 音づくり
#
# 各音を float サンプル[-1,1]の配列で作り、16bit WAV に変換して貯めておく。

func _build_bank() -> void:
	_bank["swing"] = _make(_swing())       # 剣を振る（ヒュッ）
	_bank["hit"] = _make(_hit())           # 当たる（パシッ）
	_bank["heal"] = _make(_heal())         # 癒やし完了（キラン↑）
	_bank["bite"] = _make(_bite())         # 敵が噛む（ガブッ）
	_bank["hurt"] = _make(_hurt())         # 被弾（ドスッ）
	_bank["pickup"] = _make(_heal(0.7))    # ゴミ拾い等の軽い合図（癒やしの短縮）


## 剣を振る：フィルタ気味のノイズが「ヒュッ」と減衰する“空を切る音”。
func _swing() -> PackedFloat32Array:
	var n := int(RATE * 0.18)
	var out := PackedFloat32Array()
	out.resize(n)
	var prev := 0.0
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 2.2)                 # 立ち上がり速く、すっと消える
		var white := randf() * 2.0 - 1.0
		prev = lerpf(prev, white, 0.35)               # ローパス気味で“風”に
		# 高→低へ動く帯域感を軽く付ける
		var tone := sin(TAU * lerpf(1200.0, 300.0, t) * (float(i) / RATE))
		out[i] = (prev * 0.7 + tone * 0.3) * env * 0.6
	return out


## 当たる：短く鋭い「パシッ」。ノイズの一撃＋低い胴鳴り。
func _hit() -> PackedFloat32Array:
	var n := int(RATE * 0.13)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 3.5)
		var crack := (randf() * 2.0 - 1.0)
		var body := sin(TAU * lerpf(220.0, 90.0, t) * (float(i) / RATE))
		out[i] = (crack * 0.65 + body * 0.5) * env
	return out


## 癒やし完了：やさしい「キラン↑」。二つのサイン音が上へ、鐘のような減衰。
func _heal(scale := 1.0) -> PackedFloat32Array:
	var n := int(RATE * 0.34 * scale)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 1.6)
		var f := lerpf(660.0, 990.0, t)               # 上昇
		var a := sin(TAU * f * (float(i) / RATE))
		var b := sin(TAU * f * 1.5 * (float(i) / RATE)) * 0.5   # 5度上でハモる
		out[i] = (a + b) * env * 0.35
	return out


## 敵が噛む：低くこもった「ガブッ」。開いて閉じる二段の胴鳴り。
func _bite() -> PackedFloat32Array:
	var n := int(RATE * 0.14)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var chomp := 1.0 - absf(t - 0.45) * 2.0      # 中央でいちばん大きい＝噛み締め
		chomp = clampf(chomp, 0.0, 1.0)
		var f := 140.0 - 40.0 * t
		var saw := fposmod(f * (float(i) / RATE), 1.0) * 2.0 - 1.0   # ざらついた鋸波
		out[i] = saw * chomp * 0.55
	return out


## 被弾：短い「ドスッ」。低い衝撃＋わずかなノイズ。
func _hurt() -> PackedFloat32Array:
	var n := int(RATE * 0.16)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / n
		var env := pow(1.0 - t, 2.6)
		var thud := sin(TAU * lerpf(180.0, 60.0, t) * (float(i) / RATE))
		var grit := (randf() * 2.0 - 1.0) * 0.3
		out[i] = (thud * 0.8 + grit) * env
	return out


func _make(samples: PackedFloat32Array) -> AudioStreamWAV:
	var data := PackedByteArray()
	data.resize(samples.size() * 2)
	for i in samples.size():
		var v := int(clampf(samples[i], -1.0, 1.0) * 32767.0)
		data.encode_s16(i * 2, v)
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = RATE
	wav.stereo = false
	wav.data = data
	return wav
