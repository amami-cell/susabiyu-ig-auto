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


def _envelope(path, max_sec=60.0, start_sec=0.0):
    """(全帯域のフラックス, 低音だけのフラックス, フレームレート) を返す。

    低音だけのぶんを別に持つのは「小節の頭」を当てるため。全帯域で一番強い拍は
    たいていスネア（2拍4拍＝バックビート）になり、そこで画を切ると小節の頭より
    後ろで切れる＝音楽が先に行って画が遅れて見える。キックは低音に出るので、
    低音の強い拍を小節の頭とみなす。"""
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
        return None, None, 0.0
    n = (len(x) - WIN) // HOP
    fenv = SR / float(HOP)          # 包絡線のフレームレート（約43/秒）
    hann = np.hanning(WIN)
    # 22050Hz/1024点なので1本あたり約21.5Hz。先頭8本＝およそ170Hzまで＝キックの帯域。
    nlow = 8
    prev = None
    env = np.zeros(n)
    low = np.zeros(n)
    for i in range(n):
        mag = np.abs(np.fft.rfft(x[i * HOP:i * HOP + WIN] * hann))
        if prev is not None:
            d = np.maximum(mag - prev, 0)
            env[i] = d.sum()                  # スペクトラルフラックス＝アタックの強さ
            low[i] = d[:nlow].sum()           # 低音だけ＝キックの手がかり
        prev = mag
    return env, low, fenv


def detect(path, max_sec=60.0, start_sec=0.0):
    """(bpm, [拍の秒…]) を返す。解析できなければ None。
    秒は start_sec を 0 とした相対秒。start_sec は「その曲を再生し始める位置」で、
    そこから max_sec 秒ぶんだけ解析する（曲の頭ではなく、実際に流すところを見る）。"""
    import numpy as np
    sr, hop, win = SR, HOP, WIN
    env, _low, fenv = _envelope(path, max_sec, start_sec)
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
        beats.append(round(t / fenv + win / (2.0 * sr), 4))
        t += P
    return bpm, beats


def accents(path, max_sec=60.0, start_sec=0.0, beats=None,
            min_gap=1.15, max_gap=4.5, thr_pct=88.0, lead_sec=0.05):
    """曲の「ここで入る」という節目（フレーズの頭・サビの入り）の秒を返す。

    拍(detect)とは別物。拍は等間隔の格子なので、そこに絵を乗せると曲のどこでも
    同じ顔でドッドッと脈打つだけになる。ここで欲しいのは
    「10秒と12秒でダダーダーと入る、その入りの瞬間」＝間隔がバラバラな節目。

    やっていること：
      ①アタックの強さを0.12秒ならして「フレーズの勢い」にする
      ②2秒の移動中央値を土台にして、そこからどれだけ跳ねたかを見る
        （曲全体が盛り上がっている区間でも、その中の"入り"だけが立つ）
      ③拍の格子の上から、強い拍だけを選ぶ（＝必ず拍に乗る／間隔はバラバラ）
      ④近すぎるものは強い方を残す（min_gap）
      ⑤空きすぎた所は拍を足して埋める（切り替わらない動画にしない）
      ⑥lead_sec ぶん前へ出す

    lead_sec について：切り替えが音より後ろに来ると「音楽が先に行って画が
    遅れている」とはっきり分かるが、ほんの少し前に出ているぶんには
    “合っている”と感じる。人の目は画の変化を捉えるのに一瞬かかるため。
    そこで既定で1.5コマぶん(0.05秒)だけ前へ出す。
    """
    import numpy as np
    env, low, fenv = _envelope(path, max_sec, start_sec)
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
    #   さらに「小節の頭に限定」する。全帯域で一番強い拍はバックビート（2拍4拍の
    #   スネア）になる曲が多く、そこで切ると小節の頭より後ろで切れる＝やはり
    #   画が遅れて見える（French_Toast で実際に出た）。キックは低音に出るので、
    #   低音が強い拍の位置を小節の頭とみなし、その位置と半小節だけを候補にする。
    cand = []
    if beats and len(beats) >= 8:
        w = max(1, int(round(0.10 * fenv)))     # その拍の前後0.1秒の強さで評価
        def _peak(arr, sec):
            i = int(round(sec * fenv))
            if i < 0 or i >= len(arr):
                return None
            lo, hi = max(0, i - w), min(len(arr), i + w + 1)
            return float(arr[lo:hi].max())
        # 4拍のどの位置にキックが来ているか＝小節の頭を割り出す
        phase, best = 0, -1.0
        for p in range(4):
            vs = [_peak(low, b) for k, b in enumerate(beats) if k % 4 == p]
            vs = [v for v in vs if v is not None]
            if vs and sum(vs) / len(vs) > best:
                phase, best = p, sum(vs) / len(vs)
        for k, b in enumerate(beats):
            if (k - phase) % 2 != 0:            # 小節の頭と半小節だけ（裏拍は捨てる）
                continue
            v = _peak(nov, b)
            if v is None:
                continue
            # 小節の頭を優先する（同じ強さなら頭が勝つように少し下駄をはかせる）
            cand.append((float(b), v * (1.0 if (k - phase) % 4 == 0 else 0.82)))
        if cand:
            vals = sorted(v for _b, v in cand)
            thr = vals[int(len(vals) * 0.45)]   # 候補が小節頭/半小節に絞られたぶん緩める
            cand = [(b, v) for b, v in cand if v >= thr and v > 0]
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
    if not cand:
        return []
    # ④近すぎるものは強い方だけ残す
    cand.sort(key=lambda t: -t[1])
    picked = []
    for t, _v in cand:
        if all(abs(t - p) >= min_gap for p in picked):
            picked.append(t)
    picked.sort()
    # ⑤空きすぎた所を埋める
    out = []
    for t in picked:
        if out and t - out[-1] > max_gap:
            gap = t - out[-1]
            m = int(gap // max_gap)
            for j in range(1, m + 1):
                mid = out[-1] + gap * j / (m + 1.0)
                if beats:
                    mid = min(beats, key=lambda x: abs(x - mid))
                if mid - out[-1] >= min_gap and t - mid >= min_gap:
                    out.append(mid)
        out.append(t)
    # ⑥ほんの少しだけ前へ出す（遅れて見えるのを防ぐ。0未満にはしない）
    return [round(max(0.0, t - lead_sec), 4) for t in out]


def accents_or_default(path, start_sec=0.0, beats=None, need=16):
    """節目の秒を返す。拾えなければ4拍ごと（小節の頭）にフォールバックする。
    ここで空を返すと絵が切り替わらなくなるので、必ず何か返す。"""
    try:
        a = accents(path, start_sec=start_sec, beats=beats)
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
