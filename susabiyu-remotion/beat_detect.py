# -*- coding: utf-8 -*-
"""音源から拍の位置（秒）を拾う。ffmpeg + numpy だけで完結させる。
元は fetch_beat.py の中に直書きしていたものを、他のテンプレ（洋食の音ハメ）でも
使えるように切り出した。中身のアルゴリズムは変えていない。

使い方:
    import beat_detect
    r = beat_detect.detect("public/music/normal/xxx.mp3")
    if r: bpm, beats = r            # beats は秒の配列（先頭から最大64拍）
"""
import subprocess


SR, HOP, WIN = 22050, 512, 1024

# 解析窓の半分（約23ms）。窓の頭で立ち上がりを検出してしまう癖の補正で、
# detect() が返す拍の秒にはこれが足してある。包絡線の添字と秒を行き来する時は
# 必ずこれを付け外しする（片方だけ忘れると全体が23msずれる）。
CORR = WIN / (2.0 * SR)


def _envelope(path, max_sec=60.0, start_sec=0.0):
    """スペクトラルフラックス（アタックの強さ）の時系列と、そのフレームレートを返す。

    以前ここで低音だけのフラックスも返し、そこから「小節の頭」を推定していたが、
    曲によって見当違いの位相を掴み、切り替えが丸ごと1〜3拍ずれる事故になった
    （Somebody で実際に発生）。位相は別の信号から当てにいかず、実際に節目を
    選ぶのと同じ指標だけで決める。"""
    import numpy as np
    # -ss を -i の前に置いて高速シーク。頭から60秒しか見ていなかったため、
    # 「1分23秒～」のように再生開始が60秒より後の曲だと拍が1つも使えず、
    # 拍に合っていない等間隔グリッドに落ちていた（音ハメにならない原因）。
    raw = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-ss", str(max(0.0, start_sec)), "-t", str(max_sec),
         "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    if len(x) < SR * 8:
        return None, 0.0
    n = (len(x) - WIN) // HOP
    fenv = SR / float(HOP)          # 包絡線のフレームレート（約43/秒）
    hann = np.hanning(WIN)
    prev = None
    env = np.zeros(n)
    for i in range(n):
        mag = np.abs(np.fft.rfft(x[i * HOP:i * HOP + WIN] * hann))
        if prev is not None:
            env[i] = np.maximum(mag - prev, 0).sum()   # スペクトラルフラックス＝アタックの強さ
        prev = mag
    return env, fenv


def detect(path, max_sec=60.0, start_sec=0.0):
    """(bpm, [拍の秒…]) を返す。解析できなければ None。
    秒は start_sec を 0 とした相対秒。start_sec は「その曲を再生し始める位置」で、
    そこから max_sec 秒ぶんだけ解析する（曲の頭ではなく、実際に流すところを見る）。"""
    import numpy as np
    sr, hop, win = SR, HOP, WIN
    env, fenv = _envelope(path, max_sec, start_sec)
    if env is None:
        return None
    n = len(env)
    env = env - env.mean()
    env[env < 0] = 0
    if env.max() <= 0:
        return None
    env = env / env.max()
    # テンポ推定：自己相関（84〜190BPM）
    ac = np.correlate(env, env, "full")[len(env) - 1:]
    lo = max(2, int(round(60.0 / 190 * fenv)))
    hi = int(round(60.0 / 84 * fenv))
    lags = np.arange(lo, hi + 1)
    score = ac[lags] + 0.5 * ac[np.minimum(lags * 2, len(ac) - 1)]
    L = int(lags[int(np.argmax(score))])
    # 周期を細かく詰めて位相（1拍目の位置）を合わせる
    best = (-1.0, float(L), 0.0)
    t_idx = np.arange(len(env))
    for P in np.arange(L - 1.0, L + 1.0, 0.02):
        if P < 2:
            continue
        for off in np.arange(0.0, P, P / 24.0):
            grid = np.arange(off, len(env) - 1, P)
            s = float(np.interp(grid, t_idx, env).sum()) / max(len(grid), 1)
            if s > best[0]:
                best = (s, float(P), float(off))
    _, P, off = best
    bpm = 60.0 * fenv / P
    beats = []
    t = off
    while t < n and len(beats) < 64:
        # 解析窓の半分ぶん早く検出される癖を補正（検証で平均約23ms）
        beats.append(round(t / fenv + CORR, 4))
        t += P
    return bpm, beats


def accents(path, max_sec=60.0, start_sec=0.0, beats=None,
            min_gap=1.15, max_gap=4.5, thr_pct=88.0, lead_sec=0.05, bar_lock=False):
    """曲の「ここで入る」という節目（フレーズの頭・サビの入り）の秒を返す。

    拍(detect)とは別物。拍は等間隔の格子なので、そこに絵を乗せると曲のどこでも
    同じ顔でドッドッと脈打つだけになる。ここで欲しいのは
    「10秒と12秒でダダーダーと入る、その入りの瞬間」＝間隔がバラバラな節目。

    やっていること：
      ①アタックの強さを0.12秒ならして「フレーズの勢い」にする
      ②2秒の移動中央値を土台にして、そこからどれだけ跳ねたかを見る
        （曲全体が盛り上がっている区間でも、その中の"入り"だけが立つ）
      ③拍の格子の上から、強い拍だけを選ぶ（＝必ず拍に乗る／間隔はバラバラ）
        bar_lock=True の曲だけ、さらに小節の頭に限定する
      ④近すぎるものは強い方を残す（min_gap）
      ⑤空きすぎた所は拍を足して埋める（切り替わらない動画にしない）
      ⑥lead_sec ぶん前へ出す

    lead_sec について：切り替えが音より後ろに来ると「音楽が先に行って画が
    遅れている」とはっきり分かるが、ほんの少し前に出ているぶんには
    “合っている”と感じる。人の目は画の変化を捉えるのに一瞬かかるため。
    そこで既定で1.5コマぶん(0.05秒)だけ前へ出す。
    """
    import numpy as np
    env, fenv = _envelope(path, max_sec, start_sec)
    if env is None or len(env) < 16 or env.max() <= 0:
        return []
    # ①勢いにならす
    k = max(1, int(round(0.12 * fenv)))
    sm = np.convolve(env, np.ones(k) / float(k), mode="same")
    # ②土台（2秒の移動中央値）からの跳ね
    w = max(3, int(round(2.0 * fenv)) | 1)
    pad = np.pad(sm, (w // 2, w // 2), mode="edge")
    base = np.array([np.median(pad[i:i + w]) for i in range(len(sm))])
    nov = sm - base
    nov[nov < 0] = 0
    if nov.max() <= 0:
        return []
    nov = nov / nov.max()
    # ③「拍の格子の上から、強い拍だけを選ぶ」
    #   自由に山のピークを拾うと、スイング系のように刻みや裏拍が強い曲では
    #   二次的な打点を掴んでしまい、耳が“入り”と感じる位置より後ろにずれる
    #   （＝音楽が先に行って画が遅れて見える）。拍の上に限定すれば必ず拍に
    #   ピタリと乗り、しかも強い拍だけを採るので間隔はバラバラのまま保てる。
    #
    #   bar_lock について：曲によっては、拍の中でいちばん強いのがバックビート
    #   （2拍4拍のスネア）で、そこで切ると小節の頭より後ろになる（French_Toast）。
    #   その曲だけ「小節の頭」に限定する。ただし小節の頭の位置は、低音など別の
    #   信号から当てにいってはいけない。見当違いの位相を掴むと切り替えが丸ごと
    #   1〜3拍ずれる事故になる（Somebody で実際に起きた）。ここでは実際に節目を
    #   選ぶのと同じ nov を使い、いちばん節目が集まる位置を小節の頭とみなす。
    cand = []
    allcand = []
    snap = {}                                   # 実音の秒 → (格子からのズレ秒, 強さ)。ログ用
    if beats and len(beats) >= 8:
        w = max(1, int(round(0.10 * fenv)))     # その拍の前後0.1秒の中を見る
        def _peak(sec):
            """その拍の近くで実際にいちばん強く鳴っている「位置」と、その強さを返す。

            以前はここで強さ（最大値）だけを返し、切る秒には拍の格子の値を
            そのまま使っていた。だが detect() の拍は、推定した周期を頭から
            等間隔に伸ばしただけのもので、実際の演奏とは少しずつ食い違う。
            序盤は一致していて後半だけ外れる——No.32 が「4商品目まで完璧で
            5商品目からずれる」と言われたのはこれ。強さを測った、まさにその
            場所を切る秒にすれば、伸ばした格子の誤差は積み上がらない。

            採るのは山の「頂点」ではなく「立ち上がり」。nov は0.12秒ならして
            あるうえ、打楽器の音は立ち上がりが鋭く減衰が緩いので、頂点は実際に
            鳴り始めた所より後ろに来る。頂点に合わせると「音楽が先に行って画が
            遅れている」に寄る（No.35 で毎回その指摘だった）。窓の中の最大値の
            4割を最初に超えた所＝アタックの入口を使う。"""
            i = int(round((sec - CORR) * fenv))     # 拍の秒 → 包絡線の添字（補正を戻す）
            if i < 0 or i >= len(nov):
                return None
            lo, hi = max(0, i - w), min(len(nov), i + w + 1)
            seg = nov[lo:hi]
            v = float(seg.max())
            # 打点が無い所で位置を採ると雑音を掴んで逆にぶれる。弱い時は格子のまま。
            t = float(sec)
            if v >= 0.20:
                j = int(np.argmax(seg >= 0.4 * v))  # 最初に4割を超えた添字＝鳴り始め
                t = (lo + j) / fenv + CORR
            return round(t, 4), v
        scored = []
        for k, b in enumerate(beats):
            p = _peak(float(b))
            if p is not None:
                scored.append((k, p[0], p[1]))
                snap[p[0]] = (round(p[0] - float(b), 4), p[1])
        keep = scored
        pct = 0.70
        if bar_lock and scored:
            # 節目がいちばん集まっている位置＝小節の頭（同じ指標で決めるので破綻しない）
            phase, best = 0, -1.0
            for p in range(4):
                vs = [v for k, _t, v in scored if k % 4 == p]
                if vs and sum(vs) / len(vs) > best:
                    phase, best = p, sum(vs) / len(vs)
            keep = [(k, t, v) for k, t, v in scored if (k - phase) % 4 == 0]
            # 小節の頭は強弱で間引かず、全部使う。間引くと途中に3.7秒など切り替わらない
            # 区間ができ、そこで「合っていない」と感じる（No.35 で実際にそうなった）。
            # 承認をもらえた版も、小節ごとに切り替わり続ける作りだった。
            pct = 0.0
        cand = [(t, v) for _k, t, v in keep]
        if cand:
            allcand = list(cand)                # 空きを埋める時もここから選ぶ
            vals = sorted(v for _t, v in cand)
            thr = vals[int(len(vals) * pct)]
            cand = [(t, v) for t, v in cand if v >= thr and v > 0]
    if not cand:
        # 拍が使えない時だけ、従来どおり山のピークを拾う
        r = max(1, int(round(0.35 * fenv)))
        pos = nov[nov > 0]
        thr = max(0.30, float(np.percentile(pos, thr_pct))) if len(pos) else 0.30
        for i in range(len(nov)):
            v = float(nov[i])
            if v < thr:
                continue
            lo, hi = max(0, i - r), min(len(nov), i + r + 1)
            if v >= float(nov[lo:hi].max()):
                cand.append((i / fenv, v))
        allcand = list(cand)
    if not cand:
        return []
    # ④近すぎるものは強い方だけ残す
    cand.sort(key=lambda t: -t[1])
    picked = []
    for t, _v in cand:
        if all(abs(t - p) >= min_gap for p in picked):
            picked.append(t)
    picked.sort()
    # ⑤空きすぎた所を埋める。
    #   以前はここで「間の拍」を機械的に足していた。拍ならどれでも良いとしていたので
    #   裏拍や小節の途中が入り、その1箇所だけ音とずれる原因になっていた。
    #   埋める時も候補（小節の頭）の中から、その区間でいちばん強い所を選ぶ。
    out = []
    for t in picked:
        while out and t - out[-1] > max_gap:
            lo, hi = out[-1], t
            inner = [(v, b) for b, v in allcand
                     if b - lo >= min_gap and hi - b >= min_gap]
            if not inner:
                break
            out.append(max(inner)[1])
        out.append(t)
    # ここで一度「弱い節目は捨てて、すぐ後ろの強い入りまで1品を持たせる」処理を
    # 入れたが、撤去した。No.32 で 12.47秒(打点0.55＝曲中で最弱)を捨てて5品にした
    # ところ、「6商品のままの方が音ハマってた」との判断だった。打点が弱くても、
    # 一定の間隔で切り替わり続ける方が音に乗って聞こえる。節目の強弱で間引かない。
    #
    # 検証用。各節目について「格子から実音へどれだけ寄せたか(ms)」と「打点の強さ」を出す。
    #   ・ズレが後半ほど大きい → 伸ばした格子が実際の演奏から離れていっていた
    #   ・強さが落ちている所で切っている → そこは鳴っていないのに切っていた
    # どちらなのかを推測ではなくログで判断できるようにしておく。
    if snap:
        print("[ACCENT][SNAP] " + " ".join(
            "%.2fs%+dms(%.2f)" % (t, round(snap[t][0] * 1000), snap[t][1])
            for t in out if t in snap))
    # ⑦ほんの少しだけ前へ出す（遅れて見えるのを防ぐ。0未満にはしない）
    return [round(max(0.0, t - lead_sec), 4) for t in out]


def accents_or_default(path, start_sec=0.0, beats=None, need=16, bar_lock=False):
    """節目の秒を返す。拾えなければ4拍ごと（小節の頭）にフォールバックする。
    ここで空を返すと絵が切り替わらなくなるので、必ず何か返す。"""
    try:
        a = accents(path, start_sec=start_sec, beats=beats, bar_lock=bar_lock)
    except Exception as e:
        print("[ACCENT] 解析失敗:", e)
        a = []
    if len(a) >= 3:
        print("[ACCENT] 節目 %d 個: %s" % (len(a), ", ".join("%.2f" % t for t in a[:10])))
        return a
    print("[ACCENT] 節目を拾えず: 4拍ごと（小節の頭）へフォールバック")
    b = list(beats or [])
    if len(b) >= 8:
        return [b[i] for i in range(0, len(b), 4)]
    return [round(i * 2.0, 4) for i in range(need)]


def detect_or_default(path, start_sec=0.0, need=48):
    """拍の配列を「再生開始位置(start_sec)からの相対秒」で返す。
    解析できなければ120BPM（0.5秒）の等間隔にフォールバックする（必ず値を返す）。"""
    try:
        r = detect(path, start_sec=start_sec)   # 再生開始位置から解析＝返る秒はそのまま相対秒
    except Exception as e:
        print("[BEAT] 解析失敗:", e)
        r = None
    if not r:
        print("[BEAT] フォールバック: 120BPM等間隔")
        return 120.0, [round(i * 0.5, 4) for i in range(need)]
    bpm, rel = r
    per = 60.0 / bpm if bpm > 0 else 0.5
    if not rel:
        rel = [0.0]
    while len(rel) < need:                      # 足りなければ最後の拍から等間隔で伸ばす
        rel.append(round(rel[-1] + per, 4))
    return bpm, rel[:need]
