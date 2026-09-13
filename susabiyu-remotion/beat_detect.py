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


def detect(path, max_sec=60.0):
    """(bpm, [拍の秒…]) を返す。解析できなければ None。"""
    import numpy as np
    sr = 22050
    raw = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-t", str(max_sec), "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    if len(x) < sr * 8:
        return None
    hop, win = 512, 1024
    n = (len(x) - win) // hop
    fenv = sr / float(hop)          # 包絡線のフレームレート（約43/秒）
    hann = np.hanning(win)
    prev = None
    env = np.zeros(n)
    for i in range(n):
        mag = np.abs(np.fft.rfft(x[i * hop:i * hop + win] * hann))
        if prev is not None:
            env[i] = np.maximum(mag - prev, 0).sum()   # スペクトラルフラックス＝アタックの強さ
        prev = mag
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


def detect_or_default(path, start_sec=0.0, need=48):
    """拍の配列を「再生開始位置(start_sec)からの相対秒」で返す。
    解析できなければ120BPM（0.5秒）の等間隔にフォールバックする（必ず値を返す）。"""
    try:
        r = detect(path)
    except Exception as e:
        print("[BEAT] 解析失敗:", e)
        r = None
    if not r:
        print("[BEAT] フォールバック: 120BPM等間隔")
        return 120.0, [round(i * 0.5, 4) for i in range(need)]
    bpm, beats = r
    per = 60.0 / bpm if bpm > 0 else 0.5
    # 開始位置より前の拍は落とし、足りなければ最後の拍から等間隔で伸ばす
    rel = [round(b - start_sec, 4) for b in beats if b >= start_sec - 1e-6]
    if not rel:
        rel = [0.0]
    while len(rel) < need:
        rel.append(round(rel[-1] + per, 4))
    return bpm, rel[:need]
